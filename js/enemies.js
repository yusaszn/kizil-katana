'use strict';
/* Düşmanlar, boss (Kasap), ateş topları, şok dalgaları, yerden toplananlar.
   Tek kişide ve host'ta yapay zeka burada çalışır; katılanlarda düşmanlar host'tan gelen görüntüyü izler. */

const TYPES = {
  grunt: { hp: 4, speed: 4.3, r: .45, scale: 1, skin: 0x5f6b4e, dmg: 12, reach: 2.0, wind: .45, score: 100, xp: 10, orbs: 2, ammoChance: .35, pitch: 1 },
  imp: { hp: 2, speed: 5.6, r: .38, scale: .85, skin: 0x8c2a1c, dmg: 10, reach: 1.6, wind: .5, score: 150, xp: 15, orbs: 2, ammoChance: .35, pitch: 1.5, ranged: true },
  brute: { hp: 14, speed: 2.9, r: .8, scale: 1.65, skin: 0x47302a, dmg: 24, reach: 3.1, wind: .65, score: 450, xp: 45, orbs: 6, ammoChance: 1, pitch: .6 },
  boss: { hp: 170, speed: 3.4, r: 1.15, scale: 2.7, skin: 0x3a120e, dmg: 30, reach: 5.4, wind: .75, score: 5000, xp: 250, orbs: 14, ammoChance: 1, pitch: .4 },
  // yeni düşmanlar
  runner: { hp: 1.6, speed: 7.4, r: .34, scale: .78, skin: 0x8a7e6a, dmg: 7, reach: 1.5, wind: .22, score: 80, xp: 8, orbs: 1, ammoChance: .2, pitch: 1.8, leap: true },
  shielder: { hp: 7, speed: 3.3, r: .55, scale: 1.2, skin: 0x3c4048, dmg: 16, reach: 2.2, wind: .55, score: 250, xp: 30, orbs: 3, ammoChance: .6, pitch: .8, shield: true },
  bomber: { hp: 2.4, speed: 6.0, r: .42, scale: .95, skin: 0x6a7a20, dmg: 34, reach: 2.2, wind: .7, score: 120, xp: 12, orbs: 1, ammoChance: .3, pitch: 1.3, bomber: true },
  flyer: { hp: 3, speed: 5.2, r: .4, scale: .9, skin: 0x5a2a6a, dmg: 9, reach: 0, wind: .4, score: 180, xp: 18, orbs: 2, ammoChance: .35, pitch: 1.7, ranged: true, flying: true },
  // ara boss: her 5 dalgada (5, 15, 25...)
  cellat: { hp: 75, speed: 4.4, r: .9, scale: 2.0, skin: 0x2a2420, dmg: 22, reach: 3.8, wind: .6, score: 2000, xp: 120, orbs: 10, ammoChance: 1, pitch: .5, mini: true },
  witch: { hp: 60, speed: 4.6, r: .6, scale: 1.35, skin: 0x3a2a40, dmg: 12, reach: 2, wind: .5, score: 1800, xp: 110, orbs: 8, ammoChance: 1, pitch: 1.4, mini: true, flying: true, hover: 1.7 },
  // büyük bosslar: her 10 dalgada sırayla Kasap ve Ateş Lordu
  lord: { hp: 210, speed: 2.6, r: 1.0, scale: 2.4, skin: 0x4a1a08, dmg: 24, reach: 4, wind: .7, score: 6000, xp: 300, orbs: 14, ammoChance: 1, pitch: .45 },
};
const BOSS_INFO = {
  boss: { name: 'KASAP', stages: [.66, .33], adds: [null, 'brute', 'runner'] },
  lord: { name: 'ATEŞ LORDU', stages: [.66, .33], adds: [null, 'imp', 'imp'] },
  cellat: { name: 'CELLAT', stages: [.5], adds: [null, 'runner'] },
  witch: { name: 'CADI', stages: [.5], adds: [null, 'flyer'] },
};
const isBossKind = k => !!BOSS_INFO[k];
const isBigBoss = k => k === 'boss' || k === 'lord';
// can evreleri: eşik geçilince boss kısa süre dokunulmaz olur, kükrer, yardımcı çağırır ve davranışı değişir
function updateStage(e) {
  const info = BOSS_INFO[e.kind]; if (!info) return;
  const frac = e.hp / e.maxHp; let st = 1;
  for (const s of info.stages) if (frac < s) st++;
  if (st <= (e.stage || 1)) return;
  e.stage = st; e.act = null; e.bossCd = 1.6; e.invulnT = 1.4;
  e.raged = st > info.stages.length;
  const txt = info.name + ' · ' + st + '. EVRE';
  banner(info.name, st + '. EVRE'); bcast({ t: 'toast', text: txt });
  sfx.roar(); shake(.7);
  e.skin.emissive.setRGB(.1 * st, .01, 0);
  if (e.kind === 'boss') coreMat.color.setHex(st >= 3 ? 0xffd040 : 0xff8a20);
  if (isBigBoss(e.kind)) spawnShockwave(e.body.position.x, e.body.position.z, st >= 3);
  const add = info.adds[st - 1];
  if (add) for (let i = 0; i < (isBigBoss(e.kind) ? 2 + st : 2); i++) spawnEnemy(add, [clamp(e.body.position.x + rand(-5, 5), -H + 2, H - 2), clamp(e.body.position.z + rand(-5, 5), -H + 2, H - 2)]);
}

