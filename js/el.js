'use strict';
/* Anatomik eldivenli el.
   Gerçek el modeli (js/el-veri.js: 25 eklemli iskelet, MIT lisanslı) her silahın kabzasına göre bükülür:
   el kabzaya yerleştirilir, her parmak boğum boğum (kök → orta → uç) kabzaya değene kadar kıvrılır,
   tetik parmağı tetiğe, başparmak kabzanın öbür yanına uzanır. Deri bir kez işlemcide hesaplanır, sonuç sabit bir mesh'tir.
   Kavrama türleri (kabza ekseni elin kökünden geçer; sağ el için anlatım, sol el aynadır):
     'v'  dik kabza (tabanca kabzası; eksen y): avuç sağ arkada, parmaklar önden dolanır, başparmak sol yanda
     'h'  çekiç tutuş (kılıç sapı; eksen z): elin sırtı sağ üstte, parmaklar alttan dolanır, başparmak üstte
     'u'  alttan destek (el kundağı, pompa; eksen z): avuç altta, parmaklar yandan yukarı dolanır, başparmak öbür yanda */

/* ================= MODEL VERİSİ ================= */
const HAND = (() => {
  const dec = (s, T) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
  const d = HAND_DATA, ibm = dec(d.ibm, Float32Array);
  return {
    restP: d.rest.map(r => new V3(r[0], r[1], r[2])),
    restQ: d.rest.map(r => new THREE.Quaternion(r[3], r[4], r[5], r[6])),
    ibm: d.joints.map((_, i) => new THREE.Matrix4().fromArray(ibm, i * 16)),
    pos: dec(d.pos, Float32Array), nor: dec(d.nor, Float32Array), uv: dec(d.uv, Float32Array),
    ji: dec(d.ji, Uint8Array), jw: dec(d.jw, Float32Array), idx: dec(d.idx, Uint16Array),
    J: Object.fromEntries(d.joints.map((n, i) => [n, i])),
  };
})();
const H_FINGERS = ['index', 'middle', 'ring', 'pinky'].map(f => ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'].map(p => HAND.J[f + '-finger-' + p]));
const H_THUMB = ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'].map(p => HAND.J['thumb-' + p]);
const H_WRIST = HAND.J.wrist;
const H_X = new V3(1, 0, 0), H_Y = new V3(0, 1, 0), H_Z = new V3(0, 0, 1);
// boğum kalınlıkları (eldivenli): kök, orta, uç
const H_RAD = [.0098, .0088, .0079];

/* ================= ELDİVEN MALZEMELERİ ================= */
const handNoiseTex = (size, rep, fn) => canvasTex(size, (g, s) => {
  const img = g.createImageData(s, s), d = img.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const v = clamp(fn(x, y), 0, 1) * 255, i = (y * s + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(img, 0, 0);
}, rep, rep, false);
const leatherBump = (() => { const r = []; for (let i = 0; i < 64 * 64; i++) r.push(Math.random()); const at = (x, y) => r[((y + 64) % 64) * 64 + ((x + 64) % 64)];
  return handNoiseTex(64, 6, (x, y) => .5 + ((at(x, y) + at(x + 1, y) + at(x, y + 1) + at(x - 1, y) + at(x, y - 1)) / 5 - .5) * .9); })();
const fabricBump = handNoiseTex(64, 10, (x, y) => .5 + Math.sin((x + y) * Math.PI / 2) * .25 + Math.sin((x - y) * Math.PI / 8) * .12 + (Math.random() - .5) * .1);
// eldiven: köşe renkleri panelleri ayırır (sırt, avuç içi kavrama yüzeyi, parmak uçları)
const handGlove = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .6, metalness: .03, bumpMap: leatherBump, bumpScale: .00018 });
const handCuff = new THREE.MeshStandardMaterial({ color: 0x1d1c1b, roughness: .7, bumpMap: fabricBump, bumpScale: .0006 });
const handStrap = new THREE.MeshStandardMaterial({ color: 0x6a1410, roughness: .55 });
const handLeather = new THREE.MeshStandardMaterial({ color: 0x2f2b27, roughness: .62, bumpMap: leatherBump, bumpScale: .0005 });
const handSleeve = new THREE.MeshStandardMaterial({ color: 0x2e2f2a, roughness: .94, bumpMap: fabricBump, bumpScale: .0016 });
const GLOVE_BACK = new THREE.Color(0x34302b), GLOVE_PALM = new THREE.Color(0x1d1b19), GLOVE_TIP = new THREE.Color(0x262321);
for (const c of [GLOVE_BACK, GLOVE_PALM, GLOVE_TIP]) c.convertSRGBToLinear();

