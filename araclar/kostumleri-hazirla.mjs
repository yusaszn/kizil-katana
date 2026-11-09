// Kostümler: @netforge/asset-library-files paketindeki, oyuncu karakteriyle (karakter.glb) AYNI iskeleti kullanan
// Quaternius (CC0) karakterleri. Animasyonlar atılır (oyunda karakter.glb'nin klipleri kemik adlarıyla bunlara da uyar),
// sıkıştırma açılır, modeller/kostum_<ad>.glb yazılır. Kurulum karakteri-hazirla.mjs ile aynı.
// Çalıştırma: node araclar/kostumleri-hazirla.mjs <paket>/library/lowpoly/hooded_adventurer.glb kukuleta
// Sonra:      python araclar/modelleri-paketle.py
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve(process.env.GT_DIR || 'araclar/.gt', 'x.js'));
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { metalRough, dequantize, prune, dedup } = require('@gltf-transform/functions');
const { MeshoptDecoder } = require('meshoptimizer');

// isteğe bağlı: atılacak düğüm / malzeme deseni (ör. modelin elindeki silahlar) ve doku boyu (Sketchfab karakterleri için)
const [src, ad, kesArg, boyArg] = process.argv.slice(2), out = path.resolve('modeller', 'kostum_' + ad + '.glb');
const KES = kesArg ? new RegExp(kesArg, 'i') : null, BOY = +(boyArg || 0);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
for (const a of doc.getRoot().listAnimations()) a.dispose();
// sırt çantası ve modele gömülü silahlar çıkarılır (oyunda karakter kendi silahını tutar)
for (const n of doc.getRoot().listNodes()) if (/backpack|sword|shield|axe|dagger|bow\b/i.test(n.getName())) n.dispose();
if (KES) for (const n of doc.getRoot().listNodes()) { const m = n.getMesh(); if (m && (KES.test(n.getName()) || m.listPrimitives().some(p => p.getMaterial() && KES.test(p.getMaterial().getName())))) n.dispose(); }
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantization|texture_webp/i.test(e.extensionName)) e.dispose();
if (BOY) {
  const sharp = require('sharp');
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage(); if (!img) continue;
    const png = /png/.test(t.getMimeType()) && (await sharp(Buffer.from(img)).metadata()).hasAlpha;
    const sh = sharp(Buffer.from(img)).resize(BOY, BOY, { fit: 'inside', withoutEnlargement: true });
    t.setImage(new Uint8Array(png ? await sh.png({ compressionLevel: 9 }).toBuffer() : await sh.flatten({ background: '#808080' }).jpeg({ quality: 84 }).toBuffer()));
    t.setMimeType(png ? 'image/png' : 'image/jpeg'); t.setURI(t.getURI().replace(/\.\w+$/, png ? '.png' : '.jpg'));
  }
}
await doc.transform(metalRough(), dequantize(), dedup(), prune());
await io.write(out, doc);
{ const d2 = await io.read(out), r2 = d2.getRoot(); for (const a of r2.listAccessors()) if (a.listParents().every(p => p.propertyType === 'Root')) a.dispose(); await io.write(out, d2); }
console.log(path.basename(out), (fs.statSync(out).size / 1024 | 0) + ' KB', doc.getRoot().listMaterials().map(m => m.getName()).join(','));
