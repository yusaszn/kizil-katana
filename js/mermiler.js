'use strict';
/* Dünyadaki mermi izleri ve kovanlar.
   İz (tracer): namludan hedefe uzanan sabit bir çizgi değil; mermi hızıyla ilerleyen kısa, sıcak bir parıltıdır.
     Başı beyaza yakın turuncu ve kalın, kuyruğu incelip söner. Her mermide değil, ara sıra görünür (gerçek izli mermi oranı).
   Kovan: sarı bir nokta değil, gerçek pirinç kovan: yere düşer, seker, döner, yatar ve birkaç saniye sonra kaybolur.
     Birinci şahısta kovan önce silahın yanından (silah sahnesinde) fırlar, sonra ayak dibine düşer; üçüncü şahısta ve
     diğer oyuncularda doğrudan silahtan çıkar. */

/* ================= İZLER ================= */
const TR_MAX = 48, TRACER = { speed: 300, len: 2.6 };   // izin hızı (m/sn) ve boyu
const trBuf = { pos: new Float32Array(TR_MAX * 12), col: new Float32Array(TR_MAX * 12), uv: new Float32Array(TR_MAX * 8), idx: [] };
for (let i = 0; i < TR_MAX; i++) { const b = i * 4; trBuf.idx.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); trBuf.uv.set([0, 0, 0, 1, 1, 0, 1, 1], i * 8); }
// iz dokusu: enine yumuşak kenar (ortası parlak), boyuna baştan kuyruğa sönme
const tracerTex = canvasTex(64, (g, s) => {
  const img = g.createImageData(s, s), d = img.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const v = y / (s - 1) * 2 - 1, u = x / (s - 1), across = Math.exp(-v * v * 6), along = Math.pow(1 - u, 1.6) * (u < .04 ? u / .04 * .5 + .5 : 1);
    const a = across * along, i = (y * s + x) * 4, core = Math.exp(-v * v * 40) * (1 - u);
    d[i] = 255 * Math.min(1, a + core * .6); d[i + 1] = 255 * Math.min(1, a * .85 + core * .6); d[i + 2] = 255 * Math.min(1, a * .6 + core * .5); d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}, 1, 1, false);
