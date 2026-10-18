'use strict';
/* Arena: harita, ışıklar, kan parçacıkları, kan lekeleri, ekran kanı, atmosfer */

const H = 22, WALLH = 7;
const statics = [];
const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: .82, metalness: .15 });
const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: .7, metalness: .3 });
const pillarMat = new THREE.MeshStandardMaterial({ map: pillarTex, roughness: .7, metalness: .3 });
const ironMat = new THREE.MeshStandardMaterial({ color: 0x1c1512, roughness: .5, metalness: .7 });
// Kemik Avlusu malzemeleri
const stoneTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#3a3d44'; g.fillRect(0, 0, s, s);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
    const off = r % 2 ? 32 : 0;
    g.fillStyle = `hsl(220,${6 + Math.random() * 6}%,${22 + Math.random() * 10}%)`;
    g.fillRect(c * 64 + off - 64 + 2, r * 32 + 2, 60, 28); g.fillRect(c * 64 + off + 2, r * 32 + 2, 60, 28);
  }
  grain(g, s, 5000, .25);
}, 2, 1);
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: .9, metalness: .05 });
const lowStoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0xb0a89a, roughness: .95 });
const boneMat = new THREE.MeshStandardMaterial({ color: 0xd9cfbd, roughness: .7 });

// haritaya ait (harita değişince silinen) parçalar
const mapStuff = { meshes: [], bodies: [] };
let curMap = null, baseStatics = 0;
function addBlock(w, h, d, x, y, z, mat, solidForRays = true, forMap = false) {
  if (mat) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); if (forMap) mapStuff.meshes.push(m); }
  const b = new CANNON.Body({ mass: 0, material: mWorld, collisionFilterGroup: G_STATIC, collisionFilterMask: -1 });
  b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
  b.position.set(x, y, z); world.addBody(b);
  if (forMap) mapStuff.bodies.push(b);
  if (solidForRays) statics.push({ x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2, z0: z - d / 2, z1: z + d / 2 });
}
function mapMesh(m) { scene.add(m); mapStuff.meshes.push(m); return m; }
const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff4a12 });
{ // her haritada ortak: zemin, dış duvarlar, kenardaki ışıklı oluk
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, H * 2), floorMat); fl.rotation.x = -Math.PI / 2; scene.add(fl);
  addBlock(H * 2 + 4, 1, H * 2 + 4, 0, -0.5, 0, null, false);
  addBlock(H * 2 + 2, WALLH, 1, 0, WALLH / 2, -H - .5, wallMat);
  addBlock(H * 2 + 2, WALLH, 1, 0, WALLH / 2, H + .5, wallMat);
  addBlock(1, WALLH, H * 2, -H - .5, WALLH / 2, 0, wallMat);
  addBlock(1, WALLH, H * 2, H + .5, WALLH / 2, 0, wallMat);
  for (const [w, d, x, z] of [[H * 2, .5, 0, -H + .25], [H * 2, .5, 0, H - .25], [.5, H * 2, -H + .25, 0], [.5, H * 2, H - .25, 0]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lavaMat); m.rotation.x = -Math.PI / 2; m.position.set(x, .006, z); scene.add(m);
  }
  baseStatics = statics.length;
}
const runeMat = new THREE.MeshBasicMaterial({ map: runeTex, color: 0xff2410, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false });

const hemi = new THREE.HemisphereLight(0x7a4236, 0x140404, 0.6); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xff6a48, 0.35); moon.position.set(6, 20, 9); scene.add(moon);
const playerLight = new THREE.PointLight(0xffd6b0, 0.75, 13, 2); camera.add(playerLight);
// meşale ışıkları bir kez oluşturulur, haritaya göre yer değiştirir (gölgelendiriciler yeniden derlenmesin)
const torchLights = [0, 1, 2, 3].map(() => { const L = new THREE.PointLight(0xff7428, 2.2, 24, 1.6); scene.add(L); return L; });
const braziers = [];
const flameMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff7a22, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const coalMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a });
function makeBrazier(x, z, i) {
  mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(.22, .45, 1.3, 8), ironMat)).position.set(x, .65, z);
  mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(.6, .3, .35, 10, 1, true), ironMat)).position.set(x, 1.45, z);
  const coal = mapMesh(new THREE.Mesh(new THREE.CircleGeometry(.52, 10), coalMat)); coal.rotation.x = -Math.PI / 2; coal.position.set(x, 1.5, z);
  const fl = mapMesh(new THREE.Sprite(flameMat)); fl.position.set(x, 2.1, z); fl.scale.set(1.4, 2, 1);
  const L = torchLights[i]; L.position.set(x, 2.6, z); L.intensity = 2.2;
  addBlock(.9, 1.6, .9, x, .8, z, null, true, true);
  braziers.push({ fl, L, ph: Math.random() * 10 });
}

