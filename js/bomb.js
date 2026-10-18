'use strict';
/* BOMBA modu (VS'nin rauntlu, ekonomili bir türü): saldıran takım bombayı A ya da B bölgesine kurar, savunan takım engeller ya da imha eder.
   Bombayı host yönetir (kimde, nerede, kaç saniye kaldı); kurma / imha ilerlemesi oyuncunun kendi ekranında sayılır, bitince host'a bildirilir.
   Saldıran: ilk 6 raunt Kırmızı, sonra taraf değişir. 4 basılı: kur / imha et (dururken). */

const BOMB = { plantT: 3.2, defuseT: 7, fuse: 40, pickR: 1.4, defuseR: 1.9, blastR: 15, half: ROUNDS_WIN - 1, plantBonus: 300 };
const isBomb = () => net.mode !== 'solo' && net.gameMode === 'bomb';
const attackTeam = () => vs.round <= BOMB.half ? 'red' : 'blue';
const defendTeam = () => attackTeam() === 'red' ? 'blue' : 'red';
const bomb = { st: 'none', carrier: null, x: 0, z: 0, t: 0, site: '', planter: null };
const bombAct = { kind: null, t: 0 };   // kendi kurma / imha ilerlemem
WEAPON_SHORT.bomb = 'BOMBA';

/* ================= MODEL ================= */
const bombModel = new THREE.Group(); scene.add(bombModel); bombModel.visible = false;
const bombLed = new THREE.MeshBasicMaterial({ color: 0xff2010 });
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(.42, .16, .3), new THREE.MeshStandardMaterial({ color: 0x5a5236, roughness: .7 })); body.position.y = .08; bombModel.add(body);
  for (const x of [-.12, 0, .12]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .3, 10), new THREE.MeshStandardMaterial({ color: 0x8a3a1a, roughness: .6 })); c.rotation.x = Math.PI / 2; c.position.set(x, .2, 0); bombModel.add(c); }
  const pad = new THREE.Mesh(new THREE.BoxGeometry(.18, .02, .12), new THREE.MeshStandardMaterial({ color: 0x1a1a1a })); pad.position.set(.08, .26, .02); bombModel.add(pad);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), bombLed); led.position.set(-.12, .26, .06); bombModel.add(led);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff3010, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(.6); glow.position.set(-.12, .28, .06); bombModel.add(glow); bombModel.userData.glow = glow;
}

/* ================= YARDIMCILAR ================= */
function siteAt(p) {
  const S = (MAPS[curMap] || {}).sites; if (!S) return '';
  for (const k in S) { const s = S[k]; if (p.x > s.x0 && p.x < s.x1 && p.z > s.z0 && p.z < s.z1) return k; }
  return '';
}
function posOf(id) {
  if (id === net.myId) return player.body.position;
  const p = net.players[id]; return p && p.proxy ? p.proxy.pos : null;
}
function aliveOf(id) { return id === net.myId ? player.alive : !!(net.players[id] || {}).alive; }
// not: bombanın geri sayımı da 't' adında; mesaj türüyle çakışmasın diye 'left' olarak gönderilir
const bombMsg = () => ({ t: 'bomb', st: bomb.st, carrier: bomb.carrier, x: bomb.x, z: bomb.z, left: bomb.t, site: bomb.site, planter: bomb.planter });
function sendBomb() { const m = bombMsg(); bcast(m); onBombState(m); }
function resetBomb() { Object.assign(bomb, { st: 'none', carrier: null, x: 0, z: 0, t: 0, site: '', planter: null }); bombAct.kind = null; bombModel.visible = false; }

