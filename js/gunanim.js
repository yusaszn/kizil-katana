'use strict';
/* Silah animasyonları (tüm silahlarda ortak):
   - Yaylı geri tepme: her atış yaya itki verir; silah geri kaçar, ağzı kalkar, hafif yalpalar ve yumuşakça toparlanır
   - Hareket ataleti: yana koşarken silah geride kalıp yatar, zıplayınca ve yere inince çöküp toparlanır
   - Kovan atma: atışta (pompalıda pompalayınca, AWP'de sürgü çekilince) çıkış penceresinden kovan fırlar
   - Şarjör değiştirme: destek eli kundağı bırakır, eski şarjörü çekip indirir, yenisini takar, alttan vurur ve geri döner;
     tabancada eski şarjör kendiliğinden düşer, el yenisini getirir, boş tabancanın kızağı geride kilitli kalır */

/* ================= YAYLI GERİ TEPME VE ATALET ================= */
const gunSpring = { p: new V3(), v: new V3(), r: new V3(), w: new V3() };   // p: konum, r: dönüş (x: ağız kalkması, y: sapma, z: yalpa)
const gunInertia = { x: 0, roll: 0, g: true, vy: 0 };
// back: geri kaçma, up: ağız kalkması, roll: yalpa (atış başına; silaha göre ölçeklenir)
function gunKick(back = 1, up = 1, roll = 1) {
  gunSpring.v.z += back * rand(.85, 1.15) * .55;
  gunSpring.v.y += up * .06;
  gunSpring.w.x += up * rand(.8, 1.2) * 4.2;
  gunSpring.w.y += rand(-1, 1) * 1.1 * roll;
  gunSpring.w.z += rand(-1, 1) * 3.2 * roll;
}
const GUN_KICK = {
  uzi: [.22, .28, .5], m4: [.42, .42, .45], awp: [1.5, 1.6, .8], pistol: [.5, .8, .6], ak47: [.55, .58, .55],
  deagle: [1, 1.5, .9], usps: [.32, .5, .4], glock: [.4, .6, .5], shotgun: [1.3, 1.5, .9], rocket: [1.4, .9, .5], launcher: [1, 1.1, .6],
};
function gunKickFor(w) { const k = GUN_KICK[w]; if (k) gunKick(k[0], k[1], k[2]); handLife.pull = 1; handLife.squeeze = 1; }

/* ================= CANLI ELLER ================= */
// elde tutulan silahın elleri her karede hafifçe canlandırılır (el.js animateHand)
const handLife = { pull: 0, squeeze: 0, relax: 0 };
const AUTO_FIRE = { uzi: 1, m4: 1, ak47: 1 };
function shownIn(o, root) { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return root.visible; }
function updateHands(dt) {
  const root = gunRootOf(wpn.cur); if (!root || !root.visible) return;
  const firing = mouse.left && AUTO_FIRE[wpn.cur] && state === 'play' && player.alive;
  handLife.pull = Math.max(firing ? .85 : 0, handLife.pull - dt * 11);
  handLife.squeeze = Math.max(0, handLife.squeeze - dt * 5);
  handLife.relax += ((player.sprinting && player.grounded ? 1 : 0) - handLife.relax) * Math.min(1, dt * 6);
  const t = performance.now() / 1000;
  root.updateMatrixWorld(true);
  for (const o of handsOf(root)) if (shownIn(o, root)) { animateHand(o.userData.hand, dt, t, handLife); aimArm(o, dt); }
}
function stepSpring(x, v, k, c, dt) { for (const a of ['x', 'y', 'z']) { v[a] += (-k * x[a] - c * v[a]) * dt; x[a] += v[a] * dt; } }
function updateGunSpring(dt) {
  // küçük adımlarla (kararlı): sert yay, az sönümlü → canlı ama titremeyen toparlanma
  let t = Math.min(dt, .05);
  while (t > 1e-5) { const h = Math.min(t, 1 / 120); stepSpring(gunSpring.p, gunSpring.v, 210, 19, h); stepSpring(gunSpring.r, gunSpring.w, 240, 21, h); t -= h; }
  // hareket ataleti: yana hız → silah geride kalır ve yatar; zıplama / iniş → aşağı itki
  const v = player.body.velocity, side = v.x * rightV.x + v.z * rightV.z;
  const k = Math.min(1, dt * 7);
  gunInertia.x += (clamp(-side * .0032, -.028, .028) - gunInertia.x) * k;
  gunInertia.roll += (clamp(-side * .011, -.1, .1) - gunInertia.roll) * k;
  if (player.grounded && !gunInertia.g && gunInertia.vy < -3) gunSpring.v.y -= Math.min(.5, -gunInertia.vy * .04);   // iniş: silah çöker
  if (!player.grounded && gunInertia.g && v.y > 3) gunSpring.v.y -= .18;                                               // zıplama: silah geride kalır
  gunInertia.g = player.grounded; gunInertia.vy = v.y;
}
// şarjör değiştirme ilerlemesi (0 → 1; değiştirmiyorsa -1)
function reloadProgress(w) {
  if (w === 'm4') return m4.reloadT > 0 ? 1 - m4.reloadT / RIF.m4.reload : -1;
  if (w === 'awp') return awp.reloadT > 0 ? 1 - awp.reloadT / RIF.awp.reload : -1;
  if (w === 'pistol') return pis.reloadT > 0 ? 1 - pis.reloadT / RIF.pistol.reload : -1;
  if (typeof gst !== 'undefined' && gst[w]) return gst[w].reloadT > 0 ? 1 - gst[w].reloadT / GUNS[w].reload : -1;
  return -1;
}
// şarjör değiştirme duruşu: silah kalkar, ortaya gelir, ağzı hafif aşağı ve sola döner, yana yatar → şarjör yuvası göze döner
const RELOAD_POSE = { rifle: [-.06, .085, -.03, -.06, .12, -.45], pistol: [-.05, .07, -.02, -.05, .1, -.4] };
function reloadPoseK(rp) { return rp < 0 ? 0 : rp < .14 ? easeInOut(rp / .14) : rp < .76 ? 1 : rp < .94 ? 1 - easeInOut((rp - .76) / .18) : 0; }
const gunRootOf = w => ({ katana: swordRoot, uzi: uziRoot, shotgun: sgRoot, m4: m4Root, awp: awpRoot, pistol: pisRoot, rocket: rocketRoot, launcher: launcherRoot })[w]
  || (typeof gunRoots !== 'undefined' && gunRoots[w]) || (isKnife(w) ? knifeRoot : null);