/* ================= ATEŞ SÜTUNLARI (Ateş Lordu) ================= */
const pillars = [];
const pillarRingMat = new THREE.MeshBasicMaterial({ color: 0xff3a10, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const pillarGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xff6a1a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
// önce yerde uyarı halkası çıkar, süre dolunca ateş fışkırır
function firePillar(x, z, delay, visualOnly) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.7, 32), pillarRingMat.clone()); ring.rotation.x = -Math.PI / 2; ring.position.set(x, .05, z); scene.add(ring);
  pillars.push({ x, z, t: delay, ring, fire: null, life: .6, visualOnly });
  if (!visualOnly) bcast({ t: 'pillar', x: r2(x), z: r2(z), d: r2(delay) });
}
function updatePillars(dt) {
  for (const p of pillars.slice()) {
    if (p.t > 0) {
      p.t -= dt; p.ring.material.opacity = .4 + Math.sin(gameTime * 20) * .3;
      if (p.t <= 0) {
        scene.remove(p.ring);
        const s = new THREE.Sprite(pillarGlow); s.position.set(p.x, 2.5, p.z); s.scale.set(3, 6, 1); scene.add(s); p.fire = s;
        for (let i = 0; i < 70; i++) emit(p.x + rand(-1, 1), .2, p.z + rand(-1, 1), rand(-1.5, 1.5), rand(8, 16), rand(-1.5, 1.5), 2, 1, rand(.3, .7), .05, rand(.5, 1));
        sfx.boom(); if (eyePos.distanceTo(new V3(p.x, 1, p.z)) < 10) shake(.25);
        if (!p.visualOnly) for (const t of getTargets()) if (!t.dead && Math.hypot(t.x - p.x, t.z - p.z) < 1.7) hitTarget(t, 22, new V3(p.x, 0, p.z), null, { unblockable: true });
      }
    } else {
      p.life -= dt; if (p.fire) p.fire.material.opacity = Math.max(0, p.life / .6);
      if (p.life <= 0) { if (p.fire) scene.remove(p.fire); pillars.splice(pillars.indexOf(p), 1); }
    }
  }
}
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a10 });
const hornMat = new THREE.MeshStandardMaterial({ color: 0x1d1310, roughness: .5 });
const toothMat = new THREE.MeshStandardMaterial({ color: 0xd8cbb0, roughness: .6 });
const coreMat = new THREE.MeshBasicMaterial({ color: 0xff5a14 });
const enemies = [];
let nextEnemyId = 1;
const enemyById = id => enemies.find(e => e.id === id);
function bm(hx, hy, hz, mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat); m.userData.he = new V3(hx, hy, hz); return m; }
function buildModel(kind, skin) {
  const g = new THREE.Group(), parts = [];
  const legs = [], arms = [];
  const spiky = kind === 'brute' || kind === 'boss';
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * .16, .82, 0);
    const m = bm(.11, .4, .12, skin); m.position.y = -.4; piv.add(m); g.add(piv); parts.push(m); legs.push(piv);
    const ap = new THREE.Group(); ap.position.set(sx * .42, 1.53, 0);
    const a = bm(.09, .36, .09, skin); a.position.y = -.36; ap.add(a); g.add(ap); parts.push(a); arms.push(ap);
    if (spiky) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.07, .25, 5), hornMat); sp.position.set(0, .05, 0); sp.rotation.z = -sx * .5; ap.add(sp); }
  }
  const torso = bm(.3, .36, .19, skin); torso.position.y = 1.2; g.add(torso); parts.push(torso);
  const head = bm(.17, .17, .17, skin); head.position.y = 1.75; g.add(head); parts.push(head);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(kind === 'boss' ? .08 : .06, kind === 'boss' ? .04 : .03, .01), eyeMat); e.position.set(sx * .07, .04, .172); head.add(e);
    if (kind === 'imp') { const h = new THREE.Mesh(new THREE.ConeGeometry(.045, .28, 5), hornMat); h.position.set(sx * .12, .25, -.02); h.rotation.z = -sx * .35; head.add(h); }
    if (kind === 'boss') { const h = new THREE.Mesh(new THREE.ConeGeometry(.05, .42, 6), hornMat); h.position.set(sx * .2, .22, 0); h.rotation.z = -sx * 1.05; head.add(h); }
  }
  const teeth = new THREE.Mesh(new THREE.BoxGeometry(.2, .04, .01), toothMat); teeth.position.set(0, -.08, .172); head.add(teeth);
  if (kind === 'boss') {
    const core = new THREE.Mesh(new THREE.BoxGeometry(.16, .24, .01), coreMat); core.position.set(0, .04, .192); torso.add(core);
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.03, .26, .01), coreMat); c.position.set(sx * .17, -.05, .192); c.rotation.z = sx * .5; torso.add(c); }
  }
  const extra = {};
  if (kind === 'runner') {
    // kambur, uzun pençeli
    torso.rotation.x = .5;
    for (const ap of arms) { const cl = new THREE.Mesh(new THREE.ConeGeometry(.04, .22, 4), toothMat); cl.position.y = -.78; cl.rotation.x = Math.PI; ap.add(cl); }
  }
  if (kind === 'shielder') {
    // sol kolda büyük demir kalkan, başta miğfer
    const shield = new THREE.Group(); shield.position.set(.1, -.45, .2); arms[0].add(shield);
    shield.add(new THREE.Mesh(new THREE.BoxGeometry(.6, .85, .06), shieldMat));
    for (const [x, y] of [[-.2, .3], [.2, .3], [-.2, -.3], [.2, -.3], [0, 0]]) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.04, .12, 5), hornMat); sp.position.set(x, y, .08); sp.rotation.x = Math.PI / 2; shield.add(sp); }
    const helm = new THREE.Mesh(new THREE.BoxGeometry(.38, .2, .38), shieldMat); helm.position.y = .1; head.add(helm);
    extra.shield = shield;
  }
  if (kind === 'bomber') {
    // şişmiş, parlayan karın
    const belly = new THREE.Mesh(new THREE.SphereGeometry(.36, 14, 10), bellyMat.clone()); belly.position.set(0, -.08, .1); torso.add(belly);
    extra.belly = belly;
  }
  if (kind === 'flyer') {
    // bacaksız, kanatlı, tek büyük gözlü
    for (const l of legs) l.visible = false;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.11, 12, 10), eyeMat); eye.position.set(0, .02, .14); head.add(eye);
    const wings = [];
    for (const sx of [-1, 1]) {
      const wp = new THREE.Group(); wp.position.set(sx * .2, 1.4, -.15); g.add(wp);
      const w = new THREE.Mesh(new THREE.BoxGeometry(.9, .04, .45), wingMat); w.position.x = sx * .45; wp.add(w);
      wings.push(wp);
    }
    extra.wings = wings;
  }
  if (kind === 'lord') {
    // uzun cüppeli ateş iblisi: alev taç, ucu yanan asa
    for (const l of legs) l.visible = false;
    const robe = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.1, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a0804, roughness: .8, side: THREE.DoubleSide })); robe.position.y = .55; g.add(robe);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const c = new THREE.Mesh(new THREE.ConeGeometry(.04, .22, 5), coreMat); c.position.set(Math.cos(a) * .15, .25, Math.sin(a) * .15); head.add(c); }
    const staff = new THREE.Group(); staff.position.set(0, -.7, .05); arms[1].add(staff);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.8, 6), hornMat); pole.position.y = 0; staff.add(pole);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), coreMat); orb.position.y = -.95; staff.add(orb);
  }
  if (kind === 'witch') {
    // süzülen cadı: sivri şapka, cüppe, mor gözler
    for (const l of legs) l.visible = false;
    const robe = new THREE.Mesh(new THREE.ConeGeometry(.42, 1.0, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c1024, roughness: .8, side: THREE.DoubleSide })); robe.position.y = .55; g.add(robe);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(.22, .55, 8), new THREE.MeshStandardMaterial({ color: 0x120a16, roughness: .8 })); hat.position.y = .38; head.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .02, 14), hat.material); brim.position.y = .15; head.add(brim);
    for (const sx of [-1, 1]) { const ey = new THREE.Mesh(new THREE.BoxGeometry(.06, .03, .01), new THREE.MeshBasicMaterial({ color: 0xc040ff })); ey.position.set(sx * .07, .04, .175); head.add(ey); }
  }
  if (kind === 'cellat') {
    // başlıklı cellat, sağ elde dev satır
    const hood = new THREE.Mesh(new THREE.ConeGeometry(.24, .5, 6), new THREE.MeshStandardMaterial({ color: 0x0c0a0a, roughness: .8 })); hood.position.y = .12; head.add(hood);
    const cleaver = new THREE.Group(); cleaver.position.set(0, -.75, .1); arms[1].add(cleaver);
    const bladeM = new THREE.Mesh(new THREE.BoxGeometry(.04, .55, .45), shieldMat); bladeM.position.set(0, -.25, .15); cleaver.add(bladeM);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(.045, .55, .04), coreMat); edge.position.set(0, -.25, .38); cleaver.add(edge);
  }
  // hazır model varsa kutular gizlenir ama yerinde kalır: ölünce et parçaları onların konumundan kopar
  const cfg = ENEMY_GLB[kind], glb = cfg && modelInstance(cfg.m, cfg.h, cfg);
  if (glb) {
    g.traverse(o => { if (o.isMesh) o.visible = false; });
    for (const k of ['shield', 'cleaver']) {
      const x = extra[k] || (k === 'cleaver' && kind === 'cellat' && arms[1].children.find(c => c.isGroup));
      if (!x) continue;
      x.parent.remove(x); g.add(x); x.traverse(o => { o.visible = true; }); extra[k] = x;
    }
    g.add(glb.root);
  }
  return Object.assign({ g, parts, legs, arms, head, torso, glb, cfg }, extra);
}

