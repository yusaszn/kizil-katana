'use strict';
/* Silah yapım takımı: gerçekçi silah modelleri için ortak malzemeler ve parça üreticileri.
   - Malzemeler: fosfatlı çelik, eloksallı alüminyum, dokulu polimer, damarlı ahşap, kauçuk, pirinç, krom, mercek
   - GK.prof: yandan çizilen profil (z, y) silah genişliği kadar kalınlaştırılır (gövde, kabza, dipçik, kızak)
   - GK.lathe: (yarıçap, z) profili z ekseni etrafında döndürülür (namlu, susturucu, dürbün, roket)
   - GK.rail: Picatinny ray, GK.tube: z ekseninde silindir, GK.rbox: köşeleri yuvarlatılmış kutu
   Profillerde nokta [z, y, r]: r verilirse o köşe r yarıçapıyla yuvarlatılır. Silahın ön tarafı -z yönüdür. */

const GK = {};

/* ================= DOKULAR ================= */
// gri tonlu gürültü (kabartma / pürüzlülük haritası için): fn(x, y, rnd) → 0..1
function gkTex(size, rx, ry, fn, srgb = false) {
  return canvasTex(size, (g, s) => {
    const img = g.createImageData(s, s), d = img.data;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = fn(x, y, s);
      const i = (y * s + x) * 4;
      if (Array.isArray(v)) { d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; }
      else { const c = clamp(v, 0, 1) * 255; d[i] = d[i + 1] = d[i + 2] = c; }
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }, rx, ry, srgb);
}
// tekrarlanabilir değer gürültüsü (döşemede dikiş görünmesin)
function gkValueNoise(s, cell, seed) {
  const n = Math.ceil(s / cell), grid = [];
  let r = seed;
  const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < n * n; i++) grid.push(rnd());
  const at = (x, y) => grid[((y % n + n) % n) * n + ((x % n + n) % n)];
  return (x, y) => {
    const fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}
// fosfat kaplama: ince taneli mat yüzey
const gkGrainTex = (() => { const n1 = gkValueNoise(128, 4, 7), n2 = gkValueNoise(128, 16, 11); return gkTex(128, 6, 6, (x, y) => .5 + (n1(x, y) - .5) * .35 + (n2(x, y) - .5) * .3); })();
// kabza tırtığı: sık nokta deseni
const gkStippleTex = (() => { const n = gkValueNoise(64, 2, 23); return gkTex(64, 24, 24, (x, y) => .5 + (n(x, y) - .5) * .9); })();
// ahşap (ceviz): ince, boyuna paralel damarlar; yer yer koyulaşan halkalar ve gözenek
const gkWoodTex = (() => {
  const n = gkValueNoise(256, 64, 3), m = gkValueNoise(256, 6, 5), k = gkValueNoise(256, 24, 9);
  return gkTex(256, 4, 2, (x, y) => {
    const w = Math.sin((y + n(x, y) * 9) * .55 + m(x, y) * 1.4) * .5 + .5;
    const ring = Math.pow(w, 5) * .38 + (k(x, y) - .5) * .3;
    const base = [104, 62, 36], dark = [46, 24, 12];
    const f = clamp(.28 + ring + (Math.random() - .5) * .07, 0, 1);
    return base.map((c, i) => c + (dark[i] - c) * f);
  }, true);
})();
const gkWoodBump = (() => { const n = gkValueNoise(256, 64, 3); return gkTex(256, 4, 2, (x, y) => .5 + Math.sin((y + n(x, y) * 9) * .55) * .2 + (Math.random() - .5) * .12); })();
// eloksal / boya aşınması: kenarlarda parlayan lekeler (pürüzlülük)
const gkWearTex = (() => { const n = gkValueNoise(128, 12, 19); return gkTex(128, 4, 4, (x, y) => .95 + (n(x, y) - .5) * .3); })();

