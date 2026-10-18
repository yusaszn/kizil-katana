'use strict';
/* Çok oyunculu co-op: PeerJS ile oda kur / katıl. Oyunu odayı kuran (host) yönetir:
   düşmanlar, dalgalar ve boss host'ta çalışır, katılanlar görüntü alır ve vuruşlarını host'a gönderir. */

const NET_PREFIX = 'kizilkatana-v1-';
const GAME_VERSION = 14;   // host ve katılan aynı sürümde olmalı
const MAX_PLAYERS = 4;
// çok oyunculu: exe (file:), yerel sunucu ve GitHub Pages adresinde açık (claude.ai önizlemesinde WebRTC engelli)
const MP_OK = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.endsWith('github.io');
const net = { mode: 'solo', peer: null, hostConn: null, myId: 'solo', code: '', players: {}, sendT: 0, snapT: 0, guestSeq: 0, inMatch: false, gameMode: 'coop', vsMap: 'arena', money: 'normal' };
const netFx = { sw: 0, sh: 0 };
const PLAYER_COLORS = [0x2f6f8f, 0xc9a227, 0x6f3f9f, 0x3f8f4f];

let myName = '';
try { myName = localStorage.getItem('kk-isim') || ''; } catch (e) { /* yok */ }
function playerName() { return (myName.trim() || 'Oyuncu').slice(0, 16); }
const v3 = a => new V3(a[0], a[1], a[2]);
const r2 = n => Math.round(n * 100) / 100;
const arr = v => [r2(v.x), r2(v.y), r2(v.z)];

function lobbyMsg(t) { $('lobbyMsg').textContent = t; $('lobbyNote').textContent = t; }
function randomCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += a[(Math.random() * a.length) | 0]; return s; }
function bcast(msg, except) {
  if (net.mode !== 'host') return;
  for (const id in net.players) { const p = net.players[id]; if (p.conn && p.conn !== except && p.conn.open) p.conn.send(msg); }
}
function toHost(msg) { if (net.mode === 'guest' && net.hostConn && net.hostConn.open) net.hostConn.send(msg); }