/* ================= POZ: EKLEMLERİN KONUM VE YÖNÜ ================= */
const handPose = () => ({ P: HAND.restP.map(p => p.clone()), Q: HAND.restQ.map(q => q.clone()) });
// zincirin k. ekleminde, eklemin kendi eksenine göre döndürme: k ve sonrası (konumlar k'nın etrafında) döner
function chainRotate(P, Q, k, local, ang) {
  const ax = local.clone().applyQuaternion(Q[k]).normalize(), q = new THREE.Quaternion().setFromAxisAngle(ax, ang);
  for (let j = k; j < P.length; j++) { if (j > k) P[j].sub(P[k]).applyQuaternion(q).add(P[k]); Q[j].premultiply(q); }
}
// zincirin kopyası üzerinde dönüşler (bükme: +açı avuca doğru, yerel X ekseni etrafında)
function chainFK(pose, chain, ops) {
  const P = chain.map(i => pose.P[i].clone()), Q = chain.map(i => pose.Q[i].clone());
  for (const [k, local, ang] of ops) chainRotate(P, Q, k, local, ang);
  return { P, Q };
}
function chainSet(pose, chain, r) { chain.forEach((i, j) => { pose.P[i].copy(r.P[j]); pose.Q[i].copy(r.Q[j]); }); }
// kabzaya batma cezası: zincir noktaları (eklemler ve ara noktalar) eksene R'den yakınsa
function chainPenalty(P, dist, R) {
  let s = 0;
  for (let j = 1; j < P.length; j++) {
    for (const t of [.5, 1]) { const p = P[j - 1].clone().lerp(P[j], t), d = R - dist(p); if (d > 0) s += d * d; }
  }
  return s;
}

/* ================= YERLEŞTİRME ================= */
// el modelinin anatomik çerçevesi: F (bilek → orta parmak kökü), S (serçe → işaret), D (elin sırtı)
const HAND_FRAME = (() => {
  const W = HAND.restP[H_WRIST], M = HAND.restP[H_FINGERS[1][1]], I = HAND.restP[H_FINGERS[0][1]], K = HAND.restP[H_FINGERS[3][1]];
  const F = M.clone().sub(W).normalize(), S0 = I.clone().sub(K).normalize();
  const D = F.clone().cross(S0).normalize(), S = D.clone().cross(F).normalize();
  return { M: M.clone(), F, S, D };
})();
// hedef çerçeveye (F, S yönleri; M orta parmak kökünün yeri) taşıyan katı dönüşüm
function placePose(pose, Ft, St, Mt) {
  const F = Ft.clone().normalize(), D = F.clone().cross(St).normalize(), S = D.clone().cross(F).normalize();
  const src = new THREE.Matrix4().makeBasis(HAND_FRAME.F, HAND_FRAME.S, HAND_FRAME.D);
  const dst = new THREE.Matrix4().makeBasis(F, S, D);
  const R = dst.multiply(src.transpose()), q = new THREE.Quaternion().setFromRotationMatrix(R);
  const t = Mt.clone().sub(HAND_FRAME.M.clone().applyMatrix4(R));
  for (let i = 0; i < pose.P.length; i++) { pose.P[i].applyMatrix4(R).add(t); pose.Q[i].premultiply(q); }
}

