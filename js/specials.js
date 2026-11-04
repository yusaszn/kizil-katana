'use strict';
/* Boss silahları: büyük boss roketatar, ara boss bombaatar düşürür.
   Mermisi sınırlı; cephane kutuları bu silahları doldurmaz. Mermi bitince silah elden çıkar. 7 ile seçilir. */

const SPECIALS = {
  rocket: { name: 'ROKETATAR', ammo: 5, cd: 1.15, R: 5.5, base: 8, vari: 16 },
  launcher: { name: 'BOMBAATAR', ammo: 8, cd: .6, R: 4.5, base: 4, vari: 10 },
};
const isSpecial = w => !!SPECIALS[w];
const special = { kind: null, ammo: 0, cd: 0, kick: 0, flashT: 0 };
const specialShots = [], specialDrops = [];

/* ================= MODELLER ================= */
const warheadMat = new THREE.MeshStandardMaterial({ color: 0x6b6f3a, roughness: .5, metalness: .3 });
// modeller: gunmodels.js (roketatar: RPG tipi, bombaatar: M79 tipi kırma namlu)
const rocketModel = hands => GM.rpg({ hands });
const launcherModel = hands => GM.m79({ hands });
const rocketRoot = new THREE.Group(); vmScene.add(rocketRoot); rocketRoot.visible = false;
const launcherRoot = new THREE.Group(); vmScene.add(launcherRoot); launcherRoot.visible = false;
const rkm = rocketModel(true); rocketRoot.add(rkm.g);
const glm = launcherModel(true); launcherRoot.add(glm.g);
const RK_REST = P([.22, -.15, -.4], [0, .03, 0]), GL_REST = P([.2, -.19, -.42], [0, .04, 0]);

/* ================= ALMA / BIRAKMA ================= */
function dropSpecial(at, kind) {
  const g = new THREE.Group();
  const m = kind === 'rocket' ? rocketModel(false) : launcherModel(false);
  m.g.scale.setScalar(1.6); m.g.rotation.y = Math.PI / 2; g.add(m.g);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: kind === 'rocket' ? 0xff6a2a : 0x9aff4a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }));
  glow.scale.setScalar(2.2); g.add(glow);
  g.position.copy(at); g.position.y = 1.2; scene.add(g);
  specialDrops.push({ g, kind, t: 0, life: 75 });
}
function takeSpecial(kind) {
  const def = SPECIALS[kind];
  if (special.kind === kind) special.ammo = Math.min(def.ammo * 2, special.ammo + def.ammo);
  else { special.kind = kind; special.ammo = def.ammo; }
  special.cd = 0;
  sfx.upgrade(); toast(def.name + ' · ' + special.ammo + ' MERMİ · 7');
  switchWeapon(kind);
}
function resetSpecials() {
  Object.assign(special, { kind: null, ammo: 0, cd: 0, kick: 0, flashT: 0 });
  for (const s of specialShots) scene.remove(s.m); specialShots.length = 0;
  for (const d of specialDrops) scene.remove(d.g); specialDrops.length = 0;
}

