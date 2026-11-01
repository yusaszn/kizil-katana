// Oyuncu karakteri: @netforge/asset-library-files paketindeki Quaternius (CC0) karakterini oyuna hazırlar.
// Paketteki dosya meshopt ile sıkıştırılmış ve konumları nicemlenmiş; three r128 kemikli modelde nicemlenmiş konumla
// boyu yanlış ölçtüğü için açılır (dequantize), kullanılmayan animasyonlar atılır, modeller/karakter.glb yazılır.
// Kurulum (bir kez):  npm install --prefix araclar/.gt @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer
//                     npm pack @netforge/asset-library-files  (sonra tgz'yi açın)
// Çalıştırma:         node araclar/karakteri-hazirla.mjs <paket>/library/lowpoly/adventurer.glb
// Sonra:              python araclar/modelleri-paketle.py
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve(process.env.GT_DIR || 'araclar/.gt', 'x.js'));
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { dequantize, prune, dedup, resample } = require('@gltf-transform/functions');
const { MeshoptDecoder } = require('meshoptimizer');

const KEEP = ['Idle_Gun_Pointing', 'Idle_Gun', 'Idle_Sword', 'Idle', 'Run', 'Run_Back', 'Run_Left', 'Run_Right', 'Run_Shoot', 'Walk',
  'Roll', 'Death', 'Sword_Slash', 'Kick_Right', 'Punch_Right', 'Gun_Shoot', 'HitRecieve'];
const src = process.argv[2], out = path.resolve('modeller', 'karakter.glb');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(src);
for (const a of doc.getRoot().listAnimations()) {
  const short = a.getName().split('|').pop();
  if (!KEEP.includes(short)) { a.dispose(); continue; }
  a.setName(short);
}
// sırt çantası çıkarılır (silahlar ve kılıç kınıyla çakışmasın)
for (const n of doc.getRoot().listNodes()) if (/backpack/i.test(n.getName())) n.dispose();
// sıkıştırma uzantılarını kaldır: dosya düz glTF olarak yazılsın
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|quantization/i.test(e.extensionName)) e.dispose();
await doc.transform(dequantize(), resample(), dedup(), prune());
await io.write(out, doc);
console.log('karakter.glb', (fs.statSync(out).size / 1024 | 0) + ' KB', doc.getRoot().listAnimations().map(a => a.getName()).join(','));
