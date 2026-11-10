'use strict';
/* Sketchfab silah modelleri (CC-BY, kaynaklar modeller/KAYNAK.md). js/silah-<ad>.js ilk gerektiğinde yüklenir;
   gelince o silahın bütün kopyalarında (1. şahıs, 3. şahıs, Atölye) çizim parçaları gizlenir, eller ve namlu alevi
   kalır, model eski silahın boyuna ve yerine oturtulur. Kızak / şarjör ayrı parçaysa animasyon gruplarına bağlanır
   (geri tepme ve şarjör değiştirme çalışmaya devam eder). rotY: modelin namlusu -z'ye baksın diye döndürme (rotZ / rotX: modelin kendi eğimi, pitch: yönlendirdikten sonra
   namluyu yataya getiren açı). grip [u, v]: kabzanın avuç noktası, yandan bakınca modelin kutusunda arkadan (u) ve üstten (v)
   oran olarak; model ölçeklenince bu nokta eski silahın sağ elinin (kabzayı tutan el) tam yerine oturur. */
const SILAH_GLB = {
  usps: { m: 'silah_makarov', gm: 'usps', rotY: Math.PI, pitch: .42, grip: [.22, .42] },
  pistol: { m: 'silah_dokuzmm', gm: 'beretta', rotY: 0, pitch: .4, grip: [.18, .44], slide: /slide/i },
  ak47: { m: 'silah_ak12', gm: 'ak', rotY: Math.PI / 2, pitch: -.2, grip: [.29, .5] },
  knife: { m: 'silah_bicak', gm: 'knife', rotY: Math.PI / 2, rotZ: -.41, rotX: Math.PI / 2 },   // model 23° eğik, ucu +x, yassı yatıyor
  karambit: { m: 'silah_karambit', gm: 'karambit', rotY: 0 },
  deagle: { m: 'silah_deagle', gm: 'deagle', rotY: Math.PI, grip: [.22, .53], slide: /_Slide_0$/, mag: /_Magazine_0$/ },
  fenek: { m: 'silah_vector', gm: 'fenek', rotY: Math.PI, grip: [.43, .45] },
  m4: { m: 'silah_m4', gm: 'm4', rotY: Math.PI / 2, grip: [.37, .48], mag: /^Magazine/ },
  uzi: { m: 'silah_uzi', gm: 'uzi', rotY: Math.PI, grip: [.36, .44], mag: /^Mag_/ },
  shotgun: { m: 'silah_r870', gm: 'r870', rotY: Math.PI / 2, grip: [.31, .43] },
  awp: { m: 'silah_pgm', gm: 'awp', rotY: -Math.PI / 2, grip: [.27, .45] },
};
const silahKayit = [], GM_ORIG = {};
for (const [key, cfg] of Object.entries(SILAH_GLB)) {
  const orig = GM_ORIG[cfg.gm] = GM[cfg.gm];
  GM[cfg.gm] = (...a) => { const res = orig(...a); const r = { res, key }; silahKayit.push(r); silahUygula(r); return res; };
}
const _sgM = new THREE.Matrix4(), _sgB = new THREE.Box3();
function silahUygula(r) {
  const cfg = SILAH_GLB[r.key], M = MODELS[cfg.m];
  if (r.done) return;
  if (!M) { modelYukle(cfg.m); return; }
  r.done = true;
  const res = r.res, g = res.g || res.b, skip = new Set();
  g.traverse(o => { if (o.userData.hand || o === res.flash) o.traverse(c => skip.add(c)); });
  // eski silahın kapladığı alan (ellerin ve alevin dışında), g'nin kendi uzayında
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), box = new THREE.Box3();
  g.traverse(o => {
    if (!o.isMesh || skip.has(o)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(_sgB.copy(o.geometry.boundingBox).applyMatrix4(_sgM.multiplyMatrices(inv, o.matrixWorld)));
    o.visible = false;
  });
  const obj = M.scene.clone(true), pv0 = new THREE.Group(), piv = new THREE.Group(); pv0.add(obj); piv.add(pv0);
  pv0.rotation.set(cfg.rotX || 0, cfg.rotY || 0, cfg.rotZ || 0, 'YXZ');   // önce z (eğim), sonra x (uzun eksen etrafında), sonra y (yön)
  piv.rotation.x = cfg.pitch || 0;   // yönlendirilmiş modelin eğimi: namlu yatay
  obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.userData.glbSkin = true; if (o.material.metalness > .3 && typeof envTex !== 'undefined') { o.material.envMap = envTex; o.material.envMapIntensity = .3; } } });
  piv.updateMatrixWorld(true);
  const gb = new THREE.Box3().setFromObject(piv), sz = box.getSize(new V3()), gs = gb.getSize(new V3());
  piv.scale.setScalar(sz.z / Math.max(1e-4, gs.z) * (cfg.s || 1));
  piv.updateMatrixWorld(true); gb.setFromObject(piv);
  const hand = cfg.grip && silahEl(r, cfg);
  if (hand) {   // kabzanın avuç noktası sağ elin yerine
    const gp = new V3((gb.min.x + gb.max.x) / 2, gb.max.y - cfg.grip[1] * (gb.max.y - gb.min.y), gb.max.z - cfg.grip[0] * (gb.max.z - gb.min.z));
    piv.position.copy(hand).sub(gp);
  } else piv.position.copy(box.getCenter(new V3())).sub(gb.getCenter(new V3()));
  g.add(piv); g.updateMatrixWorld(true);
  for (const [k, grp] of [['slide', res.slide], ['mag', res.mag]]) {   // kızak / şarjör parçaları animasyon grubuna (geri tepme, şarjör değiştirme)
    if (!cfg[k] || !grp) continue;
    const parts = []; obj.traverse(o => { if (o.isMesh && cfg[k].test(o.name)) parts.push(o); });
    for (const o of parts) grp.attach(o);
  }
  // seçili kaplama yeni modele de uygulanır
  if (typeof skinTo === 'function' && typeof skinSel !== 'undefined' && skinSel[r.key]) skinTo(g, r.key, skinSel[r.key]);
  r.piv = piv; r.dbg = { box: box.min.toArray().concat(box.max.toArray()).map(v => +v.toFixed(3)), gs: gs.toArray().map(v => +v.toFixed(3)), k: +piv.scale.x.toFixed(4) };
}
// silahın sağ elinin (kabzayı kavrayan) yeri, g uzayında. Elsiz kopyada (Atölye, 3. şahıs) aynı silahın elli bir
// kopyası bir kez kurulup oradan okunur (çizim modeli iki durumda da aynı koordinatlarda)
const silahElOnbellek = {};
function silahEl(r, cfg) {
  const find = g => { let h = null; g.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
    g.traverse(o => { if (!h && o.userData.grip === 'R') h = new V3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv); }); return h; };
  const g = r.res.g || r.res.b, own = find(g); if (own) return own;
  if (!(r.key in silahElOnbellek)) {
    try { const t = r.key === 'uzi' ? GM_ORIG.uzi(1, { hands: true }) : GM_ORIG[cfg.gm]({ hands: true }); silahElOnbellek[r.key] = find(t.g || t.b); }
    catch (e) { silahElOnbellek[r.key] = null; }
  }
  return silahElOnbellek[r.key] && silahElOnbellek[r.key].clone();
}
// model sonradan geldiyse bekleyen kopyalara uygula
function silahYenile() { for (const r of silahKayit) if (!r.done) silahUygula(r); if (typeof katanaGlbUygula === 'function') katanaGlbUygula(); }
setInterval(silahYenile, 1000);