/* ================= KAVRAMA ================= */
// her parmak: kök boğum orta boğum kabzaya değene kadar, sonra orta boğum uç boğum değene kadar, sonra uç kıvrılır
function wrapFinger(pose, chain, dist, r, maxs = [1.7, 1.9, 1.35], spread = 0) {
  if (spread) { const c = chainFK(pose, chain, [[1, H_Y, spread]]); chainSet(pose, chain, c); }
  for (let k = 1; k <= 3; k++) {
    const P = chain.map(i => pose.P[i]), Q = chain.map(i => pose.Q[i]);
    const pv = P[k], ax = H_X.clone().applyQuaternion(Q[k]).normalize(), rel = P[k + 1].clone().sub(pv);
    const R = r + H_RAD[k - 1];
    let best = maxs[k - 1];
    for (let a = 0; a <= maxs[k - 1]; a += .012) {
      const q = new THREE.Quaternion().setFromAxisAngle(ax, -a);
      const e = rel.clone().applyQuaternion(q).add(pv), m = rel.clone().multiplyScalar(.5).applyQuaternion(q).add(pv);
      if (dist(e) <= R || dist(m) <= R) { best = Math.max(0, a - .012); break; }
    }
    const c = chainFK(pose, chain, [[k, H_X, -best]]); chainSet(pose, chain, c);
  }
}
// hedefe uzanan parmak (tetik parmağı): kök bükme + yana açma + orta/uç bükme, kabzaya batmadan hedefe en yakın
function reachFinger(pose, chain, target, dist, r) {
  let best = null, bs = Infinity;
  for (let ab = -.35; ab <= .351; ab += .07) for (let f1 = -.3; f1 <= 1.31; f1 += .08) for (let f2 = 0; f2 <= 1.61; f2 += .1) {
    const c = chainFK(pose, chain, [[1, H_Y, ab], [1, H_X, -f1], [2, H_X, -f2], [3, H_X, -f2 * .65]]);
    const s = c.P[4].distanceToSquared(target) + 4 * chainPenalty(c.P.slice(1), dist, r + .0085);
    if (s < bs) { bs = s; best = c; }
  }
  chainSet(pose, chain, best);
}
// başparmak: kökte iki eksenli dönüş (karşıtlık), orta ve uç bükülür; hedefe yaklaşır, kabzaya batmaz
function reachThumb(pose, target, dist, r) {
  const ch = H_THUMB;
  let best = null, bs = Infinity;
  for (let a = -.6; a <= 1.21; a += .1) for (let b = -.9; b <= .91; b += .1) for (let c = 0; c <= 1.21; c += .15) {
    const k = chainFK(pose, ch, [[0, H_X, -a], [0, H_Y, b], [1, H_X, -c], [2, H_X, -c * .9]]);
    const s = k.P[3].distanceToSquared(target) + 6 * chainPenalty(k.P, dist, r + .0095);
    if (s < bs) { bs = s; best = k; }
  }
  chainSet(pose, ch, best);
}

/* ================= DERİ (CPU) ================= */
const _skinM = HAND.ibm.map(() => new THREE.Matrix4()), _one = new V3(1, 1, 1);
// eklem pozuna göre köşeleri ve normalleri hesapla (var olan dizilere yazar)
function skinInto(pose, pos, nor) {
  const n = HAND.pos.length / 3, { pos: P0, nor: N0, ji, jw } = HAND;
  const M = pose.P.map((p, i) => _skinM[i].compose(p, pose.Q[i], _one).multiply(HAND.ibm[i]).elements);
  for (let v = 0; v < n; v++) {
    const px = P0[v * 3], py = P0[v * 3 + 1], pz = P0[v * 3 + 2], nx0 = N0[v * 3], ny0 = N0[v * 3 + 1], nz0 = N0[v * 3 + 2];
    let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 4; k++) {
      const w = jw[v * 4 + k]; if (!w) continue;
      const m = M[ji[v * 4 + k]];
      x += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]); y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]); z += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
      nx += w * (m[0] * nx0 + m[4] * ny0 + m[8] * nz0); ny += w * (m[1] * nx0 + m[5] * ny0 + m[9] * nz0); nz += w * (m[2] * nx0 + m[6] * ny0 + m[10] * nz0);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    nor[v * 3] = nx / l; nor[v * 3 + 1] = ny / l; nor[v * 3 + 2] = nz / l;
  }
}
function skinHandGeo(pose) {
  const n = HAND.pos.length / 3, M = pose.P.map((p, i) => new THREE.Matrix4().compose(p, pose.Q[i], new V3(1, 1, 1)).multiply(HAND.ibm[i]).elements);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const { pos: P0, nor: N0, ji, jw } = HAND;
  // panel renkleri dinlenme pozundaki normalden: avuç içi (elin sırtının tersi) koyu, parmak uçları ayrı
  const D = HAND_FRAME.D, tips = H_FINGERS.map(c => HAND.restP[c[4]]).concat([HAND.restP[H_THUMB[3]]]);
  for (let v = 0; v < n; v++) {
    const px = P0[v * 3], py = P0[v * 3 + 1], pz = P0[v * 3 + 2], nx0 = N0[v * 3], ny0 = N0[v * 3 + 1], nz0 = N0[v * 3 + 2];
    let x = 0, y = 0, z = 0, nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 4; k++) {
      const w = jw[v * 4 + k]; if (!w) continue;
      const m = M[ji[v * 4 + k]];
      x += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]); y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]); z += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
      nx += w * (m[0] * nx0 + m[4] * ny0 + m[8] * nz0); ny += w * (m[1] * nx0 + m[5] * ny0 + m[9] * nz0); nz += w * (m[2] * nx0 + m[6] * ny0 + m[10] * nz0);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    pos.set([x, y, z], v * 3); nor.set([nx / l, ny / l, nz / l], v * 3);
    const volar = -(nx0 * D.x + ny0 * D.y + nz0 * D.z);
    let tipD = 1; for (const t of tips) tipD = Math.min(tipD, Math.hypot(px - t.x, py - t.y, pz - t.z));
    const c = tipD < .02 ? GLOVE_TIP : volar > .35 ? GLOVE_PALM : GLOVE_BACK;
    col.set([c.r, c.g, c.b], v * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(HAND.uv, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(HAND.idx, 1));
  geo.computeBoundingSphere();
  return geo;
}

