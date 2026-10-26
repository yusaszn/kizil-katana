// İndirilen ham .glb modellerden oyunda kullanılmayan animasyonları atar, veriyi sıkıştırıp modeller/ klasörüne yazar.
// Kurulum (bir kez):  npm install --prefix araclar/.gt @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4
// Çalıştırma:         node araclar/modelleri-kucult.mjs <ham-glb-klasörü>
// Sonra:              python araclar/modelleri-paketle.py
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve(process.env.GT_DIR || 'araclar/.gt', 'x.js'));
const { NodeIO } = require('@gltf-transform/core');
const { KHRONOS_EXTENSIONS } = require('@gltf-transform/extensions');
const { prune, dedup, resample, weld, quantize } = require('@gltf-transform/functions');

// oyundaki ad ← ham dosya, tutulacak animasyonlar ('|' sonrası kısa ad)
const ENEMY = ['Idle', 'Walk', 'Run', 'Attack', 'Punch', 'Weapon', 'HitRecieve', 'HitReact'];
const LIST = {
  goblin: ['goblin', ENEMY],
  imp: ['bluedemon', ENEMY],
  seytan: ['demon1', ENEMY],
  ogre: ['demon3', ENEMY],
  iskelet: ['skel2', ['Skeleton_Idle', 'Skeleton_Running', 'Skeleton_Attack']],
  sovalye: ['skel1', ENEMY],
  kilicli: ['skel3', [...ENEMY, 'Sword']],
  sisko: ['zombie3', [...ENEMY, 'Run_Arms']],
  ork: ['orc', ENEMY],
  yarasa: ['bat', ['Bat_Flying', 'Bat_Attack', 'Bat_Hit']],
  cadi: ['witch', ['Idle', 'Run', 'Punch_Right', 'Sword_Slash', 'HitRecieve']],
};

const src = process.argv[2], out = path.resolve('modeller');
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
for (const [name, [file, keep]] of Object.entries(LIST)) {
  const doc = await io.read(path.join(src, file + '.glb'));
  const seen = new Set();
  for (const a of doc.getRoot().listAnimations()) {
    const short = a.getName().split('|').filter(Boolean).find(p => keep.includes(p));
    // bazı dosyalarda aynı klip iki kez var; birincisi kalır
    if (!short || seen.has(short)) { a.dispose(); continue; }
    seen.add(short); a.setName(short);
  }
  await doc.transform(resample(), dedup(), weld(), prune(), quantize({ pattern: /^(NORMAL|TEXCOORD|JOINTS|WEIGHTS)/ }))   // konum sıkıştırılmaz: three r128 kemikli modelde boyu yanlış ölçer;
  await io.write(path.join(out, name + '.glb'), doc);
  console.log(name.padEnd(8), (fs.statSync(path.join(out, name + '.glb')).size / 1024 | 0) + ' KB', [...seen].join(','));
}