const MAPS = {
  arena: {
    name: 'KIZIL ARENA',
    fog: 0x1d0705, hemi: [0x7a4236, 0x140404], moon: 0xff6a48, lava: 0xff4a12, flame: 0xff7a22, light: 0xff7428, ember: 0xff7a2a, floor: 0xffffff, wall: 0xffffff,
    spawn: team => new V3(rand(-11, 11), .6, (team === 'blue' ? -1 : 1) * rand(17.5, 19.5)),
    build() {
      for (const [x, z] of [[0, -14], [0, 14], [-14, 0], [14, 0], [-16, -16], [16, -16], [-16, 16], [16, 16]]) {
        addBlock(1.7, WALLH + 3, 1.7, x, (WALLH + 3) / 2, z, pillarMat, true, true);
        mapMesh(new THREE.Mesh(new THREE.BoxGeometry(2.1, .4, 2.1), ironMat)).position.set(x, .2, z);
      }
      [[-9, -9], [9, -9], [-9, 9], [9, 9]].forEach(([x, z], i) => makeBrazier(x, z, i));
      const rune = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(10, 10), runeMat)); rune.rotation.x = -Math.PI / 2; rune.position.y = .02;
    },
  },
  avlu: {
    // VS haritası: iki takım üssü, ortada siper, kanatlarda koridorlar, eğilerek saklanılan alçak duvarlar
    name: 'KEMİK AVLUSU',
    fog: 0x0a0d16, hemi: [0x4a5a80, 0x0a0a14], moon: 0x8fb0ff, lava: 0x2a6cff, flame: 0x5aa8ff, light: 0x6aa8ff, ember: 0x8ac0ff, floor: 0x9aa4bc, wall: 0x8a96b4,
    spawn: team => new V3(rand(-8, 8), .6, (team === 'blue' ? -1 : 1) * rand(17.5, 20)),
    build() {
      const B = (w, h, d, x, z, mat = stoneMat) => addBlock(w, h, d, x, h / 2, z, mat, true, true);
      for (const s of [1, -1]) {
        // üs: önde ortası açık duvar, yanlarda kısa duvarlar (3 çıkış)
        B(7, 4, 1, -6.5, 15 * s); B(7, 4, 1, 6.5, 15 * s);
        B(1, 4, 4, -10.5, 20 * s); B(1, 4, 4, 10.5, 20 * s);
        B(3.2, 1.1, .8, 0, 11.5 * s, lowStoneMat);                       // üs kapısının önünde alçak siper
        B(5, 1.1, .8, 0, 6 * s, lowStoneMat);                            // ortaya giden yolda siper
        for (const sx of [1, -1]) {
          B(1, 4, 6, 9 * sx, 6 * s);                                       // kanat koridoru duvarı
          B(1.6, 1.6, 1.6, 15 * sx, 6 * s);                                // kanat taşları
          B(1.4, 1.1, 3, 15 * sx, 11.5 * s, lowStoneMat);
          B(.8, 5, .8, 4 * sx, 10 * s, boneMat);                           // kemik sütunlar
          mapMesh(new THREE.Mesh(new THREE.SphereGeometry(.42, 10, 8), boneMat)).position.set(4 * sx, 5.25, 10 * s);
        }
      }
      B(4, 3, 4, 0, 0);                                                    // merkez blok
      B(4, 1.1, .8, -7, 0, lowStoneMat); B(4, 1.1, .8, 7, 0, lowStoneMat);
      for (const sx of [1, -1]) B(1.6, 2.2, 1.6, 17 * sx, 0);
      [[-18, -9], [18, 9], [-18, 9], [18, -9]].forEach(([x, z], i) => makeBrazier(x, z, i));
    },
  },
  col: {
    // Dust 2 yerleşimi (1 m'lik ızgara, kuzey = -z). Güney: saldıranların üssü. Doğu: dış uzun yol → mavi Uzun A kapıları → Uzun A → yüksek A platformu.
    // Orta: orta koridor, xbox, kısa geçit (catwalk) → A; kuzeyde orta kapılar → savunma ortası. Batı: alt tüneller → üstü kapalı B tünelleri → B.
    // Savunma üssü kuzeyde ortada: doğuda A rampası, batıda mavi B kapıları ve B penceresi.
    name: 'ÇÖL GEÇİDİ',
    fog: 0xd9c7a2, sky: 0x8cb8e6, fogD: .011, hemi: [0xd6e6ff, 0x8a6a3a], moon: 0xfff1d6, lava: 0xc8a060, flame: 0xffb050, light: 0xfff0d0, ember: 0xfff4e0, floor: 0xffffff, wall: 0xffffff,
    floorTex: () => sandFloorTex, wallTex: () => sandBrickTex, hemiI: 1.0, moonI: 1.35, noEmbers: true,
    sites: { A: { x0: 13, x1: 22, z0: -22, z1: -9 }, B: { x0: -22, x1: -10, z0: -22, z1: -6 } },
    spawn(team) {
      const south = typeof isBomb === 'function' && isBomb() ? team === attackTeam() : team === 'red';
      return south ? new V3(rand(-8, 4), .6, rand(16.5, 20.5)) : new V3(rand(-5, 3), .6, -rand(16.5, 20.5));
    },
    build() {
      const WH = 5.2, N = 44, O = 22, walk = new Uint8Array(N * N);
      const open = (x0, x1, z0, z1, v = 1) => { for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) walk[(x + O) * N + (z + O)] = v; };
      // ---- yürünebilir alanlar ----
      open(-10, 7, 14, 22);      // saldıran üssü
      open(7, 13, 13, 19);       // dış uzun yol
      open(13, 22, -9, 19);      // Uzun A
      open(13, 15, 8, 9, 0); open(19, 22, 8, 9, 0);   // Uzun A kapı duvarı (ortası açık)
      open(9, 22, -22, -9);      // A bölgesi
      open(4, 9, -21, -13);      // A rampası (savunmadan A'ya)
      open(-6, 4, -22, -14);     // savunma üssü
      open(-9, 4, -14, -10);     // savunma ortası
      open(-3, 2, -9, 14);       // orta
      open(-1, 1, -10, -9);      // orta kapılar
      open(2, 9, -6, -2); open(5, 9, -13, -6);       // kısa geçit (catwalk) → A
      open(-13, -3, 4, 8);       // alt tüneller
      open(-21, -13, -6, 18);    // üst B tünelleri
      open(-13, -10, 14, 18);    // üsten tünellere bağlantı
      open(-22, -10, -22, -6);   // B bölgesi
      open(-10, -9, -16, -13);   // B kapıları
      open(-9, -4, -18, -10);    // B kapılarının savunma tarafı
      open(-9, -5, -21, -18);    // B penceresinin savunma tarafı
      open(-10, -9, -20, -18, 2);   // B penceresi (alt ve üst duvar ayrıca)
      // ---- kalan her hücre bina: hücreleri birleştirip az sayıda kutu kur ----
      const used = new Uint8Array(N * N);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const k = i * N + j; if (walk[k] || used[k]) continue;
        let j2 = j; while (j2 + 1 < N && !walk[i * N + j2 + 1] && !used[i * N + j2 + 1]) j2++;
        let i2 = i;
        grow: while (i2 + 1 < N) { for (let jj = j; jj <= j2; jj++) { const kk = (i2 + 1) * N + jj; if (walk[kk] || used[kk]) break grow; } i2++; }
        for (let x = i; x <= i2; x++) for (let z = j; z <= j2; z++) used[x * N + z] = 1;
        dustBox(i - O, i2 + 1 - O, j - O, j2 + 1 - O, 0, WH, sandWallMat);
      }
      // B penceresi: altı ve üstü duvar, arası açık (savunma tarafından B'yi görürsün)
      dustBox(-10, -9, -20, -18, 0, 1.15, sandWallMat); dustBox(-10, -9, -20, -18, 2.25, WH, sandWallMat);
      // ---- üstü kapalı tüneller ----
      dustBox(-21, -13, 0, 15, 3.3, 3.75, roofMat); dustBox(-13, -10, 14, 18, 3.3, 3.75, roofMat); dustBox(-13, -4, 4, 8, 3.3, 3.75, roofMat);
      // tünel içi gölgesi: zemine ve duvar diplerine koyu, yarı saydam katman
      for (const [x0, x1, z0, z1] of [[-21, -13, 0, 15], [-13, -10, 14, 18], [-13, -4, 4, 8]]) {
        const sh = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), tunnelShade)); sh.rotation.x = -Math.PI / 2; sh.position.set((x0 + x1) / 2, .012, (z0 + z1) / 2);
        for (const [cx, cz, w, ry] of [[x0 + .01, (z0 + z1) / 2, z1 - z0, Math.PI / 2], [x1 - .01, (z0 + z1) / 2, z1 - z0, -Math.PI / 2]]) {
          const wl = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(w, 3.3), tunnelShade)); wl.position.set(cx, 1.65, cz); wl.rotation.y = ry;
        }
      }
      // ---- kapılar: mavi ahşap kanatlar ve üst kiriş ----
      dustBox(15, 19, 8, 9, 3.4, WH, sandWallMat);                                    // Uzun A kapı kirişi
      dustBox(15, 15.12, 9, 10.9, 0, 3.35, blueDoorMat); dustBox(18.88, 19, 9, 10.9, 0, 3.35, blueDoorMat);
      dustBox(-10, -9, -16, -13, 3.3, WH, sandWallMat);                               // B kapıları kirişi
      dustBox(-11.9, -10, -16, -15.88, 0, 3.25, blueDoorMat); dustBox(-11.9, -10, -13.12, -13, 0, 3.25, blueDoorMat);
      dustBox(-1, 1, -10, -9, 3.2, WH, sandWallMat);                                   // orta kapılar kirişi
      dustBox(-1, -.88, -11.8, -10, 0, 3.15, blueDoorMat); dustBox(.88, 1, -11.8, -10, 0, 3.15, blueDoorMat);
      // ---- yüksek A platformu ve basamakları ----
      dustBox(15, 22, -21, -14, 0, .9, lowSandMat);
      dustBox(15, 22, -14, -13, 0, .6, lowSandMat); dustBox(15, 22, -13, -12, 0, .3, lowSandMat);
      dustBox(14, 15, -21, -14, 0, .6, lowSandMat); dustBox(13, 14, -21, -14, 0, .3, lowSandMat);
      // B'nin arka platformu
      dustBox(-22, -18, -22, -18, 0, .6, lowSandMat); dustBox(-18, -17, -22, -18, 0, .3, lowSandMat);
      // ---- kasalar (siperler) ----
      const crate = (x, z, s, h, y0 = 0) => dustBox(x - s / 2, x + s / 2, z - s / 2, z + s / 2, y0, y0 + h, colCrateMat);
      crate(17.5, -17, 1.6, 1.3, .9); crate(19.2, -17.4, 1.2, 1, .9); crate(21, -21, 1.2, 1.1, .9);   // A'daki "varsayılan" kasa ve köşe
      crate(11, -12, 1.2, 1.1); crate(10.5, -19, 1.4, 1.3); crate(20.5, -7.5, 1.4, 1.2);              // A rampası, uzun köşesi
      crate(20.5, 12, 1.3, 1.2); crate(14, 16.5, 1.3, 1.2);                                              // Uzun A
      crate(.6, -5.5, 1.3, 1.25);                                                                         // xbox (orta)
      crate(-1.8, 10, 1.2, 1.1); crate(-17, -15, 1.6, 1.4); crate(-15, -19.5, 1.3, 1.1); crate(-20.6, -10, 1.4, 1.6); crate(-20.6, -11.6, 1.1, 1);
      crate(-12, -20.5, 1.2, 1.1); crate(-20, -20, 1.2, 1.1, .6);                                         // B
      crate(-7, 19, 1.4, 1.2); crate(4.5, 18.5, 1.3, 1.1); crate(-1, -19, 1.2, 1.1);                    // üsler
      // ---- bölge işaretleri ----
      for (const [k, st] of Object.entries(this.sites)) {
        const L = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), siteLetter(k))); L.rotation.x = -Math.PI / 2;
        L.position.set(k === 'A' ? 18 : -14, k === 'A' ? .93 : .02, k === 'A' ? -18 : -12);
      }
      // duvara boyanmış yön işaretleri
      const sign = (k, x, z, ry) => { const m = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), siteLetter(k))); m.position.set(x, 2.4, z); m.rotation.y = ry; };
      sign('A', 12.98, 4, -Math.PI / 2); sign('A', 9.02, -4, Math.PI / 2); sign('B', -12.98, 10, Math.PI / 2); sign('B', -3.02, 6.5, Math.PI / 2);
    },
  },
};
// çöl haritası malzemeleri: açık kumtaşı tuğla, kumlu zemin
const sandBrickTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#b8955f'; g.fillRect(0, 0, s, s);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) {
    const off = r % 2 ? 32 : 0;
    g.fillStyle = `hsl(${34 + Math.random() * 6},${38 + Math.random() * 12}%,${62 + Math.random() * 10}%)`;
    g.fillRect(c * 64 + off - 64 + 2, r * 32 + 2, 60, 28); g.fillRect(c * 64 + off + 2, r * 32 + 2, 60, 28);
  }
  grain(g, s, 6000, .18);
}, 2, 1);
const sandFloorTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#d9b77f'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${150 + Math.random() * 60},${110 + Math.random() * 40},${60 + Math.random() * 30},.18)`; g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 10 + Math.random() * 40, 6 + Math.random() * 20, Math.random() * 3, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(120,85,45,.25)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, s); g.moveTo(0, i * 64); g.lineTo(s, i * 64); g.stroke(); }
  grain(g, s, 9000, .2);
}, 12, 12);
const sandWallMat = new THREE.MeshStandardMaterial({ map: sandBrickTex, roughness: .95 });
const lowSandMat = new THREE.MeshStandardMaterial({ map: sandBrickTex, color: 0xcfb894, roughness: .95 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: .95 });
const tunnelShade = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .42, depthWrite: false });
const blueDoorMat = new THREE.MeshStandardMaterial({ color: 0x2f5f9a, roughness: .7, map: canvasTex(64, (g, s) => { g.fillStyle = '#4a7ab8'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(20,40,70,.5)'; for (let i = 0; i < s; i += 8) g.fillRect(i, 0, 2, s); grain(g, s, 600, .2); }, 1, 1) });
// Dust 2 kutusu: köşeleri (x0..x1, z0..z1) ve yüksekliği (y0..y1) verilir; doku duvar boyutuna göre tekrarlanır (gerilmez)
function dustBox(x0, x1, z0, z1, y0, y1, mat) {
  const w = x1 - x0, d = z1 - z0, h = y1 - y0, geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv, T = 2.2;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // +x, -x, +y, -y, +z, -z
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / T, uv.getY(i) * dims[f][1] / T); }
  const m = mapMesh(new THREE.Mesh(geo, mat)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  addBlock(w, h, d, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, null, true, true);
}
const colCrateMat = new THREE.MeshStandardMaterial({ map: canvasTex(64, (g, s) => { g.fillStyle = '#7a5530'; g.fillRect(0, 0, s, s); g.strokeStyle = '#4a3018'; g.lineWidth = 5; g.strokeRect(3, 3, s - 6, s - 6); g.beginPath(); g.moveTo(4, 4); g.lineTo(s - 4, s - 4); g.moveTo(s - 4, 4); g.lineTo(4, s - 4); g.stroke(); }, 1, 1), roughness: .85 });
const siteMat = new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: .08, depthWrite: false });
const siteLetters = {};
function siteLetter(k) {
  return siteLetters[k] || (siteLetters[k] = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(128, (g, s) => { g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(255,190,60,.85)'; g.lineWidth = 8; g.strokeRect(8, 8, s - 16, s - 16); g.fillStyle = 'rgba(255,190,60,.9)'; g.font = 'bold 92px Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k, s / 2, s / 2 + 4); }, 1, 1, false) }));
}
function buildMap(id) {
  if (!MAPS[id] || curMap === id) return;
  for (const m of mapStuff.meshes) scene.remove(m);
  for (const b of mapStuff.bodies) world.remove(b);
  mapStuff.meshes = []; mapStuff.bodies = []; statics.length = baseStatics; braziers.length = 0;
  curMap = id;
  const M = MAPS[id];
  for (const L of torchLights) L.intensity = 0;   // haritada mangal yoksa meşale ışığı da yok
  M.build();
  scene.fog.color.setHex(M.fog); scene.background.setHex(M.sky || M.fog); scene.fog.density = M.fogD || .034;
  embers.visible = !M.noEmbers;
  hemi.color.setHex(M.hemi[0]); hemi.groundColor.setHex(M.hemi[1]); moon.color.setHex(M.moon);
  lavaMat.color.setHex(M.lava); flameMat.color.setHex(M.flame); coalMat.color.setHex(M.flame);
  for (const L of torchLights) L.color.setHex(M.light);
  vmFire.color.setHex(M.light);   // silahlara vuran alt ışık haritanın meşale rengini alsın
  floorMat.color.setHex(M.floor); wallMat.color.setHex(M.wall);
  // haritaya özel dokular ve ışık (çöl gündüz aydınlık)
  floorMat.map = M.floorTex ? M.floorTex() : floorTex; wallMat.map = M.wallTex ? M.wallTex() : wallTex; floorMat.needsUpdate = wallMat.needsUpdate = true;
  hemi.intensity = M.hemiI || .6; moon.intensity = M.moonI || .35;
  embers.material.color.setHex(M.ember);
}
// uçuşan közler
const EMB = 260;
const embPos = new Float32Array(EMB * 3), embVel = new Float32Array(EMB);
for (let i = 0; i < EMB; i++) { embPos[i * 3] = rand(-H, H); embPos[i * 3 + 1] = rand(0, 14); embPos[i * 3 + 2] = rand(-H, H); embVel[i] = rand(.4, 1.6); }
const embGeo = new THREE.BufferGeometry(); embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ size: .13, map: glowTex, color: 0xff7a2a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
embers.frustumCulled = false; scene.add(embers);
buildMap('arena');

