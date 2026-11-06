'use strict';
/* VS modu: Kırmızı vs Mavi, rauntlu. Raunt başında satın alma süresi var (ekonomi ve menü: shop.js),
   raunt içinde ölen bir sonraki raunta kadar takım arkadaşını izler. İlk 7 raundu alan kazanır.
   Vuruşu ateş eden kendi ekranında hesaplar, host kurbana iletir; kurban canını kendisi düşürür ve ölünce host'a bildirir. */

const PVP_DMG = { uzi: 8, shotgun: 9, m4: 15, awp: 115, pistol: 26, katanaL: 45, katanaH: 85, katanaS: 35, kick: 10 };
const TEAMS = { red: { name: 'KIRMIZI', color: 0xc0281e }, blue: { name: 'MAVİ', color: 0x2f6fd0 } };
const ROUNDS_WIN = 7, BUY_T = 22, ROUND_T = 105, END_T = 4;
// TAKIM ÖLÜM MAÇI: raunt yok; ölen 3 sn sonra üssünde doğar, doğunca 10 sn satın alabilir; ilk 40 leşe ulaşan takım ya da 10 dk sonunda önde olan kazanır
const KILLS_WIN = 40, TDM_T = 600, TDM_BUY = 10, TDM_RESPAWN = 3;
const vs = { rr: 0, rb: 0, round: 0, phase: 'buy', t: BUY_T, spawnProt: 0, deaths: 0, feed: [], over: false, tick: 0, lastHit: null, respawnT: 0, buyT: 0, kc: null };
const isVS = () => net.mode !== 'solo' && (net.gameMode === 'vs' || net.gameMode === 'bomb' || net.gameMode === 'tdm');   // bomba ve takım ölüm maçı da VS'dir
const isTDM = () => net.mode !== 'solo' && net.gameMode === 'tdm';
const buyPhase = () => vs.phase === 'buy' || (isTDM() && vs.phase === 'live' && vs.buyT > 0 && player.alive);
const vsFrozen = () => isVS() && (vs.phase === 'buy' || (typeof bombAct !== 'undefined' && !!bombAct.kind));
const myTeam = () => (net.players[net.myId] || {}).team || 'red';
const teamOf = id => (net.players[id] || {}).team;
const nameOf = id => id === net.myId ? playerName() : (net.players[id] || {}).name || '?';
const WEAPON_SHORT = { he: 'EL BOMBASI', katana: 'KATANA', uzi: 'UZİ', shotgun: 'POMPALI', m4: 'M4', awp: 'AWP', pistol: 'TABANCA', kick: 'TEKME', knife: 'BIÇAK', karambit: 'KARAMBİT', butterfly: 'KELEBEK' };

/* ================= SİLAH SETİ ================= */
const PRIMARIES = ['m4', 'awp', 'shotgun', 'uzi', 'katana'];
const KNIFE_LIST = ['knife', 'karambit', 'butterfly'];
const loadout = { primary: 'm4', knife: 'knife' };
try { Object.assign(loadout, JSON.parse(localStorage.getItem('kk-set') || '{}')); } catch (e) { /* varsayılan set */ }
// raunt içi yuvalar: 1 ana silah (satın alındıysa), 2 tabanca, 3 bıçak
const vsSlots = () => [eco.primary, eco.sidearm || 'pistol', loadout.knife];
const vsWeapons = () => vsSlots().filter(Boolean);
function selectLoadout(kind, val) {
  loadout[kind] = val;
  try { localStorage.setItem('kk-set', JSON.stringify(loadout)); } catch (e) { /* bu oturumda geçerli */ }
  sfx.swap();
}
function applyLoadout() {
  const side = eco.sidearm || 'pistol', w = eco.primary || side;
  Object.assign(wpn, { cur: w, next: w, t: 1, off: 0, drawing: true, dt: 0, prev: eco.primary ? side : loadout.knife });
  if (isKnife(loadout.knife)) kn.type = loadout.knife;
}

/* ================= OYUNCULAR VE IŞIN TESTİ ================= */
function enemyProxies() {
  const out = [], mt = myTeam();
  for (const id in net.players) {
    const p = net.players[id];
    if (id !== net.myId && p.proxy && p.alive && p.team !== mt && p.proxy.g.visible) out.push([id, p.proxy]);
  }
  return out;
}
function rayPlayer(pr, o, d) {
  const R = .38, yb = pr.pos.y - .5, yt = yb + 1.9;
  const ox = o.x - pr.pos.x, oz = o.z - pr.pos.z, a = d.x * d.x + d.z * d.z;
  if (a < 1e-6) return null;
  const bb = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - R * R;
  const disc = bb * bb - 4 * a * c; if (disc < 0) return null;
  const s = Math.sqrt(disc);
  for (const t of [(-bb - s) / (2 * a), (-bb + s) / (2 * a)]) {
    if (t < 0) continue;
    const y = o.y + d.y * t;
    if (y >= yb && y <= yt) return { t, head: y > yt - .32 };
  }
  return null;
}

