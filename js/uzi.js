'use strict';
/* Çift uzi: model, atış, mermi izleri, şarjör sistemi */

const uziRoot = new THREE.Group(); vmScene.add(uziRoot); uziRoot.visible = false;
const gunMetal = new THREE.MeshStandardMaterial({ color: 0x2b2d31, metalness: .85, roughness: .35, envMap: envTex });
const gunDark = new THREE.MeshStandardMaterial({ color: 0x141416, metalness: .6, roughness: .5, envMap: envTex });
const gloveMat = new THREE.MeshStandardMaterial({ color: 0x241612, roughness: .8 });
const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x2a1c18, roughness: .9 });
function buildUzi(side) {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  add(new THREE.BoxGeometry(.065, .085, .3), gunMetal, 0, 0, 0);
  add(new THREE.BoxGeometry(.05, .02, .22), gunDark, 0, .052, .01);
  add(new THREE.CylinderGeometry(.013, .013, .09, 8), gunDark, 0, .01, -.19, Math.PI / 2);
  add(new THREE.BoxGeometry(.055, .15, .06), gunDark, 0, -.11, .04, .18);
  const mag = add(new THREE.BoxGeometry(.04, .14, .045), gunMetal, 0, -.21, .06, .18);
  add(new THREE.BoxGeometry(.012, .03, .012), gunDark, 0, .07, -.12);
  add(new THREE.BoxGeometry(.03, .02, .06), gunDark, side * .035, .02, .05);
  // Kabzayı saran taktik eldivenli el
  if (typeof createTacticalHand === 'function') {
    const hand = createTacticalHand(side === -1, { grip: 'v', r: .029, trigger: true });
    hand.position.set(0, -.1, .045);
    hand.rotation.x = .18;
    g.add(hand);
  } else {
    add(new THREE.BoxGeometry(.078, .075, .09), gloveMat, 0, -.1, .05, .18);
    add(new THREE.BoxGeometry(.085, .085, .5), sleeveMat, side * .02, -.13, .34);
  }
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, .01, -.3); flash.visible = false; g.add(flash);
  g.userData = { flash, mag, kick: 0, twist: 0, flashT: 0, side };
  uziRoot.add(g);
  return g;
}
const uzis = [buildUzi(-1), buildUzi(1)];
const UZI_REST = [P([-.21, -.17, -.53], [0, -.04, .05]), P([.21, -.17, -.53], [0, .04, -.05])];   // eller ekranda görünsün
const UZI_AIM = [P([-.13, -.17, -.5], [0, -.02, .02]), P([.13, -.17, -.5], [0, .02, -.02])];
const uziAim = { k: 0 };   // sağ tık: iki tabancayı öne toplayıp nişan alır
const uziPose = P([0, 0, 0], [0, 0, 0]);

const ammo = { mag: 60, reserve: 3, reloadT: 0, cd: 0, next: 1 };
const magCap = () => Math.round(ST.magSize) * 2;
function startReload() {
  if (ammo.reloadT > 0 || wpn.cur !== 'uzi' || ammo.mag >= magCap()) return;
  if (ammo.reserve <= 0) { sfx.empty(); return; }
  ammo.reloadT = ST.reloadTime; sfx.reload();
}

// mermi izleri
const TRMAX = 40;
const trPos = new Float32Array(TRMAX * 6), trCol = new Float32Array(TRMAX * 6), trLife = new Float32Array(TRMAX);
const trGeo = new THREE.BufferGeometry();
trGeo.setAttribute('position', new THREE.BufferAttribute(trPos, 3).setUsage(THREE.DynamicDrawUsage));
trGeo.setAttribute('color', new THREE.BufferAttribute(trCol, 3).setUsage(THREE.DynamicDrawUsage));
const tracers = new THREE.LineSegments(trGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));   // sis kapalı: sönen iz sis rengine boyanıp ekranda kalmasın
tracers.frustumCulled = false; scene.add(tracers);
let trIdx = 0;
function addTracer(a, b) {
  const i = trIdx; trIdx = (trIdx + 1) % TRMAX;
  trPos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6); trLife[i] = .07;
}
function updateTracers(dt) {
  for (let i = 0; i < TRMAX; i++) {
    if (trLife[i] > 0) trLife[i] -= dt;
    const f = Math.max(0, trLife[i] / .07);
    trCol.set([f * .9, f * .6, f * .25, f * 1, f * .85, f * .5], i * 6);
  }
  trGeo.attributes.position.needsUpdate = true; trGeo.attributes.color.needsUpdate = true;
}

