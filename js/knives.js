'use strict';
/* Bıçaklar (VS silah setinde): Bıçak, Karambit, Kelebek.
   Sol tık seri kesik, sağ tık ağır saplama; arkadan saplama tek vuruşta öldürür. */

const KNIVES = {
  knife: { name: 'BIÇAK', light: 40, heavy: 65, backL: 90, backH: 180, lcd: .42, hcd: 1.0, range: 2.0 },
  karambit: { name: 'KARAMBİT', light: 34, heavy: 60, backL: 90, backH: 180, lcd: .32, hcd: .9, range: 1.9 },
  butterfly: { name: 'KELEBEK', light: 38, heavy: 65, backL: 90, backH: 180, lcd: .36, hcd: .95, range: 2.0 },
};
const isKnife = w => !!KNIVES[w];

/* ================= MODELLER ================= */
const knifeRoot = new THREE.Group(); vmScene.add(knifeRoot); knifeRoot.visible = false;
function handPart(g, isKarambit = false) {
  const h = typeof createTacticalHand === 'function' ? createTacticalHand(false, { grip: 'h', r: .014 }) : new THREE.Group();
  h.position.set(0, 0, isKarambit ? .085 : .07);
  g.add(h);
}
const knifeModels = {};
// modeller: gunmodels.js (GM.knife / GM.karambit / GM.butterfly); burada el ve tutuş yönü eklenir
{ // normal bıçak: muharebe bıçağı
  const g = GM.knife().g;
  handPart(g); knifeRoot.add(g); knifeModels.knife = { g };
}
{ // karambit: ters tutuş. Halka üstte (işaret parmağı içinde), hilal ağız yumruğun altından öne kıvrılır.
  // Bıçak (b) elden ayrı döner, el yerinde kalır; o: b'yi dik tutar (sap ekseni yukarı, ağız aşağı ve öne)
  const g = new THREE.Group(), o = new THREE.Group(), b = GM.karambit().b;
  o.rotation.set(-Math.PI / 2, Math.PI, 0, 'YXZ'); o.position.y = -.06; g.add(o); o.add(b);
  if (typeof createTacticalHand === 'function') { const h = createTacticalHand(false, { grip: 'v', r: .015, trigger: false }); h.position.y = -.01; g.add(h); }
  g.position.set(-.03, .04, -.08); g.rotation.set(.35, .55, -.15);   // yumruk dik, ağız öne-sola kıvrık görünsün
  knifeRoot.add(g); knifeModels.karambit = { g, b };
}
{ // kelebek: ince ağız, açılıp kapanan iki iskelet sap. Bıçak (b) elden ayrı sallanır
  const g = new THREE.Group(), m = GM.butterfly(); g.add(m.b);
  handPart(g); knifeRoot.add(g); knifeModels.butterfly = { g, b: m.b, handles: m.handles };
}
const KN_REST = P([.2, -.19, -.4], [.3, .35, .35]);
knifeRoot.scale.setScalar(1.35);
const KN_ANIM = {
  A: { start: P([.48, -.2, -.4], [.05, -1.0, -1.45]), end: P([-.36, -.36, -.42], [-.1, 1.1, -1.45]), wind: .05, swing: .11, rec: .18 },
  B: { start: P([-.36, -.2, -.4], [.05, 1.0, 1.45]), end: P([.46, -.36, -.42], [-.1, -1.1, 1.45]), wind: .05, swing: .11, rec: .18 },
  H: { start: P([.24, -.2, -.22], [.1, .05, 0]), end: P([.1, -.16, -.7], [-.05, 0, 0]), wind: .2, swing: .1, rec: .35 },
};
const kn = { type: 'knife', anim: null, phase: 'idle', t: 0, cd: 0, drawT: 0, flip: false, hitDone: false, cur: P([.3, -.3, -.46], [.35, .3, .45]), from: P([0, 0, 0], [0, 0, 0]) };
const knPose = P([0, 0, 0], [0, 0, 0]);
function knifeDraw(type) { kn.type = type; kn.drawT = 0; kn.phase = 'idle'; kn.anim = null; }
function knifeAttack(heavy) {
  if (!isKnife(wpn.cur) || wpn.next || kn.cd > 0 || kn.drawT > .25 || !player.alive || state !== 'play' || vsFrozen()) return;
  const K = KNIVES[kn.type];
  kn.anim = heavy ? 'H' : (kn.flip ? 'B' : 'A'); if (!heavy) kn.flip = !kn.flip;
  kn.phase = 'wind'; kn.t = 0; kn.hitDone = false; kn.cd = heavy ? K.hcd : K.lcd;
  kn.from.p.copy(kn.cur.p); kn.from.r.copy(kn.cur.r);
  netFx.sw++;
  setTimeout(() => sfx.swing(false), heavy ? 180 : 30);
  if (!heavy) kickView(kn.anim === 'A' ? .03 : -.03, -.008);
}
// vuruş: önündeki rakip oyuncular (arkadan ise ölümcül) ve co-op'ta düşmanlar
function knifeHit(heavy) {
  const K = KNIVES[kn.type];
  camVectors();
  let hits = 0;
  if (isVS()) for (const [id, pr] of enemyProxies()) {
    const dx = pr.pos.x - camPos.x, dz = pr.pos.z - camPos.z, dh = Math.hypot(dx, dz);
    if (dh - .4 > K.range || (dh > .7 && (dx * flatF.x + dz * flatF.z) / dh < Math.cos(heavy ? .5 : .9))) continue;
    // rakibin baktığı yön ile benim ona yaklaşma yönüm aynıysa arkasındayım
    const back = (-Math.sin(pr.yaw) * dx - Math.cos(pr.yaw) * dz) / dh > .45;
    const dmg = back ? (heavy ? K.backH : K.backL) : (heavy ? K.heavy : K.light);
    pvpHit(id, dmg, new V3(dx, 0, dz).normalize(), { melee: true, w: kn.type, kn: heavy ? 4 : 2 });
    if (back) toast('ARKADAN!');
    hits++;
  }
  for (const e of enemies.slice()) {
    const b = e.body.position, dx = b.x - camPos.x, dz = b.z - camPos.z, dh = Math.hypot(dx, dz);
    if (dh - e.r > K.range || (dh > e.r + .4 && (dx * flatF.x + dz * flatF.z) / dh < .5)) continue;
    hurtEnemy(e, heavy ? 3 : 1.5, flatF.clone(), UP.clone(), { big: heavy });
    hits++;
  }
  if (hits) { sfx.flesh(); hitStop = Math.max(hitStop, .04); shake(.12); }
}
function updateKnife(dt) {
  kn.cd -= dt; kn.drawT = Math.max(0, kn.drawT - dt);
  for (const k in knifeModels) knifeModels[k].g.visible = k === kn.type;
  if (isKnife(wpn.cur) && kn.type !== wpn.cur) knifeDraw(wpn.cur);
  if (isKnife(wpn.cur) && mouse.left && kn.phase === 'idle' && !wpn.next) knifeAttack(false);
  const A = kn.anim && KN_ANIM[kn.anim];
  if (kn.phase === 'wind') {
    kn.t += dt / A.wind; lerpPose(kn.from, A.start, easeOut(Math.min(1, kn.t)), kn.cur);
    if (kn.t >= 1) { kn.phase = 'swing'; kn.t = 0; }
  } else if (kn.phase === 'swing') {
    kn.t += dt / A.swing; lerpPose(A.start, A.end, easeInOut(Math.min(1, kn.t)), kn.cur);
    if (!kn.hitDone && kn.t >= .4) { kn.hitDone = true; knifeHit(kn.anim === 'H'); }
    if (kn.t >= 1) { kn.phase = 'rec'; kn.t = 0; }
  } else if (kn.phase === 'rec') {
    kn.t += dt / A.rec; lerpPose(A.end, KN_REST, easeOut(Math.min(1, kn.t)), kn.cur);
    if (kn.t >= 1) kn.phase = 'idle';
  } else {
    kn.cur.p.lerp(KN_REST.p, Math.min(1, dt * 10)); kn.cur.r.lerp(KN_REST.r, Math.min(1, dt * 10));
  }
  // çekme animasyonları
  const d = kn.drawT / .7;   // 1 → 0
  knPose.p.copy(kn.cur.p); knPose.r.copy(kn.cur.r);
  if (d > 0) {
    const e = easeOut(1 - d);
    knPose.p.y -= (1 - e) * .35;
    if (kn.type === 'karambit') knPose.r.z += (1 - e) * Math.PI * 4;          // parmakta iki tur döner
    else if (kn.type === 'butterfly') knPose.r.y += Math.sin(d * Math.PI) * 1.2;
    else knPose.r.x += (1 - e) * 1.2;
  }
  if (kn.type === 'butterfly') {
    // kapalıyken saplar ağzın üstüne kapanır, çekerken sırayla açılır
    const h = knifeModels.butterfly.handles;
    h[0].rotation.y = d > .5 ? Math.PI * Math.min(1, (d - .5) * 4) : 0;
    h[1].rotation.y = d > 0 ? -Math.PI * Math.min(1, d * 2.5) : 0;
  }
  const bob = viewBob();
  knifeRoot.position.set(knPose.p.x + sword.swayX + bob.x, knPose.p.y + sword.swayY + bob.y - lowerOffset(), knPose.p.z);
  knifeRoot.rotation.set(knPose.r.x - wpn.off * .8, knPose.r.y, knPose.r.z, 'YXZ');
}