/* ================= ÖLDÜRME İŞARETLERİ =================
   Vuran kendi ekranında belirler, vuruş ve ölüm mesajıyla ölüm akışına kadar taşınır:
   hs kafadan · ns dürbünsüz (AWP) · air havadayken · smk sisin içinden · kor flaşla körken */
const KILL_FX = ['ns', 'smk', 'air', 'kor', 'hs'];
const KILL_FX_NAME = { hs: 'KAFADAN', ns: 'DÜRBÜNSÜZ', air: 'HAVADAYKEN', smk: 'SİSİN İÇİNDEN', kor: 'KÖRKEN' };
const cleanFx = s => { const a = Array.isArray(s) ? s : String(s || '').split(','); return KILL_FX.filter(t => a.includes(t)); };
function shotFx(head, hitPoint) {
  const f = [];
  if (head) f.push('hs');
  if (wpn.cur === 'awp' && typeof awp !== 'undefined' && awp.scopeK < .3) f.push('ns');
  if (!player.grounded && player.coyote < 0) f.push('air');
  if (typeof flashBlind !== 'undefined' && flashBlind > .6) f.push('kor');
  if (hitPoint && typeof smokes !== 'undefined' && smokes.length && smokeBlocks(camPos, hitPoint)) f.push('smk');
  return f;
}
// ölüm akışı simgeleri (küçük çizgi çizimler)
const KF_SVG = {
  hs: '<svg viewBox="0 0 16 16"><path fill="currentColor" stroke="none" d="M8 1.5a5.6 5.6 0 0 0-5.6 5.6c0 2 1 3.4 2.3 4.2V14h6.6v-2.7c1.3-.8 2.3-2.2 2.3-4.2A5.6 5.6 0 0 0 8 1.5z"/><circle cx="5.9" cy="7.4" r="1.4" fill="#120808" stroke="none"/><circle cx="10.1" cy="7.4" r="1.4" fill="#120808" stroke="none"/><path d="M7 14v-2M9 14v-2" stroke="#120808"/></svg>',
  ns: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3"/><path d="M2.5 13.5l11-11" stroke-width="2"/></svg>',
  air: '<svg viewBox="0 0 16 16"><path d="M4 8l4-4 4 4M4 12l4-4 4 4"/><path d="M2 15h12" stroke-dasharray="2 2"/></svg>',
  smk: '<svg viewBox="0 0 16 16"><path d="M4.5 12.5h7.2a3 3 0 0 0 .3-6 4 4 0 0 0-7.7.9 2.6 2.6 0 0 0 .2 5.1z"/></svg>',
  kor: '<svg viewBox="0 0 16 16"><path d="M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8 12.1 12.2 8 12.2 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="1.8"/><path d="M2.5 13.5l11-11" stroke-width="2"/></svg>',
};
const kfIcons = fx => fx && fx.length ? '<em class="kfx">' + fx.map(t => `<i class="${t}" title="${KILL_FX_NAME[t]}">${KF_SVG[t]}</i>`).join('') + '</em>' : '';

/* ================= VURUŞLAR ================= */
function pvpHit(id, dmg, dir, opts = {}) {
  const msg = { t: 'phit', to: id, dmg: Math.round(dmg), dir: arr(dir), head: !!opts.head, melee: !!opts.melee, kn: opts.kn || 0, w: opts.w || wpn.cur, by: net.myId, fx: (opts.fx || shotFx(opts.head)).join(',') };
  const pr = (net.players[id] || {}).proxy;
  if (pr) { const at = opts.at || new V3(pr.pos.x, pr.pos.y + .7, pr.pos.z); bloodBurst(at, dir, opts.melee ? 45 : 14, 6, 2); sfx.flesh(); }
  if (net.mode === 'host') deliverPhit(msg); else toHost(msg);
}
function deliverPhit(d) {
  if (isBot(d.to)) { botHit(d); return; }   // botlar hostta yaşar
  if (d.to === 'h') applyPhit(d);
  else { const p = net.players[d.to]; if (p && p.conn && p.conn.open) p.conn.send(d); }
}
function applyPhit(d) {
  if (!isVS() || !player.alive || vs.over || teamOf(d.by) === myTeam()) return;
  const att = (net.players[d.by] || {}).proxy;
  const from = att ? att.pos.clone() : null;
  if (d.kn) { const v = player.body.velocity; v.x += d.dir[0] * d.kn; v.z += d.dir[2] * d.kn; v.y += 4; }
  vs.lastHit = { by: d.by, w: d.w, fx: cleanFx(d.fx) };
  if (vs.spawnProt <= 0) noteTaken(d.by, d.dmg);
  hurtPlayer(d.dmg, from, null, { pvp: true, melee: d.melee });
  if (d.head) screenSplat(1);
  // vurulma hissi (CS'teki gibi): nişan yukarı sıçrar, kısa süre yavaşlarsın
  if (!d.melee && player.alive) { kickView(rand(-.015, .015), .028 + Math.min(.04, d.dmg * .0007)); player.pitch = Math.min(1.45, player.pitch + .01); player.tagT = .4; }
}
// katana / kasırga / tekme: yakın mesafedeki rakip oyuncular
function pvpMelee(range, arc, dmg, opts) {
  if (!isVS()) return 0;
  let n = 0;
  for (const [id, pr] of enemyProxies()) {
    const dx = pr.pos.x - camPos.x, dz = pr.pos.z - camPos.z, dh = Math.hypot(dx, dz);
    if (dh - .4 > range) continue;
    if (arc < Math.PI && dh > .9 && (dx * flatF.x + dz * flatF.z) / dh < Math.cos(arc)) continue;
    pvpHit(id, dmg, new V3(dx, 0, dz).normalize(), Object.assign({ melee: true }, opts));
    n++;
  }
  return n;
}

