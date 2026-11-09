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
const { dequantize, prune, dedup } = require('@gltf-transform/functions');
const { MeshoptDecoder } = require('meshoptimizer');

const [src, ad] = process.argv.slice(2), out = path.resolve('modeller', 'kostum_' + ad + '.glb');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
for (const a of doc.getRoot().listAnimations()) a.dispose();
// sırt çantası ve modele gömülü silahlar çıkarılır (oyunda karakter kendi silahını tutar)
for (const n of doc.getRoot().listNodes()) if (/backpack|sword|shield|axe|dagger|bow\b/i.test(n.getName())) n.dispose();
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantization/i.test(e.extensionName)) e.dispose();
await doc.transform(dequantize(), dedup(), prune());
await io.write(out, doc);
console.log(path.basename(out), (fs.statSync(out).size / 1024 | 0) + ' KB', doc.getRoot().listMaterials().map(m => m.getName()).join(','));
