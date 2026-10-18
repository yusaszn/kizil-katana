'use strict';
/* Oyun akışı: hasar, ölüm ve kaldırma, dalgalar, XP, skor tablosu, kontroller, gösterge paneli, ana döngü */

let state = 'menu';
let score = 0, kills = 0, waveN = 0, bossCount = 0, hitStop = 0, slowMo = 0, trauma = 0, hurtFlash = 0, dashFlash = 0, autoPickT = 0;
let matchOver = false;
const combo = { n: 0, t: 0 };
const wave = { list: [], spawnT: 0, between: 2, active: false };
const keys = {};
const mouse = { left: false, right: false };
let fallbackLook = false;
const hashWave = (() => { const m = /dalga(\d+)/i.exec(location.hash); return m ? clamp(parseInt(m[1], 10) - 1, 0, 999) : 0; })();
const playerCount = () => net.mode === 'solo' ? 1 : Math.max(1, Object.keys(net.players).length);

function shake(a) { trauma = Math.min(1, trauma + a); }
function toast(txt) { const el = $('toast'); el.textContent = txt; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
function banner(big, small) { const el = $('banner'); el.innerHTML = big + (small ? `<small>${small}</small>` : ''); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
let hitMarkT = 0;
function hitMarker(head) { hitMarkT = .09; $('cross').classList.toggle('head', !!head); }

const COMBO_NAMES = [[10, 'ŞEYTAN AVCISI'], [7, 'KANLI HASAT'], [5, 'KATLİAM'], [3, 'ÜÇLÜ DOĞRAMA'], [2, 'ÇİFT KESİK'], [1, 'KESİK']];
function registerKill(T, close) {
  kills++; combo.n++; combo.t = 3.2;
  score += Math.round(T.score * (1 + (combo.n - 1) * .25));
  const name = COMBO_NAMES.find(([n]) => combo.n >= n)[1];
  $('comboLabel').textContent = name; $('comboN').textContent = '×' + combo.n;
  if (ST.lifesteal) { player.hp = Math.min(ST.maxHp, player.hp + ST.lifesteal); perkStat.vamp += ST.lifesteal; }
  gainXP(T.xp);
  if (close) screenSplat(Math.round(rand(3, 7)));
}

/* ================= DÜŞMANA HASAR ================= */
function enemyHurtFx(e, push, at, bullet, head, mine) {
  e.flash = bullet ? .6 : 1;
  const c = at || enemyCenter(e, new V3());
  if (bullet) {
    bloodBurst(c, push, head ? 40 : 18, 6, 2);
    if (Math.random() < .3) floorDecal(c.x + push.x * rand(.5, 2), c.z + push.z * rand(.5, 2), rand(.2, .5));
  } else {
    bloodBurst(c, push, 70, 7, 3);
    floorDecal(c.x + push.x * rand(.5, 1.5), c.z + push.z * rand(.5, 1.5), rand(.5, 1));
  }
  if (mine || !bullet) sfx.flesh();
}
function hurtEnemy(e, dmg, push, cutN, opts = {}) {
  if (!enemies.includes(e)) return false;
  const by = opts.by || net.myId, mine = by === net.myId;
  // Cellat İçgüdüsü: canı azalmış düşmana çift hasar
  if (mine && ST.execute && e.hp < e.maxHp * .25) dmg *= 2;
  if (net.mode === 'guest') {
    toHost({ t: 'hit', id: e.id, dmg, push: arr(push), cut: arr(cutN), big: !!opts.big, bullet: !!opts.bullet, head: !!opts.head, pw: opts.power || 1, at: opts.at ? arr(opts.at) : null });
    enemyHurtFx(e, push, opts.at, opts.bullet, opts.head, true);
    return false;
  }
  // boss kubbesi / evre geçişi: hasar geçmez
  if (e.invulnT > 0 || e.shieldT > 0) {
    if (gate('domeHit', 90)) { sfx.clang(); sparks(opts.at || enemyCenter(e, new V3()), 10, 6); }
    return false;
  }
  // önden gelen vuruş mu? (düşmanın baktığı yön ile vuruş yönü karşılaştırılır)
  const ry = e.model.g.rotation.y, frontal = push.x * Math.sin(ry) + push.z * Math.cos(ry) < -.25;
  if (e.guardT > 0 && frontal && !opts.big) {
    // Cellat savunmada: bloklar ve karşı saldırıya geçer
    e.counter = true; sfx.clang(); sparks(opts.at || enemyCenter(e, new V3()), 14, 7);
    return false;
  }
  if (e.T.shield && frontal && !opts.big && !(e.kicked > 0) && e.stun < .5) {
    // kalkanlı: önden sadece %15 hasar; arkadan, tekmeyle ya da ağır vuruşla kırılır
    dmg *= .15;
    if (gate('shieldHit', 80)) { sfx.clang(); sparks(opts.at || enemyCenter(e, new V3()), 8, 6); }
  }
  e.hp -= dmg;
  enemyHurtFx(e, push, opts.at, opts.bullet, opts.head, mine);
  bcast({ t: 'hurt', id: e.id, push: arr(push), at: opts.at ? arr(opts.at) : null, bullet: !!opts.bullet, head: !!opts.head }, (net.players[by] || {}).conn);
  if (e.hp <= 0) { killEnemy(e, push, cutN, Object.assign({}, opts, { by })); return true; }
  if (isBossKind(e.kind)) return false;
  if (opts.bullet) {
    const pw = opts.power || 1, k = (e.kind === 'brute' ? .3 : 1) * pw;
    e.body.velocity.x += push.x * k; e.body.velocity.z += push.z * k;
    e.stun = Math.max(e.stun, e.kind === 'brute' ? 0 : .06 * pw);
  } else {
    const k = e.kind === 'brute' ? 2.5 : 7;
    e.body.velocity.x += push.x * k; e.body.velocity.z += push.z * k; e.body.velocity.y += 2;
    e.stun = Math.max(e.stun, e.kind === 'brute' ? .12 : .3); e.windup = 0; e.charge = 0;
  }
  return false;
}
function killEnemy(e, push, cutN, opts) {
  if (e.T.bomber && !e.exploded) { bomberExplode(e, opts.by, true); return; }   // vurulan kamikaze de patlar
  bcast({ t: 'kill', id: e.id, push: arr(push), cut: arr(cutN), big: !!opts.big, bullet: !!opts.bullet, by: opts.by });
  killFx(e, push, cutN, opts);
}
// Herkesin ekranında aynı şekilde çalışan parçalanma: et parçaları, kan, küreler, puan
function killFx(e, push, cutN, opts) {
  const T = e.T, isBoss = isBossKind(e.kind), bigBoss = isBigBoss(e.kind);
  const mine = (opts.by || net.myId) === net.myId;
  e.model.g.updateMatrixWorld(true);
  e.skin.emissive.setRGB(0, 0, 0);
  const bv = e.remote ? { x: 0, z: 0 } : e.body.velocity;
  const created = [];
  const wp = new V3(), wq = new THREE.Quaternion();
  for (const m of e.model.parts) {
    m.getWorldPosition(wp); m.getWorldQuaternion(wq);
    const he = m.userData.he.clone().multiplyScalar(T.scale);
    const pc = makePiece(he, wp, wq, Array(6).fill(e.skin), fleshCut, 'flesh');
    const f = rand(4, 10) * (opts.big ? 1.6 : 1) * (isBoss ? 1.4 : 1);
    pc.body.velocity.set(bv.x * .5 + push.x * f + rand(-2, 2), rand(2, 6) * (isBoss ? 1.6 : 1), bv.z * .5 + push.z * f + rand(-2, 2));
    pc.body.angularVelocity.set(rand(-10, 10), rand(-10, 10), rand(-10, 10));
    pc.bleed = rand(1.5, 3) * (isBoss ? 2.5 : 1);
    created.push([m, pc]);
  }
  const torsoP = created.find(([m]) => m === e.model.torso)[1];
  const headP = created.find(([m]) => m === e.model.head)[1];
  headP.body.velocity.y += rand(4, 8);
  splitPiece(torsoP, cutN, push, 5);
  if (opts.big || isBoss) for (const [, pc] of created) if (pieces.includes(pc) && (isBoss || Math.random() < .5)) splitPiece(pc, randomNormal(), push, 4);
  const c = enemyCenter(e, new V3());
  bloodBurst(c, push, isBoss ? 700 : 260, isBoss ? 14 : 10, isBoss ? 8 : 5);
  bloodBurst(c, UP, isBoss ? 400 : 120, isBoss ? 14 : 9, 3);
  floorDecal(c.x, c.z, rand(1.6, 2.6) * T.scale);
  for (let i = 0; i < (isBoss ? 14 : 4); i++) floorDecal(c.x + push.x * i * .9 + rand(-.5, .5) * (isBoss ? 4 : 1), c.z + push.z * i * .9 + rand(-.5, .5) * (isBoss ? 4 : 1), rand(.6, 1.2) * (isBoss ? 1.8 : 1));
  dropOrbs(c, T.orbs, 'hp');
  if (Math.random() < T.ammoChance) dropOrbs(c, isBoss ? 4 : 1, 'ammo');
  const d = Math.hypot(c.x - camera.position.x, c.z - camera.position.z);
  if (mine) {
    registerKill(T, d < (isBoss ? 8 : 3.4));
    hitStop = Math.max(hitStop, opts.big ? .11 : opts.bullet ? .03 : .07);
    if (!opts.bullet) sword.blood = Math.min(1, sword.blood + .35);
  }
  shake(isBoss ? 1 : mine ? (opts.big ? .45 : opts.bullet ? .15 : .3) : .08);
  removeEnemy(e);
  sfx.kill(); sfx.flesh();
  if (isBoss) {
    slowMo = bigBoss ? 1.6 : 1; hitStop = 0;
    $('bossbar').hidden = true;
    ammo.reserve = ST.maxMags; shells.reserve = ST.maxShells;
    // boss özel silah düşürür: büyük boss roketatar, ara boss bombaatar (herkes kendi ekranında alır)
    dropSpecial(new V3(c.x, 1.2, c.z), bigBoss ? 'rocket' : 'launcher');
    const name = BOSS_INFO[e.kind].name;
    const got = bigBoss ? addRarePick() : addPick();
    banner(name + ' DÜŞTÜ', (bigBoss ? 'ROKETATAR' : 'BOMBAATAR') + ' düştü' + (got ? ' · T ile özellik seç' : ''));
    if (got && net.mode === 'solo') autoPickT = 2.5;
  }
}

/* ================= OYUNCUYA HASAR ================= */
function hurtPlayer(dmg, from, attacker, opts = {}) {
  if (!player.alive) return;
  if (opts.pvp) {
    // VS: doğduktan sonra kısa koruma; mermi yağmurunda dokunulmazlık penceresi yok
    if (vs.spawnProt > 0 || vs.over) return;
    camVectors();
    if (block.on && opts.melee && from) {
      tmp2.set(from.x - player.body.position.x, 0, from.z - player.body.position.z).normalize();
      if (tmp2.dot(flatF) > Math.cos(1.3)) {
        if (block.t < ST.parryWindow) { sfx.parry(); toast('KUSURSUZ SAVUNMA!'); block.hitT = .25; return; }
        dmg *= 1 - ST.blockReduce; sfx.clang(); block.guard -= dmg * 3; block.hitT = .5;
        if (block.guard <= 0) { block.guard = 0; block.broken = 1.6; block.on = false; toast('SAVUNMA KIRILDI'); }
      }
    }
    dmg = armorAbsorb(dmg);
    player.hp -= dmg; hurtFlash = Math.min(1, hurtFlash + .45); shake(opts.melee ? .4 : .12); sfx.hurt();
    if (opts.melee && from) { tmp2.set(player.body.position.x - from.x, 0, player.body.position.z - from.z).normalize(); player.body.velocity.x += tmp2.x * 5; player.body.velocity.z += tmp2.z * 5; }
    checkDeath();
    return;
  }
  if (player.invuln > 0 || player.dashT > 0) return;
  camVectors();
  if (block.on && !opts.unblockable && from) {
    const pb = player.body.position;
    tmp2.set(from.x - pb.x, 0, from.z - pb.z).normalize();
    if (tmp2.dot(flatF) > Math.cos(1.3)) {
      if (block.t < ST.parryWindow) {
        sfx.parry(); toast('KUSURSUZ SAVUNMA!'); hitStop = Math.max(hitStop, .14); shake(.25); score += 100;
        if (typeof sparks === 'function') sparks(pb.clone().addScaledVector(camFwd, 1.2), 35, 11);
        if (typeof flashWorld === 'function') flashWorld(3.5, 0x88c0ff, 0.09);
        block.guard = Math.min(100, block.guard + 25); block.hitT = .25;
        stunAttacker(attacker, tmp2.clone());
        player.invuln = .2;
        return;
      }
      block.guard -= dmg * 1.6; block.hitT = .5;
      sfx.clang(); shake(.2);
      if (typeof sparks === 'function') sparks(pb.clone().addScaledVector(camFwd, 1.1), 16, 7);
      if (block.guard <= 0) { block.guard = 0; block.broken = 1.6; block.on = false; toast('SAVUNMA KIRILDI'); dmg *= .6; }
      else { dmg *= 1 - ST.blockReduce; player.invuln = .15; }
      player.hp -= dmg; hurtFlash = Math.max(hurtFlash, .3);
      checkDeath();
      return;
    }
  }
  player.hp -= dmg; player.invuln = .35; hurtFlash = 1; shake(.5); sfx.hurt();
  if (from) { const pb = player.body.position; tmp2.set(pb.x - from.x, 0, pb.z - from.z).normalize(); player.body.velocity.x += tmp2.x * 8; player.body.velocity.z += tmp2.z * 8; player.body.velocity.y += 3; }
  if (Math.random() < .5) screenSplat(2);
  checkDeath();
}
let phoenixReady = false;
function checkDeath() {
  if (player.hp > 0) return;
  if (ST.phoenix && phoenixReady) {
    phoenixReady = false;
    player.hp = Math.round(ST.maxHp * .5); player.invuln = 2.5;
    const pb = player.body.position;
    for (let i = 0; i < 160; i++) { const a = rand(0, 6.28); emit(pb.x, pb.y + rand(0, 1.5), pb.z, Math.cos(a) * rand(3, 9), rand(2, 9), Math.sin(a) * rand(3, 9), 2, 1, rand(.4, .8), .1, rand(.6, 1.2)); }
    banner('ANKA KUŞU', 'Küllerinden doğdun'); sfx.roar(); shake(.6);
    if (net.mode === 'solo') slowMo = .8;
    return;
  }
  die();
}
function die() {
  if (state === 'upgrade') $('upgrade').hidden = true;
  player.hp = 0; player.alive = false; state = 'dead'; player.deathT = 0;
  if (isVS()) { pvpDie(); return; }
  if (net.mode === 'solo') {
    $('bossbar').hidden = true;
    setTimeout(() => { if (state === 'dead' && !player.alive) showEnd(''); }, 1400);
  } else {
    banner('ÖLDÜN', 'Bir arkadaşın çemberine girip seni kaldırabilir');
    revive.p = 0;
    if (net.mode === 'host') checkAllDead();
  }
}
function revivePlayer(frac) {
  if (player.alive || matchOver) return;
  player.alive = true; player.hp = Math.max(1, Math.round(ST.maxHp * frac)); player.deathT = 0; player.invuln = 2;
  block.guard = 100;
  if (state === 'dead') state = 'play';
  sfx.upgrade();
}

/* ================= KALDIRMA ÇEMBERİ ================= */
const REV_R = 1.8, REV_T = 3;
const revive = { p: 0 };
function makeRing(color) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(REV_R - .08, REV_R, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(REV_R - .1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = fill.rotation.x = -Math.PI / 2; ring.position.y = .05; fill.position.y = .045;
  g.add(ring, fill); g.userData.fill = fill; g.userData.ring = ring; g.visible = false; scene.add(g);
  return g;
}
const myRing = makeRing(0xff3a2a);
function setRing(r, on, x, z, p) {
  r.visible = on; if (!on) return;
  r.position.set(x, 0, z);
  const f = Math.max(.02, p);
  r.userData.fill.scale.set(f, f, 1);
  r.userData.ring.material.opacity = .55 + Math.sin(gameTime * 6) * .3;
}
function updateRevive(dt) {
  const pb = player.body.position;
  const mp = net.mode !== 'solo' && net.inMatch && !matchOver && !isVS();
  const meDead = mp && !player.alive;
  if (meDead) {
    let helper = null;
    for (const id in net.players) { const p = net.players[id]; if (id !== net.myId && p.proxy && p.alive && Math.hypot(p.proxy.pos.x - pb.x, p.proxy.pos.z - pb.z) < REV_R) { helper = p; break; } }
    if (helper) revive.p += dt / REV_T; else revive.p = Math.max(0, revive.p - dt * .4);
    if (revive.p >= 1) { revive.p = 0; revivePlayer(.4); toast(helper.name.toLocaleUpperCase('tr-TR') + ' SENİ KALDIRDI'); }
  } else revive.p = 0;
  setRing(myRing, meDead, pb.x, pb.z, revive.p);
  let hint = meDead ? (revive.p > 0 ? 'KALDIRILIYORSUN ' + Math.round(revive.p * 100) + '%' : 'ÖLDÜN · BİR ARKADAŞIN ÇEMBERİNE GİRSİN') : '';
  for (const id in net.players) {
    const p = net.players[id], pr = p.proxy; if (!pr) continue;
    if (!pr.ring) pr.ring = makeRing(p.color);
    const dead = mp && !p.alive;
    setRing(pr.ring, dead, pr.pos.x, pr.pos.z, pr.rv || 0);
    if (dead && player.alive && Math.hypot(pr.pos.x - pb.x, pr.pos.z - pb.z) < REV_R) hint = p.name.toLocaleUpperCase('tr-TR') + ' KALDIRILIYOR ' + Math.round((pr.rv || 0) * 100) + '%';
  }
  setText('reviveHint', hint);
}

/* ================= DALGALAR ================= */
// dalga n için boss türü: 10'larda Kasap / Ateş Lordu, 5'lerde Cellat / Cadı (sırayla)
function waveBoss(n) {
  if (n % 10 === 0) return (n / 10) % 2 === 1 ? 'boss' : 'lord';
  if (n % 10 === 5) return Math.floor(n / 10) % 2 === 0 ? 'cellat' : 'witch';
  return null;
}
const WAVE_POOL = [ // [tür, ilk dalga, ağırlık]
  ['grunt', 1, 10], ['imp', 2, 5], ['runner', 3, 5], ['brute', 3, 2.5],
  ['shielder', 4, 2], ['bomber', 6, 2], ['flyer', 7, 3]
];
function startWave() {
  const n = waveN + 1, list = [];
  const extra = playerCount() - 1, bk = waveBoss(n);
  // dalga ilerledikçe düşman sayısı artar
  let size = Math.round((6 + n * 2.2 + n * n * .06) * (1 + extra * .5));
  if (bk) size = Math.round(size * (isBigBoss(bk) ? .45 : .6));
  const pool = WAVE_POOL.filter(w => n >= w[1]);
  const tot = pool.reduce((a, w) => a + w[2] * (w[0] === 'grunt' ? Math.max(.35, 1 - n * .04) : 1), 0);
  for (let i = 0; i < size; i++) {
    let r = Math.random() * tot, k = 'grunt';
    for (const w of pool) { r -= w[2] * (w[0] === 'grunt' ? Math.max(.35, 1 - n * .04) : 1); if (r <= 0) { k = w[0]; break; } }
    list.push(k);
  }
  for (let i = list.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [list[i], list[j]] = [list[j], list[i]]; }
  if (bk) list.unshift(bk);
  wave.list = list; wave.active = true; wave.spawnT = bk ? 2.2 : 1;
  onWaveStart(n, list.length);
  bcast({ t: 'wave', n });
}
const BOSS_HINT = { boss: 'Zıplayarak şok dalgasından kaç', lord: 'Ateş sütunlarının halkasından çık', cellat: 'Savunmadayken arkasına geç', witch: 'Uçanları indir, kubbesi düşünce vur' };
function onWaveStart(n, count) {
  waveN = n;
  const bk = waveBoss(n);
  if (bk) {
    if (isBigBoss(bk)) bossCount = n / 10;
    banner(BOSS_INFO[bk].name, 'Dalga ' + n + ' · ' + BOSS_HINT[bk]); sfx.roar();
  }
  else banner('DALGA ' + n, n === 1 ? 'Hepsini doğra' : (count ? count + ' iblis geliyor' : ''));
  sfx.wave();
  ammo.reserve = Math.min(ST.maxMags, ammo.reserve + 1);
  shells.reserve = Math.min(ST.maxShells, shells.reserve + 6);
  m4.gren = Math.min(ST.grenMax, m4.gren + 1);
  phoenixReady = ST.phoenix;
  for (let i = 0; i < 3 + Math.min(4, n); i++) spawnCrate(rand(-H + 3, H - 3), rand(7, 12), rand(-H + 3, H - 3), rand(.35, .55));
  if (!player.alive && net.mode !== 'solo') { revivePlayer(.5); toast('GERİ DÖNDÜN'); }
}
function updateWaves(dt) {
  if (wave.active) {
    wave.spawnT -= dt;
    if (wave.spawnT <= 0 && wave.list.length && enemies.length < Math.min(30, 16 + (waveN >> 1) + playerCount() * 3)) {
      const k = wave.list.shift(); spawnEnemy(k);
      wave.spawnT = isBossKind(k) ? 4 : Math.max(.22, .85 - waveN * .035) / Math.sqrt(playerCount());
    }
    if (!wave.list.length && !enemies.length) {
      wave.active = false; wave.between = waveBoss(waveN) ? 4.5 : 3.5;
      bcast({ t: 'clear' });
      onWaveClear();
    }
  } else {
    // çok oyunculuda herkes özellik seçimini bitirmeden sonraki dalga başlamaz
    if (net.mode === 'host') {
      waitingFor = Object.values(net.players).filter(p => p.id === 'h' ? picksLeft() > 0 : p.pk > 0).map(p => p.id === 'h' ? playerName() : p.name);
      if (waitingFor.length) { wave.between = Math.max(wave.between, 1.5); return; }
    }
    wave.between -= dt;
    if (wave.between <= 0) startWave();
  }
}
let waitingFor = [];
function onWaveClear() {
  const boss = !!waveBoss(waveN);
  if (!boss) banner('TEMİZ', net.mode === 'solo' ? 'Sıradaki dalga geliyor' : 'Herkes özellik seçince sıradaki dalga başlar');
  if (net.mode === 'solo') { if (picksLeft() > 0 && autoPickT <= 0) autoPickT = 1.2; return; }
  if (!player.alive) { revivePlayer(.5); toast('GERİ DÖNDÜN'); }
  if (picksLeft() > 0) autoPickT = boss ? 2.5 : 1.2;
}

/* ================= SIFIRLAMA / BİTİŞ ================= */
function resetGame() {
  buildMap(isVS() ? net.vsMap : 'arena');
  for (const e of enemies.slice()) removeEnemy(e);
  for (const p of pieces.slice()) removePiece(p);
  for (const f of fireballs.slice()) scene.remove(f.g); fireballs.length = 0;
  for (const o of orbs) scene.remove(o.g); orbs.length = 0;
  for (const s of spawnFx) scene.remove(s.m); spawnFx.length = 0;
  for (const s of shockwaves) scene.remove(s.m); shockwaves.length = 0;
  clearParticles(); clearDecals(); drops.length = 0;
  resetUpgrades();
  const b = player.body; b.position.set(rand(-2, 2), .6, 7 + rand(-1, 1)); b.velocity.set(0, 0, 0); b.collisionFilterMask = G_STATIC | G_ENEMY | G_DEBRIS;
  Object.assign(player, { hp: ST.maxHp, yaw: 0, pitch: 0, charges: ST.maxDash, recharge: 0, dashT: 0, invuln: 0, alive: true, kickCd: 0, deathT: 0, slideT: 0, slideCd: 0, spinT: 0, crouchK: 0, airJumps: 0, jumpBuf: 0, sprinting: false });
  Object.assign(shells, { tube: ST.sgTube, reserve: 24, cd: 0, pumpT: 0, loadT: 0, loading: false });
  phoenixReady = false; shiftDown = 0;
  Object.assign(block, { on: false, t: 0, k: 0, guard: 100, broken: 0, hitT: 0 });
  Object.assign(ammo, { mag: magCap(), reserve: 3, reloadT: 0, cd: 0 });
  Object.assign(wpn, { cur: 'katana', next: null, t: 0, off: 0, drawing: false, dt: 1, prev: null });
  score = 0; kills = 0; waveN = hashWave; bossCount = Math.floor(hashWave / 10); combo.n = 0; combo.t = 0; sword.blood = 0; sword.phase = 'idle';
  slowMo = 0; hitStop = 0; autoPickT = 0; matchOver = false; revive.p = 0;
  wave.active = false; wave.between = 1.2; wave.list = []; waitingFor = [];
  kickAnim = 0; Object.assign(viewKick, { roll: 0, pitch: 0, yaw: 0 });
  $('bossbar').hidden = true;
  resetRifles(); resetSpecials(); resetVS();
  for (const g of grenades) scene.remove(g.m); grenades.length = 0;
  refreshPips();
  const vsMode = isVS();
  document.body.classList.toggle('vsmode', vsMode);
  if (vsMode) {
    // VS: takımının tarafında doğ, sandık yok, herkes eşit
    b.position.copy(spawnPoint(myTeam())); player.yaw = myTeam() === 'blue' ? Math.PI : 0;
    return;
  }
  for (const [x, z] of [[5, 12], [-12, 5], [12, -5], [-5, -12]]) { spawnCrate(x - .52, .5, z); spawnCrate(x + .52, .5, z); spawnCrate(x, 1.5, z); }
}
function boardRows() {
  if (net.mode === 'solo') return [{ name: playerName(), color: 0xff3a2a, lv: prog.lv, kills, score, alive: player.alive, me: true }];
  const vsMode = isVS();
  const rows = Object.values(net.players).map(p => {
    const col = vsMode ? TEAMS[p.team].color : p.color;
    return p.id === net.myId
      ? { name: playerName(), color: col, team: p.team, lv: prog.lv, kills, deaths: vs.deaths, score, alive: player.alive, me: true, ping: pingOf(p.id) }
      : { name: p.name, color: col, team: p.team, lv: p.lv || 1, kills: p.kills || 0, deaths: p.deaths || 0, score: p.score || 0, alive: p.alive, ping: pingOf(p.id) };
  });
  return rows.sort((a, b) => vsMode && a.team !== b.team ? (a.team === 'red' ? -1 : 1) : b.kills - a.kills);
}
function pingText(ms) { return ms === 'host' ? 'HOST' : ms == null ? '…' : ms + ' ms'; }
function pingClass(ms) { return typeof ms !== 'number' ? '' : ms < 80 ? ' good' : ms < 160 ? ' mid' : ' bad'; }
const hexCol = c => '#' + c.toString(16).padStart(6, '0');
function showEnd(msg, vsWin) {
  matchOver = net.mode !== 'solo';
  $('endMsg').textContent = vsWin ? '' : msg;
  const rows = boardRows();
  if (vsWin) {
    $('endTitle').textContent = msg;
    $('endTitle').className = vsWin;
    $('endWave').innerHTML = `RAUNT <b class="red">${vs.rr}</b> — <b class="blue">${vs.rb}</b>`;
    $('endBoard').innerHTML = '<tr><th>OYUNCU</th><th>TAKIM</th><th>LEŞ</th><th>ÖLÜM</th></tr>' + rows.map(r => `<tr${r.me ? ' class="me"' : ''}><td><i style="background:${hexCol(r.color)}"></i>${escapeHtml(r.name)}</td><td>${TEAMS[r.team].name}</td><td>${r.kills}</td><td>${r.deaths}</td></tr>`).join('');
  } else {
    $('endTitle').textContent = 'Katledildin'; $('endTitle').className = '';
    $('endWave').innerHTML = 'DALGA <b>' + waveN + '</b>';
    $('endBoard').innerHTML = '<tr><th>OYUNCU</th><th>SV</th><th>LEŞ</th><th>PUAN</th></tr>' + rows.map(r => `<tr${r.me ? ' class="me"' : ''}><td><i style="background:${hexCol(r.color)}"></i>${escapeHtml(r.name)}</td><td>${r.lv}</td><td>${r.kills}</td><td>${r.score.toLocaleString('tr-TR')}</td></tr>`).join('');
  }
  const canRestart = net.mode !== 'guest';
  $('againBtn').hidden = !canRestart;
  $('endNote').textContent = canRestart ? '' : 'Host yeniden başlatınca oyun başlar.';
  $('bossbar').hidden = true;
  $('upgrade').hidden = true;
  $('dead').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

/* ================= KONTROLLER ================= */
let pauseOpenedAt = 0;
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  // Esc açık ekranı kapatır
  if (e.code === 'Escape') {
    if (!$('settings').hidden) { closeSettings(); return; }
    if (!$('upgrade').hidden) { closePick(); return; }
    if (!$('pause').hidden && performance.now() - pauseOpenedAt > 400) { play(true); toast('FAREYİ KİLİTLEMEK İÇİN TIKLA'); return; }
  }
  if (state === 'upgrade') {
    const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (i >= 0) chooseUpgrade(i);
    if (e.code === 'KeyT') closePick();
    return;
  }
  if (e.code === 'Space' || e.code === 'Tab' || (e.ctrlKey && state === 'play')) e.preventDefault();   // Ctrl = eğilme: Ctrl+S/D vb. tarayıcıya gitmesin
  // M: takım seç (ölüyken de)
  if (isVS() && e.code === 'KeyM' && !e.repeat && (state === 'play' || state === 'dead')) { toggleTeamPick(); return; }
  if (isVS() && teamUI.open && e.code === 'Escape') { closeTeamPick(); return; }
  if (state !== 'play') return;
  if (e.repeat) return;
  // VS: satın alma menüsü fareyle kullanılır (B), raunt içinde 1 / 2 / 3 yuvalar, Z sis, X flaş
  if (isVS() && e.code === 'KeyB') { toggleBuy(); return; }
  if (isVS() && e.code === 'Digit4') return;   // VS: 4 = bomba kur / imha et (basılı tutulur)
  if (isVS() && /^Digit[1-3]$/.test(e.code)) { const w = vsSlots()[+e.code.slice(5) - 1]; if (w) switchWeapon(w); return; }
  if (isVS() && e.code === 'KeyZ') { throwUtil('smoke'); return; }
  if (isVS() && e.code === 'KeyX') { throwUtil('flash'); return; }
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (SETTINGS.alwaysSprint) dash(); else shiftDown = performance.now(); }
  if (e.code === 'Space') player.jumpBuf = .15;
  if (e.code === 'KeyC' || e.code === 'ControlLeft' || e.code === 'ControlRight') crouchInput();
  if (e.code === 'KeyE') kick();
  if (e.code === 'KeyF') startInspect();
  if (e.code === 'KeyG') attackInput('H');
  if (e.code === 'KeyQ') quickSwitch();
  if (e.code === 'Digit1') switchWeapon('katana');
  if (e.code === 'Digit2') switchWeapon('uzi');
  if (e.code === 'Digit3') switchWeapon('shotgun');
  if (e.code === 'Digit4') switchWeapon('m4');
  if (e.code === 'Digit5') switchWeapon('awp');
  if (e.code === 'Digit6' && special.kind) switchWeapon(special.kind);
  if (e.code === 'KeyR') { startReload(); startShellReload(); rifleReload(); pistolReload(); gunReload(); }
  if (e.code === 'KeyT' && !isVS()) openPick();
  if (e.code === 'KeyV') { SETTINGS.thirdPerson = !SETTINGS.thirdPerson; saveSettings(); toast(SETTINGS.thirdPerson ? '3. ŞAHIS KAMERA' : '1. ŞAHIS KAMERA'); }
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    // kısa basış = atılma, basılı tutma = koşma
    if (shiftDown && performance.now() - shiftDown < SPRINT_HOLD && state === 'play') dash();
    shiftDown = 0;
  }
});
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.left = mouse.right = false; shiftDown = 0; });
document.addEventListener('mousemove', e => {
  if ((state === 'play' || state === 'dead') && buyMouseMove(e)) return;
  if (state !== 'play' || !player.alive) return;
  if (document.pointerLockElement !== canvas && !fallbackLook) return;
  const s = .0022 * SETTINGS.sens * (camera.fov / SETTINGS.fov);   // dürbünde fare yavaşlar
  player.yaw -= e.movementX * s; player.pitch = clamp(player.pitch - e.movementY * s, -1.45, 1.45);
  sword.swayX = clamp(sword.swayX - e.movementX * .00025, -.05, .05); sword.swayY = clamp(sword.swayY + e.movementY * .00025, -.05, .05);
});
canvas.addEventListener('mousedown', e => {
  if (state !== 'play' && state !== 'dead') return;
  if (document.pointerLockElement !== canvas && !fallbackLook) { lock(); return; }
  if (buyMouseDown(e)) return;
  if (state !== 'play') return;
  if (e.button === 0) { mouse.left = true; sgClick = true; rifClick = true; attackInput('L'); }
  if (e.button === 1) { e.preventDefault(); attackInput('H'); }
  if (e.button === 2) { mouse.right = true; sgClickR = true; rifClickR = true; if (isKnife(wpn.cur)) knifeAttack(true); }
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });
let wheelT = 0;
window.addEventListener('wheel', e => { if (state !== 'play') return; const n = performance.now(); if (n - wheelT < 220) return; wheelT = n; switchWeapon(); }, { passive: true });
canvas.addEventListener('contextmenu', e => e.preventDefault());
let lockedOnce = false;
function lockFailed() { if (!lockedOnce) fallbackLook = true; }
function lock() {
  if (fallbackLook) return;
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(lockFailed); } catch (e) { lockFailed(); }
  // Ctrl ile eğilirken Ctrl+W pencereyi kapatmasın: tam ekranda bu tuşlar klavye kilidiyle oyuna verilir (Esc serbest kalır)
  if (navigator.keyboard && navigator.keyboard.lock && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).then(() => navigator.keyboard.lock(['KeyW', 'KeyT', 'KeyN', 'KeyQ', 'Tab'])).catch(() => {});
  }
}
// klavye kilidi tutmazsa son çare: maç sırasında pencere kapanmadan önce sorulur
window.addEventListener('beforeunload', e => { if (state === 'play' && (keys.ControlLeft || keys.ControlRight)) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('pointerlockerror', lockFailed);
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) lockedOnce = true;
  else { mouse.left = mouse.right = false; }
  if (document.pointerLockElement !== canvas && state === 'play' && !fallbackLook) {
    state = 'pause'; pauseOpenedAt = performance.now(); $('owned').textContent = ownedText();
    $('pauseNote').hidden = net.mode === 'solo';
    renderPausePlayers();
    $('pause').hidden = false;
  }
});
function play(noLock) {
  initAudio(); if (!noLock) lock();
  $('start').hidden = true; $('pause').hidden = true; $('dead').hidden = true; $('upgrade').hidden = true; $('settings').hidden = true; $('hud').hidden = false;
  state = player.alive ? 'play' : 'dead'; last = performance.now();
}
$('startBtn').addEventListener('click', () => { leaveRoom(true); resetGame(); play(); });
$('resumeBtn').addEventListener('click', () => play());
$('againBtn').addEventListener('click', () => { if (net.mode === 'host') startMatchHost(); else { resetGame(); play(); } });
function toMainMenu() {
  leaveRoom(true); resetGame(); state = 'menu';
  for (const id of ['dead', 'pause', 'upgrade', 'settings', 'hud']) $(id).hidden = true;
  closeBuy(); closeTeamPick(); $('minimap').hidden = true; voiceStopAll(); clearUtils();
  $('scope').hidden = true;
  $('start').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
$('menuBtn').addEventListener('click', toMainMenu);
$('pauseMenuBtn').addEventListener('click', toMainMenu);
$('pickLater').addEventListener('click', closePick);

/* ================= GÖSTERGE PANELİ ================= */
const hud = {};
function setText(id, v) { if (hud[id] !== v) { hud[id] = v; $(id).textContent = v; } }
function refreshPips() {
  const box = $('pips'); box.innerHTML = '';
  for (let i = 0; i < ST.maxDash; i++) { const w = document.createElement('i'); const b = document.createElement('b'); b.id = 'pip' + i; w.appendChild(b); box.appendChild(w); }
}
let boardT = 0;
function renderBoard() {
  const rows = boardRows();
  const mp = net.mode !== 'solo', vsMode = isVS();
  $('board').classList.toggle('mp', mp);
  $('board').innerHTML = rows.map(r => `<div class="brow${r.me ? ' me' : ''}${r.alive ? '' : ' dead'}"><i style="background:${hexCol(r.color)}"></i><span class="bn">${escapeHtml(r.name)}</span><span class="bl">${vsMode ? r.kills + '/' + r.deaths : 'SV ' + r.lv}</span><span class="bk">${vsMode ? '' : r.kills}</span>${mp ? `<span class="bp${pingClass(r.ping)}">${pingText(r.ping)}</span>` : ''}</div>`).join('');
}
function updateHUD(dt) {
  const hp = Math.max(0, Math.ceil(player.hp));
  if (hud.hpv !== hp || hud.maxHp !== ST.maxHp) { hud.hpv = hp; hud.maxHp = ST.maxHp; $('hpn').textContent = hp; $('hpb').style.width = (hp / ST.maxHp * 100) + '%'; $('hpn').style.color = hp < ST.maxHp * .3 ? 'var(--blood-hi)' : ''; }
  $('guardb').style.width = block.guard + '%';
  $('guardb').style.opacity = block.broken > 0 ? .3 : 1;
  setText('score', score.toLocaleString('tr-TR'));
  setText('wave', 'DALGA ' + Math.max(1, waveN));
  setText('lvl', 'SEVİYE ' + prog.lv);
  $('xpb').style.width = (prog.xp / xpNeed(prog.lv) * 100) + '%';
  const meWaiting = waitingFor.includes(playerName()) && picksLeft() > 0;
  setText('waitHint', waitingFor.length && !wave.active ? (meWaiting ? 'DALGA SEN SEÇİNCE BAŞLAYACAK · T' : 'ÖZELLİK SEÇİMİ BEKLENİYOR: ' + waitingFor.join(', ').toLocaleUpperCase('tr-TR')) : '');
  const pl = picksLeft();
  setText('pickHint', pl > 0 ? (rarePicks > 0 ? 'T · NADİR ÖDÜL' : 'T · ÖZELLİK SEÇ') + (pl > 1 ? ' ×' + pl : '') : '');
  for (let i = 0; i < ST.maxDash; i++) {
    const el = $('pip' + i); if (!el) continue;
    const f = i < player.charges ? 1 : (i === player.charges ? player.recharge / ST.dashRecharge : 0);
    el.style.transform = `scaleX(${f})`; el.style.background = f >= 1 ? 'var(--steel)' : 'var(--ash)';
  }
  const w = wpn.next || wpn.cur;
  setText('weapon', WEAPON_NAMES[w] + (w === 'shotgun' && ST.sgAuto ? ' · OTO' : '') + (isVS() ? '   [1/2/3]' : ''));
  if (w === 'uzi') {
    setText('ammo', ammo.mag + ' / ' + magCap());
    setText('mags', '▮'.repeat(ammo.reserve) + '▯'.repeat(Math.max(0, ST.maxMags - ammo.reserve)));
  } else if (w === 'shotgun') {
    setText('ammo', shells.tube + ' / ' + shellCap());
    setText('mags', 'YEDEK FİŞEK ' + shells.reserve);
  } else if (w === 'm4') {
    setText('ammo', m4.mag + ' / ' + ST.m4Mag);
    setText('mags', '▮'.repeat(m4.reserve) + (isVS() ? '' : '  BOMBA ' + '●'.repeat(m4.gren) + '○'.repeat(Math.max(0, ST.grenMax - m4.gren))));
  } else if (isGun(w)) {
    setText('ammo', gst[w].mag + ' / ' + GUNS[w].mag);
    setText('mags', 'YEDEK ' + gst[w].reserve);
  } else if (w === 'pistol') {
    setText('ammo', pis.mag + ' / ' + RIF.pistol.mag);
    setText('mags', 'YEDEK ' + pis.reserve);
  } else if (w === 'awp') {
    setText('ammo', awp.mag + ' / ' + ST.awpMag);
    setText('mags', 'YEDEK ' + awp.reserve);
  } else if (isSpecial(w)) {
    setText('ammo', special.ammo + ' / ' + SPECIALS[w].ammo);
    setText('mags', 'BOSS SİLAHI · MERMİ TOPLANAMAZ');
  } else { setText('ammo', ''); setText('mags', ''); }
  if (isVS()) renderVsHud();
  let rl = '';
  if ((w === 'm4' && m4.reloadT > 0) || (w === 'awp' && awp.reloadT > 0) || (isGun(w) && gst[w].reloadT > 0)) rl = 'ŞARJÖR DEĞİŞİYOR';
  else if (w === 'uzi' && ammo.reloadT > 0) rl = 'ŞARJÖR DEĞİŞİYOR';
  else if (w === 'uzi' && ammo.mag <= 0 && ammo.reserve <= 0) rl = 'MERMİ BİTTİ · SARI KUTULARI TOPLA';
  else if (w === 'shotgun' && shells.loading) rl = 'FİŞEK DOLDURULUYOR';
  else if (w === 'shotgun' && shells.tube <= 0 && shells.reserve <= 0) rl = 'FİŞEK BİTTİ · SARI KUTULARI TOPLA';
  setText('reload', rl);
  $('cross').classList.toggle('uzi', w !== 'katana' && !isKnife(w));
  $('cross').hidden = w === 'awp' && awp.scopeK > .3;
  $('cross').classList.toggle('sg', w === 'shotgun');
  hitMarkT -= dt; $('cross').classList.toggle('hit', hitMarkT > 0);
  const boss = enemies.find(e => isBossKind(e.kind) && e.hp > 0);
  if (boss) {
    if ($('bossbar').hidden) $('bossbar').hidden = false;
    const info = BOSS_INFO[boss.kind];
    let nm = info.name;
    if (isBigBoss(boss.kind) && bossCount > 2) nm += ' ' + 'I'.repeat(Math.min(Math.ceil(bossCount / 2), 3));
    setText('bossName', nm + '  ·  ' + (boss.stage || 1) + '. EVRE' + (boss.shieldT > 0 || boss.invulnT > 0 ? '  ·  KALKAN' : ''));
    $('bossFill').style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
    $('bossbar').classList.toggle('shielded', boss.shieldT > 0 || boss.invulnT > 0);
    if (hud.bossMarks !== boss.kind) { hud.bossMarks = boss.kind; $('bossMarks').innerHTML = info.stages.map(f => `<i style="left:${f * 100}%"></i>`).join(''); }
  } else if (!$('bossbar').hidden) $('bossbar').hidden = true;
  updatePerksHud(dt);
  boardT -= dt; if (boardT <= 0) { boardT = .25; renderBoard(); }
  combo.t -= dt; if (combo.t <= 0) combo.n = 0;
  $('combo').style.opacity = combo.t > 0 ? Math.min(1, combo.t) : 0;
  hurtFlash = Math.max(0, hurtFlash - dt * 2.2);
  const low = player.hp < ST.maxHp * .3 && player.alive ? (.35 + Math.sin(gameTime * 6) * .15) : 0;
  if (player.alive && player.hp < ST.maxHp * .28 && state === 'play') sfx.heartbeat();
  $('hurt').style.opacity = Math.max(hurtFlash, low, player.alive ? 0 : .6);
  dashFlash = Math.max(0, dashFlash - dt * 4);
  $('dashfx').style.opacity = dashFlash;
}

/* ================= ANA DÖNGÜ ================= */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  updateFps(Math.max(0, (now - last) / 1000));
  const rdt = clamp((now - last) / 1000, 0, .05); last = now;
  const mp = net.mode !== 'solo' && net.inMatch;
  const sim = state === 'play' || state === 'dead' || (mp && (state === 'pause' || state === 'upgrade'));
  if (sim) {
    let dt = rdt;
    if (hitStop > 0) { hitStop -= rdt; dt = rdt * .07; }
    else if (slowMo > 0) { slowMo -= rdt; dt = rdt * .3; }
    gameTime += dt;
    if (typeof updateMuzzleFlash === 'function') updateMuzzleFlash(rdt);
    updateBlock(dt);
    updateWeaponSwitch(dt);
    updatePlayer(dt);
    world.step(1 / 60, dt, 4);
    updateEnemies(dt);
    updateProxies(rdt);
    updateDebris(dt);
    updateParticles(dt);
    updateProjectiles(dt);
    updateShockwaves(dt);
    updatePillars(dt);
    updateSpecials(dt);
    if (ST.regen && player.alive && !isVS()) { const h = Math.min(ST.maxHp - player.hp, ST.regen * dt); if (h > 0) { player.hp += h; perkStat.regen += h; } }
    if (mouse.left && state === 'play' && sword.phase === 'idle') attackInput('L');
    updateSword(dt);
    updateUzi(dt);
    updateShotgun(dt);
    updateGuns(dt);
    updateRifles(dt);
    updatePistol(dt);
    updateKnife(dt);
    applyInspect(rdt);
    updateKickLeg(dt);
    updateTracers(rdt);
    updateShop(dt, rdt);
    updateBomb(rdt);
    updateMinimap(rdt);
    if (isVS()) updateVS(dt, rdt);
    else if (net.mode !== 'guest' && !matchOver && (state === 'play' || mp)) updateWaves(dt);
    if (autoPickT > 0) { autoPickT -= rdt; if (autoPickT <= 0) openPick(); }
    updateRevive(rdt);
    updateNet(rdt);
    updateHUD(rdt);
    drawSplats(rdt);
    syncCamera(dt, rdt);
  } else if (state === 'menu') {
    gameTime += rdt;
    const t = now / 1000 * .08; camera.position.set(Math.sin(t) * 12, 4, Math.cos(t) * 12); camera.rotation.set(-.18, t, 0);
  }
  updateAmbience(rdt, gameTime);
  updateVoice(rdt);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  if (state !== 'menu' && !SETTINGS.thirdPerson && awp.scopeK < .6) renderer.render(vmScene, vmCam);
}
// silah ve el renkleri sRGB olarak yazıldı; doğrusal renk uzayına çevrilmezse soluk / pembe görünürler
function linearizeViewmodel() {
  const seen = new Set();
  vmScene.traverse(o => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      if (seen.has(m) || m.userData.lin || !m.color) continue;
      seen.add(m); m.userData.lin = true;
      m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear();
      if (m.envMap) m.envMap = vmEnvTex;
      if (m.envMap) m.envMapIntensity = m.metalness > .9 ? .9 : m.metalness > .5 ? .8 : .6;   // cehennem yansıması metali kızıla boyamasın
      if (m.metalness > .9) { m.metalness = .75; m.roughness = Math.max(m.roughness, .2); }    // kılıç ağzı: çelik grisi
    }
  });
}
linearizeViewmodel();
resetGame();
requestAnimationFrame(frame);