function applyGunSpring() {
  const root = gunRootOf(wpn.cur); if (!root) return;
  const ads = (typeof gst !== 'undefined' && gst[wpn.cur] ? gst[wpn.cur].adsK : 0) || (wpn.cur === 'm4' ? m4.adsK : wpn.cur === 'pistol' ? pis.adsK : 0);
  const sway = 1 - ads * .75;   // nişandayken atalet azalır, tepme kalır
  const rk = reloadPoseK(reloadProgress(wpn.cur));
  if (rk > 0) {
    const P = RELOAD_POSE[(typeof GUNS !== 'undefined' && GUNS[wpn.cur] && GUNS[wpn.cur].slot === 'pistol') || wpn.cur === 'pistol' ? 'pistol' : 'rifle'];
    root.position.x += P[0] * rk; root.position.y += P[1] * rk; root.position.z += P[2] * rk;
    root.rotation.x += P[3] * rk; root.rotation.y += P[4] * rk; root.rotation.z += P[5] * rk;
  }
  root.position.x += gunSpring.p.x + gunInertia.x * sway;
  root.position.y += gunSpring.p.y;
  root.position.z += gunSpring.p.z;
  root.rotation.x += gunSpring.r.x;
  root.rotation.y += gunSpring.r.y;
  root.rotation.z += gunSpring.r.z + gunInertia.roll * sway;
}

/* ================= KOVANLAR ================= */
const CASING_GEO = { rifle: gmCasing(.046, .0048), pistol: gmCasing(.026, .0046, .96) };
const casings = [];
function casingObj(kind) {
  let c = casings.find(c => !c.on && c.kind === kind);
  if (!c) {
    if (casings.length >= 30) { c = casings.reduce((a, b) => a.t > b.t ? a : b); c.obj.parent && c.obj.parent.remove(c.obj); casings.splice(casings.indexOf(c), 1); }
    const obj = kind === 'shotgun' ? GM.shell() : new THREE.Mesh(CASING_GEO[kind], GK.brass);
    if (kind === 'shotgun') obj.scale.setScalar(.9);
    vmScene.add(obj);
    c = { obj, kind, v: new V3(), w: new V3(), t: 0, on: false, tink: false };
    casings.push(c);
  }
  return c;
}
const _cq = new THREE.Quaternion();
// model: { g, port } — port silahın kendi uzayında çıkış penceresi; kovan sağa, yukarı ve biraz geriye fırlar
function ejectCasing(model, kind = 'rifle', power = 1) {
  if (!model || !model.port || !model.g) return;
  model.g.updateMatrixWorld(true);
  const c = casingObj(kind);
  c.obj.position.copy(model.port); model.g.localToWorld(c.obj.position);
  model.g.getWorldQuaternion(_cq);
  c.obj.quaternion.copy(_cq);
  if (kind === 'shotgun') c.obj.rotateX(Math.PI / 2);
  c.v.set(rand(1.1, 1.6) * power, rand(.9, 1.4) * power, rand(.1, .45)).applyQuaternion(_cq);
  c.w.set(rand(-14, 14), rand(14, 28), rand(-8, 8));
  c.t = 0; c.on = true; c.tink = false; c.obj.visible = true;
}
function updateCasings(dt) {
  for (const c of casings) {
    if (!c.on) continue;
    c.t += dt; c.v.y -= 9.8 * dt;
    c.obj.position.addScaledVector(c.v, dt);
    c.obj.rotation.x += c.w.x * dt; c.obj.rotation.y += c.w.y * dt; c.obj.rotation.z += c.w.z * dt;
    if (!c.tink && c.t > .38) { c.tink = true; if (typeof sfx !== 'undefined' && sfx.shell && Math.random() < .6) sfx.shell(); }
    if (c.t > .7) { c.on = false; c.obj.visible = false; }
  }
}

