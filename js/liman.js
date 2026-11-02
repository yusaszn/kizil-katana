'use strict';
/* LİMAN: özgün taktik harita (VS ve bomba modu), 72 x 72 m, kuzey = -z. Akşam üstü, bulutlu bir konteyner limanı.
   - Savunanlar kuzeyde, saldıranlar güneyde doğar
   - A bölgesi (kuzeydoğu): konteyner sahası, üstünde dev liman vinci; doğusu rıhtım ve deniz
   - B bölgesi (kuzeybatı): içi raflı büyük depo; güney kapısı ara sokağa, doğu garaj kapısı ortaya, kuzey kapısı savunma üssüne açılır
   - Orta: kamyonlu ve beton bariyerli geniş yol. A uzun: gümrük binasıyla rıhtım arasındaki uzun yol. B ara sokak: iki ofis bloğu arası
   Bütün duvar ve siperler eksene hizalı kutu: çarpışma, mermi ve mini harita aynı kutuları kullanır. */

/* ================= DOKULAR ================= */
const asphaltTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#5c5e60'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 9000; i++) { const v = 70 + Math.random() * 50 | 0; g.fillStyle = `rgba(${v},${v},${v + 3},.35)`; g.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  for (let i = 0; i < 10; i++) wrapBlob(g, s, Math.random() * s, Math.random() * s, 10 + Math.random() * 26, 'rgba(25,24,22,.16)');   // yağ lekeleri
  g.strokeStyle = 'rgba(30,30,30,.55)'; g.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) { g.beginPath(); let x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (Math.random() - .5) * 30; y += (Math.random() - .5) * 30; g.lineTo(x, y); } g.stroke(); }   // çatlaklar
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);   // beton plak derzi
}, 18, 18);
const concreteTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#8c8a86'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6000; i++) { const v = 110 + Math.random() * 50 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 6},.3)`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  for (let i = 0; i < 18; i++) { const x = Math.random() * s; const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, 'rgba(40,36,30,.0)'); gr.addColorStop(1, 'rgba(40,36,30,.28)'); g.fillStyle = gr; g.fillRect(x, s * .3, 3 + Math.random() * 8, s * .7); }   // yağmur izi
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, s, 3); g.fillRect(0, 0, 3, s);
}, 6, 2);
const corrTex = canvasTex(128, (g, s) => {
  for (let x = 0; x < s; x++) { const v = 150 + Math.sin(x / s * Math.PI * 2 * 12) * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, s); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,40,20,${Math.random() * .25})`; g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 10, 2 + Math.random() * 20); }   // pas
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, s, 3); g.fillRect(0, s - 3, s, 3);
}, 1, 1);
const facadeTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#9a948a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4000; i++) { const v = 130 + Math.random() * 40 | 0; g.fillStyle = `rgba(${v},${v - 4},${v - 10},.35)`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  for (const y of [40, 150]) for (let x = 20; x < s; x += 64) { g.fillStyle = '#26303a'; g.fillRect(x, y, 34, 52); g.fillStyle = 'rgba(160,190,210,.25)'; g.fillRect(x + 3, y + 3, 12, 46); g.fillStyle = '#6a645a'; g.fillRect(x - 3, y + 52, 40, 5); }
}, 1, 1);

/* ================= MALZEMELER ================= */
const LM = {
  cont: [0x8a2a1e, 0x1e4a7a, 0x2a5a32, 0xb8641e, 0x6a6e72, 0x7a6a1a].map(c => new THREE.MeshStandardMaterial({ map: corrTex, color: c, roughness: .6, metalness: .35 })),
  shed: new THREE.MeshStandardMaterial({ map: corrTex, color: 0x6e7c88, roughness: .55, metalness: .45 }),
  concrete: new THREE.MeshStandardMaterial({ map: concreteTex, color: 0xffffff, roughness: .95 }),
  facade: new THREE.MeshStandardMaterial({ map: facadeTex, color: 0xffffff, roughness: .9 }),
  barrier: new THREE.MeshStandardMaterial({ color: 0xb8b2a8, roughness: .95 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xd8a820, roughness: .6, metalness: .3 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: .5, metalness: .7 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: .85 }),
  paint: new THREE.MeshBasicMaterial({ color: 0xd8c050, transparent: true, opacity: .8, depthWrite: false }),
  water: new THREE.MeshStandardMaterial({ color: 0x1c2c36, roughness: .12, metalness: .45 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x2a3640, roughness: .15, metalness: .6 }),
  cardboard: new THREE.MeshStandardMaterial({ map: corrTex, color: 0xa8845a, roughness: .95 }),
};

// dokusu dünya ölçüsünde döşenen kutu (tw x th metrede bir tekrar); solid: çarpışma ve mermi kutusu da eklenir
function ubox(x0, x1, z0, z1, h, mat, y0 = 0, tw = 2.4, th = 2.6, solid = true) {
  const w = x1 - x0, d = z1 - z0, geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / tw, uv.getY(i) * dims[f][1] / th); }
  const m = mapMesh(new THREE.Mesh(geo, mat)); m.position.set((x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2);
  if (solid) addBlock(w, h, d, (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, null, true, true);
  return m;
}
MAPS.liman = {
  name: 'LİMAN', half: 36, open: true, mmBg: '#5a5e62',
  fog: 0xa6b0bc, sky: 0x9aa8b8, fogD: .0075, hemi: [0xe2e8f0, 0x5a5248], hemiI: 1.05, moon: 0xffe2c4, moonI: 1.15, pl: .25,
  lava: 0x000000, flame: 0xffb050, light: 0xfff0d8, ember: 0xffffff, floor: 0xffffff, wall: 0xc8c4bc, noEmbers: true,
  floorTex: () => asphaltTex, wallTex: () => concreteTex,
  sites: { A: { x0: 14, x1: 32, z0: -31, z1: -13 }, B: { x0: -31.5, x1: -12.5, z0: -29.5, z1: -10.5 } },
  spawn(team) {
    const south = typeof isBomb === 'function' && isBomb() ? team === attackTeam() : team === 'red';
    return south ? new V3(rand(-7, 7), .6, rand(28.5, 33.5)) : new V3(rand(-6, 6), .6, -rand(29, 33.5));
  },
  build() {
    // dış duvarlar (beton liman çiti) görünür; doğu tarafı rıhtım: duvar görünmez, öte yan deniz
    for (const m of shell.meshes) if (m.material === wallMat && m.position.x < H) m.visible = true;
    moon.position.set(-20, 14, 6);   // alçak, batıdan gelen akşam güneşi
    const TW = { [LM.facade.id]: [8, 7], [LM.shed.id]: [2.4, 3.6] };
    const box = (x0, x1, z0, z1, h, mat, y0 = 0) => { const t = TW[mat.id] || [2.4, 2.6]; return ubox(x0, x1, z0, z1, h, mat, y0, t[0], t[1]); };
    // konteyner: 6.06 x 2.6 x 2.44; along: x ekseni boyunca mı
    const cont = (x, z, alongX, c, stack = 1) => { const hx = alongX ? 3.03 : 1.22, hz = alongX ? 1.22 : 3.03; for (let i = 0; i < stack; i++) ubox(x - hx, x + hx, z - hz, z + hz, 2.6, LM.cont[(c + i) % LM.cont.length], i * 2.6); };
    const barrier = (x, z, alongX, n = 1) => { for (let i = 0; i < n; i++) addBlock(alongX ? 2 : .6, .95, alongX ? .6 : 2, x + (alongX ? i * 2.05 : 0), .475, z + (alongX ? 0 : i * 2.05), LM.barrier, true, true); };
    const crates = (x, z, n = 1, s = 1.15) => { for (let i = 0; i < n; i++) addBlock(s, s, s, x, s / 2 + i * s, z, colCrateMat, true, true); };

    /* ---- A bölgesi: konteyner sahası ---- */
    cont(17.2, -27.5, true, 0); cont(25.5, -16.5, false, 1, 2); cont(29.5, -27, true, 3); cont(21.2, -21.5, true, 2);
    crates(24.5, -24.6, 2); crates(15.8, -15.2, 1);
    // ortayla A arasındaki konteyner duvarı (aralarındaki boşluk: A kısa geçidi)
    cont(11.6, -29.5, false, 4, 2); cont(11.6, -14.6, false, 0, 2);
    /* ---- gümrük binası: ortayla A uzun yolunu ayırır ---- */
    box(14, 24, -8, 20, 7.5, LM.facade);
    addBlock(10.6, .3, 1.6, 19, 3.2, 20.7, LM.steel, false, true);   // giriş saçağı
    /* ---- A uzun (rıhtım yolu) ---- */
    for (let z = -10; z <= 24; z += 4.3) { const b = mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, .75, 10), LM.steel)); b.position.set(34.6, .38, z); }   // babalar
    box(28.6, 31.2, -5.5, -2.8, 2.7, LM.shed);   // bekçi kulübesi
    crates(29.8, 7.8, 2); crates(31, 9.1, 1); barrier(26.2, 15.5, false, 2);
    /* ---- orta yol ---- */
    ubox(-.2, 2.6, 1, 8.2, 2.9, LM.cont[4], 0, 2.4, 2.9);   // kamyon kasası
    box(-.1, 2.5, 8.2, 10.4, 2.1, LM.steel);  // kamyon kabini
    barrier(-4.2, -8.5, true, 2); barrier(4.5, 13.5, false, 1); barrier(-5.5, 18, true, 1);
    crates(8.2, -3, 2); crates(9.4, -1.8, 1); crates(-7.5, 4, 1);
    // orta yol çizgileri
    for (let z = -24; z < 24; z += 4) { const l = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(.18, 2), LM.paint)); l.rotation.x = -Math.PI / 2; l.position.set(-1.6, .012, z); }
    /* ---- B ara sokak: iki ofis bloğu ---- */
    box(-35.5, -26, -6, 22, 7, LM.facade);
    box(-18, -8, -4, 20, 7, LM.facade);
    mapMesh(new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 2.6), LM.cont[1])).position.set(-23.6, .7, 7.5); addBlock(1.7, 1.4, 2.6, -23.6, .7, 7.5, null, true, true);   // çöp konteyneri
    crates(-24.6, -1.5, 1); crates(-20.4, 13.2, 2);
    /* ---- B deposu ---- */
    const W = .5, Hh = 7.2, X0 = -32, X1 = -12, Z0 = -30, Z1 = -10;
    const wall = (x0, x1, z0, z1) => box(x0, x1, z0, z1, Hh, LM.shed);
    wall(X0, -20.5, Z0, Z0 + W); wall(-16, X1, Z0, Z0 + W);              // kuzey: kapı -20.5..-16 (savunma girişi)
    wall(X0, -26.2, Z1 - W, Z1); wall(-21.8, X1, Z1 - W, Z1);             // güney: kapı -26.2..-21.8 (ara sokaktan)
    wall(X0, X0 + W, Z0, Z1);                                             // batı
    wall(X1 - W, X1, Z0, -22.5); wall(X1 - W, X1, -16.8, Z1);              // doğu: garaj kapısı -22.5..-16.8 (ortadan)
    addBlock(4.5, 2.4, W, -18.25, Hh - 1.2, Z0 + W / 2, LM.shed, false, true);   // kapı üstleri (yürünür değil, mermi geçmez sayılmaz)
    addBlock(4.4, 2.4, W, -24, Hh - 1.2, Z1 - W / 2, LM.shed, false, true);
    addBlock(W, 2.6, 5.7, X1 - W / 2, Hh - 1.3, -19.65, LM.shed, false, true);
    const roof = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(X1 - X0, .25, Z1 - Z0), LM.shed)); roof.position.set((X0 + X1) / 2, Hh + .12, (Z0 + Z1) / 2);
    // içeride raflar, paletler, forklift
    for (const [z, x0, x1] of [[-24.6, -30.5, -22], [-15.4, -30.5, -23.5]]) {
      box(x0, x1, z - .6, z + .6, .12, LM.steel, 1.4); box(x0, x1, z - .6, z + .6, .12, LM.steel, 2.8);
      box(x0, x1, z - .5, z + .5, 1.3, LM.cardboard); box(x0 + .5, x1 - 1.5, z - .5, z + .5, 1.2, LM.cardboard, 1.55);
      for (let x = x0; x <= x1; x += (x1 - x0) / 3) addBlock(.1, 3.2, 1.2, x, 1.6, z, LM.yellow, false, true);
    }
    crates(-18.5, -26.5, 2); crates(-19.7, -27.5, 1); crates(-27.6, -20, 1); crates(-17.5, -13.5, 1);
    box(-15.6, -13.8, -27.8, -25.6, 1.4, LM.yellow); box(-15.4, -14, -25.6, -24.8, .9, LM.steel); box(-15.1, -14.3, -27.6, -25.8, .08, LM.steel, 2.2);   // forklift
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff2d8 });
    [[-26, -20, 0], [-17.5, -20, 1]].forEach(([x, z, i]) => {
      mapMesh(new THREE.Mesh(new THREE.ConeGeometry(.5, .35, 16, 1, true), LM.steel)).position.set(x, Hh - .8, z);
      mapMesh(new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 6), lampMat)).position.set(x, Hh - .95, z);
      const L = torchLights[i]; L.position.set(x, Hh - 1.2, z); L.color.setHex(0xfff0d8); L.distance = 16; L.intensity = 1.4;
    });
    /* ---- savunma üssü (kuzey) ve saldırı üssü (güney) ---- */
    barrier(-9, -27, true, 2); barrier(5, -27, true, 2); crates(-12.5, -33, 2); crates(13.5, -33.5, 1);
    barrier(-11, 26, true, 2); barrier(6.5, 25.5, true, 2); crates(15, 30.5, 2); crates(-16, 31, 1);
    cont(-30, 28, false, 5); cont(29, 30.8, true, 0);
    /* ---- liman vinci (A'nın üstünde, rıhtımda) ---- */
    for (const z of [-27.5, -14.5]) for (const x of [34.5, 46]) { const leg = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.9, 17, .9), LM.yellow)); leg.position.set(x, 8.5, z); if (x < 36) addBlock(.9, 17, .9, x, 8.5, z, null, true, true); }
    for (const z of [-27.5, -14.5]) { const b = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 1.1), LM.yellow)); b.position.set(30, 17.4, z); }
    mapMesh(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.4), LM.glass)).position.set(36, 15.6, -21);
    mapMesh(new THREE.Mesh(new THREE.BoxGeometry(6.06, 2.6, 2.44), LM.cont[2])).position.set(24, 11.5, -21);
    for (const s of [-1, 1]) { const c = mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 4.6, 4), LM.steel)); c.position.set(24 + s * 2.4, 15.1, -21); }
    /* ---- rıhtım kenarı ve deniz ---- */
    const quay = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.6, 1.6, 2 * H), LM.concrete)); quay.position.set(H + .3, -.8, 0);
    for (let z = -32; z <= 32; z += 6) mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.35, .9, 1.4), LM.rubber)).position.set(H + .65, -.55, z);
    const sea = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(260, 300), LM.water)); sea.rotation.x = -Math.PI / 2; sea.position.set(H + 130, -1.1, 0);
    const ship = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(18, 9, 90), new THREE.MeshStandardMaterial({ color: 0x3a2a26, roughness: .7 }))); ship.position.set(H + 70, 2, -10);
    for (let i = 0; i < 9; i++) mapMesh(new THREE.Mesh(new THREE.BoxGeometry(14, 5.2, 6), LM.cont[i % 6])).position.set(H + 70, 9.1, -46 + i * 9.6);
    // kenarda kalan zemin şeridi (rıhtım betonu)
    const ed = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2 * H), new THREE.MeshStandardMaterial({ color: 0xd8c050, roughness: .8 }))); ed.rotation.x = -Math.PI / 2; ed.position.set(H - .9, .011, 0);
    /* ---- bölge işaretleri ---- */
    for (const [k, x, z] of [['A', 23, -22], ['B', -22, -20]]) {
      const L = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), siteLetter(k))); L.rotation.x = -Math.PI / 2; L.position.set(x, .02, z);
    }
    // sokak lambaları (görsel)
    for (const [x, z] of [[-6.5, -18], [6.5, 6], [25.5, 22], [-6.5, 22], [24.8, -6]]) {
      const p = mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 7, 8), LM.steel)); p.position.set(x, 3.5, z);
      const a = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(1.2, .12, .3), LM.steel)); a.position.set(x + .5, 7, z);
      const h = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.5, .14, .32), lampMat)); h.position.set(x + 1, 6.92, z);
    }
  },
};
