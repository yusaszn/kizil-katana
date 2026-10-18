'use strict';
/* VS ekonomisi ve satın alma menüsü (Valorant tarzı):
   raunt başında kredinle silah, kalkan ve yetenek alırsın; menü fareyle kullanılır (B ile aç / kapat, sağ tık: sat).
   Hayatta kalan silahını, kalkanını ve kullanmadığı yetenekleri sonraki raunda taşır; ölen hepsini kaybeder.
   Yetenekler: Z sis bombası, X flaş. Atılan yetenekler herkesin ekranında aynı şekilde oynatılır. */

const ECON = { start: 800, max: 9000, kill: 200, win: 3000, loss: [1900, 2400, 2900] };
const SHOP = [
  { id: 'uzi', cat: 'HAFİF', name: 'ÇİFT UZİ', price: 1600, info: 'Yakın mesafede eritir · 2×30 mermi' },
  { id: 'shotgun', cat: 'HAFİF', name: 'POMPALI', price: 1850, info: 'Köşe tutucu · sağ tık odaklı atış' },
  { id: 'ak47', cat: 'TÜFEK', name: 'AK-47', price: 2700, info: 'Sert vurur, kafaya tek mermi · geri tepmesi güçlü' },
  { id: 'm4', cat: 'TÜFEK', name: 'M4', price: 2900, info: 'Her mesafede güvenilir · sağ tık nişan' },
  { id: 'awp', cat: 'KESKİN NİŞANCI', name: 'AWP', price: 4700, info: 'Tek mermi, tek leş · sağ tık dürbün' },
  { id: 'katana', cat: 'YAKIN DÖVÜŞ', name: 'KATANA', price: 1200, info: 'Savunma, kusursuz savunma, kasırga' },
  { id: 'pistol', cat: 'TABANCA', name: 'TABANCA', price: 0, info: 'Her rauntta ücretsiz · dengeli' },
  { id: 'glock', cat: 'TABANCA', name: 'GLOCK', price: 200, info: '20 mermi, hızlı tetik · yakın mesafe' },
  { id: 'usps', cat: 'TABANCA', name: 'USP-S', price: 400, info: 'Susturuculu, çok isabetli · sesi duyulmaz' },
  { id: 'deagle', cat: 'TABANCA', name: 'DEAGLE', price: 800, info: 'Kafaya tek mermi · sert geri tepme, 7 mermi' },
  { id: 'light', cat: 'KALKAN', name: 'HAFİF KALKAN', price: 400, armor: 25, info: '+25 kalkan' },
  { id: 'heavy', cat: 'KALKAN', name: 'AĞIR KALKAN', price: 1000, armor: 50, info: '+50 kalkan' },
  { id: 'smoke', cat: 'YETENEK', name: 'SİS BOMBASI', price: 200, max: 2, key: 'Z', info: '14 sn görüşü kapatan duman' },
  { id: 'flash', cat: 'YETENEK', name: 'FLAŞ', price: 250, max: 2, key: 'X', info: 'Bakanı birkaç saniye kör eder' },
];
const PRIMARY_IDS = ['uzi', 'shotgun', 'ak47', 'm4', 'awp', 'katana'];
const SIDEARM_IDS = ['pistol', 'glock', 'usps', 'deagle'];
const eco = { cr: ECON.start, primary: null, sidearm: null, armor: 0, armorKind: null, smoke: 0, flash: 0, bought: [], streak: 0, keep: false, roundKills: 0, ready: false, taken: {}, deathInfo: '' };
const shopItem = id => SHOP.find(s => s.id === id);
const buy = { open: false, x: 0, y: 0, hov: null };
const teamUI = { open: false };
const anyMenu = () => buy.open || teamUI.open;
// M: maç sırasında takım değiştir
function openTeamPick() {
  if (!isVS() || vs.over) return;
  if (buy.open) closeBuy();
  teamUI.open = true; $('teamPick').hidden = false; renderTeamPick();
  buy.x = innerWidth / 2; buy.y = innerHeight * .5; moveCursor(0, 0);
}
function closeTeamPick() { teamUI.open = false; $('teamPick').hidden = true; if (!buy.open) $('vcursor').hidden = true; }
function toggleTeamPick() { if (teamUI.open) closeTeamPick(); else openTeamPick(); }
function renderTeamPick() {
  const mt = myTeam();
  for (const t of ['red', 'blue']) {
    const names = Object.values(net.players).filter(p => p.team === t).map(p => escapeHtml(p.name));
    const el = $('tp_' + t);
    el.classList.toggle('on', mt === t);
    el.querySelector('small').innerHTML = names.length ? names.join(' · ') : 'boş';
    el.querySelector('em').textContent = names.length + ' OYUNCU' + (mt === t ? ' · SENİN TAKIMIN' : '');
  }
  setBuyText('tpInfo', vs.phase === 'live' ? 'Raunt sürerken değiştirirsen bu raunttan çekilirsin, sonraki raunda yeni takımında başlarsın.' : 'Hemen yeni takımının üssüne geçersin. Paran korunur.');
}
function requestTeam(t) {
  if (!TEAMS[t] || t === myTeam()) { closeTeamPick(); return; }
  if (net.mode === 'host') hostSetTeam('h', t); else toHost({ t: 'teamSet', team: t });
  sfx.swap(); closeTeamPick();
}