/* ================= IŞIN TESTLERİ (mermiler için) ================= */
function rayStatic(o, d, maxT) {
  let best = maxT;
  if (d.y < -1e-6) { const t = -o.y / d.y; if (t > 0 && t < best) best = t; }
  for (const s of statics) {
    let t0 = 0, t1 = best, ok = true;
    for (let a = 0; a < 3 && ok; a++) {
      const oo = a === 0 ? o.x : a === 1 ? o.y : o.z, dd = a === 0 ? d.x : a === 1 ? d.y : d.z;
      const lo = a === 0 ? s.x0 : a === 1 ? s.y0 : s.z0, hi = a === 0 ? s.x1 : a === 1 ? s.y1 : s.z1;
      if (Math.abs(dd) < 1e-8) { if (oo < lo || oo > hi) ok = false; continue; }
      let ta = (lo - oo) / dd, tb = (hi - oo) / dd; if (ta > tb) { const q = ta; ta = tb; tb = q; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) ok = false;
    }
    if (ok && t0 < best) best = t0;
  }
  return best;
}
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc; if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc); return t >= 0 ? t : -1;
}
function hitsStatic(p) {
  if (p.y < 0 || Math.abs(p.x) > H || Math.abs(p.z) > H) return true;
  for (const s of statics) if (p.x > s.x0 && p.x < s.x1 && p.z > s.z0 && p.z < s.z1 && p.y < s.y1) return true;
  return false;
}

