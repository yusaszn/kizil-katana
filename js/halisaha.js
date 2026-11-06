'use strict';
/* Dördüncü lobi mekânı: HALI SAHA. Maç başlamadan beklerken topla futbol: F / sol tık basılı tutup şut, üstüne yürüyerek sür,
   Q ile topu eline al ve at (kaleci, taç), koşarken C ile kayarak müdahale. Yan çizgiden çıkan top taç, kale çizgisinden korner.
   24 x 15 m çim, kafes tel, iki fileli kale; gol hostta algılanır, herkese duyurulur, skor tabelası güncellenir,
   top ortaya döner. Kenarda yedek kulübesi (oturulur), çay ocağı, dört ışık direği. */

const SAHA = { L: 12, W: 7.5, goalW: 1.55, goalH: 2.05, red: 0, blue: 0, resetT: 0, outT: 0, tabela: null };
const turfTex = canvasTex(256, (g, s) => {
  for (let x = 0; x < s; x++) { const band = x < s / 2; g.fillStyle = band ? '#2e7a2c' : '#286e27'; g.fillRect(x, 0, 1, s); }
  for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = v < .5 ? 'rgba(20,60,18,.35)' : 'rgba(120,190,90,.22)'; g.fillRect(Math.random() * s, Math.random() * s, 1, 2); }
}, 11, 11);
const netTex = canvasTex(64, (g, s) => {
  g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(235,235,235,.85)'; g.lineWidth = 2;
  for (let i = 0; i <= s; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
}, 8, 4, false);
const fenceTex = canvasTex(64, (g, s) => {
  g.clearRect(0, 0, s, s); g.strokeStyle = 'rgba(70,80,70,.9)'; g.lineWidth = 2;
  for (let i = -s; i <= s; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + s, s); g.stroke(); g.beginPath(); g.moveTo(i + s, 0); g.lineTo(i, s); g.stroke(); }
}, 1, 1, false);
const SM = {
  line: new THREE.MeshBasicMaterial({ color: 0xeef2ea }),
  post: new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: .4, metalness: .3 }),
  net: new THREE.MeshBasicMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  steel: new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: .5, metalness: .6 }),
  bench: new THREE.MeshStandardMaterial({ color: 0x2a5aa8, roughness: .6 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb02a20, roughness: .7 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: .7 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xc86a2a, roughness: .1, metalness: .2, transparent: true, opacity: .85 }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xf4f8ff }),
};
function sahaTabelaDraw() {
  const T = SAHA.tabela; if (!T) return;
  const g = T.c.getContext('2d'), W = T.c.width, Hh = T.c.height;
  g.fillStyle = '#0c0e12'; g.fillRect(0, 0, W, Hh);
  g.font = '700 30px "Chakra Petch", Consolas, monospace'; g.textBaseline = 'middle'; g.textAlign = 'center';
  g.fillStyle = '#ff5a48'; g.fillText('KIRMIZI', W * .22, 36); g.fillStyle = '#6aa8ff'; g.fillText('MAVİ', W * .78, 36);
  if (smatch.ph !== 'idle') { g.font = '700 26px "Chakra Petch", Consolas, monospace'; g.fillStyle = '#eef2ea'; g.fillText(smClock(), W / 2, 36); }
  g.font = '700 84px "Chakra Petch", Consolas, monospace'; g.fillStyle = '#ffd23a';
  g.fillText(SAHA.red + '  —  ' + SAHA.blue, W / 2, 104);
  T.tex.needsUpdate = true;
}
MAPS.saha = {
  name: 'HALI SAHA', lobby: true, open: true, half: 16, verb: .08,
  fog: 0x0a0e18, sky: 0x070a14, fogD: .016, hemi: [0x8a9ab8, 0x1a2014], hemiI: .55, moon: 0xdde6ff, moonI: .4, pl: .2,
  lava: 0x000000, flame: 0xff8a3a, light: 0xf4f6ff, ember: 0xffffff, floor: 0xffffff, wall: 0xffffff, noEmbers: true,
  floorTex: () => turfTex,
  spawn: () => new V3(rand(-2, 2), .6, rand(10.6, 11.8)),
  build() {
    venue.fx = []; venue.seats = []; venue.board = null; venue.fire = null; vSeed = 31;
    SAHA.red = 0; SAHA.blue = 0; SAHA.resetT = 0; smatch.ph = 'idle'; smatch.goals = {};
    const L = SAHA.L, W = SAHA.W, line = (w, d, x, z) => { const m = vMesh(new THREE.PlaneGeometry(w, d), SM.line, x, .014, z); m.rotation.x = -Math.PI / 2; };
    // saha çizgileri: kenarlar, orta çizgi ve yuvarlak, ceza sahaları, penaltı noktaları
    line(2 * L, .1, 0, -W); line(2 * L, .1, 0, W); line(.1, 2 * W, -L, 0); line(.1, 2 * W, L, 0); line(.1, 2 * W, 0, 0);
    const cc = vMesh(new THREE.RingGeometry(2.45, 2.55, 48), SM.line, 0, .014, 0); cc.rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) {
      line(.1, 7, s * (L - 3.5), 0); line(3.5, .1, s * (L - 1.75), -3.5); line(3.5, .1, s * (L - 1.75), 3.5);
      const pk = vMesh(new THREE.CircleGeometry(.12, 12), SM.line, s * (L - 2.6), .015, 0); pk.rotation.x = -Math.PI / 2;
    }
    const cs = vMesh(new THREE.CircleGeometry(.14, 12), SM.line, 0, .015, 0); cs.rotation.x = -Math.PI / 2;
    // kaleler: direkler, üst direk, file (arka, üst, yanlar); top fileye çarpınca durur
    const gw = SAHA.goalW, gh = SAHA.goalH, gd = 1.1;
    for (const s of [-1, 1]) {
      const x = s * L;
      for (const zz of [-gw, gw]) { vMesh(new THREE.CylinderGeometry(.06, .06, gh, 12), SM.post, x, gh / 2, zz); vSolid(.12, gh, .12, x, gh / 2, zz); }
      const bar = vMesh(new THREE.CylinderGeometry(.06, .06, 2 * gw + .12, 12), SM.post, x, gh, 0); bar.rotation.x = Math.PI / 2;
      const back = vMesh(new THREE.PlaneGeometry(2 * gw, gh), SM.net, x + s * gd, gh / 2, 0); back.rotation.y = Math.PI / 2;
      const top = vMesh(new THREE.PlaneGeometry(gd, 2 * gw), SM.net, x + s * gd / 2, gh, 0); top.rotation.x = -Math.PI / 2;
      for (const zz of [-gw, gw]) { const sd = vMesh(new THREE.PlaneGeometry(gd, gh), SM.net, x + s * gd / 2, gh / 2, zz); }
      vSolid(.1, gh, 2 * gw, x + s * (gd + .05), gh / 2, 0);                      // file arkası
      for (const zz of [-gw, gw]) vSolid(gd, gh, .1, x + s * gd / 2, gh / 2, zz + Math.sign(zz) * .05);   // file yanları
      vSolid(gd, .1, 2 * gw, x + s * gd / 2, gh + .05, 0);                         // file üstü
      // kale arkasındaki kale rengi şerit (hangi takımın kalesi olduğu)
      const st = vMesh(new THREE.PlaneGeometry(.5, 2 * gw), s < 0 ? SM.red : SM.bench, x + s * (gd + .35), .016, 0); st.rotation.x = -Math.PI / 2;
    }
    // kafes tel: sahanın çevresi (yanda kapı boşluğu); top içeride kalır
    const FX = L + 1.6, FZ = W + 1.2, FH = 4;
    const fenceMat = new THREE.MeshBasicMaterial({ map: fenceTex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const fence = (w, x, z, alongX) => {
      const t = fenceTex.clone(); t.needsUpdate = true; t.repeat.set(w / 1.2, FH / 1.2);
      const m = vMesh(new THREE.PlaneGeometry(w, FH), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false }), x, FH / 2, z);
      if (!alongX) m.rotation.y = Math.PI / 2;
      vSolid(alongX ? w : .1, FH, alongX ? .1 : w, x, FH / 2, z);
      vMesh(new THREE.BoxGeometry(alongX ? w : .06, .06, alongX ? .06 : w), SM.steel, x, FH, z);
    };
    fence(2 * FX, 0, -FZ, true); fence(FX - 1.2, -(FX + 1.2) / 2, FZ, true); fence(FX - 1.2, (FX + 1.2) / 2, FZ, true);   // ön tarafta kapı (x -1.2..1.2)
    fence(2 * FZ, -FX, 0, false); fence(2 * FZ, FX, 0, false);
    for (const x of [-FX, -FX / 2, 0, FX / 2, FX]) for (const z of [-FZ, FZ]) { if (z > 0 && Math.abs(x) < 1.3) continue; vMesh(new THREE.CylinderGeometry(.05, .05, FH, 8), SM.steel, x, FH / 2, z); }
    void fenceMat;
    // ışık direkleri (dört köşe)
    [[-FX - .6, -FZ - .6, 0], [FX + .6, -FZ - .6, 1], [-FX - .6, FZ + .6, 2], [FX + .6, FZ + .6, 3]].forEach(([x, z, i]) => {
      vMesh(new THREE.CylinderGeometry(.12, .16, 9, 10), SM.steel, x, 4.5, z); vSolid(.35, 9, .35, x, 4.5, z);
      const hd = vMesh(new THREE.BoxGeometry(1.2, .5, .25), SM.steel, x, 9, z); hd.lookAt(0, 0, 0);
      const lp = vMesh(new THREE.PlaneGeometry(1.05, .38), SM.lamp, x, 9, z); lp.lookAt(0, 0, 0); lp.translateZ(.14);
      const Lt = torchLights[i]; Lt.position.set(x * .8, 8, z * .8); Lt.color.setHex(0xf4f6ff); Lt.distance = 30; Lt.intensity = 1.25;
    });
    // yedek kulübesi (oturulur): sahaya bakan iki sıra bank
    for (const [x0, x1] of [[-9, -3], [3, 9]]) {
      vMesh(new THREE.BoxGeometry(x1 - x0, .08, .42), SM.bench, (x0 + x1) / 2, .45, FZ + 1.4); vMesh(new THREE.BoxGeometry(x1 - x0, .45, .06), SM.bench, (x0 + x1) / 2, .72, FZ + 1.62);
      for (const x of [x0 + .2, x1 - .2]) vMesh(new THREE.BoxGeometry(.06, .45, .4), SM.steel, x, .22, FZ + 1.4);
      vSolid(x1 - x0, .5, .5, (x0 + x1) / 2, .25, FZ + 1.45);
      for (let x = x0 + .6; x < x1; x += 1.2) seatAt(x, .49, FZ + 1.4, 0, -1);
      const roof = vMesh(new THREE.BoxGeometry(x1 - x0 + .4, .06, 1.4), new THREE.MeshStandardMaterial({ color: 0xc8d4e0, roughness: .2, transparent: true, opacity: .45 }), (x0 + x1) / 2, 2.3, FZ + 1.5);
      roof.rotation.x = .12;
    }
    // çay ocağı: tezgâh, semaver, ince belli bardaklar, iki tabure
    { const x = 12, z = FZ + 2.6;
      vMesh(new THREE.BoxGeometry(2.4, 1, .7), SM.wood, x, .5, z); vSolid(2.4, 1, .7, x, .5, z);
      vMesh(new THREE.BoxGeometry(2.6, .06, .9), SM.steel, x, 1.03, z);
      vMesh(new THREE.CylinderGeometry(.16, .2, .45, 16), new THREE.MeshStandardMaterial({ color: 0xc0c4c8, metalness: .9, roughness: .25 }), x - .7, 1.28, z);   // semaver
      vMesh(new THREE.CylinderGeometry(.09, .12, .16, 14), new THREE.MeshStandardMaterial({ color: 0xc0c4c8, metalness: .9, roughness: .25 }), x - .7, 1.58, z);
      for (let i = 0; i < 5; i++) { vMesh(new THREE.CylinderGeometry(.028, .022, .08, 10), SM.glass, x - .2 + i * .18, 1.1, z + .1); vMesh(new THREE.CylinderGeometry(.045, .045, .008, 12), new THREE.MeshStandardMaterial({ color: 0xe8e4dc }), x - .2 + i * .18, 1.064, z + .1); }
      for (const dx of [-.6, .6]) { vMesh(new THREE.CylinderGeometry(.18, .18, .05, 12), SM.wood, x + dx, .5, z - .7); vMesh(new THREE.CylinderGeometry(.03, .03, .48, 6), SM.steel, x + dx, .24, z - .7); seatAt(x + dx, .53, z - .7, 0, 1); }
      const sg = vMesh(new THREE.PlaneGeometry(1.6, .4), new THREE.MeshBasicMaterial({ map: canvasTex(256, (g, s) => { g.fillStyle = '#7a1a12'; g.fillRect(0, 0, s, s); g.fillStyle = '#ffe2a8'; g.font = 'bold 30px "Chakra Petch", Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.scale(1, 4); g.fillText('ÇAY OCAĞI', s / 2, s / 8); }, 1, 1) }), x, 2.1, z + .2);
      sg.rotation.y = Math.PI;
      for (const dx of [-1.15, 1.15]) vMesh(new THREE.CylinderGeometry(.04, .04, 2.2, 6), SM.steel, x + dx, 1.1, z + .3);
    }
    // skor tabelası (sahaya bakar)
    { const c = document.createElement('canvas'); c.width = 512; c.height = 160;
      const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
      const g = new THREE.Group(); g.position.set(0, 4.8, FZ + 3.2); g.rotation.y = Math.PI; mapMesh(g);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(4.3, 1.5, .15), SM.steel); g.add(fr);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.25), new THREE.MeshBasicMaterial({ map: tex })); face.position.z = .08; g.add(face);
      for (const dx of [-1.6, 1.6]) vMesh(new THREE.CylinderGeometry(.08, .08, 4.1, 8), SM.steel, dx, 2.05, FZ + 3.25);
      SAHA.tabela = { c, tex }; sahaTabelaDraw();
    }
    makeBoard(-12.5, 1.4, FZ + 2.4, Math.PI);
    // hakem masası: E ile mini maçı başlat (düdük)
    { const x = -3.6, z = FZ + 2.5;
      vMesh(new THREE.BoxGeometry(.9, .9, .55), SM.wood, x, .45, z); vSolid(.9, .9, .55, x, .45, z);
      vMesh(new THREE.BoxGeometry(1, .05, .65), SM.steel, x, .92, z);
      const wh = new THREE.MeshStandardMaterial({ color: 0xd8dce0, metalness: .9, roughness: .2 });
      vMesh(new THREE.CylinderGeometry(.05, .05, .14, 14), wh, x + .1, .99, z).rotation.z = Math.PI / 2;   // düdük
      vMesh(new THREE.BoxGeometry(.1, .05, .05), wh, x + .22, .99, z);
      vMesh(new THREE.BoxGeometry(.14, .02, .2), SM.red, x - .25, .95, z + .05);   // kırmızı kart
      vMesh(new THREE.BoxGeometry(.14, .02, .2), new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: .7 }), x - .25, .97, z - .05);
      const sg = vMesh(new THREE.PlaneGeometry(.9, .26), new THREE.MeshBasicMaterial({ map: canvasTex(256, (g, s) => { g.fillStyle = '#101418'; g.fillRect(0, 0, s, s); g.fillStyle = '#ffd23a'; g.font = 'bold 30px "Chakra Petch", Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.scale(1, 3.5); g.fillText('HAKEM · MAÇ', s / 2, s / 7); }, 1, 1) }), x, .55, z + .29);
      SAHA.whistle = [x, z];
    }
    for (const s of [-1, 1]) vMesh(new THREE.CylinderGeometry(.05, .06, 1.9, 6), SM.steel, -12.5 + s * .8, .95, FZ + 2.45);
    moon.position.set(-8, 12, 10);
  },
};
VENUE_NAMES.saha = 'HALI SAHA';

/* ================= GOL ================= */
// host: top kale çizgisini tümüyle geçerse gol; 2.5 sn sonra ortaya döner
function updateSaha(dt) {
  if (curMap !== 'saha' || !ball.body) return;
  smTick(dt);
  if (SAHA.resetT > 0) {
    SAHA.resetT -= dt;
    if (SAHA.resetT <= 0 && net.mode !== 'guest') { ball.body.position.set(0, .5, 0); ball.body.velocity.set(0, 0, 0); ball.body.angularVelocity.set(0, 0, 0); }
    return;
  }
  if (net.mode === 'guest') return;
  const p = ball.body.position;
  if (smatch.ph === 'kick') { p.set(0, .25, 0); ball.body.velocity.set(0, 0, 0); ball.body.angularVelocity.set(0, 0, 0); return; }   // başlama vuruşu bekleniyor
  ballToucher(p);
  if (Math.abs(p.x) > SAHA.L + .25 && Math.abs(p.z) < SAHA.goalW - .1 && p.y < SAHA.goalH) {
    if (smatch.ph === 'half' || smatch.ph === 'end') { SAHA.resetT = 1.5; return; }   // düdük çaldıktan sonra gol sayılmaz
    const side = p.x < 0 ? 'blue' : 'red';   // soldaki kale kırmızının: oraya giren gol mavinin
    if (side === 'red') SAHA.red++; else SAHA.blue++;
    const by = ball.last && (ball.last === net.myId || net.players[ball.last]) ? ball.last : '';
    const own = by && smTeam(by) !== side;
    if (smatch.ph === 'play' && by && !own) smatch.goals[by] = (smatch.goals[by] || 0) + 1;
    const msg = { t: 'gol', side, r: SAHA.red, b: SAHA.blue, by, own: own ? 1 : 0 };
    if (net.mode === 'host') bcast(msg);
    sahaGoal(msg);
    return;
  }
  // taç ve korner: top yan çizgiyi geçerse çizgide durur (Q ile alıp atılır), kale çizgisini kalenin dışından geçerse köşeye
  SAHA.outT -= dt;
  if (ball.holder || SAHA.outT > 0 || p.y > 3) return;
  let k = null, x = 0, z = 0;
  if (Math.abs(p.z) > SAHA.W + .25) { k = 'tac'; x = clamp(p.x, -SAHA.L + .4, SAHA.L - .4); z = Math.sign(p.z) * (SAHA.W + .05); }
  else if (Math.abs(p.x) > SAHA.L + .25) { k = 'korner'; x = Math.sign(p.x) * (SAHA.L - .35); z = Math.sign(p.z || 1) * (SAHA.W - .35); }
  if (!k) return;
  ball.body.position.set(x, .25, z); ball.body.velocity.set(0, 0, 0); ball.body.angularVelocity.set(0, 0, 0);
  SAHA.outT = 1.5;
  const msg = { t: 'out', k, p: [r2(x), r2(z)] };
  if (net.mode === 'host') bcast(msg);
  sahaOut(msg);
}
function sahaOut(d) {
  if (curMap !== 'saha') return;
  lhBanner(d.k === 'tac' ? 'TAÇ' : 'KORNER', d.k === 'tac' ? 'topu Q ile eline al, at' : 'köşeden ortala');
  if (AU.ctx) tn('sine', 2100, 2050, .16, .08);   // düdük
}
function sahaGoal(d) {
  SAHA.red = d.r; SAHA.blue = d.b; SAHA.resetT = 2.5; sahaTabelaDraw();
  const who = d.by ? nameOf(d.by) : '';
  chatSys('GOL! ' + (d.side === 'red' ? 'KIRMIZI' : 'MAVİ') + ' · ' + d.r + ' — ' + d.b + (who ? ' · ' + who + (d.own ? ' (kendi kalesine)' : '') : ''));
  lhBanner('GOL!', (who ? who.toLocaleUpperCase('tr-TR') + (d.own ? ' · KENDİ KALESİNE' : '') + ' · ' : '') + d.r + ' — ' + d.b);
  if (AU.ctx) { tn('sine', 2300, 2250, .22, .12); setTimeout(() => tn('sine', 2300, 2250, .5, .12), 260); nz(1.4, 900, 350, .5, .32, 'lowpass'); }
  const p = ball.mesh ? ball.mesh.position : new V3();
  for (let i = 0; i < 60; i++) emit(p.x, p.y + .3, p.z, rand(-4, 4), rand(2, 7), rand(-4, 4), 2, d.side === 'red' ? 1 : .35, d.side === 'red' ? .3 : .6, d.side === 'red' ? .2 : 1, rand(.6, 1.2));
}

/* ================= MİNİ MAÇ ================= */
// hakem masasında E: 2 x 90 sn maç. Başlama düdüğü, geri sayım, devre arası, gol kralı ve bitiş düdüğü; zamanı host tutar.
function lhBanner(big, small) { const el = $('lhBanner'); el.innerHTML = big + (small ? `<small>${small}</small>` : ''); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
const SM_HALF = 90, SM_KICK = 3, SM_BREAK = 6, SM_END = 8;
const smatch = { ph: 'idle', t: 0, half: 1, tick: 0, goals: {}, hud: '' };
const smTeam = id => (net.players[id] || {}).team || 'red';
const smClock = () => { const t = Math.max(0, Math.ceil(smatch.t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function smWhistleText() {
  if (smatch.ph === 'idle') return 'MİNİ MAÇ BAŞLAT (2 × 90 SN)';
  return net.mode !== 'guest' ? 'MAÇI BİTİR' : '';
}
function smWhistle() {
  if (smatch.ph === 'idle') smStart();
  else if (net.mode !== 'guest') smSet('end', 3, smatch.half);
}
function smStart() {
  if (net.mode === 'guest') { toHost({ t: 'smq' }); return; }
  SAHA.red = 0; SAHA.blue = 0; smatch.goals = {};
  smSet('kick', SM_KICK, 1);
}
function smGoalKing() {
  let id = null, n = 0;
  for (const k in smatch.goals) if (smatch.goals[k] > n) { n = smatch.goals[k]; id = k; }
  return id ? [nameOf(id), n] : null;
}
function smSet(ph, time, half) {
  const msg = { t: 'sm', ph, time, h: half, r: SAHA.red, b: SAHA.blue, gk: ph === 'end' ? smGoalKing() : null };
  if (net.mode === 'host') bcast(msg);
  onSm(msg);
}
function whistle(n = 1, long = false) {
  if (!AU.ctx) return;
  for (let i = 0; i < n; i++) setTimeout(() => { tn('sine', 2350, 2280, long && i === n - 1 ? .75 : .2, .11); tn('sine', 2400, 2330, long && i === n - 1 ? .75 : .2, .05); }, i * 300);
}
function onSm(d) {
  if (curMap !== 'saha') return;
  const prev = smatch.ph;
  smatch.ph = d.ph; smatch.t = +d.time || 0; smatch.half = d.h || 1; SAHA.red = d.r | 0; SAHA.blue = d.b | 0;
  sahaTabelaDraw();
  if (prev === d.ph) return;
  const score = 'KIRMIZI ' + SAHA.red + ' — ' + SAHA.blue + ' MAVİ';
  if (d.ph === 'kick') {
    // herkes kendi yarı sahasına: kırmızı soldaki kaleyi korur
    if (lobby.sit >= 0) lobbyStand();
    if (ball.holder === net.myId && net.mode !== 'guest') ballSetHolder(null);
    const red = smTeam(net.myId) === 'red', b = player.body;
    b.position.set((red ? -1 : 1) * rand(3, 6.5), .6, rand(-4, 4)); b.velocity.set(0, 0, 0);
    player.yaw = red ? -Math.PI / 2 : Math.PI / 2; player.pitch = 0;
    if (net.mode !== 'guest' && ball.holder) ballSetHolder(null);
    lhBanner(smatch.half === 1 ? 'MAÇ BAŞLIYOR' : '2. YARI', (red ? 'KIRMIZISIN · sağdaki kaleye at' : 'MAVİSİN · soldaki kaleye at') + ' · ' + SM_HALF + ' SN');
    whistle(1);
  } else if (d.ph === 'play') { whistle(1, true); lhBanner(smatch.half === 1 ? 'BAŞLA!' : '2. YARI BAŞLADI', ''); }
  else if (d.ph === 'half') { whistle(2, true); lhBanner('DEVRE ARASI', score); }
  else if (d.ph === 'end') {
    whistle(3, true);
    const win = SAHA.red > SAHA.blue ? 'KIRMIZI KAZANDI' : SAHA.blue > SAHA.red ? 'MAVİ KAZANDI' : 'BERABERE';
    lhBanner('MAÇ BİTTİ · ' + win, score + (d.gk ? ' · GOL KRALI ' + String(d.gk[0]).toLocaleUpperCase('tr-TR') + ' (' + d.gk[1] + ')' : ''));
    chatSys('MAÇ BİTTİ · ' + score + (d.gk ? ' · gol kralı ' + d.gk[0] + ' (' + d.gk[1] + ')' : ''));
    const mine = smTeam(net.myId);
    if ((mine === 'red' && SAHA.red > SAHA.blue) || (mine === 'blue' && SAHA.blue > SAHA.red)) for (let i = 0; i < 90; i++) emit(rand(-6, 6), 3, rand(-4, 4), rand(-3, 3), rand(3, 8), rand(-3, 3), 3, 1, .8, .2, rand(.8, 1.6));
  }
}
// her kare: süre akar; host evreleri ilerletir ve saniyede bir zamanı yayınlar
function smTick(dt) {
  const el = $('sahaHud');
  const html = smatch.ph === 'idle' ? '' : `<b class="red">KIRMIZI ${SAHA.red}</b><span>${smatch.ph === 'kick' ? 'HAZIR · ' + Math.max(1, Math.ceil(smatch.t)) : smatch.ph === 'half' ? 'DEVRE ARASI' : smatch.ph === 'end' ? 'MAÇ BİTTİ' : smClock() + ' · ' + smatch.half + '. YARI'}</span><b class="blue">${SAHA.blue} MAVİ</b>`;
  if (smatch.hud !== html) { smatch.hud = html; el.innerHTML = html; el.hidden = !html; if (smatch.ph === 'play') sahaTabelaDraw(); }
  if (smatch.ph === 'idle') return;
  smatch.t -= dt;
  if (net.mode === 'guest') return;
  smatch.tick -= dt;
  if (smatch.tick <= 0) { smatch.tick = 1; if (net.mode === 'host') bcast({ t: 'sm', ph: smatch.ph, time: Math.max(0, smatch.t), h: smatch.half, r: SAHA.red, b: SAHA.blue }); }
  if (smatch.t > 0) return;
  if (smatch.ph === 'kick') smSet('play', SM_HALF, smatch.half);
  else if (smatch.ph === 'play') smatch.half === 1 ? smSet('half', SM_BREAK, 1) : smSet('end', SM_END, 2);
  else if (smatch.ph === 'half') smSet('kick', SM_KICK, 2);
  else if (smatch.ph === 'end') smSet('idle', 0, 1);
}
// host: topa en yakın (dokunan) oyuncu son dokunan sayılır (sürerek atılan gol için)
function ballToucher(p) {
  if (ball.holder) return;
  const near = (id, q) => { if (q && Math.hypot(q.x - p.x, q.z - p.z) < .62 && Math.abs(q.y - p.y) < 1.4) ball.last = id; };
  near(net.myId, player.body.position);
  for (const id in net.players) { const pr = net.players[id]; if (id !== net.myId && pr.proxy) near(id, pr.proxy.pos); }
}
