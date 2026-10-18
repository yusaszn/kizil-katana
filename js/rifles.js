'use strict';
/* M4 (tam otomatik, co-op'ta bomba atar, VS'de nişan alma) ve AWP (dürbünlü keskin nişancı, co-op'ta deler geçer) */

const RIF = {
  m4: { mag: 30, mags: 4, rate: 10, reload: 1.9, dmg: 1.1, pvp: 22, spread: .022, ads: .006 },
  awp: { mag: 5, rounds: 15, bolt: 1.25, reload: 2.3, dmg: 14, pvp: 150, spread: .07 },
};
const m4 = { mag: 30, reserve: 4, reloadT: 0, cd: 0, gren: 3, grenCd: 0, adsK: 0, kick: 0, flashT: 0 };
const awp = { mag: 5, reserve: 15, reloadT: 0, boltT: 0, cd: 0, scopeK: 0, kick: 0, flashT: 0 };
let rifClick = false, rifClickR = false;

/* ================= MODELLER ================= */
function rifleAdd(g, geo, mat, x, y, z, rx = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; g.add(m); return m; }
const m4Root = new THREE.Group(); vmScene.add(m4Root); m4Root.visible = false;
const m4m = (() => {
  const g = new THREE.Group(), tan = new THREE.MeshStandardMaterial({ color: 0x3a3833, metalness: .5, roughness: .55, envMap: envTex });
  rifleAdd(g, new THREE.BoxGeometry(.06, .09, .36), gunMetal, 0, 0, 0);                       // gövde
  rifleAdd(g, new THREE.BoxGeometry(.068, .075, .3), tan, 0, .005, -.32);                      // el kundağı
  rifleAdd(g, new THREE.CylinderGeometry(.012, .012, .26, 8), gunDark, 0, .01, -.6, Math.PI / 2); // namlu
  rifleAdd(g, new THREE.BoxGeometry(.012, .05, .012), gunDark, 0, .06, -.44);                  // arpacık
  rifleAdd(g, new THREE.BoxGeometry(.03, .035, .12), gunDark, 0, .065, .02);                   // gez / taşıma kolu
  rifleAdd(g, new THREE.BoxGeometry(.04, .1, .05), gunDark, 0, -.085, .11, .3);                // kabza
  rifleAdd(g, new THREE.BoxGeometry(.05, .08, .24), tan, 0, -.02, .3);                         // dipçik
  const mag = rifleAdd(g, new THREE.BoxGeometry(.038, .16, .06), gunDark, 0, -.12, -.05, .22); // şarjör
  const gl = rifleAdd(g, new THREE.CylinderGeometry(.026, .026, .22, 10), gunDark, 0, -.062, -.33, Math.PI / 2); // bomba atar
  // M4 elleri: sağ el kabzada, sol el el kundağında
  if (typeof createTacticalHand === 'function') {
    const rH = createTacticalHand(false, { grip: 'v', r: .022 }); rH.position.set(0, -.08, .11); rH.rotation.x = .3; g.add(rH);
    const lH = createTacticalHand(true, { grip: 'h', r: .04 }); lH.position.set(0, .005, -.3); g.add(lH);
  } else {
    rifleAdd(g, new THREE.BoxGeometry(.075, .07, .09), gloveMat, 0, -.09, .11, .3);
    rifleAdd(g, new THREE.BoxGeometry(.085, .085, .5), sleeveMat, .02, -.13, .4);
    rifleAdd(g, new THREE.BoxGeometry(.075, .07, .1), gloveMat, -.01, -.06, -.3);
    rifleAdd(g, new THREE.BoxGeometry(.085, .085, .55), sleeveMat, -.08, -.1, -.02);
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, .01, -.76); flash.visible = false; g.add(flash);
  m4Root.add(g);
  return { g, mag, gl, flash };
})();
const awpRoot = new THREE.Group(); vmScene.add(awpRoot); awpRoot.visible = false;
const awpm = (() => {
  const g = new THREE.Group(), green = new THREE.MeshStandardMaterial({ color: 0x2f4a2a, roughness: .6 });
  rifleAdd(g, new THREE.BoxGeometry(.065, .085, .42), green, 0, 0, 0);                         // gövde
  rifleAdd(g, new THREE.CylinderGeometry(.015, .013, .78, 10), gunDark, 0, .015, -.6, Math.PI / 2); // uzun namlu
  rifleAdd(g, new THREE.CylinderGeometry(.03, .03, .34, 14), gunDark, 0, .088, -.06, Math.PI / 2);  // dürbün
  rifleAdd(g, new THREE.CylinderGeometry(.038, .03, .05, 14), gunDark, 0, .088, -.24, Math.PI / 2);
  rifleAdd(g, new THREE.CircleGeometry(.03, 14), new THREE.MeshBasicMaterial({ color: 0x2a6fa0 }), 0, .088, -.266);
  rifleAdd(g, new THREE.BoxGeometry(.06, .1, .3), green, 0, -.03, .34);                         // dipçik
  rifleAdd(g, new THREE.BoxGeometry(.04, .1, .05), green, 0, -.09, .14, .3);                   // kabza
  const mag = rifleAdd(g, new THREE.BoxGeometry(.04, .08, .08), gunDark, 0, -.08, -.04);
  const bolt = new THREE.Group(); bolt.position.set(.035, .03, .1); g.add(bolt);
  rifleAdd(bolt, new THREE.BoxGeometry(.06, .012, .012), gunMetal, .03, 0, 0);
  rifleAdd(bolt, new THREE.SphereGeometry(.014, 8, 6), gunMetal, .06, 0, 0);
  // AWP elleri
  if (typeof createTacticalHand === 'function') {
    const rH = createTacticalHand(false, { grip: 'v', r: .022 }); rH.position.set(0, -.085, .14); rH.rotation.x = .3; g.add(rH);
    const lH = createTacticalHand(true, { grip: 'h', r: .045 }); lH.position.set(0, 0, -.16); g.add(lH);
  } else {
    rifleAdd(g, new THREE.BoxGeometry(.075, .07, .09), gloveMat, 0, -.1, .14, .3);
    rifleAdd(g, new THREE.BoxGeometry(.085, .085, .5), sleeveMat, .02, -.14, .43);
    rifleAdd(g, new THREE.BoxGeometry(.075, .07, .1), gloveMat, -.01, -.06, -.26);
    rifleAdd(g, new THREE.BoxGeometry(.085, .085, .55), sleeveMat, -.08, -.1, .02);
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffd080, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, .015, -1.0); flash.visible = false; g.add(flash);
  awpRoot.add(g);
  return { g, mag, bolt, flash };
})();
/* ================= TABANCA (VS silah setinde) ================= */
RIF.pistol = { mag: 12, rounds: 36, reload: 1.3, dmg: 1.5, pvp: 26, spread: .014, ads: .004 };
const pis = { mag: 12, reserve: 36, reloadT: 0, cd: 0, adsK: 0, kick: 0, flashT: 0, slide: 0 };
const pisRoot = new THREE.Group(); vmScene.add(pisRoot); pisRoot.visible = false;
const pism = (() => {
  const g = new THREE.Group();
  const slide = new THREE.Group(); g.add(slide);
  rifleAdd(slide, new THREE.BoxGeometry(.036, .038, .19), gunMetal, 0, .02, -.03);           // kızak
  rifleAdd(slide, new THREE.BoxGeometry(.008, .012, .01), gunDark, 0, .043, -.115);          // arpacık
  rifleAdd(slide, new THREE.BoxGeometry(.03, .012, .012), gunDark, 0, .043, .055);           // gez
  rifleAdd(g, new THREE.BoxGeometry(.032, .03, .16), gunDark, 0, -.012, -.02);               // gövde
  rifleAdd(g, new THREE.BoxGeometry(.034, .1, .045), gunDark, 0, -.065, .045, .25);          // kabza
  const mag = rifleAdd(g, new THREE.BoxGeometry(.026, .09, .035), gunMetal, 0, -.075, .05, .25);
  // Tabanca eli
  if (typeof createTacticalHand === 'function') {
    const rH = createTacticalHand(false, { grip: 'v', r: .02 }); rH.position.set(0, -.062, .048); rH.rotation.x = .25; g.add(rH);
  } else {
    rifleAdd(g, new THREE.BoxGeometry(.07, .075, .09), gloveMat, 0, -.075, .06, .25);
    rifleAdd(g, new THREE.BoxGeometry(.08, .08, .48), sleeveMat, .02, -.11, .33);
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, .02, -.17); flash.visible = false; g.add(flash);
  pisRoot.add(g);
  return { g, slide, mag, flash };
})();
const PIS_REST = P([.17, -.18, -.4], [0, .03, 0]), PIS_ADS = P([0, -.1, -.36], [0, 0, 0]);
const pisAds = () => wpn.cur === 'pistol' && !wpn.next && mouse.right && player.alive && pis.reloadT <= 0 && state === 'play';
function firePistol() {
  pis.mag--; netFx.sh++; netFx.ft = 0;
  pis.kick = 1; pis.slide = 1; pis.flashT = .04; pism.flash.scale.setScalar(rand(.18, .26));
  muzzleGlow = .9; sfx.pistol(); shake(.04);
  if (typeof flashWorld === 'function') flashWorld(1.8, 0xffa850, 0.05);
  const ads = pis.adsK > .6;
  player.pitch = Math.min(1.45, player.pitch + .02); kickView(rand(-.01, .01), .012);
  camVectors();
  const moving = Math.hypot(player.body.velocity.x, player.body.velocity.z) > 2;
  const spr = (ads ? RIF.pistol.ads : RIF.pistol.spread) * (moving ? 1.6 : 1) * (player.grounded ? 1 : 2);
  muzzleW.copy(eyePos).addScaledVector(rightV, ads ? 0 : .18).addScaledVector(upV, -.1).addScaledVector(camFwd, .55);
  castShot(spreadDir(spr), muzzleW.clone(), RIF.pistol.dmg, 1.2, .2, 25, RIF.pistol.pvp);
}
function updatePistol(dt) {
  pis.cd -= dt;
  if (pis.reloadT > 0) { pis.reloadT -= dt; if (pis.reloadT <= 0) { pis.reloadT = 0; const n = Math.min(RIF.pistol.mag - pis.mag, pis.reserve); pis.mag += n; pis.reserve -= n; } }
  const playing = wpn.cur === 'pistol' && !wpn.next && player.alive && state === 'play' && !vsFrozen() && pis.reloadT <= 0;
  if (playing && rifClick && pis.cd <= 0) {
    if (pis.mag > 0) { firePistol(); pis.cd = .14; }
    else if (pis.reserve > 0) { pis.reloadT = RIF.pistol.reload; sfx.reload(); }
    else sfx.empty();
  }
  if (wpn.cur === 'pistol' && pis.mag <= 0 && pis.reserve > 0 && pis.reloadT <= 0 && !wpn.next) { pis.reloadT = RIF.pistol.reload; sfx.reload(); }
  rifClick = false; rifClickR = false;   // tıklar bu karede tüketildi (tüfekler ve tabanca)
  pis.adsK += ((pisAds() ? 1 : 0) - pis.adsK) * Math.min(1, dt * 14);
  pis.kick = Math.max(0, pis.kick - dt * 10); pis.slide = Math.max(0, pis.slide - dt * 16);
  pis.flashT -= dt; pism.flash.visible = pis.flashT > 0;
  pism.slide.position.z = pis.slide * .04;
  const rp = pis.reloadT > 0 ? 1 - pis.reloadT / RIF.pistol.reload : -1;
  let tilt = 0, drop = 0;
  if (rp >= 0) { tilt = Math.sin(rp * Math.PI); drop = rp < .35 ? easeOut(rp / .35) * .35 : rp < .7 ? .35 - easeOut((rp - .35) / .35) * .35 : 0; }
  pism.mag.position.y = -.075 - drop; pism.mag.visible = drop < .3;
  lerpPose(PIS_REST, PIS_ADS, pis.adsK, rifPose);
  const bob = viewBob(), sprint = player.sprinting && player.grounded ? 1 - pis.adsK : 0;
  pisRoot.position.set(rifPose.p.x + sword.swayX + bob.x, rifPose.p.y + sword.swayY + bob.y - lowerOffset() - tilt * .05 - sprint * .06, rifPose.p.z + pis.kick * .05);
  pisRoot.rotation.set(rifPose.r.x + pis.kick * .3 - wpn.off * .8 + tilt * .4 - sprint * .5, rifPose.r.y + sprint * .4, rifPose.r.z - tilt * .7, 'YXZ');
}
function pistolReload() { if (wpn.cur === 'pistol' && pis.reloadT <= 0 && pis.mag < RIF.pistol.mag && pis.reserve > 0) { pis.reloadT = RIF.pistol.reload; sfx.reload(); } }