/* ================= KOL ================= */
// bilekten dirseğe kumaş kol, bilekte büzgüler; eldiven bileği ve cırt cırtlı bant
function handArm(parent, wrist, armDir) {
  const q = new THREE.Quaternion().setFromUnitVectors(UP, armDir), parts = [];
  const lathe = (pts, mat, seg = 20) => { const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, d]) => new THREE.Vector2(r, d)), seg), mat); m.position.copy(wrist); m.quaternion.copy(q); parent.add(m); parts.push(m); return m; };
  lathe([[0, -.012], [.024, -.011], [.0285, -.004], [.03, .008], [.0315, .03], [.029, .036], [0, .036]], handLeather);
  lathe([[.0316, .01], [.0334, .012], [.0334, .027], [.0316, .029]], handCuff);
  lathe([[.0335, .017], [.034, .018], [.034, .021], [.0335, .022]], handStrap);
  lathe([[0, .03], [.031, .031], [.0365, .035], [.0395, .045], [.0375, .055], [.041, .068], [.0385, .081], [.0415, .096], [.04, .114], [.0425, .137], [.0435, .18], [.0445, .24], [.0458, .3], [.047, .36], [.0472, .44]], handSleeve, 22);
  return parts;
}

/* ================= ANA KURUCU ================= */
// opts: grip ('v' | 'h' | 'u'), r (kabza yarıçapı), trigger, rake, arm (önkol yönü, el uzayında)
function createTacticalHand(isLeft = false, opts = {}) {
  const grip = opts.grip || 'v', r = opts.r || .026, trigger = opts.trigger ?? (grip === 'v' && !isLeft);
  const out = new THREE.Group(), g = new THREE.Group(); out.add(g);
  if (isLeft) g.scale.x = -1;
  const pose = handPose();
  const dist = grip === 'v' ? p => Math.hypot(p.x, p.z) : p => Math.hypot(p.x, p.y);
  let thumbT, armDir;
  if (grip === 'v') {
    const F = new V3(.25, -.12, -1).normalize(), S = new V3(0, 1, 0);
    const D = F.clone().cross(S).normalize();
    placePose(pose, F, S, D.clone().multiplyScalar(r + .0125).addScaledVector(F, r * .5).add(new V3(0, .007, 0)));
    thumbT = new V3(-(r + .009) * .92, .021, -(r + .009) * .4);
    armDir = new V3(.06, -.42, 1);
  } else {
    // eksen z: φ elin sırtının kesitteki yönü, ψ parmak kökü çizgisinin kabzaya göre çaprazlığı
    const phi = grip === 'h' ? .55 : -1.3, psi = grip === 'h' ? .5 : .62;
    const F0 = new V3(Math.sin(phi), -Math.cos(phi), 0), S0 = new V3(0, 0, -1);
    const F = F0.clone().multiplyScalar(Math.cos(psi)).addScaledVector(S0, Math.sin(psi));
    const S = S0.clone().multiplyScalar(Math.cos(psi)).addScaledVector(F0, -Math.sin(psi));
    const D = new V3(Math.cos(phi), Math.sin(phi), 0);
    placePose(pose, F, S, D.clone().multiplyScalar(r + .0125).addScaledVector(F0, r * .45));
    thumbT = grip === 'h' ? new V3(-(r + .009) * .55, (r + .009) * .83, -.04) : new V3(r + .009, .006, -.05);
    armDir = grip === 'h' ? new V3(.14, -.24, 1) : new V3(.12, -.32, 1);
  }
  if (opts.arm) armDir = opts.arm.clone();
  armDir.normalize();
  // parmaklar: işaret parmağı tetikteyse hedefe uzanır, diğerleri kabzaya sarılır (serçe biraz içe döner)
  H_FINGERS.forEach((ch, i) => {
    if (i === 0 && trigger) {
      const rk = opts.rake || 0, fwd = new V3(0, Math.sin(rk), -Math.cos(rk));
      reachFinger(pose, ch, new V3(-.002, .014, 0).addScaledVector(fwd, r + .046), dist, r);
    } else wrapFinger(pose, ch, dist, r, undefined, [0, 0, -.04, -.1][i]);
  });
  reachThumb(pose, thumbT, dist, r);
  // bileği önkola doğru biraz çevir (kol ağzıyla el arasındaki kırık yumuşasın)
  {
    const wq = pose.Q[H_WRIST], cur = H_Z.clone().applyQuaternion(wq);
    const full = new THREE.Quaternion().setFromUnitVectors(cur, armDir);
    wq.premultiply(new THREE.Quaternion().slerp(full, .45));
  }
  const mesh = new THREE.Mesh(skinHandGeo(pose), handGlove);
  g.add(mesh);
  // canlı el: temel poz saklanır, her karede küçük parmak hareketleri üstüne eklenip deri yeniden hesaplanır (animateHand)
  out.userData.hand = {
    base: { P: pose.P.map(p => p.clone()), Q: pose.Q.map(q => q.clone()) },
    work: { P: pose.P.map(p => p.clone()), Q: pose.Q.map(q => q.clone()) },
    mesh, trigger, grip, phase: rand(0, 100), regripT: rand(3, 9), regrip: 0, lastSig: '',
  };
  const wristP = pose.P[H_WRIST].clone().addScaledVector(armDir, .012);
  out.userData.arm = { parts: handArm(g, wristP, armDir), g, wrist: wristP, base: armDir.clone(), left: isLeft, dir: armDir.clone() };
  return out;
}

