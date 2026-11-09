'use strict';
/* BOTLAR (VS ve takım ölüm maçı): host odaya bot ekler (lobi panelinde + BOT). Arkadaş azken ya da tek başına
   CS tarzı çatışma için. Her şey hostta hesaplanır; botlar diğer oyunculara sıradan oyuncu gibi ('ps' mesajı) görünür.
   - Yol bulma: haritanın kutularından 1 m'lik ızgara, A* ile yol; takılınca yeni hedef
   - Görme: önündeki ~150°, duvar ve sis arkasını görmez; yakındaki (6 m) rakibi sezer
   - Ateş: tepki süresinden sonra döner, 3-7 mermilik seriler; isabet mesafe, hareket ve bot becerisiyle değişir
   - Vurulunca saldırana döner; ölünce skor tablosuna yazılır, takım ölüm maçında 3 sn sonra doğar */

const BOT_NAMES = ['KARTAL', 'DOĞAN', 'ATMACA', 'ŞAHİN', 'PARS', 'BOZKURT', 'KAPLAN', 'ŞİMŞEK'];
const bots = { list: [], seq: 0, grid: null, gridMap: '', sendT: 0, thinkT: 0 };
const isBot = id => !!(net.players[id] && net.players[id].bot);
const botById = id => bots.list.find(b => b.id === id);
const botsAllowed = () => net.gameMode === 'vs' || net.gameMode === 'tdm';
const _bv1 = new V3(), _bv2 = new V3();

// bot silahı: çoğu AK-47 ya da M4, bazıları FENEK (yakın mesafede çok hızlı)
const botWeapon = () => { const r = Math.random(); return r < .4 ? 'ak47' : r < .8 ? 'm4' : 'fenek'; };
function addBot() {
  if (net.mode !== 'host' || !botsAllowed()) return;
  if (Object.keys(net.players).length >= 8) { lobbyMsg('Oda dolu (bot dahil en fazla 8).'); return; }
  const id = 'b' + (++bots.seq);
  addPlayer(id, 'BOT ' + BOT_NAMES[(bots.seq - 1) % BOT_NAMES.length], null);
  const p = net.players[id]; p.bot = true; p.rd = 1;
  const b = { id, p, cs: COSTUME_LIST[Math.random() * COSTUME_LIST.length | 0], pos: new V3(0, .5, 0), yaw: 0, pitch: 0, vel: new V3(), hp: 100, path: [], repathT: 0, tgt: null, react: 0, burst: 0, pause: 0, cd: 0, sh: 0, respawnT: 0,
    w: botWeapon(), skill: .45 + Math.random() * .35, stuckT: 0, lastPos: new V3(), kills: 0, deaths: 0, aware: 0, awareYaw: 0 };
  bots.list.push(b);
  if (net.inMatch) botSpawn(b);
  sendRoster();
}
function removeBot(id) {
  const b = botById(id); if (!b) return;
  bots.list.splice(bots.list.indexOf(b), 1);
  removeProxy(id); delete net.players[id];
  sendRoster();
}
function removeBots() { for (const b of bots.list.slice()) removeBot(b.id); }
function botsReset() { bots.list = []; bots.grid = null; bots.gridMap = ''; }
function botSpawn(b) {
  const sp = spawnPoint(b.p.team);
  b.pos.set(sp.x, .5, sp.z); b.yaw = sp.z < 0 ? Math.PI : 0; b.pitch = 0; b.vel.set(0, 0, 0);
  b.hp = 100; b.p.alive = true; b.p.hp = 100; b.path = []; b.repathT = 0; b.tgt = null; b.respawnT = 0; b.burst = 0; b.aware = 0;
}