/* ================= ÖLÜM ================= */
function avatarGore(av, push) {
  if (av.char) {
    // yeni karakter: ceset ragdoll olarak gerçek fizikle yığılır (karakter.js)
    spawnRagdoll(av, push);
    const c = av.g.position.clone(); c.y += 1.1;
    bloodBurst(c, push, 140, 8, 4); floorDecal(c.x, c.z, rand(1.2, 1.9));
    av.g.visible = false; sfx.kill();
    return;
  }
  av.g.updateMatrixWorld(true);
  const wp = new V3(), wq = new THREE.Quaternion();
  for (const m of av.parts) {
    m.getWorldPosition(wp); m.getWorldQuaternion(wq);
    const he = m.userData.he.clone().multiplyScalar(av.g.scale.y > .9 ? 1 : .8);
    const pc = makePiece(he, wp, wq, Array(6).fill(m.material), fleshCut, 'flesh');
    pc.body.velocity.set(push.x * rand(4, 9) + rand(-2, 2), rand(3, 7), push.z * rand(4, 9) + rand(-2, 2));
    pc.body.angularVelocity.set(rand(-10, 10), rand(-10, 10), rand(-10, 10));
    pc.bleed = rand(1.5, 3);
  }
  const c = av.g.position.clone(); c.y += 1.1;
  bloodBurst(c, push, 220, 10, 5); bloodBurst(c, UP, 100, 9, 3);
  floorDecal(c.x, c.z, rand(1.5, 2.3));
  av.g.visible = false;
  sfx.kill();
}
function pvpDie() {
  vs.deaths++;
  const k = vs.lastHit || { by: null, w: null };
  const b = player.body.position;
  const av = myAvatar && myAvatar.g.visible ? myAvatar : buildAvatar(TEAMS[myTeam()].color, '');
  av.g.position.set(b.x, b.y - .5, b.z); av.g.rotation.y = player.yaw + Math.PI;
  avatarGore(av, new V3(-flatF.x, 0, -flatF.z));
  if (av !== myAvatar) scene.remove(av.g);
  screenSplat(6); deathSummary(); killcamStart(k);
  banner('KATLEDİLDİN', (k.by ? nameOf(k.by).toLocaleUpperCase('tr-TR') + ' · ' : '') + (isTDM() ? TDM_RESPAWN + ' SN SONRA YENİDEN DOĞACAKSIN' : 'SONRAKİ RAUNDU BEKLE'));
  if (isTDM()) { vs.respawnT = TDM_RESPAWN; eco.keep = true; closeBuy(); }
  if (net.mode === 'host') { net.players.h.alive = false; hostKill(net.myId, k.by, k.w, k.fx); }
  else toHost({ t: 'pdied', by: k.by, w: k.w, fx: (k.fx || []).join(',') });
  vs.lastHit = null;
}
/* ================= ÖLÜM KAMERASI ================= */
// ölünce kamera yavaşça katile döner ve yakınlaşır; altta katilin adı, silahı, aparatları, kalan canı görünür
const KC_T = 2.8, _kcV = new V3(), _kcP = new V3();
function killcamStart(k) {
  vs.kc = null; $('killcam').classList.remove('on'); $('kcMark').classList.remove('on');
  if (!k.by || k.by === net.myId || k.w === 'bomb' || !net.players[k.by]) return;
  const p0 = livePos(k.by), pr = net.players[k.by];
  vs.kc = { id: k.by, w: k.w, fx: k.fx || [], pos: (p0 || (pr.proxy && pr.proxy.pos) || player.body.position).clone(), yaw: player.yaw, pitch: player.pitch, fov: player.fov, html: '' };
}
function killcamText(kc) {
  const pr = net.players[kc.id] || {}, team = teamOf(kc.id) || '';
  const hp = pr.alive === false ? 0 : Math.max(0, Math.round(pr.hp == null ? 100 : pr.hp));
  const sel = AP_CLS[kc.w] && pr.ax ? apNetParse(pr.ax) : {};
  const aps = Object.entries(sel).map(([s, id]) => { const o = (AP_OPTS[s] || []).find(x => x.id === id); return o && o.m && id !== 'std' && id !== 'yok' ? o.name : ''; }).filter(Boolean);
  return `<small>SENİ ÖLDÜREN</small><b class="${team}">${escapeHtml(nameOf(kc.id))}</b>`
    + `<div class="kcw">${WEAPON_SHORT[kc.w] || ''}${kfIcons(kc.fx)}</div>`
    + (aps.length ? `<div class="kca">${aps.join(' · ')}</div>` : '')
    + `<div class="kch"><span>${hp ? 'KALAN CAN' : 'O DA ÖLDÜ'}</span><i><em style="width:${hp}%"></em></i><span>${hp}</span></div>`;
}
// kamerayı ayarlar; ölüm kamerası çalışıyorsa true döner
function killcamView(rdt) {
  const kc = vs.kc, el = $('killcam'), mk = $('kcMark');
  if (!kc || player.alive || player.deathT >= KC_T || !isVS()) {
    if (kc && (player.alive || player.deathT >= KC_T)) vs.kc = null;
    if (el.classList.contains('on')) { el.classList.remove('on'); mk.classList.remove('on'); }
    return false;
  }
  const lp = livePos(kc.id); if (lp) kc.pos.lerp(lp, Math.min(1, rdt * 12));
  const k = smooth(Math.min(1, Math.max(0, (player.deathT - .35) / 1.1)));   // önce yere yığıl, sonra dön
  _kcV.set(kc.pos.x, kc.pos.y + 1, kc.pos.z).sub(camera.position);
  const dist = Math.max(.5, _kcV.length());
  let dy = Math.atan2(-_kcV.x, -_kcV.z) - kc.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  const tp = Math.asin(Math.max(-1, Math.min(1, _kcV.y / dist)));
  camera.rotation.set(kc.pitch + (tp - kc.pitch) * k, kc.yaw + dy * k, camera.rotation.z * (1 - k));
  const fz = Math.max(16, Math.min(70, 2 * Math.atan(3.2 / dist) * 180 / Math.PI));
  player.fov = kc.fov + (fz - kc.fov) * k;
  camera.fov = player.fov; camera.updateProjectionMatrix();
  const html = killcamText(kc);
  if (html !== kc.html) { kc.html = html; el.innerHTML = html; }
  el.classList.add('on');
  // katilin üstünde kırmızı işaret (duvar arkasında da görünür)
  camera.updateMatrixWorld();
  _kcP.set(kc.pos.x, kc.pos.y + 1.9, kc.pos.z).project(camera);
  const vis = k > .3 && _kcP.z < 1 && Math.abs(_kcP.x) < 1.1 && Math.abs(_kcP.y) < 1.1;
  mk.classList.toggle('on', vis);
  if (vis) mk.style.transform = `translate(${(_kcP.x * .5 + .5) * innerWidth}px,${(-_kcP.y * .5 + .5) * innerHeight}px)`;
  return true;
}
function hostKill(v, by, w, fx) {
  if (vs.over) return;
  if (net.players[v]) net.players[v].alive = false;
  if (isTDM() && by && by !== v && teamOf(by) && teamOf(by) !== teamOf(v)) { if (teamOf(by) === 'red') vs.rr++; else vs.rb++; vs.tick = 0; }   // takım leşi
  const msg = { t: 'pkill', v, by, w, fx: cleanFx(fx).join(',') };
  bcast(msg); onPkill(msg);
}
function onPkill(d) {
  const fx = d.by && d.by !== d.v ? cleanFx(d.fx) : [];
  mvpKill(d);
  vs.feed.unshift({ by: d.by ? nameOf(d.by) : '', byTeam: teamOf(d.by), v: nameOf(d.v), vTeam: teamOf(d.v), w: WEAPON_SHORT[d.w] || '', fx, t: 5 });
  vs.feed.length = Math.min(vs.feed.length, 5);
  if (d.by === net.myId && d.v !== net.myId) {
    statKill({ w: d.w, fx, pvp: true });
    kills++; combo.n++; combo.t = 3.2; score += 100 * combo.n;
    const name = COMBO_NAMES.find(([n]) => combo.n >= n)[1];
    $('comboLabel').textContent = name; $('comboN').textContent = '×' + combo.n;
    hitStop = Math.max(hitStop, .06); sfx.kill();
    ecoKill();
  }
  if (d.v !== net.myId) {
    const p = net.players[d.v];
    if (p) p.alive = false;
    if (p && p.proxy && p.proxy.g.visible) {
      const att = d.by && net.players[d.by] && net.players[d.by].proxy;
      const from = d.by === net.myId ? eyePos : att ? att.pos : p.proxy.pos;
      const push = p.proxy.pos.clone().sub(from).setY(0); if (push.lengthSq() < .01) push.set(0, 0, 1); push.normalize();
      avatarGore(p.proxy, push);
      p.proxy.deadAt = performance.now();
      if (d.by === net.myId && p.proxy.pos.distanceTo(eyePos) < 3.5) screenSplat(4);
    }
  }
}
/* ================= MVP ================= */
// raunt ve maç boyunca herkesin leş / kafa / özel leş / seri / görev sayıları (her istemci pkill'den kendisi hesaplar)
const mvp = { r: {}, m: {} };
const mvpRow = (tab, id) => tab[id] || (tab[id] = { k: 0, hs: 0, fx: 0, d: 0, st: 0, best: 0, obj: 0 });
const mvpScore = r => r.k * 100 + r.hs * 30 + r.fx * 25 + r.obj * 150 + r.best * 10 - r.d * 15;
function mvpKill(d) {
  const fx = cleanFx(d.fx), foe = d.by && d.by !== d.v && teamOf(d.by) !== teamOf(d.v);
  for (const tab of [mvp.r, mvp.m]) {
    const v = mvpRow(tab, d.v); v.d++; v.st = 0;
    if (!foe) continue;
    const k = mvpRow(tab, d.by); k.k++; k.st++; k.best = Math.max(k.best, k.st);
    if (fx.includes('hs')) k.hs++;
    k.fx += fx.filter(f => f !== 'hs').length;
  }
}
function mvpObj(id) { if (id) for (const tab of [mvp.r, mvp.m]) mvpRow(tab, id).obj++; }
function mvpBest(tab, key = mvpScore) {
  let best = null, bv = 0;
  for (const id in tab) { if (!net.players[id] && id !== net.myId) continue; const v = key(tab[id]); if (v > bv) { bv = v; best = id; } }
  return best;
}
function mvpLine(r) {
  const a = [r.k + ' LEŞ'];
  if (r.hs) a.push(r.hs + ' KAFADAN');
  if (r.fx) a.push(r.fx + ' ÖZEL LEŞ');
  if (r.obj) a.push(isBomb() ? 'BOMBA GÖREVİ' : r.obj + ' GÖREV');
  return a.join(' · ');
}
const MVP_STAR = '<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';
function showRoundMvp() {
  const id = mvpBest(mvp.r), el = $('mvpCard');
  if (!id) return;
  const r = mvp.r[id];
  el.innerHTML = `${MVP_STAR}<div><small>RAUNDUN YILDIZI</small><b class="${teamOf(id) || ''}">${escapeHtml(nameOf(id))}</b><span>${mvpLine(r)}</span></div>`;
  el.classList.toggle('me', id === net.myId);
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  clearTimeout(showRoundMvp.t); showRoundMvp.t = setTimeout(() => el.classList.remove('on'), (END_T - .3) * 1000);
  if (id === net.myId) sfx.wave();
}
// maç sonu: büyük MVP kartı ve ödüller
function mvpEndHtml() {
  const tab = mvp.m, id = mvpBest(tab);
  if (!id) return '';
  const r = tab[id];
  const awards = [
    ['KESKİN NİŞANCI', 'en çok kafadan', mvpBest(tab, x => x.hs), x => x.hs + ' kafadan'],
    ['SERİ KATİL', 'ölmeden en uzun seri', mvpBest(tab, x => x.best >= 2 ? x.best : 0), x => x.best + ' leş üst üste'],
    ['GÖSTERİ', 'en çok özel leş', mvpBest(tab, x => x.fx), x => x.fx + ' özel leş'],
    ['YIKILMAZ', 'en iyi leş / ölüm', mvpBest(tab, x => x.k >= 3 ? x.k / Math.max(1, x.d) : 0), x => (x.k / Math.max(1, x.d)).toFixed(1) + ' L/Ö'],
  ].concat(isBomb() ? [['GÖREV ADAMI', 'bomba kurdu / imha etti', mvpBest(tab, x => x.obj), x => x.obj + ' görev']] : [])
    .filter(a => a[2]);
  return `<div class="mvpBig${id === net.myId ? ' me' : ''}">${MVP_STAR}<div><small>MAÇIN EN DEĞERLİ OYUNCUSU</small><b class="${teamOf(id) || ''}">${escapeHtml(nameOf(id))}</b><span>${mvpLine(r)}${r.best >= 3 ? ' · ' + r.best + ' SERİ' : ''}</span></div></div>`
    + (awards.length ? '<div class="mvpAw">' + awards.map(([t, d, aid, f]) => `<div${aid === net.myId ? ' class="me"' : ''}><small>${t}</small><b class="${teamOf(aid) || ''}">${escapeHtml(nameOf(aid))}</b><span>${f(tab[aid])}</span></div>`).join('') + '</div>' : '');
}

