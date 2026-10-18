'use strict';
/* Oyuncu değerleri ve boss sonrası güçlendirme seçimi */

const ST_BASE = {
  swordRange: 0,      // kılıca eklenen metre
  swordDmg: 1,        // kılıç hasar çarpanı
  swordArc: 1,        // kesik açısı çarpanı
  maxDash: 2,
  dashRecharge: 1.1,  // saniye / hak
  magSize: 30,        // tabanca başına şarjör
  maxMags: 4,         // taşınabilen yedek şarjör
  bulletDmg: .55,
  fireRate: 14,       // atış / saniye (iki tabanca toplam)
  reloadTime: 1.4,
  maxHp: 100,
  lifesteal: 0,
  blockReduce: .7,    // savunmada emilen hasar oranı
  parryWindow: .22,   // kusursuz savunma süresi
  kickPower: 1,
  moveSpeed: 7.6,    // yürüme; koşma bunun ~2 katı
  sgPellets: 8,       // pompalı saçma sayısı
  sgDmg: .7,          // saçma başına hasar
  sgSpread: 1,
  sgRange: 1,
  sgTube: 6,          // tüpteki fişek
  sgLoad: 1,          // fişek doldurma süresi çarpanı
  maxShells: 30,
  m4Dmg: 1, m4Mag: 30, m4Rate: 10,              // M4
  grenMax: 3, grenR: 5, grenDmg: 1,              // M4 bomba atar
  awpBolt: 1.25, awpDmg: 1, awpPierce: 6, awpMag: 5,
  regen: 0,          // saniyede can
  magnet: 1,         // küre çekme menzili çarpanı
  execute: false,    // canı %25 altındaki düşmana çift hasar
  // boss'tan gelen nadir özellikler
  airJumps: 0, twin: false, phoenix: false, bloodDash: false, stormMul: 1, sgAuto: false,
};
const ST = Object.assign({}, ST_BASE);
const owned = {};
const pct = (b, n) => '+%' + Math.round((Math.pow(b, n) - 1) * 100);
const perkStat = { vamp: 0, regen: 0 };   // panelde gösterilen toplam katkılar

