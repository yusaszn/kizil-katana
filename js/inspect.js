'use strict';
/* Silah hareketleri: F ile inceleme ve silah ele alınırken çekme animasyonu.
   Zaman çizelgeleri: [t, x, y, z, eğim(x), dönüş(y), yatış(z)] — dinlenme pozuna eklenir.
   İncelemeyi ateş etmek, vurmak, silah değiştirmek, şarjör değiştirmek ya da koşmak keser. */

const TAU = Math.PI * 2;
const INSPECT = {
  katana: { dur: 2.8, keys: [[0, 0, 0, 0, 0, 0, 0], [.22, -.2, .12, .06, -.55, .9, 1.35], [.48, -.24, .1, .06, -.5, .95, -1.6], [.72, -.1, .06, 0, .35, .4, 0], [1, 0, 0, 0, 0, 0, 0]] },
  // uzi: kök sadece hafifçe kalkar; asıl gösteri uziInspect'te her tabancada ayrı ayrı
  uzi: { dur: 3.0, keys: [[0, 0, 0, 0, 0, 0, 0], [.1, 0, .03, .03, .12, 0, 0], [.9, 0, .03, .03, .12, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  // tüfekler: sol yüzü göster → çevirip sağ yüzü (fişek penceresi) göster → yuvaya bak, şarjör kontrolü → kurma kolu → dinlen
  shotgun: { dur: 3.8, keys: [[0, 0, 0, 0, 0, 0, 0], [0.16, -0.06, 0.07, -0.04, 0.12, 0.55, -0.7125], [0.32, -0.08, 0.08, -0.03, 0.18, 0.62, -0.81], [0.48, -0.02, 0.1, -0.04, 0.3, -0.36, 0.39], [0.6, -0.03, 0.1, -0.04, 0.26, -0.42, 0.45], [0.72, -0.01, 0.05, -0.06, 0.05, 0.1, -0.1875], [0.86, 0, 0.04, -0.07, 0.02, 0.06, -0.1125], [1, 0, 0, 0, 0, 0, 0]] },
  m4: { dur: 4.2, keys: [[0, 0, 0, 0, 0, 0, 0], [0.14, -0.06, 0.07, -0.04, 0.12, 0.55, -0.675], [0.3, -0.08, 0.08, -0.03, 0.18, 0.62, -0.7875], [0.44, -0.02, 0.1, -0.04, 0.32, -0.38, 0.4125], [0.56, -0.03, 0.1, -0.04, 0.28, -0.42, 0.465], [0.67, -0.04, 0.05, -0.04, -0.05, 0.15, -0.285], [0.8, -0.04, 0.05, -0.04, -0.08, 0.12, -0.315], [0.9, 0, 0.02, -0.07, 0.05, 0.05, -0.075], [1, 0, 0, 0, 0, 0, 0]] },
  awp: { dur: 4.4, keys: [[0, 0, 0, 0, 0, 0, 0], [0.14, -0.1, 0.09, -0.03, 0.12, 0.58, -0.6375], [0.3, -0.12, 0.1, -0.03, 0.16, 0.62, -0.7125], [0.44, -0.04, 0.11, -0.03, 0.36, -0.22, 0.2625], [0.66, -0.04, 0.11, -0.03, 0.34, -0.26, 0.3], [0.74, -0.04, 0.05, -0.04, -0.05, 0.12, -0.2625], [0.86, -0.04, 0.05, -0.04, -0.08, 0.1, -0.3], [1, 0, 0, 0, 0, 0, 0]] },
  ak47: { dur: 4.2, keys: [[0, 0, 0, 0, 0, 0, 0], [0.14, -0.06, 0.07, -0.04, 0.12, 0.55, -0.675], [0.3, -0.08, 0.08, -0.03, 0.18, 0.62, -0.7875], [0.44, -0.02, 0.1, -0.04, 0.32, -0.38, 0.4125], [0.56, -0.03, 0.1, -0.04, 0.28, -0.42, 0.465], [0.67, -0.04, 0.05, -0.04, -0.05, 0.15, -0.285], [0.8, -0.04, 0.05, -0.04, -0.08, 0.12, -0.315], [0.9, -0.01, 0.04, -0.06, 0.1, -0.2, 0.225], [1, 0, 0, 0, 0, 0, 0]] },
  // tabancalar: sol yüz → sağ yüz (fişek penceresi) → namlu kontrolü (kızak hafif geri) → dinlen
  deagle: { dur: 3.4, keys: [[0, 0, 0, 0, 0, 0, 0], [0.14, -0.04, 0.05, -0.05, 0.05, 0.72, -0.75], [0.3, -0.05, 0.06, -0.04, 0.08, 0.78, -0.825], [0.46, -0.03, 0.07, -0.04, 0.06, -0.58, 0.69], [0.6, -0.03, 0.07, -0.04, 0.04, -0.62, 0.75], [0.74, 0, 0.05, -0.06, 0.12, 0.14, -0.165], [0.88, 0, 0.05, -0.06, 0.14, 0.1, -0.15], [1, 0, 0, 0, 0, 0, 0]] },
  usps: { dur: 3.4, keys: [[0, 0, 0, 0, 0, 0, 0], [0.14, -0.04, 0.05, -0.05, 0.05, 0.72, -0.75], [0.3, -0.05, 0.06, -0.04, 0.08, 0.78, -0.825], [0.46, -0.03, 0.07, -0.04, 0.06, -0.58, 0.69], [0.6, -0.03, 0.07, -0.04, 0.04, -0.62, 0.75], [0.74, 0, 0.05, -0.06, 0.12, 0.14, -0.165], [0.88, 0, 0.05, -0.06, 0.14, 0.1, -0.15], [1, 0, 0, 0, 0, 0, 0]] },
  glock: { dur: 3.2, keys: [[0, 0, 0, 0, 0, 0, 0], [0.14, -0.04, 0.05, -0.05, 0.05, 0.72, -0.75], [0.3, -0.05, 0.06, -0.04, 0.08, 0.78, -0.825], [0.46, -0.03, 0.07, -0.04, 0.06, -0.58, 0.69], [0.6, -0.03, 0.07, -0.04, 0.04, -0.62, 0.75], [0.74, 0, 0.05, -0.06, 0.12, 0.14, -0.165], [0.88, 0, 0.05, -0.06, 0.14, 0.1, -0.15], [1, 0, 0, 0, 0, 0, 0]] },
  rocket: { dur: 3.4, keys: [[0, 0, 0, 0, 0, 0, 0], [0.18, -0.14, 0.06, -0.01, 0.15, 0.7, -0.375], [0.4, -0.16, 0.07, -0.01, 0.2, 0.74, -0.4125], [0.6, -0.08, 0.1, -0.03, -0.25, -0.4, 0.2625], [0.8, -0.06, 0.09, -0.04, -0.2, -0.36, 0.225], [1, 0, 0, 0, 0, 0, 0]] },
  launcher: { dur: 3.6, keys: [[0, 0, 0, 0, 0, 0, 0], [0.16, -0.08, 0.08, -0.03, 0.2, 0.6, -0.675], [0.34, -0.08, 0.09, -0.03, 0.24, 0.64, -0.735], [0.5, -0.03, 0.1, -0.04, 0.35, -0.3, 0.3], [0.6, -0.02, 0.06, -0.05, 0.1, 0.1, -0.1125], [0.8, -0.02, 0.06, -0.05, 0.12, 0.08, -0.09], [1, 0, 0, 0, 0, 0, 0]] },
  pistol: { dur: 3.2, keys: [[0, 0, 0, 0, 0, 0, 0], [0.14, -0.04, 0.05, -0.05, 0.05, 0.72, -0.75], [0.3, -0.05, 0.06, -0.04, 0.08, 0.78, -0.825], [0.46, -0.03, 0.07, -0.04, 0.06, -0.58, 0.69], [0.6, -0.03, 0.07, -0.04, 0.04, -0.62, 0.75], [0.74, 0, 0.05, -0.06, 0.12, 0.14, -0.165], [0.88, 0, 0.05, -0.06, 0.14, 0.1, -0.15], [1, 0, 0, 0, 0, 0, 0]] },
  // bıçak: yan yüzü göster, avuçta tam tur çevir, ağzı kameraya döndür, ters yüzü göster, dinlen
  knife: { dur: 3.0, keys: [[0, 0, 0, 0, 0, 0, 0], [.16, -.05, .08, .02, .1, .6, -1.15], [.32, -.06, .09, .03, .15, .65, -1.25], [.52, -.05, .2, .02, TAU, .6, -1.2], [.68, -.05, .08, .02, TAU + .1, -.5, 1.0], [.84, -.04, .07, .02, TAU + .12, -.55, 1.1], [1, 0, 0, 0, TAU, 0, 0]] },
  // karambit ve kelebeğin asıl numarası aşağıdaki özel hareketlerde (halkada dönme, sallama)
  karambit: { dur: 2.4, keys: [[0, 0, 0, 0, 0, 0, 0], [.15, -.12, .05, -.12, .2, .15, -.25], [.85, -.12, .05, -.12, .2, .15, -.25], [1, 0, 0, 0, 0, 0, 0]] },
  butterfly: { dur: 2.6, keys: [[0, 0, 0, 0, 0, 0, 0], [.15, -.12, .06, -.12, .2, .15, -.3], [.85, -.1, .06, -.12, .2, -.15, .3], [1, 0, 0, 0, 0, 0, 0]] },
};
// çekme: silah aşağıdan dönerek gelir, sonra silaha özel kurma hareketi
const DRAW = {
  katana: { dur: .6, keys: [[0, .15, -.55, .1, -1.3, .4, 1.2], [.55, 0, .04, 0, .25, 0, -.35], [1, 0, 0, 0, 0, 0, 0]] },
  uzi: { dur: .65, keys: [[0, 0, -.5, .05, -1.1, 0, 0], [.5, 0, .03, 0, .25, 0, 0], [.75, 0, -.01, 0, -.05, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  shotgun: { dur: .85, keys: [[0, .05, -.5, .1, -1.0, .3, -.6], [.45, 0, .02, 0, .15, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  m4: { dur: .75, keys: [[0, .05, -.5, .1, -1.0, .4, -.5], [.45, 0, .02, 0, .1, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  awp: { dur: 1.05, keys: [[0, .05, -.55, .15, -1.1, .5, -.6], [.4, 0, .03, 0, .1, 0, 0], [.55, 0, 0, 0, 0, 0, -.25], [1, 0, 0, 0, 0, 0, 0]] },
  pistol: { dur: .55, keys: [[0, 0, -.45, .05, -1.2, 0, 1.0], [.5, 0, .02, 0, .1, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  knife: { dur: .5, keys: [[0, 0, -.4, 0, -TAU, 0, 0], [.7, 0, .03, 0, .1, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  karambit: { dur: .75, keys: [[0, 0, -.4, 0, 0, 0, 0], [.35, 0, .02, 0, 0, .3, 0], [1, 0, 0, 0, 0, 0, 0]] },
  butterfly: { dur: .9, keys: [[0, 0, -.4, 0, 0, 0, 0], [.3, 0, .02, 0, 0, .2, -.2], [1, 0, 0, 0, 0, 0, 0]] },
  ak47: { dur: .8, keys: [[0, .05, -.5, .1, -1.0, .4, -.5], [.45, 0, .02, 0, .1, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  deagle: { dur: .65, keys: [[0, 0, -.45, .05, -1.2, 0, 1.0], [.5, 0, .02, 0, .1, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  usps: { dur: .6, keys: [[0, 0, -.45, .05, -1.2, 0, 1.0], [.5, 0, .02, 0, .1, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  glock: { dur: .5, keys: [[0, 0, -.45, .05, -1.2, 0, 1.0], [.5, 0, .02, 0, .1, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  rocket: { dur: 1.0, keys: [[0, .1, -.55, .15, -1.0, .5, -.4], [.5, 0, .04, 0, .12, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  launcher: { dur: .8, keys: [[0, .05, -.5, .1, -1.0, .4, -.5], [.5, 0, .03, 0, .12, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
};
const drawDur = w => (DRAW[w] || { dur: .4 }).dur;
const insp = { w: null, t: 0, active: false };
const smooth = t => t * t * (3 - 2 * t);
function startInspect() {
  const w = wpn.cur;
  if (!INSPECT[w] || !player.alive || state !== 'play' || wpn.next || SETTINGS.thirdPerson) return;
  if (w === 'katana' && sword.phase !== 'idle') return;
  if (isKnife(w) && kn.phase !== 'idle') return;
  insp.w = w; insp.t = 0; insp.active = true; sfx.swap();
}
function inspectBusy() {
  return mouse.left || mouse.right || wpn.next || wpn.cur !== insp.w || !player.alive || state !== 'play' || player.sprinting ||
    ammo.reloadT > 0 || shells.loading || m4.reloadT > 0 || awp.reloadT > 0 || pis.reloadT > 0 || (isGun(wpn.cur) && gst[wpn.cur].reloadT > 0) || block.on || sword.phase !== 'idle' || kn.phase !== 'idle';
}
// anahtar pozlar arası Catmull-Rom: hareket pozlarda durmaz, akıcı geçer (ilk ve son pozda yumuşakça durur)
function keyOffset(def, t) {
  const k = def.keys;
  let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const a = k[i], b = k[i + 1], p0 = k[Math.max(0, i - 1)], p3 = k[Math.min(k.length - 1, i + 2)];
  let u = clamp((t - a[0]) / (b[0] - a[0]), 0, 1);
  if (i === 0 || i === k.length - 2) u = smooth(u);
  const u2 = u * u, u3 = u2 * u;
  return [1, 2, 3, 4, 5, 6].map(j => .5 * (2 * a[j] + (-p0[j] + b[j]) * u + (2 * p0[j] - 5 * a[j] + 4 * b[j] - p3[j]) * u2 + (-p0[j] + 3 * a[j] - 3 * b[j] + p3[j]) * u3));
}
const WEAPON_ROOTS = () => ({ katana: swordRoot, uzi: uziRoot, shotgun: sgRoot, m4: m4Root, awp: awpRoot, pistol: pisRoot, ak47: gunRoots.ak47, deagle: gunRoots.deagle, usps: gunRoots.usps, glock: gunRoots.glock, rocket: rocketRoot, launcher: launcherRoot, knife: knifeRoot, karambit: knifeRoot, butterfly: knifeRoot });
function addOffset(w, o) {
  const root = WEAPON_ROOTS()[w];
  if (root === uziRoot) { uziRoot.position.set(uziRoot.position.x + o[0], uziRoot.position.y + o[1], uziRoot.position.z + o[2]); uziRoot.rotation.x += o[3]; uziRoot.rotation.y += o[4]; uziRoot.rotation.z += o[5]; return; }
  root.position.x += o[0]; root.position.y += o[1]; root.position.z += o[2];
  root.rotation.x += o[3]; root.rotation.y += o[4]; root.rotation.z += o[5];
}
// karambit halkadan parmağa takılı gibi döner: dönme ekseni halkanın ortasından geçer
const RING = new V3(0, -.005, .115);
function ringSpin(g, a) {
  const c = Math.cos(a), s = Math.sin(a);
  g.rotation.set(a, 0, 0);
  g.position.set(0, RING.y - (RING.y * c - RING.z * s), RING.z - (RING.y * s + RING.z * c));
}
// kelebek sallama: akıcı, kesintisiz ve organik santrifüj dalgalanması (karelenme ve takılma yapmaz)
function butterflyFlail(t, turns) {
  const m = knifeModels.butterfly;
  if (!m) return;
  const clampedT = clamp(t, 0, 1);
  const a = easeInOut(clampedT) * TAU * turns;
  m.b.rotation.set(a, 0, 0);
  
  // Zarf eğrisi: başlarken ve biterken saplar tamamen kapalı konuma (0) yumuşakça oturur
  const env = Math.sin(clampedT * Math.PI);
  const wave = Math.sin(clampedT * TAU * turns * 0.5);
  const spread = Math.PI * 0.88 * env;
  
  m.handles[0].rotation.y = spread * Math.max(0, wave);
  m.handles[1].rotation.y = -spread * Math.max(0, -wave);
}
// uzi incelemesi: önce sol, sonra sağ tabanca yana yatırılıp gösterilir ve tetik korkuluğundan parmakta çevrilir;
// sonunda ikisi birden içe yatırılıp şarjörler kontrol edilir
const UZI_PIVOT = new V3(0, -.1, .02), uzA = new V3(), uzB = new V3();
function uziInspect(t) {
  for (let i = 0; i < 2; i++) {
    const g = uzis[i], ud = g.userData, side = ud.side;
    const u = clamp((t - (i ? .4 : .08)) / .34, 0, 1);
    const show = Math.sin(u * Math.PI), lift = smooth(clamp(u * 3, 0, 1)) * (1 - smooth(clamp((u - .75) * 4, 0, 1)));
    // gösterilen tabanca ortaya ve yukarı gelir, yan yüzünü kameraya döner
    g.position.x += -side * .1 * lift; g.position.y += .07 * lift; g.position.z += .05 * lift;
    g.rotation.y += -side * .5 * show; g.rotation.z += -side * .7 * show;
    // tetik çevirme: korkuluk etrafında iki tam tur
    const sp = clamp((u - .28) / .5, 0, 1);
    if (sp > 0 && sp < 1) {
      uzA.copy(UZI_PIVOT).applyEuler(g.rotation);
      g.rotation.x -= easeInOut(sp) * TAU * 2;
      uzB.copy(UZI_PIVOT).applyEuler(g.rotation);
      g.position.add(uzA.sub(uzB));
    }
    // diğer tabanca beklerken hafifçe aşağıda durur
    const other = clamp((t - (i ? .08 : .4)) / .34, 0, 1), wait = Math.sin(other * Math.PI);
    g.position.y -= .04 * wait;
    // final: iki tabanca içe yatar, şarjör biraz çıkıp geri itilir
    const m = clamp((t - .76) / .2, 0, 1), mk = Math.sin(m * Math.PI);
    g.rotation.z += side * .8 * mk; g.rotation.x += .2 * mk; g.position.x += -side * .05 * mk;
    const pull = clamp((m - .2) / .6, 0, 1);
    ud.mag.position.y -= Math.sin(pull * Math.PI) * .07;
  }
}
let lastDrawT = 1;
function applyInspect(dt) {
  // her karede özel parçaları dinlenmeye döndür
  uziRoot.position.set(0, 0, 0); uziRoot.rotation.set(0, 0, 0);
  const kar = knifeModels.karambit.b; kar.rotation.set(0, 0, 0); kar.position.set(0, 0, 0);
  knifeModels.butterfly.b.rotation.set(0, 0, 0);
  // ---- çekme animasyonu ----
  if (wpn.drawing && DRAW[wpn.cur]) {
    const w = wpn.cur, t = clamp(wpn.dt, 0, 1);
    addOffset(w, keyOffset(DRAW[w], t));
    const cross = th => lastDrawT < th && t >= th;
    if (w === 'shotgun') { if (t > .55 && t < .9) sg.pump.position.z = -.3 + Math.sin((t - .55) / .35 * Math.PI) * .14; if (cross(.62)) sfx.pump(); }
    if (w === 'm4') { if (t > .55 && t < .85) m4Root.position.z += Math.sin((t - .55) / .3 * Math.PI) * .03; if (cross(.6)) sfx.bolt(); }
    if (w === 'awp') { if (t > .5 && t < .95) { const k = Math.sin((t - .5) / .45 * Math.PI); awpm.bolt.rotation.z = k * 1.2; awpm.bolt.position.z = .1 + k * .1; } if (cross(.55)) sfx.bolt(); }
    if (isGun(w) && gunModels[w].slide && t > .55 && t < .8) gunModels[w].slide.position.z = Math.sin((t - .55) / .25 * Math.PI) * GUNS[w].slideBack;
    if (isGun(w) && cross(.6)) sfx.bolt();
    if (w === 'pistol') { if (t > .55 && t < .8) pism.slide.position.z = Math.sin((t - .55) / .25 * Math.PI) * .045; if (cross(.6)) sfx.shell(); }
    if (w === 'uzi') { for (let i = 0; i < 2; i++) uzis[i].rotation.z += (1 - smooth(Math.min(1, t * 1.6))) * TAU * uzis[i].userData.side; if (cross(.7)) sfx.shell(); }
    if (w === 'katana') swordRoot.rotation.z += (1 - smooth(Math.min(1, t * 1.4))) * TAU;
    if (w === 'karambit') ringSpin(kar, (1 - easeInOut(Math.min(1, t * 1.15))) * TAU * 2);
    if (w === 'butterfly') { if (t < .88) butterflyFlail(t / .88, 2); else { const h = knifeModels.butterfly.handles; h[0].rotation.y = h[1].rotation.y = 0; } }
    lastDrawT = t;
  } else lastDrawT = 0;
  // ---- inceleme ----
  if (insp.active && inspectBusy()) insp.active = false;
  if (!insp.active) return;
  const def = INSPECT[insp.w];
  insp.t += dt / def.dur;
  if (insp.t >= 1) { insp.active = false; return; }
  const t = insp.t;
  addOffset(insp.w, keyOffset(def, t));
  // pompalı: yarım pompa (namlu kontrolü)
  if (insp.w === 'shotgun' && t > .64 && t < .84) sg.pump.position.z = -.3 + Math.sin((t - .64) / .2 * Math.PI) * .07;
  // tüfekler: destek eli şarjörü tutup biraz çeker, bakar, geri iter
  const magCheck = (m, t0, t1) => {
    if (!m || !m.magHand || t < t0 || t > t1) return;
    const u = (t - t0) / (t1 - t0), out = u < .3 ? smooth(u / .3) : u < .7 ? 1 : 1 - smooth((u - .7) / .3);
    const b = m.mag.userData.base; if (!b) return;
    m.mag.position.y = b.p.y - out * .035; m.mag.rotation.x = b.r - out * .08;
    if (m.lh) m.lh.visible = false; m.magHand.visible = true;
  };
  if (insp.w === 'm4') magCheck(m4m, .66, .84);
  if (insp.w === 'ak47') { magCheck(gunModels.ak47, .66, .82); if (t > .84 && t < .95) gunModels.ak47.slide.position.z = Math.sin((t - .84) / .11 * Math.PI) * .03; }
  if (insp.w === 'awp') { if (t > .47 && t < .64) { const k = Math.sin((t - .47) / .17 * Math.PI); awpm.bolt.rotation.z = k * 1.2; awpm.bolt.position.z = .1 + k * .05; } magCheck(awpm, .72, .88); }
  // tabancalar: destek eli tabancayı bırakır, aşağı iner; tabanca tek elle çevrilir, sonda el geri gelir
  const pm = insp.w === 'pistol' ? pism : isGun(insp.w) && GUNS[insp.w].slot === 'pistol' ? gunModels[insp.w] : null;
  if (pm && pm.lh && pm.lh.userData.base) {
    const off = t < .1 ? smooth(t / .1) : t > .9 ? 1 - smooth((t - .9) / .1) : 1;
    pm.lh.position.copy(pm.lh.userData.base); pm.lh.position.y -= off * .3; pm.lh.position.x -= off * .05;
    pm.lh.visible = off < .98;
  }
  // tabancalar: namlu kontrolü, kızak hafif geri çekilip bırakılır
  if (insp.w === 'pistol' && t > .72 && t < .88) pism.slide.position.z = Math.max(pism.slide.position.z, Math.sin((t - .72) / .16 * Math.PI) * .018);
  if (isGun(insp.w) && GUNS[insp.w].slot === 'pistol' && gunModels[insp.w].slide && t > .72 && t < .88) gunModels[insp.w].slide.position.z = Math.max(gunModels[insp.w].slide.position.z, Math.sin((t - .72) / .16 * Math.PI) * .018);
  // bombaatar: namlu kırılıp fişeğe bakılır
  if (insp.w === 'launcher' && t > .56 && t < .84) glm.barrel.rotation.x = -Math.sin((t - .56) / .28 * Math.PI) * .38;
  if (insp.w === 'uzi') uziInspect(t);
  if (insp.w === 'katana') swordModel.userData.bloodMat.opacity = Math.max(0, swordModel.userData.bloodMat.opacity - dt * .2);
  // karambit: parmakta kesintisiz, akıcı 3.5 tur döner
  if (insp.w === 'karambit' && t > .12 && t < .88) {
    const u = clamp((t - .12) / .76, 0, 1);
    ringSpin(kar, easeInOut(u) * TAU * 3.5);
  }
  // kelebek: açılıp kapanarak akıcı ve kesintisiz sallanır
  if (insp.w === 'butterfly') {
    if (t > .08 && t < .92) butterflyFlail((t - .08) / .84, 3.5);
    else { const h = knifeModels.butterfly.handles; h[0].rotation.y = 0; h[1].rotation.y = 0; }
  }
}