/* ================= HOST ================= */
function hostGiveBomb() {
  const atk = Object.values(net.players).filter(p => p.team === attackTeam());
  if (!atk.length) { resetBomb(); sendBomb(); return; }
  Object.assign(bomb, { st: 'carried', carrier: pick(atk).id, t: 0, site: '', planter: null });
  sendBomb();
}
function hostPlant(id, d) {
  if (!isBomb() || vs.phase !== 'live' || bomb.st !== 'carried' || bomb.carrier !== id) return;
  const site = siteAt({ x: d.x, z: d.z }); if (!site) return;
  Object.assign(bomb, { st: 'planted', carrier: null, x: d.x, z: d.z, t: BOMB.fuse, site, planter: id });
  sendBomb();
}
function hostDefuse(id) {
  if (!isBomb() || vs.phase !== 'live' || bomb.st !== 'planted' || teamOf(id) !== defendTeam()) return;
  bomb.st = 'defused'; bomb.defuser = id; sendBomb();
  hostEndRound(defendTeam());
}
// raunt sırasında host'un her karesi (updateVS çağırır)
function bombHostTick(rdt) {
  const atk = attackTeam(), def = defendTeam();
  const hasA = Object.values(net.players).some(p => p.team === atk), hasD = Object.values(net.players).some(p => p.team === def);
  const a = aliveCount(atk), d = aliveCount(def);
  if (bomb.st === 'planted') {
    bomb.t -= rdt;
    bomb.tick = (bomb.tick || 0) - rdt; if (bomb.tick <= 0) { bomb.tick = 1; sendBomb(); }
    if (bomb.t <= 0) { bomb.st = 'exploded'; sendBomb(); hostEndRound(atk); return; }
    if (hasD && d === 0) hostEndRound(atk);
    return;
  }
  if (hasA && hasD && a === 0) { hostEndRound(def); return; }
  if (hasA && hasD && d === 0) { hostEndRound(atk); return; }
  if (vs.t <= 0) { hostEndRound(def); return; }
  // taşıyıcı öldüyse bomba yere düşer; yerdeki bombayı ilk değen saldıran alır
  if (bomb.st === 'carried' && !aliveOf(bomb.carrier)) {
    const p = posOf(bomb.carrier); bomb.st = 'dropped'; bomb.carrier = null;
    if (p) { bomb.x = p.x; bomb.z = p.z; }
    sendBomb();
  } else if (bomb.st === 'dropped') {
    for (const id in net.players) {
      if (teamOf(id) !== atk || !aliveOf(id)) continue;
      const p = posOf(id); if (p && Math.hypot(p.x - bomb.x, p.z - bomb.z) < BOMB.pickR) { bomb.st = 'carried'; bomb.carrier = id; sendBomb(); break; }
    }
  }
}