/* ================= KAN PARÇACIKLARI ================= */
const PMAX = 8000;
const pPos = new Float32Array(PMAX * 3), pVel = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pLife = new Float32Array(PMAX), pKind = new Uint8Array(PMAX);
for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -999;
const pGeo = new THREE.BufferGeometry();
const pPosAttr = new THREE.BufferAttribute(pPos, 3).setUsage(THREE.DynamicDrawUsage);
const pColAttr = new THREE.BufferAttribute(pCol, 3).setUsage(THREE.DynamicDrawUsage);
pGeo.setAttribute('position', pPosAttr); pGeo.setAttribute('color', pColAttr);
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: .085, map: dotTex, vertexColors: true, alphaTest: .4 }));
pts.frustumCulled = false; scene.add(pts);
let pIdx = 0;
function emit(x, y, z, vx, vy, vz, kind, r, g, b, life) {
  const i = pIdx; pIdx = (pIdx + 1) % PMAX;
  pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
  pVel[i * 3] = vx; pVel[i * 3 + 1] = vy; pVel[i * 3 + 2] = vz;
  pCol[i * 3] = r; pCol[i * 3 + 1] = g; pCol[i * 3 + 2] = b;
  pLife[i] = life; pKind[i] = kind;
}
function bloodBurst(p, dir, n, speed, spread) {
  n = Math.round(n * SETTINGS.gore);
  for (let i = 0; i < n; i++) {
    const s = speed * rand(.25, 1);
    emit(p.x + rand(-.15, .15), p.y + rand(-.15, .15), p.z + rand(-.15, .15),
      dir.x * s + rand(-spread, spread), dir.y * s + rand(-spread * .4, spread) + 1.5, dir.z * s + rand(-spread, spread),
      1, rand(.28, .62), rand(0, .025), rand(0, .02), rand(.8, 2));
  }
}
function chips(p, n, r, g, b, speed = 6) {
  for (let i = 0; i < n; i++) emit(p.x, p.y, p.z, rand(-speed, speed), rand(1, speed * 1.2), rand(-speed, speed), 2, r * rand(.7, 1.2), g * rand(.7, 1.2), b * rand(.7, 1.2), rand(.5, 1.4));
}
// Parlak akkor kıvılcımlar (mermi sekmesi, zırh çarpması ve kılıç parry için)
function sparks(p, n, speed = 8) {
  for (let i = 0; i < n; i++) {
    emit(p.x, p.y, p.z,
      rand(-speed, speed), rand(1.5, speed * 1.4), rand(-speed, speed),
      2, 1.0, rand(.7, .95), rand(.1, .25), rand(.18, .42));
  }
}
function clearParticles() { for (let i = 0; i < PMAX; i++) { pLife[i] = 0; pPos[i * 3 + 1] = -999; } }