/* ================= ODA ================= */
function hostRoom() {
  if (typeof Peer === 'undefined') { lobbyMsg('Çok oyunculu kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'); return; }
  leaveRoom(true);
  const code = randomCode();
  lobbyMsg('Oda kuruluyor...');
  const peer = new Peer(NET_PREFIX + code, { debug: 0 });
  net.peer = peer;
  peer.on('open', () => {
    net.mode = 'host'; net.myId = 'h'; net.code = code; net.players = {};
    addPlayer('h', playerName(), null);
    showLobby();
  });
  peer.on('connection', conn => {
    conn.on('data', d => onHostData(conn, d));
    conn.on('close', () => dropGuest(conn));
    conn.on('error', () => dropGuest(conn));
  });
  peer.on('error', err => {
    if (err.type === 'unavailable-id') { hostRoom(); return; }
    lobbyMsg('Bağlantı hatası (' + err.type + '). Tekrar dene.');
  });
}
function joinRoom(code) {
  code = (code || '').trim().toUpperCase().replace(/^.*ODA-/, '');
  if (!code) { lobbyMsg('Önce oda kodunu yaz.'); return; }
  if (typeof Peer === 'undefined') { lobbyMsg('Çok oyunculu kütüphanesi yüklenemedi. İnternet bağlantını kontrol et.'); return; }
  leaveRoom(true);
  lobbyMsg('Odaya bağlanılıyor...');
  const peer = new Peer(undefined, { debug: 0 });
  net.peer = peer;
  peer.on('open', () => {
    const conn = peer.connect(NET_PREFIX + code, { reliable: true, serialization: 'json' });
    net.hostConn = conn;
    const to = setTimeout(() => { if (net.mode !== 'guest') lobbyMsg('Odaya ulaşılamadı. Kodu kontrol et ya da tekrar dene.'); }, 12000);
    conn.on('open', () => {
      clearTimeout(to);
      net.mode = 'guest'; net.code = code; net.lastHostMsg = performance.now();
      conn.send({ t: 'hello', name: playerName(), v: GAME_VERSION });
    });
    conn.on('data', onGuestData);
    conn.on('close', hostLost);
    conn.on('error', hostLost);
  });
  peer.on('error', err => { lobbyMsg(err.type === 'peer-unavailable' ? 'Bu kodla açık bir oda yok.' : 'Bağlantı hatası (' + err.type + ').'); });
}
function leaveRoom(silent) {
  try {
    if (net.mode === 'guest') toHost({ t: 'bye' });
    if (net.mode === 'host') bcast({ t: 'closed' });
  } catch (e) { /* bağlantı zaten kopmuş */ }
  const peer = net.peer;
  if (peer) setTimeout(() => { try { peer.destroy(); } catch (e) { /* zaten kapalı */ } }, 150);
  for (const id in net.players) removeProxy(id);
  Object.assign(net, { mode: 'solo', peer: null, hostConn: null, myId: 'solo', code: '', players: {}, inMatch: false, gameMode: 'coop', vsMap: 'arena', money: 'normal' });
  if (!silent) { $('lobby').hidden = true; $('start').hidden = false; lobbyMsg(''); }
}
function hostLost() {
  if (net.mode !== 'guest') return;
  const wasPlaying = net.inMatch;
  leaveRoom(true);
  if (wasPlaying) { state = 'dead'; showEnd('Host oyundan çıktı'); }
  else { $('lobby').hidden = true; $('start').hidden = false; lobbyMsg('Host odayı kapattı.'); }
}
function addPlayer(id, name, conn) {
  const used = Object.values(net.players).map(p => p.color);
  const color = PLAYER_COLORS.find(c => !used.includes(c)) || PLAYER_COLORS[0];
  // yeni gelen az kişili takıma girer
  const n = { red: 0, blue: 0 }; for (const p of Object.values(net.players)) n[p.team]++;
  const team = n.red <= n.blue ? 'red' : 'blue';
  net.players[id] = { id, name, conn, kills: 0, deaths: 0, score: 0, lv: 1, alive: true, hp: 100, proxy: null, color, team, lastSeen: performance.now(), ping: null };
}
function setGameMode(m) { if (net.mode !== 'host' || net.inMatch) return; net.gameMode = m; sendRoster(); }
function setVsMap(m) { if (net.mode !== 'host' || net.inMatch) return; net.vsMap = m; sendRoster(); }
function setMoney(m) { if (net.mode !== 'host' || net.inMatch) return; net.money = m; sendRoster(); }
function switchTeam(id) {
  const p = net.players[id]; if (!p) return;
  if (net.mode === 'guest') { toHost({ t: 'team' }); return; }
  p.team = p.team === 'red' ? 'blue' : 'red';
  if (p.proxy) p.proxy.teamSet = null;
  sendRoster();
}
function dropGuest(conn, why) {
  const id = conn.pid; if (!id || !net.players[id]) return;
  toast(net.players[id].name + (why || ' ayrıldı'));
  removeProxy(id); delete net.players[id];
  try { conn.close(); } catch (e) { /* zaten kapalı */ }
  sendRoster(); renderLobby(); renderPausePlayers();
  if (net.inMatch) checkAllDead();
}
function kickPlayer(id) {
  const p = net.players[id]; if (net.mode !== 'host' || !p || !p.conn) return;
  try { p.conn.send({ t: 'kicked' }); } catch (e) { /* kopmuş */ }
  setTimeout(() => dropGuest(p.conn, ' odadan atıldı'), 100);
}
function pingOf(id) {
  if (id === 'h') return 'host';
  const p = net.players[id]; return p ? p.ping : null;
}
// Her saniye: ping ölç, sessiz kalan oyuncuları düşür, host'tan haber gelmiyorsa ayrıl
setInterval(() => {
  const now = performance.now();
  if (net.mode === 'host') {
    for (const id in net.players) {
      const p = net.players[id]; if (!p.conn) continue;
      if (now - p.lastSeen > 6000) { dropGuest(p.conn, ' bağlantısı koptu'); continue; }
      if (p.conn.open) p.conn.send({ t: 'ping', ts: now });
    }
    const m = {}; for (const id in net.players) m[id] = pingOf(id);
    bcast({ t: 'pings', m });
    if (!$('lobby').hidden) renderLobby();
  } else if (net.mode === 'guest') {
    toHost({ t: 'hb' });
    if (net.lastHostMsg && now - net.lastHostMsg > 9000) hostLost();
  }
}, 1000);
window.addEventListener('beforeunload', () => leaveRoom(true));
function roster() { return Object.values(net.players).map(p => ({ id: p.id, name: p.name, color: p.color, team: p.team })); }
function sendRoster() { bcast({ t: 'roster', list: roster(), code: net.code, mode: net.gameMode, map: net.vsMap, money: net.money }); renderLobby(); }
function showLobby() {
  $('start').hidden = true; $('lobby').hidden = false;
  $('roomCode').textContent = net.code;
  $('lobbyStart').hidden = net.mode !== 'host';
  lobbyMsg(net.mode === 'host' ? 'Kodu arkadaşına gönder. O da oyunu açıp ODAYA KATIL kısmına yazsın.' : 'Bağlandın. Host başlatınca oyun başlayacak.');
  renderLobby();
}
function renderLobby() {
  fillPlayerList($('lobbyList'));
  const gm = net.gameMode, host = net.mode === 'host';
  $('modeCoop').classList.toggle('on', gm === 'coop'); $('modeVs').classList.toggle('on', gm === 'vs'); $('modeBomb').classList.toggle('on', gm === 'bomb');
  $('modeCoop').disabled = $('modeVs').disabled = $('modeBomb').disabled = !host;
  $('mapPick').hidden = gm !== 'vs';
  for (const [id, m] of [['mapArena', 'arena'], ['mapAvlu', 'avlu'], ['mapCol', 'col']]) { $(id).classList.toggle('on', net.vsMap === m); $(id).disabled = !host; }
  $('moneyPick').hidden = gm === 'coop';
  $('moneyNormal').classList.toggle('on', net.money !== 'inf'); $('moneyInf').classList.toggle('on', net.money === 'inf');
  $('moneyNormal').disabled = $('moneyInf').disabled = !host;
  $('modeInfo').textContent = gm === 'vs'
    ? 'VS: Kırmızı ve Mavi takım, rauntlu. Raunt başında kredinle silah, kalkan ve yetenek alırsın. Son kalan takım raundu alır, ilk ' + ROUNDS_WIN + ' raunt kazanır.'
    : gm === 'bomb'
    ? 'BOMBA: Çöl Geçidi haritası. Saldıranlar bombayı A ya da B bölgesine kurar (4 basılı), savunanlar engeller ya da imha eder. ' + BOMB.half + '. rauntta taraf değişir, ilk ' + ROUNDS_WIN + ' raunt kazanır.'
    : 'CO-OP: Birlikte iblislere karşı. Her 5 dalgada ara boss, her 10 dalgada büyük boss gelir.';
}
function fillPlayerList(ul) {
  ul.innerHTML = '';
  const vsMode = net.gameMode !== 'coop';
  for (const p of Object.values(net.players)) {
    const li = document.createElement('li');
    const ping = pingOf(p.id);
    const col = vsMode ? TEAMS[p.team].color : p.color;
    li.innerHTML = `<i style="background:#${col.toString(16).padStart(6, '0')}"></i>${escapeHtml(p.name)}${p.id === net.myId ? ' <small>(sen)</small>' : ''}${vsMode ? ` <small class="tm ${p.team}">${TEAMS[p.team].name}</small>` : ''} <small>${ping === 'host' ? 'HOST' : ping != null ? ping + ' ms' : ''}</small>`;
    if (vsMode && !net.inMatch && (p.id === net.myId || net.mode === 'host')) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'kick'; b.textContent = 'TAKIM DEĞİŞTİR';
      b.addEventListener('click', () => switchTeam(p.id));
      li.appendChild(b);
    }
    if (net.mode === 'host' && p.id !== 'h') {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'kick'; b.textContent = 'AT';
      b.addEventListener('click', () => kickPlayer(p.id));
      li.appendChild(b);
    }
    ul.appendChild(li);
  }
}
function renderPausePlayers() {
  const ul = $('pausePlayers');
  ul.hidden = net.mode === 'solo';
  if (net.mode !== 'solo') fillPlayerList(ul);
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ================= MAÇ ================= */
function startMatchHost() {
  if (net.mode !== 'host') return;
  if (net.gameMode === 'bomb') net.vsMap = 'col';
  net.inMatch = true; resetGame();
  bcast({ t: 'start', wave: hashWave, mode: net.gameMode, map: net.vsMap, money: net.money, list: roster() });
  $('lobby').hidden = true;
  play();
  if (isVS()) setTimeout(hostStartRound, 600);
}
function startMatchGuest(d) {
  net.gameMode = d.mode || 'coop'; net.vsMap = d.map || 'arena'; net.money = d.money || 'normal';
  if (d.list) for (const r of d.list) if (net.players[r.id]) net.players[r.id].team = r.team;
  net.inMatch = true; resetGame();
  waveN = d.wave || 0;
  $('lobby').hidden = true; $('start').hidden = true;
  play(true);
  toast('FAREYİ KİLİTLEMEK İÇİN TIKLA');
}

/* ================= HOST MESAJLARI ================= */
function onHostData(conn, d) {
  if (conn.pid && net.players[conn.pid]) net.players[conn.pid].lastSeen = performance.now();
  switch (d.t) {
    case 'hb': break;
    case 'pong': { const p = net.players[conn.pid]; if (p) p.ping = Math.round(performance.now() - d.ts); break; }
    case 'bye': dropGuest(conn); break;
    case 'hello': {
      if (d.v !== GAME_VERSION) { conn.send({ t: 'version', need: GAME_VERSION }); setTimeout(() => conn.close(), 300); return; }
      if (Object.keys(net.players).length >= MAX_PLAYERS) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
      const id = 'g' + (++net.guestSeq); conn.pid = id;
      addPlayer(id, String(d.name || 'Oyuncu').slice(0, 16), conn);
      conn.send({ t: 'welcome', id, code: net.code });
      sendRoster();
      toast(net.players[id].name + ' katıldı');
      if (net.inMatch) {
        conn.send({ t: 'start', wave: waveN, mode: net.gameMode, map: net.vsMap, money: net.money, list: roster() });
        if (isBomb()) conn.send(bombMsg());
        if (isVS()) conn.send({ t: 'round', ph: vs.phase, n: vs.round, rr: vs.rr, rb: vs.rb, time: vs.t });
      }
      break;
    }
    case 'team': if (!net.inMatch) switchTeam(conn.pid); break;
    case 'phit': d.by = conn.pid; deliverPhit(d); break;
    case 'pdied': if (isVS()) hostKill(conn.pid, d.by, d.w); break;
    case 'boom': bcast(d, conn); explodeAt(v3(d.p), false, d.r || 5); break;
    case 'util': bcast(d, conn); onUtil(d); break;
    case 'bplant': hostPlant(conn.pid, d); break;
    case 'bdefuse': hostDefuse(conn.pid); break;
    case 'ps': {
      const p = net.players[conn.pid]; if (!p) return;
      applyPlayerState(conn.pid, d);
      bcast(Object.assign({}, d, { id: conn.pid }), conn);
      if (net.inMatch) checkAllDead();
      break;
    }
    case 'hit': { const e = enemyById(d.id); if (e) hurtEnemy(e, d.dmg, v3(d.push), v3(d.cut), { big: d.big, bullet: d.bullet, head: d.head, power: d.pw, at: d.at ? v3(d.at) : null, by: conn.pid }); break; }
    case 'kick': { const e = enemyById(d.id); if (e) applyKick(e, v3(d.dir), d.kp, conn.pid); break; }
    case 'parry': { const e = enemyById(d.id); if (e) stunAttacker(e, v3(d.dir)); break; }
    case 'deflect': {
      const f = fbById(d.id); if (!f || f.deflected) return;
      f.deflected = true; f.by = conn.pid; f.vel.copy(v3(d.v)); f.s.material = fbGlowBlue; f.life = 4;
      bcast({ t: 'fbd', id: f.id, p: arr(f.pos), v: arr(f.vel) }, conn);
      break;
    }
    case 'fbshot': { const f = fbById(d.id); if (f) explodeFireball(f); break; }
  }
}

/* ================= KATILAN MESAJLARI ================= */
function onGuestData(d) {
  net.lastHostMsg = performance.now();
  switch (d.t) {
    case 'ping': toHost({ t: 'pong', ts: d.ts }); break;
    case 'pings': for (const id in d.m) if (net.players[id]) net.players[id].ping = d.m[id]; break;
    case 'welcome': net.myId = d.id; net.code = d.code; showLobby(); break;
    case 'full': lobbyMsg('Oda dolu (en fazla ' + MAX_PLAYERS + ' kişi).'); break;
    case 'version': leaveRoom(true); lobbyMsg('Sürümler farklı. İkiniz de oyunun en son sürümünü kullanın.'); break;
    case 'kicked': case 'closed': {
      const txt = d.t === 'kicked' ? 'Odadan atıldın.' : 'Host odayı kapattı.';
      const wasPlaying = net.inMatch;
      leaveRoom(true);
      if (wasPlaying) { state = 'dead'; showEnd(txt); } else { $('lobby').hidden = true; $('start').hidden = false; lobbyMsg(txt); }
      break;
    }
    case 'roster': {
      const keep = {};
      for (const r of d.list) { keep[r.id] = true; if (!net.players[r.id]) addPlayer(r.id, r.name, null); Object.assign(net.players[r.id], { name: r.name, color: r.color, team: r.team }); }
      for (const id in net.players) if (!keep[id]) { removeProxy(id); delete net.players[id]; }
      if (d.mode && !net.inMatch) net.gameMode = d.mode;
      if (d.map && !net.inMatch) net.vsMap = d.map;
      if (d.money && !net.inMatch) net.money = d.money;
      renderLobby();
      break;
    }
    case 'phit': applyPhit(d); break;
    case 'pkill': onPkill(d); break;
    case 'vs': vs.rr = d.rr; vs.rb = d.rb; vs.t = d.time; break;
    case 'round': onRound(d); break;
    case 'vsover': vs.rr = d.rr; vs.rb = d.rb; showVsEnd(d.win); break;
    case 'boom': explodeAt(v3(d.p), false, d.r || 5); break;
    case 'util': onUtil(d); break;
    case 'bomb': onBombState(d); break;
    case 'start': startMatchGuest(d); break;
    case 'snap': applySnapshot(d); break;
    case 'ps': if (d.id !== net.myId) applyPlayerState(d.id, d); break;
    case 'hurt': { const e = enemyById(d.id); if (e) enemyHurtFx(e, v3(d.push), d.at ? v3(d.at) : null, d.bullet, d.head, false); break; }
    case 'kill': { const e = enemyById(d.id); if (e) killFx(e, v3(d.push), v3(d.cut), { big: d.big, bullet: d.bullet, by: d.by }); break; }
    case 'hurtYou': hurtPlayer(d.dmg, d.from ? new V3(d.from[0], 0, d.from[1]) : null, d.att != null ? { netId: d.att } : null, { unblockable: d.ub }); break;
    case 'fb': spawnFireballVisual(d.id, v3(d.p), v3(d.v)); break;
    case 'fbx': { const f = fbById(d.id); if (f) explodeFireball(f); break; }
    case 'fbd': { const f = fbById(d.id); if (f) { f.deflected = true; f.pos.copy(v3(d.p)); f.vel.copy(v3(d.v)); f.s.material = fbGlowBlue; f.life = 4; } break; }
    case 'shock': spawnShockwave(d.x, d.z, d.rage); break;
    case 'pillar': firePillar(d.x, d.z, d.d, true); break;
    case 'wave': onWaveStart(d.n); break;
    case 'clear': onWaveClear(); break;
    case 'over': state = 'dead'; showEnd('Herkes parçalandı'); break;
    case 'toast': toast(d.text); break;
  }
}

/* ================= DURUM GÖNDERME ================= */
function myState() {
  const b = player.body.position, v = player.body.velocity;
  return { t: 'ps', id: net.myId, name: playerName(), p: arr(b), v: [r2(v.x), r2(v.z)], yaw: r2(player.yaw), pitch: r2(player.pitch), w: wpn.cur, b: block.on ? 1 : 0, a: player.alive ? 1 : 0, sw: netFx.sw, sh: netFx.sh, hp: Math.ceil(player.hp), lv: prog.lv, k: kills, s: score, rv: r2(revive.p), c: r2(player.crouchK), sl: player.slideT > 0 ? 1 : 0, kc: netFx.kc || 0, ft: netFx.ft ? 1 : 0, pk: picksLeft(), dt: vs.deaths, cr: eco.cr, rd: eco.ready ? 1 : 0 };
}
function updateNet(dt) {
  if (net.mode === 'solo' || !net.inMatch) return;
  net.sendT -= dt;
  if (net.sendT <= 0) {
    net.sendT = .05;
    const st = myState();
    if (net.mode === 'guest') toHost(st); else { applyPlayerState('h', st, true); bcast(st); }
  }
  if (net.mode === 'host') {
    net.snapT -= dt;
    if (net.snapT <= 0) { net.snapT = .05; bcast(makeSnapshot()); }
  }
}
const KINDS = ['grunt', 'imp', 'brute', 'boss', 'runner', 'shielder', 'bomber', 'flyer', 'cellat', 'witch', 'lord'];
const ACTS = [null, 'swipe', 'charge', 'slam', 'volley', 'barrier', 'cleave', 'leap', 'summon', 'guard', 'pillar', 'meteor', 'teleport', 'ring', 'fireshield', 'burst'];
function makeSnapshot() {
  const e = enemies.map(x => {
    const b = x.body.position;
    const charging = x.charge > 0 || (x.act && x.act.type === 'charge' && x.act.t > .7);
    const fl = (x.windup > 0 ? 1 : 0) | (charging ? 2 : 0) | (x.raged ? 4 : 0) | (x.act && x.act.done ? 8 : 0) | (x.flash > .5 ? 16 : 0) | (x.shieldT > 0 ? 32 : 0) | (x.elite ? 64 : 0);
    return [x.id, KINDS.indexOf(x.kind), r2(b.x), r2(b.y), r2(b.z), r2(x.model.g.rotation.y), r2(Math.max(0, x.hp)), r2(x.maxHp), fl, x.act ? ACTS.indexOf(x.act.type) : 0];
  });
  return { t: 'snap', e, w: waveN, bc: bossCount, wt: waitingFor };
}
function applySnapshot(d) {
  const seen = {};
  for (const a of d.e) {
    const [id, k, x, y, z, ry, hp, mhp, fl, act] = a;
    let e = enemyById(id);
    if (!e) e = spawnRemoteEnemy(id, KINDS[k], x, y, z);
    e.net.x = x; e.net.y = y; e.net.z = z; e.net.ry = ry; e.net.fl = fl; e.net.act = ACTS[act];
    e.hp = hp; e.maxHp = mhp;
    if (fl & 16) e.flash = Math.max(e.flash, .6);
    seen[id] = true;
  }
  for (const e of enemies.slice()) if (!seen[e.id]) removeEnemy(e);
  waveN = d.w; bossCount = d.bc; waitingFor = d.wt || [];
}

/* ================= DİĞER OYUNCULAR ================= */
function nameSprite(text, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.font = '700 34px "Chakra Petch", Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.85)'; g.strokeText(text, 128, 32);
  g.fillStyle = '#' + color.toString(16).padStart(6, '0'); g.fillText(text, 128, 32);
  const t = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.scale.set(2, .5, 1); s.renderOrder = 10;
  return s;
}
function makeProxy(id) {
  const p = net.players[id];
  const av = buildAvatar(p.color, p.name);
  const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionFilterGroup: G_PLAYER, collisionFilterMask: G_ENEMY, material: mChar });
  body.addShape(new CANNON.Sphere(.5)); world.addBody(body);
  p.proxy = Object.assign(av, { c: 0, body, pos: new V3(0, .5, 7), tgt: new V3(0, .5, 7), vel: new V3(), yaw: 0, tyaw: 0, pitch: 0, w: 'katana', block: 0, sw: -1, sh: -1, kc: -1, swingT: 0, kickT: 0, name: p.name });
  return p.proxy;
}
function removeProxy(id) {
  const p = net.players[id]; if (!p || !p.proxy) return;
  scene.remove(p.proxy.g); world.remove(p.proxy.body);
  if (p.proxy.ring) scene.remove(p.proxy.ring);
  p.proxy = null;
}
function applyPlayerState(id, d, self) {
  let p = net.players[id];
  if (!p) { addPlayer(id, d.name || 'Oyuncu', null); p = net.players[id]; }
  p.alive = !!d.a; p.hp = d.hp; p.lv = d.lv; p.kills = d.k; p.score = d.s; p.pk = d.pk || 0; p.deaths = d.dt || 0; p.cr = d.cr; p.rd = d.rd || 0;
  if (self || id === net.myId) return;
  const pr = p.proxy || makeProxy(id);
  if (pr.name !== d.name && d.name) { pr.name = d.name; p.name = d.name; pr.g.remove(pr.label); pr.label = nameSprite(d.name, p.color); pr.label.position.y = 2.25; pr.g.add(pr.label); }
  pr.tgt.set(d.p[0], d.p[1], d.p[2]); pr.vel.set(d.v[0], 0, d.v[1]);
  pr.tyaw = d.yaw; pr.pitch = d.pitch; pr.w = d.w; pr.block = d.b; pr.rv = d.rv || 0; pr.c = d.c || 0; pr.sl = d.sl || 0;
  if (pr.sw >= 0 && d.sw !== pr.sw) pr.swingT = .25;
  if (pr.sh >= 0 && d.sh > pr.sh) remoteShots(pr, Math.min(3, d.sh - pr.sh), d.ft);
  if (pr.kc >= 0 && d.kc !== pr.kc) pr.kickT = .38;
  pr.sw = d.sw; pr.sh = d.sh; pr.kc = d.kc || 0;
}
const rsDir = new V3(), rsFrom = new V3(), rsTo = new V3();
function remoteShots(pr, n, focused) {
  const sgShot = pr.w === 'shotgun';
  if (sgShot) n *= 7;
  const spr = sgShot ? (focused ? .02 : .09) : .03;
  for (let i = 0; i < n; i++) {
    rsDir.set(-Math.sin(pr.yaw) * Math.cos(pr.pitch), Math.sin(pr.pitch), -Math.cos(pr.yaw) * Math.cos(pr.pitch));
    rsDir.x += rand(-spr, spr); rsDir.y += rand(-spr, spr); rsDir.z += rand(-spr, spr); rsDir.normalize();
    rsFrom.set(pr.pos.x, pr.pos.y + 1.1, pr.pos.z).addScaledVector(rsDir, .6);
    const t = rayStatic(rsFrom, rsDir, 40);
    rsTo.copy(rsFrom).addScaledVector(rsDir, t);
    addTracer(rsFrom, rsTo);
  }
  // her silahın kendi sesi; susturuculu USP-S yakından bile zor duyulur
  const d = pr.pos.distanceTo(camera.position), snd = sfx[pr.w] && pr.w !== 'rocket' && pr.w !== 'launcher' ? sfx[pr.w] : sfx.uzi;
  if (d < (pr.w === 'usps' ? 10 : 34)) snd();
}
function updateProxies(dt) {
  for (const id in net.players) {
    const p = net.players[id], pr = p.proxy; if (!pr) continue;
    const before = pr.pos.clone();
    pr.pos.lerp(pr.tgt, Math.min(1, dt * 14));
    let dy = pr.tyaw - pr.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); pr.yaw += dy * Math.min(1, dt * 14);
    pr.body.position.set(pr.pos.x, pr.pos.y, pr.pos.z);
    const sp = before.distanceTo(pr.pos) / Math.max(dt, 1e-4);
    // ayak sesleri: yürüyen ve koşan duyulur, eğilerek yürüyen sessizdir (VS'de yerini belli etmemek için)
    if (p.alive && pr.g.visible && !pr.sl && sp > 1.5 && Math.abs(pr.pos.y - (pr.lastY ?? pr.pos.y)) < .08) {
      pr.stepPh = (pr.stepPh || 0) + dt * Math.min(sp, 18) * 1.1;
      if (pr.stepPh > Math.PI) { pr.stepPh -= Math.PI; if (!(pr.c > .5)) stepAt(pr.pos, sp > 10 ? .85 : .5, sp > 10 ? 1.05 : .95, isVS() ? 30 : 22); }
    }
    pr.lastY = pr.pos.y;
    pr.swingT -= dt; pr.kickT -= dt;
    if (isVS()) {
      // takım rengi; rakiplerin ismi duvarın arkasından görünmez
      if (pr.teamSet !== p.team) { pr.teamSet = p.team; pr.cloth.color.setHex(TEAMS[p.team].color); if (pr.label) { pr.label.material.depthTest = p.team !== myTeam(); } }
      pr.g.visible = p.alive && performance.now() - (pr.deadAt || 0) > 1500;
    }
    animateAvatar(pr, dt, { x: pr.pos.x, y: pr.pos.y, z: pr.pos.z, yaw: pr.yaw, pitch: pr.pitch, speed: sp, w: pr.w, block: pr.block, alive: p.alive, crouch: pr.c, slide: pr.sl, swing: pr.swingT > 0, kick: pr.kickT > 0 });
  }
}
function checkAllDead() {
  if (net.mode !== 'host' || state === 'menu' || matchOver || isVS()) return;
  if (player.alive) return;
  for (const id in net.players) if (id !== 'h' && net.players[id].alive) return;
  bcast({ t: 'over' });
  state = 'dead'; showEnd('Herkes parçalandı');
}

