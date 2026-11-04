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
  // fenek: sol yüz (kurma kolu) → çevirip sağ yüz (fişek penceresi) → şarjöre bakış → kurma kolu çekilir → dinlen
  fenek: { dur: 3.8, keys: [[0, 0, 0, 0, 0, 0, 0], [0.13, -0.05, 0.07, -0.05, 0.1, 0.6, -0.7], [0.29, -0.07, 0.08, -0.04, 0.16, 0.66, -0.8], [0.43, -0.02, 0.1, -0.05, 0.3, -0.42, 0.45], [0.56, -0.03, 0.1, -0.05, 0.26, -0.46, 0.5], [0.67, -0.04, 0.05, -0.05, -0.08, 0.15, -0.3], [0.8, -0.04, 0.05, -0.05, -0.1, 0.12, -0.33], [0.9, -0.01, 0.04, -0.06, 0.08, 0.22, -0.25], [1, 0, 0, 0, 0, 0, 0]] },
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
  // karambit: bileği kaldırıp ağzı göster → öbür yüzü → parmakta hızlı 3 tur → yakala → ters yöne tek tur → son gösteriş → dinlen
  karambit: { dur: 4.4, keys: [[0, 0, 0, 0, 0, 0, 0], [.1, -.06, .07, -.05, .25, .35, -.5], [.2, -.07, .08, -.05, .28, .42, -.58], [.32, -.04, .08, -.04, .2, -.3, .5],
    [.4, -.05, .06, -.06, .14, .02, -.08], [.58, -.05, .07, -.06, .16, .08, -.14], [.68, -.05, .06, -.06, .12, -.04, .02], [.76, -.06, .07, -.05, .2, .12, -.18],
    [.86, -.06, .08, -.05, .3, .45, -.48], [.94, -.02, .03, -.02, .1, .12, -.12], [1, 0, 0, 0, 0, 0, 0]] },
  // kelebek: her yarım turda bilek ağırlıkla savrulur (ağız yukarı kalkarken bilek hafif aşağı, yakalarken geri)
  butterfly: { dur: 3.2, keys: [[0, 0, 0, 0, 0, 0, 0], [.08, -.08, .05, -.08, .15, .12, -.15], [.19, -.08, .07, -.08, .02, .2, -.4], [.29, -.08, .05, -.08, .22, .08, .1],
    [.4, -.08, .07, -.08, .02, .2, -.42], [.5, -.08, .05, -.08, .2, .1, .08], [.61, -.08, .07, -.08, .04, -.12, .38], [.71, -.08, .05, -.08, .2, .06, -.06],
    [.82, -.08, .07, -.08, .04, -.12, .36], [.92, -.06, .04, -.06, .14, .05, -.05], [1, 0, 0, 0, 0, 0, 0]] },
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
  fenek: { dur: .7, keys: [[0, .05, -.5, .1, -1.0, .4, -.5], [.45, 0, .02, 0, .1, 0, -.12], [1, 0, 0, 0, 0, 0, 0]] },
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
const WEAPON_ROOTS = () => ({ katana: swordRoot, uzi: uziRoot, shotgun: sgRoot, m4: m4Root, awp: awpRoot, pistol: pisRoot, ak47: gunRoots.ak47, fenek: gunRoots.fenek, deagle: gunRoots.deagle, usps: gunRoots.usps, glock: gunRoots.glock, rocket: rocketRoot, launcher: launcherRoot, knife: knifeRoot, karambit: knifeRoot, butterfly: knifeRoot });
function addOffset(w, o) {
  const root = WEAPON_ROOTS()[w];
  if (root === uziRoot) { uziRoot.position.set(uziRoot.position.x + o[0], uziRoot.position.y + o[1], uziRoot.position.z + o[2]); uziRoot.rotation.x += o[3]; uziRoot.rotation.y += o[4]; uziRoot.rotation.z += o[5]; return; }
  root.position.x += o[0]; root.position.y += o[1]; root.position.z += o[2];
  root.rotation.x += o[3]; root.rotation.y += o[4]; root.rotation.z += o[5];
}
// karambit: bıçak işaret parmağının etrafında döner (yerleşimi knives.js knifeAfterHands); dönerken parmak uzanır, diğerleri açılır
function ringSpin(_, a) { knifeModels.karambit.spin = a; }
// kelebek: ağız (A) tutulan sapın piminde, serbest sap (B) ağzın piminde döner; 0 = açık, π = kapalı
function butterflySet(A, B) { const m = knifeModels.butterfly; m.blade.rotation.x = A; m.free.rotation.x = B; }
// yarım tur: ağız a0'dan a0 + yön·π'ye savrulur; serbest sap gecikmeyle izler, sonda hafifçe sekip oturur
function bfHalf(u, a0, dir) {
  const A = a0 + dir * Math.PI * easeInOut(u);
  const v = clamp((u - .22) / .78, 0, 1);
  const B = a0 + dir * (Math.PI * easeInOut(v) + Math.sin(clamp((u - .8) / .2, 0, 1) * Math.PI) * .2);
  return [A, B];
}
// kelebek gösterisi: kapat → dönerek aç → geri kapat → aç. Sap parmakların önünden geçerken parmaklar açılır
const BF_SEQ = [[0, 1], [Math.PI, 1], [2 * Math.PI, -1], [Math.PI, -1]];
function butterflyFlail(t, halves = 4) {
  const n = Math.min(halves, BF_SEQ.length), x = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), u = x - i;
  const [A, B] = bfHalf(u, BF_SEQ[i][0], BF_SEQ[i][1]);
  butterflySet(A, B);
  handLife.release = Math.max(handLife.release, Math.sin(u * Math.PI) * .75);
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
  const kar = knifeModels.karambit; kar.spin = 0; butterflySet(0, 0);
  handLife.release = 0; handLife.extend = 0;
  // ---- çekme animasyonu ----
  if (wpn.drawing && DRAW[wpn.cur]) {
    const w = wpn.cur, t = clamp(wpn.dt, 0, 1);
    addOffset(w, keyOffset(DRAW[w], t));
    const cross = th => lastDrawT < th && t >= th;
    if (w === 'shotgun') { if (t > .55 && t < .9) sg.pump.position.z = -.3 + Math.sin((t - .55) / .35 * Math.PI) * .14; if (cross(.62)) sfx.pump(); }
    if (w === 'm4') { if (t > .55 && t < .85) m4Root.position.z += Math.sin((t - .55) / .3 * Math.PI) * .03; if (cross(.6)) sfx.bolt(); }
    if (w === 'awp') { if (t > .5 && t < .95) { const k = Math.sin((t - .5) / .45 * Math.PI); awpm.bolt.rotation.z = k * 1.2; awpm.bolt.position.z = .1 + k * .1; } if (cross(.55)) sfx.bolt(); }
    if (isGun(w) && gunModels[w].slide && t > .55 && t < .8) gunModels[w].slide.position.z = Math.sin((t - .55) / .25 * Math.PI) * GUNS[w].slideBack;
    if (isGun(w) && gunModels[w].ch && t > .55 && t < .8) gunModels[w].ch.position.z = Math.sin((t - .55) / .25 * Math.PI) * (GUNS[w].chBack || .04);   // kurma kolu
    if (isGun(w) && cross(.6)) sfx.bolt();
    if (w === 'pistol') { if (t > .55 && t < .8) pism.slide.position.z = Math.sin((t - .55) / .25 * Math.PI) * .045; if (cross(.6)) sfx.shell(); }
    if (w === 'uzi') { for (let i = 0; i < 2; i++) uzis[i].rotation.z += (1 - smooth(Math.min(1, t * 1.6))) * TAU * uzis[i].userData.side; if (cross(.7)) sfx.shell(); }
    if (w === 'katana') swordRoot.rotation.z += (1 - smooth(Math.min(1, t * 1.4))) * TAU;
    // karambit: parmakta iki tur dönerek gelir, sonra parmaklar kapanır
    if (w === 'karambit') { const u = Math.min(1, t * 1.15); ringSpin(kar, (1 - easeInOut(u)) * TAU * 2); handLife.extend = handLife.release = 1 - smooth(clamp((u - .7) / .3, 0, 1)); }
    // kelebek: kapalı gelir, ağız dönerek açılır (tek yarım tur)
    if (w === 'butterfly') { const u = clamp(t / .8, 0, 1), [A, B] = bfHalf(u, Math.PI, 1); butterflySet(A, B); handLife.release = Math.sin(u * Math.PI) * .7; }
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
  // fenek: şarjör kontrolü, sonra kurma kolu yarım çekilip namluya bakılır (sürgü de geri gelir)
  if (insp.w === 'fenek') {
    const fm = gunModels.fenek; magCheck(fm, .64, .8);
    if (t > .83 && t < .96) { const k = Math.sin((t - .83) / .13 * Math.PI); fm.ch.position.z = k * .045; fm.slide.position.z = k * .018; }
  }
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
  // karambit: işaret parmağı uzanır, diğer parmaklar açılır; bıçak parmakta önce hızlı 3 tur, sonra ters yöne tek tur döner
  if (insp.w === 'karambit') {
    const seg = (a, b) => clamp((t - a) / (b - a), 0, 1), env = (a, b) => smooth(seg(a - .03, a + .02)) * (1 - smooth(seg(b - .02, b + .03)));
    const fwd = seg(.4, .66), back = seg(.76, .85);
    ringSpin(kar, easeInOut(fwd) * TAU * 3 - easeInOut(back) * TAU);
    handLife.extend = handLife.release = Math.max(env(.4, .66), env(.76, .85));
  }
  // kelebek: açılıp kapanarak akıcı ve kesintisiz sallanır
  if (insp.w === 'butterfly' && t > .08 && t < .92) butterflyFlail((t - .08) / .84, 4);
}
