'use strict';
/* SİLAH KAPLAMALARI (skin): her silah ve bıçak için desen seçilir, tarayıcıda saklanır.
   Kaplama silahın gövde parçalarına (alüminyum, polimer, ahşap, çelik) uygulanır; nişangâh, eller, mermi ve ağız
   parlaması değişmez. Bıçaklarda ağzın yüzeyi kaplanır, keskin kenar çelik kalır. Ana menü → KAPLAMALAR.
   F ile incelerken (ve atış poligonunda) kaplamanı görürsün. */

const sk = (draw) => { const t = canvasTex(256, draw, 6, 6); return t; };
function camoDraw(cols) {
  return (g, s) => {
    g.fillStyle = cols[0]; g.fillRect(0, 0, s, s);
    for (let k = 1; k < cols.length; k++) for (let i = 0; i < 26; i++) {
      g.fillStyle = cols[k]; g.beginPath();
      const x = Math.random() * s, y = Math.random() * s, r = 10 + Math.random() * 26;
      for (let a = 0; a < 6.3; a += .5) { const rr = r * (.6 + Math.random() * .5); g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr); }
      g.fill();
    }
  };
}
const SKINS = [
  { id: 'std', name: 'FABRİKA', sw: '#2a2c30' },
  { id: 'kizil', name: 'KIZIL EJDER', sw: '#8a1a12', tex: sk((g, s) => {
      g.fillStyle = '#7a140e'; g.fillRect(0, 0, s, s);
      for (let y = 0; y < s + 16; y += 16) for (let x = (y / 16) % 2 ? 8 : 0; x < s + 16; x += 16) {
        const gr = g.createRadialGradient(x, y - 4, 1, x, y, 12); gr.addColorStop(0, '#c4301e'); gr.addColorStop(.7, '#6a100a'); gr.addColorStop(1, '#1a0402');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 10, 0, Math.PI); g.fill();
      }
    }), rough: .4, metal: .35 },
  { id: 'orman', name: 'ORMAN KAMUFLAJI', sw: '#3e4a2a', tex: sk(camoDraw(['#4a5432', '#2c3420', '#6a6040', '#1a1c14'])), rough: .7, metal: .1 },
  { id: 'col', name: 'ÇÖL KAMUFLAJI', sw: '#a08a62', tex: sk(camoDraw(['#b49a6c', '#8a7048', '#cdb88a', '#6a5236'])), rough: .72, metal: .1 },
  { id: 'kis', name: 'KIŞ DİJİTAL', sw: '#c8ccd0', tex: sk((g, s) => {
      g.fillStyle = '#d8dce0'; g.fillRect(0, 0, s, s);
      const c = ['#9aa0a8', '#6a7078', '#f4f6f8', '#3a4048'];
      for (let i = 0; i < 260; i++) { g.fillStyle = c[i % 4]; const x = (Math.random() * 32 | 0) * 8, y = (Math.random() * 32 | 0) * 8, w = 8 * (1 + (Math.random() * 3 | 0)), h = 8 * (1 + (Math.random() * 2 | 0)); g.fillRect(x, y, w, h); }
    }), rough: .65, metal: .1 },
  { id: 'kaplan', name: 'KAPLAN', sw: '#d0761e', tex: sk((g, s) => {
      g.fillStyle = '#d27a20'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#140c06';
      for (let i = 0; i < 14; i++) { const y = Math.random() * s, w = 6 + Math.random() * 10; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * .05 + i) * 14 + (Math.random() - .5) * 6); for (let x = s; x >= 0; x -= 16) g.lineTo(x, y + w + Math.sin(x * .05 + i) * 14 - Math.random() * 4); g.fill(); }
    }), rough: .45, metal: .2 },
  { id: 'karbon', name: 'KARBON', sw: '#1c1e22', tex: sk((g, s) => {
      for (let y = 0; y < s; y += 8) for (let x = 0; x < s; x += 8) { const a = ((x + y) / 8) % 2; const gr = g.createLinearGradient(x, y, a ? x + 8 : x, a ? y : y + 8); gr.addColorStop(0, '#0e0f11'); gr.addColorStop(.5, '#34373c'); gr.addColorStop(1, '#0e0f11'); g.fillStyle = gr; g.fillRect(x, y, 8, 8); }
    }), rough: .3, metal: .4 },
  { id: 'gece', name: 'GECE MAVİSİ', sw: '#2a2a6a', tex: sk((g, s) => {
      const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#1a1a5a'); gr.addColorStop(.5, '#3a2a7a'); gr.addColorStop(1, '#14306a');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(Math.random() * s, Math.random() * s, 1, 1); }
    }), rough: .22, metal: .85 },
  { id: 'altin', name: 'ALTIN', sw: '#d8a83a', color: 0xd8a83a, rough: .22, metal: .95, envI: 1 },
  { id: 'buz', name: 'BUZ', sw: '#9ad8f0', tex: sk((g, s) => {
      g.fillStyle = '#9fd4ea'; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5;
      for (let i = 0; i < 22; i++) { g.beginPath(); let x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - .5) * 60; y += (Math.random() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
      for (let i = 0; i < 40; i++) wrapBlob(g, s, Math.random() * s, Math.random() * s, 8 + Math.random() * 20, 'rgba(40,110,160,.25)');
    }), rough: .18, metal: .6 },
];
const SKIN_WEAPONS = [['ak47', 'AK-47'], ['m4', 'M4'], ['awp', 'AWP'], ['deagle', 'DEAGLE'], ['usps', 'USP-S'], ['glock', 'GLOCK'], ['pistol', 'TABANCA'], ['shotgun', 'POMPALI'], ['uzi', 'UZİ'], ['knife', 'BIÇAK'], ['karambit', 'KARAMBİT'], ['butterfly', 'KELEBEK']];
// tüfeklerde namlu ve çelik parçalar kaplanmaz (kontrast kalsın); tabancalarda sürgü çelik olduğundan o da kaplanır
const SKIN_BASE = new Set([GK.black, GK.blued, GK.poly, GK.fde, GK.od, GK.sniper, GK.bakelite, GK.wood, GK.woodDark, GK.grip]);
const SKIN_BASE_P = new Set([...SKIN_BASE, GK.steel]);
const SKIN_PISTOLS = new Set(['deagle', 'usps', 'glock', 'pistol']);
const SKIN_KNIFE = new Set([KN_FLAT, KN_G10, KN_G10R]);
const skinSel = (() => { try { return JSON.parse(localStorage.getItem('kk-kaplama') || '{}'); } catch (e) { return {}; } })();
const skinMats = new Map();
function skinRoot(w) {
  const k = typeof knifeModels !== 'undefined' ? knifeModels : {};
  return { ak47: gunRoots.ak47, deagle: gunRoots.deagle, usps: gunRoots.usps, glock: gunRoots.glock, m4: m4Root, awp: awpRoot, pistol: pisRoot, shotgun: sgRoot, uzi: uziRoot, knife: k.knife && k.knife.g, karambit: k.karambit && k.karambit.g, butterfly: k.butterfly && k.butterfly.g }[w];
}
function skinMat(base, S) {
  const key = base.uuid + S.id; if (skinMats.has(key)) return skinMats.get(key);
  const m = base.clone(); delete m.userData.lin;   // linearizeViewmodel rengi yeniden doğrusala çevirsin
  if (S.tex) { m.map = S.tex; m.color.setHex(0xffffff); }
  if (S.color != null) { m.map = null; m.color.setHex(S.color); }
  if (S.rough != null) m.roughness = S.rough;
  if (S.metal != null) m.metalness = S.metal;
  m.roughnessMap = null; m.userData.envI = S.envI != null ? S.envI : .35 + (S.metal || 0) * .5;
  m.needsUpdate = true; skinMats.set(key, m);
  return m;
}
function applySkin(w, id) {
  const root = skinRoot(w); if (!root) return;
  skinTo(root, w, id);
  linearizeViewmodel();
}
// kaplamayı bir modele uygula (eldeki silah ya da atölyedeki büyük model)
function skinTo(root, w, id) {
  const S = SKINS.find(s => s.id === id) || SKINS[0], knife = w === 'knife' || w === 'karambit' || w === 'butterfly';
  root.traverse(o => {
    if (!o.isMesh) return;
    const base = o.userData.skinBase || o.material;
    if (!(knife ? SKIN_KNIFE : SKIN_PISTOLS.has(w) ? SKIN_BASE_P : SKIN_BASE).has(base)) return;
    o.userData.skinBase = base;
    o.material = S.id === 'std' ? base : skinMat(base, S);
  });
}
function setSkin(w, id) {
  skinSel[w] = id; try { localStorage.setItem('kk-kaplama', JSON.stringify(skinSel)); } catch (e) { /* kayıt yok */ }
  applySkin(w, id); renderSkins();
}