/* ================= HAZIR MODELLER ================= */
// tür → model (modeller/ klasörü), ölçek 1'deki boy, oyuna özel klip ve renk ayarları
const ENEMY_GLB = {
  grunt: { m: 'goblin', h: 1.85, gib: 0x6f8a2c },
  imp: { m: 'imp', h: 1.55, gib: 0x6a120a, atk: ['Weapon', 'Punch'], tint: { BlueDemon_Main: 0x5c0c06 } },
  brute: { m: 'ogre', h: 1.95, gib: 0xa8442e },
  boss: { m: 'ork', h: 2.0, gib: 0x4a0d06, atk: ['Weapon', 'Punch'], glow: 0x1a0300, tint: { Orc_Main: 0x4a0d06, Orc_Secondary: 0x240404, Orc_Hair: 0x0c0c0c } },
  runner: { m: 'iskelet', h: 1.9, gib: 0xd6c49a },
  shielder: { m: 'sovalye', h: 1.95, gib: 0xd6c49a },
  bomber: { m: 'sisko', h: 1.7, gib: 0x6a5c98, run: ['Run_Arms', 'Run'], glow: 0x1c3800 },
  flyer: { m: 'yarasa', h: 1.5, gib: 0x241a2c, fly: true },
  cellat: { m: 'kilicli', h: 2.0, gib: 0xd6c49a, atk: ['Sword', 'Punch'] },
  witch: { m: 'cadi', h: 1.95, gib: 0x2a1040, fly: true, atk: ['Punch_Right'] },
  lord: { m: 'seytan', h: 2.1, gib: 0x5a0a04, atk: ['Weapon', 'Punch'], glow: 0x3a0c00 },
};
const CLIP = {
  idle: ['Idle', 'Skeleton_Idle', 'Bat_Flying'],
  walk: ['Walk', 'Skeleton_Running', 'Bat_Flying'],
  run: ['Run', 'Skeleton_Running', 'Bat_Flying'],
  atk: ['Attack', 'Punch', 'Skeleton_Attack', 'Bat_Attack'],
  hit: ['HitRecieve', 'HitReact', 'Bat_Hit'],
};
const BOSS_SWING = ['swipe', 'slam', 'cleave', 'volley', 'summon', 'leap'];
const _bw = new V3();
function animateGlb(e, dt, speedNow, s, flinch) {
  const mi = e.model.glb, cfg = e.model.cfg, T = e.T, sc = T.scale;
  for (const m of mi.mats) m.emissive.copy(m.userData.baseEmissive).add(e.skin.emissive);   // vurulunca parlama
  const attacking = s.windup || (isBossKind(e.kind) && BOSS_SWING.includes(s.act) && !s.actDone);
  // yeni darbe: parlama aniden arttıysa kısa sarsılma klibi (kamikazenin yanıp sönmesi sayılmaz)
  if (!e.fuse && e.flash > (e.glbFlash || 0) + .3) e.hitT = .3;
  e.glbFlash = e.flash; e.hitT = (e.hitT || 0) - dt;
  if (attacking) {
    if (!e.glbAtk) {
      const clip = (cfg.atk || CLIP.atk).map(n => mi.clips[n]).find(Boolean);
      // vuruş anı (klibin ~%60'ı) kurulma süresinin sonuna denk gelsin
      const sp = clip && s.windup && !isBossKind(e.kind) ? clamp(clip.duration * .6 / T.wind, .6, 2.5) : 1;
      playClip(mi, cfg.atk || CLIP.atk, { once: true, restart: true, speed: sp, fade: .1 });
    }
  } else if (e.hitT > 0 && !s.charging) {
    playClip(mi, CLIP.hit, { once: true, fade: .08 });
  } else if (cfg.fly) {
    playClip(mi, CLIP.idle);
  } else if (s.charging || speedNow > 3.2 * sc) {
    playClip(mi, cfg.run || CLIP.run, { speed: clamp(speedNow / (4.2 * sc), .8, 1.8) });
  } else if (speedNow > .5) {
    playClip(mi, CLIP.walk, { speed: clamp(speedNow / (1.8 * sc), .7, 1.6) });
  } else playClip(mi, CLIP.idle);
  e.glbAtk = attacking;
  mi.root.rotation.x = -flinch * (isBossKind(e.kind) ? .08 : .25);
  mi.mixer.update(dt);
  // kalkan sol kolu, satır sağ kolu izler
  const g = e.model.g;
  if (e.model.shield && boneWorld(mi, ['LowerArmL', 'WristL', 'ArmL_end', 'ArmL'], _bw)) {
    g.updateMatrixWorld(); e.model.shield.position.copy(g.worldToLocal(_bw)); e.model.shield.position.z += .22;
  }
  if (e.model.cleaver && boneWorld(mi, ['LowerArmR', 'WristR', 'ArmR_end', 'ArmR'], _bw)) {
    g.updateMatrixWorld(); e.model.cleaver.position.copy(g.worldToLocal(_bw));
    e.model.cleaver.rotation.x = attacking ? -1.2 : -.4;
  }
}
const shieldMat = new THREE.MeshStandardMaterial({ color: 0x55585e, roughness: .4, metalness: .8, envMap: envTex });
const bellyMat = new THREE.MeshStandardMaterial({ color: 0x8ab020, emissive: 0x3a5a00, roughness: .4 });
const wingMat = new THREE.MeshStandardMaterial({ color: 0x2a1030, roughness: .7, side: THREE.DoubleSide, transparent: true, opacity: .9 });
const SPAWNS = [[-18, -18], [18, -18], [-18, 18], [18, 18], [0, -19], [0, 19], [-19, 0], [19, 0], [-19, -8], [19, 8], [8, -19], [-8, 19], [19, -8], [-19, 8]];
const spawnFx = [];
const spawnFxMat = new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
function makeEnemy(id, kind, x, y, z, remote) {
  const T = TYPES[kind];
  // hazır model yüklüyse et parçaları modelin rengini alır
  const gib = MODELS[(ENEMY_GLB[kind] || {}).m] && ENEMY_GLB[kind].gib;
  const skin = new THREE.MeshStandardMaterial({ color: gib || T.skin, roughness: .78, metalness: .05 });
  const model = buildModel(kind, skin); model.g.scale.setScalar(T.scale); scene.add(model.g);
  const body = remote
    ? new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: mChar, collisionFilterGroup: G_ENEMY, collisionFilterMask: G_PLAYER })
    : new CANNON.Body({ mass: isBigBoss(kind) ? 3000 : kind === 'cellat' ? 900 : 60 * T.scale * T.scale, material: mChar, fixedRotation: true, collisionFilterGroup: G_ENEMY, collisionFilterMask: T.flying ? G_STATIC | G_ENEMY : G_STATIC | G_PLAYER | G_ENEMY });
  body.addShape(new CANNON.Sphere(T.r)); body.allowSleep = false; body.updateMassProperties();
  body.position.set(x, y, z); world.addBody(body);
  const e = { id, kind, T, model, body, skin, hp: T.hp, maxHp: T.hp, r: T.r, remote: !!remote, atkCd: rand(.5, 1.5), windup: 0, stun: 0, flash: 0, phase: Math.random() * 6, strafe: Math.random() < .5 ? 1 : -1, shootT: rand(1.5, 3), charge: 0, chargeCd: rand(2, 4), chargeDir: new V3(), stuckT: 0, sideT: 0, kicked: 0, kickBy: null, prevSpeed: 0, act: null, bossCd: 2, raged: false, net: { x, y, z, ry: 0, fl: 0, act: null } };
  enemies.push(e);
  const big = kind === 'boss' ? 2.5 : kind === 'cellat' ? 1.8 : 1;
  const fx = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * big, 1.1 * big, 8, 16, 1, true), spawnFxMat.clone()); fx.position.set(x, 4, z); scene.add(fx);
  spawnFx.push({ m: fx, t: 0 });
  chips(new V3(x, .3, z), big > 1 ? 120 : 30, 1, .25, .05, big > 1 ? 9 : 5);
  if (isBossKind(kind)) { sfx.roar(); shake(.6); if (kind === 'boss') coreMat.color.setHex(0xff5a14); } else sfx.growl(T.pitch);
  return e;
}
function spawnEnemy(kind, at) {
  const T = TYPES[kind];
  const tg = getTargets()[0];
  const opts = SPAWNS.filter(([x, z]) => Math.hypot(x - tg.x, z - tg.z) > (isBossKind(kind) ? 16 : 11));
  const [sx, sz] = at || pick(opts.length ? opts : SPAWNS);
  const j = isBossKind(kind) || at ? 0 : 1;
  const y = T.flying ? 3.2 : T.r + .05;
  const e = makeEnemy(nextEnemyId++, kind, sx + rand(-1.5, 1.5) * j, y, sz + rand(-1.5, 1.5) * j, false);
  const tier = Math.floor((waveN - 1) / 10), pcMul = 1 + .5 * (playerCount() - 1);
  // her dalgada biraz daha dayanıklı; 12. dalgadan sonra artış hızlanır
  const grow = 1 + Math.max(0, waveN - 1) * .06 + Math.max(0, waveN - 12) * .05;
  e.hp = e.maxHp = isBigBoss(kind) ? T.hp * (1 + .6 * (Math.max(1, bossCount) - 1) + Math.max(0, waveN - 10) * .03) * pcMul
    : isBossKind(kind) ? T.hp * (1 + .5 * tier + Math.max(0, waveN - 5) * .03) * pcMul
    : T.hp * grow;
  e.dmgMul = 1 + Math.max(0, waveN - 8) * .035;
  e.spdMul = 1 + Math.min(.25, Math.max(0, waveN - 10) * .012);
  // seçkin düşman: kırmızı parlar, daha dayanıklı, sert ve hızlı (10. dalgadan sonra giderek sıklaşır)
  if (!isBossKind(kind) && Math.random() < clamp((waveN - 10) * .02, 0, .3)) {
    e.elite = true; e.hp = e.maxHp = e.hp * 1.8; e.dmgMul *= 1.3; e.spdMul *= 1.15;
    e.model.g.scale.multiplyScalar(1.1);
  }
  return e;
}
function spawnRemoteEnemy(id, kind, x, y, z) { return makeEnemy(id, kind, x, y, z, true); }
function removeEnemy(e) { const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1); scene.remove(e.model.g); world.remove(e.body); }
function enemyCenter(e, out) { const b = e.body.position; return out.set(b.x, b.y - e.r + 1.2 * e.T.scale, b.z); }

