'use strict';
/* Sosyal lobi: odaya girenler maç başlamadan önce 3D bir mekânda (mekan.js) buluşur.
   - WASD dolaş, Shift koş, Space zıpla, fareyle bak; V: 1. / 3. şahıs
   - E: yakındaki boş yere otur / kalk; panonun önünde E: oda paneli. G: el salla, H: dans et
   - Enter: yazılı sohbet (maç içinde de çalışır). Mesaj, yazanın başının üstünde balon olarak da görünür
   - Sesli sohbet mesafeye göre: yanındakini net, uzaktakini kısık duyarsın (K basılı tut ya da açık mikrofon);
     konuşanın başında hoparlör işareti yanar
   - Tab / Esc: oda paneli (mekân, mod, harita, oyuncular, BAŞLAT). Host maç bitince herkesi lobiye geri çağırabilir */

const lobby = { walking: false, sit: -1, emote: '', emoteT: 0, tp: true, near: null, nearT: 0, stepPh: 0, crT: 0, ckT: 2, chatT: 0 };
const EMOTE_DUR = { wave: 2.6, dance: 7 };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const lobbyVenue = () => (MAPS[net.venue] && MAPS[net.venue].lobby ? net.venue : 'kamp');

/* ================= GİRİŞ / ÇIKIŞ ================= */
function enterLobby() {
  net.inMatch = false; matchOver = false;
  resetGame();                                        // önceki maçtan kalan düşman, ceset, efekt temizlenir
  for (const p of pieces.slice()) removePiece(p);     // arena sandıkları lobide olmasın
  while (typeof corpses !== 'undefined' && corpses.length) removeCorpse(corpses[0]);
  state = 'lobby';
  for (const b of bots.list) removeProxy(b.id);   // botlar lobide dolaşmaz (maçta yeniden belirir)
  for (const id of ['dead', 'pause', 'upgrade', 'hud', 'start', 'settings', 'scope', 'bossbar', 'minimap']) $(id).hidden = true;
  closeBuy(); closeTeamPick(); clearUtils();
  if (AU.drone) AU.drone.gain.value = 0;              // cehennem uğultusu lobide susar
  lobbyBuild();
  $('lobby').classList.add('social'); $('lobbyHud').hidden = false;
  document.body.classList.add('inlobby');
  lobbyWalk(false);
  renderLobby();
  hideMenuScene();
}
function lobbyBuild() {
  buildMap(lobbyVenue());
  lobby.sit = -1; lobby.emote = '';
  const p = MAPS[curMap].spawn(), b = player.body;
  b.position.set(p.x, .6, p.z); b.velocity.set(0, 0, 0); b.collisionResponse = true;
  player.yaw = Math.atan2(p.x, p.z); player.pitch = -.08;   // ateşe / odanın ortasına bakarak doğ
  drawVenueBoard();
  lobbyBallSpawn();
}
function exitLobby() {
  if (!$('lobby').classList.contains('social')) return;
  lobby.walking = false; lobby.sit = -1; lobby.emote = '';
  player.body.collisionResponse = true;
  $('lobby').classList.remove('social'); $('lobbyHud').hidden = true;
  document.body.classList.remove('inlobby');
  if (AU.drone) AU.drone.gain.value = .06;
  for (const bb of bubbles.slice()) dropBubble(bb);
  if (myAvatar) myAvatar.g.visible = false;
}
// dolaşma (fare kilitli) ↔ oda paneli
function lobbyWalk(on) {
  lobby.walking = on;
  $('lobby').hidden = on;
  $('lobbyHud').classList.toggle('walk', on);
  if (on) { if (!IS_TOUCH && !fallbackLook && document.pointerLockElement !== canvas) lock(); }
  else if (document.pointerLockElement === canvas) document.exitPointerLock();
}
document.addEventListener('pointerlockchange', () => {
  if (state !== 'lobby') return;
  const locked = document.pointerLockElement === canvas;
  if (!locked && lobby.walking && !chat.open) lobbyWalk(false);
  else if (locked && !lobby.walking) lobbyWalk(true);
});
function hostBackToLobby() {
  if (net.mode !== 'host') return;
  bcast({ t: 'tolobby' });
  enterLobby();
}