/* ================= MALZEMELER ================= */
// envI: silah sahnesindeki stüdyo yansımasının şiddeti (matlar düşük, parlak metaller yüksek)
const gkStd = (color, metalness, roughness, extra = {}, envI = .45) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color, metalness, roughness, envMap: envTex }, extra)); m.userData.envI = envI; return m; };
GK.steel = gkStd(0x2a2c2f, .7, .44, { bumpMap: gkGrainTex, bumpScale: .0005, roughnessMap: gkWearTex }, .5);   // fosfatlı çelik (namlu, sürgü, pimler)
GK.black = gkStd(0x161719, .45, .5, { bumpMap: gkGrainTex, bumpScale: .0004, roughnessMap: gkWearTex }, .3);   // eloksallı siyah alüminyum gövde
GK.dark = gkStd(0x121214, .5, .55, { bumpMap: gkGrainTex, bumpScale: .0003 }, .25);                              // en koyu parçalar
GK.poly = gkStd(0x1f2023, .05, .72, { bumpMap: gkGrainTex, bumpScale: .0003 }, .25);                             // polimer (kabza, kundak)
GK.grip = gkStd(0x1b1c1e, .05, .85, { bumpMap: gkStippleTex, bumpScale: .0004 }, .2);                            // tırtıklı kabza yüzeyi
GK.fde = gkStd(0x7d6a4f, .08, .78, { bumpMap: gkGrainTex, bumpScale: .0003 }, .3);                              // çöl rengi (FDE) polimer
GK.od = gkStd(0x46502f, .15, .7, { bumpMap: gkGrainTex, bumpScale: .0003, roughnessMap: gkWearTex }, .3);       // haki askeri boya
GK.sniper = gkStd(0x3b4a2e, .1, .74, { bumpMap: gkStippleTex, bumpScale: .0008 }, .25);                           // keskin nişancı dipçiği
GK.wood = gkStd(0xffffff, 0, .5, { map: gkWoodTex, bumpMap: gkWoodBump, bumpScale: .0005 }, .35);
GK.woodDark = gkStd(0x8a7466, 0, .55, { map: gkWoodTex, bumpMap: gkWoodBump, bumpScale: .0005 }, .3);
GK.rubber = gkStd(0x111111, 0, .95, { bumpMap: gkStippleTex, bumpScale: .0008 }, .15);
GK.brass = gkStd(0xc9a24c, .9, .3, {}, .9);
GK.chrome = gkStd(0x868a92, .85, .28, { bumpMap: gkGrainTex, bumpScale: .0002 }, .75);
GK.red = gkStd(0x9a1a12, .1, .5, {}, .3);
GK.blued = gkStd(0x1b1e22, .58, .4, { bumpMap: gkGrainTex, bumpScale: .0004, roughnessMap: gkWearTex }, .4);     // maviye çalan karartılmış çelik (AK gövdesi)
GK.bakelite = gkStd(0x5a2616, .05, .42, { bumpMap: gkGrainTex, bumpScale: .0003 }, .45);                            // kızıl-kahve bakalit (AK kabzası / şarjörü)
GK.white = gkStd(0xe8e4dc, 0, .5, {}, .2);                                                                              // nişangah noktaları
GK.blackDS = gkStd(0x161719, .45, .5, { side: THREE.DoubleSide }, .3);                                              // açık uçlu borular (arpacık kalkanı)
GK.shell = gkStd(0x8e1610, .05, .45, {}, .35);                                                                            // pompalı fişeği gövdesi
GK.grenade = gkStd(0x5d6238, .3, .5, {}, .4);                                                                            // 40 mm bomba başlığı
GK.lens = gkStd(0x0b1622, .9, .05, {}, 1.4);
GK.hole = new THREE.MeshBasicMaterial({ color: 0x030303 });
GK.glowRed = new THREE.MeshBasicMaterial({ color: 0xff4a1a });
GK.glowGreen = new THREE.MeshBasicMaterial({ color: 0x8aff3a });
GK.tritium = new THREE.MeshBasicMaterial({ color: 0x9dff6a });   // gece nişangahı noktaları