const M4_REST = P([.2, -.2, -.46], [0, .03, 0]), M4_ADS = P([0, -.085, -.34], [0, 0, 0]);
const AWP_REST = P([.21, -.21, -.45], [0, .04, 0]);
const rifPose = P([0, 0, 0], [0, 0, 0]);

/* ================= YARDIMCILAR ================= */
const m4Ads = () => wpn.cur === 'm4' && !wpn.next && isVS() && mouse.right && player.alive && m4.reloadT <= 0 && state === 'play';
const awpScoped = () => wpn.cur === 'awp' && !wpn.next && mouse.right && player.alive && awp.reloadT <= 0 && awp.boltT <= 0 && state === 'play';
// kamera görüş açısı: dürbün ve nişan
function aimFov(base) {
  if (awp.scopeK > .5) return 22;
  return base - m4.adsK * 18 - pis.adsK * 14 - uziAim.k * 10 - (typeof gunAdsFov === 'function' ? gunAdsFov() : 0);
}
function resetRifles() {
  Object.assign(pis, { mag: RIF.pistol.mag, reserve: RIF.pistol.rounds, reloadT: 0, cd: 0, adsK: 0 });
  Object.assign(m4, { mag: ST.m4Mag, reserve: RIF.m4.mags, reloadT: 0, cd: 0, gren: ST.grenMax, grenCd: 0, adsK: 0 });
  Object.assign(awp, { mag: ST.awpMag, reserve: RIF.awp.rounds, reloadT: 0, boltT: 0, cd: 0, scopeK: 0 });
}
function rifleReload() {
  if (wpn.cur === 'm4' && m4.reloadT <= 0 && m4.mag < ST.m4Mag) { if (m4.reserve <= 0) { sfx.empty(); return; } m4.reloadT = RIF.m4.reload; sfx.reload(); }
  if (wpn.cur === 'awp' && awp.reloadT <= 0 && awp.mag < ST.awpMag) { if (awp.reserve <= 0) { sfx.empty(); return; } awp.reloadT = RIF.awp.reload; awp.boltT = 0; sfx.reload(); }
}
function spreadDir(spr) {
  const ang = rand(0, 6.28), rr = Math.sqrt(Math.random()) * spr;
  return camFwd.clone().addScaledVector(rightV, Math.cos(ang) * rr).addScaledVector(upV, Math.sin(ang) * rr).normalize();
}