/* ================= KLAVYE ================= */
function lobbyKey(e) {
  if (e.repeat) return;
  if (e.code === 'Tab') { lobbyWalk(!lobby.walking); return; }
  if (!lobby.walking) return;
  if (e.code === 'KeyE') lobbyUse();
  else if (e.code === 'KeyG') lobbyEmote('wave');
  else if (e.code === 'KeyH') lobbyEmote('dance');
  else if (e.code === 'KeyV') { lobby.tp = !lobby.tp; }
  else if (e.code === 'KeyF') lobbyKick();
  else if (e.code === 'Space') { if (lobby.sit >= 0) lobbyStand(); else player.jumpBuf = .15; }
}
function lobbyEmote(k) {
  if (lobby.emote === k) { lobby.emote = ''; return; }
  lobby.emote = k; lobby.emoteT = 0;
}
function lobbyUse() {
  if (lobby.sit >= 0) { lobbyStand(); return; }
  const n = lobby.near; if (!n) return;
  if (n.kind === 'seat') lobbySit(n.i);
  else if (n.kind === 'board') lobbyWalk(false);
  else if (n.kind === 'guitar') playGuitar();
}
function lobbySit(i) {
  const s = venue.seats[i]; if (!s) return;
  lobby.sit = i; lobby.emote = '';
  player.yaw = s.yaw; player.pitch = -.06;
  player.body.collisionResponse = false; player.body.velocity.set(0, 0, 0);
}
function lobbyStand() {
  const s = venue.seats[lobby.sit]; lobby.sit = -1;
  const b = player.body; b.collisionResponse = true; b.velocity.set(0, 0, 0);
  if (s && s.exit) b.position.set(s.exit[0], .6, s.exit[1]);   // havuz gibi yerlerden dışarı çık
  else if (s) b.position.set(s.x - Math.sin(s.yaw) * .8, .6, s.z - Math.cos(s.yaw) * .8);
}
function seatTaken(i) {
  for (const id in net.players) { const pr = net.players[id].proxy; if (pr && pr.st === i + 1) return true; }
  return false;
}