/* ================= CANLI EL ================= */
// Elin temel kavrayışına küçük, sürekli hareketler eklenir:
//   nefes gibi hafif parmak oynaması, ara sıra kabzayı gevşetip yeniden kavrama, başparmak kıpırtısı,
//   atışta tetik parmağının tetiği çekip bırakması, geri tepmede kabzayı sıkma.
// st: { pull: 0..1 tetik çekme, squeeze: 0..1 sıkma, relax: 0..1 gevşeklik (koşarken),
//       release: 0..1 parmakları aç (bıçak çevirirken sap geçsin), extend: 0..1 işaret parmağını uzat (karambit halkası) }
const _ops = [[1, H_X, 0], [2, H_X, 0], [3, H_X, 0]];
function animateHand(h, dt, t, st) {
  h.acc = (h.acc || 0) + dt;
  // boştayken 30 Hz yeter; tetik çekilirken / sıkarken her kare
  if (st.pull < .01 && st.squeeze < .01 && !st.release && !st.extend && h.regrip <= 0 && h.acc < 1 / 30) return;
  dt = h.acc; h.acc = 0;
  h.regripT -= dt;
  if (h.regripT <= 0) { h.regrip = 1; h.regripT = rand(4, 10); }
  const open = h.regrip > 0 ? Math.sin((1 - h.regrip) * Math.PI) : 0;   // 0 → 1 → 0: gevşet ve yeniden kavra
  h.regrip = Math.max(0, h.regrip - dt * 2.6);
  const w = h.work, b = h.base;
  for (let i = 0; i < w.P.length; i++) { w.P[i].copy(b.P[i]); w.Q[i].copy(b.Q[i]); }
  H_FINGERS.forEach((ch, i) => {
    const trig = i === 0 && h.trigger;
    const idle = Math.sin(t * (1.1 + i * .23) + h.phase + i * 1.7) * .022 + Math.sin(t * .37 + h.phase * 2 + i) * .015;
    let d;
    const rel = st.release || 0, ext = i === 0 ? st.extend || 0 : 0;
    if (trig) {
      // tetik parmağı: çekince orta ve uç boğum kıvrılır, kök biraz iner
      const p = st.pull;
      d = [p * .16 + idle * .5, p * .42 + idle, p * .3];
    } else if (ext > 0) {
      // işaret parmağı öne uzanır (karambit halkası parmakta döner)
      d = [-ext * .9 + idle * .3, -ext * 1.25, -ext * .7];
    } else {
      const s = st.squeeze * .05 - open * .2 - st.relax * .1 - rel * .85 + idle;
      d = [s, s * 1.2, s * .8];
    }
    if (Math.abs(d[0]) + Math.abs(d[1]) + Math.abs(d[2]) < 1e-4) return;
    const P = ch.map(j => w.P[j]), Q = ch.map(j => w.Q[j]);
    chainRotate(P, Q, 1, H_X, -d[0]); chainRotate(P, Q, 2, H_X, -d[1]); chainRotate(P, Q, 3, H_X, -d[2]);
  });
  // başparmak: hafif kıpırtı, yeniden kavrarken biraz açılır
  {
    const th = Math.sin(t * .9 + h.phase * 3) * .03 - open * .12 + st.squeeze * .03 - (st.release || 0) * .45;
    const P = H_THUMB.map(j => w.P[j]), Q = H_THUMB.map(j => w.Q[j]);
    chainRotate(P, Q, 1, H_X, -th); chainRotate(P, Q, 2, H_X, -th * .8);
  }
  const geo = h.mesh.geometry;
  skinInto(w, geo.attributes.position.array, geo.attributes.normal.array);
  geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
}
// bir silah kökündeki eller (bir kez bulunur, saklanır)
function handsOf(root) {
  if (!root.userData.hands) { const list = []; root.traverse(o => { if (o.userData && o.userData.hand) list.push(o); }); root.userData.hands = list; }
  return root.userData.hands;
}