// ölüyken yaşayan bir takım arkadaşını izle (önce ölüm kamerası biter)
function spectateTarget() {
  if (!isVS() || player.alive || player.deathT < (vs.kc ? KC_T : 1.5) || vs.phase === 'buy') return null;
  for (const id in net.players) { const p = net.players[id]; if (id !== net.myId && p.team === myTeam() && p.alive && p.proxy && p.proxy.g.visible) return p; }
  return null;
}

/* ================= RAUNTLAR ================= */
// takım ölüm maçında üssün içinden yaşayan rakiplerin görmediği, onlardan uzak bir nokta seçilir (doğar doğmaz vurulmasın)
const _spO = new V3(), _spD = new V3();
function livePos(id) {
  if (id === net.myId) return player.alive ? player.body.position : null;
  const p = net.players[id]; if (!p || !p.alive) return null;
  const b = typeof botById === 'function' ? botById(id) : null;
  return b ? b.pos : p.proxy ? p.proxy.pos : null;
}
function spawnPoint(team) {
  const M = MAPS[curMap];
  if (!isTDM()) return M.spawn(team);
  const foes = [];
  for (const id in net.players) { if (net.players[id].team === team) continue; const q = livePos(id); if (q) foes.push(q); }
  if (!foes.length) return M.spawn(team);
  let best = null, bs = -Infinity;
  for (let i = 0; i < 10; i++) {
    const c = M.spawn(team); let sc = 0;
    for (const f of foes) {
      const dx = c.x - f.x, dz = c.z - f.z, d = Math.hypot(dx, dz);
      sc += Math.min(d, 30) * .05;
      if (d < 75) {
        _spO.set(f.x, f.y + 1.1, f.z); _spD.set(dx, c.y + 1 - _spO.y, dz); const L = _spD.length(); _spD.divideScalar(L);
        if (rayStatic(_spO, _spD, L) >= L - .05) sc -= 10;   // rakip burayı görüyor
      }
    }
    if (sc > bs) { bs = sc; best = c; }
  }
  return best;
}
function pvpRespawn() {
  const sp = spawnPoint(myTeam());
  const b = player.body; b.position.copy(sp); b.velocity.set(0, 0, 0);
  Object.assign(player, { alive: true, hp: ST.maxHp, deathT: 0, yaw: sp.z < 0 ? Math.PI : 0, pitch: 0, slideT: 0, dashT: 0 });   // haritanın ortasına bakarak doğ
  block.guard = 100;
  ammo.mag = magCap(); ammo.reserve = 3; shells.tube = ST.sgTube; shells.reserve = 24; resetRifles(); resetGuns();
  if (isTDM()) tdmRestock();   // aldığın kalkan ve bombalar her doğuşta geri gelir
  if (state === 'dead') state = 'play';
}
function hostStartRound() {
  vs.round++;
  for (const id in net.players) net.players[id].alive = true;
  const msg = { t: 'round', ph: 'buy', n: vs.round, rr: vs.rr, rb: vs.rb, time: isTDM() ? 8 : BUY_T };
  bcast(msg); onRound(msg);
}
function hostSetPhase(ph, extra = {}) {
  const msg = Object.assign({ t: 'round', ph, n: vs.round, rr: vs.rr, rb: vs.rb, time: ph === 'live' ? (isTDM() ? TDM_T : ROUND_T) : END_T }, extra);
  bcast(msg); onRound(msg);
  if (ph === 'live' && isBomb()) hostGiveBomb();
}
function hostEndRound(win) {
  if (win === 'red') vs.rr++; else if (win === 'blue') vs.rb++;
  hostSetPhase('end', { win });
}
function onRound(d) {
  vs.phase = d.ph; vs.t = d.time; vs.rr = d.rr; vs.rb = d.rb; vs.round = d.n;
  if (d.ph === 'buy') {
    mvp.r = {}; $('mvpCard').classList.remove('on');
    if (isBomb()) resetBomb();
    pvpRespawn();
    if (net.mode === 'host') for (const b of bots.list) botSpawn(b);
    ecoRoundBuy(d.n);
    if (isBomb() && d.n === BOMB.half + 1) banner('DEVRE ARASI', 'Taraflar değişti · ' + (myTeam() === attackTeam() ? 'artık SALDIRIYORSUN' : 'artık SAVUNUYORSUN'));
    else if (isTDM()) banner('TAKIM ÖLÜM MAÇI', 'İlk ' + KILLS_WIN + ' leşe ulaşan takım kazanır · ölünce ' + TDM_RESPAWN + ' sn sonra doğarsın');
    else banner('RAUNT ' + d.n, (isBomb() ? (myTeam() === attackTeam() ? 'SALDIRI: bombayı kur · ' : 'SAVUNMA: bölgeleri koru · ') : '') + 'Satın alma menüsü · B ile aç / kapat');
  } else if (d.ph === 'live') {
    ecoRoundLive();
    applyLoadout();
    if (isTDM()) vs.buyT = TDM_BUY;   // ilk 10 sn daha satın alınabilir
    banner('SAVAŞ', '');
    sfx.wave();
  } else if (d.ph === 'end') {
    ecoRoundEnd(d.win);
    banner(d.win === 'draw' ? 'BERABERE' : TEAMS[d.win].name + ' RAUNDU ALDI', vs.rr + ' — ' + vs.rb);
    showRoundMvp();
  }
}
function aliveCount(team) {
  let n = 0;
  for (const id in net.players) {
    const p = net.players[id]; if (p.team !== team) continue;
    if (id === net.myId ? player.alive : p.alive) n++;
  }
  return n;
}
function endVS() {
  if (vs.over) return;
  vs.over = true;
  const win = vs.rr > vs.rb ? 'red' : vs.rb > vs.rr ? 'blue' : 'draw';
  bcast({ t: 'vsover', win, rr: vs.rr, rb: vs.rb });
  showVsEnd(win);
}
function showVsEnd(win) {
  vs.over = true; state = 'dead'; closeBuy();
  showEnd(win === 'draw' ? 'Berabere' : TEAMS[win].name + ' TAKIM KAZANDI', win);
}
function resetVS() {
  vs.lastTeam = null;
  Object.assign(vs, { rr: 0, rb: 0, round: 0, phase: 'buy', t: BUY_T, spawnProt: 0, deaths: 0, feed: [], over: false, tick: 0, lastHit: null, respawnT: 0, buyT: 0, kc: null });
  resetEco(); clearUtils();
  mvp.r = {}; mvp.m = {};
}