/* ================= ANA GÜNCELLEME ================= */
function updateLobby(dt) {
  gameTime += dt;
  const b = player.body, v = b.velocity;
  camVectors();
  rayFrom.copy(b.position); rayTo.set(b.position.x, b.position.y - .62, b.position.z); rayRes.reset();
  player.grounded = world.raycastClosest(rayFrom, rayTo, { collisionFilterMask: G_STATIC, skipBackfaces: true }, rayRes) && v.y < 3;
  player.jumpBuf -= dt;
  const seat = lobby.sit >= 0 ? venue.seats[lobby.sit] : null;
  const typing = chat.open;
  let mx = 0, mz = 0;
  if (!typing && (lobby.walking || IS_TOUCH)) { mz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0); mx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0); }
  if (seat) {
    b.position.set(seat.x, .5, seat.z); v.set(0, 0, 0);
    if (mx || mz || player.jumpBuf > 0) { player.jumpBuf = 0; lobbyStand(); }
    player.pitch = clamp(player.pitch, -.9, .8);
  } else {
    const run = keys.ShiftLeft || keys.ShiftRight || (shiftDown && performance.now() - shiftDown > 0);
    const sp = run ? 5.4 : 3;
    let dx = flatF.x * mz + rightV.x * mx, dz = flatF.z * mz + rightV.z * mx; const l = Math.hypot(dx, dz);
    if (l > 0) { dx /= l; dz /= l; if (lobby.emote) lobby.emote = ''; }
    const acc = Math.min(1, dt * (player.grounded ? 11 : 2.5));
    v.x += (dx * sp - v.x) * acc; v.z += (dz * sp - v.z) * acc;
    if (player.jumpBuf > 0 && player.grounded) { v.y = 7.2; player.jumpBuf = 0; }
    // ayak sesleri
    const hs = Math.hypot(v.x, v.z);
    if (player.grounded && hs > 1) { lobby.stepPh += dt * hs * 1.15; if (lobby.stepPh > Math.PI) { lobby.stepPh -= Math.PI; stepSound(run ? .3 : .2, 0, curMap === 'ev' ? 1.25 : .8); } }
    if (lobby.tp) player.pitch = clamp(player.pitch, -1.05, 1.0);
  }
  world.step(1 / 60, dt, 4);
  updateBall(dt); updateSaha(dt);
  if (lobby.emote) { lobby.emoteT += dt; if (lobby.emoteT > EMOTE_DUR[lobby.emote]) lobby.emote = ''; }
  lobbyCamera();
  lobbyMyAvatar(dt);
  updateProxies(dt);
  updateNet(dt);
  for (const f of venue.fx) f(dt, gameTime);
  lobbyNear(dt);
  updateBubbles(dt);
  updateSpeakers();
  lobbyAmbience(dt);
}
function lobbyCamera() {
  const b = player.body.position, s = lobby.sit >= 0 ? venue.seats[lobby.sit] : null;
  eyePos.set(b.x, s ? s.y + .76 : b.y + EYE, b.z);
  camera.position.copy(eyePos);
  camera.rotation.set(player.pitch, player.yaw, 0);
  if (lobby.tp) {
    camera.updateMatrixWorld();
    tmp.set(.42, .28, 3).applyQuaternion(camera.quaternion);
    const len = tmp.length(); tmp.divideScalar(len);
    const hit = rayStatic(eyePos, tmp, len);
    camera.position.copy(eyePos).addScaledVector(tmp, Math.max(.3, hit - .25));
    const M = MAPS[curMap]; if (M && M.ceil) camera.position.y = Math.min(camera.position.y, M.ceil - .18);
  }
  if (camera.fov !== SETTINGS.fov) { camera.fov = SETTINGS.fov; camera.updateProjectionMatrix(); }
}
function myLobbyColor() { const me = net.players[net.myId]; return me ? me.color : 0xb3110d; }
function lobbyMyAvatar(dt) {
  if (!myAvatar) myAvatar = buildAvatar(myLobbyColor(), '');
  myAvatar.cloth.color.setHex(myLobbyColor());
  const s = lobby.sit >= 0 ? venue.seats[lobby.sit] : null, legs = !lobby.tp && !!charSource();
  const b = player.body.position, v = player.body.velocity;
  myAvatar.g.visible = true;
  animateAvatar(myAvatar, dt, {
    x: s ? s.x : b.x, y: s ? .5 : b.y, z: s ? s.z : b.z, yaw: s ? s.yaw : player.yaw, pitch: s ? player.pitch * .3 : player.pitch,
    speed: Math.hypot(v.x, v.z), w: 'none', alive: true, crouch: 0, slide: 0, air: !s && !player.grounded, legsOnly: legs,
    sit: s ? s.y : 0, look: s ? clamp(angDiff(player.yaw, s.yaw), -1.3, 1.3) : 0, emote: lobby.emote, emoteT: lobby.emoteT,
  });
  if (legs && !s && myAvatar.char) { myAvatar.g.position.x -= flatF.x * .17; myAvatar.g.position.z -= flatF.z * .17; }
}
// diğer oyuncuların lobi pozu (net.js updateProxies çağırır)
function lobbyProxyPose(pr, dt) {
  pr.emT = (pr.emT || 0) + dt;
  const s = pr.st ? venue.seats[pr.st - 1] : null;
  if (pr.label) pr.label.position.y = s ? 1.85 : 2.25;
  const o = { w: 'none', emote: pr.em || '', emoteT: pr.emT, crouch: 0, slide: 0 };
  if (s) Object.assign(o, { x: s.x, y: .5, z: s.z, yaw: s.yaw, pitch: pr.pitch * .3, sit: s.y, look: clamp(angDiff(pr.yaw, s.yaw), -1.3, 1.3), speed: 0, air: false });
  return o;
}
// yakındaki boş oturak / pano: ekrana ipucu
function lobbyNear(dt) {
  lobby.nearT -= dt; if (lobby.nearT > 0) return; lobby.nearT = .1;
  const b = player.body.position;
  let best = null, bd = 1.5;
  if (lobby.sit < 0) {
    venue.seats.forEach((s, i) => { const d = Math.hypot(s.x - b.x, s.z - b.z); if (d < bd && !seatTaken(i)) { bd = d; best = { kind: 'seat', i }; } });
    const gs = GUITAR_SPOT[curMap];
    if (gs && Math.hypot(gs[0] - b.x, gs[1] - b.z) < Math.min(bd, 1.6)) best = { kind: 'guitar' };
    if (venue.board && Math.hypot(venue.board.x - b.x, venue.board.z - b.z) < 2.4) best = { kind: 'board' };
  }
  lobby.near = best;
  const txt = lobby.sit >= 0 ? 'E · KALK' : best ? (best.kind === 'seat' ? 'E · OTUR' : best.kind === 'guitar' ? 'E · GİTAR ÇAL' : 'E · ODA PANELİ') : '';
  if (hud.lhPrompt !== txt) { hud.lhPrompt = txt; $('lhPrompt').textContent = txt; }
  const room = 'ODA ' + net.code + ' · ' + (VENUE_NAMES[curMap] || '') + ' · ' + Object.keys(net.players).length + ' KİŞİ';
  if (hud.lhRoom !== room) { hud.lhRoom = room; $('lhRoom').textContent = room; }
  const talking = !!(voice.mic && voice.mic.enabled);
  if ($('lhMic').hidden === talking) $('lhMic').hidden = !talking;
}