function rayEnemy(e, o, d) {
  const b = e.body.position, sc = e.T.scale;
  const R = (e.kind === 'boss' ? .42 : .36) * sc;
  const yb = b.y - e.r, yt = yb + 1.93 * sc;
  const ox = o.x - b.x, oz = o.z - b.z, a = d.x * d.x + d.z * d.z;
  if (a < 1e-6) return null;
  const bb = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - R * R;
  const disc = bb * bb - 4 * a * c; if (disc < 0) return null;
  const s = Math.sqrt(disc);
  for (const t of [(-bb - s) / (2 * a), (-bb + s) / (2 * a)]) {
    if (t < 0) continue;
    const y = o.y + d.y * t;
    if (y >= yb && y <= yt) return { t, head: y > yt - .38 * sc };
  }
  return null;
}

const shotDir = new V3(), muzzleW = new V3(), hitAt = new V3();
function fireUzi() {
  ammo.mag--; netFx.sh++;
  const gi = ammo.next; ammo.next = 1 - ammo.next;
  const ud = uzis[gi].userData;
  ud.kick = 1; ud.twist = rand(.5, 1) * (gi ? 1 : -1); ud.flashT = .045; ud.flash.material.rotation = rand(0, 6.28); ud.flash.scale.setScalar(rand(.22, .34));
  muzzleGlow = 1;
  sfx.uzi(); shake(.025);
  if (typeof flashWorld === 'function') flashWorld(1.4, 0xffb060, 0.04);
  player.pitch = Math.min(1.45, player.pitch + .0035); player.yaw += rand(-.0018, .0018);
  kickView((gi ? -1 : 1) * .006, .004);
  camVectors();
  // boş kovan yana fırlar
  { const side = gi ? 1 : -1; const p = eyePos.clone().addScaledVector(rightV, .22 * side).addScaledVector(camFwd, .45); p.y -= .12;
    emit(p.x, p.y, p.z, rightV.x * side * rand(2, 3.5) + rand(-.4, .4), rand(2, 3.5), rightV.z * side * rand(2, 3.5) + rand(-.4, .4), 2, .85, .65, .15, 1.1); }
  for (let k = 0; k < (ST.twin ? 2 : 1); k++) shootRay(gi, k);
}
function shootRay(gi, k) {
  const moving = Math.hypot(player.body.velocity.x, player.body.velocity.z) > 2;
  const spr = ((moving ? .042 : .022) + (player.grounded ? 0 : .02) + k * .012) * (1 - uziAim.k * .55);
  const ang = rand(0, 6.28), rr = Math.sqrt(Math.random()) * spr;
  shotDir.copy(camFwd).addScaledVector(rightV, Math.cos(ang) * rr).addScaledVector(upV, Math.sin(ang) * rr).normalize();
  muzzleW.copy(camPos).addScaledVector(rightV, (gi ? .2 : -.2) + k * .04).addScaledVector(upV, -.16).addScaledVector(camFwd, .55);
  castShot(shotDir, muzzleW, ST.bulletDmg, 1, .22, 0, PVP_DMG.uzi);
}
// Tek bir merminin ışın testi ve etkisi (uzi ve pompalı ortak kullanır)
let castHeadMul = 0;   // silaha özel kafa vuruşu çarpanı (PvP); 0 ise 2 kat
function castShot(dir, muzzle, baseDmg, power, splitChance, falloff, pvpDmg) {
  const o = camPos, vs = isVS();
  let best = rayStatic(o, dir, vs ? 120 : 80), kind = 'wall', hitObj = null, head = false;
  for (const e of enemies) { const r = rayEnemy(e, o, dir); if (r && r.t < best) { best = r.t; kind = 'enemy'; hitObj = e; head = r.head; } }
  for (const f of fireballs) { if (f.deflected) continue; const t = raySphere(o, dir, f.pos, .45); if (t >= 0 && t < best) { best = t; kind = 'fire'; hitObj = f; } }
  if (vs) for (const [id, pr] of enemyProxies()) { const r = rayPlayer(pr, o, dir); if (r && r.t < best) { best = r.t; kind = 'player'; hitObj = id; head = r.head; } }
  else for (const p of pieces) { const t = raySphere(o, dir, p.body.position, (p.he.x + p.he.y + p.he.z) / 3 * 1.2); if (t >= 0 && t < best) { best = t; kind = 'piece'; hitObj = p; } }
  hitAt.copy(o).addScaledVector(dir, best);
  addTracer(muzzle, hitAt);
  const fall = falloff ? clamp(1 - (best - falloff) / 14, .3, 1) : 1;
  if (kind === 'player') {
    pvpHit(hitObj, (pvpDmg || 10) * fall * (head ? (castHeadMul || 2) : 1), dir, { head, w: wpn.cur, at: hitAt.clone() });
    hitMarker(head);
  } else if (kind === 'enemy') {
    const dmg = baseDmg * fall * (head ? 2.2 : 1);
    hurtEnemy(hitObj, dmg, dir, randomNormal(), { bullet: true, at: hitAt.clone(), head, power });
    hitMarker(head);
  } else if (kind === 'piece') {
    const p = hitObj, m = p.body.mass, f = 5 * power;
    p.body.wakeUp();
    p.body.applyImpulse(new CANNON.Vec3(dir.x * m * f, m * 1.5 * power + dir.y * m * f, dir.z * m * f), new CANNON.Vec3(hitAt.x, hitAt.y, hitAt.z));
    if (p.kind === 'flesh') bloodBurst(hitAt, dir, 10, 4, 2); else chips(hitAt, 5, .5, .33, .17, 3);
    if (Math.random() < splitChance && p.he.x + p.he.y + p.he.z > .18) splitPiece(p, randomNormal(), dir, 3 * power);
  } else if (kind === 'fire') {
    if (net.mode === 'guest') toHost({ t: 'fbshot', id: hitObj.id });
    explodeFireball(hitObj); score += 25; hitMarker(false);
  } else {
    chips(hitAt, 6, 1, .75, .35, 3);
    if (typeof sparks === 'function') sparks(hitAt, Math.round(rand(6, 12)), 7);
    if (Math.random() < .3) sfx.ric();
  }
}