function resetEco() {
  Object.assign(eco, { cr: ECON.start, primary: null, sidearm: null, armor: 0, armorKind: null, smoke: 0, flash: 0, bought: [], streak: 0, keep: false, roundKills: 0, ready: false, taken: {}, deathInfo: '' });
  closeBuy();
}
function addCredits(n, why) {
  if (infMoney()) return;
  const before = eco.cr; eco.cr = Math.min(ECON.max, eco.cr + n);
  if (eco.cr > before) toast('+' + (eco.cr - before) + ' ◈  ' + why);
}

/* ================= SATIN ALMA ================= */
function boughtNow(id) { return eco.bought.findIndex(b => b.id === id); }
const backPrice = id => { const i = id ? boughtNow(id) : -1; return i < 0 ? 0 : eco.bought[i].price; };
function refund(id) {
  const i = boughtNow(id); if (i < 0) return false;
  eco.cr += eco.bought[i].price; eco.bought.splice(i, 1);
  return true;
}
function buyItem(id) {
  if (!isVS() || vs.phase !== 'buy') return;
  const it = shopItem(id); if (!it) return;
  if (SIDEARM_IDS.includes(id)) {
    // tabanca yuvası: ücretsiz tabancaya dönmek, alınmış tabancanın parasını iade eder
    const cur = eco.sidearm || 'pistol'; if (cur === id) return;
    if (eco.cr + backPrice(eco.sidearm) < it.price) { noMoney(); return; }
    if (eco.sidearm) refund(eco.sidearm);
    eco.sidearm = id === 'pistol' ? null : id;
    if (it.price) { eco.cr -= it.price; eco.bought.push({ id, price: it.price }); }
  } else if (PRIMARY_IDS.includes(id)) {
    if (eco.primary === id) return;
    const old = eco.primary;
    if (eco.cr + backPrice(old) < it.price) { noMoney(); return; }
    if (old) refund(old);           // bu raunt alınmışsa parası iade, taşınmışsa bırakılır
    eco.cr -= it.price; eco.bought.push({ id, price: it.price }); eco.primary = id;
  } else if (it.armor) {
    if (eco.armorKind === id && eco.armor >= it.armor) return;
    if (eco.cr + (eco.armorKind !== id ? backPrice(eco.armorKind) : 0) < it.price) { noMoney(); return; }
    if (eco.armorKind && eco.armorKind !== id) refund(eco.armorKind);
    eco.cr -= it.price; eco.bought.push({ id, price: it.price }); eco.armorKind = id; eco.armor = it.armor;
  } else {
    if (eco[id] >= it.max) { sfx.empty(); return; }
    if (eco.cr < it.price) { noMoney(); return; }
    eco.cr -= it.price; eco.bought.push({ id, price: it.price }); eco[id]++;
  }
  if (infMoney()) eco.cr = ECON.max;   // sınırsız para
  sfx.ammo(); renderBuy();
}
function sellItem(id) {
  if (!isVS() || vs.phase !== 'buy' || boughtNow(id) < 0) return;
  refund(id);
  if (PRIMARY_IDS.includes(id)) eco.primary = null;
  else if (SIDEARM_IDS.includes(id)) eco.sidearm = null;
  else if (shopItem(id).armor) { eco.armor = 0; eco.armorKind = null; }
  else eco[id] = Math.max(0, eco[id] - 1);
  sfx.swap(); renderBuy();
}
function noMoney() { sfx.empty(); toast('YETERSİZ KREDİ'); }