/* ================= KAN LEKELERİ ================= */
const DMAX = 1400;
const decalMat = new THREE.MeshStandardMaterial({ map: splatTex, transparent: true, depthWrite: false, roughness: .12, metalness: .25, envMap: envTex, envMapIntensity: .5, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const decals = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), decalMat, DMAX);
decals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
decals.frustumCulled = false;
const dummy = new THREE.Object3D();
const tmpCol = new THREE.Color();
function clearDecals() {
  dummy.position.set(0, -50, 0); dummy.scale.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.updateMatrix();
  for (let i = 0; i < DMAX; i++) { decals.setMatrixAt(i, dummy.matrix); decals.setColorAt(i, tmpCol.setRGB(.3, 0, 0)); }
  decals.instanceMatrix.needsUpdate = true; if (decals.instanceColor) decals.instanceColor.needsUpdate = true;
}
clearDecals(); scene.add(decals);
let dIdx = 0, decalDirty = false;
function addDecal(x, y, z, s, rx, ry, sy = 1) {
  dummy.position.set(x, y, z); dummy.rotation.set(rx, ry, Math.random() * 6.28, 'YXZ');
  dummy.scale.set(s, s * sy, s); dummy.updateMatrix();
  decals.setMatrixAt(dIdx, dummy.matrix);
  const v = rand(.75, 1.15); decals.setColorAt(dIdx, tmpCol.setRGB(.42 * v, .01 * v, .012 * v));
  dIdx = (dIdx + 1) % DMAX; decalDirty = true;
}
const floorDecal = (x, z, s) => addDecal(x, .012 + Math.random() * .004, z, s, -Math.PI / 2, 0);
function wallDecalNear(x, y, z, s) {
  if (Math.abs(x) > H - 1.5) addDecal(Math.sign(x) * (H - .01), y, clamp(z, -H, H), s, 0, -Math.sign(x) * Math.PI / 2, 1.6);
  else if (Math.abs(z) > H - 1.5) addDecal(clamp(x, -H, H), y, Math.sign(z) * (H - .01), s, 0, z > 0 ? Math.PI : 0, 1.6);
}

