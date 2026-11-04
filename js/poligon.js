'use strict';
/* ATIŞ POLİGONU (tek kişi): CS tarzı nişan ve sprey çalışması.
   - 1 AK-47 · 2 M4 · 3 AWP · 4 Deagle · 5 USP-S · 6 Glock · 7 Pompalı · 8 Fenek; cephane sınırsız
   - Sprey duvarı (solda, 12 m): beyaz kareli duvar, mermi delikleri deseni gösterir. Otomatik tüfekte fareyi aşağı çekip
     salınıma ters yöne kaydırarak deseni karşıla; delikler kırmızı artıda toplanmalı
   - Çelik hedefler 10 / 15 / 20 / 30 m'de: vurulunca devrilir, kalkar; kafa bölgesi ayrı sayılır
   - E: 30 saniyelik refleks yarışı: hedefler rastgele kalkar, vurana kadar geçen süre ölçülür; en iyi skor saklanır */

const isRange = () => net.gameMode === 'range';
const RANGE_W = ['ak47', 'm4', 'awp', 'deagle', 'usps', 'glock', 'shotgun', 'fenek'];
const rng = { targets: [], shots: 0, hits: 0, heads: 0, chal: null, best: 0, hudT: 0 };
try { rng.best = +localStorage.getItem('kk-poligon-en') || 0; } catch (e) { /* kayıt yok */ }

/* ================= DOKULAR ================= */
const sprayWallTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#ecebe6'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .04})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
  g.strokeStyle = 'rgba(40,60,90,.28)'; g.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { const p = i * s / 8; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, s); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(s, p); g.stroke(); }
}, 1, 1);
const targetTex = canvasTex(128, (g, s) => {
  g.fillStyle = '#d8d6d0'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#b02a20'; g.lineWidth = 5;
  g.beginPath(); g.arc(s / 2, s * .62, s * .2, 0, 7); g.stroke();
  g.beginPath(); g.arc(s / 2, s * .62, s * .07, 0, 7); g.fillStyle = '#b02a20'; g.fill();
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,50,40,${Math.random() * .12})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
}, 1, 1);
function signTex(text) {
  return canvasTex(128, (g, s) => { g.fillStyle = '#1c1e22'; g.fillRect(0, 0, s, s); g.fillStyle = '#ffc23a'; g.font = 'bold 44px "Chakra Petch", Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, s / 2, s / 2); }, 1, 1);
}

/* ================= HEDEF ================= */
const tgSteel = new THREE.MeshStandardMaterial({ map: targetTex, roughness: .5, metalness: .4 });
const tgPost = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .5, metalness: .6 });
// çelik silüet: menteşesi y = .9'da, plaka arkaya devrilir
const tgShape = (() => {
  const s = new THREE.Shape(), w = .24;
  s.moveTo(-w, 0); s.lineTo(w, 0); s.lineTo(w, .5); s.lineTo(.16, .6); s.lineTo(.1, .6); s.lineTo(.1, .82); s.lineTo(-.1, .82); s.lineTo(-.1, .6); s.lineTo(-.16, .6); s.lineTo(-w, .5); s.lineTo(-w, 0);
  const geo = new THREE.ExtrudeGeometry(s, { depth: .015, bevelEnabled: false });
  const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + w) / (2 * w), uv.getY(i) / .82);
  return geo;
})();
function makeTarget(x, z, pop) {
  const g = new THREE.Group(); g.position.set(x, 0, z); mapMesh(g);
  const base = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .35), tgPost); base.position.y = .06; g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .8, 8), tgPost); post.position.y = .5; g.add(post);
  const hinge = new THREE.Group(); hinge.position.y = .9; g.add(hinge);
  const plate = new THREE.Mesh(tgShape, tgSteel); plate.position.z = -.0075; hinge.add(plate);
  const t = { x, z, g, hinge, pop: !!pop, up: pop ? 0 : 1, state: pop ? 'down' : 'up', t: 0, upAt: 0 };
  hinge.rotation.x = pop ? -1.45 : 0;
  rng.targets.push(t);
  return t;
}
// ışın hedef plakasına değiyor mu (dik duran hedefler): yaklaşık kutu
function rangeRay(o, d, maxT) {
  let best = null;
  for (const t of rng.targets) {
    if (t.state !== 'up') continue;
    const x0 = t.x - .25, x1 = t.x + .25, y0 = .9, y1 = 1.73, z0 = t.z - .03, z1 = t.z + .03;
    let t0 = 0, t1 = maxT, ok = true;
    for (let a = 0; a < 3 && ok; a++) {
      const oo = a === 0 ? o.x : a === 1 ? o.y : o.z, dd = a === 0 ? d.x : a === 1 ? d.y : d.z, lo = a === 0 ? x0 : a === 1 ? y0 : z0, hi = a === 0 ? x1 : a === 1 ? y1 : z1;
      if (Math.abs(dd) < 1e-8) { if (oo < lo || oo > hi) ok = false; continue; }
      let ta = (lo - oo) / dd, tb = (hi - oo) / dd; if (ta > tb) { const q = ta; ta = tb; tb = q; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) ok = false;
    }
    if (!ok) continue;
    // silüetin dışında kalan köşeler (omuz üstü, kafa yanları) isabet sayılmaz
    const py = o.y + d.y * t0, px = o.x + d.x * t0 - t.x;
    if (py > 1.4 && Math.abs(px) > .16 + (py < 1.5 ? .08 * (1.5 - py) / .1 : 0)) continue;
    if (py > 1.5 && Math.abs(px) > .1) continue;
    if (!best || t0 < best.t) best = { t: t0, tg: t, head: py > 1.5 };
  }
  return best;
}
function rangeHit(r, at) {
  const t = r.tg; if (t.state !== 'up') return;
  t.state = 'fall'; t.t = 0; rng.hits++; if (r.head) rng.heads++;
  sparks(at, 8, 5);
  if (AU.ctx) { tn('sine', r.head ? 2100 : 1650, r.head ? 2050 : 1600, .35, .16); tn('triangle', 3300, 3200, .12, .05); }   // çelik çınlaması
  const c = rng.chal;
  if (c && t === c.cur) { c.score++; c.reacts.push((performance.now() - t.upAt) / 1000); c.cur = null; c.next = rand(.2, .55); }
}