/* ================= MENÜ ================= */
function openBuy() {
  if (!isVS() || vs.phase !== 'buy' || vs.over) return;
  buy.open = true; buy.x = innerWidth / 2; buy.y = innerHeight * .55;
  $('buy').hidden = false; renderBuy(); moveCursor(0, 0);
}
function closeBuy() { buy.open = false; $('buy').hidden = true; $('vcursor').hidden = true; }
function toggleBuy() { if (buy.open) closeBuy(); else openBuy(); }
function cardHtml(it) {
  const own = SIDEARM_IDS.includes(it.id) ? (eco.sidearm || 'pistol') === it.id : PRIMARY_IDS.includes(it.id) ? eco.primary === it.id : it.armor ? eco.armorKind === it.id : eco[it.id] > 0;
  const cnt = it.max ? `<i class="cnt">${eco[it.id]}/${it.max}</i>` : '';
  const sellable = boughtNow(it.id) >= 0;
  const poor = !own && eco.cr < it.price;
  return `<button type="button" class="bc${own ? ' own' : ''}${poor ? ' poor' : ''}" data-id="${it.id}">
    <em>${it.cat}</em><strong>${it.name}</strong><small>${it.info}</small>
    <span class="pr">${own && !it.max ? (sellable ? 'ALINDI · SAĞ TIK SAT' : 'ELİNDE') : it.price ? it.price + ' ◈' : 'ÜCRETSİZ'}</span>${cnt}${it.key ? `<kbd>${it.key}</kbd>` : ''}</button>`;
}
function renderBuy() {
  if ($('buy').hidden) return;
  setBuyText('buyCr', infMoney() ? '∞ ◈' : eco.cr + ' ◈');
  const col = ids => ids.map(id => cardHtml(shopItem(id))).join('');
  const html = `<div class="bcol"><h3>ANA SİLAH</h3><div class="bgrid">${col(PRIMARY_IDS)}</div>
      <h3>TABANCA</h3><div class="bgrid">${col(SIDEARM_IDS)}</div></div>
    <div class="bcol"><h3>KALKAN</h3><div class="bgrid">${col(['light', 'heavy'])}</div>
      <h3>YETENEKLER</h3><div class="bgrid">${col(['smoke', 'flash'])}</div>
      <h3>BIÇAK</h3><div class="bknife">${KNIFE_LIST.map(k => `<button type="button" class="bk${loadout.knife === k ? ' own' : ''}" data-knife="${k}">${WEAPON_SHORT[k]}</button>`).join('')}</div></div>`;
  if (buy.html !== html) { buy.html = html; $('buyBody').innerHTML = html; buy.hov = null; }
  const mates = Object.values(net.players).filter(p => p.team === myTeam() && p.id !== net.myId).map(p => `<span>${escapeHtml(p.name)} <b>${p.cr != null ? p.cr : '?'} ◈</b>${p.rd ? ' ✓' : ''}</span>`).join('');
  if (buy.mates !== mates) { buy.mates = mates; $('buyMates').innerHTML = mates || '<span>Takımında başka kimse yok</span>'; }
  $('buyReady').classList.toggle('on', eco.ready);
  $('buyReady').textContent = eco.ready ? 'HAZIRSIN ✓' : 'HAZIRIM';
}
function setBuyText(id, v) { const el = $(id); if (el.textContent !== v) el.textContent = v; }
function buyClickTarget(el, right) {
  if (!el) return;
  const card = el.closest('[data-id]'), knife = el.closest('[data-knife]');
  if (card) { right ? sellItem(card.dataset.id) : buyItem(card.dataset.id); return; }
  if (knife && !right) { selectLoadout('knife', knife.dataset.knife); renderBuy(); return; }
  const tp = el.closest('[data-team]'); if (tp && !right) { requestTeam(tp.dataset.team); return; }
  if (el.closest('#tpClose') && !right) { closeTeamPick(); return; }
  if (el.closest('#buyReady') && !right) { eco.ready = !eco.ready; sfx.swap(); renderBuy(); return; }
  if (el.closest('#buyClose') && !right) closeBuy();
}
$('buy').addEventListener('click', e => buyClickTarget(e.target, false));
$('teamPick').addEventListener('click', e => buyClickTarget(e.target, false));
$('buy').addEventListener('contextmenu', e => { e.preventDefault(); buyClickTarget(e.target, true); });
// fare kilitliyken gerçek imleç görünmez: menüde kendi imlecimizi fareyle sürüyoruz
function moveCursor(dx, dy) {
  buy.x = clamp(buy.x + dx, 0, innerWidth - 2); buy.y = clamp(buy.y + dy, 0, innerHeight - 2);
  const c = $('vcursor'); c.hidden = !document.pointerLockElement; c.style.transform = `translate(${buy.x}px,${buy.y}px)`;
  const el = document.elementFromPoint(buy.x, buy.y), card = el && el.closest('#buy button, #teamPick button');
  if (card !== buy.hov) { if (buy.hov) buy.hov.classList.remove('hov'); buy.hov = card; if (card) card.classList.add('hov'); }
}
function buyMouseMove(e) { if (!anyMenu()) return false; if (document.pointerLockElement) moveCursor(e.movementX, e.movementY); return true; }
function buyMouseDown(e) {
  if (!anyMenu() || !document.pointerLockElement) return false;
  if (e.button === 0 || e.button === 2) buyClickTarget(document.elementFromPoint(buy.x, buy.y), e.button === 2);
  return true;
}