/* ================= OMZA BAĞLI ÖNKOL ================= */
// Önkol silaha sabit değil: her karede bilekten kameranın altındaki omuz noktasına doğru döner.
// Silah ne kadar dönerse dönsün sol kol soldan, sağ kol sağdan gelir. Ani kırılmayı önlemek için temel yönden
// en fazla ~80° sapar ve yumuşakça izler. Silah sahnesi kamera uzayıdır (kamera başlangıçta, -z'ye bakar).
const SHOULDER = { L: new V3(-.26, -.58, .2), R: new V3(.22, -.58, .2) };
const _ad = new V3(), _aw = new V3(), _aq = new THREE.Quaternion();
function aimArm(out, dt) {
  const A = out.userData.arm; if (!A) return;
  A.g.updateMatrixWorld(true);
  _aw.copy(A.left ? SHOULDER.L : SHOULDER.R);
  A.g.worldToLocal(_aw);                                   // omuz noktası elin kendi uzayında (sol elde aynalı)
  _ad.copy(_aw).sub(A.wrist).normalize();
  // temel yönden en fazla 80° sap
  const ang = _ad.angleTo(A.base), max = 1.4;
  if (ang > max) _ad.copy(A.base).lerp(_ad, max / ang).normalize();
  A.dir.lerp(_ad, Math.min(1, dt * 14)).normalize();
  _aq.setFromUnitVectors(UP, A.dir);
  for (const m of A.parts) m.quaternion.copy(_aq);
}