/* ================= KONUŞMA BALONLARI ve HOPARLÖR İŞARETİ ================= */
const bubbles = [];
function bubbleSprite(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d'); g.font = '600 30px "Chakra Petch", Consolas, monospace';
  const lines = []; let line = '';
  for (const w of text.split(/\s+/)) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > 430 && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  if (lines.length > 4) { lines.length = 4; lines[3] += '…'; }
  const w = Math.min(470, Math.max(...lines.map(l => g.measureText(l).width)) + 44), h = lines.length * 38 + 26, x = (512 - w) / 2, y = 256 - h - 22;
  g.fillStyle = 'rgba(248,242,230,.94)'; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(x + 14, y); g.arcTo(x + w, y, x + w, y + h, 14); g.arcTo(x + w, y + h, x, y + h, 14);
  g.lineTo(272, y + h); g.lineTo(256, 252); g.lineTo(242, y + h); g.arcTo(x, y + h, x, y, 14); g.arcTo(x, y, x + w, y, 14); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#1b1210'; g.textAlign = 'center'; g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, 256, y + 14 + i * 38));
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.center.set(.5, 0); s.scale.set(2.3, 1.15, 1); s.renderOrder = 11;
  return s;
}
function avatarOf(id) { return id === net.myId ? myAvatar : net.players[id] && net.players[id].proxy; }
function showBubble(id, text) {
  const av = avatarOf(id); if (!av || !av.g) return;
  for (const bb of bubbles.slice()) if (bb.id === id) dropBubble(bb);
  const s = bubbleSprite(text); av.g.add(s);
  bubbles.push({ id, s, av, t: 0, life: 5 + Math.min(6, text.length * .06) });
}
function dropBubble(bb) {
  bubbles.splice(bubbles.indexOf(bb), 1);
  if (bb.s.parent) bb.s.parent.remove(bb.s);
  bb.s.material.map.dispose(); bb.s.material.dispose();
}
function updateBubbles(dt) {
  for (const bb of bubbles.slice()) {
    bb.t += dt;
    if (bb.t > bb.life || !bb.av.g.parent) { dropBubble(bb); continue; }
    const sitting = bb.id === net.myId ? lobby.sit >= 0 : !!(bb.av.st && state === 'lobby');
    bb.s.position.y = (sitting ? 1.95 : 2.42) + (bb.id === net.myId ? -.1 : 0);
    bb.s.material.opacity = Math.min(1, (bb.life - bb.t) * 2, bb.t * 8);
  }
}
const spkTex = canvasTex(64, (g, s) => {
  g.clearRect(0, 0, s, s); g.fillStyle = '#9fe8ff'; g.strokeStyle = '#9fe8ff'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(10, 24); g.lineTo(20, 24); g.lineTo(32, 13); g.lineTo(32, 51); g.lineTo(20, 40); g.lineTo(10, 40); g.closePath(); g.fill();
  for (const r of [10, 18]) { g.beginPath(); g.arc(34, 32, r, -.9, .9); g.stroke(); }
}, 1, 1, false);
function updateSpeakers() {
  for (const id in net.players) {
    const pr = net.players[id].proxy; if (!pr) continue;
    const r = voice.remote[pidOf(net.players[id])], on = !!(r && !r.a.muted && r.level > .02);
    if (!pr.spk) { pr.spk = new THREE.Sprite(new THREE.SpriteMaterial({ map: spkTex, depthTest: false, transparent: true })); pr.spk.scale.set(.32, .32, 1); pr.spk.renderOrder = 12; pr.g.add(pr.spk); }
    pr.spk.visible = on;
    if (on) { pr.spk.position.y = (pr.label ? pr.label.position.y : 2.25) + .3; const k = 1 + Math.min(.5, r.level * 6); pr.spk.scale.set(.32 * k, .32 * k, 1); }
  }
}
// yakınlık sesi: yanındakini tam, 20 m ötedekini neredeyse hiç duymazsın
function lobbyHearVol(id) {
  const pr = net.players[id] && net.players[id].proxy; if (!pr) return 1;
  const d = Math.hypot(pr.pos.x - player.body.position.x, pr.pos.z - player.body.position.z);
  return clamp(1 - (d - 2.5) / 17, .04, 1);
}