/* ================= RAUNT OLAYLARI ================= */
const infMoney = () => net.money === 'inf';
function ecoRoundBuy(n) {
  // ilk raunt ve bomba modunda devre arası: herkes sıfırdan başlar
  if (n === 1 || (isBomb() && n === BOMB.half + 1)) { eco.cr = ECON.start; eco.streak = 0; eco.keep = false; }
  if (infMoney()) eco.cr = ECON.max;
  if (!eco.keep) { eco.primary = null; eco.sidearm = null; eco.armor = 0; eco.armorKind = null; eco.smoke = 0; eco.flash = 0; }
  eco.bought = []; eco.roundKills = 0; eco.ready = false; eco.taken = {}; eco.deathInfo = '';
  for (const id in net.players) net.players[id].rd = 0;
  openBuy();
}
function ecoRoundLive() { closeBuy(); }
function ecoRoundEnd(win) {
  eco.keep = player.alive;
  closeBuy();
  if (win === myTeam()) { addCredits(ECON.win, 'RAUNT KAZANILDI'); eco.streak = 0; }
  else { addCredits(ECON.loss[Math.min(eco.streak, ECON.loss.length - 1)], win === 'draw' ? 'BERABERE' : 'RAUNT KAYBEDİLDİ'); if (win !== 'draw') eco.streak++; }
}
function ecoKill() {
  addCredits(ECON.kill, 'LEŞ');
  eco.roundKills++;
  const foes = Object.values(net.players).filter(p => p.team && p.team !== myTeam()).length;
  if (foes >= 2 && eco.roundKills === foes) { banner('ACE', 'Bütün rakip takımı tek başına indirdin'); sfx.upgrade(); }
}
// kalkan hasarın %70'ini emer, bitene kadar
function armorAbsorb(dmg) {
  if (eco.armor <= 0) return dmg;
  const a = Math.min(eco.armor, dmg * .7);
  eco.armor -= a; if (eco.armor <= .5) { eco.armor = 0; eco.armorKind = null; if (player.alive) toast('KALKAN KIRILDI'); }
  return dmg - a;
}
function noteTaken(by, dmg) { const t = eco.taken[by] || (eco.taken[by] = { dmg: 0, n: 0 }); t.dmg += dmg; t.n++; }
function deathSummary() {
  eco.deathInfo = Object.entries(eco.taken).map(([id, t]) => nameOf(id).toLocaleUpperCase('tr-TR') + ': ' + Math.round(t.dmg) + ' hasar (' + t.n + ' vuruş)').join(' · ');
}
// son kalan bildirimi (1v2, 1v3...)
let clutchShown = false;
function checkClutch() {
  if (vs.phase !== 'live' || !player.alive) { if (vs.phase !== 'live') clutchShown = false; return; }
  const mine = aliveCount(myTeam()), foes = aliveCount(myTeam() === 'red' ? 'blue' : 'red');
  if (!clutchShown && mine === 1 && foes >= 2 && Object.values(net.players).filter(p => p.team === myTeam()).length >= 2) { clutchShown = true; banner('SON KALAN', '1v' + foes + ' · hepsi sana bağlı'); }
}

