// Sketchfab (CC-BY) silah modellerini oyuna hazırlar: sergileme parçalarını (zemin, stand) atar, yüzey sayısını
// sadeleştirir (meshoptimizer), dokuları küçültür, modeli ortalar. Çıktı: modeller/silah_<ad>.glb
// (sonra: python araclar/modelleri-paketle.py → js/silah-<ad>.js, oyunda ilk kullanılışta yüklenir)
// Kullanım: node araclar/silah-hazirla.mjs <m.glb> <ad> <sadeleştirme oranı 0..1> [atılacak düğüm/malzeme deseni] [doku boyu]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve(process.env.GT_DIR || 'araclar/.gt', 'x.js'));
const { NodeIO, getBounds } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { dequantize, prune, dedup, weld, simplify, center, flatten } = require('@gltf-transform/functions');
const { MeshoptDecoder, MeshoptSimplifier } = require('meshoptimizer');
const sharp = require('sharp');

const [src, ad, oranArg, desen, boyArg, yKesArg] = process.argv.slice(2);   // yKes: ağırlık merkezi bu y'nin üstündeki üçgenler atılır (ör. yanındaki kın)
const ORAN = +(oranArg || 1), BOY = +(boyArg || 512), AT = desen ? new RegExp(desen, 'i') : null;
await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src), root = doc.getRoot();
for (const a of root.listAnimations()) a.dispose();
if (AT) for (const n of root.listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  if (AT.test(n.getName()) || m.listPrimitives().some(p => p.getMaterial() && AT.test(p.getMaterial().getName()))) n.dispose();
}
if (yKesArg !== undefined && yKesArg !== '') {
  const Y = +yKesArg;
  await doc.transform(dequantize(), flatten());
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), ix = p.getIndices(); if (!ix) continue;
    const keep = [], a = [], b = [], c = [];
    for (let i = 0; i < ix.getCount(); i += 3) {
      const i0 = ix.getScalar(i), i1 = ix.getScalar(i + 1), i2 = ix.getScalar(i + 2);
      pos.getElement(i0, a); pos.getElement(i1, b); pos.getElement(i2, c);
      if ((a[1] + b[1] + c[1]) / 3 <= Y) keep.push(i0, i1, i2);
    }
    ix.setArray(new Uint32Array(keep));
  }
}
for (const e of root.listExtensionsUsed()) if (/meshopt|quantization|texture_webp|texture_basisu/i.test(e.extensionName)) e.dispose();
for (const t of root.listTextures()) {
  const img = t.getImage(); if (!img) continue;
  const png = /png/.test(t.getMimeType()) && (await sharp(Buffer.from(img)).metadata()).hasAlpha;
  const s = sharp(Buffer.from(img)).resize(BOY, BOY, { fit: 'inside', withoutEnlargement: true });
  t.setImage(new Uint8Array(png ? await s.png({ compressionLevel: 9 }).toBuffer() : await s.flatten({ background: '#808080' }).jpeg({ quality: 85 }).toBuffer()));
  t.setMimeType(png ? 'image/png' : 'image/jpeg'); t.setURI(t.getURI().replace(/\.\w+$/, png ? '.png' : '.jpg'));
}
await doc.transform(dequantize(), flatten(), weld(), ...(ORAN < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: ORAN, error: .002 })] : []), dedup(), prune(), center({ pivot: 'center' }));
const out = path.resolve('modeller', 'silah_' + ad + '.glb');
await io.write(out, doc);
const b = getBounds(root.listScenes()[0]);
const tris = root.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((q, p) => q + (p.getIndices() ? p.getIndices().getCount() / 3 : 0), 0), 0);
console.log(path.basename(out), (fs.statSync(out).size / 1024 | 0) + ' KB', 'üçgen', tris, 'boyut', b.max.map((v, i) => (v - b.min[i]).toFixed(3)).join(' x '), 'parçalar', root.listNodes().filter(n => n.getMesh()).map(n => n.getName()).join(','));