/* ================= LOBİ BUTONLARI ================= */
$('nameIn').value = myName;
$('nameIn').addEventListener('input', () => { myName = $('nameIn').value; try { localStorage.setItem('kk-isim', myName); } catch (e) { /* yok */ } });
if (!MP_OK) { $('mpBox').hidden = true; $('mpOff').hidden = false; }
$('hostBtn').addEventListener('click', hostRoom);
$('joinBtn').addEventListener('click', () => joinRoom($('codeIn').value));
$('codeIn').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom($('codeIn').value); });
$('lobbyStart').addEventListener('click', startMatchHost);
$('modeCoop').addEventListener('click', () => setGameMode('coop'));
$('modeVs').addEventListener('click', () => setGameMode('vs'));
$('mapArena').addEventListener('click', () => setVsMap('arena'));
$('mapAvlu').addEventListener('click', () => setVsMap('avlu'));
$('mapCol').addEventListener('click', () => setVsMap('col'));
$('modeBomb').addEventListener('click', () => setGameMode('bomb'));
$('moneyNormal').addEventListener('click', () => setMoney('normal'));
$('moneyInf').addEventListener('click', () => setMoney('inf'));
$('lobbyLeave').addEventListener('click', () => leaveRoom(false));
$('copyCode').addEventListener('click', () => {
  const t = net.code;
  const done = () => { $('copyCode').textContent = 'KOPYALANDI'; setTimeout(() => { $('copyCode').textContent = 'KOPYALA'; }, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, () => selectCode());
  else selectCode();
});
function selectCode() { const r = document.createRange(); r.selectNodeContents($('roomCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
{ const m = /oda-([a-z0-9]+)/i.exec(location.hash); if (m) $('codeIn').value = m[1].toUpperCase(); }