/* KATANA: ejderha korumalı katana ("Dragon katana Oni koroshi", Sky_Hunter, CC-BY). Kılıç ağzı ve kabzası çizim yerine bu */
const KATANA_GLB = { m: 'silah_katana', tipX: 1, guardX: -.34, bladeLen: 1.29 };
let katanaGlb = null;
function katanaGlbUygula() {
  if (katanaGlb || typeof swordModel === 'undefined') return;
  const M = MODELS[KATANA_GLB.m]; if (!M) { modelYukle(KATANA_GLB.m); return; }
  swordModel.traverse(o => { if (o.isMesh) { let p = o, hand = false; while (p) { if (p.userData.hand) { hand = true; break; } p = p.parent; } if (!hand) o.visible = false; } });
  const k = BLADE_L / KATANA_GLB.bladeLen;
  const obj = M.scene.clone(true), piv = new THREE.Group(); piv.add(obj);
  obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.envMap = envTex; o.material.envMapIntensity = 1.2; } });
  piv.rotation.y = Math.PI / 2;   // modelin +x ucu (kılıç ucu) → -z
  piv.scale.setScalar(k);
  piv.position.z = KATANA_GLB.guardX * k;   // koruma (tsuba) eski kılıcın korumasının yerinde: z = 0
  swordModel.add(piv);
  katanaGlb = piv;
}