function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    const o = i * 3;
    pVel[o + 1] -= 22 * dt;
    pPos[o] += pVel[o] * dt; pPos[o + 1] += pVel[o + 1] * dt; pPos[o + 2] += pVel[o + 2] * dt;
    const x = pPos[o], y = pPos[o + 1], z = pPos[o + 2];
    if (y < .02) {
      if (pKind[i] === 1 && Math.random() < .22) floorDecal(x, z, rand(.12, .42));
      pLife[i] = 0;
    } else if (x > H - .02 || x < -H + .02 || z > H - .02 || z < -H + .02) {
      if (pKind[i] === 1 && Math.random() < .35 && y < WALLH) {
        if (Math.abs(x) >= H - .02) addDecal(Math.sign(x) * (H - .01), y, z, rand(.15, .45), 0, -Math.sign(x) * Math.PI / 2, 1.5);
        else addDecal(x, y, Math.sign(z) * (H - .01), rand(.15, .45), 0, z > 0 ? Math.PI : 0, 1.5);
      }
      pLife[i] = 0;
    }
    if (pLife[i] <= 0) pPos[o + 1] = -999;
  }
  pPosAttr.needsUpdate = true; pColAttr.needsUpdate = true;
  if (decalDirty) { decals.instanceMatrix.needsUpdate = true; if (decals.instanceColor) decals.instanceColor.needsUpdate = true; decalDirty = false; }
}

