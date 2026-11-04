'use strict';
/* SİLAH EKLENTİLERİ: M4 ve AK-47 için nişangah (Atölye ekranında seçilir).
   - Demir nişangah (varsayılan), Kırmızı nokta (25 leşte açılır), Holografik (75 leşte açılır). Leşler bu cihazda sayılır.
   - Optik takılınca arka gez katlanır; nişan alınca göz optiğin merkezine gelir, ön arpacık optiğin alt kısmında görünür
     (alt üçte bir hizası). Kırmızı noktanın noktası ve holografiğin halka-nokta işareti tam ekran ortasına düşer. */

const SIGHTS = [
  { id: 'iron', name: 'DEMİR NİŞANGAH', need: 0, info: 'Gez ve arpacık' },
  { id: 'reddot', name: 'KIRMIZI NOKTA', need: 25, info: 'Küçük tüp, ortada kırmızı nokta' },
  { id: 'holo', name: 'HOLOGRAFİK', need: 75, info: 'Geniş pencere, halka ve nokta' },
];
// montaj yeri: rayın / gövde kapağının üstü (silah yerel ölçüsünde), nişan çizgisi ve nişanda silahın göze uzaklığı
const SIGHT_GUNS = { m4: { mountY: .039, mountZ: -.02, ironY: .085, ironZ: -.34, optZ: -.24 }, ak47: { mountY: .043, mountZ: .03, ironY: .078, ironZ: -.34, optZ: -.25 } };
const kkStats = (() => { try { return JSON.parse(localStorage.getItem('kk-istatistik') || '{}'); } catch (e) { return {}; } })();
kkStats.kills = kkStats.kills || 0;
const sightSel = (() => { try { return JSON.parse(localStorage.getItem('kk-nisangah') || '{}'); } catch (e) { return {}; } })();
const sightNow = { m4: null, ak47: null };

/* her leşte çağrılır (co-op ve PvP). info = { w: silah, fx: ['hs','ns','air','smk','kor'], pvp }
   Toplam ve silah başına sayaçlar tutulur (kkStats.w[silah].kills / .hs ...); görevler killHooks ile dinler */
const killHooks = [];
function statKill(info = {}) {
  kkStats.kills++;
  const W = kkStats.w || (kkStats.w = {}), w = info.w || 'diger', ws = W[w] || (W[w] = { kills: 0 });
  ws.kills++;
  for (const f of info.fx || []) { ws[f] = (ws[f] || 0) + 1; kkStats[f] = (kkStats[f] || 0) + 1; }
  if (info.pvp) kkStats.pvp = (kkStats.pvp || 0) + 1;
  for (const h of killHooks) { try { h(info, ws); } catch (e) { /* görev hatası leşi bozmasın */ } }
  try { localStorage.setItem('kk-istatistik', JSON.stringify(kkStats)); } catch (e) { /* kayıt yok */ }
  const s = SIGHTS.find(q => q.need && q.need === kkStats.kills);
  if (s) { banner('YENİ EKLENTİ', s.name + ' açıldı · Ana menü → ATÖLYE'); sfx.upgrade(); }
}
const sightOpen = s => (typeof apAdmin === 'function' && apAdmin()) || kkStats.kills >= s.need;
// nişangahın etkisi (aparat.js A() çarpanlarına katılır): optik nişanda daha isabetli, holografik biraz ağır
function sightStats(w) {
  if (!SIGHT_GUNS[w]) return {};
  const id = sightSel[w] || 'iron', S = SIGHTS.find(s => s.id === id);
  if (!S || !sightOpen(S)) return {};
  return id === 'reddot' ? { spread: .93 } : id === 'holo' ? { spread: .88, ads: .94 } : {};
}