/* ================= IZGARA ve A* ================= */
function botGrid() {
  if (bots.grid && bots.gridMap === curMap) return bots.grid;
  const N = Math.ceil(H * 2), g = new Uint8Array(N * N), m = .4;
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) if (x === 0 || z === 0 || x === N - 1 || z === N - 1) g[x * N + z] = 1;
  for (const s of statics) {
    if (s.y0 > 1.5 || s.y1 < .35) continue;   // yüksek kirişlerin altından, alçak tümseklerin üstünden geçilir
    const x0 = Math.max(0, Math.floor(s.x0 - m + H)), x1 = Math.min(N - 1, Math.floor(s.x1 + m + H));
    const z0 = Math.max(0, Math.floor(s.z0 - m + H)), z1 = Math.min(N - 1, Math.floor(s.z1 + m + H));
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) g[x * N + z] = 1;
  }
  bots.grid = { N, g }; bots.gridMap = curMap;
  return bots.grid;
}
const cellOf = (v, N) => clamp(Math.floor(v + H), 0, N - 1);
function freeCellNear(N, g, cx, cz) {
  if (!g[cx * N + cz]) return [cx, cz];
  for (let r = 1; r < 6; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
    const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= N || z >= N) continue;
    if (!g[x * N + z]) return [x, z];
  }
  return null;
}
function botPath(fx, fz, tx, tz) {
  const { N, g } = botGrid();
  const s = freeCellNear(N, g, cellOf(fx, N), cellOf(fz, N)), e = freeCellNear(N, g, cellOf(tx, N), cellOf(tz, N));
  if (!s || !e) return [];
  const S = s[0] * N + s[1], E = e[0] * N + e[1];
  const gs = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
  const heap = [], push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const hx = e[0], hz = e[1], h = i => { const dx = Math.abs(((i / N) | 0) - hx), dz = Math.abs(i % N - hz); return Math.max(dx, dz) + .41 * Math.min(dx, dz); };
  gs[S] = 0; push(h(S), S);
  let it = 0;
  while (heap.length && it++ < 6000) {
    const [, cur] = pop(); if (cur === E) break; if (closed[cur]) continue; closed[cur] = 1;
    const cx = (cur / N) | 0, cz = cur % N;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= N || z >= N) continue;
      const ni = x * N + z; if (g[ni] || closed[ni]) continue;
      if (dx && dz && (g[(cx + dx) * N + cz] || g[cx * N + cz + dz])) continue;   // köşe kesme yok
      const ng = gs[cur] + (dx && dz ? 1.414 : 1);
      if (ng < gs[ni]) { gs[ni] = ng; from[ni] = cur; push(ng + h(ni), ni); }
    }
  }
  if (from[E] < 0 && E !== S) return [];
  const cells = []; for (let i = E; i >= 0 && i !== S; i = from[i]) cells.push(i);
  cells.reverse();
  // yolu sadeleştir: düz görülebilen ara noktaları atla
  const pts = cells.map(i => new V3(((i / N) | 0) - H + .5, .5, i % N - H + .5));
  const out = []; let a = new V3(fx, .5, fz), k = 0;
  while (k < pts.length) {
    let j = k;
    for (let t = pts.length - 1; t > k; t--) { if (gridLine(N, g, a, pts[t])) { j = t; break; } }
    out.push(pts[j]); a = pts[j]; k = j + 1;
  }
  return out;
}
function gridLine(N, g, a, b) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d * 2);
  for (let i = 1; i < n; i++) { const t = i / n, x = cellOf(a.x + (b.x - a.x) * t, N), z = cellOf(a.z + (b.z - a.z) * t, N); if (g[x * N + z]) return false; }
  return true;
}
function botGoal(b) {
  const { N, g } = botGrid(), foe = b.p.team === 'red' ? 'blue' : 'red';
  for (let i = 0; i < 30; i++) {
    let x, z; const r = Math.random();
    if (r < .45) { const sp = MAPS[curMap].spawn(foe), k = rand(.2, .9); x = sp.x * k + rand(-8, 8); z = sp.z * k; }   // rakip üssüne doğru (iki eksende de ortadan)
    else if (r < .75) { x = rand(-H * .4, H * .4); z = rand(-H * .4, H * .4); }
    else { x = rand(-H + 2, H - 2); z = rand(-H + 2, H - 2); }
    if (!g[cellOf(x, N) * N + cellOf(z, N)]) return new V3(x, .5, z);
  }
  return new V3(0, .5, 0);
}