/* ================= ATEŞ ================= */
function fireM4() {
  m4.mag--; netFx.sh++; netFx.ft = 0;
  m4.kick = 1; m4.flashT = .04; m4m.flash.material.rotation = rand(0, 6.28); m4m.flash.scale.setScalar(rand(.25, .36));
  muzzleGlow = 1; sfx.m4(); shake(.03);
  if (typeof flashWorld === 'function') flashWorld(2.4, 0xffa040, 0.05);
  const ads = m4.adsK > .6;
  player.pitch = Math.min(1.45, player.pitch + (ads ? .006 : .009)); player.yaw += rand(-.003, .003);
  kickView(rand(-.008, .008), .006);
  camVectors();
  const moving = Math.hypot(player.body.velocity.x, player.body.velocity.z) > 2;
  const spr = (ads ? RIF.m4.ads : RIF.m4.spread) * (moving ? 1.8 : 1) * (player.grounded ? 1 : 2);
  muzzleW.copy(eyePos).addScaledVector(rightV, ads ? 0 : .2).addScaledVector(upV, -.12).addScaledVector(camFwd, .8);
  castShot(spreadDir(spr), muzzleW.clone(), RIF.m4.dmg * (isVS() ? 1 : ST.m4Dmg), 1.3, .25, 30, RIF.m4.pvp);
  const p = eyePos.clone().addScaledVector(rightV, .2).addScaledVector(camFwd, .4); p.y -= .1;
  emit(p.x, p.y, p.z, rightV.x * rand(2, 3.5), rand(2, 3), rightV.z * rand(2, 3.5), 2, .85, .65, .15, 1.1);
}
function fireAWP() {
  awp.mag--; netFx.sh++; netFx.ft = 1;
  awp.kick = 1; awp.flashT = .07; awpm.flash.scale.setScalar(rand(.5, .65));
  muzzleGlow = 1.8; sfx.awp(); shake(.3);
  if (typeof flashWorld === 'function') flashWorld(4.5, 0xffe8a0, 0.09);
  const scoped = awp.scopeK > .6;
  camVectors();
  const moving = Math.hypot(player.body.velocity.x, player.body.velocity.z) > 2;
  const spr = scoped ? (moving ? .02 : 0) : RIF.awp.spread;
  const dir = spreadDir(spr);
  muzzleW.copy(eyePos).addScaledVector(rightV, scoped ? 0 : .22).addScaledVector(upV, -.12).addScaledVector(camFwd, 1);
  pierceShot(dir, muzzleW.clone());
  player.pitch = Math.min(1.45, player.pitch + .07); kickView(rand(-.04, .04), .08);
  awp.boltT = ST.awpBolt;
}
// AWP: co-op'ta yoldaki bütün düşmanları deler; VS'de oyuncuya tam hasar
function pierceShot(dir, muzzle) {
  const o = camPos;
  const wallT = rayStatic(o, dir, 120);
  if (isVS()) { castShot(dir, muzzle, RIF.awp.dmg, 3, .5, 60, RIF.awp.pvp); return; }
  const hits = [];
  for (const e of enemies) { const r = rayEnemy(e, o, dir); if (r && r.t < wallT) hits.push([r.t, e, r.head]); }
  hits.sort((a, b) => a[0] - b[0]);
  let dmg = RIF.awp.dmg * ST.awpDmg, any = false;
  for (const [t, e, head] of hits.slice(0, ST.awpPierce)) {
    const at = o.clone().addScaledVector(dir, t);
    hurtEnemy(e, dmg * (head ? 2 : 1), dir, randomNormal(), { bullet: true, at, head, power: 3, big: true });
    bloodBurst(at, dir, 40, 12, 2);
    dmg *= .8; any = true;
  }
  for (const p of pieces) { const t = raySphere(o, dir, p.body.position, (p.he.x + p.he.y + p.he.z) / 3 * 1.2); if (t >= 0 && t < wallT) { p.body.wakeUp(); if (p.he.x + p.he.y + p.he.z > .15) splitPiece(p, randomNormal(), dir, 8); } }
  const end = o.clone().addScaledVector(dir, wallT);
  addTracer(muzzle, end); addTracer(muzzle, end);
  chips(end, 12, 1, .8, .4, 4);
  if (typeof sparks === 'function') sparks(end, rand(12, 22), 9);
  if (any) hitMarker(hits.some(h => h[2]));
}