/* ================= SEÇİM EKRANI ================= */
const skinUI = { w: 'ak47' };
function swatchUrl(S) {
  if (!S.tex) return S.sw;
  return 'url(' + S.tex.image.toDataURL() + ')';
}
function renderSkins() {
  const tabs = SKIN_WEAPONS.map(([w, n]) => `<button type="button" data-w="${w}" class="${w === skinUI.w ? 'on' : ''}">${iconFor(w) ? `<img src="${iconFor(w)}" alt="">` : ''}${n}</button>`).join('');
  const cur = skinSel[skinUI.w] || 'std';
  const grid = SKINS.map(S => `<button type="button" class="sk${S.id === cur ? ' on' : ''}" data-s="${S.id}"><i style="background:${S.tex ? swatchUrl(S) + ' center/120px' : S.sw}"></i><b>${S.name}</b></button>`).join('');
  $('skinTabs').innerHTML = tabs; $('skinGrid').innerHTML = grid;
  if (typeof renderSights === 'function') renderSights();
  if (typeof ws !== 'undefined' && ws.open) wsBuild(skinUI.w);   // canlı 3D görünüm
}
$('skinTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; skinUI.w = b.dataset.w; renderSkins(); });
$('skinGrid').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setSkin(skinUI.w, b.dataset.s); });
$('skinsBtn').addEventListener('click', () => { $('start').hidden = true; $('skins').hidden = false; wsShow(true); renderSkins(); });
$('skinsBack').addEventListener('click', () => { wsShow(false); $('skins').hidden = true; $('start').hidden = false; });
$('skinsTry').addEventListener('click', () => {
  wsShow(false); $('skins').hidden = true;
  leaveRoom(true); net.gameMode = 'range'; resetGame(); play();
  const w = skinUI.w;
  if (RANGE_W.includes(w)) { wpn.cur = w; wpn.next = null; }
  toast('F İLE İNCELE · KAPLAMANI GÖR');
});
for (const [w] of SKIN_WEAPONS) if (skinSel[w] && skinSel[w] !== 'std') applySkin(w, skinSel[w]);