/* ================= GÖRME ve ATEŞ ================= */
function botTargetPos(id) {
  if (id === net.myId) return player.alive ? player.body.position : null;
  const bb = botById(id); if (bb) return bb.p.alive ? bb.pos : null;
  const p = net.players[id]; return p && p.alive && p.proxy ? p.proxy.pos : null;
}
function botSee(b) {
  const eye = _bv1.set(b.pos.x, b.pos.y + 1.15, b.pos.z);
  let best = null, bd = 46;
  for (const id in net.players) {
    if (id === b.id || net.players[id].team === b.p.team) continue;
    const pos = botTargetPos(id); if (!pos) continue;
    const dx = pos.x - b.pos.x, dz = pos.z - b.pos.z, d = Math.hypot(dx, dz);
    if (d > bd) continue;
    if (d > 6 && Math.abs(angDiff(Math.atan2(-dx, -dz), b.yaw)) > 1.3 && !(b.aware > 0 && id === b.awareId)) continue;
    const to = _bv2.set(dx, pos.y + .9 - eye.y, dz), L = to.length(); to.divideScalar(L);
    if (rayStatic(eye, to, L) < L - .45) continue;
    if (typeof smokeBlocks === 'function' && smokeBlocks(eye, new V3(pos.x, pos.y + .9, pos.z))) continue;
    bd = d; best = { id, d };
  }
  return best;
}
function botFire(b, id, d) {
  const pos = botTargetPos(id); if (!pos) return;
  b.sh++; b.cd = isGun(b.w) ? 1 / GUNS[b.w].rate : 1 / 10; b.burst++;
  const tv = id === net.myId ? player.body.velocity : (botById(id) || {}).vel || (net.players[id].proxy || {}).vel || _bv2.set(0, 0, 0);
  const moving = Math.hypot(tv.x, tv.z) > 2, crouch = id === net.myId && player.crouchK > .5;
  let p = (.66 - d * .0085) * (b.skill + .25) * (moving ? .65 : 1) * (crouch ? .8 : 1) * (b.burst > (b.w === 'fenek' ? 8 : 4) ? .65 : 1);
  if (Math.random() > clamp(p, .04, .75)) return;
  const head = Math.random() < .05 + b.skill * .07;
  const own = isGun(b.w), G = own ? GUNS[b.w] : GUNS.ak47, fall = clamp(1 - (d - G.falloff) / 14, .3, 1);
  const dmg = (own ? G.pvp : RIF.m4.pvp) * fall * (head ? (own ? G.head : 3.5) : 1);
  const dir = new V3(pos.x - b.pos.x, 0, pos.z - b.pos.z).normalize();
  const msg = { t: 'phit', to: id, dmg: Math.round(dmg), dir: arr(dir), head, melee: false, kn: 0, w: b.w, by: b.id, fx: head ? 'hs' : '' };
  if (isBot(id)) botHit(msg); else deliverPhit(msg);
}
// bota isabet (insanların mermisi ya da başka bot)
function botHit(d) {
  const b = botById(d.to); if (!b || !b.p.alive || vs.over) return;
  if (teamOf(d.by) === b.p.team) return;
  b.hp -= d.dmg; b.p.hp = Math.max(0, b.hp);
  b.aware = 2.5; b.awareId = d.by;   // saldırana dön
  const ap = botTargetPos(d.by); if (ap) b.awareYaw = Math.atan2(-(ap.x - b.pos.x), -(ap.z - b.pos.z));
  if (b.hp <= 0) {
    b.p.alive = false; b.deaths++; b.p.deaths = b.deaths;
    const k = botById(d.by); if (k) { k.kills++; k.p.kills = k.kills; }
    hostKill(b.id, d.by, d.w, d.fx);
    b.respawnT = isTDM() ? TDM_RESPAWN : 0;
    botSend(b);
  }
}