/* ================= HER KARE ================= */
// takımım değiştiyse: hazırlıkta yeni üsse geç, raunt sürerken bu rauntdan çekil
function checkTeamChange() {
  const mt = myTeam();
  if (vs.lastTeam && mt !== vs.lastTeam && !vs.over) {
    banner('TAKIM DEĞİŞTİ', TEAMS[mt].name + (vs.phase === 'live' ? ' · sonraki rauntta oyundasın' : ''));
    if (vs.phase === 'buy') pvpRespawn();
    else if (isTDM()) { pvpRespawn(); applyLoadout(); vs.spawnProt = 2; }
    else if (player.alive) {
      player.alive = false; player.hp = 0; player.deathT = 0; if (state === 'play') state = 'dead'; eco.keep = false;   // duraklatma menüsü açıksa açık kalsın
      if (net.mode === 'host' && net.players.h) net.players.h.alive = false;
    }
  }
  vs.lastTeam = mt;
}
// takım değişikliği (yalnız host): oyuncu kendisi istediyse ya da host onu taşıdıysa. Hazırlıkta ve TDM'de yeni üste doğar,
// raunt sürerken (ve raunt sonunda) bu rauntdan çekilir, sonraki rauntta yeni takımında başlar. Parası korunur.
function hostSetTeam(id, t) {
  const p = net.players[id]; if (!p || !TEAMS[t] || p.team === t) return;
  p.team = t;
  if ((vs.phase === 'live' || vs.phase === 'end') && id !== 'h' && !isTDM()) p.alive = false;
  const b = isBot(id) ? botById(id) : null;   // botun kendi istemcisi yok: değişikliği host uygular
  if (b) { if (vs.phase === 'buy' || isTDM()) botSpawn(b); else { b.p.alive = false; b.tgt = null; b.path = []; } botSend(b); }
  sendRoster();
  toast(p.name.toLocaleUpperCase('tr-TR') + ' → ' + TEAMS[t].name); chatSys(p.name + ' artık ' + TEAMS[t].name + ' takımda');
}
function updateVS(dt, rdt) {
  checkTeamChange();
  vs.t -= rdt;
  vs.spawnProt = Math.max(0, vs.spawnProt - rdt);
  if (isTDM() && !vs.over) {
    vs.buyT = Math.max(0, vs.buyT - rdt);
    if (!player.alive && vs.respawnT > 0) {
      vs.respawnT -= rdt;
      if (vs.respawnT <= 0 && vs.phase === 'live') { pvpRespawn(); applyLoadout(); vs.buyT = TDM_BUY; vs.spawnProt = 2; banner('YENİDEN DOĞDUN', TDM_BUY + ' sn içinde B ile satın alabilirsin'); }
    }
  }
  for (const f of vs.feed) f.t -= rdt;
  vs.feed = vs.feed.filter(f => f.t > 0);
  if (net.mode !== 'host' || vs.over) return;
  vs.tick -= rdt;
  if (vs.tick <= 0) { vs.tick = 1; bcast({ t: 'vs', ph: vs.phase, time: Math.max(0, vs.t), rr: vs.rr, rb: vs.rb }); }
  // herkes hazırsa satın alma süresi kısalır
  if (vs.phase === 'buy' && vs.t > 3 && eco.ready && Object.values(net.players).every(p => p.id === 'h' || p.rd)) { vs.t = 3; vs.tick = 0; }
  if (vs.phase === 'buy' && vs.t <= 0) hostSetPhase('live');
  else if (vs.phase === 'live' && isTDM()) { if (vs.rr >= KILLS_WIN || vs.rb >= KILLS_WIN || vs.t <= 0) endVS(); }
  else if (vs.phase === 'live' && isBomb()) bombHostTick(rdt);
  else if (vs.phase === 'live') {
    const r = aliveCount('red'), b = aliveCount('blue');
    const hasBlue = Object.values(net.players).some(p => p.team === 'blue'), hasRed = Object.values(net.players).some(p => p.team === 'red');
    if (hasRed && hasBlue && (r === 0 || b === 0)) hostEndRound(r === 0 && b === 0 ? 'draw' : r === 0 ? 'blue' : 'red');
    else if (vs.t <= 0) hostEndRound(r > b ? 'red' : b > r ? 'blue' : 'draw');
  } else if (vs.phase === 'end' && vs.t <= 0) {
    if (vs.rr >= ROUNDS_WIN || vs.rb >= ROUNDS_WIN) endVS(); else hostStartRound();
  }
}
function renderVsHud() {
  const tm = Math.max(0, Math.ceil(vs.t));
  setText('vsRed', vs.rr); setText('vsBlue', vs.rb);
  setText('vsTime', (vs.phase === 'buy' ? 'HAZIRLIK ' : vs.phase === 'end' || isTDM() ? '' : 'R' + vs.round + ' · ') + (vs.phase === 'end' ? 'RAUNT BİTTİ' : Math.floor(tm / 60) + ':' + String(tm % 60).padStart(2, '0')));
  setText('vsTeam', TEAMS[myTeam()].name + ' TAKIMDASIN' + (isBomb() ? ' · ' + (myTeam() === attackTeam() ? 'SALDIRI' : 'SAVUNMA') : '') + (isTDM() ? ' · İLK ' + KILLS_WIN + ' LEŞ' : ' · İLK ' + ROUNDS_WIN + ' RAUNT'));
  $('vsTeam').className = myTeam();
  setText('ecoHud', '◈ ' + (infMoney() ? '∞' : eco.cr) + (eco.smoke ? '   Z SİS ×' + eco.smoke : '') + (eco.flash ? '   X FLAŞ ×' + eco.flash : '') + (eco.he ? '   H BOMBA ×' + eco.he : '') + (buyPhase() && !buy.open ? '   B MENÜ' : ''));
  $('armorb').style.width = (eco.armor / 50 * 100) + '%';
  const html = vs.feed.map(f => `<div class="kf"><b class="${f.byTeam || ''}">${escapeHtml(f.by)}</b><span>${f.w}</span>${kfIcons(f.fx)}<b class="${f.vTeam || ''}">${escapeHtml(f.v)}</b></div>`).join('');
  if (hud.feed !== html) { hud.feed = html; $('killfeed').innerHTML = html; }
  const sp = spectateTarget();
  setText('respawnHint', !player.alive && !vs.over && isTDM() ? 'YENİDEN DOĞUŞ ' + Math.max(1, Math.ceil(vs.respawnT)) : !player.alive && !vs.over && vs.phase === 'live' ? (sp ? 'İZLİYORSUN: ' + sp.name.toLocaleUpperCase('tr-TR') : 'SONRAKİ RAUNDU BEKLE') + (eco.deathInfo ? '\n' + eco.deathInfo : '') : '');
}