/* ================= HARİTA ================= */
MAPS.poligon = {
  name: 'ATIŞ POLİGONU', half: 22, mmBg: '#4a4c50', verb: .34,
  fog: 0x14161a, sky: 0x101216, fogD: .01, hemi: [0xe8eef4, 0x3a3634], hemiI: .95, moon: 0xffffff, moonI: .45, pl: .3,
  lava: 0x24262a, flame: 0xffb050, light: 0xfff2e0, ember: 0xffffff, floor: 0xb4b4b4, wall: 0xa8acb0, noEmbers: true,
  floorTex: () => asphaltTex, wallTex: () => concreteTex,
  spawn: () => new V3(rand(-1.5, 1.5), .6, 13),
  build() {
    rng.targets = [];
    // tavan ve floresan şeritler
    const ceil = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(44, 44), new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .9 }))); ceil.rotation.x = Math.PI / 2; ceil.position.y = 6;
    const fl = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
    for (const x of [-12, -4, 4, 12]) for (const z of [-14, -2, 10]) mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.25, .06, 5), fl)).position.set(x, 5.95, z);
    [[-8, 4, 0], [8, 4, 1], [-8, -12, 2], [8, -12, 3]].forEach(([x, z, i]) => { const L = torchLights[i]; L.position.set(x, 5.4, z); L.color.setHex(0xf0f4ff); L.distance = 22; L.intensity = 1.1; });
    // atış tezgâhı ve bölmeler (ortada geçit)
    const ctr = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: .6, metalness: .3 });
    addBlock(13, .95, .55, -7.5, .475, 10, ctr, true, true); addBlock(13, .95, .55, 7.5, .475, 10, ctr, true, true);
    for (const x of [-12, -8, -4, 4, 8, 12]) addBlock(.08, 1.9, 1.3, x, .95, 10.6, ctr, false, true);
    // mesafe çizgileri ve tabelaları (tezgâhtan)
    const paint = new THREE.MeshBasicMaterial({ color: 0xffc23a, transparent: true, opacity: .7, depthWrite: false });
    for (const [d, z] of [[10, 0], [20, -10], [30, -20]]) {
      const l = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(30, .12), paint)); l.rotation.x = -Math.PI / 2; l.position.set(2, .012, z);
      for (const sx of [-1, 1]) { const sg = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: signTex(d + ' m') }))); sg.position.set(sx * 21.9, 3.2, z); sg.rotation.y = -sx * Math.PI / 2; }
    }
    // sprey duvarı (sol önde, 12 m)
    const sw = new THREE.MeshStandardMaterial({ map: sprayWallTex, roughness: .95 });
    addBlock(6, 3.6, .4, -16, 1.8, -2, sw, true, true);
    const cross = new THREE.MeshBasicMaterial({ color: 0xd02a20 });
    mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(.5, .06), cross)).position.set(-16, 1.45, -1.79); mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(.06, .5), cross)).position.set(-16, 1.45, -1.79);
    // 4:1 tabela: kare dokuya yazı dikeyde 4 kat uzatılarak yazılır, levhada düzgün görünür
    const sgn = mapMesh(new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), new THREE.MeshBasicMaterial({ map: canvasTex(256, (g, s) => { g.fillStyle = '#1c1e22'; g.fillRect(0, 0, s, s); g.fillStyle = '#ffc23a'; g.font = 'bold 30px "Chakra Petch", Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.scale(1, 4); g.fillText('SPREY DUVARI', s / 2, s / 8); }, 1, 1) })));
    sgn.position.set(-16, 3.95, -1.79);
    // çelik hedefler
    for (const [x, z] of [[-7, 0], [-2.5, -5], [2.5, -10], [7, -20], [11, -5], [-11, -15], [4.5, 0], [0, -20]]) makeTarget(x, z, false);
    // refleks yarışı hedefleri (yerde yatar, sırayla kalkar)
    for (const [x, z] of [[-9, -2], [-5, -12], [-1, -3], [3, -15], [6.5, -7], [9.5, -12], [-3.5, -18], [1.5, -8], [-7.5, -8], [12, -18], [-12, -6], [5.5, -2]]) makeTarget(x, z, true);
    // yan duvarlarda ses yalıtım panelleri (görsel)
    const pan = new THREE.MeshStandardMaterial({ color: 0x3a3430, roughness: 1 });
    for (let z = -18; z <= 8; z += 4) for (const sx of [-1, 1]) mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.08, 2.4, 3.2), pan)).position.set(sx * 21.95, 2.6, z);
  },
};

