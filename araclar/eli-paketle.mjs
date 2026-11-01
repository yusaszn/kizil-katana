// modeller/el/sag.glb (eklemli el modeli) → js/el-veri.js
// .exe sürümü oyunu file:// ile açtığı için .glb fetch ile okunamaz; veri script olarak gömülür.
// Çalıştırma:  node araclar/eli-paketle.mjs
import fs from 'fs';
import path from 'path';
const kok = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const buf = fs.readFileSync(path.join(kok, 'modeller/el/sag.glb'));
const jsonLen = buf.readUInt32LE(12);
const j = JSON.parse(buf.slice(20, 20 + jsonLen).toString());
const binStart = 20 + jsonLen + 8;
const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const TYPE = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
function acc(i) {
  const a = j.accessors[i], v = j.bufferViews[a.bufferView], T = TYPE[a.componentType], n = a.count * SIZE[a.type];
  const off = binStart + (v.byteOffset || 0) + (a.byteOffset || 0);
  const stride = v.byteStride || 0, el = SIZE[a.type] * T.BYTES_PER_ELEMENT;
  const out = new T(n);
  for (let k = 0; k < a.count; k++) {
    const src = new T(buf.buffer.slice(buf.byteOffset + off + k * (stride || el), buf.byteOffset + off + k * (stride || el) + el));
    out.set(src, k * SIZE[a.type]);
  }
  return out;
}
const b64 = ta => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');
const prim = j.meshes[0].primitives[0], skin = j.skins[0];
const joints = skin.joints.map(i => j.nodes[i]);
const data = {
  joints: joints.map(n => n.name),
  rest: joints.map(n => [...(n.translation || [0, 0, 0]), ...(n.rotation || [0, 0, 0, 1])].map(v => +v.toFixed(6))),
  ibm: b64(acc(skin.inverseBindMatrices)),
  pos: b64(acc(prim.attributes.POSITION)),
  nor: b64(acc(prim.attributes.NORMAL)),
  uv: b64(acc(prim.attributes.TEXCOORD_0)),
  ji: b64(acc(prim.attributes.JOINTS_0)),
  jw: b64(acc(prim.attributes.WEIGHTS_0)),
  idx: b64(acc(prim.indices)),
};
const satir = ["'use strict';", '// OTOMATİK ÜRETİLDİ: araclar/eli-paketle.mjs — elle düzenleme',
  '// El modeli: WebXR Input Profiles "generic-hand" — MIT Lisansı, Copyright (c) 2019 Amazon. Lisans metni: modeller/el/LISANS.md',
  'const HAND_DATA = ' + JSON.stringify(data) + ';'];
fs.writeFileSync(path.join(kok, 'js/el-veri.js'), satir.join('\n') + '\n');
console.log('js/el-veri.js:', (fs.statSync(path.join(kok, 'js/el-veri.js')).size / 1024 | 0) + ' KB', data.joints.length + ' eklem');