const UPGRADES = [
  { id: 'reach', name: 'Uzun Çelik', tag: 'KATANA', max: 3, desc: 'Kılıç menzili +0,75 m. Katananın ağzı da uzar.', fx: n => '+' + (n * .75).toLocaleString('tr-TR') + ' m kılıç menzili', apply() { ST.swordRange += .75; } },
  { id: 'sharp', name: 'Keskin Ağız', tag: 'KATANA', max: 3, desc: 'Kılıç ve atılma hasarı +%35.', fx: n => pct(1.35, n) + ' kılıç / atılma hasarı', apply() { ST.swordDmg *= 1.35; } },
  { id: 'arc', name: 'Geniş Yay', tag: 'KATANA', max: 2, desc: 'Yatay kesiklerin açısı +%25. Kalabalığı tek seferde biçer.', fx: n => pct(1.25, n) + ' kesik açısı', apply() { ST.swordArc *= 1.25; } },
  { id: 'dash', name: 'Ekstra Atılma', tag: 'HAREKET', max: 3, desc: '+1 atılma hakkı.', fx: n => '+' + n + ' atılma hakkı', apply() { ST.maxDash += 1; player.charges += 1; } },
  { id: 'dashcd', name: 'Hızlı Nefes', tag: 'HAREKET', max: 2, desc: 'Atılma hakları %30 daha hızlı dolar.', fx: n => '%' + Math.round((1 - Math.pow(.7, n)) * 100) + ' daha hızlı dolum', apply() { ST.dashRecharge *= .7; } },
  { id: 'mag', name: 'Geniş Şarjör', tag: 'UZİ', max: 3, desc: 'Her uzinin şarjörü +%50 mermi alır.', fx: n => 'şarjör ' + ST.magSize + ' mermi', apply() { ST.magSize = Math.round(ST.magSize * 1.5); ammo.mag = magCap(); } },
  { id: 'mags', name: 'Ekstra Şarjör', tag: 'UZİ', max: 3, desc: '+2 yedek şarjör hakkı. Hepsi dolu gelir.', fx: n => '+' + n * 2 + ' yedek şarjör', apply() { ST.maxMags += 2; ammo.reserve = ST.maxMags; } },
  { id: 'bullet', name: 'Delici Mermi', tag: 'UZİ', max: 3, desc: 'Uzi mermilerinin hasarı +%40.', fx: n => pct(1.4, n) + ' uzi hasarı', apply() { ST.bulletDmg *= 1.4; } },
  { id: 'rate', name: 'Tetik Parmağı', tag: 'UZİ', max: 2, desc: 'Atış hızı +%25.', fx: n => pct(1.25, n) + ' atış hızı', apply() { ST.fireRate *= 1.25; } },
  { id: 'reload', name: 'Seri Değişim', tag: 'UZİ', max: 2, desc: 'Şarjör değiştirme %35 daha hızlı.', fx: n => '%' + Math.round((1 - Math.pow(.65, n)) * 100) + ' hızlı şarjör', apply() { ST.reloadTime *= .65; } },
  { id: 'hp', name: 'Demir Deri', tag: 'BEDEN', max: 3, desc: 'Maksimum can +25 ve can tamamen dolar.', fx: n => '+' + n * 25 + ' azami can', apply() { ST.maxHp += 25; player.hp = ST.maxHp; } },
  { id: 'vamp', name: 'Kan Emici', tag: 'BEDEN', max: 3, desc: 'Her leş +2 can verir (en fazla +6).', fx: n => '+' + n * 2 + ' can / leş · toplam ' + Math.round(perkStat.vamp), apply() { ST.lifesteal += 2; } },
  { id: 'regen', name: 'Kan Yenilenmesi', tag: 'BEDEN', max: 3, desc: 'Saniyede +1 can yenilenir.', fx: n => '+' + n + ' can / sn · toplam ' + Math.round(perkStat.regen), apply() { ST.regen += 1; } },
  { id: 'magnet', name: 'Ruh Mıknatısı', tag: 'BEDEN', max: 2, desc: 'Can ve cephane küreleri %60 daha uzaktan, daha hızlı sana gelir.', fx: n => pct(1.6, n) + ' çekim menzili', apply() { ST.magnet *= 1.6; } },
  { id: 'execute', name: 'Cellat İçgüdüsü', tag: 'GENEL', max: 1, desc: 'Canı %25\'in altına düşmüş düşmanlara bütün silahlarla çift hasar.', fx: () => '%25 altı canda 2× hasar', apply() { ST.execute = true; } },
  { id: 'm4dmg', name: 'Ağır Kurşun', tag: 'M4', max: 3, desc: 'M4 mermi hasarı +%30.', fx: n => pct(1.3, n) + ' M4 hasarı', apply() { ST.m4Dmg *= 1.3; } },
  { id: 'm4mag', name: 'Davul Şarjör', tag: 'M4', max: 2, desc: 'M4 şarjörü +15 mermi alır.', fx: n => 'şarjör ' + ST.m4Mag + ' mermi', apply() { ST.m4Mag += 15; m4.mag = ST.m4Mag; } },
  { id: 'm4rate', name: 'Yağlı Mekanizma', tag: 'M4', max: 2, desc: 'M4 atış hızı +%20.', fx: n => pct(1.2, n) + ' M4 atış hızı', apply() { ST.m4Rate *= 1.2; } },
  { id: 'gren', name: 'Bomba Kuşağı', tag: 'M4', max: 3, desc: '+2 bomba taşırsın, bomba patlama alanı ve hasarı büyür. Hepsi dolu gelir.', fx: n => ST.grenMax + ' bomba · ' + ST.grenR.toLocaleString('tr-TR') + ' m alan', apply() { ST.grenMax += 2; ST.grenR += .8; ST.grenDmg *= 1.2; m4.gren = ST.grenMax; } },
  { id: 'awpbolt', name: 'Hızlı Sürgü', tag: 'AWP', max: 2, desc: 'AWP sürgüsü %30 daha hızlı çekilir.', fx: n => (Math.round(ST.awpBolt * 100) / 100).toLocaleString('tr-TR') + ' sn sürgü', apply() { ST.awpBolt *= .7; } },
  { id: 'awpdmg', name: 'Zırh Delici', tag: 'AWP', max: 3, desc: 'AWP hasarı +%30 ve mermi +2 düşmanı daha deler.', fx: n => pct(1.3, n) + ' hasar · ' + ST.awpPierce + ' düşman deler', apply() { ST.awpDmg *= 1.3; ST.awpPierce += 2; } },
  { id: 'awpmag', name: 'Keskin Nişancı Çantası', tag: 'AWP', max: 2, desc: 'AWP şarjörü +3, yanına +10 yedek mermi.', fx: n => 'şarjör ' + ST.awpMag + ' mermi', apply() { ST.awpMag += 3; awp.mag = ST.awpMag; awp.reserve += 10; } },
  { id: 'guard', name: 'Kalkan Ustası', tag: 'SAVUNMA', max: 1, desc: 'Savunma hasarın %90\'ını emer. Kusursuz savunma süresi iki katına çıkar.', fx: () => '%90 emme · 2× kusursuz pencere', apply() { ST.blockReduce = .9; ST.parryWindow *= 2; } },
  { id: 'kick', name: 'Patlayıcı Tekme', tag: 'TEKME', max: 2, desc: 'Tekme iki kat güçlü fırlatır ve hasar verir.', fx: n => Math.pow(2, n) + '× tekme gücü', apply() { ST.kickPower *= 2; } },
  { id: 'speed', name: 'Kızıl Rüzgâr', tag: 'HAREKET', max: 2, desc: 'Hareket hızı +%15.', fx: n => pct(1.15, n) + ' hareket hızı', apply() { ST.moveSpeed *= 1.15; } },
  { id: 'pellet', name: 'Saçma Yağmuru', tag: 'POMPALI', max: 2, desc: 'Pompalı her atışta +3 saçma fırlatır.', fx: n => '+' + n * 3 + ' saçma', apply() { ST.sgPellets += 3; } },
  { id: 'choke', name: 'Dar Namlu', tag: 'POMPALI', max: 2, desc: 'Saçmalar %30 daha toplu gider, uzakta daha az hasar kaybeder.', fx: n => '%' + Math.round((1 - Math.pow(.7, n)) * 100) + ' daha dar saçılım', apply() { ST.sgSpread *= .7; ST.sgRange *= 1.5; } },
  { id: 'slug', name: 'Ağır Saçma', tag: 'POMPALI', max: 3, desc: 'Saçma hasarı +%35.', fx: n => pct(1.35, n) + ' saçma hasarı', apply() { ST.sgDmg *= 1.35; } },
  { id: 'tube', name: 'Fişeklik', tag: 'POMPALI', max: 2, desc: 'Tüpe +3 fişek sığar, taşıyabileceğin fişek +12. Hepsi dolu gelir.', fx: n => 'tüp ' + ST.sgTube + ' fişek', apply() { ST.sgTube += 3; ST.maxShells += 12; shells.tube = ST.sgTube; shells.reserve = ST.maxShells; } },
  { id: 'load', name: 'Seri Doldurma', tag: 'POMPALI', max: 2, desc: 'Fişekleri %40 daha hızlı doldurursun.', fx: n => '%' + Math.round((1 - Math.pow(.6, n)) * 100) + ' hızlı doldurma', apply() { ST.sgLoad *= .6; } },
];
// Sadece boss'tan çıkan, oyun boyunca bir kez alınabilen nadir özellikler
const RARES = [
  { id: 'djump', rare: true, name: 'Çift Zıplama', tag: 'NADİR · HAREKET', max: 1, desc: 'Havadayken bir kez daha zıplayabilirsin.', fx: () => 'havada +1 zıplama', apply() { ST.airJumps = 1; } },
  { id: 'twin', rare: true, name: 'İkiz Namlu', tag: 'NADİR · UZİ', max: 1, desc: 'Her tetikte iki mermi çıkar: iki kat hasar, aynı cephane.', fx: () => 'tetik başına 2 mermi', apply() { ST.twin = true; } },
  { id: 'autosg', rare: true, name: 'Otomatik Pompalı', tag: 'NADİR · POMPALI', max: 1, desc: 'Pompalamana gerek kalmaz: basılı tuttukça saniyede 4 kez ateşler. Tüpe +4 fişek.', fx: () => 'saniyede 4 atış', apply() { ST.sgAuto = true; ST.sgTube += 4; shells.tube = ST.sgTube; } },
  { id: 'phoenix', rare: true, name: 'Anka Kuşu', tag: 'NADİR · BEDEN', max: 1, desc: 'Her dalgada bir kez, ölmek yerine yarı canla ayağa kalkarsın.', fx: () => phoenixReady ? 'bu dalga hazır' : 'bu dalga kullanıldı', apply() { ST.phoenix = true; phoenixReady = true; } },
  { id: 'blooddash', rare: true, name: 'Kan Atılması', tag: 'NADİR · ATILMA', max: 1, desc: 'Atılmayla kestiğin her düşman +8 can verir. İlk vuruşta atılma hakkın geri gelir.', fx: () => 'atılma kesiği +8 can', apply() { ST.bloodDash = true; } },
  { id: 'storm', rare: true, name: 'Çelik Kasırga', tag: 'NADİR · KATANA', max: 1, desc: 'Kayarken yaptığın kasırga kesiğinin hasarı iki katına, menzili %40 artar.', fx: () => '2× kasırga hasarı', apply() { ST.stormMul = 2; } },
];

