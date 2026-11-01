'use strict';
/* Lobi mekânları: odadakiler maç öncesi burada buluşur, dolaşır, oturur, sohbet eder (lobi.js).
   - kamp: gece, orman açıklığı. Ortada çıtırdayan kamp ateşi (kıvılcım, duman), çevresinde kütük banklar, kamp
     sandalyeleri ve kütükler; çadırlar, fenerli piknik masası, ay ışığı vuran göl, ateş böcekleri, yıldızlar
   - ev: karlı dağda ahşap ev. Şömine, kilim, koltuklar, bar ve taburelar, kart masası, kitaplık, pencerelerden yağan kar
   Haritalar MAPS'e eklenir, world.js buildMap kurar. Oturulacak yerler: venue.seats [{x, z, y: oturak yüksekliği, yaw}] */

const VENUE_NAMES = { kamp: 'ORMAN KAMPI', ev: 'DAĞ EVİ' };
const venue = { fx: [], seats: [], board: null, fire: null };
const isVenue = id => !!(MAPS[id] && MAPS[id].lobby);

/* ================= DOKULAR ================= */
// kenarda kesilmesin diye yamalar dört yana sarılarak çizilir (döşenince dikiş görünmez)
function wrapBlob(g, s, x, y, r, col) {
  for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
    const cx = x + ox, cy = y + oy; if (cx + r < 0 || cx - r > s || cy + r < 0 || cy - r > s) continue;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}
const forestTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#2a2316'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) wrapBlob(g, s, Math.random() * s, Math.random() * s, 8 + Math.random() * 26, Math.random() < .55 ? 'rgba(48,64,24,.6)' : 'rgba(78,58,34,.55)');
  for (let i = 0; i < 1500; i++) {   // çam iğneleri
    const x = Math.random() * s, y = Math.random() * s, a = Math.random() * 7, l = 3 + Math.random() * 6;
    g.strokeStyle = `rgba(${130 + Math.random() * 60 | 0},${84 + Math.random() * 40 | 0},${40 + Math.random() * 20 | 0},${.2 + Math.random() * .35})`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 110; i++) { g.fillStyle = `rgba(${90 + Math.random() * 80 | 0},${36 + Math.random() * 34 | 0},18,.55)`; g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 1 + Math.random() * 2, Math.random() * 3, 0, 7); g.fill(); }
  grain(g, s, 2500, .25);
}, 10, 10);
const barkTex = canvasTex(128, (g, s) => {
  g.fillStyle = '#3d2c1d'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${18 + Math.random() * 30 | 0},${12 + Math.random() * 20 | 0},8,.55)`; g.fillRect(Math.random() * s, 0, 1 + Math.random() * 3, s); }
  for (let i = 0; i < 45; i++) { g.fillStyle = 'rgba(105,84,62,.3)'; g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 6 + Math.random() * 16); }
  grain(g, s, 700, .2);
}, 1, 2);
const plankTex = canvasTex(256, (g, s) => {
  const n = 6, h = s / n;
  for (let i = 0; i < n; i++) {
    const c = [112, 74, 44].map(v => v + (Math.random() * 26 - 13 | 0));
    g.fillStyle = `rgb(${c})`; g.fillRect(0, i * h, s, h);
    for (let k = 0; k < 16; k++) {
      g.strokeStyle = `rgba(58,34,16,${.1 + Math.random() * .22})`; g.lineWidth = 1;
      const y = i * h + 3 + Math.random() * (h - 6); g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * .05 + k) * 1.4);
      g.stroke();
    }
    g.fillStyle = 'rgba(28,16,8,.85)'; g.fillRect(((i % 2) * .5 + Math.random() * .2) * s, i * h, 2, h);
    g.fillStyle = 'rgba(22,12,6,.95)'; g.fillRect(0, i * h, s, 2);
  }
  grain(g, s, 1500, .14);
}, 36, 36);   // döşeme tahtası ~20 cm
const logWallTex = canvasTex(256, (g, s) => {
  const n = 5, h = s / n;
  for (let i = 0; i < n; i++) {
    const gr = g.createLinearGradient(0, i * h, 0, (i + 1) * h);
    gr.addColorStop(0, '#2e1c10'); gr.addColorStop(.16, '#7c5130'); gr.addColorStop(.5, '#96643a'); gr.addColorStop(.86, '#5e3b20'); gr.addColorStop(1, '#22140a');
    g.fillStyle = gr; g.fillRect(0, i * h, s, h);
    for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(48,28,14,${.15 + Math.random() * .2})`; g.beginPath(); const y = i * h + 5 + Math.random() * (h - 10); g.moveTo(0, y); g.bezierCurveTo(s * .3, y + 3, s * .6, y - 3, s, y); g.stroke(); }
  }
  grain(g, s, 1200, .14);
}, 4, 2);
const fabricTex = canvasTex(64, (g, s) => {
  g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < s; i += 2) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, s / 2 - 1, s, 2);
}, 2, 2);
const kilimTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#7c1b12'; g.fillRect(0, 0, s, s);
  const band = (o, c, w = 8) => { g.strokeStyle = c; g.lineWidth = w; g.strokeRect(o, o, s - 2 * o, s - 2 * o); };
  band(8, '#e6d2a8'); band(20, '#1d2b4c'); band(30, '#c8782a', 5);
  const dia = (cx, cy, r, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(cx, cy - r); g.lineTo(cx + r * .7, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r * .7, cy); g.closePath(); g.fill(); };
  for (const cy of [s * .27, s * .5, s * .73]) { dia(s / 2, cy, 34, '#e6d2a8'); dia(s / 2, cy, 26, '#1d2b4c'); dia(s / 2, cy, 17, '#c8782a'); dia(s / 2, cy, 7, '#e6d2a8'); }
  for (let y = 52; y < s - 44; y += 20) { dia(62, y, 7, '#e6d2a8'); dia(s - 62, y, 7, '#e6d2a8'); dia(62, y, 3, '#1d2b4c'); dia(s - 62, y, 3, '#1d2b4c'); }
  grain(g, s, 2500, .16);
}, 1, 1);
const nightWinTex = canvasTex(256, (g, s) => {
  const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#0a1430'); gr.addColorStop(.62, '#2a3a5e'); gr.addColorStop(.63, '#c8d4e8'); gr.addColorStop(1, '#8a9ab8');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .8})`; g.fillRect(Math.random() * s, Math.random() * s * .55, 1, 1); }
  g.fillStyle = '#f2efe0'; g.beginPath(); g.arc(s * .74, s * .2, 11, 0, 7); g.fill();
  g.fillStyle = '#0c1424';
  for (let x = -10; x < s + 10; x += 14 + Math.random() * 10) { const h = 30 + Math.random() * 50, b = s * .66; g.beginPath(); g.moveTo(x, b - h); g.lineTo(x + 13, b); g.lineTo(x - 13, b); g.fill(); }
}, 1, 1);
const snowTex = canvasTex(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${.5 + Math.random() * .5})`; g.beginPath(); g.arc(Math.random() * s, Math.random() * s, .6 + Math.random() * 1.4, 0, 7); g.fill(); }
}, 2, 2, false);
const flameTex = canvasTex(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  const gr = g.createRadialGradient(s / 2, s * .78, 2, s / 2, s * .64, s * .5);
  gr.addColorStop(0, 'rgba(255,250,225,1)'); gr.addColorStop(.25, 'rgba(255,205,95,.95)'); gr.addColorStop(.55, 'rgba(255,110,30,.6)'); gr.addColorStop(1, 'rgba(255,50,10,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(s / 2, s * .03);
  g.bezierCurveTo(s * .8, s * .4, s * .92, s * .72, s / 2, s * .98); g.bezierCurveTo(s * .08, s * .72, s * .2, s * .4, s / 2, s * .03); g.fill();
}, 1, 1, false);

/* ================= MALZEMELER ================= */
const vStd = (color, roughness = .85, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness, metalness: 0 }, extra));
const VM = {
  bark: vStd(0xffffff, .95, { map: barkTex }), char: vStd(0x2a1e16, .9, { map: barkTex }), wood: vStd(0x7a4c28, .7), darkWood: vStd(0x3a2212, .55),
  plank: vStd(0xffffff, .75, { map: plankTex }), logWall: vStd(0xffffff, .85, { map: logWallTex }), stone: vStd(0x8c867c, .95, { map: stoneTex }),
  pine: vStd(0xffffff, .9, { flatShading: true }), metal: vStd(0x2a2c30, .45, { metalness: .6 }), ash: vStd(0x1c1916, 1),
  ember: new THREE.MeshBasicMaterial({ color: 0xff5a14 }), bulb: new THREE.MeshBasicMaterial({ color: 0xffe0a8 }),
  water: vStd(0x06101c, .06, { metalness: .5 }), board: vStd(0x5a3a22, .8), sofa: vStd(0x5e2420, .95), leather: vStd(0x4a2814, .55),
  rug: vStd(0xffffff, .95, { map: kilimTex }), win: new THREE.MeshBasicMaterial({ map: nightWinTex }), snow: new THREE.MeshBasicMaterial({ map: snowTex, transparent: true, depthWrite: false }),
};
const tentMat = c => vStd(c, .9, { map: fabricTex, side: THREE.DoubleSide });

/* ================= YARDIMCILAR ================= */
const vMesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = mapMesh(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); return m; };
const vSolid = (w, h, d, x, y, z) => addBlock(w, h, d, x, y, z, null, true, true);
function seatAt(x, y, z, fx, fz) { venue.seats.push({ x, y, z, yaw: Math.atan2(-fx, -fz) }); }   // f: oturanın baktığı yön
let vSeed = 1;
const vRng = () => (vSeed = (vSeed * 16807) % 2147483647) / 2147483647;   // herkes aynı ormanı görsün
// yatay kütük: eksen x ya da z boyunca
function logAlong(x, y, z, len, r, alongX, mat = VM.bark) {
  const m = vMesh(new THREE.CylinderGeometry(r, r * 1.05, len, 12), mat, x, y, z);
  m.rotation.set(alongX ? 0 : Math.PI / 2, 0, alongX ? Math.PI / 2 : 0);
  for (const s of [-1, 1]) {   // kesik uçlar: yıllık halkalı açık renk
    const c = vMesh(new THREE.CircleGeometry(r * .96, 12), vStd(0xb08a5a, .9), x + (alongX ? s * len / 2 : 0), y, z + (alongX ? 0 : s * len / 2));
    c.rotation.y = alongX ? s * Math.PI / 2 : (s > 0 ? 0 : Math.PI);
  }
  return m;
}
// ateş: taş halka, közler, odunlar, alevler, kıvılcım ve duman. light: kullanılacak meşale ışığı
function makeFire(x, y, z, L, k = 1, ring = true) {
  venue.fire = new V3(x, y + .4, z);
  if (ring) for (let i = 0; i < 11; i++) {
    const a = i / 11 * Math.PI * 2 + vRng() * .2, st = vMesh(new THREE.DodecahedronGeometry(.19 * k, 0), VM.stone, x + Math.cos(a) * .82 * k, y + .08 * k, z + Math.sin(a) * .82 * k);
    st.scale.set(1.2, .7, 1); st.rotation.set(vRng() * 3, a, vRng() * 3);
  }
  const ash = vMesh(new THREE.CircleGeometry(.72 * k, 18), VM.ash, x, y + .012, z); ash.rotation.x = -Math.PI / 2;
  const emb = vMesh(new THREE.CircleGeometry(.4 * k, 14), VM.ember.clone(), x, y + .02, z); emb.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 5; i++) {   // çadır gibi birbirine yaslanmış odunlar
    const a = i / 5 * Math.PI * 2, lg = vMesh(new THREE.CylinderGeometry(.06 * k, .075 * k, .95 * k, 7), VM.char, x + Math.cos(a) * .3 * k, y + .3 * k, z + Math.sin(a) * .3 * k);
    lg.rotation.set(0, -a, 0); lg.rotateZ(.62);
  }
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const f = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: i ? 0xffa050 : 0xffd080, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false })));
    f.center.set(.5, 0); f.position.set(x + (i ? Math.cos(i * 2.1) * .16 * k : 0), y + .05, z + (i ? Math.sin(i * 2.1) * .16 * k : 0));
    flames.push({ f, ph: i * 1.7, w: (i ? .5 : .7) * k, h: (i ? .85 : 1.25) * k });
  }
  // kıvılcımlar
  const N = 34, pos = new Float32Array(N * 3), life = new Float32Array(N), vel = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sp = mapMesh(new THREE.Points(geo, new THREE.PointsMaterial({ size: .05 * k, map: glowTex, color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  sp.frustumCulled = false;
  // duman
  const smoke = [];
  for (let i = 0; i < 7; i++) {
    const s = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x302c2a, transparent: true, depthWrite: false, opacity: 0 })));
    smoke.push({ s, t: i / 7 });
  }
  L.position.set(x, y + .9 * k, z); L.color.setHex(0xff8436); L.distance = 22 * k; L.intensity = 2.4;
  venue.fx.push((dt, t) => {
    const fl = .82 + Math.sin(t * 9.3) * .07 + Math.sin(t * 23.1) * .06 + Math.random() * .08;
    L.intensity = 2.5 * fl;
    emb.material.color.setRGB(1, .3 + fl * .12, .06);
    for (const o of flames) {
      const w = .85 + Math.sin(t * 13 + o.ph) * .12 + Math.random() * .05, h = .8 + Math.sin(t * 7.7 + o.ph * 2) * .15 + Math.random() * .1;
      o.f.scale.set(o.w * w, o.h * h, 1); o.f.material.rotation = Math.sin(t * 3 + o.ph) * .08;
    }
    for (let i = 0; i < N; i++) {
      life[i] -= dt;
      if (life[i] <= 0) {
        life[i] = .6 + Math.random() * 1.4;
        pos[i * 3] = x + (Math.random() - .5) * .5 * k; pos[i * 3 + 1] = y + .3 * k; pos[i * 3 + 2] = z + (Math.random() - .5) * .5 * k;
        vel[i * 3] = (Math.random() - .5) * .6; vel[i * 3 + 1] = (1.2 + Math.random() * 1.6) * k; vel[i * 3 + 2] = (Math.random() - .5) * .6;
      }
      vel[i * 3] += Math.sin(t * 4 + i) * dt * 1.4;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    geo.attributes.position.needsUpdate = true;
    for (const o of smoke) {
      o.t = (o.t + dt * .16) % 1;
      o.s.position.set(x + Math.sin(o.t * 5 + t * .3) * .3 * o.t, y + (1.1 + o.t * 3.6) * k, z + Math.cos(o.t * 4) * .2 * o.t);
      const sc = (.6 + o.t * 2.4) * k; o.s.scale.set(sc, sc, 1);
      o.s.material.opacity = Math.sin(o.t * Math.PI) * .2;
    }
  });
}
function makeChair(x, z, fx, fz, mat = VM.wood) {   // oturak, sırt, dört ayak; f yönüne bakar
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-fx, -fz); mapMesh(g);
  const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
  add(new THREE.BoxGeometry(.46, .05, .44), mat, 0, .45, 0);
  add(new THREE.BoxGeometry(.46, .5, .04), mat, 0, .72, .21);
  for (const [lx, lz] of [[-.2, -.18], [.2, -.18], [-.2, .19], [.2, .19]]) add(new THREE.BoxGeometry(.04, .45, .04), mat, lx, .225, lz);
  vSolid(.5, .5, .5, x, .25, z);
  seatAt(x, .47, z, fx, fz);
}
// oda panosu: oda kodu, mod, harita, oyuncular (lobi.js her değişiklikte yeniden çizer)
function makeBoard(x, y, z, faceYaw, w = 1.7, h = 1.05) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = faceYaw; mapMesh(g);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + .14, h + .14, .08), VM.darkWood); g.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = .045; g.add(face);
  venue.board = { x, z, c, tex, g };
  drawVenueBoard();
  return g;
}
function drawVenueBoard() {
  const B = venue.board; if (!B) return;
  const key = [net.code, net.gameMode, net.vsMap, ...Object.values(net.players).map(p => p.name + p.color)].join('|');
  if (B.key === key) return; B.key = key;
  const g = B.c.getContext('2d'), W = B.c.width, Hh = B.c.height;
  g.fillStyle = '#1b1612'; g.fillRect(0, 0, W, Hh);
  let sd = 3; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;   // tebeşir lekeleri her çizimde aynı
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${r() * .035})`; g.fillRect(r() * W, r() * Hh, 3, 3); }
  g.textBaseline = 'top'; g.fillStyle = '#ff5a40'; g.font = '700 30px "Chakra Petch", Consolas, monospace';
  g.fillText('KIZIL KATANA · ODA ' + (net.code || '-----'), 24, 18);
  const modeTxt = { coop: 'CO-OP', vs: 'VS · KIRMIZI / MAVİ', bomb: 'BOMBA KURMA', defense: 'SAVUNMA' }[net.gameMode] || net.gameMode;
  g.fillStyle = '#efe1cd'; g.font = '700 22px "Chakra Petch", Consolas, monospace';
  g.fillText('MOD: ' + modeTxt, 24, 64);
  if (net.gameMode === 'vs') g.fillText('HARİTA: ' + ((MAPS[net.vsMap] || {}).name || ''), 24, 94);
  let y = 134;
  for (const p of Object.values(net.players)) {
    g.fillStyle = '#' + p.color.toString(16).padStart(6, '0'); g.fillRect(28, y + 4, 14, 14);
    g.fillStyle = '#efe1cd'; g.fillText(p.name + (p.id === 'h' ? '  (HOST)' : ''), 52, y); y += 30;
  }
  g.fillStyle = '#c9a227'; g.font = '700 20px "Chakra Petch", Consolas, monospace';
  g.fillText('E · ODA PANELİ (MOD, HARİTA, BAŞLAT)', 24, Hh - 38);
  B.tex.needsUpdate = true;
}

