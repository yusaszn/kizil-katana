'use strict';
/* ATÖLYE EKLENTİLERİ (aparat): her ateşli silaha NAMLU, DİPÇİK, TUTAMAÇ, ŞARJÖR ve BONUS yuvası (DÜRBÜN: eklenti.js).
   Her seçeneğin artısı ve eksisi var; değerler çarpan olarak silahın kendi değerlerine uygulanır (A(silah)).
   Varsayılan seçenek ücretsiz; diğerleri her biri kendi görevini bitirince açılır (görev sayaçları: eklenti.js statKill).
   Kaplamalar o silahla yapılan leşe göre kötüden iyiye açılır. Seçimler bu cihazda saklanır.
   Bu dosya erken yüklenir (yalnız veri ve hesap); silah tablolarına uygulama ve arayüz sonra çağrılır. */

const AP_SLOTS = [['namlu', 'NAMLU'], ['dipcik', 'DİPÇİK'], ['tutamac', 'TUTAMAÇ'], ['sarjor', 'ŞARJÖR'], ['bonus', 'BONUS']];
// silah sınıfı: hangi yuvalar ve seçenekler olur
const AP_CLS = { ak47: 'tufek', m4: 'tufek', awp: 'keskin', fenek: 'hafif', uzi: 'hafif', shotgun: 'pompa', deagle: 'tabanca', usps: 'tabanca', glock: 'tabanca', pistol: 'tabanca' };
const AP_STATS = [['dmg', 'HASAR', 1], ['range', 'MENZİL', 1], ['spread', 'İSABET', -1], ['recoil', 'GERİ TEPME', -1], ['ads', 'NİŞAN HIZI', 1], ['move', 'HAREKET', 1], ['mag', 'ŞARJÖR', 1], ['reload', 'DOLDURMA', -1], ['rate', 'ATIŞ HIZI', 1]];
// görev: s sayaç ('kills' leş, 'hs' kafadan, 'ns' dürbünsüz, 'air' havadayken, 'smk' sisin içinden, 'kor' körken), n hedef
const AP_TASK_TXT = { kills: 'leş', hs: 'kafadan vuruş', ns: 'dürbünsüz leş', air: 'havadayken leş', smk: 'sisin içinden leş', kor: 'körken leş' };
// seçenekler: m çarpanlar (yoksa 1), only/not sınıf ya da silah listesi, note ek açıklama (artı ya da eksi), t görev
const AP_OPTS = {
  namlu: [
    { id: 'std', name: 'STANDART NAMLU', m: {} },
    { id: 'komp', name: 'KOMPANSATÖR', m: { recoil: .75, spread: 1.1 }, note: ['', 'daha çok alev'], t: { s: 'kills', n: 15 } },
    { id: 'kisa', name: 'KISA NAMLU', m: { ads: 1.2, move: 1.05, range: .8, spread: 1.15 }, not: ['tabanca'], t: { s: 'kills', n: 25 } },
    { id: 'uzun', name: 'UZUN NAMLU', m: { range: 1.3, spread: .85, ads: .85, move: .95 }, t: { s: 'hs', n: 10 } },
    { id: 'sus', name: 'SUSTURUCU', m: { range: .85, dmg: .95 }, silent: true, note: ['sessiz, alev ve iz yok', ''], not: ['usps'], t: { s: 'kills', n: 60 } },
  ],
  dipcik: [
    { id: 'std', name: 'STANDART DİPÇİK', m: {} },
    { id: 'hafif', name: 'HAFİF DİPÇİK', m: { ads: 1.15, move: 1.05, recoil: 1.15 }, t: { s: 'kills', n: 20 } },
    { id: 'agir', name: 'AĞIR DİPÇİK', m: { recoil: .8, spread: .9, ads: .85, move: .94 }, t: { s: 'hs', n: 15 } },
    { id: 'yok', name: 'DİPÇİKSİZ', m: { move: 1.1, ads: 1.3, recoil: 1.35, spread: 1.2 }, only: ['hafif', 'pompa'], t: { s: 'air', n: 3 } },
  ],
  tutamac: [
    { id: 'yok', name: 'TUTAMAÇSIZ', m: {} },
    { id: 'acili', name: 'AÇILI TUTAMAÇ', m: { ads: 1.12, recoil: .92, spread: 1.05 }, t: { s: 'kills', n: 30 } },
    { id: 'dikey', name: 'DİKEY TUTAMAÇ', m: { recoil: .82, ads: .9 }, t: { s: 'hs', n: 20 } },
  ],
  sarjor: [
    { id: 'std', name: 'STANDART ŞARJÖR', m: {} },
    { id: 'hizli', name: 'HIZLI ŞARJÖR', m: { reload: .7, mag: .85 }, t: { s: 'kills', n: 35 } },
    { id: 'uzun', name: 'UZATILMIŞ ŞARJÖR', m: { mag: 1.5, reload: 1.2, ads: .92 }, t: { s: 'kills', n: 50 } },
    { id: 'davul', name: 'DAVUL ŞARJÖR', m: { mag: 2.2, reload: 1.6, move: .9, ads: .8 }, only: ['ak47', 'uzi', 'fenek'], t: { s: 'kills', n: 100 } },
  ],
  bonus: [
    { id: 'yok', name: 'BONUS YOK', m: {} },
    { id: 'bantli', name: 'BANTLI ÇİFT ŞARJÖR', m: { reload: .65, move: .97 }, note: ['iki şarjör birbirine bantlı', ''], only: ['ak47'], t: { s: 'hs', n: 50 } },
    { id: 'tetik', name: 'SERİ TETİK', m: { rate: 1.15, recoil: 1.15 }, only: ['m4'], t: { s: 'kills', n: 150 } },
    { id: 'mekanizma', name: 'HIZLI MEKANİZMA', m: { rate: 1.35, spread: 1.25 }, note: ['sürgü daha çabuk', ''], only: ['awp'], t: { s: 'ns', n: 10 } },
    { id: 'delici', name: 'DELİCİ MERMİ', m: { dmg: 1.2, rate: .85, recoil: 1.2 }, only: ['deagle'], t: { s: 'hs', n: 30 } },
    { id: 'hassas', name: 'HASSAS TETİK', m: { spread: .7, rate: .85 }, only: ['usps'], t: { s: 'hs', n: 25 } },
    { id: 'seri', name: 'TAM OTOMATİK', m: { rate: 1.3, spread: 1.3, recoil: 1.2 }, auto: true, note: ['basılı tutunca seri atar', ''], only: ['glock'], t: { s: 'air', n: 10 } },
    { id: 'hafif', name: 'HAFİF TETİK', m: { rate: 1.25, spread: 1.15 }, only: ['pistol'], t: { s: 'kills', n: 80 } },
    { id: 'agir', name: 'AĞIR SAÇMA', m: { dmg: 1.25, range: .75, reload: 1.1 }, only: ['shotgun'], t: { s: 'kills', n: 120 } },
    { id: 'cift', name: 'ÇİFT UZİ', m: { rate: 1.65, mag: 2, spread: 1.25, move: .95 }, dual: true, note: ['iki elde iki UZİ', ''], only: ['uzi'], t: { s: 'kills', n: 100 } },
    { id: 'hiz', name: 'HIZ KİTİ', m: { rate: 1.15, recoil: 1.2, spread: 1.1 }, only: ['fenek'], t: { s: 'kills', n: 200 } },
  ],
};
// kaplamalar o silahla yapılan leşle açılır (kötüden iyiye)
const SKIN_NEED = { std: 0, orman: 10, col: 20, kis: 40, kaplan: 50, karbon: 60, gece: 80, buz: 100, kizil: 150, altin: 200 };