/* ================= XP VE SEVİYE ================= */
const prog = { lv: 1, xp: 0 };
let pendingPicks = 0, rarePicks = 0, pickIsRare = false;
const picksLeft = () => pendingPicks + rarePicks;
function addRarePick() {
  if (RARES.some(u => !owned[u.id])) { rarePicks++; return true; }
  return addPick();
}
function rollRare() {
  const pool = RARES.filter(u => !owned[u.id]);
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const out = pool.slice(0, 3);
  return out.length < 3 ? out.concat(rollUpgrades(3 - out.length)) : out;
}
const xpNeed = lv => 40 + (lv - 1) * 30;
function gainXP(n) {
  prog.xp += n;
  while (prog.xp >= xpNeed(prog.lv)) {
    prog.xp -= xpNeed(prog.lv); prog.lv++;
    if (addPick()) { toast('SEVİYE ' + prog.lv + ' · T İLE ÖZELLİK SEÇ'); sfx.upgrade(); }
  }
}
function addPick() { if (UPGRADES.some(u => (owned[u.id] || 0) < u.max)) { pendingPicks++; return true; } return false; }

let offered = [], heldOffer = null;
let lastShown = new Set();   // bir önceki seçim ekranındaki kartlar: art arda seçimlerde tekrar gelmez
// sınırına ulaşan yetenek hiç gelmez; az önce gösterilenler sona atılır; zaten alınmış olanlar daha seyrek gelir
function rollUpgrades(n = 3) {
  const pool = UPGRADES.filter(u => (owned[u.id] || 0) < u.max)
    .map(u => ({ u, k: (lastShown.has(u.id) ? 0 : 1) + Math.pow(Math.random(), 1 + (owned[u.id] || 0) * 1.5) }))
    .sort((a, b) => b.k - a.k);
  return pool.slice(0, n).map(x => x.u);
}
function openPick() {
  if (picksLeft() <= 0 || state !== 'play' || !player.alive) return;
  pickIsRare = rarePicks > 0;
  // "sonra seç" ile kapatılan ekran aynı kartlarla geri açılır
  const valid = u => u.rare ? !owned[u.id] : (owned[u.id] || 0) < u.max;
  if (heldOffer && heldOffer.rare === pickIsRare && heldOffer.list.every(valid)) offered = heldOffer.list;
  else offered = pickIsRare ? rollRare() : rollUpgrades();
  heldOffer = null;
  if (!offered.length) { pendingPicks = 0; rarePicks = 0; return; }
  state = 'upgrade';
  for (const k in mouse) mouse[k] = false;
  $('pickTitle').textContent = pickIsRare ? 'Boss Ödülü' : 'Güçlen';
  $('pickInfo').textContent = (pickIsRare ? 'Nadir özellikler, her biri oyunda bir kez alınır. ' : '') + (picksLeft() > 1 ? picksLeft() + ' seçim hakkın var. ' : '') + (net.mode === 'solo' ? 'Oyun duraklatıldı.' : 'Oyun durmuyor, çabuk seç!') + ' 1, 2, 3 ya da tıkla.';
  const box = $('cards'); box.innerHTML = '';
  offered.forEach((u, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card' + (u.rare ? ' rare' : ''); b.id = 'card' + i;
    const lvl = owned[u.id] || 0;
    b.innerHTML = `<span class="ck">${i + 1}</span><em>${u.tag}</em><strong>${u.name}</strong><span class="cd">${u.desc}</span><span class="cl">${u.rare ? 'Tek seferlik' : lvl ? 'Seviye ' + (lvl + 1) + ' / ' + u.max : 'Yeni'}</span>`;
    b.addEventListener('click', () => chooseUpgrade(i));
    box.appendChild(b);
  });
  $('upgrade').hidden = false;
  if (document.pointerLockElement) document.exitPointerLock();
}
function chooseUpgrade(i) {
  const u = offered[i]; if (!u || state !== 'upgrade') return;
  owned[u.id] = (owned[u.id] || 0) + 1;
  u.apply();
  lastShown = new Set(offered.map(x => x.id));
  sfx.upgrade();
  if (pickIsRare) rarePicks--; else pendingPicks--;
  refreshPips();
  toast(u.name.toLocaleUpperCase('tr-TR'));
  offered = [];
  if (picksLeft() > 0) { state = 'play'; openPick(); return; }
  closePick();
}
function closePick() {
  if (state !== 'upgrade') return;
  if (offered.length) heldOffer = { rare: pickIsRare, list: offered };
  $('upgrade').hidden = true;
  play();
}
function resetUpgrades() {
  Object.assign(ST, ST_BASE);
  for (const k in owned) delete owned[k];
  lastShown = new Set(); heldOffer = null;
  prog.lv = 1; prog.xp = 0; pendingPicks = 0; rarePicks = 0;
  perkStat.vamp = 0; perkStat.regen = 0; perksT = 0;
}
// sol panel: alınan özellikler, seviyeleri ve şu anki katkıları
let perksT = 0;
function updatePerksHud(dt) {
  perksT -= dt; if (perksT > 0) return; perksT = .5;
  const list = UPGRADES.concat(RARES).filter(u => owned[u.id]);
  const html = list.map(u => `<div class="pk${u.rare ? ' rare' : ''}"><b>${u.name}</b><span>${u.rare ? 'NADİR' : owned[u.id] + '/' + u.max}</span><small>${u.fx ? u.fx(owned[u.id]) : ''}</small></div>`).join('');
  if (hud.perks !== html) { hud.perks = html; $('perks').innerHTML = html; }
}
function ownedText() {
  const list = UPGRADES.concat(RARES).filter(u => owned[u.id]).map(u => u.name + (owned[u.id] > 1 ? ' ×' + owned[u.id] : ''));
  return list.length ? 'Güçlendirmeler: ' + list.join(' · ') : '';
}