/* ================= ORMAN KAMPI ================= */
MAPS.kamp = {
  name: 'ORMAN KAMPI', lobby: true, open: true,
  fog: 0x080d18, sky: 0x060a14, fogD: .042, hemi: [0x55648a, 0x0c0a08], hemiI: .42, moon: 0x9fb4ff, moonI: .5, pl: .32,
  lava: 0x000000, flame: 0xff8a3a, light: 0xff8436, ember: 0xffa040, floor: 0xffffff, wall: 0xffffff, noEmbers: true,
  floorTex: () => forestTex,
  spawn: () => { for (;;) { const a = Math.random() * Math.PI * 2, r = 4.4 + Math.random() * 1.2, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x + 5.2, z - 3.2) > 1.6) return new V3(x, .6, z); } },
  build() {
    venue.fx = []; venue.seats = []; venue.board = null; venue.fire = null; vSeed = 7;
    // zemin kenarı sisin içinde kaybolsun: dışarıda geniş bir orman tabanı
    const outer = forestTex.clone(); outer.needsUpdate = true; outer.repeat.set(40, 40);
    const og = vMesh(new THREE.CircleGeometry(95, 40), vStd(0xffffff, .95, { map: outer }), 0, -.02, 0); og.rotation.x = -Math.PI / 2;
    makeFire(0, 0, 0, torchLights[0], 1);
    // ateşin çevresi: dört kütük bank (2'şer kişilik), köşelerde kamp sandalyesi ve oturma kütükleri
    for (const [x, z, ax] of [[0, -3.1, true], [0, 3.1, true], [3.1, 0, false], [-3.1, 0, false]]) {
      logAlong(x, .24, z, 2.3, .24, ax);
      vSolid(ax ? 2.3 : .46, .46, ax ? .46 : 2.3, x, .23, z);
      const fx = -Math.sign(x), fz = -Math.sign(z);
      for (const o of [-.58, .58]) seatAt(x + (ax ? o : 0), .48, z + (ax ? 0 : o), fx, fz);
    }
    for (const [x, z] of [[2.5, 2.5], [-2.5, -2.5]]) {   // katlanır kamp sandalyesi
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(x, z); mapMesh(g);
      const cloth = vStd(x > 0 ? 0x2f5a3a : 0x8a3020, .9, { side: THREE.DoubleSide });
      const seat = new THREE.Mesh(new THREE.PlaneGeometry(.5, .45), cloth); seat.rotation.x = -Math.PI / 2 + .12; seat.position.y = .42; g.add(seat);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), cloth); back.position.set(0, .7, .24); back.rotation.x = -.18; g.add(back);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .62, 5), VM.metal); l.position.set(sx * .24, .3, sz * .1); l.rotation.x = sz * .5; g.add(l); }
      vSolid(.5, .45, .5, x, .22, z); seatAt(x, .44, z, -x, -z);
    }
    for (const [x, z] of [[-2.55, 2.55], [2.55, -2.55]]) {   // oturma kütüğü
      vMesh(new THREE.CylinderGeometry(.27, .3, .46, 12), VM.bark, x, .23, z);
      const top = vMesh(new THREE.CircleGeometry(.27, 12), vStd(0xb08a5a, .9), x, .461, z); top.rotation.x = -Math.PI / 2;
      vSolid(.5, .46, .5, x, .23, z); seatAt(x, .47, z, -x, -z);
    }
    // gitar, kuzey kütüğüne yaslı
    { const g = new THREE.Group(); g.position.set(1.55, 0, -3.42); g.rotation.set(-.32, .25, 0); mapMesh(g);
      const wd = vStd(0x9a5222, .35), dk = vStd(0x20140c, .5);
      for (const [r, y] of [[.19, .26], [.15, .52]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .09, 18), wd); b.rotation.x = Math.PI / 2; b.position.y = y; g.add(b); }
      const hole = new THREE.Mesh(new THREE.CircleGeometry(.05, 14), dk); hole.position.set(0, .45, .047); g.add(hole);
      const neck = new THREE.Mesh(new THREE.BoxGeometry(.05, .5, .025), dk); neck.position.set(0, .9, 0); g.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(.07, .14, .025), dk); head.position.set(0, 1.21, -.01); g.add(head); }
    // çadırlar: kapısı ateşe bakar
    const tents = [[-7.6, -7, 0xc8642a], [7.8, -7.2, 0x3e6a3a], [-8.4, 6.4, 0x2f5a8a]];
    tents.forEach(([x, z, col], i) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(-x, -z); mapMesh(g);
      const m = tentMat(col), w = 1.15, h = 1.45, L = 2.3, sl = Math.hypot(w, h);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(L, sl), m); p.rotation.set(0, Math.PI / 2, 0); p.rotateX(-s * Math.atan2(w, h)); p.position.set(s * w / 2, h / 2, 0); g.add(p); }
      const tri = new THREE.Shape([new THREE.Vector2(-w, 0), new THREE.Vector2(w, 0), new THREE.Vector2(0, h)]);
      const backP = new THREE.Mesh(new THREE.ShapeGeometry(tri), m); backP.position.z = -L / 2; g.add(backP);
      const dark = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: 0x050403 })); dark.position.z = L / 2 - .25; dark.scale.set(.92, .92, 1); g.add(dark);
      for (const s of [-1, 1]) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(.75, sl * .96), m); fl.position.set(s * .62, h * .47, L / 2 + .05); fl.rotation.set(0, s * .55, s * Math.atan2(w, h)); g.add(fl); }
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.6), vStd(0x2a2a24, .95)); sheet.rotation.x = -Math.PI / 2; sheet.position.y = .01; g.add(sheet);
      for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, h * 1.05, 5), VM.metal); st.position.set(0, h / 2, s * L / 2); g.add(st); }
      vSolid(2.4, 1.5, 2.4, x, .75, z);
      if (i === 0) {   // kapıda asılı fener
        const lp = new V3(.0, 1.25, L / 2 + .2).applyAxisAngle(UP, g.rotation.y).add(g.position);
        vMesh(new THREE.CylinderGeometry(.07, .08, .18, 8), VM.metal, lp.x, lp.y, lp.z);
        vMesh(new THREE.SphereGeometry(.05, 8, 6), VM.bulb, lp.x, lp.y, lp.z);
        torchLights[1].position.copy(lp); torchLights[1].color.setHex(0xffb060); torchLights[1].distance = 8; torchLights[1].intensity = .9;
      }
    });
    // piknik masası, üstünde fener
    { const x = 8.6, z = 5.4;
      vMesh(new THREE.BoxGeometry(2.1, .07, .9), VM.wood, x, .76, z);
      for (const s of [-1, 1]) { const lg = vMesh(new THREE.BoxGeometry(.08, .8, 1.9), VM.wood, x + s * .8, .38, z); lg.rotation.x = 0; }
      for (const s of [-1, 1]) {
        vMesh(new THREE.BoxGeometry(2.1, .06, .32), VM.wood, x, .45, z + s * .78);
        for (const o of [-.5, .5]) seatAt(x + o, .47, z + s * .78, 0, -s);
      }
      vSolid(2.1, .8, 2.0, x, .4, z);
      vMesh(new THREE.CylinderGeometry(.08, .09, .2, 8), VM.metal, x + .5, .9, z);
      vMesh(new THREE.SphereGeometry(.055, 8, 6), VM.bulb, x + .5, .9, z);
      torchLights[2].position.set(x + .5, 1.05, z); torchLights[2].color.setHex(0xffb060); torchLights[2].distance = 9; torchLights[2].intensity = 1;
      vMesh(new THREE.CylinderGeometry(.045, .04, .1, 10), vStd(0xd8d0c0, .4), x - .4, .845, z + .1);   // kupa
    }
    // odun yığını ve baltalı kütük
    for (let i = 0; i < 7; i++) logAlong(-5.6 + (i % 4) * .02, .1 + Math.floor(i / 4) * .17, -9.6 + (i % 4) * .19 + Math.floor(i / 4) * .09, 1.1, .09, true);
    vSolid(1.2, .4, .9, -5.6, .2, -9.3);
    vMesh(new THREE.CylinderGeometry(.32, .36, .5, 12), VM.bark, -3.9, .25, -9.4);
    { const ax = vMesh(new THREE.CylinderGeometry(.02, .025, .7, 6), VM.wood, -3.9, .72, -9.4); ax.rotation.z = .5; vMesh(new THREE.BoxGeometry(.04, .16, .2), VM.metal, -3.75, .52, -9.4); }
    // göl: koyu su, ayın yansıması, kenarında taşlar
    { const px = -11.5, pz = 9.8;
      const w = vMesh(new THREE.CircleGeometry(3.4, 32), VM.water, px, .02, pz); w.rotation.x = -Math.PI / 2; w.scale.set(1, 1.35, 1);
      const rf = vMesh(new THREE.PlaneGeometry(.6, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x6a7aa0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), px + .6, .03, pz - .8);
      rf.rotation.x = -Math.PI / 2;
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, s = vMesh(new THREE.DodecahedronGeometry(.25 + vRng() * .2, 0), VM.stone, px + Math.cos(a) * 3.5, .06, pz + Math.sin(a) * 4.6); s.scale.y = .5; s.rotation.y = vRng() * 3; }
      vSolid(6.4, 1, 8.6, px, -.4 + .5, pz);
    }
    // ağaçlar: çam (gövde + üç kat koni), tek çizimde
    const trees = [];
    const near = (x, z) => [[-7.6, -7, 2.6], [7.8, -7.2, 2.6], [-8.4, 6.4, 2.6], [8.6, 5.4, 2.4], [-11.5, 9.8, 4.6], [-5.6, -9.3, 1.6], [-3.9, -9.4, 1], [-5.2, 3.2, 1.4]].some(([a, b, r]) => Math.hypot(x - a, z - b) < r);
    for (let i = 0; i < 420 && trees.length < 170; i++) {
      const a = vRng() * Math.PI * 2, r = 10.5 + Math.pow(vRng(), .8) * 24, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (near(x, z) || trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.1)) continue;
      trees.push({ x, z, s: .8 + vRng() * .55, c: vRng() });
    }
    const trunkI = mapMesh(new THREE.InstancedMesh(new THREE.CylinderGeometry(.14, .24, 3.2, 7), VM.bark, trees.length));
    const coneI = mapMesh(new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 8), VM.pine, trees.length * 3));
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    trees.forEach((t, i) => {
      mx.compose(new V3(t.x, 1.6 * t.s, t.z), q, new V3(t.s, t.s, t.s)); trunkI.setMatrixAt(i, mx);
      for (let j = 0; j < 3; j++) {
        const r = (1.9 - j * .5) * t.s, h = (2.3 - j * .3) * t.s;
        q.setFromAxisAngle(UP, vRng() * 6); mx.compose(new V3(t.x, (1.6 + j * 1.35) * t.s + h / 2, t.z), q, new V3(r, h, r));
        coneI.setMatrixAt(i * 3 + j, mx);
        col.setHSL(.29 + t.c * .07, .26 + t.c * .14, .075 + j * .02 + t.c * .025); coneI.setColorAt(i * 3 + j, col);
      }
      q.identity();
      if (Math.hypot(t.x, t.z) < 21.5) vSolid(.5, 4, .5, t.x, 2, t.z);
    });
    // çalılar
    for (let i = 0; i < 26; i++) { const a = vRng() * 6.28, r = 9 + vRng() * 11, x = Math.cos(a) * r, z = Math.sin(a) * r; if (near(x, z)) continue; const b = vMesh(new THREE.IcosahedronGeometry(.45 + vRng() * .4, 0), vStd(0x1f3518, .95, { flatShading: true }), x, .25, z); b.scale.y = .6; }
    // gökyüzü: yıldızlar, ay
    { const N = 520, p = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const a = vRng() * Math.PI * 2, e = Math.asin(.12 + vRng() * .88), R = 150; p[i * 3] = Math.cos(a) * Math.cos(e) * R; p[i * 3 + 1] = Math.sin(e) * R; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const st = mapMesh(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, color: 0xdfe6ff, fog: false, transparent: true, opacity: .85 })));
      st.frustumCulled = false;
      const glow = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x8a9cc8, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))); glow.position.set(-70, 95, -110); glow.scale.set(60, 60, 1);
      const disc = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xf2efe2, fog: false, depthWrite: false }))); disc.position.copy(glow.position); disc.scale.set(9, 9, 1);
      moon.position.set(-7, 9.5, -11);
    }
    // ateş böcekleri
    { const N = 46, p = new Float32Array(N * 3), c = new Float32Array(N * 3), base = [];
      for (let i = 0; i < N; i++) { const a = vRng() * 6.28, r = 7 + vRng() * 11; base.push([Math.cos(a) * r, .5 + vRng() * 2.4, Math.sin(a) * r, vRng() * 20, .6 + vRng() * 1.2]); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      const ff = mapMesh(new THREE.Points(g, new THREE.PointsMaterial({ size: .09, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))); ff.frustumCulled = false;
      venue.fx.push((dt, t) => {
        base.forEach(([x, y, z, ph, sp], i) => {
          p[i * 3] = x + Math.sin(t * .4 * sp + ph) * 1.2; p[i * 3 + 1] = y + Math.sin(t * .7 * sp + ph * 2) * .4; p[i * 3 + 2] = z + Math.cos(t * .33 * sp + ph) * 1.2;
          const b = Math.pow(Math.max(0, Math.sin(t * 1.3 * sp + ph)), 4); c[i * 3] = .75 * b; c[i * 3 + 1] = 1 * b; c[i * 3 + 2] = .3 * b;
        });
        g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
      });
    }
    // oda panosu: iki direkli tabela
    makeBoard(-5.2, 1.35, 3.2, Math.atan2(5.2, -3.2));
    for (const s of [-1, 1]) { const o = new V3(s * .78, 0, 0).applyAxisAngle(UP, Math.atan2(5.2, -3.2)); vMesh(new THREE.CylinderGeometry(.05, .06, 1.9, 6), VM.darkWood, -5.2 + o.x, .95, 3.2 + o.z); }
    vSolid(1.8, 1.9, .3, -5.2, .95, 3.2);
  },
};