/* ================= GEOMETRİ ================= */
// köşeleri yuvarlatılmış çokgen yolu: noktalar [x, y, r]
function gkTrace(path, pts) {
  const n = pts.length, at = i => pts[(i + n) % n];
  for (let i = 0; i < n; i++) {
    const [x, y, r = 0] = at(i);
    if (!r) { i ? path.lineTo(x, y) : path.moveTo(x, y); continue; }
    const [px, py] = at(i - 1), [nx, ny] = at(i + 1);
    const d1 = Math.hypot(px - x, py - y) || 1, d2 = Math.hypot(nx - x, ny - y) || 1;
    const r1 = Math.min(r, d1 / 2), r2 = Math.min(r, d2 / 2);
    const ax = x + (px - x) / d1 * r1, ay = y + (py - y) / d1 * r1;
    i ? path.lineTo(ax, ay) : path.moveTo(ax, ay);
    path.quadraticCurveTo(x, y, x + (nx - x) / d2 * r2, y + (ny - y) / d2 * r2);
  }
  return path;
}
GK.shape = (pts, holes = []) => {
  const s = gkTrace(new THREE.Shape(), pts);
  for (const h of holes) s.holes.push(gkTrace(new THREE.Path(), h));
  return s;
};
// yan profil → x ekseninde w kalınlığında katı parça; z = şeklin x'i, y = şeklin y'si. Kenarlar pahlanır.
GK.profGeo = (pts, w, { holes = [], bevel, seg = 2 } = {}) => {
  const b = bevel !== undefined ? bevel : Math.min(.003, w * .18);
  const depth = Math.max(.0004, w - 2 * b);
  const geo = new THREE.ExtrudeGeometry(GK.shape(pts, holes), { depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: seg, curveSegments: 10 });
  geo.rotateY(-Math.PI / 2);          // şeklin x'i → +z, kalınlık → -x
  geo.translate(depth / 2, 0, 0);     // x'te ortala
  return geo;
};
GK.mesh = (geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  if (parent) parent.add(m);
  return m;
};
GK.prof = (parent, mat, pts, w, x = 0, opts) => GK.mesh(GK.profGeo(pts, w, opts), mat, parent, x);
// torna: profil [yarıçap, z]; z ekseni etrafında döner
GK.latheGeo = (pts, seg = 24) => {
  let p = pts.map(([r, z]) => new THREE.Vector2(Math.max(0, r), z));
  if (p[0].y > p[p.length - 1].y) p = p.reverse();
  const geo = new THREE.LatheGeometry(p, seg);
  geo.rotateX(Math.PI / 2);           // torna ekseni y → z
  return geo;
};
GK.lathe = (parent, mat, pts, x = 0, y = 0, seg) => GK.mesh(GK.latheGeo(pts, seg), mat, parent, x, y, 0);
// z ekseninde silindir (merkez: x, y, z)
GK.tubeGeo = (r, len, seg = 16, r2 = r) => { const g = new THREE.CylinderGeometry(r2, r, len, seg); g.rotateX(Math.PI / 2); return g; };
GK.tube = (parent, mat, r, len, x, y, z, seg, r2) => GK.mesh(GK.tubeGeo(r, len, seg, r2), mat, parent, x, y, z);
// x ekseninde silindir (pim, vida, düğme)
GK.pin = (parent, mat, r, len, x, y, z, seg = 10) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); return GK.mesh(g, mat, parent, x, y, z); };
// köşeleri yuvarlatılmış kutu: önden kesit (w × h, köşe r), z boyunca d uzunluğunda, merkezde
GK.rboxGeo = (w, h, d, r = Math.min(w, h) * .25) => {
  const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r;
  s.moveTo(-x, -h / 2); s.lineTo(x, -h / 2); s.absarc(x, -y, r, -Math.PI / 2, 0, false);
  s.lineTo(w / 2, y); s.absarc(x, y, r, 0, Math.PI / 2, false);
  s.lineTo(-x, h / 2); s.absarc(-x, y, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-w / 2, -y); s.absarc(-x, -y, r, Math.PI, Math.PI * 1.5, false);
  const b = Math.min(.002, d * .1);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: 6 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  return g;
};
GK.rbox = (parent, mat, w, h, d, x, y, z, r, rx = 0) => GK.mesh(GK.rboxGeo(w, h, d, r), mat, parent, x, y, z, rx);
GK.box = (parent, mat, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => GK.mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z, rx, ry, rz);
// Picatinny ray: z0'dan z1'e (z0 < z1), tabanı y'de, w genişliğinde; üstünde enine yuvalar
GK.railGeo = (z0, z1, w = .02, h = .009, pitch = .01) => {
  const pts = [[z0, 0], [z1, 0], [z1, h * .55]];
  const n = Math.max(1, Math.floor((z1 - z0 - pitch * .5) / pitch));
  const start = z1 - (z1 - z0 - n * pitch) / 2;
  pts.push([start, h * .55]);
  for (let i = 0; i < n; i++) {
    const a = start - i * pitch;
    pts.push([a, h], [a - pitch * .55, h], [a - pitch * .55, h * .55], [a - pitch, h * .55]);
  }
  pts.push([z0, h * .55]);
  return GK.profGeo(pts, w, { bevel: .0008, seg: 1 });
};
GK.rail = (parent, mat, z0, z1, y, w, h, x = 0) => GK.mesh(GK.railGeo(z0, z1, w, h), mat, parent, x, y, 0);
// silah ağzı: siyah namlu deliği (namlu ucunda, yarıçap r)
GK.bore = (parent, r, y, z, x = 0) => { const m = GK.mesh(new THREE.CircleGeometry(r, 14), GK.hole, parent, x, y, z - .0005); m.rotation.y = Math.PI; return m; };
// iki yanında vida başları
GK.screws = (parent, mat, w, list, r = .0035) => { for (const [y, z] of list) for (const s of [-1, 1]) GK.pin(parent, mat, r, .003, s * (w / 2 + .001), y, z, 8); };
// tetik: korkuluk içinde öne kıvrık dil
GK.trigger = (parent, mat, y, z) => GK.prof(parent, mat, [[z - .004, y], [z + .004, y], [z + .002, y - .012], [z - .004, y - .024, .003], [z - .009, y - .026], [z - .005, y - .012]], .006, 0, { bevel: .001 });
// tetik korkuluğu: z0 önde, z1 arkada, üst y0, alt y1
GK.guard = (parent, mat, z0, z1, y0, y1, w = .012, t = .006) => GK.prof(parent, mat,
  [[z0, y0], [z0 - .002, y1, .008], [z1, y1, .004], [z1, y0]], w, 0,
  { holes: [[[z0 + t, y0 - .001], [z0 + t - .001, y1 + t, .006], [z1 - t * .6, y1 + t, .004], [z1 - t * .6, y0 - .001]]], bevel: .0015 });
