'use strict';
/* Hazır 3D modeller (Quaternius, CC0 — kaynaklar modeller/KAYNAK.md).
   Modeller modeller-veri.js içinde base64 olarak gelir: .exe sürümü oyunu file:// ile açtığı için .glb dosyası fetch ile okunamaz.
   Yükleme açılışta arka planda biter; bitmeden doğan düşman eski kutu modeliyle görünür. */

const MODELS = {};   // ad → { scene, clips: { kısaAd: AnimationClip }, box }
// kemikli modelin gerçek (iskeletle şekillenmiş) sınır kutusu: Sketchfab modellerinde bağlama geometrisi ölçek ve
// konum bakımından iskeletten çok farklı olabilir (Box3.setFromObject onu ölçer)
function skinnedBox(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(), v = new THREE.Vector3();
  root.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, step = Math.max(1, Math.floor(pos.count / 3000));
    if (o.isSkinnedMesh) { o.skeleton.update(); for (let i = 0; i < pos.count; i += step) { v.fromBufferAttribute(pos, i); o.boneTransform(i, v); box.expandByPoint(v.applyMatrix4(o.matrixWorld)); } }
    else box.expandByObject(o);
  });
  return box;
}
function modelParse(name, b64) {
  if (!THREE.GLTFLoader) return;
  const bin = atob(b64), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  new THREE.GLTFLoader().parse(buf.buffer, '', gl => {
    const clips = {};
    for (const c of gl.animations) {
      // bazı modellerde (Sketchfab) her klip ortak zaman çizelgesinde ileride başlar: başı 0'a çekilir
      let t0 = Infinity; for (const tr of c.tracks) if (tr.times.length) t0 = Math.min(t0, tr.times[0]);
      if (t0 > 1e-3 && t0 < Infinity) { for (const tr of c.tracks) tr.shift(-t0); c.resetDuration(); }
      clips[c.name] = c;
    }
    gl.scene.traverse(o => {
      if (!o.isMesh) return;
      o.frustumCulled = false;   // kemikle oynayan mesh'in sınır kutusu yanlış kalır
      if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();   // ışıksız modellerde yüzey yönü yok: ışıkta simsiyah kalırdı
    });
    MODELS[name] = { scene: gl.scene, clips, box: name.startsWith('canavar_') ? skinnedBox(gl.scene) : new THREE.Box3().setFromObject(gl.scene) };
  }, err => console.warn('model açılamadı:', name, err));
}
(function loadModels() {
  if (typeof MODEL_DATA === 'undefined' || !THREE.GLTFLoader) { console.warn('3D modeller yüklenemedi'); return; }
  for (const [name, b64] of Object.entries(MODEL_DATA)) modelParse(name, b64);
})();
// sonradan yüklenen modeller (kostümler): js/kostum-<ad>.js script olarak eklenir, içi MODEL_EK çağırır (file:// ile de çalışır)
function MODEL_EK(name, b64) { modelParse(name, b64); }
const modelScripts = {};
function modelYukle(name) {
  if (MODELS[name] || modelScripts[name]) return;
  const el = document.createElement('script'); el.src = 'js/' + name.replace('_', '-') + '.js'; el.async = true;
  el.onerror = () => console.warn('model dosyası yüklenemedi:', name);
  modelScripts[name] = el; document.head.appendChild(el);
}

// Modelin canlı bir kopyası: ayak hizası 0'da, boyu `height`. Malzemeler kopyalanır ki her karakter ayrı parlayabilsin.
// tint: { malzemeAdı: renk } ile renk değiştirilir; glow: tüm malzemelere hafif kendi ışığı.
function modelInstance(name, height, opts = {}) {
  const src = MODELS[name]; if (!src) return null;
  const obj = THREE.SkeletonUtils.clone(src.scene);
  const k = height / Math.max(.01, src.box.max.y - src.box.min.y);
  const root = new THREE.Group(), piv = new THREE.Group(); root.add(piv); piv.add(obj);
  obj.scale.multiplyScalar(k); obj.position.y = -src.box.min.y * k;
  if (name.startsWith('canavar_')) { const c = src.box.getCenter(new THREE.Vector3()); obj.position.x = -c.x * k; obj.position.z = -c.z * k; }   // ortalanır
  if (opts.rotY) piv.rotation.y = opts.rotY;   // modelin baktığı yön oyununkiyle (+z) aynı değilse
  const mats = [], bones = {};
  obj.traverse(o => {
    if (o.isBone) bones[o.name] = o;
    if (!o.isMesh) return;
    const list = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
      let c = m.clone();
      // ışıksız (unlit) malzeme sahnenin ışığını ve vuruş parlamasını almaz: Standard'a çevrilir
      if (!c.emissive) c = new THREE.MeshStandardMaterial({ map: m.map, color: m.color, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, skinning: !!o.isSkinnedMesh, roughness: .85, name: m.name });
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

// Sketchfab canavarları (CC-BY, kaynaklar modeller/KAYNAK.md): açılıştan birkaç saniye sonra arka planda yüklenir;
// gelmeden doğan düşman eski modelle görünür
const CANAVAR_MODELLER = ['canavar_gulyabani', 'canavar_zombi', 'canavar_yokai', 'canavar_tazi', 'canavar_kabus', 'canavar_golem', 'canavar_kurt', 'canavar_ejderha', 'canavar_trol', 'canavar_ork'];
setTimeout(() => { let i = 0; const next = () => { if (i < CANAVAR_MODELLER.length) { modelYukle(CANAVAR_MODELLER[i++]); setTimeout(next, 700); } }; next(); }, 3500);