tracerTex.wrapS = tracerTex.wrapT = THREE.ClampToEdgeWrapping;
const trGeo2 = new THREE.BufferGeometry();
trGeo2.setAttribute('position', new THREE.BufferAttribute(trBuf.pos, 3).setUsage(THREE.DynamicDrawUsage));
trGeo2.setAttribute('color', new THREE.BufferAttribute(trBuf.col, 3).setUsage(THREE.DynamicDrawUsage));
trGeo2.setAttribute('uv', new THREE.BufferAttribute(trBuf.uv, 2));
trGeo2.setIndex(trBuf.idx);
const tracerMesh = new THREE.Mesh(trGeo2, new THREE.MeshBasicMaterial({ map: tracerTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
tracerMesh.frustumCulled = false; scene.add(tracerMesh);
const trList = [];   // { a, d, len, t, dist, w, bright }
let trSlot = 0, trCount = 0;
// a: namlu, b: isabet noktası. opts.chance: görünme olasılığı, opts.w: kalınlık, opts.bright: parlaklık
function spawnTracer(a, b, opts = {}) {
  const chance = opts.chance !== undefined ? opts.chance : .35;
  if (Math.random() > chance) return;
  const d = b.clone().sub(a), dist = d.length(); if (dist < 1.5) return;
  d.divideScalar(dist);
  const tr = trList[trSlot] || (trList[trSlot] = { a: new V3(), d: new V3() });
  tr.a.copy(a); tr.d.copy(d); tr.dist = dist; tr.t = 0; tr.on = true;
  tr.len = Math.min(TRACER.len, dist * .6); tr.w = opts.w || .045; tr.bright = opts.bright || 1;
  tr.start = Math.min(1.2, dist * .3);   // ilk karede namlunun içinden çıkmış gibi görünsün
  trSlot = (trSlot + 1) % TR_MAX;
}
// silah başına iz olasılığı: susturuculu sesaltı mermide iz yok, pompalı saçmasında çok seyrek
const TRACER_CHANCE = { uzi: .22, m4: .3, ak47: .3, pistol: .15, deagle: .25, usps: 0, glock: .15, shotgun: .05 };
// eski adla çağrılar (uzi, tüfekler, ağ): her atış iz değildir
function addTracer(a, b, opts) { spawnTracer(a, b, opts); }
const _th = new V3(), _tt = new V3(), _ts = new V3(), _tc = new V3();
function updateTracers(dt) {
  const P = trBuf.pos, C = trBuf.col;
  for (let i = 0; i < TR_MAX; i++) {
    const tr = trList[i], o = i * 12;
    if (!tr || !tr.on) { for (let k = 0; k < 12; k++) C[o + k] = 0; continue; }
    tr.t += dt;
    const head = Math.min(tr.dist, tr.start + tr.t * TRACER.speed), tail = Math.max(0, head - tr.len);
    if (tail >= tr.dist - .01) { tr.on = false; for (let k = 0; k < 12; k++) C[o + k] = 0; continue; }
    _th.copy(tr.a).addScaledVector(tr.d, head); _tt.copy(tr.a).addScaledVector(tr.d, tail);
    // kameraya dönük şerit: yön × (kameraya doğru) = yan vektör
    _tc.copy(_th).sub(camera.position);
    _ts.copy(tr.d).cross(_tc).normalize();
    const dc = Math.max(1, _tc.length()), wH = tr.w * Math.min(2.4, .7 + dc * .06), wT = wH * .45;
    P[o] = _th.x + _ts.x * wH; P[o + 1] = _th.y + _ts.y * wH; P[o + 2] = _th.z + _ts.z * wH;
    P[o + 3] = _th.x - _ts.x * wH; P[o + 4] = _th.y - _ts.y * wH; P[o + 5] = _th.z - _ts.z * wH;
    P[o + 6] = _tt.x + _ts.x * wT; P[o + 7] = _tt.y + _ts.y * wT; P[o + 8] = _tt.z + _ts.z * wT;
    P[o + 9] = _tt.x - _ts.x * wT; P[o + 10] = _tt.y - _ts.y * wT; P[o + 11] = _tt.z - _ts.z * wT;
    const f = tr.bright * (head >= tr.dist ? Math.max(0, 1 - (tail / tr.dist)) : 1);
    C.set([f, f * .82, f * .55, f, f * .82, f * .55, f * .9, f * .4, f * .12, f * .9, f * .4, f * .12], o);
  }
  trGeo2.attributes.position.needsUpdate = true; trGeo2.attributes.color.needsUpdate = true;
}

/* ================= KOVANLAR ================= */
const wBrass = new THREE.MeshStandardMaterial({ color: 0xb8913f, metalness: .85, roughness: .32, envMap: envTex });
const wHull = new THREE.MeshStandardMaterial({ color: 0x8a1610, roughness: .5 });
const WC_GEO = {
  rifle: gmCasing(.052, .0056),
  pistol: gmCasing(.03, .0054, .96),
  shotgunHull: new THREE.CylinderGeometry(.013, .013, .062, 12).rotateX(Math.PI / 2),
  shotgunBase: new THREE.CylinderGeometry(.0136, .0136, .014, 12).rotateX(Math.PI / 2).translate(0, 0, .037),
};
const wCasings = [], WC_MAX = 70, _down = new V3(0, -1, 0);
function worldCasing(kind, pos, vel) {
  let c = wCasings.find(c => !c.on && c.kind === kind);
  if (!c) {
    if (wCasings.length >= WC_MAX) { c = wCasings.reduce((a, b) => a.age > b.age ? a : b); scene.remove(c.obj); wCasings.splice(wCasings.indexOf(c), 1); }
    let obj;
    if (kind === 'shotgun') { obj = new THREE.Group(); obj.add(new THREE.Mesh(WC_GEO.shotgunHull, wHull), new THREE.Mesh(WC_GEO.shotgunBase, wBrass)); }
    else obj = new THREE.Mesh(WC_GEO[kind], wBrass);
    scene.add(obj);
    c = { obj, kind, v: new V3(), w: new V3(), age: 0, on: false, ground: 0, rest: false, bounces: 0 };
    wCasings.push(c);
  }
  c.obj.position.copy(pos); c.v.copy(vel);
  c.obj.rotation.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));
  c.w.set(rand(-25, 25), rand(-25, 25), rand(-25, 25));
  const t = rayStatic(pos, _down, 6); c.ground = pos.y - t;
  c.age = 0; c.on = true; c.rest = false; c.bounces = 0; c.obj.visible = true; c.obj.scale.setScalar(1);
}
function updateWorldCasings(dt) {
  for (const c of wCasings) {
    if (!c.on) continue;
    c.age += dt;
    if (!c.rest) {
      c.v.y -= 9.8 * dt;
      c.obj.position.addScaledVector(c.v, dt);
      c.obj.rotation.x += c.w.x * dt; c.obj.rotation.y += c.w.y * dt; c.obj.rotation.z += c.w.z * dt;
      const r = c.kind === 'shotgun' ? .013 : .0055;
      if (c.obj.position.y < c.ground + r) {
        c.obj.position.y = c.ground + r;
        if (c.v.y < -.6 && c.bounces < 4) {
          // sekme: hız düşer, yön hafif sapar, dönüş değişir; yakındaysa pirinç çınlaması
          c.v.y = -c.v.y * .38; c.v.x = c.v.x * .55 + rand(-.3, .3); c.v.z = c.v.z * .55 + rand(-.3, .3);
          c.w.multiplyScalar(.6).add(new V3(rand(-8, 8), rand(-8, 8), rand(-8, 8)));
          if (c.bounces === 0 && typeof sfx !== 'undefined' && sfx.shell && c.obj.position.distanceToSquared(camera.position) < 36) sfx.shell();
          c.bounces++;
        } else {
          // yere yatar: ekseni yatay kalır, yuvarlanarak durur
          c.rest = true; c.v.set(0, 0, 0);
          c.obj.rotation.x = Math.PI / 2 * (Math.random() < .5 ? 1 : -1); c.obj.rotation.z = 0;
        }
      }
    }
    // birkaç saniye sonra küçülerek kaybolur
    const life = 7;
    if (c.age > life - .6) c.obj.scale.setScalar(Math.max(.01, (life - c.age) / .6));
    if (c.age > life) { c.on = false; c.obj.visible = false; }
  }
}
// yerel oyuncu: silahtan dünyaya kovan. Birinci şahısta silah sahnesindeki kovan ekrandan çıkınca ayak dibine düşer
const CASING_KIND = { uzi: 'pistol', pistol: 'pistol', deagle: 'pistol', usps: 'pistol', glock: 'pistol', m4: 'rifle', ak47: 'rifle', awp: 'rifle', shotgun: 'shotgun' };
const pendingCasings = [];
function playerCasing(w, side = 1) {
  const kind = CASING_KIND[w]; if (!kind) return;
  camVectors();
  const fp = !SETTINGS.thirdPerson;
  const p = eyePos.clone().addScaledVector(rightV, (fp ? .45 : .25) * side).addScaledVector(flatF, fp ? .15 : .45);
  p.y -= fp ? .35 : .15;
  const v = rightV.clone().multiplyScalar(side * rand(1.2, 2)).addScaledVector(flatF, rand(-.3, .3)); v.y = fp ? rand(-.5, .2) : rand(1.5, 2.6);
  if (fp) pendingCasings.push({ t: .3, kind, p, v });   // silah sahnesindeki kovan görüş alanından çıkınca
  else worldCasing(kind, p, v);
}
// diğer oyuncu: kendi konumu ve bakışından
function remoteCasing(pr) {
  const kind = CASING_KIND[pr.w]; if (!kind || kind === 'shotgun') return;
  if (pr.pos.distanceToSquared(camera.position) > 900) return;
  const rx = Math.cos(pr.yaw), rz = -Math.sin(pr.yaw);
  const p = new V3(pr.pos.x + rx * .25 - Math.sin(pr.yaw) * .4, pr.pos.y + 1.0, pr.pos.z + rz * .25 - Math.cos(pr.yaw) * .4);
  worldCasing(kind, p, new V3(rx * rand(1.2, 2), rand(1.5, 2.5), rz * rand(1.2, 2)));
}
function updateBullets(dt) {
  for (let i = pendingCasings.length - 1; i >= 0; i--) {
    const pc = pendingCasings[i]; pc.t -= dt;
    if (pc.t <= 0) { worldCasing(pc.kind, pc.p, pc.v); pendingCasings.splice(i, 1); }
  }
  updateWorldCasings(dt);
}