/* ================= EKRAN KANI ================= */
const drops = [];
function screenSplat(n) {
  const w = splatCv.width, h = splatCv.height;
  for (let i = 0; i < n; i++) {
    const sat = []; for (let k = 0; k < 7; k++) sat.push([rand(-1.6, 1.6), rand(-1.6, 1.6), rand(.08, .3)]);
    drops.push({ x: rand(w * .05, w * .95), y: rand(h * .05, h * .8), r: rand(14, 48), a: 1, len: 0, sp: rand(8, 30), drip: Math.random() < .7, sat });
  }
}
function drawSplats(dt) {
  sctx.clearRect(0, 0, splatCv.width, splatCv.height);
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]; d.a -= dt * .3; if (d.a <= 0) { drops.splice(i, 1); continue; }
    if (d.drip) d.len += d.sp * dt;
    sctx.globalAlpha = Math.min(1, d.a * 1.3) * .88;
    sctx.fillStyle = '#5e0503';
    sctx.beginPath(); sctx.arc(d.x, d.y, d.r, 0, 7); sctx.fill();
    for (const [ox, oy, rr] of d.sat) { sctx.beginPath(); sctx.arc(d.x + ox * d.r, d.y + oy * d.r, d.r * rr, 0, 7); sctx.fill(); }
    if (d.drip) { const w = d.r * .28; sctx.fillRect(d.x - w / 2, d.y, w, d.len); sctx.beginPath(); sctx.arc(d.x, d.y + d.len, w * .75, 0, 7); sctx.fill(); }
    sctx.fillStyle = 'rgba(160,20,12,.5)'; sctx.beginPath(); sctx.arc(d.x - d.r * .3, d.y - d.r * .3, d.r * .35, 0, 7); sctx.fill();
  }
  sctx.globalAlpha = 1;
}

