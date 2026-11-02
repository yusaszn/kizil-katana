'use strict';
/* Üçüncü lobi mekânı: ÇATI KATI. Gece, şehrin üstünde ahşap teras; cam korkuluklar, ışık zincirleri, ateşli oturma masası,
   bar, sıcak su havuzu (içine oturulur), teleskop, DJ köşesi. Dört yanda ışıklı pencereli gökdelenler ve uzakta şehir ışıltısı. */

const windowTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#14161c'; g.fillRect(0, 0, s, s);
  for (let fy = 0; fy < 3; fy++) for (let fx = 0; fx < 4; fx++) {
    const lit = Math.random() < .36, warm = Math.random() < .7;
    g.fillStyle = lit ? (warm ? `rgb(${230 + Math.random() * 25 | 0},${180 + Math.random() * 40 | 0},${110 + Math.random() * 40 | 0})` : '#a8c8ff') : '#1e2430';
    g.fillRect(fx * 64 + 10, fy * 85 + 14, 44, 56);
  }
}, 1, 1);
const winMat = new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: .8, emissive: 0xffffff, emissiveMap: windowTex, emissiveIntensity: .7 });
const deckTex = (() => { const t = plankTex.clone(); t.needsUpdate = true; t.repeat.set(26, 26); return t; })();
const CM = {
  rail: new THREE.MeshStandardMaterial({ color: 0x9ab0c0, roughness: .1, metalness: .2, transparent: true, opacity: .22, depthWrite: false }),
  metal: new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .4, metalness: .7 }),
  sofa: new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: .95 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0xc8b896, roughness: .95 }),
  stone: new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x6a6a70, roughness: .9 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2a8ab0, roughness: .05, metalness: .3, transparent: true, opacity: .82, emissive: 0x0a3a50 }),
  pot: new THREE.MeshStandardMaterial({ color: 0x3a3a3e, roughness: .7 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x2a4a2a, roughness: .9, flatShading: true }),
  bulb: new THREE.MeshBasicMaterial({ color: 0xffd890 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: .6 }),
};
MAPS.cati = {
  name: 'ÇATI KATI', lobby: true, open: true, half: 11.5, verb: .05,
  fog: 0x0c1020, sky: 0x080b18, fogD: .011, hemi: [0x6a7aa8, 0x1a1418], hemiI: .45, moon: 0xa8b8ff, moonI: .35, pl: .25,
  lava: 0x000000, flame: 0xff8a3a, light: 0xffc27a, ember: 0xffa040, floor: 0x9a7a5a, wall: 0xffffff, noEmbers: true,
  floorTex: () => deckTex,
  spawn: () => new V3(rand(-2, 2), .6, rand(5, 7)),
  build() {
    venue.fx = []; venue.seats = []; venue.board = null; venue.fire = null; vSeed = 23;
    const L = 10.9;
    // cam korkuluk: alt kaide, cam panel, üst tutamak
    for (const [w, d, x, z] of [[2 * L, .08, 0, -L], [2 * L, .08, 0, L], [.08, 2 * L, -L, 0], [.08, 2 * L, L, 0]]) {
      vMesh(new THREE.BoxGeometry(w, 1.05, d), CM.rail, x, .6, z);
      vMesh(new THREE.BoxGeometry(w + .1, .06, d + .08), CM.metal, x, 1.15, z);
      vMesh(new THREE.BoxGeometry(w + .1, .12, d + .1), CM.metal, x, .06, z);
      vSolid(w, 1.2, d + .1, x, .6, z);
    }
    // ateşli oturma masası ve çevresinde U kanepe
    vMesh(new THREE.BoxGeometry(1.6, .4, 1.6), CM.stone, 0, .2, -1.5); vSolid(1.7, .45, 1.7, 0, .22, -1.5);
    makeFire(0, .4, -1.5, torchLights[0], .45, false);
    const sofa = (x0, x1, z0, z1, fx, fz, n) => {
      vMesh(new THREE.BoxGeometry(x1 - x0, .4, z1 - z0), CM.sofa, (x0 + x1) / 2, .2, (z0 + z1) / 2);
      vSolid(x1 - x0, .7, z1 - z0, (x0 + x1) / 2, .35, (z0 + z1) / 2);
      const bx = fx ? (fx > 0 ? x0 + .12 : x1 - .12) : (x0 + x1) / 2, bz = fz ? (fz > 0 ? z0 + .12 : z1 - .12) : (z0 + z1) / 2;
      vMesh(new THREE.BoxGeometry(fx ? .24 : x1 - x0, .75, fz ? .24 : z1 - z0), CM.sofa, bx, .55, bz);
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n, x = fx ? (x0 + x1) / 2 + fx * .08 : x0 + (x1 - x0) * t, z = fz ? (z0 + z1) / 2 + fz * .08 : z0 + (z1 - z0) * t;
        vMesh(new THREE.BoxGeometry(fx ? .7 : (x1 - x0) / n - .05, .1, fz ? (z1 - z0) / n - .05 : .7), CM.cushion, x, .45, z);
        seatAt(x, .5, z, fx, fz);
      }
    };
    sofa(-2, 2, -4.2, -3.3, 0, 1, 3); sofa(-3.4, -2.5, -3, 0, 1, 0, 2); sofa(2.5, 3.4, -3, 0, -1, 0, 2);
    // bar (doğu)
    vMesh(new THREE.BoxGeometry(.7, 1.05, 4.6), CM.wood, 8.6, .52, 3); vMesh(new THREE.BoxGeometry(.9, .06, 4.8), CM.metal, 8.6, 1.08, 3); vSolid(.8, 1.1, 4.8, 8.6, .55, 3);
    for (const z of [1.4, 3, 4.6]) {
      vMesh(new THREE.CylinderGeometry(.2, .2, .06, 14), CM.sofa, 7.6, .76, z); vMesh(new THREE.CylinderGeometry(.035, .05, .74, 8), CM.metal, 7.6, .37, z);
      vSolid(.4, .8, .4, 7.6, .4, z); seatAt(7.6, .79, z, 1, 0);
    }
    for (let i = 0; i < 8; i++) { const gm = new THREE.MeshStandardMaterial({ color: [0x1f5a2a, 0x8a4a12, 0x9ab8c8, 0x5a1a1a][i % 4], roughness: .12, transparent: true, opacity: .8 }); vMesh(new THREE.CylinderGeometry(.04, .04, .26, 10), gm, 8.75, 1.24, 1.2 + i * .5); }
    // sıcak su havuzu (batı): kenarına oturulur, su bacakları örter
    { const x = -7, z = 2.5, s = 2.8;
      for (const [w, d, ox, oz] of [[s, .25, 0, -s / 2], [s, .25, 0, s / 2], [.25, s, -s / 2, 0], [.25, s, s / 2, 0]]) { vMesh(new THREE.BoxGeometry(w + .25, .55, d), CM.stone, x + ox, .275, z + oz); vSolid(w + .25, .55, d, x + ox, .275, z + oz); }
      const w = vMesh(new THREE.PlaneGeometry(s - .2, s - .2), CM.water, x, .44, z); w.rotation.x = -Math.PI / 2;
      for (const [ox, oz, fx, fz] of [[-.75, -.9, 0, 1], [.75, -.9, 0, 1], [-.75, .9, 0, -1], [.75, .9, 0, -1]]) { seatAt(x + ox, .02, z + oz, fx, fz); venue.seats[venue.seats.length - 1].exit = [x + ox, z + oz - fz * 2]; }   // kalkınca havuzun dışına
      // buhar
      const steam = [];
      for (let i = 0; i < 6; i++) { const sp = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xdde8f0, transparent: true, depthWrite: false, opacity: 0 }))); steam.push({ sp, t: i / 6, ox: rand(-1, 1), oz: rand(-1, 1) }); }
      venue.fx.push((dt) => { for (const o of steam) { o.t = (o.t + dt * .12) % 1; o.sp.position.set(x + o.ox, .5 + o.t * 1.6, z + o.oz); const k = .6 + o.t * 1.4; o.sp.scale.set(k, k, 1); o.sp.material.opacity = Math.sin(o.t * Math.PI) * .12; } });
      const L2 = torchLights[3]; L2.position.set(x, .7, z); L2.color.setHex(0x4ac8ff); L2.distance = 6; L2.intensity = .9;
    }
    // ışık zinciri: direkler arası sarkan kablo ve ampuller
    const posts = [[-10.3, -10.3], [10.3, -10.3], [10.3, 10.3], [-10.3, 10.3]];
    for (const [x, z] of posts) vMesh(new THREE.CylinderGeometry(.06, .07, 3.2, 8), CM.metal, x, 1.6, z);
    const bulbs = [];
    const chain = (a, b) => { for (let i = 0; i <= 16; i++) { const t = i / 16, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = 3.1 - Math.sin(t * Math.PI) * .7; bulbs.push(vMesh(new THREE.SphereGeometry(.055, 6, 5), CM.bulb, x, y, z)); } };
    chain(posts[0], posts[2]); chain(posts[1], posts[3]); chain(posts[0], posts[1]); chain(posts[3], posts[2]);
    torchLights[1].position.set(-4, 2.6, -4); torchLights[2].position.set(4, 2.6, 4);
    for (const i of [1, 2]) { torchLights[i].color.setHex(0xffc27a); torchLights[i].distance = 12; torchLights[i].intensity = .9; }
    // saksı bitkileri
    for (const [x, z] of [[-9.8, -6], [-9.8, 8], [9.8, -6], [5, -9.8], [-4, 9.8]]) {
      vMesh(new THREE.CylinderGeometry(.35, .28, .6, 12), CM.pot, x, .3, z); vSolid(.7, .6, .7, x, .3, z);
      for (let i = 0; i < 4; i++) { const l = vMesh(new THREE.IcosahedronGeometry(.3 + vRng() * .15, 0), CM.leaf, x + (vRng() - .5) * .3, .8 + i * .22, z + (vRng() - .5) * .3); l.scale.y = 1.3; }
    }
    // teleskop (kuzeydoğu köşe) ve DJ köşesi (güney)
    { const g = new THREE.Group(); g.position.set(8.5, 0, -8.5); mapMesh(g);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2, l = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, 1.3, 6), CM.metal); l.position.set(Math.cos(a) * .25, .6, Math.sin(a) * .25); l.rotation.set(Math.sin(a) * .35, 0, -Math.cos(a) * .35); g.add(l); }
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 1, 14), new THREE.MeshStandardMaterial({ color: 0xe8e8ec, roughness: .3, metalness: .4 })); tube.position.set(0, 1.35, 0); tube.rotation.set(-1, .6, 0); g.add(tube);
      vSolid(.7, 1.4, .7, 8.5, .7, -8.5); }
    { vMesh(new THREE.BoxGeometry(2.2, .95, .7), CM.metal, 0, .475, 9.6); vSolid(2.2, 1, .7, 0, .5, 9.6);
      for (const sx of [-1, 1]) { vMesh(new THREE.BoxGeometry(.7, 1.3, .6), CM.pot, sx * 2, .65, 9.7); vMesh(new THREE.CylinderGeometry(.22, .22, .03, 16), CM.metal, sx * 2, .9, 9.39).rotation.x = Math.PI / 2; vSolid(.7, 1.3, .6, sx * 2, .65, 9.7); }
      const eq = []; for (let i = 0; i < 8; i++) eq.push(vMesh(new THREE.BoxGeometry(.16, 1, .02), new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(.75 - i * .07, .9, .55) }), -.7 + i * .2, 1.1, 9.27));
      venue.fx.push((dt, t) => { eq.forEach((m, i) => { const h = .15 + Math.abs(Math.sin(t * (3 + i * .7) + i)) * .5; m.scale.y = h; m.position.y = .96 + h / 2; }); });
    }
    // şehir: dört yanda ışıklı pencereli binalar (dokusu dünya ölçüsünde döşenir)
    for (let i = 0; i < 70; i++) {
      // bazıları terasın altında kalır (yüksek bir binanın tepesindeyiz), uzaktakiler daha yüksek gökdelenler
      const a = vRng() * Math.PI * 2, r = 34 + vRng() * 100, w = 8 + vRng() * 16, d = 8 + vRng() * 16, h = 22 + vRng() * (r > 75 ? 125 : 34);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, top = -40 + h;
      ubox(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h, winMat, -40, 12, 9, false);
      if (vRng() < .3) vMesh(new THREE.SphereGeometry(.25, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3020 }), x, top + .4, z);   // uçak ikaz ışığı
    }
    // yıldızlar ve ay
    { const N = 380, p = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const a = vRng() * Math.PI * 2, e = Math.asin(.25 + vRng() * .75), R = 150; p[i * 3] = Math.cos(a) * Math.cos(e) * R; p[i * 3 + 1] = Math.sin(e) * R; p[i * 3 + 2] = Math.sin(a) * Math.cos(e) * R; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const st = mapMesh(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.4, sizeAttenuation: false, color: 0xdfe6ff, fog: false, transparent: true, opacity: .7 }))); st.frustumCulled = false;
      const disc = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xf2efe2, fog: false, depthWrite: false }))); disc.position.set(60, 90, -110); disc.scale.set(8, 8, 1);
      moon.position.set(6, 9, -11);
    }
    // ufukta şehir ışıltısı
    const haze = mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(140, 140, 40, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x3a2a4a, transparent: true, opacity: .35, side: THREE.BackSide, fog: false, depthWrite: false })));
    haze.position.y = -10;
    makeBoard(-6, 1.4, -10.3, 0);
    for (const s of [-1, 1]) vMesh(new THREE.CylinderGeometry(.04, .05, 1.8, 6), CM.metal, -6 + s * .8, .9, -10.35);
  },
};
VENUE_NAMES.cati = 'ÇATI KATI';