/* ================= HERKES ================= */
let lastBombSt = 'none';
function onBombState(d) {
  const prev = lastBombSt;
  Object.assign(bomb, { st: d.st, carrier: d.carrier, x: d.x, z: d.z, t: d.left, site: d.site, planter: d.planter });
  lastBombSt = d.st;
  if (d.st === prev && d.st !== 'carried') return;
  const mine = myTeam() === attackTeam();
  if (d.st === 'carried' && d.carrier === net.myId && prev !== 'carried') toast('BOMBA SENDE · A YA DA B BÖLGESİNDE 4 BASILI TUT');
  if (d.st === 'carried' && prev === 'dropped') toast('BOMBA ALINDI: ' + nameOf(d.carrier).toLocaleUpperCase('tr-TR'));
  if (d.st === 'dropped' && prev !== 'dropped') toast(mine ? 'BOMBA DÜŞTÜ · ÜSTÜNDEN GEÇİP AL' : 'BOMBA YERE DÜŞTÜ');
  if (d.st === 'planted' && prev !== 'planted') {
    banner('BOMBA KURULDU', d.site + ' BÖLGESİ · ' + (mine ? 'KORU' : 'İMHA ET: YANINDA 4 BASILI TUT'));
    sfx.roar(); bombModel.position.set(d.x, 0, d.z); bombModel.rotation.y = Math.random() * 6;
    if (d.planter === net.myId) addCredits(BOMB.plantBonus, 'BOMBA KURULDU');
  }
  if (d.st === 'defused' && prev !== 'defused') { banner('BOMBA İMHA EDİLDİ', ''); sfx.parry(); }
  if (d.st === 'exploded' && prev !== 'exploded') bombExplodeFx();
}
function bombExplodeFx() {
  const p = new V3(bomb.x, .5, bomb.z);
  explodeAt(p, false, 9); setTimeout(() => explodeAt(p.clone().add(new V3(rand(-2, 2), 1.5, rand(-2, 2))), false, 7), 120);
  if (typeof flashWorld === 'function') flashWorld(12, 0xffc070, .4);
  bombModel.visible = false;
  shake(1);
  // patlama menzilindeki herkes kendi canını düşürür
  const d = Math.hypot(player.body.position.x - p.x, player.body.position.z - p.z);
  if (player.alive && d < BOMB.blastR) {
    vs.lastHit = { by: null, w: 'bomb' };
    const dmg = d < BOMB.blastR * .6 ? 500 : 500 * (1 - (d - BOMB.blastR * .6) / (BOMB.blastR * .4));
    hurtPlayer(dmg, p, null, { pvp: true });
  }
}
// kurma / imha: dururken 4 basılı tutulur; hareket, ateş ya da tuşu bırakmak iptal eder
function updateBomb(dt) {
  if (!isBomb()) { if (bombModel.visible) bombModel.visible = false; $('bombHud').hidden = true; return; }
  // model
  const show = bomb.st === 'planted' || bomb.st === 'dropped' || bomb.st === 'defused';
  bombModel.visible = show;
  if (show) {
    if (bomb.st === 'dropped') bombModel.position.set(bomb.x, 0, bomb.z);
    const rate = bomb.st === 'planted' ? (bomb.t < 5 ? 8 : bomb.t < 10 ? 4 : 1.4) : .6;
    const on = bomb.st === 'planted' && Math.sin(performance.now() / 1000 * rate * Math.PI * 2) > .3;
    bombLed.color.setHex(on || bomb.st === 'dropped' ? 0xff2010 : bomb.st === 'defused' ? 0x20ff60 : 0x401008);
    bombModel.userData.glow.visible = on;
    if (bomb.st === 'planted' && state !== 'menu') {
      bomb.t -= net.mode === 'host' ? 0 : dt;   // misafir de geri sayımı akıcı görsün (host her saniye düzeltir)
      bomb.beepT = (bomb.beepT || 0) - dt;
      if (bomb.beepT <= 0) { bomb.beepT = 1 / rate; beepAt(bombModel.position); }
    }
  }
  // kurma / imha
  const pb = player.body.position, holding = keys.Digit4 && state === 'play' && player.alive && vs.phase === 'live';
  const moving = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD || mouse.left || !player.grounded;
  if (!bombAct.kind && holding && !moving) {
    if (bomb.st === 'carried' && bomb.carrier === net.myId && siteAt(pb)) { bombAct.kind = 'plant'; bombAct.t = 0; sfx.reload(); }
    else if (bomb.st === 'planted' && myTeam() === defendTeam() && Math.hypot(pb.x - bomb.x, pb.z - bomb.z) < BOMB.defuseR) { bombAct.kind = 'defuse'; bombAct.t = 0; sfx.reload(); }
  }
  if (bombAct.kind) {
    const ok = holding && !moving && (bombAct.kind === 'plant' ? bomb.st === 'carried' && bomb.carrier === net.myId && siteAt(pb) : bomb.st === 'planted');
    if (!ok) bombAct.kind = null;
    else {
      const T = bombAct.kind === 'plant' ? BOMB.plantT : BOMB.defuseT;
      const before = bombAct.t; bombAct.t += dt;
      if (Math.floor(before * 3) !== Math.floor(bombAct.t * 3)) sfx.shell();
      if (bombAct.t >= T) {
        const msg = bombAct.kind === 'plant' ? { t: 'bplant', x: r2(pb.x), z: r2(pb.z) } : { t: 'bdefuse' };
        if (net.mode === 'host') { if (msg.t === 'bplant') hostPlant(net.myId, msg); else hostDefuse(net.myId); } else toHost(msg);
        bombAct.kind = null;
      }
    }
  }
  renderBombHud();
}
function beepAt(p) {
  const c = AU.ctx; if (!c) return;
  const d = Math.hypot(p.x - eyePos.x, p.z - eyePos.z), vol = .35 * Math.max(.15, 1 - d / 40);
  tn('square', 1900, 1850, .07, vol * .25);
}
function renderBombHud() {
  const el = $('bombHud'); el.hidden = false;
  const atk = myTeam() === attackTeam();
  let txt = '', cls = '';
  if (bomb.st === 'planted') { txt = 'BOMBA ' + bomb.site + ' BÖLGESİNDE · ' + Math.max(0, Math.ceil(bomb.t)) + ' SN'; cls = 'planted'; }
  else if (bomb.st === 'carried') txt = atk ? (bomb.carrier === net.myId ? 'BOMBA SENDE · A / B BÖLGESİNDE 4 BASILI TUT' + (siteAt(player.body.position) ? '  ◉ BÖLGEDESİN' : '') : 'BOMBA: ' + nameOf(bomb.carrier).toLocaleUpperCase('tr-TR')) : 'SAVUN · BOMBAYI KURDURMA';
  else if (bomb.st === 'dropped') txt = atk ? 'BOMBA YERDE · AL' : 'BOMBA YERDE';
  else if (bomb.st === 'defused') txt = 'İMHA EDİLDİ';
  txt = (atk ? 'SALDIRI · ' : 'SAVUNMA · ') + txt;
  if (hud.bombTxt !== txt) { hud.bombTxt = txt; $('bombTxt').textContent = txt; }
  el.className = cls;
  const T = bombAct.kind === 'plant' ? BOMB.plantT : BOMB.defuseT;
  $('bombBar').hidden = !bombAct.kind;
  if (bombAct.kind) { $('bombBarFill').style.width = Math.min(100, bombAct.t / T * 100) + '%'; setText('bombBarTxt', bombAct.kind === 'plant' ? 'BOMBA KURULUYOR' : 'İMHA EDİLİYOR'); }
}
