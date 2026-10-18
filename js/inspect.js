'use strict';
/* Silah hareketleri: F ile inceleme ve silah ele alınırken çekme animasyonu.
   Zaman çizelgeleri: [t, x, y, z, eğim(x), dönüş(y), yatış(z)] — dinlenme pozuna eklenir.
   İncelemeyi ateş etmek, vurmak, silah değiştirmek, şarjör değiştirmek ya da koşmak keser. */

const TAU = Math.PI * 2;
const INSPECT = {
  katana: { dur: 2.8, keys: [[0, 0, 0, 0, 0, 0, 0], [.22, -.2, .12, .06, -.55, .9, 1.35], [.48, -.24, .1, .06, -.5, .95, -1.6], [.72, -.1, .06, 0, .35, .4, 0], [1, 0, 0, 0, 0, 0, 0]] },
  // uzi: kök sadece hafifçe kalkar; asıl gösteri uziInspect'te her tabancada ayrı ayrı
  uzi: { dur: 3.0, keys: [[0, 0, 0, 0, 0, 0, 0], [.1, 0, .03, .03, .12, 0, 0], [.9, 0, .03, .03, .12, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  shotgun: { dur: 2.6, keys: [[0, 0, 0, 0, 0, 0, 0], [.28, -.12, .08, .06, .15, .55, -1.0], [.55, -.05, .1, .05, .3, -.3, .4], [.8, 0, .04, 0, -.25, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  m4: { dur: 2.6, keys: [[0, 0, 0, 0, 0, 0, 0], [.28, -.1, .08, .06, .1, .6, -1.0], [.55, -.04, .1, .05, .35, -.35, .5], [.8, 0, .04, 0, -.2, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  awp: { dur: 2.8, keys: [[0, 0, 0, 0, 0, 0, 0], [.3, -.14, .1, .06, .1, .6, -.9], [.6, -.06, .12, .06, .4, -.2, .3], [.85, 0, .04, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  ak47: { dur: 2.7, keys: [[0, 0, 0, 0, 0, 0, 0], [.28, -.1, .08, .06, .1, .6, -1.0], [.55, -.04, .1, .05, .35, -.35, .5], [.8, 0, .04, 0, -.2, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  deagle: { dur: 2.4, keys: [[0, 0, 0, 0, 0, 0, 0], [.28, -.1, .06, .05, 0, .8, -1.1], [.55, -.06, .08, .05, 0, -.6, 1.0], [.8, 0, .05, 0, .6, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  usps: { dur: 2.4, keys: [[0, 0, 0, 0, 0, 0, 0], [.28, -.1, .06, .05, 0, .8, -1.1], [.55, -.06, .08, .05, 0, -.6, 1.0], [.8, 0, .05, 0, .6, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  glock: { dur: 2.2, keys: [[0, 0, 0, 0, 0, 0, 0], [.28, -.1, .06, .05, 0, .8, -1.1], [.55, -.06, .08, .05, 0, -.6, 1.0], [.8, 0, .05, 0, .6, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  rocket: { dur: 2.6, keys: [[0, 0, 0, 0, 0, 0, 0], [.3, -.16, .06, .08, .15, .7, -.5], [.62, -.1, .1, .06, -.25, -.4, .35], [.85, 0, .03, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  launcher: { dur: 2.4, keys: [[0, 0, 0, 0, 0, 0, 0], [.3, -.1, .08, .06, .2, .6, -.9], [.6, -.05, .1, .05, .35, -.3, .4], [.85, 0, .04, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  pistol: { dur: 2.2, keys: [[0, 0, 0, 0, 0, 0, 0], [.28, -.1, .06, .05, 0, .8, -1.1], [.55, -.06, .08, .05, 0, -.6, 1.0], [.8, 0, .05, 0, .6, 0, 0], [1, 0, 0, 0, 0, 0, 0]] },
  knife: { dur: 2.0, keys: [[0, 0, 0, 0, 0, 0, 0], [.25, -.05, .1, 0, 0, .6, -1.2], [.55, -.05, .26, 0, TAU, .6, -1.2], [.8, 0, .05, 0, TAU, 0, 0], [1, 0, 0, 0, TAU, 0, 0]] },
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
function keyOffset(def, t) {
  const k = def.keys;
  let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const a = k[i], b = k[i + 1], f = smooth(clamp((t - a[0]) / (b[0] - a[0]), 0, 1));
  return [1, 2, 3, 4, 5, 6].map(j => a[j] + (b[j] - a[j]) * f);
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
  if (insp.w === 'shotgun' && t > .6 && t < .78) sg.pump.position.z = -.3 + Math.sin((t - .6) / .18 * Math.PI) * .12;
  if (insp.w === 'm4') m4m.mag.position.y = -.12 - (t > .58 && t < .76 ? Math.sin((t - .58) / .18 * Math.PI) * .05 : 0);
  if (insp.w === 'awp' && t > .62 && t < .85) { const k = Math.sin((t - .62) / .23 * Math.PI); awpm.bolt.rotation.z = k * 1.2; awpm.bolt.position.z = .1 + k * .06; }
  if (insp.w === 'pistol' && t > .82 && t < .96) pism.slide.position.z = Math.sin((t - .82) / .14 * Math.PI) * .04;
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