/* ================= DAĞ EVİ ================= */
MAPS.ev = {
  name: 'DAĞ EVİ', lobby: true, open: true, ceil: 3.6,
  fog: 0x140e0a, sky: 0x05070d, fogD: .012, hemi: [0xffc89a, 0x2a1810], hemiI: .3, moon: 0x9fb4ff, moonI: .14, pl: .22,
  lava: 0x000000, flame: 0xff8a3a, light: 0xffb060, ember: 0xffa040, floor: 0xffffff, wall: 0xffffff, noEmbers: true,
  floorTex: () => plankTex,
  spawn: () => new V3(rand(-2, 2), .6, rand(1.5, 4)),
  build() {
    venue.fx = []; venue.seats = []; venue.board = null; venue.fire = null; vSeed = 11;
    const X = 9, Z = 7, HT = 3.6;
    // duvarlar (kütük), tavan ve kirişler
    for (const [w, d, x, z] of [[2 * X + .8, .4, 0, -Z - .2], [2 * X + .8, .4, 0, Z + .2], [.4, 2 * Z, -X - .2, 0], [.4, 2 * Z, X + .2, 0]]) addBlock(w, HT, d, x, HT / 2, z, VM.logWall, true, true);
    const ceilTex = plankTex.clone(); ceilTex.needsUpdate = true; ceilTex.repeat.set(15, 11.5);
    const ceil = vMesh(new THREE.PlaneGeometry(2 * X, 2 * Z), vStd(0x6a4a30, .9, { map: ceilTex }), 0, HT, 0); ceil.rotation.x = Math.PI / 2;
    for (const x of [-6, -2, 2, 6]) vMesh(new THREE.BoxGeometry(.26, .3, 2 * Z), VM.darkWood, x, HT - .15, 0);
    for (const x of [-X + .1, X - .1]) for (const z of [-Z + .1, Z - .1]) vMesh(new THREE.BoxGeometry(.3, HT, .3), VM.darkWood, x, HT / 2, z);
    // şömine (kuzey duvarı): taş baca, ocak ağzı, raf, üstünde tablo
    addBlock(2.8, HT, .9, 0, HT / 2, -Z + .45, VM.stone, true, true);
    vMesh(new THREE.PlaneGeometry(1.3, .95), new THREE.MeshBasicMaterial({ color: 0x0a0604 }), 0, .55, -Z + .905);
    vMesh(new THREE.BoxGeometry(3.1, .12, .42), VM.darkWood, 0, 1.42, -Z + 1.05);
    vMesh(new THREE.BoxGeometry(3.2, .1, 1.1), VM.stone, 0, .05, -Z + 1.4);
    makeFire(0, .1, -Z + 1.2, torchLights[0], .62, false);
    for (const x of [-1.2, 1.15]) { vMesh(new THREE.CylinderGeometry(.035, .035, .16 + (x > 0 ? .06 : 0), 10), vStd(0xefe6d2, .6), x, 1.56 + (x > 0 ? .03 : 0), -Z + 1.05);
      const f = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))); f.center.set(.5, 0); f.position.set(x, 1.64 + (x > 0 ? .06 : 0), -Z + 1.05); f.scale.set(.05, .1, 1); }
    { const pc = document.createElement('canvas'); pc.width = 256; pc.height = 160; const g = pc.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#2a3a5a'); gr.addColorStop(1, '#c89a6a'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
      g.fillStyle = '#e8ecf2'; g.beginPath(); g.moveTo(0, 120); g.lineTo(70, 40); g.lineTo(120, 95); g.lineTo(170, 30); g.lineTo(256, 110); g.lineTo(256, 160); g.lineTo(0, 160); g.fill();
      g.fillStyle = '#2a2a30'; g.beginPath(); g.moveTo(0, 140); g.lineTo(90, 100); g.lineTo(180, 130); g.lineTo(256, 115); g.lineTo(256, 160); g.lineTo(0, 160); g.fill();
      const t = new THREE.CanvasTexture(pc); t.encoding = THREE.sRGBEncoding;
      vMesh(new THREE.BoxGeometry(1.5, 1, .06), VM.darkWood, 0, 2.35, -Z + .93); vMesh(new THREE.PlaneGeometry(1.36, .86), vStd(0xffffff, .8, { map: t }), 0, 2.35, -Z + .965); }
    // kilim
    const rug = vMesh(new THREE.PlaneGeometry(3.4, 4.4), VM.rug, 0, .012, -2.6); rug.rotation.x = -Math.PI / 2; rug.rotation.z = Math.PI / 2;
    // kanepe (şömineye bakar) ve iki deri koltuk
    { const z = -1.2;
      vMesh(new THREE.BoxGeometry(2.7, .42, .95), VM.sofa, 0, .21, z); vMesh(new THREE.BoxGeometry(2.7, .85, .26), VM.sofa, 0, .52, z + .46);
      for (const s of [-1, 1]) vMesh(new THREE.BoxGeometry(.24, .62, .95), VM.sofa, s * 1.36, .31, z);
      for (const o of [-.82, 0, .82]) { vMesh(new THREE.BoxGeometry(.8, .12, .8), vStd(0x6e2c26, .95), o, .47, z - .04); seatAt(o, .53, z - .04, 0, -1); }
      vSolid(2.9, .9, 1, 0, .45, z);
      for (const s of [-1, 1]) {
        const g = new THREE.Group(); g.position.set(s * 2.7, 0, -3.2); g.rotation.y = Math.atan2(s * 2.7, 2.6); mapMesh(g);
        const add = (w, h, d, x, y, zz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), VM.leather); o.position.set(x, y, zz); g.add(o); };
        add(.9, .42, .85, 0, .21, 0); add(.9, .9, .22, 0, .5, .38); add(.18, .62, .85, -.42, .31, 0); add(.18, .62, .85, .42, .31, 0);
        vSolid(.95, .9, .95, s * 2.7, .45, -3.2);
        const fx = -s * 2.7, fz = (-Z + 1.2) + 3.2; seatAt(s * 2.7, .5, -3.2, fx, fz);
      }
      // sehpa: üstünde kupalar ve tavla
      vMesh(new THREE.BoxGeometry(1.3, .06, .66), VM.darkWood, 0, .42, -3); for (const [x, zz] of [[-.58, -.28], [.58, -.28], [-.58, .28], [.58, .28]]) vMesh(new THREE.BoxGeometry(.06, .4, .06), VM.darkWood, x, .2, -3 + zz);
      vSolid(1.3, .45, .66, 0, .22, -3);
      for (const [x, zz] of [[-.4, -2.9], [.35, -3.12]]) vMesh(new THREE.CylinderGeometry(.045, .04, .1, 10), vStd(0xd8d0c0, .4), x, .5, zz);
      vMesh(new THREE.BoxGeometry(.44, .03, .3), vStd(0x7a4a22, .5), .05, .465, -2.95);
    }
    // bar (doğu): tezgâh, raflarda şişeler, üç tabure
    { const x = 7.4;
      vMesh(new THREE.BoxGeometry(.7, 1.02, 5.6), VM.darkWood, x, .51, 0); vMesh(new THREE.BoxGeometry(.86, .06, 5.8), vStd(0x6a4022, .35), x, 1.05, 0);
      vSolid(.8, 1.1, 5.8, x, .55, 0);
      for (const y of [1.3, 1.85]) vMesh(new THREE.BoxGeometry(.3, .04, 4), VM.darkWood, X - .16, y, 0);
      const glassC = [0x1f5a2a, 0x8a4a12, 0x9ab8c8, 0x5a1a1a];
      for (let i = 0; i < 18; i++) { const y = i < 9 ? 1.32 : 1.87, zz = -1.8 + (i % 9) * .45 + vRng() * .1, gm = vStd(glassC[i % 4], .12, { transparent: true, opacity: .78, metalness: .2 });
        vMesh(new THREE.CylinderGeometry(.04, .04, .24, 10), gm, X - .16, y + .12, zz); vMesh(new THREE.CylinderGeometry(.014, .02, .1, 8), gm, X - .16, y + .29, zz); }
      for (const zz of [-1.6, 0, 1.6]) {
        vMesh(new THREE.CylinderGeometry(.2, .19, .06, 16), VM.leather, x - .85, .76, zz); vMesh(new THREE.CylinderGeometry(.035, .05, .74, 8), VM.metal, x - .85, .37, zz);
        const ring = vMesh(new THREE.TorusGeometry(.15, .012, 6, 18), VM.metal, x - .85, .3, zz); ring.rotation.x = Math.PI / 2;
        vSolid(.4, .8, .4, x - .85, .4, zz); seatAt(x - .85, .79, zz, 1, 0);
      }
      torchLights[3].position.set(x - .3, 2.7, 0); torchLights[3].color.setHex(0xffb060); torchLights[3].distance = 7; torchLights[3].intensity = .8;
    }
    // kart masası (batı) ve dört sandalye
    { const x = -5.6, z = 2.6;
      vMesh(new THREE.CylinderGeometry(.78, .78, .05, 24), VM.darkWood, x, .74, z); vMesh(new THREE.CylinderGeometry(.08, .1, .72, 8), VM.darkWood, x, .36, z);
      vSolid(1.4, .78, 1.4, x, .39, z);
      for (let i = 0; i < 5; i++) { const c = vMesh(new THREE.PlaneGeometry(.07, .1), vStd(i % 2 ? 0xf2efe6 : 0xe8e2d0, .7), x - .2 + i * .1, .768, z + (i % 2) * .04); c.rotation.set(-Math.PI / 2, 0, i * .3); }
      for (const [dx, dz] of [[0, -1.12], [0, 1.12], [-1.12, 0], [1.12, 0]]) makeChair(x + dx, z + dz, -dx, -dz);
    }
    // kitaplık (batı duvarı)
    { const x = -X + .25, z = -2.4;
      vMesh(new THREE.BoxGeometry(.4, 2.3, 2.2), VM.darkWood, x, 1.15, z); vSolid(.5, 2.3, 2.2, x, 1.15, z);
      const bc = [0x7a2a1a, 0x2a4a6a, 0x3a5a2a, 0x8a6a2a, 0x4a2a4a, 0x2a2a2a];
      for (let s = 0; s < 4; s++) { let zz = z - 1; while (zz < z + .95) { const w = .05 + vRng() * .05, h = .3 + vRng() * .12;
        vMesh(new THREE.BoxGeometry(.24, h, w), vStd(bc[(vRng() * 6) | 0], .8), x + .1, .22 + s * .55 + h / 2, zz + w / 2); zz += w + .006; } }
    }
    // pencereler (güney ve batı), dışarıda kar yağar
    const windows = [[-5.6, Z - .02, 0], [-1.6, Z - .02, 0], [-X + .02, -5.4, Math.PI / 2]];
    for (const [x, z, ry] of windows) {
      const g = new THREE.Group(); g.position.set(x, 1.7, z); g.rotation.y = ry + (z > 0 ? Math.PI : 0); mapMesh(g);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.15), VM.win); g.add(v);
      const sn = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.15), VM.snow); sn.position.z = .005; g.add(sn);
      for (const [w, h, px, py] of [[1.66, .09, 0, .6], [1.66, .09, 0, -.6], [.09, 1.3, -.79, 0], [.09, 1.3, .79, 0], [.05, 1.15, 0, 0], [1.5, .05, 0, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .08), VM.darkWood); b.position.set(px, py, .03); g.add(b); }
      const sill = new THREE.Mesh(new THREE.BoxGeometry(1.7, .05, .22), VM.darkWood); sill.position.set(0, -.66, .1); g.add(sill);
    }
    venue.fx.push((dt, t) => { snowTex.offset.y += dt * .09; snowTex.offset.x = Math.sin(t * .4) * .04; });
    // kapı (güney)
    { const dt = plankTex.clone(); dt.needsUpdate = true; dt.repeat.set(1, 1.8); dt.rotation = Math.PI / 2;
      vMesh(new THREE.BoxGeometry(1.1, 2.15, .06), vStd(0x5a3820, .7, { map: dt }), 4.6, 1.075, Z - .03);
      vMesh(new THREE.SphereGeometry(.04, 8, 6), vStd(0xb08a40, .3, { metalness: .8 }), 4.2, 1.05, Z - .09); }
    // sarkıt lambalar
    [[-3, 1.2, 1], [3, 1.2, 2]].forEach(([x, z, li]) => {
      vMesh(new THREE.CylinderGeometry(.008, .008, .9, 4), VM.metal, x, HT - .45, z);
      const sh = vMesh(new THREE.ConeGeometry(.3, .24, 18, 1, true), vStd(0x2a3a2a, .5, { metalness: .4, side: THREE.DoubleSide }), x, HT - .98, z);
      vMesh(new THREE.SphereGeometry(.06, 10, 8), VM.bulb, x, HT - 1.08, z);
      const L = torchLights[li]; L.position.set(x, HT - 1.2, z); L.color.setHex(0xffc27a); L.distance = 10; L.intensity = 1.15;
      sh.userData.L = L;
    });
    // oda panosu (kuzey duvarı, şöminenin solunda)
    makeBoard(-4.6, 1.75, -Z + .06, 0);
    moon.position.set(-4, 6, 12);
  },
};