/* ADMİN: adres çubuğunda ?admin=KOD (kod yalnız özeti tutulur) → bu cihazda bütün eklenti, kaplama ve nişangah açık; ?admin=0 kapatır */
let apAdminOn = false;
try { apAdminOn = localStorage.getItem('kk-admin') === '1'; } catch (e) { /* kayıt yok */ }
const apAdmin = () => apAdminOn;
(() => {
  const q = new URLSearchParams(location.search).get('admin'); if (q == null) return;
  if (q === '0') { apAdminOn = false; try { localStorage.removeItem('kk-admin'); } catch (e) { /* yok */ } return; }
  if (!crypto || !crypto.subtle) return;
  crypto.subtle.digest('SHA-256', new TextEncoder().encode(q)).then(b => {
    const h = [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
    if (h !== '540746a2c84bfafbe9bbd206487cbb4d9fd14411a55025b790e9eb5965f0950e') return;
    apAdminOn = true; try { localStorage.setItem('kk-admin', '1'); } catch (e) { /* yok */ }
    if (typeof applyAparat === 'function') applyAparat();
    if (typeof toast === 'function') toast('ADMİN · HER ŞEY AÇIK');
  });
})();
const apSel = (() => { try { return JSON.parse(localStorage.getItem('kk-aparat') || '{}'); } catch (e) { return {}; } })();
const apSaid = (() => { try { return JSON.parse(localStorage.getItem('kk-aparat-acilan') || '{}'); } catch (e) { return {}; } })();
const apFits = (w, o) => (!o.only || o.only.includes(w) || o.only.includes(AP_CLS[w])) && !(o.not && (o.not.includes(w) || o.not.includes(AP_CLS[w])));
// silahın yuvaları (tabancada dipçik ve tutamaç yok, keskin nişancıda tutamaç yok)
function apSlotsOf(w) {
  const c = AP_CLS[w]; if (!c) return [];
  return AP_SLOTS.filter(([s]) => !(c === 'tabanca' && (s === 'dipcik' || s === 'tutamac')) && !(c === 'keskin' && s === 'tutamac') && AP_OPTS[s].filter(o => apFits(w, o)).length > 1).map(([s]) => s);
}
const apOpts = (w, s) => AP_OPTS[s].filter(o => apFits(w, o));
// görev ilerlemesi: { v, n, done, txt }
function apTask(w, t) {
  if (!t) return { v: 0, n: 0, done: true, txt: '' };
  if (apAdmin()) return { v: t.n, n: t.n, done: true, txt: '' };
  const ws = (apStatsAll().w || {})[w] || {}, v = Math.min(t.n, ws[t.s] || 0);
  return { v, n: t.n, done: v >= t.n, txt: (WEAPON_NAMES_AP[w] || w.toUpperCase()) + ' ile ' + t.n + ' ' + AP_TASK_TXT[t.s] };
}
const apStatsAll = () => (typeof kkStats !== 'undefined' ? kkStats : { w: {} });   // eklenti.js sonra yüklenir
const WEAPON_NAMES_AP = { ak47: 'AK-47', m4: 'M4', awp: 'AWP', deagle: 'DEAGLE', usps: 'USP-S', glock: 'GLOCK', pistol: 'TABANCA', shotgun: 'POMPALI', uzi: 'UZİ', fenek: 'FENEK', knife: 'BIÇAK', karambit: 'KARAMBİT', butterfly: 'KELEBEK' };
const apOpen = (w, o) => apTask(w, o.t).done;
// önizleme (Atölye'de kilitli eklentiye tıklayınca): yalnız görünüm ve değerler, kuşanılmaz; Atölye'den çıkınca kalkar
let apPrev = null;
function apPreview(w, s, id) { const p = id ? { w, s, id } : null; if (JSON.stringify(p) === JSON.stringify(apPrev)) return; apPrev = p; applyAparat(); }
function apCur(w, s) {
  const list = apOpts(w, s);
  if (apPrev && apPrev.w === w && apPrev.s === s) { const q = list.find(o => o.id === apPrev.id); if (q) return q; }
  const id = (apSel[w] || {})[s], o = list.find(q => q.id === id);
  return o && apOpen(w, o) ? o : list[0];
}
// silahın toplam çarpanları (önbellekli; seçim değişince sıfırlanır)
const apCache = {};
function A(w) {
  if (apCache[w]) return apCache[w];
  const r = { dmg: 1, range: 1, spread: 1, recoil: 1, ads: 1, move: 1, mag: 1, reload: 1, rate: 1, silent: false, dual: false, auto: false };
  for (const s of apSlotsOf(w)) { const o = apCur(w, s); for (const k in o.m) r[k] *= o.m[k]; if (o.silent) r.silent = true; if (o.dual) r.dual = true; if (o.auto) r.auto = true; }
  if (typeof sightStats === 'function') { const q = sightStats(w); for (const k in q) r[k] *= q[k]; }
  return (apCache[w] = r);
}
const apMove = () => (AP_CLS[wpn.cur] ? A(wpn.cur).move : 1);
function apSave() { try { localStorage.setItem('kk-aparat', JSON.stringify(apSel)); localStorage.setItem('kk-aparat-acilan', JSON.stringify(apSaid)); } catch (e) { /* kayıt yok */ } }
// artılar ve eksiler (çarpanlardan yazı)
function apProsCons(o) {
  const pro = [], con = [];
  const W = { dmg: ['hasar', 'artar', 'azalır'], range: ['menzil', 'artar', 'azalır'], spread: ['isabet', 'azalır', 'artar'], recoil: ['geri tepme', 'artar', 'azalır'], ads: ['nişan alma', 'hızlanır', 'yavaşlar'], move: ['hareket', 'hızlanır', 'yavaşlar'], mag: ['şarjör', 'büyür', 'küçülür'], reload: ['doldurma', 'uzar', 'kısalır'], rate: ['atış hızı', 'artar', 'azalır'] };
  for (const [k, , dir] of AP_STATS) {
    const v = o.m[k]; if (v == null || v === 1) continue;
    const p = Math.round(Math.abs(v - 1) * 100), good = (v > 1) === (dir > 0), w = W[k];
    (good ? pro : con).push(w[0] + ' %' + p + ' ' + (v > 1 ? w[1] : w[2]));
  }
  if (o.note) { if (o.note[0]) pro.push(o.note[0]); if (o.note[1]) con.push(o.note[1]); }
  return { pro, con };
}
// silahın taban değerleri (stat çubukları için 0-1 arası, kabaca); çarpanla birlikte gösterilir
function apBase(w) {
  const G = typeof GUNS !== 'undefined' && GUNS[w] && GUNS_AP_BASE[w];
  if (G) return { dmg: G.pvp / 60, range: G.falloff / 40, spread: 1 - Math.min(1, G.spread / .05), recoil: 1 - Math.min(1, G.recoil / .07), ads: .6, move: (G.move || 1) * .65, mag: G.mag / 60, reload: 1 - G.reload / 3, rate: G.rate / 20 };
  const T = { m4: { dmg: 22, range: 30, spread: .022, recoil: .009, mag: 30, reload: 1.9, rate: 10 }, awp: { dmg: 150, range: 60, spread: .07, recoil: .07, mag: 5, reload: 2.3, rate: .8 }, pistol: { dmg: 26, range: 25, spread: .014, recoil: .02, mag: 12, reload: 1.3, rate: 7 }, uzi: { dmg: 8, range: 15, spread: .022, recoil: .0035, mag: 30, reload: 1.4, rate: 8.4 }, shotgun: { dmg: 60, range: 8, spread: .085, recoil: .06, mag: 6, reload: 2.5, rate: 1.6 } }[w];
  if (!T) return null;
  return { dmg: Math.min(1, T.dmg / 60), range: T.range / 40, spread: 1 - Math.min(1, T.spread / .09), recoil: 1 - Math.min(1, T.recoil / .07), ads: .6, move: .65, mag: Math.min(1, T.mag / 60), reload: 1 - T.reload / 3, rate: Math.min(1, T.rate / 20) };
}
const GUNS_AP_BASE = {};
const RIF_AP_BASE = {};
// silah tablolarına uygula (GUNS ve RIF taban kopyadan yeniden hesaplanır; UZİ, POMPALI, M4/AWP şarjörü kullanıldığı yerde A() ile)
function applyAparat() {
  for (const k in apCache) delete apCache[k];
  if (typeof GUNS !== 'undefined') for (const w in GUNS) {
    const G = GUNS[w], B = GUNS_AP_BASE[w] || (GUNS_AP_BASE[w] = { rate: G.rate, reload: G.reload, mag: G.mag, dmg: G.dmg, pvp: G.pvp, falloff: G.falloff, spread: G.spread, ads: G.ads, recoil: G.recoil, recoilYaw: G.recoilYaw, auto: G.auto, silenced: !!G.silenced, move: G.move });
    const m = A(w);
    Object.assign(G, { rate: B.rate * m.rate, reload: B.reload * m.reload, mag: Math.max(1, Math.round(B.mag * m.mag)), dmg: B.dmg * m.dmg, pvp: Math.round(B.pvp * m.dmg), falloff: B.falloff * m.range, spread: B.spread * m.spread, ads: B.ads * m.spread, recoil: B.recoil * m.recoil, recoilYaw: B.recoilYaw * m.recoil, auto: B.auto || m.auto, silenced: B.silenced || m.silent });
    if (typeof gst !== 'undefined' && gst[w] && gst[w].mag > G.mag) gst[w].mag = G.mag;
  }
  if (typeof RIF !== 'undefined') for (const w of ['m4', 'awp', 'pistol']) {
    const R = RIF[w], B = RIF_AP_BASE[w] || (RIF_AP_BASE[w] = Object.assign({}, R)), m = A(w);
    R.reload = B.reload * m.reload; R.spread = B.spread * m.spread; if (B.ads != null) R.ads = B.ads * m.spread;
    R.dmg = B.dmg * m.dmg; R.pvp = Math.round(B.pvp * m.dmg);
    if (w === 'pistol') R.mag = Math.max(1, Math.round(B.mag * m.mag));
  }
  if (typeof apDressAll === 'function') apDressAll();
}
function setAparat(w, s, id) {
  const o = apOpts(w, s).find(q => q.id === id); if (!o) return;
  if (!apOpen(w, o)) { if (typeof sfx !== 'undefined') sfx.empty(); return; }
  (apSel[w] || (apSel[w] = {}))[s] = id; apSave(); applyAparat();
}
// her leşte: yeni açılan eklenti ve kaplama duyurulur (bir kez)
function apCheckUnlocks(w) {
  if (!AP_CLS[w] && !['knife', 'karambit', 'butterfly'].includes(w)) return;
  const said = apSaid[w] || (apSaid[w] = {}), got = [];
  for (const s of apSlotsOf(w)) for (const o of apOpts(w, s)) if (o.t && !said[o.id + s] && apOpen(w, o)) { said[o.id + s] = 1; got.push(o.name); }
  const k = ((apStatsAll().w || {})[w] || {}).kills || 0;
  if (typeof SKINS !== 'undefined') for (const S of SKINS) { const n = SKIN_NEED[S.id] || 0; if (n && k >= n && !said['sk_' + S.id]) { said['sk_' + S.id] = 1; got.push(S.name + ' kaplama'); } }
  if (got.length) { apSave(); banner('YENİ EKLENTİ', (WEAPON_NAMES_AP[w] || w) + ': ' + got.join(' · ') + ' · ATÖLYE'); if (typeof sfx !== 'undefined') sfx.upgrade(); applyAparat(); }
}
const skinNeed = id => SKIN_NEED[id] || 0;
const skinOpen = (w, id) => apAdmin() || ((((apStatsAll().w || {})[w]) || {}).kills || 0) >= skinNeed(id);
const skinEff = w => { const id = (typeof skinSel !== 'undefined' && skinSel[w]) || 'std'; return skinOpen(w, id) ? id : 'std'; };   // kilitliyse fabrika

/* ================= 3D: eklentiler silahın üstünde (birinci şahıs ve Atölye görünümü) =================
   Namlu ucuna susturucu / kompansatör / uzun namlu, namlu altına tutamaç, şarjörün altına uzatma ya da davul.
   Parçalar seçim değişince bir kez kurulur. Ağız alevi eklentinin ucuna taşınır. */
let apTabMat = null;
function apLocalBox(root, part) {   // parçanın kendi ekseninde sınır kutusu
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(part.matrixWorld).invert(), box = new THREE.Box3(), tb = new THREE.Box3(), mm = new THREE.Matrix4();
  part.traverse(o => { if (!o.isMesh || o.userData.ap || !o.geometry) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); mm.multiplyMatrices(inv, o.matrixWorld); tb.copy(o.geometry.boundingBox).applyMatrix4(mm); box.union(tb); });
  return box;
}
function apDress(w, m) {
  if (!m || !m.g || typeof GK === 'undefined' || !GK.black) return;
  const ud = m.g.userData;
  for (const c of ud.apG || []) if (c.parent) c.parent.remove(c);
  ud.apG = [];
  const add = (mesh, parent) => { mesh.userData.ap = true; parent.add(mesh); ud.apG.push(mesh); return mesh; };
  const pist = AP_CLS[w] === 'tabanca', r = pist ? .0105 : w === 'awp' ? .017 : .015;
  // namlu ucu
  if (m.flash) {
    if (ud.flashZ0 == null) ud.flashZ0 = m.flash.position.z;
    const mu = m.flash.position, z0 = ud.flashZ0, n = apCur(w, 'namlu').id; mu.z = z0;
    if (n === 'sus' || n === 'komp' || n === 'uzun') {
      const len = n === 'sus' ? (pist ? .095 : .15) : n === 'komp' ? .045 : .11, rad = n === 'sus' ? r * 1.35 : n === 'komp' ? r * 1.15 : r * .55;
      const c = add(new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 16), n === 'uzun' ? GK.steel || GK.black : GK.black), m.g); c.userData.slot = 'namlu';
      c.rotation.x = Math.PI / 2; c.position.set(mu.x, mu.y, z0 - len / 2 + .006);
      if (n === 'komp') for (const s of [-1, 1]) { const p = add(new THREE.Mesh(new THREE.BoxGeometry(.004, rad * .9, len * .5), GK.dark || GK.black), m.g); p.position.set(mu.x + s * rad * .95, mu.y + rad * .25, z0 - len * .5); }
      if (n === 'sus') for (const k of [.18, .82]) { const b = add(new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.04, rad * 1.04, .006, 16), GK.dark || GK.black), m.g); b.rotation.x = Math.PI / 2; b.position.set(mu.x, mu.y, z0 - len * k + .006); }
      mu.z = z0 - len;
    }
    // namlu altı tutamaç (pompalıda pompaya takılır, onunla gidip gelir)
    const t = apSlotsOf(w).includes('tutamac') ? apCur(w, 'tutamac').id : 'yok';
    if (t !== 'yok') {
      const par = m.pump || m.g, bz = m.pump ? 0 : z0 * (w === 'uzi' ? .62 : w === 'fenek' ? .72 : .5), by = (m.pump ? -.02 : mu.y - .034);
      const g = add(new THREE.Mesh(new THREE.BoxGeometry(.02, t === 'dikey' ? .072 : .05, t === 'dikey' ? .024 : .05), GK.poly || GK.black), par);
      g.position.set(mu.x, by - (t === 'dikey' ? .036 : .02), bz); if (t === 'acili') g.rotation.x = -.55; g.userData.slot = 'tutamac';
      const cl = add(new THREE.Mesh(new THREE.BoxGeometry(.024, .008, .034), GK.black), par); cl.position.set(mu.x, by, bz);
    }
  }
  // şarjör: uzatma ya da davul, şarjörün altına (şarjör değiştirirken onunla iner)
  const sj = apSlotsOf(w).includes('sarjor') ? apCur(w, 'sarjor').id : 'std';
  if (m.mag && sj !== 'std') {
    const bb = apLocalBox(m.g, m.mag); if (bb.isEmpty()) return;
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, wx = Math.max(.012, bb.max.x - bb.min.x), wz = Math.max(.02, bb.max.z - bb.min.z), hy = bb.max.y - bb.min.y;
    let sjm = null;
    if (sj === 'uzun') { const e = sjm = add(new THREE.Mesh(new THREE.BoxGeometry(wx * .96, hy * .32, wz * .92), GK.black), m.mag); e.position.set(cx, bb.min.y - hy * .16 + .002, cz); }
    else if (sj === 'davul') { const R = Math.max(wz, hy * .45) * .7, d = sjm = add(new THREE.Mesh(new THREE.CylinderGeometry(R, R, wx * 2.4, 22), GK.black), m.mag); d.rotation.z = Math.PI / 2; d.position.set(cx, bb.min.y - R * .55, cz); }
    else if (sj === 'hizli') {
      if (!apTabMat) apTabMat = new THREE.MeshStandardMaterial({ color: 0xb0281c, roughness: .8 });
      const tb = sjm = add(new THREE.Mesh(new THREE.BoxGeometry(wx * .5, .022, wz * .3), apTabMat), m.mag); tb.position.set(cx, bb.min.y - .01, cz);
    }
    if (sjm) sjm.userData.slot = 'sarjor';
  }
}
// birinci şahıs silahları
function apDressAll() {
  if (typeof gunModels !== 'undefined') for (const w in gunModels) apDress(w, gunModels[w]);
  if (typeof m4m !== 'undefined') apDress('m4', m4m);
  if (typeof awpm !== 'undefined') apDress('awp', awpm);
  if (typeof pism !== 'undefined') apDress('pistol', pism);
  if (typeof sg !== 'undefined') apDress('shotgun', sg);
  if (typeof uzis !== 'undefined') for (const g of uzis) apDress('uzi', { g, flash: g.userData.flash, mag: g.userData.mag });
  if (typeof SKIN_WEAPONS !== 'undefined' && typeof applySkin === 'function') for (const [w] of SKIN_WEAPONS) applySkin(w, skinEff(w));   // yeni parçalar da kaplanır; kilitli kaplama fabrikaya döner
  else if (typeof linearizeViewmodel === 'function') linearizeViewmodel();
}