/* ================= ORTAM SESLERİ: çıtırdayan ateş, cırcır böcekleri ================= */
function lobbyAmbience(dt) {
  if (!AU.ctx) return;
  lobby.crT -= dt;
  if (lobby.crT <= 0 && venue.fire) {
    lobby.crT = .04 + Math.random() * .22;
    const d = eyePos.distanceTo(venue.fire), f = clamp(1 - d / 15, 0, 1);
    if (f > 0) {
      const g = f * f * (.06 + Math.random() * .22);
      nz(.015 + Math.random() * .05, 2200 + Math.random() * 3000, 700 + Math.random() * 900, 1.4, g);
      if (Math.random() < .07) nz(.12, 900, 200, .8, g * 1.4, 'lowpass');   // ara sıra tok bir patlama
    }
  }
  lobby.ckT -= dt;
  if (lobby.ckT <= 0 && curMap === 'kamp') {
    lobby.ckT = 1.2 + Math.random() * 3.5;
    const c = AU.ctx, t0 = c.currentTime, f0 = 4200 + Math.random() * 500, n = 2 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(), g = c.createGain(), t = t0 + i * .075;
      o.type = 'sine'; o.frequency.value = f0;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.01 + Math.random() * .008, t + .008); g.gain.linearRampToValueAtTime(0, t + .045);
      o.connect(g); g.connect(AU.fx || AU.master); o.start(t); o.stop(t + .06);
    }
  }
}

/* ================= ANA MENÜ SAHNESİ: kamp ateşinin başında oturan karakter ================= */
const menuCam = { t: 0, friend: null };
function updateMenuScene(dt) {
  if (curMap !== 'kamp') {
    buildMap('kamp');
    for (const p of pieces.slice()) removePiece(p);   // arenadan kalan sandıklar menüde görünmesin
  }
  gameTime += dt;
  for (const f of venue.fx) f(dt, gameTime);
  const sit = (av, s, look, col) => { av.g.visible = true; av.cloth.color.setHex(col); animateAvatar(av, dt, { x: s.x, y: .5, z: s.z, yaw: s.yaw, pitch: 0, speed: 0, w: 'none', alive: true, crouch: 0, slide: 0, air: false, sit: s.y, look, emote: '', emoteT: 0 }); };
  if (!myAvatar) myAvatar = buildAvatar(0xb3110d, '');
  sit(myAvatar, venue.seats[0], Math.sin(gameTime * .23) * .35, 0xb3110d);
  if (!menuCam.friend && charSource()) menuCam.friend = buildAvatar(0x2f6f8f, '');
  if (menuCam.friend) sit(menuCam.friend, venue.seats[6], .5 + Math.sin(gameTime * .17 + 2) * .3, 0x2f6f8f);
  // kamera ateşin karşı tarafında yavaşça süzülür; ateş ve karakter ekranın sağında kalır (menü solda)
  menuCam.t += dt * .045;
  const a = Math.sin(menuCam.t) * .45, r = 6.4;
  camera.position.set(Math.sin(a) * r, 1.45 + Math.sin(menuCam.t * .7) * .12, Math.cos(a) * r);
  camera.lookAt(0, 1, -1.2); camera.rotateY(.34);
  if (camera.fov !== 62) { camera.fov = 62; camera.updateProjectionMatrix(); }
  eyePos.copy(camera.position);
  lobbyAmbience(dt);
}
function hideMenuScene() { if (menuCam.friend) menuCam.friend.g.visible = false; }