/* ================= BOMBA ATAR (sadece co-op) ================= */
const grenades = [];
const grenGeo = new THREE.SphereGeometry(.06, 8, 6), grenMat = new THREE.MeshStandardMaterial({ color: 0x2f3a24, roughness: .6 });
function launchGrenade() {
  if (m4.gren <= 0) { sfx.empty(); toast('BOMBA KALMADI'); return; }
  m4.gren--; m4.grenCd = 2.2; m4.kick = 1.6;   // bombalar arası bekleme
  sfx.launcher(); shake(.12); kickView(0, .05);
  camVectors();
  const p = eyePos.clone().addScaledVector(camFwd, .8).addScaledVector(rightV, .15); p.y -= .1;
  const m = new THREE.Mesh(grenGeo, grenMat); m.position.copy(p); scene.add(m);
  grenades.push({ m, pos: m.position, vel: camFwd.clone().multiplyScalar(24).add(new V3(0, 3, 0)), life: 3 });
}
function updateGrenades(dt) {
  for (const g of grenades.slice()) {
    g.vel.y -= 16 * dt; g.pos.addScaledVector(g.vel, dt); g.life -= dt;
    g.m.rotation.x += dt * 12;
    if (Math.random() < .8) emit(g.pos.x, g.pos.y, g.pos.z, rand(-.3, .3), rand(0, .6), rand(-.3, .3), 2, .5, .5, .5, .4);
    let boom = g.life <= 0 || hitsStatic(g.pos);
    if (!boom) for (const e of enemies) if (enemyCenter(e, tmp).distanceTo(g.pos) < e.r + .6 * e.T.scale) { boom = true; break; }
    if (boom) { scene.remove(g.m); grenades.splice(grenades.indexOf(g), 1); g.pos.y = Math.max(.2, g.pos.y); explodeAt(g.pos, true, ST.grenR, 3 * ST.grenDmg, 9 * ST.grenDmg); }
  }
}
const boomGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xff7a22, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
scene.add(boomGlow); let boomT = 0, boomScale = 1;
function explodeAt(p, real, R = 5, base = 3, vari = 9) {
  boomGlow.position.copy(p); boomT = .35; boomScale = R / 5;
  if (typeof flashWorld === 'function') flashWorld(5, 0xff7020, 0.15);
  if (typeof sparks === 'function') sparks(p, 45, 15);
  for (let i = 0; i < 140; i++) { const a = rand(0, 6.28), u = rand(-.2, 1), s = rand(4, 14); emit(p.x, p.y, p.z, Math.cos(a) * s * (1 - Math.abs(u) * .5), u * s, Math.sin(a) * s * (1 - Math.abs(u) * .5), 2, 1, rand(.3, .7), .05, rand(.4, 1)); }
  for (let i = 0; i < 50; i++) emit(p.x, p.y, p.z, rand(-5, 5), rand(1, 8), rand(-5, 5), 2, .12, .1, .1, rand(.8, 1.6));
  const d = p.distanceTo(eyePos);
  shake(Math.max(0, .9 - d / 18)); sfx.bigboom();
  muzzleGlow = Math.max(muzzleGlow, Math.max(0, 2 - d / 8));
  if (!real) return;
  if (net.mode !== 'solo') { if (net.mode === 'guest') toHost({ t: 'boom', p: arr(p), r: R }); else bcast({ t: 'boom', p: arr(p), r: R }); }
  for (const e of enemies.slice()) {
    const c = enemyCenter(e, new V3()), dist = c.distanceTo(p);
    if (dist > R + e.r) continue;
    const dir = c.clone().sub(p).setY(.4).normalize();
    hurtEnemy(e, base + vari * (1 - dist / (R + e.r)), dir, randomNormal(), { big: true, power: 3 });
  }
  for (const pc of pieces.slice()) {
    const bp = pc.body.position, dist = Math.hypot(bp.x - p.x, bp.y - p.y, bp.z - p.z);
    if (dist > R) continue;
    pc.body.wakeUp();
    const f = (1 - dist / R) * 14, m = pc.body.mass;
    pc.body.applyImpulse(new CANNON.Vec3((bp.x - p.x) / dist * m * f, m * f * .8, (bp.z - p.z) / dist * m * f), pc.body.position);
    if (dist < R * .5 && pc.he.x + pc.he.y + pc.he.z > .2) splitPiece(pc, randomNormal(), new V3(bp.x - p.x, 1, bp.z - p.z).normalize(), 6);
  }
}