/* ================= OPTİK MODELLER ================= */
const lensMat = new THREE.MeshStandardMaterial({ color: 0x3a5a6a, metalness: .9, roughness: .06, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false });
const dotCore = new THREE.SpriteMaterial({ map: dotTex, color: 0xff2a14, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
const dotGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xff3018, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55 });
const holoTex = canvasTex(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,60,30,1)'; g.lineWidth = 5; g.shadowColor = 'rgba(255,40,20,1)'; g.shadowBlur = 6;
  g.beginPath(); g.arc(s / 2, s / 2, 44, 0, 7); g.stroke();
  g.fillStyle = 'rgba(255,70,40,1)'; g.beginPath(); g.arc(s / 2, s / 2, 4.5, 0, 7); g.fill();
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { g.beginPath(); g.moveTo(s / 2 + Math.cos(a) * 44, s / 2 + Math.sin(a) * 44); g.lineTo(s / 2 + Math.cos(a) * 52, s / 2 + Math.sin(a) * 52); g.stroke(); }
}, 1, 1, false);
const holoMat = new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
function opticRedDot() {
  const g = new THREE.Group(), A = .058;   // optik ekseni montajdan bu kadar yukarıda
  GK.rbox(g, GK.black, .024, .008, .032, 0, .004, 0, .002);                                // ray kelepçesi
  GK.rbox(g, GK.black, .017, .036, .022, 0, .026, 0, .003);                                // yükseltici
  GK.lathe(g, GK.black, [[.0118, -.019], [.0152, -.019], [.0152, .019], [.0118, .019]], 0, A, 24);   // tüp
  GK.lathe(g, GK.black, [[.0152, -.019], [.0166, -.0175], [.0166, -.012], [.0152, -.012]], 0, A, 24);
  for (const [x, y, rz] of [[0, A + .0175, 0], [.0175, A, Math.PI / 2]]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.0052, .0052, .007, 14), GK.black); t.position.set(x, y, .003); t.rotation.z = rz; g.add(t); }   // ayar kuleleri
  const lens = new THREE.Mesh(new THREE.CircleGeometry(.0118, 24), lensMat); lens.position.set(0, A, -.0165); g.add(lens);
  const glow = new THREE.Sprite(dotGlow); glow.position.set(0, A, -.016); glow.scale.setScalar(.007); glow.renderOrder = 6; g.add(glow);
  const dot = new THREE.Sprite(dotCore); dot.position.set(0, A, -.0158); dot.scale.setScalar(.0021); dot.renderOrder = 7; g.add(dot);
  return { g, A };
}
function opticHolo() {
  const g = new THREE.Group(), A = .05, w = .036, h = .027, t = .0035, d = .03, zc = -.012;
  GK.rbox(g, GK.black, .03, .012, .074, 0, .006, 0, .002);                                 // taban ve pil yuvası
  GK.rbox(g, GK.black, .03, .016, .03, 0, .019, .02, .003);                                // arka gövde
  GK.box(g, GK.black, w + 2 * t, t, d, 0, A + h / 2 + t / 2, zc);                           // pencere çerçevesi: üst
  for (const s of [-1, 1]) GK.box(g, GK.black, t, h + t, d, s * (w / 2 + t / 2), A + t / 2, zc);   // yanlar
  GK.box(g, GK.black, w + 2 * t, .011, d, 0, A - h / 2 - .0055 + .002, zc);                // alt
  for (const x of [-.007, .007]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .004, 10), GK.dark); b.rotation.x = Math.PI / 2; b.position.set(x, .019, .036); g.add(b); }   // düğmeler
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lensMat); glass.position.set(0, A, zc - d / 2 + .002); g.add(glass);
  const ret = new THREE.Mesh(new THREE.PlaneGeometry(.023, .023), holoMat); ret.position.set(0, A, zc - d / 2 + .0028); ret.renderOrder = 7; g.add(ret);
  return { g, A };
}

/* ================= TAKMA ================= */
function sightModel(w) { return w === 'm4' ? m4m : w === 'ak47' ? gunModels.ak47 : null; }
function applySight(w, id) {
  const m = sightModel(w), C = SIGHT_GUNS[w]; if (!m || !C) return;
  if (sightNow[w]) { m.g.remove(sightNow[w].g); sightNow[w] = null; }
  const S = SIGHTS.find(s => s.id === id) || SIGHTS[0], iron = S.id === 'iron' || !sightOpen(S);
  if (m.rear) m.rear.visible = iron;
  let axis = C.ironY, z = C.ironZ;
  if (!iron) {
    const o = S.id === 'holo' ? opticHolo() : opticRedDot();
    o.g.position.set(0, C.mountY, C.mountZ); m.g.add(o.g); sightNow[w] = o;
    axis = C.mountY + o.A; z = C.optZ;
  }
  const ads = w === 'm4' ? M4_ADS : GUNS.ak47.adsP;
  ads.p.y = -axis; ads.p.z = z;
  linearizeViewmodel();
}
function setSight(w, id) {
  const S = SIGHTS.find(s => s.id === id); if (!S || !sightOpen(S)) { sfx.empty(); return; }
  sightSel[w] = id; try { localStorage.setItem('kk-nisangah', JSON.stringify(sightSel)); } catch (e) { /* kayıt yok */ }
  applySight(w, id); renderSights(); if (typeof applyAparat === 'function') applyAparat();
  if (typeof ws !== 'undefined' && ws.open) wsBuild(w);
}
// Atölye ekranında nişangah satırı (yalnız M4 ve AK-47)
function renderSights() {
  const box = $('sightRow'), w = skinUI.w;
  box.hidden = !SIGHT_GUNS[w]; if (box.hidden) return;
  const cur = sightSel[w] || 'iron';
  box.innerHTML = '<b>NİŞANGAH</b>' + SIGHTS.map(S => {
    const open = sightOpen(S);
    return `<button type="button" data-s="${S.id}" class="${S.id === cur ? 'on' : ''}${open ? '' : ' locked'}"><b>${S.name}</b><small>${open ? S.info : '🔒 ' + S.need + ' leşte açılır (' + Math.min(kkStats.kills, S.need) + '/' + S.need + ')'}</small></button>`;
  }).join('');
}
$('sightRow').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setSight(skinUI.w, b.dataset.s); });
for (const w in SIGHT_GUNS) if (sightSel[w] && sightSel[w] !== 'iron') applySight(w, sightSel[w]);
// eklenti ve kaplama görevleri: her leşte yeni açılanlar duyurulur; açılışta eklentiler silahlara uygulanır
killHooks.push(info => apCheckUnlocks(info.w));
applyAparat();
