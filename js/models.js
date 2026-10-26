'use strict';
/* Hazır 3D modeller (Quaternius, CC0 — kaynaklar modeller/KAYNAK.md).
   Modeller modeller-veri.js içinde base64 olarak gelir: .exe sürümü oyunu file:// ile açtığı için .glb dosyası fetch ile okunamaz.
   Yükleme açılışta arka planda biter; bitmeden doğan düşman eski kutu modeliyle görünür. */

const MODELS = {};   // ad → { scene, clips: { kısaAd: AnimationClip }, box }
(function loadModels() {
  if (typeof MODEL_DATA === 'undefined' || !THREE.GLTFLoader) { console.warn('3D modeller yüklenemedi'); return; }
  const loader = new THREE.GLTFLoader();
  for (const [name, b64] of Object.entries(MODEL_DATA)) {
    const bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    loader.parse(buf.buffer, '', gl => {
      const clips = {};
      for (const c of gl.animations) clips[c.name] = c;
      gl.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });   // kemikle oynayan mesh'in sınır kutusu yanlış kalır
      MODELS[name] = { scene: gl.scene, clips, box: new THREE.Box3().setFromObject(gl.scene) };
    }, err => console.warn('model açılamadı:', name, err));
  }
})();

// Modelin canlı bir kopyası: ayak hizası 0'da, boyu `height`. Malzemeler kopyalanır ki her karakter ayrı parlayabilsin.
// tint: { malzemeAdı: renk } ile renk değiştirilir; glow: tüm malzemelere hafif kendi ışığı.
function modelInstance(name, height, opts = {}) {
  const src = MODELS[name]; if (!src) return null;
  const obj = THREE.SkeletonUtils.clone(src.scene);
  const k = height / Math.max(.01, src.box.max.y - src.box.min.y);
  const root = new THREE.Group(); root.add(obj);
  obj.scale.multiplyScalar(k); obj.position.y = -src.box.min.y * k;
  const mats = [], bones = {};
  obj.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    if (!o.isMesh) return;
    const list = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
      const c = m.clone();
      if (opts.tint && opts.tint[m.name] !== undefined) c.color.setHex(opts.tint[m.name]);
      if (opts.rough !== undefined) c.roughness = opts.rough;
      c.userData.baseEmissive = new THREE.Color(opts.glow || 0);
      c.emissive.copy(c.userData.baseEmissive);
      mats.push(c); return c;
    });
    o.material = Array.isArray(o.material) ? list : list[0];
  });
  const mixer = new THREE.AnimationMixer(obj);
  return { root, obj, mixer, clips: src.clips, mats, bones, actions: {}, cur: null, curName: '' };
}

// İlk bulunan klibi oynatır (isimler modele göre değişir); aynı klip zaten oynuyorsa yalnızca hızını günceller.
function playClip(mi, names, { fade = .18, speed = 1, once = false, restart = false } = {}) {
  const name = (Array.isArray(names) ? names : [names]).find(n => mi.clips[n]);
  if (!name) return null;
  let a = mi.actions[name];
  if (!a) { a = mi.actions[name] = mi.mixer.clipAction(mi.clips[name]); }
  a.timeScale = speed;
  if (mi.curName === name && !restart) return a;
  a.reset();
  a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  a.clampWhenFinished = once;
  a.play();
  if (mi.cur && mi.cur !== a) mi.cur.crossFadeTo(a, fade, false);
  mi.cur = a; mi.curName = name;
  return a;
}

// Kemiklerden ilk bulunanın dünya konumu (kalkan, satır gibi eklentiler bu noktayı izler)
function boneWorld(mi, names, out) {
  for (const n of names) if (mi.bones[n]) return mi.bones[n].getWorldPosition(out);
  return null;
}
