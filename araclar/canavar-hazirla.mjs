// Sketchfab (CC-BY) canavar modellerini oyuna hazırlar: istenen animasyonları kısa adlarla tutar, kalanları atar,
// dokuları 512 piksele küçültüp JPEG'e çevirir (saydam malzemeler PNG kalır), gereksizleri ayıklar.
// Çıktı: modeller/canavar_<ad>.glb  (sonra: python araclar/modelleri-paketle.py → js/canavar-<ad>.js, oyunda gerektiğinde yüklenir)
// Kurulum: npm install --prefix araclar/.gt @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer sharp
// Kullanım: node araclar/canavar-hazirla.mjs <m.glb> <ad> 'Idle=idle,Walk=walk,Attack1=atk'  [doku boyu=512]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve(process.env.GT_DIR || 'araclar/.gt', 'x.js'));
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { dequantize, prune, dedup, resample, weld } = require('@gltf-transform/functions');
const { MeshoptDecoder } = require('meshoptimizer');
const sharp = require('sharp');

const [src, ad, harita, boyArg] = process.argv.slice(2);
const BOY = +(boyArg || 512);
const ADLAR = Object.fromEntries((harita || '').split(',').filter(Boolean).map(s => s.split('=')));
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
const root = doc.getRoot();
for (const a of root.listAnimations()) {
  const kisa = a.getName().split('|').pop();
  if (ADLAR[kisa] === undefined) { a.dispose(); continue; }
  a.setName(ADLAR[kisa]);
}
for (const e of root.listExtensionsUsed()) if (/meshopt|quantization|texture_webp|texture_basisu/i.test(e.extensionName)) e.dispose();
// dokular: saydam malzemenin renk dokusu PNG, diğerleri JPEG; hepsi en çok BOY piksel
const seffaf = new Set();
for (const m of root.listMaterials()) if (m.getAlphaMode() !== 'OPAQUE' && m.getBaseColorTexture()) seffaf.add(m.getBaseColorTexture());
for (const t of root.listTextures()) {
  const img = t.getImage(); if (!img) continue;
  let s = sharp(Buffer.from(img)).resize(BOY, BOY, { fit: 'inside', withoutEnlargement: true });
  const png = seffaf.has(t);
  const out = png ? await s.png({ compressionLevel: 9 }).toBuffer() : await s.flatten({ background: '#808080' }).jpeg({ quality: 82 }).toBuffer();
  t.setImage(new Uint8Array(out)); t.setMimeType(png ? 'image/png' : 'image/jpeg');
  t.setURI(t.getURI().replace(/\.\w+$/, png ? '.png' : '.jpg'));
}
await doc.transform(dequantize(), resample({ tolerance: 4e-3 }), dedup(), weld(), prune());   // gözle fark edilmeyen ara kareler atılır
// atılan animasyonların sahipsiz kalan veri dizileri (prune hepsini yakalamıyor)
// kanalı kalmayan örnekleyiciler (atılan klip kanallarının artığı) ve sahipsiz veri dizileri
for (const an of root.listAnimations()) { const used = new Set(an.listChannels().map(c => c.getSampler())); for (const sm of an.listSamplers()) if (!used.has(sm)) sm.dispose(); }
for (const a of root.listAccessors()) if (a.listParents().every(p => p.propertyType === 'Root')) a.dispose();
const out = path.resolve('modeller', 'canavar_' + ad + '.glb');
await io.write(out, doc);
// dosyaya yazılıp geri okununca kanalsız örnekleyicilerin veri dizileri sahipsiz görünür: ikinci geçişte atılır
{ const d2 = await io.read(out), r2 = d2.getRoot();
  for (const a of r2.listAccessors()) if (a.listParents().every(p => p.propertyType === 'Root')) a.dispose();
  await io.write(out, d2); }
console.log(path.basename(out), (fs.statSync(out).size / 1024 | 0) + ' KB', root.listAnimations().map(a => a.getName()).join(','));