/* ================= ATMOSFER ================= */
let muzzleGlow = 0;
function updateAmbience(dt, t) {
  for (let i = 0; i < EMB; i++) {
    embPos[i * 3 + 1] += embVel[i] * dt; embPos[i * 3] += Math.sin(t + i) * dt * .3;
    if (embPos[i * 3 + 1] > 14) { embPos[i * 3 + 1] = 0; embPos[i * 3] = rand(-H, H); embPos[i * 3 + 2] = rand(-H, H); }
  }
  embGeo.attributes.position.needsUpdate = true;
  for (const bz of braziers) {
    const f = .85 + Math.sin(t * 9 + bz.ph) * .08 + Math.sin(t * 23 + bz.ph * 2) * .06 + Math.random() * .05;
    bz.L.intensity = 2.2 * f; bz.fl.scale.set(1.3 * f, 2 * f, 1);
  }
  runeMat.opacity = .35 + Math.sin(t * 1.5) * .12;
  vmFire.intensity = 1.2 + Math.sin(t * 11) * .2;
  muzzleGlow = Math.max(0, muzzleGlow - dt * 22);
  playerLight.intensity = .75 + muzzleGlow * 2.6;
  vmMuzzle.intensity = muzzleGlow * 3.5;
  if (typeof worldMuzzle !== 'undefined') worldMuzzle.intensity = Math.max(worldMuzzle.intensity, muzzleGlow * 3.2);
}