/* ================= YAZILI SOHBET (lobide ve maçta) ================= */
const chat = { open: false, lastSent: 0 };
function chatOpen() {
  if (net.mode === 'solo' || chat.open) return;
  chat.open = true;
  for (const k in keys) keys[k] = false;
  mouse.left = mouse.right = false;
  $('chatBox').classList.add('open'); $('chatIn').value = ''; $('chatIn').focus();
}
function chatClose() {
  chat.open = false;
  $('chatBox').classList.remove('open'); $('chatIn').blur();
  if (state === 'lobby' && lobby.walking && document.pointerLockElement !== canvas && !IS_TOUCH && !fallbackLook) lock();
}
function chatSend(text) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!text || net.mode === 'solo') return;
  const now = performance.now(); if (now - chat.lastSent < 500) return; chat.lastSent = now;
  const msg = { t: 'chat', id: net.myId, text };
  if (net.mode === 'host') bcast(msg); else toHost(msg);
  chatShow(net.myId, text);
}
function chatShow(id, text, sys) {
  const log = $('chatLog'), el = document.createElement('div');
  el.className = 'cl' + (sys ? ' sys' : '');
  if (sys) el.textContent = text;
  else {
    const p = net.players[id], name = id === net.myId ? playerName() : p ? p.name : '?';
    const col = p ? (isVS() && net.inMatch ? TEAMS[p.team].color : p.color) : 0xefe1cd;
    el.innerHTML = `<b style="color:${hexCol(col)}">${escapeHtml(name)}:</b> ${escapeHtml(text)}`;
    if (state === 'lobby') showBubble(id, text);   // maçta balon konuşanın yerini belli etmesin
    if (AU.ctx && id !== net.myId) tn('sine', 1180, 980, .07, .05);
  }
  el.dataset.t = performance.now();
  log.appendChild(el);
  while (log.children.length > 40) log.firstChild.remove();
  log.scrollTop = log.scrollHeight;
}
const chatSys = text => { if (net.mode !== 'solo') chatShow(null, text, true); };
function updateChat(dt) {
  const show = net.mode !== 'solo';
  if ($('chatBox').hidden === show) $('chatBox').hidden = !show;
  lobby.chatT -= dt; if (lobby.chatT > 0) return; lobby.chatT = .5;
  const now = performance.now();
  for (const el of $('chatLog').children) if (!el.classList.contains('old') && now - el.dataset.t > 12000) el.classList.add('old');
}
$('chatIn').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { chatSend($('chatIn').value); chatClose(); e.preventDefault(); }
  else if (e.key === 'Escape') { chatClose(); e.preventDefault(); }
});
$('chatIn').addEventListener('keyup', e => e.stopPropagation());
$('chatIn').addEventListener('blur', () => { if (chat.open) setTimeout(() => { if (document.activeElement !== $('chatIn') && chat.open) chatClose(); }, 0); });

/* ================= PANEL DÜĞMELERİ ================= */
$('lobbyWalkBtn').addEventListener('click', () => lobbyWalk(true));
$('keysBtn').addEventListener('click', () => { const b = $('keysBox'); b.hidden = !b.hidden; $('keysBtn').setAttribute('aria-expanded', String(!b.hidden)); });
$('venueKamp').addEventListener('click', () => setVenue('kamp'));
$('venueEv').addEventListener('click', () => setVenue('ev'));
$('venueCati').addEventListener('click', () => setVenue('cati'));
$('venueSaha').addEventListener('click', () => setVenue('saha'));
$('setBtnLobby').addEventListener('click', () => openSettings('lobby'));
$('lobbyBackBtn').addEventListener('click', hostBackToLobby);
$('pauseLobbyBtn').addEventListener('click', hostBackToLobby);
canvas.addEventListener('mousedown', () => { if (state === 'lobby' && !lobby.walking) lobbyWalk(true); });

