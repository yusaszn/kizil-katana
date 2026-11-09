'use strict';
/* Sketchfab silah modelleri (CC-BY, kaynaklar modeller/KAYNAK.md). js/silah-<ad>.js ilk gerektiğinde yüklenir;
   gelince o silahın bütün kopyalarında (1. şahıs, 3. şahıs, Atölye) çizim parçaları gizlenir, eller ve namlu alevi
   kalır, model eski silahın boyuna ve yerine oturtulur. Kızak / şarjör ayrı parçaysa animasyon gruplarına bağlanır
   (geri tepme ve şarjör değiştirme çalışmaya devam eder). rotY: modelin namlusu -z'ye baksın diye döndürme. */
const SILAH_GLB = {
  usps: { m: 'silah_makarov', gm: 'usps', rotY: Math.PI },
  pistol: { m: 'silah_dokuzmm', gm: 'beretta', rotY: 0, slide: /slide/i },
  ak47: { m: 'silah_ak12', gm: 'ak', rotY: Math.PI / 2 },
};
const silahKayit = [];
for (const [key, cfg] of Object.entries(SILAH_GLB)) {
  const orig = GM[cfg.gm];
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
  const obj = M.scene.clone(true), piv = new THREE.Group(); piv.add(obj); piv.rotation.y = cfg.rotY || 0;
  obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if (o.material.metalness > .3 && typeof envTex !== 'undefined') { o.material.envMap = envTex; o.material.envMapIntensity = .7; } } });
  piv.updateMatrixWorld(true);
  const gb = new THREE.Box3().setFromObject(piv), sz = box.getSize(new V3()), gs = gb.getSize(new V3());
  piv.scale.setScalar(sz.z / Math.max(1e-4, gs.z) * (cfg.s || 1));
  piv.updateMatrixWorld(true); gb.setFromObject(piv);
  piv.position.copy(box.getCenter(new V3())).sub(gb.getCenter(new V3()));
  g.add(piv); g.updateMatrixWorld(true);
  if (cfg.slide && res.slide) { const parts = []; obj.traverse(o => { if (o.isMesh && cfg.slide.test(o.name)) parts.push(o); }); for (const o of parts) res.slide.attach(o); }
  r.piv = piv;
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