/* ================= HEDEFLER (oyuncular) ================= */
function getTargets() {
  const out = [];
  const pb = player.body.position, pv = player.body.velocity;
  if (player.alive) out.push({ local: true, x: pb.x, y: pb.y, z: pb.z, vx: pv.x, vz: pv.z });
  if (net.mode === 'host') for (const id in net.players) {
    const p = net.players[id];
    if (p.proxy && p.alive && p.conn) out.push({ local: false, conn: p.conn, x: p.proxy.pos.x, y: p.proxy.pos.y, z: p.proxy.pos.z, vx: p.proxy.vel.x, vz: p.proxy.vel.z });
  }
  if (!out.length) out.push({ local: true, dead: true, x: pb.x, y: pb.y, z: pb.z, vx: 0, vz: 0 });
  return out;
}
function nearestTarget(tgs, p) {
  let best = tgs[0], bd = Infinity;
  for (const t of tgs) { const d = (t.x - p.x) ** 2 + (t.z - p.z) ** 2; if (d < bd) { bd = d; best = t; } }
  return best;
}
function hitTarget(tg, dmg, from, e, opts = {}) {
  if (tg.dead) return;
  if (e && e.dmgMul) dmg *= e.dmgMul;
  if (tg.local) hurtPlayer(dmg, from, e, opts);
  else if (tg.conn.open) tg.conn.send({ t: 'hurtYou', dmg, from: from ? [r2(from.x), r2(from.z)] : null, att: e ? e.id : null, ub: !!opts.unblockable });
}
function stunAttacker(e, dir) {
  if (!e) return;
  if (e.netId != null) { toHost({ t: 'parry', id: e.netId, dir: arr(dir) }); return; }
  if (!enemies.includes(e)) return;
  e.flash = 1;
  if (isBossKind(e.kind)) { e.stun = .7; e.act = null; e.bossCd = 1.3; }
  else { e.stun = 1.4; e.windup = 0; e.charge = 0; e.body.velocity.set(dir.x * 9, 3, dir.z * 9); }
}

/* ================= ATEŞ TOPLARI ================= */
const fireballs = [];
let nextFbId = 1;
const fbById = id => fireballs.find(f => f.id === id);
const fbCore = new THREE.SphereGeometry(.16, 10, 8);
const fbMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
const fbGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xff5a14, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const fbGlowBlue = new THREE.SpriteMaterial({ map: glowTex, color: 0x5ad8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
function spawnFireballVisual(id, from, vel) {
  const g = new THREE.Group(); g.add(new THREE.Mesh(fbCore, fbMat));
  const s = new THREE.Sprite(fbGlow); s.scale.set(1.3, 1.3, 1); g.add(s);
  g.position.copy(from); scene.add(g);
  const f = { id, g, s, pos: g.position, vel, life: 5, deflected: false, by: null };
  fireballs.push(f);
  sfx.fire();
  return f;
}
function shootFireball(from, target, speed = 15) {
  const vel = target.clone().sub(from).normalize().multiplyScalar(speed);
  const f = spawnFireballVisual(nextFbId++, from, vel);
  bcast({ t: 'fb', id: f.id, p: arr(from), v: arr(vel) });
}
function explodeFireball(f) {
  const i = fireballs.indexOf(f); if (i < 0) return;
  scene.remove(f.g); fireballs.splice(i, 1);
  chips(f.pos, 30, f.deflected ? .3 : 1, f.deflected ? .8 : .45, f.deflected ? 1 : .1, 5);
  sfx.boom();
  bcast({ t: 'fbx', id: f.id });
}

/* ================= ŞOK DALGASI ================= */
const shockwaves = [];
const ringGeo = new THREE.RingGeometry(.86, 1, 64);
function spawnShockwave(x, z, rage) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff3a10, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .06, z); scene.add(m);
  shockwaves.push({ m, x, z, r: 1, hit: false, pushed: new Set(), speed: rage ? 20 : 15 });
  for (let i = 0; i < 80; i++) { const a = rand(0, 6.28); emit(x + Math.cos(a), .2, z + Math.sin(a), Math.cos(a) * rand(6, 14), rand(2, 6), Math.sin(a) * rand(6, 14), 2, .35, .25, .2, 1); }
  bcast({ t: 'shock', x: r2(x), z: r2(z), rage: !!rage });
}
function updateShockwaves(dt) {
  const pb = player.body.position;
  for (const s of shockwaves.slice()) {
    s.r += s.speed * dt;
    s.m.scale.setScalar(s.r); s.m.material.opacity = .9 * (1 - s.r / 22);
    const d = Math.hypot(pb.x - s.x, pb.z - s.z);
    if (!s.hit && Math.abs(d - s.r) < .9 && pb.y < .8 && player.dashT <= 0) {
      s.hit = true;
      hurtPlayer(25, new V3(s.x, 0, s.z), null, { unblockable: true });
      player.body.velocity.y = 8;
    }
    for (const p of pieces) {
      if (s.pushed.has(p)) continue;
      const bp = p.body.position, pd = Math.hypot(bp.x - s.x, bp.z - s.z);
      if (Math.abs(pd - s.r) < 1) { s.pushed.add(p); p.body.wakeUp(); p.body.velocity.y += rand(5, 9); p.body.velocity.x += (bp.x - s.x) / pd * 4; p.body.velocity.z += (bp.z - s.z) / pd * 4; }
    }
    if (net.mode !== 'guest') for (const e of enemies) {
      if (isBossKind(e.kind) || e.T.flying || s.pushed.has(e)) continue;
      const bp = e.body.position, pd = Math.hypot(bp.x - s.x, bp.z - s.z);
      if (Math.abs(pd - s.r) < 1) { s.pushed.add(e); e.body.velocity.y = 7; e.stun = .8; }
    }
    if (s.r > 22) { scene.remove(s.m); s.m.material.dispose(); shockwaves.splice(shockwaves.indexOf(s), 1); }
  }
}

/* ================= YERDEN TOPLANANLAR (herkesin kendi ekranında) ================= */
const orbs = [];
const orbGeo = new THREE.SphereGeometry(.09, 8, 6);
const orbMat = new THREE.MeshBasicMaterial({ color: 0x6aff7a });
const orbGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0x2aff5a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const ammoGeo = new THREE.BoxGeometry(.16, .22, .08);
const ammoMat = new THREE.MeshBasicMaterial({ color: 0xffc23a });
const ammoGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffa21a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
function dropOrbs(p, n, kind = 'hp') {
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(kind === 'hp' ? orbGeo : ammoGeo, kind === 'hp' ? orbMat : ammoMat));
    const s = new THREE.Sprite(kind === 'hp' ? orbGlow : ammoGlow); s.scale.set(kind === 'hp' ? .6 : .9, kind === 'hp' ? .6 : .9, 1); g.add(s);
    g.position.copy(p); scene.add(g);
    orbs.push({ g, kind, vel: new V3(rand(-4, 4), rand(4, 8), rand(-4, 4)), life: kind === 'hp' ? 14 : 22 });
  }
}