/* ================= GÜNCELLEME ================= */
function updateRifles(dt) {
  m4.cd -= dt; awp.cd -= dt; m4.grenCd -= dt;
  if (m4.reloadT > 0) { m4.reloadT -= dt; if (m4.reloadT <= 0) { m4.reloadT = 0; m4.reserve--; m4.mag = ST.m4Mag; } }
  if (awp.reloadT > 0) { awp.reloadT -= dt; if (awp.reloadT <= 0) { awp.reloadT = 0; const n = Math.min(ST.awpMag - awp.mag, awp.reserve); awp.mag += n; awp.reserve -= n; } }
  if (awp.boltT > 0) { const b0 = awp.boltT; awp.boltT -= dt; if (b0 > ST.awpBolt * .55 && awp.boltT <= ST.awpBolt * .55) sfx.bolt(); }
  const playing = player.alive && state === 'play' && !wpn.next && !vsFrozen();
  if (playing && wpn.cur === 'm4' && m4.reloadT <= 0) {
    if (mouse.left || rifClick) {
      let guard = 0;
      while (m4.cd <= 0 && guard++ < 3) {
        if (m4.mag <= 0) { if (m4.reserve > 0) rifleReload(); else sfx.empty(); break; }
        fireM4(); m4.cd += 1 / ST.m4Rate;
      }
    }
    if (rifClickR && !isVS() && m4.grenCd <= 0) launchGrenade();
  }
  if (m4.cd < 0) m4.cd = 0;
  if (playing && wpn.cur === 'awp' && awp.reloadT <= 0 && awp.boltT <= 0 && awp.cd <= 0 && (rifClick || (mouse.left && awp.lastHeld !== true))) {
    if (awp.mag > 0) { fireAWP(); awp.cd = .2; } else if (awp.reserve > 0) rifleReload(); else sfx.empty();
  }
  awp.lastHeld = mouse.left;
  if (wpn.cur === 'm4' && m4.mag <= 0 && m4.reserve > 0 && m4.reloadT <= 0 && !wpn.next) rifleReload();
  if (wpn.cur === 'awp' && awp.mag <= 0 && awp.reserve > 0 && awp.reloadT <= 0 && awp.boltT <= 0 && !wpn.next) rifleReload();
  updateGrenades(dt);
  boomT -= dt; boomGlow.material.opacity = Math.max(0, boomT / .35); boomGlow.scale.setScalar((6 + (1 - Math.max(0, boomT) / .35) * 6) * boomScale);

  // ---- animasyon ----
  m4.adsK += ((m4Ads() ? 1 : 0) - m4.adsK) * Math.min(1, dt * 14);
  awp.scopeK += ((awpScoped() ? 1 : 0) - awp.scopeK) * Math.min(1, dt * 16);
  const bob = viewBob(), low = lowerOffset(), t = performance.now() / 1000;
  const sprint = player.sprinting && player.grounded ? 1 : 0;
  m4m.gl.visible = !isVS();
  // M4
  m4.kick = Math.max(0, m4.kick - dt * 12); m4.flashT -= dt; m4m.flash.visible = m4.flashT > 0;
  {
    const rp = m4.reloadT > 0 ? 1 - m4.reloadT / RIF.m4.reload : -1;
    let tilt = 0, drop = 0, cock = 0;
    if (rp >= 0) { tilt = Math.sin(rp * Math.PI); drop = rp < .35 ? easeOut(rp / .35) * .45 : rp < .7 ? .45 - easeOut((rp - .35) / .35) * .45 : 0; if (rp > .75 && rp < .95) cock = Math.sin((rp - .75) / .2 * Math.PI); }
    m4m.mag.position.y = -.12 - drop; m4m.mag.visible = drop < .4;
    lerpPose(M4_REST, M4_ADS, m4.adsK, rifPose);
    const sp = sprint * (1 - m4.adsK);
    m4Root.position.set(rifPose.p.x + sword.swayX + bob.x * (1 - m4.adsK * .8), rifPose.p.y + sword.swayY + bob.y * (1 - m4.adsK * .8) - low - tilt * .08 - sp * .06 + Math.sin(t * 1.4) * .002, rifPose.p.z + m4.kick * .05 - cock * .04);
    m4Root.rotation.set(rifPose.r.x + m4.kick * .06 - wpn.off * .8 + tilt * .3 - sp * .5, rifPose.r.y + sp * .45, rifPose.r.z - tilt * .9 + sp * .3, 'YXZ');
  }
  // AWP
  awp.kick = Math.max(0, awp.kick - dt * 5); awp.flashT -= dt; awpm.flash.visible = awp.flashT > 0;
  {
    const rp = awp.reloadT > 0 ? 1 - awp.reloadT / RIF.awp.reload : -1;
    let tilt = 0, drop = 0;
    if (rp >= 0) { tilt = Math.sin(rp * Math.PI); drop = rp < .35 ? easeOut(rp / .35) * .4 : rp < .7 ? .4 - easeOut((rp - .35) / .35) * .4 : 0; }
    awpm.mag.position.y = -.08 - drop; awpm.mag.visible = drop < .35;
    // sürgü: yukarı kalkar, geri çekilir, ileri itilir, iner
    const bp = awp.boltT > 0 ? 1 - awp.boltT / ST.awpBolt : 1;
    const up = bp < .2 ? bp / .2 : bp < .8 ? 1 : 1 - (bp - .8) / .2, back = bp < .2 ? 0 : bp < .5 ? (bp - .2) / .3 : bp < .8 ? 1 - (bp - .5) / .3 : 0;
    awpm.bolt.rotation.z = up * 1.2; awpm.bolt.position.z = .1 + back * .1;
    const boltTilt = awp.boltT > 0 ? Math.sin(bp * Math.PI) : 0;
    awpRoot.visible = wpn.cur === 'awp' && awp.scopeK < .6;
    awpRoot.position.set(AWP_REST.p.x + sword.swayX + bob.x - awp.scopeK * .2, AWP_REST.p.y + sword.swayY + bob.y - low - tilt * .08 - sprint * .07 + awp.scopeK * .08, AWP_REST.p.z + awp.kick * .12);
    awpRoot.rotation.set(AWP_REST.r.x + awp.kick * .3 - wpn.off * .8 + tilt * .3 - sprint * .5 + boltTilt * .12, AWP_REST.r.y + sprint * .45, AWP_REST.r.z - tilt * .8 - boltTilt * .35, 'YXZ');
  }
  $('scope').hidden = !(wpn.cur === 'awp' && awp.scopeK > .6);
}