// önden görünen levha: şekil (x, y) düzleminde, z boyunca d kalınlığında, merkezde (gez, kapak, plaka)
GK.plateGeo = (pts, d, { holes = [], bevel } = {}) => {
  const b = bevel !== undefined ? bevel : Math.min(.0012, d * .2), depth = Math.max(.0004, d - 2 * b);
  const g = new THREE.ExtrudeGeometry(GK.shape(pts, holes), { depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: 1, curveSegments: 12 });
  g.translate(0, 0, -depth / 2);
  return g;
};
GK.plate = (parent, mat, pts, d, x, y, z, opts) => GK.mesh(GK.plateGeo(pts, d, opts), mat, parent, x, y, z);
// daire noktaları (delik için)
GK.circle = (cx, cy, r, n = 16) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
// alev sprite'ı
GK.flash = (parent, y, z, col = 0xffc060) => {
  const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  f.position.set(0, y, z); f.visible = false; parent.add(f); return f;
};
// iki nokta arasında çubuk (kurma kolu, sürgü kolu, çatal ayağı)
GK.rod = (parent, mat, a, b, r, seg = 8) => {
  const A = new V3(...a), Bv = new V3(...b), d = Bv.clone().sub(A), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
  m.position.copy(A).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(UP, d.normalize());
  parent.add(m); return m;
};
// tepesi açık halka bant (AK arpacık kalkanı): z ekseninde, gap üstte
GK.hood = (parent, mat, r, w, x, y, z, gap = 1.1) => {
  const g = new THREE.CylinderGeometry(r, r, w, 18, 1, true, Math.PI + gap / 2, Math.PI * 2 - gap);
  g.rotateX(Math.PI / 2);
  return GK.mesh(g, mat, parent, x, y, z);
};
// yay boyunca bant (kavisli şarjör): merkez (zc, yc), iç yarıçap r0, dış r1, açı a0 → a1 (0 = +z yönü, artan açı aşağı)
GK.arcPts = (zc, yc, r0, r1, a0, a1, n = 10) => {
  const o = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([zc + Math.cos(a) * r1, yc - Math.sin(a) * r1]); }
  for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n; o.push([zc + Math.cos(a) * r0, yc - Math.sin(a) * r0]); }
  return o;
};