function updateUzi(dt) {
  ammo.cd -= dt;
  if (ammo.reloadT > 0) {
    ammo.reloadT -= dt;
    if (ammo.reloadT <= 0) { ammo.reloadT = 0; ammo.reserve--; ammo.mag = magCap(); }
  }
  const canFire = wpn.cur === 'uzi' && !wpn.next && player.alive && state === 'play' && ammo.reloadT <= 0 && !vsFrozen();
  uziAim.k += ((wpn.cur === 'uzi' && !wpn.next && mouse.right && player.alive && state === 'play' && ammo.reloadT <= 0 ? 1 : 0) - uziAim.k) * Math.min(1, dt * 14);
  if (canFire && mouse.left) {
    let guard = 0;
    while (ammo.cd <= 0 && guard++ < 4) {
      if (ammo.mag <= 0) { if (ammo.reserve > 0) startReload(); else sfx.empty(); break; }
      fireUzi(); ammo.cd += 1 / ST.fireRate;
    }
  }
  if (ammo.cd < 0) ammo.cd = 0;
  if (wpn.cur === 'uzi' && ammo.mag <= 0 && ammo.reserve > 0 && ammo.reloadT <= 0 && !wpn.next) startReload();

  const bob = viewBob(), low = lowerOffset();
  const rprog = ammo.reloadT > 0 ? 1 - ammo.reloadT / ST.reloadTime : -1;
  const sprint = player.sprinting && player.grounded && ammo.reloadT <= 0 ? 1 : 0;
  const t = performance.now() / 1000;
  for (let i = 0; i < 2; i++) {
    const g = uzis[i], ud = g.userData, side = ud.side;
    ud.kick = Math.max(0, ud.kick - dt * 14);
    ud.twist *= Math.pow(.0001, dt);
    ud.flashT -= dt; ud.flash.visible = ud.flashT > 0;
    // şarjör değiştirme: önce sol, sonra sağ tabanca. Silah yana yatar, eski şarjör düşer, yenisi aşağıdan takılır, sonra silah kurulur
    let tilt = 0, drop = 0, cock = 0;
    if (rprog >= 0) {
      const ph = clamp((rprog - (i ? .25 : 0)) / .75, 0, 1);
      tilt = Math.sin(ph * Math.PI);
      if (ph < .35) drop = easeOut(ph / .35) * .5;                      // eski şarjör düşüyor
      else if (ph < .75) drop = .5 - easeOut((ph - .35) / .4) * .5;     // yenisi yukarı itiliyor
      if (ph > .78 && ph < .95) cock = Math.sin((ph - .78) / .17 * Math.PI);
    }
    ud.mag.position.y = -.21 - drop; ud.mag.visible = drop < .45;
    lerpPose(UZI_REST[i], UZI_AIM[i], uziAim.k, uziPose);
    const idle = Math.sin(t * 1.5 + i * 1.7) * .004;
    g.position.set(
      uziPose.p.x + sword.swayX + bob.x * (i ? 1 : -1) + tilt * side * -.08,
      uziPose.p.y + sword.swayY + bob.y - low - tilt * .12 - sprint * .08 + idle,
      uziPose.p.z + ud.kick * .08 - cock * .03);
    g.rotation.set(
      uziPose.r.x + ud.kick * .24 - wpn.off * .8 + tilt * .35 + cock * .25 - sprint * .5,
      uziPose.r.y + ud.twist * .06 + sprint * side * -.4,
      uziPose.r.z + ud.twist * .12 + tilt * side * -1.1 + sprint * side * .3, 'YXZ');
  }
}