/* ================= BOSS YAPAY ZEKASI ================= */
function endAct(e) { e.act = null; e.bossCd = rand(1.0, 2.0) * (e.raged ? .6 : e.stage >= 2 ? .8 : 1); }
// koruyucu kubbe: açıkken hasar almaz (Kasap, Cadı, Ateş Lordu'nun alev kalkanı)
const domeMat = new THREE.MeshBasicMaterial({ color: 0x80c0ff, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const fireDomeMat = new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: .25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
function setDome(e, on, fire) {
  if (on && !e.dome) { e.dome = new THREE.Mesh(new THREE.SphereGeometry(1.25, 18, 14), fire ? fireDomeMat : domeMat); e.dome.position.y = 1.0; e.model.g.add(e.dome); sfx.clang(); }
  if (!on && e.dome) { e.model.g.remove(e.dome); e.dome = null; }
}
function bossAI(e, dt, dist, toP, tg) {
  const T = e.T, b = e.body, v = b.velocity;
  let want = 0, dir = toP;
  updateStage(e);
  e.bossCd -= dt;
  const a = e.act;
  if (tg.dead) return [0, dir];
  if (a) {
    a.t += dt;
    if (a.type === 'barrier') {
      // kubbe: 2.5 sn dokunulmaz, kapanırken şok dalgası
      e.shieldT = 2.6 - a.t; setDome(e, a.t < 2.5);
      if (a.t >= 2.5 && !a.done) { a.done = true; spawnShockwave(b.position.x, b.position.z, e.raged); shake(.5); sfx.slam(); }
      if (a.t > 2.9) endAct(e);
    } else if (a.type === 'swipe') {
      if (!a.done && a.t > (e.raged ? .6 : .75)) {
        a.done = true; shake(.35); sfx.kick();
        if (dist < T.reach + .8) hitTarget(tg, T.dmg, b.position, e);
        const f = enemyCenter(e, new V3()).addScaledVector(toP, 2.5); chips(f, 40, .4, .3, .25, 6);
      }
      if (a.t > 1.15) endAct(e);
    } else if (a.type === 'charge') {
      if (a.t < .7) { e.chargeDir.copy(toP); }
      else {
        want = e.raged ? 19 : 16; dir = e.chargeDir;
        if (!a.hit && dist < e.r + 1.4) { a.hit = true; hitTarget(tg, 35, b.position, e); }
        const sp = Math.hypot(v.x, v.z);
        if (a.t > 1.0 && sp < 3) { shake(.45); sfx.slam(); endAct(e); }
        else if (a.t > 2.0) endAct(e);
      }
    } else if (a.type === 'slam') {
      if (!a.done && a.t > .95) { a.done = true; spawnShockwave(b.position.x, b.position.z, e.raged); shake(.8); sfx.slam(); }
      if (a.t > 1.5) endAct(e);
    } else if (a.type === 'volley') {
      if (!a.done && a.t > .6) {
        a.done = true;
        const from = enemyCenter(e, new V3()).addScaledVector(toP, 1.4); from.y += 1.2;
        const n = e.raged ? 9 : 7;
        for (let i = 0; i < n; i++) {
          const ang = (i - (n - 1) / 2) * .14, c = Math.cos(ang), s = Math.sin(ang);
          const d = new V3(toP.x * c - toP.z * s, 0, toP.x * s + toP.z * c);
          const tgt = from.clone().addScaledVector(d, 12); tgt.y = tg.y + .92;
          shootFireball(from, tgt, 13);
        }
      }
      if (a.t > 1.0) endAct(e);
    }
  } else if (e.bossCd <= 0) {
    // evreye göre hareket listesi: 1. evre yakın dövüş, 2. evre ateş topları ve kubbe, 3. evre hepsi daha sık
    const st = e.stage || 1;
    let opts = dist < T.reach ? ['swipe', 'swipe', 'slam'] : dist > 10 ? ['charge', 'charge', 'slam'] : ['slam', 'charge'];
    if (st >= 2) opts = opts.concat(dist > 6 ? ['volley', 'volley'] : ['volley'], e.lastAct !== 'barrier' ? ['barrier'] : []);
    if (st >= 3) opts = opts.concat(['charge', 'slam']);
    e.act = { type: pick(opts), t: 0, done: false, hit: false }; e.lastAct = e.act.type;
    if (e.act.type === 'charge' || e.act.type === 'slam') sfx.roar();
  } else {
    want = dist < T.reach * .7 ? 0 : T.speed * (e.raged ? 1.3 : 1);
  }
  if (!e.act || e.act.type !== 'barrier') { setDome(e, false); e.shieldT = 0; }
  return [want, dir];
}

/* ================= ATEŞ LORDU ================= */
// mesafeyi korur; ateş topu yelpazesi, ayağının altından ateş sütunu, ışınlanma, ateş halkası, alev kalkanı, meteor yağmuru
function lordAI(e, dt, dist, toP, tg) {
  const T = e.T, b = e.body;
  let want = 0, dir = toP;
  updateStage(e);
  e.bossCd -= dt;
  const a = e.act, st = e.stage || 1;
  if (tg.dead) return [0, dir];
  const from = () => { const f = enemyCenter(e, new V3()).addScaledVector(toP, 1.2); f.y += 1.0; return f; };
  if (a) {
    a.t += dt;
    if (a.type === 'volley') {
      if (!a.done && a.t > .6) {
        a.done = true; const f = from(), n = 5 + st * 2;
        for (let i = 0; i < n; i++) { const ang = (i - (n - 1) / 2) * .13, c = Math.cos(ang), s = Math.sin(ang); const d = new V3(toP.x * c - toP.z * s, 0, toP.x * s + toP.z * c); const tgt = f.clone().addScaledVector(d, 12); tgt.y = tg.y + .9; shootFireball(f, tgt, 12 + st); }
      }
      if (a.t > 1.0) endAct(e);
    } else if (a.type === 'pillar') {
      if (!a.done && a.t > .4) { a.done = true; firePillar(tg.x + tg.vx * .5, tg.z + tg.vz * .5, 1.1); }
      if (a.t > .8) endAct(e);
    } else if (a.type === 'meteor') {
      // 3. evre: hedefin çevresine art arda sütunlar
      if (!a.n) a.n = 0;
      if (a.t > .3 + a.n * .22 && a.n < 7) { a.n++; const r = a.n === 1 ? 0 : rand(1.5, 5), ang = rand(0, 6.28); firePillar(clamp(tg.x + Math.cos(ang) * r, -H + 1, H - 1), clamp(tg.z + Math.sin(ang) * r, -H + 1, H - 1), .9); }
      if (a.t > 2.4) endAct(e);
    } else if (a.type === 'teleport') {
      if (!a.done && a.t > .5) {
        a.done = true; chips(enemyCenter(e, new V3()), 60, 1, .4, .05, 6);
        const ang = rand(0, 6.28), r = rand(9, 13);
        b.position.set(clamp(tg.x + Math.cos(ang) * r, -H + 2, H - 2), b.position.y, clamp(tg.z + Math.sin(ang) * r, -H + 2, H - 2));
        b.velocity.set(0, 0, 0); chips(enemyCenter(e, new V3()), 60, 1, .4, .05, 6); sfx.boom();
      }
      if (a.t > .9) endAct(e);
    } else if (a.type === 'ring') {
      if (!a.done && a.t > .7) {
        a.done = true; const f = enemyCenter(e, new V3()); f.y += .6; const n = 16 + st * 4;
        for (let i = 0; i < n; i++) { const ang = i / n * Math.PI * 2; shootFireball(f, f.clone().add(new V3(Math.cos(ang) * 10, 0, Math.sin(ang) * 10)), 10); }
      }
      if (a.t > 1.1) endAct(e);
    } else if (a.type === 'fireshield') {
      // alev kalkanı: hasar almaz, yakındakileri yakar
      e.shieldT = 3.1 - a.t; setDome(e, a.t < 3, true);
      a.burn = (a.burn || 0) - dt;
      if (a.burn <= 0) { a.burn = .5; for (const t of getTargets()) if (!t.dead && Math.hypot(t.x - b.position.x, t.z - b.position.z) < 3.6) hitTarget(t, 6, b.position, e, { unblockable: true }); }
      if (a.t > 3.2) endAct(e);
    }
  } else if (e.bossCd <= 0) {
    let opts = ['volley', 'pillar', 'pillar'];
    if (st >= 2) opts = opts.concat(['teleport', 'ring', e.lastAct !== 'fireshield' && dist < 6 ? 'fireshield' : 'ring']);
    if (st >= 3) opts = opts.concat(['meteor', 'meteor']);
    e.act = { type: pick(opts), t: 0, done: false }; e.lastAct = e.act.type;
  } else {
    // 10–14 m arasında kalmaya çalışır
    if (dist < 8) { want = T.speed; dir = toP.clone().negate(); } else if (dist > 15) want = T.speed; else { want = T.speed * .6; dir = new V3(-toP.z * e.strafe, 0, toP.x * e.strafe); }
  }
  if (!e.act || e.act.type !== 'fireshield') { setDome(e, false); e.shieldT = 0; }
  return [want, dir];
}

/* ================= CADI (ARA BOSS) ================= */
// havada süzülür; üçlü ateş topu, ışınlanma, 2. evrede halka ve uçan göz çağırma (çağırırken kalkan açar)
function witchAI(e, dt, dist, toP, tg) {
  const T = e.T, b = e.body;
  let want = 0, dir = toP;
  updateStage(e);
  e.bossCd -= dt;
  const a = e.act, st = e.stage || 1;
  if (tg.dead) return [0, dir];
  if (a) {
    a.t += dt;
    if (a.type === 'burst') {
      if (!a.n) a.n = 0;
      if (a.t > .4 + a.n * .2 && a.n < 3 + st) { a.n++; const f = enemyCenter(e, new V3()).addScaledVector(toP, .8); shootFireball(f, new V3(tg.x + tg.vx * .3, tg.y + .9, tg.z + tg.vz * .3), 15); }
      if (a.t > 1.4) endAct(e);
    } else if (a.type === 'teleport') {
      if (!a.done && a.t > .35) {
        a.done = true; chips(enemyCenter(e, new V3()), 50, .8, .3, 1, 6);
        const ang = rand(0, 6.28), r = rand(7, 11);
        b.position.set(clamp(tg.x + Math.cos(ang) * r, -H + 2, H - 2), b.position.y, clamp(tg.z + Math.sin(ang) * r, -H + 2, H - 2));
        chips(enemyCenter(e, new V3()), 50, .8, .3, 1, 6); sfx.fire();
      }
      if (a.t > .7) endAct(e);
    } else if (a.type === 'ring') {
      if (!a.done && a.t > .6) { a.done = true; const f = enemyCenter(e, new V3()); for (let i = 0; i < 12; i++) { const ang = i / 12 * Math.PI * 2; shootFireball(f, f.clone().add(new V3(Math.cos(ang) * 10, -1.2, Math.sin(ang) * 10)), 9); } }
      if (a.t > 1.0) endAct(e);
    } else if (a.type === 'summon') {
      e.shieldT = 2.1 - a.t; setDome(e, a.t < 2);
      if (!a.done && a.t > .8) { a.done = true; for (let i = 0; i < 2; i++) spawnEnemy('flyer', [clamp(b.position.x + rand(-4, 4), -H + 2, H - 2), clamp(b.position.z + rand(-4, 4), -H + 2, H - 2)]); }
      if (a.t > 2.1) endAct(e);
    }
  } else if (e.bossCd <= 0) {
    let opts = ['burst', 'burst', 'teleport'];
    if (st >= 2) opts = opts.concat(['ring', e.lastAct !== 'summon' ? 'summon' : 'ring', 'teleport']);
    e.act = { type: pick(opts), t: 0, done: false }; e.lastAct = e.act.type;
  } else {
    want = T.speed * .8; dir = dist > 11 ? toP : dist < 6 ? toP.clone().negate() : new V3(-toP.z * e.strafe, 0, toP.x * e.strafe);
    if (Math.random() < dt * .5) e.strafe *= -1;
  }
  if (!e.act || e.act.type !== 'summon') { setDome(e, false); e.shieldT = 0; }
  return [want, dir];
}

/* ================= CELLAT (ARA BOSS) ================= */
// satırla savurur, oyuncunun üstüne sıçrayıp yere çakılır, koşucu çağırır
function miniAI(e, dt, dist, toP, tg) {
  const T = e.T, b = e.body, v = b.velocity;
  let want = 0, dir = toP;
  updateStage(e);
  e.bossCd -= dt;
  const a = e.act;
  if (tg.dead) return [0, dir];
  if (a) {
    a.t += dt;
    if (a.type === 'guard') {
      // savunma duruşu: önden gelen vuruşları bloklar; önden vurulursa hemen karşı saldırı
      e.guardT = 2.1 - a.t;
      if (e.counter) { e.counter = false; e.guardT = 0; e.act = { type: 'cleave', t: .3, done: false }; sfx.roar(); }
      else if (a.t > 2.1) { e.guardT = 0; endAct(e); }
      return [0, dir];
    }
    if (a.type === 'cleave') {
      if (!a.done && a.t > (e.raged ? .45 : .6)) {
        a.done = true; shake(.3); sfx.kick();
        if (dist < T.reach + .6) hitTarget(tg, T.dmg, b.position, e);
        chips(enemyCenter(e, new V3()).addScaledVector(toP, 2.2), 30, .4, .3, .25, 5);
      }
      if (a.t > 1.0) endAct(e);
    } else if (a.type === 'leap') {
      if (a.t < .5) { a.tx = tg.x; a.tz = tg.z; }
      else if (!a.jumped) {
        a.jumped = true; sfx.roar();
        v.x = (a.tx - b.position.x) / .85; v.z = (a.tz - b.position.z) / .85; v.y = 11;
      } else {
        want = null;   // havada: yön verme
        if (!a.done && a.t > .8 && b.position.y < T.r + .25) {
          a.done = true; shake(.7); sfx.slam(); v.x = v.z = 0;
          for (let i = 0; i < 70; i++) { const ang = rand(0, 6.28); emit(b.position.x + Math.cos(ang), .2, b.position.z + Math.sin(ang), Math.cos(ang) * rand(5, 11), rand(2, 6), Math.sin(ang) * rand(5, 11), 2, .35, .25, .2, .9); }
          for (const t of getTargets()) if (!t.dead && Math.hypot(t.x - b.position.x, t.z - b.position.z) < 4) hitTarget(t, e.raged ? 26 : 20, b.position, e, { unblockable: true });
          bcast({ t: 'boom', p: arr(new V3(b.position.x, .3, b.position.z)) });
        }
        if (a.t > 1.8 || (a.done && a.t > a.doneT)) endAct(e);
        if (a.done && !a.doneT) a.doneT = a.t + .4;
      }
    } else if (a.type === 'summon') {
      if (!a.done && a.t > .8) {
        a.done = true; sfx.roar();
        for (let i = 0; i < (e.raged ? 4 : 3); i++) spawnEnemy('runner', [clamp(b.position.x + rand(-3, 3), -H + 2, H - 2), clamp(b.position.z + rand(-3, 3), -H + 2, H - 2)]);
      }
      if (a.t > 1.2) endAct(e);
    }
  } else if (e.bossCd <= 0) {
    // 1. evre: satır, sıçrama, savunma; 2. evre (kudurmuş): koşucu çağırma ve daha hızlı
    let opts = dist < T.reach ? ['cleave', 'cleave'] : dist > 7 ? ['leap', 'leap'] : ['leap', 'cleave'];
    if (dist < 7 && e.lastAct !== 'guard') opts.push('guard');
    if ((e.stage || 1) >= 2) opts = opts.concat(['summon', 'leap']);
    e.act = { type: pick(opts), t: 0, done: false }; e.lastAct = e.act.type;
  } else {
    want = dist < T.reach * .7 ? 0 : T.speed * (e.raged ? 1.35 : 1);
  }
  return [want, dir];
}

/* ================= KAMİKAZE PATLAMASI ================= */
// fitili bitince ya da öldürülünce patlar: yakındaki oyunculara ve diğer düşmanlara hasar verir
function bomberExplode(e, by, killed) {
  if (e.exploded) return; e.exploded = true;
  const c = enemyCenter(e, new V3());
  explodeAt(c, false);
  bcast({ t: 'boom', p: arr(c) });
  const R = 4.3;
  for (const t of getTargets()) {
    if (t.dead) continue;
    const d = Math.hypot(t.x - c.x, t.z - c.z);
    if (d < R) hitTarget(t, (e.T.dmg * (1 - d / R) + 6) * (killed ? .5 : 1), c, null, { unblockable: true });
  }
  for (const o of enemies.slice()) {
    if (o === e) continue;
    const oc = enemyCenter(o, new V3()), d = oc.distanceTo(c);
    if (d < R + o.r) hurtEnemy(o, 2 + 7 * (1 - d / (R + o.r)), oc.clone().sub(c).setY(.4).normalize(), randomNormal(), { big: true, power: 2.5, by: by || 'env' });
  }
  if (enemies.includes(e)) killEnemy(e, UP.clone(), randomNormal(), { big: true, by: by || 'env' });
}

/* ================= ANİMASYON ================= */
function animateEnemy(e, dt, speedNow, face, s) {
  const T = e.T, g = e.model.g;
  if (face) {
    const ty = Math.atan2(face.x, face.z);
    let dy = ty - g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    g.rotation.y += dy * Math.min(1, dt * (e.kind === 'boss' ? 5 : 10));
  }
  const mv = Math.min(1, speedNow / 4);
  e.phase += dt * (4 + speedNow * 1.6) / (e.kind === 'boss' ? 1.6 : 1);
  // ayak sesi: iri olan daha tok ve pes basar; büyük bosslar yeri sarsar
  { const st = Math.floor(e.phase / Math.PI);
    if (st !== e.stepN) { e.stepN = st; if (!e.T.flying && speedNow > 1.2 && e.body.position.y < e.r + .4) {
      const sc = e.T.scale;
      stepAt(e.body.position, Math.min(1, .16 + sc * .14), 1.25 / sc, 14 + sc * 6);
      if (isBigBoss(e.kind) && e.body.position.distanceTo(player.body.position) < 14) shake(.05);
    } } }
  const sw = Math.sin(e.phase) * .7 * mv;
  e.model.legs[0].rotation.x = sw; e.model.legs[1].rotation.x = -sw;
  
  // Darbe tepkisi (hit-flinch): kurşun veya kılıç vurduğunda gövde ve kafa geriye sarsılır
  const flinch = Math.max(0, Math.min(1, (e.flash || 0) * 1.4 + (e.stun > 0 ? 0.35 : 0)));
  const flinchTorso = -flinch * (e.kind === 'boss' ? 0.2 : 0.52);
  const flinchHead = -flinch * (e.kind === 'boss' ? 0.25 : 0.65);

  if (e.model.wings) e.model.wings.forEach((w, i) => { w.rotation.z = Math.sin(gameTime * 14 + e.id) * .6 * (i ? -1 : 1); });
  if (e.model.belly) { const p = 1 + Math.sin(gameTime * 6 + e.id) * .05; e.model.belly.scale.set(p, p, p); }
  for (let i = 0; i < 2; i++) {
    const arm = e.model.arms[i];
    let target;
    if (isBossKind(e.kind)) {
      if (s.act === 'swipe' || s.act === 'slam' || s.act === 'cleave') target = s.actDone ? -.3 : -2.9;
      else if (s.act === 'volley' || s.act === 'summon') target = s.actDone ? -1.2 : -2.6;
      else if (s.act === 'leap') target = -2.4;
      else if (s.charging) target = -1.5;
      else target = -1.1 + (i ? sw : -sw) * .4;
    } else if (e.kind === 'shielder' && i === 0) {
      target = -1.35;   // kalkan hep önde
    } else {
      const raise = s.windup ? (T.ranged ? -2.6 : -2.4) : -1.3;
      target = (s.windup || s.charging) ? (T.ranged && i === 0 ? 0 : raise) : (T.ranged ? -sw : (-1.2 + (i ? sw : -sw) * .4));
    }
    if (flinch > 0.05) target += (i ? -1 : 1) * flinch * .35;
    arm.rotation.x += (target - arm.rotation.x) * Math.min(1, dt * 14);
  }
  e.model.torso.rotation.x = (s.charging ? .4 : (s.windup ? -.15 : .12)) + flinchTorso;
  e.model.torso.rotation.z = flinch * Math.sin(e.phase * 4) * (e.kind === 'boss' ? .08 : .22);
  e.model.head.rotation.x = flinchHead;
  e.model.head.position.y = 1.75 + Math.sin(e.phase * 2) * .03 + (flinch ? -.04 : 0);
  if (e.model.glb) animateGlb(e, dt, speedNow, s, flinch);
}

/* ================= DÜŞMAN GÜNCELLEME ================= */
const toP = new V3();
function updateEnemies(dt) {
  if (net.mode === 'guest') { updateRemoteEnemies(dt); return; }
  const tgs = getTargets();
  for (const e of enemies.slice()) {
    const T = e.T, b = e.body, v = b.velocity;
    const tg = nearestTarget(tgs, b.position);
    toP.set(tg.x - b.position.x, 0, tg.z - b.position.z);
    const dist = toP.length(); toP.divideScalar(dist || 1);
    e.stun -= dt; e.atkCd -= dt; e.flash = Math.max(0, e.flash - dt * 6); e.chargeCd -= dt; e.kicked -= dt; e.invulnT = (e.invulnT || 0) - dt;
    if (!(isBossKind(e.kind) && (e.stage || 1) > 1)) e.skin.emissive.setRGB(Math.max(e.flash * .9, e.elite ? .3 : 0), e.flash * .7, e.flash * .6);
    let want = 0, dir = toP;
    const speedNow = Math.hypot(v.x, v.z);
    // tekmeyle duvara çarpma
    if (e.kicked > 0 && e.prevSpeed > 9 && speedNow < e.prevSpeed * .35) {
      const c = enemyCenter(e, new V3());
      e.kicked = 0;
      toast('DUVARA YAPIŞTI!'); if (e.kickBy === net.myId) score += 75;
      if (hurtEnemy(e, 4, new V3(Math.sign(c.x) * .5, .3, Math.sign(c.z) * .5).normalize(), UP, { big: true, by: e.kickBy })) {
        for (let i = 0; i < 6; i++) wallDecalNear(c.x + rand(-1, 1), rand(.5, 3), c.z + rand(-1, 1), rand(.8, 1.8));
      }
      if (!enemies.includes(e)) continue;
    }
    e.prevSpeed = speedNow;
    if (isBossKind(e.kind)) {
      if (e.stun > 0) { v.x *= .9; v.z *= .9; }
      else {
        const ai = e.kind === 'boss' ? bossAI : e.kind === 'lord' ? lordAI : e.kind === 'witch' ? witchAI : miniAI;
        [want, dir] = ai(e, dt, dist, toP, tg);
        if (want !== null) { want *= e.spdMul || 1; const k = Math.min(1, dt * 6); v.x += (dir.x * want - v.x) * k; v.z += (dir.z * want - v.z) * k; }
      }
    } else if (e.stun > 0) {
      if (b.position.y < e.r + .1) { v.x *= 1 - Math.min(1, dt * 3); v.z *= 1 - Math.min(1, dt * 3); }
    } else if (tg.dead) {
      v.x *= .9; v.z *= .9;
    } else {
      if (e.windup > 0) {
        e.windup -= dt; want = 0;
        if (e.windup <= 0) {
          if (T.ranged) {
            const hand = enemyCenter(e, new V3()).addScaledVector(toP, .5); hand.y += .3 * T.scale;
            const tgt = new V3(tg.x + tg.vx * dist / 15 * .5, tg.y + .92, tg.z + tg.vz * dist / 15 * .5);
            shootFireball(hand, tgt); e.shootT = rand(2, 3.4);
          } else if (dist < T.reach + .4) {
            hitTarget(tg, T.dmg, b.position, e);
          }
          e.atkCd = e.kind === 'brute' ? 1.6 : 1.2;
        }
      } else if (e.charge > 0) {
        e.charge -= dt; want = T.leap ? 12 : 13; dir = e.chargeDir;
        if (dist < e.r + 1) { hitTarget(tg, T.dmg, b.position, e); e.charge = 0; e.atkCd = 1.5; }
      } else if (T.bomber) {
        // kamikaze: yaklaşır, fitili yakar, patlar
        if (e.fuse > 0) {
          e.fuse -= dt; want = T.speed * .35; e.flash = Math.sin(e.fuse * 40) > 0 ? 1 : .2;
          if (e.fuse <= 0) { bomberExplode(e, null, false); continue; }
        } else if (dist < T.reach) { e.fuse = .75; sfx.growl(1.6); toast('KAMİKAZE!'); }
        else want = T.speed;
      } else if (T.ranged) {
        e.shootT -= dt;
        if (dist > 11) want = T.speed;
        else if (dist < 6) { want = T.speed; dir = toP.clone().negate(); }
        else { want = T.speed * .7; dir = new V3(-toP.z * e.strafe, 0, toP.x * e.strafe); if (Math.random() < dt * .4) e.strafe *= -1; }
        if (dist < T.reach && e.atkCd <= 0) { e.windup = .35; e.shootT = 0; }
        else if (e.shootT <= 0 && dist < 26) { e.windup = T.wind; e.shootT = 99; }
      } else {
        if (e.kind === 'brute' && e.chargeCd <= 0 && dist > 5 && dist < 15) { e.charge = 1.1; e.chargeCd = rand(4, 6); e.chargeDir.copy(toP); sfx.growl(.5); }
        else if (T.leap && e.chargeCd <= 0 && dist > 2.5 && dist < 7) { e.charge = .45; e.chargeCd = rand(2.5, 4); e.chargeDir.copy(toP); v.y = 6; sfx.growl(T.pitch); }
        else if (dist < T.reach && e.atkCd <= 0) { e.windup = T.wind; sfx.growl(T.pitch); }
        else want = T.speed * (dist < T.reach * .8 ? 0 : 1);
      }
      if (want > 1 && speedNow < .6) { e.stuckT += dt; if (e.stuckT > .4) { e.sideT = .7; e.stuckT = 0; } } else e.stuckT = 0;
      if (e.sideT > 0) { e.sideT -= dt; dir = new V3(dir.x - dir.z * e.strafe * 1.5, 0, dir.z + dir.x * e.strafe * 1.5).normalize(); }
      const k = Math.min(1, dt * 8);
      want *= e.spdMul || 1;
      v.x += (dir.x * want - v.x) * k; v.z += (dir.z * want - v.z) * k;
    }
    // uçan göz: belli bir yükseklikte süzülür
    if (T.flying) v.y = ((T.hover || 3.2) + Math.sin(gameTime * 2 + e.id) * .45 - b.position.y) * 3;
    e.model.g.position.set(b.position.x, b.position.y - e.r, b.position.z);
    const charging = e.charge > 0 || (e.act && e.act.type === 'charge' && e.act.t > .7);
    animateEnemy(e, dt, speedNow, charging ? e.chargeDir : toP, { windup: e.windup > 0, charging, act: e.act && e.act.type, actDone: e.act && e.act.done });
  }
}
function updateRemoteEnemies(dt) {
  for (const e of enemies) {
    const b = e.body, n = e.net, k = Math.min(1, dt * 14);
    const ox = b.position.x, oz = b.position.z;
    b.position.set(ox + (n.x - ox) * k, b.position.y + (n.y - b.position.y) * k, oz + (n.z - oz) * k);
    const sp = Math.hypot(b.position.x - ox, b.position.z - oz) / Math.max(dt, 1e-4);
    e.speedS = (e.speedS || 0) * .8 + sp * .2;
    e.flash = Math.max(0, e.flash - dt * 6);
    e.elite = !!(n.fl & 64);
    if (!(isBossKind(e.kind) && (n.fl & 4))) e.skin.emissive.setRGB(Math.max(e.flash * .9, e.elite ? .3 : 0), e.flash * .7, e.flash * .6);
    else e.skin.emissive.setRGB(.25, .02, 0);
    e.raged = !!(n.fl & 4);
    setDome(e, !!(n.fl & 32), e.kind === 'lord');
    e.model.g.position.set(b.position.x, b.position.y - e.r, b.position.z);
    let dy = n.ry - e.model.g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); e.model.g.rotation.y += dy * k;
    animateEnemy(e, dt, e.speedS, null, { windup: !!(n.fl & 1), charging: !!(n.fl & 2), act: n.act, actDone: !!(n.fl & 8) });
  }
}

function updateProjectiles(dt) {
  const guest = net.mode === 'guest';
  for (const f of fireballs.slice()) {
    f.pos.addScaledVector(f.vel, dt); f.life -= dt;
    f.s.scale.setScalar(1.2 + Math.sin(gameTime * 40) * .15);
    if (Math.random() < .6) emit(f.pos.x, f.pos.y, f.pos.z, rand(-.5, .5), rand(0, 1), rand(-.5, .5), 2, f.deflected ? .3 : 1, f.deflected ? .7 : .4, f.deflected ? 1 : .05, .3);
    if (guest) { if (f.life <= 0 || hitsStatic(f.pos)) { scene.remove(f.g); fireballs.splice(fireballs.indexOf(f), 1); } continue; }
    if (!f.deflected) {
      if (player.alive && f.pos.distanceTo(eyePos) < .75) {
        camVectors();
        tmp.copy(f.pos).sub(eyePos).setY(0).normalize();
        if (block.on && wpn.cur === 'katana' && tmp.dot(flatF) > .3) { deflectFireball(f); continue; }
        hurtPlayer(10, f.pos, null); explodeFireball(f); continue;
      }
      let hitProxy = null;
      if (net.mode === 'host') for (const id in net.players) {
        const p = net.players[id];
        if (p.proxy && p.alive && p.conn && Math.hypot(f.pos.x - p.proxy.pos.x, f.pos.y - (p.proxy.pos.y + .92), f.pos.z - p.proxy.pos.z) < .8) { hitProxy = p; break; }
      }
      if (hitProxy) { hitTarget({ local: false, conn: hitProxy.conn }, 10, f.pos, null); explodeFireball(f); continue; }
    } else {
      let hit = null;
      for (const e of enemies) { if (enemyCenter(e, tmp).distanceTo(f.pos) < e.r + .9 * e.T.scale) { hit = e; break; } }
      if (hit) { hurtEnemy(hit, hit.kind === 'boss' ? 8 : 6, f.vel.clone().normalize(), UP, { big: true, by: f.by || net.myId }); explodeFireball(f); continue; }
    }
    if (f.life <= 0 || hitsStatic(f.pos)) explodeFireball(f);
  }
  for (const o of orbs.slice()) {
    const p = o.g.position; o.life -= dt;
    o.vel.y -= 15 * dt; p.addScaledVector(o.vel, dt);
    if (o.kind === 'ammo') o.g.rotation.y += dt * 3;
    if (p.y < .2) { p.y = .2; o.vel.y *= -.4; o.vel.x *= .8; o.vel.z *= .8; }
    p.x = clamp(p.x, -H + .3, H - .3); p.z = clamp(p.z, -H + .3, H - .3);
    const pb = player.body.position;
    tmp.set(pb.x - p.x, pb.y + .3 - p.y, pb.z - p.z); const d = tmp.length();
    const wanted = o.kind === 'hp' ? player.hp < ST.maxHp : (ammo.reserve < ST.maxMags || shells.reserve < ST.maxShells || m4.reserve < RIF.m4.mags + 2 || awp.reserve < 25);
    if (player.alive && wanted && d < 6 * ST.magnet && o.life < (o.kind === 'hp' ? 13.6 : 21.6)) { o.vel.addScaledVector(tmp.normalize(), 45 * ST.magnet * dt); o.vel.multiplyScalar(1 - Math.min(1, dt * 2)); }
    if (player.alive && wanted && d < .9) {
      if (o.kind === 'hp') { player.hp = Math.min(ST.maxHp, player.hp + 4); sfx.pickup(); }
      else {
        ammo.reserve = Math.min(ST.maxMags, ammo.reserve + 1); shells.reserve = Math.min(ST.maxShells, shells.reserve + 6);
        m4.reserve = Math.min(RIF.m4.mags + 2, m4.reserve + 1); awp.reserve = Math.min(25, awp.reserve + 3);
        // bomba nadiren çıkar (%12), böylece bomba atar sürekli kullanılamaz
        const gren = m4.gren < ST.grenMax && Math.random() < .12;
        if (gren) m4.gren++;
        sfx.ammo(); toast(gren ? 'CEPHANE · +1 BOMBA' : 'CEPHANE');
      }
      scene.remove(o.g); orbs.splice(orbs.indexOf(o), 1); continue;
    }
    if (o.life <= 0) { scene.remove(o.g); orbs.splice(orbs.indexOf(o), 1); }
  }
  for (const s of spawnFx.slice()) {
    s.t += dt; s.m.scale.set(1 - s.t * 1.5, 1 + s.t, 1 - s.t * 1.5); s.m.material.opacity = .8 * (1 - s.t / .6);
    if (s.t > .6) { scene.remove(s.m); s.m.geometry.dispose(); spawnFx.splice(spawnFx.indexOf(s), 1); }
  }
}