/* ================= LOBİ OYUNCAKLARI: top ve gitar =================
   Top: fiziği host yürütür. Host üstüne yürüyerek iter; herkes F ile şut çeker, konuklar yürüyerek de iter (istek hosta gider).
   Konum ve hız saniyede 10 kez herkese gider, konukta tahminle yumuşatılır.
   Gitar: yanında E → sıradaki akor çalınır (Am · F · C · G). Herkes duyar, uzaklaştıkça kısılır. */
const ball = { body: null, mesh: null, tgt: new V3(), vel: new V3(), sendT: 0, reqT: 0, spot: null };
const ballTex = canvasTex(128, (g, s) => {
  g.fillStyle = '#f2efe6'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#1c1c1e';
  for (const [x, y] of [[32, 32], [96, 32], [64, 80], [16, 104], [112, 104], [64, 8]]) { g.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 13); } g.fill(); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
}, 1, 1);
const BALL_SPOT = { kamp: [3.6, 5.8], ev: [-2.2, 3.2], cati: [3.5, 5.5], saha: [0, 0] };
function lobbyBallSpawn() {
  const sp = BALL_SPOT[curMap]; if (!sp) return;
  ball.mesh = mapMesh(new THREE.Mesh(new THREE.SphereGeometry(.22, 22, 16), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .5 })));
  const host = net.mode !== 'guest';
  ball.body = new CANNON.Body({ mass: host ? .45 : 0, type: host ? CANNON.Body.DYNAMIC : CANNON.Body.KINEMATIC, material: mWorld, collisionFilterGroup: G_DEBRIS, collisionFilterMask: G_STATIC | G_PLAYER | G_DEBRIS, linearDamping: .32, angularDamping: .45 });
  ball.body.addShape(new CANNON.Sphere(.22)); ball.body.position.set(sp[0], .4, sp[1]); world.addBody(ball.body); mapStuff.bodies.push(ball.body);
  ball.tgt.set(sp[0], .22, sp[1]); ball.vel.set(0, 0, 0);
}
// şut / itme: host doğrudan uygular, konuk hosta yollar
function ballImpulse(dx, dz, up, sp) {
  if (!ball.body) return;
  if (net.mode === 'guest') { toHost({ t: 'bk', d: [r2(dx), r2(dz)], u: r2(up), s: r2(sp) }); return; }
  const v = ball.body.velocity; v.x = dx * sp; v.z = dz * sp; v.y = Math.max(v.y, up);
  ball.body.wakeUp();
}
function lobbyKick() {
  if (!ball.body || lobby.sit >= 0) return;
  const b = player.body.position, p = ball.mesh.position, d = Math.hypot(p.x - b.x, p.z - b.z);
  if (d > 1.6) return;
  const dx = (p.x - b.x) / (d || 1) * .4 + flatF.x * .6, dz = (p.z - b.z) / (d || 1) * .4 + flatF.z * .6, l = Math.hypot(dx, dz) || 1;
  ballImpulse(dx / l, dz / l, 3.2, 9.5);
  if (AU.ctx) { punch(150, .08, .35); nz(.05, 900, 300, 1, .2, 'lowpass'); }
}
function updateBall(dt) {
  if (!ball.body || !ball.mesh.parent) return;
  const m = ball.mesh, b = ball.body;
  if (net.mode !== 'guest') {
    m.position.set(b.position.x, b.position.y, b.position.z); m.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    if (net.mode === 'host') { ball.sendT -= dt; if (ball.sendT <= 0) { ball.sendT = .1; bcast({ t: 'bs', p: arr(b.position), v: arr(b.velocity), sc: curMap === 'saha' ? [SAHA.red, SAHA.blue] : null }); } }
  } else {
    // konuk: hostun gönderdiği konuma doğru tahminle ilerle, yuvarlanma görüntüsü hızdan
    ball.tgt.addScaledVector(ball.vel, dt); ball.vel.multiplyScalar(Math.max(0, 1 - dt * .4));
    if (ball.tgt.y < .22) { ball.tgt.y = .22; ball.vel.y = Math.abs(ball.vel.y) * .4; } else ball.vel.y -= 25 * dt;
    m.position.lerp(ball.tgt, Math.min(1, dt * 12)); b.position.set(m.position.x, m.position.y, m.position.z);
    const hs = Math.hypot(ball.vel.x, ball.vel.z);
    if (hs > .05) { _dvb.set(ball.vel.z, 0, -ball.vel.x).normalize(); m.rotateOnWorldAxis(_dvb, hs * dt / .22); }
    // yürüyerek itme: oyuncu topa değiyorsa hızını hosta bildir
    const pb = player.body.position, pv = player.body.velocity, d = Math.hypot(m.position.x - pb.x, m.position.z - pb.z), ps = Math.hypot(pv.x, pv.z);
    ball.reqT -= dt;
    if (d < .78 && ps > 1 && ball.reqT <= 0) { ball.reqT = .2; ballImpulse(pv.x / ps, pv.z / ps, 1.2, ps * 1.15); }
  }
}
const _dvb = new V3();
function ballNet(d) {
  if (!ball.body) return; ball.tgt.set(d.p[0], d.p[1], d.p[2]); ball.vel.set(d.v[0], d.v[1], d.v[2]);
  if (d.sc && curMap === 'saha' && (d.sc[0] !== SAHA.red || d.sc[1] !== SAHA.blue)) { SAHA.red = d.sc[0]; SAHA.blue = d.sc[1]; sahaTabelaDraw(); }   // sonradan gelen skoru görsün
}
// ---- gitar ----
const GUITAR_SPOT = { kamp: [1.55, -3.42] };
const CHORDS_GTR = [[57, 64, 69, 72, 76], [53, 60, 65, 69, 72], [48, 55, 60, 64, 67, 72], [43, 50, 55, 59, 62, 67]];   // Am F C G
const gtr = { i: 0 };
function strum(ci, vol, pan = 0) {
  const c = AU.ctx; if (!c) return;
  const t0 = c.currentTime + .01, out = c.createGain(); out.gain.value = vol;
  let node = out; if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; out.connect(p); node = p; }
  node.connect(AU.fx || AU.master);
  CHORDS_GTR[ci % CHORDS_GTR.length].forEach((m, i) => {
    const t = t0 + i * .028, f = 440 * Math.pow(2, (m - 69) / 12), o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f * 8, t); fl.frequency.exponentialRampToValueAtTime(f * 1.5, t + .6); fl.Q.value = 1.5;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .004); g.gain.exponentialRampToValueAtTime(.0008, t + 2.2);
    o.connect(fl); fl.connect(g); g.connect(out); o.start(t); o.stop(t + 2.3);
  });
}
function nearGuitar() { const sp = GUITAR_SPOT[curMap]; if (!sp) return false; const b = player.body.position; return Math.hypot(sp[0] - b.x, sp[1] - b.z) < 1.8; }
function playGuitar() {
  const i = gtr.i++ % CHORDS_GTR.length;
  strum(i, .9);
  const msg = { t: 'gtr', id: net.myId, i };
  if (net.mode === 'host') bcast(msg); else toHost(msg);
  const sp = GUITAR_SPOT[curMap]; if (sp) for (let k = 0; k < 6; k++) emit(sp[0], .9, sp[1], rand(-.4, .4), rand(1, 2), rand(-.4, .4), 2, 1, .8, .3, rand(.6, 1));
}
function gtrNet(d) {
  if (state !== 'lobby' || d.id === net.myId) return;
  const pr = net.players[d.id] && net.players[d.id].proxy, p = pr ? pr.pos : null;
  const dist = p ? Math.hypot(p.x - eyePos.x, p.z - eyePos.z) : 5, vol = clamp(1 - (dist - 2) / 22, .05, 1) * .9;
  const pan = p && dist > .5 ? clamp(((p.x - eyePos.x) * rightV.x + (p.z - eyePos.z) * rightV.z) / dist, -1, 1) * .7 : 0;
  strum(d.i, vol, pan);
}