/* ================= ATEŞ ================= */
const rocketGeo = new THREE.ConeGeometry(.07, .4, 10); rocketGeo.rotateX(-Math.PI / 2);
const gl40Geo = new THREE.SphereGeometry(.075, 10, 8);
function fireSpecial() {
  const kind = special.kind, def = SPECIALS[kind];
  special.ammo--; special.cd = def.cd; special.kick = 1; netFx.sh++; netFx.ft = 1;
  camVectors();
  const p = eyePos.clone().addScaledVector(camFwd, .9).addScaledVector(rightV, .18); p.y -= .08;
  if (kind === 'rocket') {
    sfx.launcher(); sfx.awp(); shake(.25); kickView(rand(-.02, .02), .09);
    player.pitch = Math.min(1.45, player.pitch + .05);
    const m = new THREE.Mesh(rocketGeo, warheadMat); m.position.copy(p); m.lookAt(p.clone().add(camFwd)); scene.add(m);
    specialShots.push({ kind, m, pos: m.position, vel: camFwd.clone().multiplyScalar(38), life: 3 });
    // geri tepme dumanı
    const back = eyePos.clone().addScaledVector(camFwd, -.6);
    for (let i = 0; i < 26; i++) emit(back.x, back.y, back.z, -camFwd.x * rand(2, 6) + rand(-1, 1), rand(0, 1.5), -camFwd.z * rand(2, 6) + rand(-1, 1), 2, .5, .48, .45, rand(.6, 1.2));
  } else {
    sfx.launcher(); shake(.12); kickView(0, .06);
    const m = new THREE.Mesh(gl40Geo, warheadMat); m.position.copy(p); scene.add(m);
    specialShots.push({ kind, m, pos: m.position, vel: camFwd.clone().multiplyScalar(22).add(new V3(0, 4, 0)), life: 1.6, bounces: 0 });
  }
  if (typeof flashWorld === 'function') flashWorld(3, 0xffa040, .08);
  muzzleGlow = 1.4; gunKickFor(kind);
}
function specialHitsEnemy(pos, extra) {
  for (const e of enemies) if (e.hp > 0 && enemyCenter(e, tmp).distanceTo(pos) < e.r + extra * e.T.scale) return true;
  return false;
}
function updateSpecialShots(dt) {
  for (const s of specialShots.slice()) {
    const def = SPECIALS[s.kind];
    s.life -= dt;
    let boom = s.life <= 0;
    if (s.kind === 'rocket') {
      s.pos.addScaledVector(s.vel, dt);
      emit(s.pos.x, s.pos.y, s.pos.z, rand(-.4, .4), rand(0, .8), rand(-.4, .4), 2, .55, .52, .5, rand(.5, 1));
      emit(s.pos.x, s.pos.y, s.pos.z, -s.vel.x * .05, 0, -s.vel.z * .05, 2, 1, .6, .15, .15);
      if (hitsStatic(s.pos) || s.pos.y < .1 || specialHitsEnemy(s.pos, .7)) boom = true;
    } else {
      s.vel.y -= 16 * dt;
      const prev = s.pos.clone();
      s.pos.addScaledVector(s.vel, dt);
      s.m.rotation.x += dt * 10;
      if (Math.random() < .6) emit(s.pos.x, s.pos.y, s.pos.z, 0, .4, 0, 2, .4, .9, .3, .3);
      if (s.pos.y < .08) { s.pos.y = .08; s.vel.y *= -.45; s.vel.x *= .7; s.vel.z *= .7; if (Math.abs(s.vel.y) > 1.5) sfx.shell(); }
      if (hitsStatic(s.pos)) { s.pos.copy(prev); s.vel.x *= -.5; s.vel.z *= -.5; }
      if (specialHitsEnemy(s.pos, .5)) boom = true;
    }
    if (boom) {
      scene.remove(s.m); specialShots.splice(specialShots.indexOf(s), 1);
      s.pos.y = Math.max(.25, s.pos.y);
      explodeAt(s.pos, true, def.R, def.base, def.vari);
    }
  }
}
function updateSpecials(dt) {
  updateSpecialShots(dt);
  // yerde duran boss silahı: süzülür, döner; yaklaşınca alınır
  const pb = player.body.position;
  for (const d of specialDrops.slice()) {
    d.t += dt; d.life -= dt;
    d.g.position.y = 1.2 + Math.sin(d.t * 2.2) * .18; d.g.rotation.y += dt * 1.4;
    if (player.alive && Math.hypot(pb.x - d.g.position.x, pb.z - d.g.position.z) < 1.6) { takeSpecial(d.kind); scene.remove(d.g); specialDrops.splice(specialDrops.indexOf(d), 1); continue; }
    if (d.life <= 0) { scene.remove(d.g); specialDrops.splice(specialDrops.indexOf(d), 1); }
  }
  special.cd -= dt;
  const w = wpn.cur, on = isSpecial(w);
  if (on && special.kind === w && player.alive && state === 'play' && !wpn.next && special.cd <= 0 && special.ammo > 0 && (rifClick || mouse.left)) fireSpecial();
  // mermi bitti: atış animasyonu bitince silah elden çıkar
  if (special.kind && special.ammo <= 0 && special.cd <= .1) {
    const was = special.kind; special.kind = null;
    if (wpn.cur === was || wpn.next === was) { toast(SPECIALS[was].name + ' BİTTİ'); wpn.prev = null; switchWeapon('katana'); }
  }
  // ---- görünüm ----
  rocketRoot.visible = w === 'rocket'; launcherRoot.visible = w === 'launcher';
  special.kick = Math.max(0, special.kick - dt * 5);
  const bob = viewBob(), low = lowerOffset(), sprint = player.sprinting && player.grounded ? 1 : 0;
  const def = SPECIALS[w], rp = def && special.cd > 0 ? 1 - special.cd / def.cd : 1;   // 0 → 1: yeniden doldurma ilerlemesi
  if (w === 'rocket') {
    // ateşten sonra yeni roket önden takılır
    const load = rp < .35 ? 0 : rp < .85 ? (rp - .35) / .5 : 1;
    rkm.head.visible = special.ammo > 0 && rp > .35;
    rkm.head.position.z = -.52 - (1 - easeOut(load)) * .25;
    const tilt = rp < 1 ? Math.sin(rp * Math.PI) : 0;
    rocketRoot.position.set(RK_REST.p.x + sword.swayX + bob.x, RK_REST.p.y + sword.swayY + bob.y - low - tilt * .06 - sprint * .05, RK_REST.p.z + special.kick * .14);
    rocketRoot.rotation.set(RK_REST.r.x + special.kick * .35 - wpn.off * .8 + tilt * .25 - sprint * .4, RK_REST.r.y + sprint * .3, RK_REST.r.z - tilt * .4, 'YXZ');
  } else if (w === 'launcher') {
    // kırma namlu: açılır, boş kovan atılır, yeni fişek girer, kapanır
    const open = rp < .2 ? rp / .2 : rp < .75 ? 1 : rp < .9 ? 1 - (rp - .75) / .15 : 0;
    glm.barrel.rotation.x = -easeOut(open) * .75;
    glm.shell.visible = !(rp > .2 && rp < .45) && special.ammo > 0;
    const tilt = rp < 1 ? Math.sin(rp * Math.PI) : 0;
    launcherRoot.position.set(GL_REST.p.x + sword.swayX + bob.x, GL_REST.p.y + sword.swayY + bob.y - low - tilt * .05 - sprint * .06, GL_REST.p.z + special.kick * .09);
    launcherRoot.rotation.set(GL_REST.r.x + special.kick * .4 - wpn.off * .8 + tilt * .35 - sprint * .5, GL_REST.r.y + sprint * .4, GL_REST.r.z - tilt * .6, 'YXZ');
  }
}