/* ================= ŞARJÖR DEĞİŞTİRME ================= */
const easeIn = t => t * t * t;
// tüfek: rp 0→1. Aşamalar: el şarjöre iner | şarjörü çekip indirir | aşağıda (yeni şarjör) | yukarı getirir | takar | alttan vurur | el kundağa döner
function rifleSwap(rp) {
  const o = { dy: 0, dz: 0, rx: 0, hand: 'bar', handK: 0, slap: 0, magVis: true };
  if (rp < .1) o.handK = easeInOut(rp / .1);
  else if (rp < .3) { const k = easeIn((rp - .1) / .2); o.hand = 'mag'; o.dy = -k * .28; o.dz = k * .04; o.rx = -k * .5; }
  else if (rp < .46) { o.hand = 'mag'; o.dy = -.28; o.magVis = false; }
  else if (rp < .63) { const k = easeOut((rp - .46) / .17); o.hand = 'mag'; o.dy = -.28 * (1 - k) - .018 * k; o.dz = .03 * (1 - k); o.rx = -.45 * (1 - k); }
  else if (rp < .69) { const k = easeInOut((rp - .63) / .06); o.hand = 'mag'; o.dy = -.018 * (1 - k); }
  else if (rp < .74) { o.hand = 'mag'; o.slap = Math.sin((rp - .69) / .05 * Math.PI); }
  else if (rp < .9) o.handK = 1 - easeInOut((rp - .74) / .16);
  return o;
}
// tabanca: eski şarjör düşer, destek eli aşağı iner, yeni şarjörü getirip takar, kabzaya döner
function pistolSwap(rp) {
  const o = { dy: 0, dz: 0, rx: 0, hand: 'bar', handK: 0, handDrop: 0, slap: 0, magVis: true };
  if (rp < .2) { const k = (rp / .2); o.dy = -k * k * .32; o.handDrop = easeIn(k); o.magVis = k < .85; }
  else if (rp < .42) { o.hand = 'none'; o.dy = -.3; o.magVis = false; }
  else if (rp < .62) { const k = easeOut((rp - .42) / .2); o.hand = 'mag'; o.dy = -.24 * (1 - k) - .014 * k; o.rx = -.3 * (1 - k); }
  else if (rp < .68) { const k = easeInOut((rp - .62) / .06); o.hand = 'mag'; o.dy = -.014 * (1 - k); }
  else if (rp < .72) { o.hand = 'mag'; o.slap = Math.sin((rp - .68) / .04 * Math.PI); }
  else if (rp < .86) o.handK = 1 - easeInOut((rp - .72) / .14);
  return o;
}
// modeli bu kareye göre ayarla. base: şarjörün dinlenme konumu (ilk çağrıda saklanır). rp < 0: şarjör değiştirilmiyor
function applyMagSwap(m, rp) {
  const mag = m.mag;
  if (!mag.userData.base) mag.userData.base = { p: mag.position.clone(), r: mag.rotation.x };
  if (m.lh && !m.lh.userData.base) m.lh.userData.base = m.lh.position.clone();
  const b = mag.userData.base;
  if (rp < 0) {
    mag.position.copy(b.p); mag.rotation.x = b.r; mag.visible = true;
    if (m.lh) { m.lh.visible = true; m.lh.position.copy(m.lh.userData.base); }
    if (m.magHand) m.magHand.visible = false;
    return 0;
  }
  const o = m.pistol ? pistolSwap(rp) : rifleSwap(rp);
  mag.position.set(b.p.x, b.p.y + o.dy, b.p.z + o.dz); mag.rotation.x = b.r + o.rx; mag.visible = o.magVis;
  if (m.lh) {
    m.lh.visible = o.hand === 'bar';
    // kundaktaki el şarjöre doğru iner (tabancada aşağı çekilir)
    const tgt = new V3(b.p.x - .01, b.p.y - .02, b.p.z + .01);
    m.lh.position.copy(m.lh.userData.base).lerp(tgt, o.handK);
    if (o.handDrop) m.lh.position.y -= o.handDrop * .3;
  }
  if (m.magHand) m.magHand.visible = o.hand === 'mag' && o.magVis;
  return o.slap;
}