/* ================= MOD ================= */
function rangeReset() {
  Object.assign(rng, { shots: 0, hits: 0, heads: 0, chal: null });
  const p = MAPS.poligon.spawn(); player.body.position.set(p.x, .6, p.z); player.yaw = 0; player.pitch = 0;
  wpn.cur = 'ak47'; wpn.next = null; wpn.drawing = false;
  document.body.classList.add('rangemode');
  $('rangeHud').hidden = false;
  banner('ATIŞ POLİGONU', '1-8 silah · solda sprey duvarı · E: refleks yarışı');
}
function rangeKey(e) {
  if (!isRange() || state !== 'play') return false;
  const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8'].indexOf(e.code);
  if (i >= 0) { switchWeapon(RANGE_W[i]); return true; }
  if (e.code === 'KeyE') { rangeChallenge(); return true; }
  if (e.code === 'KeyT') return true;
  return false;
}
function rangeChallenge() {
  if (rng.chal) return;
  for (const t of rng.targets) if (t.pop) { t.state = 'down'; t.hinge.rotation.x = -1.45; }
  rng.chal = { t: 30, next: 1.2, cur: null, score: 0, miss: 0, reacts: [] };
  banner('REFLEKS YARIŞI', '30 saniye · kalkan hedefi olabildiğince hızlı vur');
  sfx.wave();
}
function rangeEnd() {
  const c = rng.chal; rng.chal = null;
  for (const t of rng.targets) if (t.pop && t.state !== 'down') { t.state = 'drop'; t.t = 0; }
  const avg = c.reacts.length ? c.reacts.reduce((a, b) => a + b, 0) / c.reacts.length : 0;
  const rec = c.score > rng.best;
  if (rec) { rng.best = c.score; try { localStorage.setItem('kk-poligon-en', String(c.score)); } catch (e) { /* kayıt yok */ } }
  banner((rec ? 'YENİ REKOR · ' : 'SKOR · ') + c.score, 'Ortalama tepki ' + avg.toFixed(2) + ' sn · kaçan ' + c.miss + ' · en iyi ' + rng.best);
  sfx.upgrade();
}
function updateRange(dt, rdt) {
  // sınırsız cephane
  for (const id in GUNS) gst[id].reserve = GUNS[id].rounds;
  m4.reserve = Math.max(m4.reserve, 4); awp.reserve = Math.max(awp.reserve, 20); shells.reserve = Math.max(shells.reserve, 24);
  // hedef animasyonları
  for (const t of rng.targets) {
    t.t += dt;
    if (t.state === 'fall') { t.hinge.rotation.x = -1.45 * Math.min(1, (t.t / .18) ** 2); if (t.t > (t.pop ? .3 : 1.6)) { t.state = t.pop ? 'down' : 'rise'; t.t = 0; } }
    else if (t.state === 'rise') { t.hinge.rotation.x = -1.45 * (1 - Math.min(1, t.t / .16)); if (t.t > .16) { t.state = 'up'; t.upAt = performance.now(); } }
    else if (t.state === 'drop') { t.hinge.rotation.x = -1.45 * Math.min(1, t.t / .2); if (t.t > .2) t.state = 'down'; }
  }
  // refleks yarışı
  const c = rng.chal;
  if (c) {
    c.t -= dt;
    if (c.cur && performance.now() - c.cur.upAt > 2400 && c.cur.state === 'up') { c.cur.state = 'drop'; c.cur.t = 0; c.cur = null; c.miss++; c.next = .3; }
    if (!c.cur) { c.next -= dt; if (c.next <= 0 && c.t > .3) { const pool = rng.targets.filter(t => t.pop && t.state === 'down'); if (pool.length) { const t = pick(pool); t.state = 'rise'; t.t = 0; c.cur = t; if (AU.ctx) tn('square', 900, 1200, .05, .03); } } }
    if (c.t <= 0) rangeEnd();
  }
  rng.hudT -= rdt; if (rng.hudT > 0) return; rng.hudT = .1;
  const acc = rng.shots ? Math.round(rng.hits / rng.shots * 100) : 0;
  setText('rgStats', c ? 'YARIŞ ' + Math.max(0, Math.ceil(c.t)) + ' sn · SKOR ' + c.score + ' · KAÇAN ' + c.miss : 'ATIŞ ' + rng.shots + ' · İSABET ' + rng.hits + ' (%' + acc + ') · KAFA ' + rng.heads + (rng.best ? ' · REKOR ' + rng.best : ''));
}
$('rangeBtn').addEventListener('click', () => { leaveRoom(true); net.gameMode = 'range'; resetGame(); play(); });