/* ================= YETENEKLER: SİS VE FLAŞ ================= */
const utilShots = [], smokes = [];
const smokeTex = canvasTex(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.6, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, 1, 1, false);
const utilGeo = new THREE.CylinderGeometry(.05, .05, .14, 8);
const utilMats = { smoke: new THREE.MeshStandardMaterial({ color: 0x5a6a5a, roughness: .6 }), flash: new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: .4, metalness: .4 }) };
const SMOKE_R = 4.2, SMOKE_T = 14;
let flashBlind = 0;
function throwUtil(k) {
  if (!isVS() || vs.phase !== 'live' || !player.alive || state !== 'play' || eco[k] <= 0) { if (isVS() && eco[k] <= 0 && vs.phase === 'live') { sfx.empty(); toast(k === 'smoke' ? 'SİS BOMBAN YOK' : 'FLAŞIN YOK'); } return; }
  eco[k]--;
  camVectors();
  const p = eyePos.clone().addScaledVector(camFwd, .6); p.y -= .1;
  const v = camFwd.clone().multiplyScalar(k === 'flash' ? 19 : 15).add(new V3(0, 3.2, 0));
  v.x += player.body.velocity.x * .5; v.z += player.body.velocity.z * .5;
  const msg = { t: 'util', k, p: arr(p), v: arr(v) };
  if (net.mode === 'host') bcast(msg); else toHost(msg);
  onUtil(msg);
  sfx.swap(); kickView(0, .02);
}
function onUtil(d) {
  const m = new THREE.Mesh(utilGeo, utilMats[d.k]); m.position.set(d.p[0], d.p[1], d.p[2]); scene.add(m);
  utilShots.push({ k: d.k, m, pos: m.position, vel: new V3(d.v[0], d.v[1], d.v[2]), t: 0, still: 0 });
}
function popSmoke(p) {
  const g = new THREE.Group(); g.position.copy(p); g.position.y = Math.max(1.2, p.y);
  const core = new THREE.Mesh(new THREE.SphereGeometry(SMOKE_R, 20, 14), new THREE.MeshLambertMaterial({ color: 0x8c8780, transparent: true, opacity: .97, side: THREE.DoubleSide, depthWrite: false }));
  g.add(core);
  const puffs = [];
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: 0xa29c94, transparent: true, depthWrite: false, opacity: .8 }));
    const a = rand(0, TAU), u = rand(-.4, 1);
    s.position.set(Math.cos(a) * SMOKE_R * .9 * Math.sqrt(1 - u * u), u * SMOKE_R * .8, Math.sin(a) * SMOKE_R * .9 * Math.sqrt(1 - u * u));
    s.scale.setScalar(rand(3, 4.5)); g.add(s); puffs.push(s);
  }
  scene.add(g);
  smokes.push({ g, core, puffs, t: 0 });
  sfx.slide();
}
function popFlash(p) {
  sfx.boom(); sfx.parry();
  if (typeof flashWorld === 'function') flashWorld(8, 0xffffff, .12);
  if (!player.alive) return;
  // görüş hattında mı ve ne kadar bakıyorsun?
  camVectors();
  const to = p.clone().sub(eyePos), dist = to.length(); to.divideScalar(dist);
  if (dist > 32 || rayStatic(eyePos, to, dist) < dist - .3 || smokeBlocks(eyePos, p)) return;
  const face = clamp((to.dot(camFwd) + .25) / 1.25, 0, 1);
  const f = face * face * clamp(1.15 - dist / 32, 0, 1);
  if (f < .05) return;
  flashBlind = Math.max(flashBlind, .3 + f * 2.6);
}
// iki nokta arasındaki çizgi bir sis bulutundan geçiyor mu?
function smokeBlocks(a, b) {
  for (const s of smokes) {
    const c = s.g.position, r = SMOKE_R * s.g.scale.x;
    const ab = tmp2.copy(b).sub(a), L = ab.length(); if (L < 1e-4) continue; ab.divideScalar(L);
    const t = clamp((c.x - a.x) * ab.x + (c.y - a.y) * ab.y + (c.z - a.z) * ab.z, 0, L);
    const dx = a.x + ab.x * t - c.x, dy = a.y + ab.y * t - c.y, dz = a.z + ab.z * t - c.z;
    if (dx * dx + dy * dy + dz * dz < r * r * .8) return true;
  }
  return false;
}
function clearUtils() {
  for (const u of utilShots) scene.remove(u.m); utilShots.length = 0;
  for (const s of smokes) scene.remove(s.g); smokes.length = 0;
  flashBlind = 0; $('flashfx').style.opacity = 0;
}
function updateShop(dt, rdt) {
  for (const u of utilShots.slice()) {
    u.t += dt;
    u.vel.y -= 16 * dt;
    const prev = u.pos.clone();
    u.pos.addScaledVector(u.vel, dt); u.m.rotation.x += dt * 9;
    if (u.pos.y < .08) { u.pos.y = .08; u.vel.y *= -.35; u.vel.x *= .6; u.vel.z *= .6; if (Math.abs(u.vel.y) > 1) sfx.shell(); }
    if (hitsStatic(u.pos)) { u.pos.copy(prev); u.vel.x *= -.45; u.vel.z *= -.45; }
    const spd = u.vel.length(); u.still = spd < 1.2 ? u.still + dt : 0;
    const pop = u.k === 'flash' ? u.t > .85 : (u.still > .25 || u.t > 2.2);
    if (pop) { scene.remove(u.m); utilShots.splice(utilShots.indexOf(u), 1); if (u.k === 'flash') popFlash(u.pos.clone()); else popSmoke(u.pos.clone()); }
  }
  for (const s of smokes.slice()) {
    s.t += dt;
    const grow = Math.min(1, s.t / .6), fade = clamp((SMOKE_T - s.t) / 1.5, 0, 1);
    s.g.scale.setScalar(.2 + .8 * easeOut(grow));
    s.core.material.opacity = .97 * fade;
    for (const p of s.puffs) { p.material.opacity = .8 * fade; p.material.rotation += dt * .1; }
    if (s.t >= SMOKE_T) { scene.remove(s.g); smokes.splice(smokes.indexOf(s), 1); }
  }
  // rakip isim etiketleri sisin arkasından görünmesin
  if (isVS()) for (const id in net.players) {
    const p = net.players[id], pr = p.proxy; if (!pr || !pr.label || id === net.myId) continue;
    const foe = p.team !== myTeam();
    pr.label.visible = !(foe && smokes.length && smokeBlocks(camera.position, pr.g.position.clone().setY(pr.g.position.y + 1.2)));
  }
  flashBlind = Math.max(0, flashBlind - rdt);
  $('flashfx').style.opacity = Math.min(1, flashBlind / .6);
  if (isVS()) checkClutch();
  if (buy.open) { if (vs.phase !== 'buy' || !isVS()) closeBuy(); else { buy.renderT = (buy.renderT || 0) - rdt; if (buy.renderT <= 0) { buy.renderT = .3; renderBuy(); } setBuyText('buyTime', Math.max(0, Math.ceil(vs.t)) + ' SN'); } }
}