/* ================= HER KARE (host) ================= */
function updateBots(dt) {
  if (net.mode !== 'host' || !bots.list.length) return;
  if (!net.inMatch || !isVS()) return;
  const frozen = vs.phase === 'buy' || vs.over;
  for (const b of bots.list) {
    if (!b.p.alive) {
      if (isTDM() && b.respawnT > 0 && vs.phase === 'live') { b.respawnT -= dt; if (b.respawnT <= 0) botSpawn(b); }
      continue;
    }
    b.cd -= dt; b.react -= dt; b.aware -= dt; b.pause -= dt;
    // hedef ara (saniyede ~7 kez)
    b.thinkT = (b.thinkT || 0) - dt;
    if (b.thinkT <= 0 && !frozen) {
      b.thinkT = .14;
      const s = botSee(b);
      if (s && (!b.tgt || b.tgt.id !== s.id)) b.react = rand(.22, .5) * (1.45 - b.skill);
      b.tgt = s;
    }
    let moveSpeed = 4.4, wantYaw = null;
    if (b.tgt && !frozen) {
      const pos = botTargetPos(b.tgt.id);
      if (!pos) b.tgt = null;
      else {
        const dx = pos.x - b.pos.x, dz = pos.z - b.pos.z, d = Math.hypot(dx, dz);
        wantYaw = Math.atan2(-dx, -dz);
        b.pitch += (Math.atan2(pos.y + .5 - (b.pos.y + 1.1), d) - b.pitch) * Math.min(1, dt * 8);
        moveSpeed = d < 12 ? 0 : 2;   // yakında durup ateş eder, uzaktaysa yavaşça yaklaşır
        if (b.react <= 0 && b.cd <= 0 && b.pause <= 0 && Math.abs(angDiff(wantYaw, b.yaw)) < .14) {
          botFire(b, b.tgt.id, d);
          if (b.burst >= (b.w === 'fenek' ? 6 : 3) + (Math.random() * (b.w === 'fenek' ? 8 : 5) | 0)) { b.burst = 0; b.pause = rand(.22, .5); }
        }
      }
    } else if (b.aware > 0) wantYaw = b.awareYaw;
    // yol takibi
    if (frozen) moveSpeed = 0;
    b.repathT -= dt;
    if (moveSpeed > 0 && (!b.path.length || b.repathT <= 0)) { const goal = botGoal(b); b.path = botPath(b.pos.x, b.pos.z, goal.x, goal.z); b.repathT = rand(6, 11); }
    const wp = b.path[0];
    let vx = 0, vz = 0;
    if (wp && moveSpeed > 0) {
      const dx = wp.x - b.pos.x, dz = wp.z - b.pos.z, d = Math.hypot(dx, dz);
      if (d < .45) b.path.shift();
      else { vx = dx / d * moveSpeed; vz = dz / d * moveSpeed; if (wantYaw === null) wantYaw = Math.atan2(-dx, -dz); }
    }
    b.vel.x += (vx - b.vel.x) * Math.min(1, dt * 8); b.vel.z += (vz - b.vel.z) * Math.min(1, dt * 8);
    b.pos.x += b.vel.x * dt; b.pos.z += b.vel.z * dt;
    if (wantYaw !== null) b.yaw += clamp(angDiff(wantYaw, b.yaw), -dt * (b.tgt ? 6 + b.skill * 4 : 4), dt * (b.tgt ? 6 + b.skill * 4 : 4));
    // takılma: 1.5 sn'de 30 cm ilerleyemediyse yeni hedef
    b.stuckT += dt;
    if (b.stuckT > 1.5) { if (moveSpeed > 0 && b.pos.distanceTo(b.lastPos) < .3) { b.path = []; b.repathT = 0; } b.lastPos.copy(b.pos); b.stuckT = 0; }
  }
  bots.sendT -= dt;
  if (bots.sendT <= 0) { bots.sendT = .05; for (const b of bots.list) botSend(b); }
}
function botSend(b) {
  const st = { t: 'ps', id: b.id, name: b.p.name, p: [r2(b.pos.x), r2(b.pos.y), r2(b.pos.z)], v: [r2(b.vel.x), r2(b.vel.z)], yaw: r2(b.yaw), pitch: r2(b.pitch), w: b.w, b: 0, a: b.p.alive ? 1 : 0, sw: 0, sh: b.sh, hp: Math.max(0, Math.ceil(b.hp)), lv: 1, k: b.kills, s: b.kills * 100, rv: 0, c: 0, sl: 0, kc: 0, ft: 0, pk: 0, dt: b.deaths, cr: 0, rd: 1, st: 0, em: '', cs: b.cs };
  applyPlayerState(b.id, st);
  bcast(st);
}
// el bombası botlara da vurur (yalnız host hesaplar)
function botsBlast(p, by) {
  if (net.mode !== 'host') return;
  for (const b of bots.list) {
    if (!b.p.alive) continue;
    const to = new V3(b.pos.x - p.x, b.pos.y + .6 - p.y, b.pos.z - p.z), d = to.length(); if (d > 6) continue;
    to.divideScalar(d || 1);
    if (rayStatic(new V3(p.x, Math.max(.3, p.y), p.z).addScaledVector(to, .2), to, d) < d - .5) continue;
    botHit({ to: b.id, by, dmg: Math.round(98 * Math.pow(1 - d / 6, 1.3)), w: 'he' });
  }
}
$('botAdd').addEventListener('click', addBot);
$('botClear').addEventListener('click', removeBots);

// ana menü → BOTLARLA OYNA: internet ve oda kodu gerekmez; sen host olursun, oda yalnız bu cihazda kurulur
function botMatchOffline() {
  leaveRoom(true);
  Object.assign(net, { mode: 'host', myId: 'h', code: 'BOT', players: {}, gameMode: 'tdm', vsMap: 'liman', peer: null, hostConn: null, inMatch: false });
  addPlayer('h', playerName(), null);
  showLobby();
  for (let i = 0; i < 3; i++) addBot();
  lobbyMsg('Botlarla çevrimdışı oda. Mod, harita ve bot sayısını seç, BAŞLAT\'a bas.');
}
$('botBtn').addEventListener('click', botMatchOffline);
