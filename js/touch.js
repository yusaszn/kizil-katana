'use strict';
/* Telefon ve tablet kontrolleri: solda sanal analog çubuk (hareket, sonuna kadar itince koşu), sağda kaydırarak nişan alma,
   sağ altta tuşlar. Ateş tuşuna basılıyken aynı parmakla kaydırınca nişan da alınır. Klavye/fare ile oynayanlarda hiç görünmez. */

const IS_TOUCH = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;
const touch = { stick: null, look: null, sx: 0, sy: 0, kx: 0, ky: 0, btn: {} };
const LOBBY_TB = new Set(['jump', 'talk', 'cam', 'pause', 'sit', 'wave', 'dance', 'chat', 'kick', 'crouch']);   // lobide görünen tuşlar (TUT topun yanındayken)
// yerleşim: üst sırada küçük tuşlar (sağdan sola), ana kümenin solunda duruma göre çıkan tuşlar (iki sütun);
// yalnız görünenler yer kaplar, böylece hiçbir tuş başka bir tuşun altında kalmaz
const TOP_TB = ['pause', 'cam', 'talk', 'chat', 'score', 'inspect', 'team', 'buy'];
const EXTRA_TB = ['sit', 'grab', 'heavy', 'smoke', 'flash', 'heg', 'bomb', 'build', 'cancel', 'rotate', 'race', 'wave', 'dance'];
// lobide E tuşunun o anki işi (yakında bir şey yoksa boş: tuş gizlenir)
function lobbyActionName() {
  if (!lobby.walking) return '';
  if (lobby.sit >= 0) return 'KALK';
  const n = lobby.near; if (!n) return '';
  return n.kind === 'seat' ? 'OTUR' : n.kind === 'guitar' ? 'GİTAR' : n.kind === 'whistle' ? 'MAÇ' : 'PANO';
}

// telefonda varsayılan çözünürlük düşük (kayıtlı bir ayar yoksa): akıcı oynansın
if (IS_TOUCH) {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('kk-ayarlar') || '{}'); } catch (e) { /* kayıt yok */ }
  if (saved.quality == null) { SETTINGS.quality = 1; applySettings(); }
  document.body.classList.add('touchdev');
}

// tuş: [kimlik, yazı, mod koşulu, basınca, bırakınca]
const TBTN = [
  ['fire', 'ATEŞ', () => true, () => { mouse.left = true; sgClick = true; rifClick = true; attackInput('L'); }, () => { mouse.left = false; }],
  ['aim', 'NİŞAN', () => true, () => { aimPress(); sgClickR = true; rifClickR = true; if (isKnife(wpn.cur)) knifeAttack(true); }, () => { aimRelease(); }],
  ['jump', 'ZIPLA', () => true, () => { player.jumpBuf = .15; }],
  ['crouch', 'EĞİL', () => true, () => { if (state === 'lobby') { lobbySlide(); return; } keys.ControlLeft = true; crouchInput(); }, () => { keys.ControlLeft = false; }],
  ['dash', 'ATIL', () => !isVS(), () => dash()],
  ['kick', 'TEKME', () => true, () => { if (state === 'lobby') lobbyKickStart(); else kick(); }, () => { if (state === 'lobby') lobbyKickRelease(); }],   // lobide basılı tut: sert şut
  ['grab', 'TUT', () => false, () => lobbyGrab()],   // lobide topun yanında: TUT / AT
  ['reload', 'ŞARJÖR', () => true, () => { startReload(); startShellReload(); rifleReload(); pistolReload(); gunReload(); }],
  ['swap', 'SİLAH', () => true, () => { switchWeapon(); touch.stripUntil = performance.now() + 3000; }],   // sıradaki silah + 3 sn silah şeridi (istediğine dokun)
  ['inspect', 'İNCELE', () => true, () => startInspect()],
  ['race', 'YARIŞ', () => isRange(), () => rangeChallenge()],
  ['heavy', 'AĞIR', () => !isVS() && wpn.cur === 'katana', () => attackInput('H')],
  ['pick', 'ÖZELLİK', () => !isVS() && picksLeft() > 0, () => openPick()],
  ['buy', 'SATIN AL', () => isVS() && vs.phase === 'buy', () => toggleBuy()],
  ['team', 'TAKIM', () => isVS(), () => toggleTeamPick()],
  ['smoke', 'SİS', () => isVS() && eco.smoke > 0, () => throwUtil('smoke')],
  ['flash', 'FLAŞ', () => isVS() && eco.flash > 0, () => throwUtil('flash')],
  ['heg', 'EL BOMB.', () => isVS() && eco.he > 0, () => throwUtil('he')],
  ['bomb', 'BOMBA', () => typeof isBomb === 'function' && isBomb(), () => { keys.Digit4 = true; }, () => { keys.Digit4 = false; }],
  ['talk', 'KONUŞ', () => net.mode !== 'solo' && voiceMode() === 'ptt', () => { keys.KeyK = true; }, () => { keys.KeyK = false; }],
  ['cam', 'KAMERA', () => true, () => { if (state === 'lobby') lobby.tp = !lobby.tp; else { SETTINGS.thirdPerson = !SETTINGS.thirdPerson; saveSettings(); } }],
  ['pause', 'II', () => true, () => { if (state === 'lobby') lobbyWalk(false); else openPause(); }],
  ['sit', 'E', () => false, () => lobbyUse()],   // lobide E: yanındakine göre OTUR / KALK / GİTAR / PANO yazar
  ['wave', 'SELAM', () => false, () => lobbyEmote('wave')],
  ['dance', 'DANS', () => false, () => lobbyEmote('dance')],
  ['chat', 'SOHBET', () => net.mode !== 'solo', () => chatOpen()],
  ['build', 'KUR', () => isDefense(), () => { if (def.sel) defConfirm(); else defToggleMenu(); }],
  ['cancel', 'VAZGEÇ', () => isDefense() && !!def.sel, () => defCancel()],
  ['rotate', 'DÖNDÜR', () => isDefense() && def.sel === 'barikat', () => { def.rot = def.rot ? 0 : 1; }],
  ['score', 'SKOR', () => net.mode !== 'solo', () => document.body.classList.toggle('showboard')],
];

function buildTouchUI() {
  const root = $('touch');
  root.innerHTML = '<div id="tStickZone"></div><div id="tLookZone"></div><div id="tStick"><i></i></div>' +
    TBTN.map(([id, txt]) => `<button type="button" class="tb${TOP_TB.includes(id) ? ' tsm' : EXTRA_TB.includes(id) ? ' tex' : ''}" id="tb_${id}" data-id="${id}">${txt}</button>`).join('') +
    '<div id="tWeapons"></div>' +
    '<div id="tRotate">Telefonu yan çevir</div>';
  for (const [id, , , down, up] of TBTN) {
    const el = $('tb_' + id);
    el.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation();
      if (state !== 'play' && state !== 'dead' && state !== 'lobby' && id !== 'pause') return;
      el.classList.add('on'); touch.btn[id] = true;
      down();
      // ateş tuşu aynı zamanda nişan alanı: basılı parmak kaydıkça kamera döner
      if (id === 'fire' && !touch.look) { const t = e.changedTouches[0]; touch.look = { id: t.identifier, x: t.clientX, y: t.clientY }; }
    }, { passive: false });
    const end = e => { e.preventDefault(); el.classList.remove('on'); if (touch.btn[id]) { touch.btn[id] = false; if (up) up(); } };
    el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false });
  }
  // sol: analog çubuk (dokunduğun yerde belirir)
  const sz = $('tStickZone');
  sz.addEventListener('touchstart', e => {
    e.preventDefault(); if (touch.stick) return;
    const t = e.changedTouches[0]; touch.stick = { id: t.identifier, x: t.clientX, y: t.clientY }; touch.kx = touch.ky = 0;
    const s = $('tStick'); s.style.left = t.clientX + 'px'; s.style.top = t.clientY + 'px'; s.classList.add('on');
  }, { passive: false });
  // sağ: kaydırarak nişan
  $('tLookZone').addEventListener('touchstart', e => {
    e.preventDefault(); if (touch.look) return;
    const t = e.changedTouches[0]; touch.look = { id: t.identifier, x: t.clientX, y: t.clientY };
  }, { passive: false });
  window.addEventListener('touchmove', e => {
    if (!IS_TOUCH || $('touch').hidden) return;
    for (const t of e.changedTouches) {
      if (touch.stick && t.identifier === touch.stick.id) {
        const R = 55; let dx = t.clientX - touch.stick.x, dy = t.clientY - touch.stick.y; const d = Math.hypot(dx, dy);
        if (d > R) { dx *= R / d; dy *= R / d; }
        touch.kx = dx / R; touch.ky = dy / R;
        $('tStick').firstChild.style.transform = `translate(${dx}px,${dy}px)`;
      }
      if (touch.look && t.identifier === touch.look.id && ((state === 'play' && player.alive && !anyMenu()) || (state === 'lobby' && lobby.walking))) {
        const s = .0052 * SETTINGS.sens * (camera.fov / SETTINGS.fov);
        player.yaw -= (t.clientX - touch.look.x) * s; player.pitch = clamp(player.pitch - (t.clientY - touch.look.y) * s, -1.45, 1.45);
        touch.look.x = t.clientX; touch.look.y = t.clientY;
      }
    }
    if (e.target.closest && e.target.closest('#touch')) e.preventDefault();
  }, { passive: false });
  const release = e => {
    for (const t of e.changedTouches) {
      if (touch.stick && t.identifier === touch.stick.id) { touch.stick = null; touch.kx = touch.ky = 0; $('tStick').classList.remove('on'); $('tStick').firstChild.style.transform = ''; }
      if (touch.look && t.identifier === touch.look.id) touch.look = null;
    }
  };
  window.addEventListener('touchend', release); window.addEventListener('touchcancel', release);
}

function updateTouch() {
  const root = $('touch');
  const show = IS_TOUCH && (state === 'play' || state === 'dead' || (state === 'lobby' && lobby.walking));
  if (root.hidden === show) root.hidden = !show;
  if (!show) { if (touch.stickKeys) { keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = false; shiftDown = 0; touch.stickKeys = false; } return; }
  // çubuk → WASD (sonuna kadar ileri: koşu)
  const k = .3;
  keys.KeyW = touch.ky < -k; keys.KeyS = touch.ky > k; keys.KeyA = touch.kx < -k; keys.KeyD = touch.kx > k;
  const far = Math.hypot(touch.kx, touch.ky) > .92 && touch.ky < -.5;
  shiftDown = far ? performance.now() - 1000 : 0;
  touch.stickKeys = true;
  // moda göre görünen tuşlar
  const act = state === 'lobby' ? lobbyActionName() : '';
  if (act && touch.act !== act) { touch.act = act; $('tb_sit').textContent = act; }
  const grab = state === 'lobby' ? lobbyGrabName() : '';
  if (grab && touch.grab !== grab) { touch.grab = grab; $('tb_grab').textContent = grab; }
  const cr = state === 'lobby' ? 'KAY' : 'EĞİL'; if (touch.cr !== cr) { touch.cr = cr; $('tb_crouch').textContent = cr; }
  for (const [id, , cond] of TBTN) { const el = $('tb_' + id), on = state === 'lobby' ? (id === 'sit' ? !!act : id === 'grab' ? !!grab : LOBBY_TB.has(id)) : !!cond(); if (el.hidden === on) el.hidden = !on; }
  layoutTouch();
  updateWeaponStrip();
  $('tRotate').hidden = innerWidth >= innerHeight;
}
function layoutTouch() {
  const sig = TOP_TB.concat(EXTRA_TB).map(id => $('tb_' + id).hidden ? 0 : 1).join('');
  if (touch.sig === sig) return; touch.sig = sig;
  let i = 0;
  for (const id of TOP_TB) { const el = $('tb_' + id); if (el.hidden) continue; Object.assign(el.style, { right: `calc(${222 + i * 54}px + env(safe-area-inset-right,0px))`, top: 'calc(12px + env(safe-area-inset-top,0px))', bottom: 'auto' }); i++; }
  i = 0;
  for (const id of EXTRA_TB) {
    const el = $('tb_' + id); if (el.hidden) continue;
    const col = Math.floor(i / 4), row = i % 4;
    Object.assign(el.style, { right: `calc(${292 + col * 64}px + env(safe-area-inset-right,0px))`, bottom: `calc(${24 + row * 64}px + env(safe-area-inset-bottom,0px))`, top: 'auto' });
    i++;
  }
}
// silah şeridi: SİLAH'a dokununca 3 sn açılır, eldeki bütün silahlar yan yana; dokunduğun silaha geçersin
const shortName = w => ({ katana: 'KATANA', uzi: 'UZİ', shotgun: 'POMPALI', m4: 'M4', awp: 'AWP', pistol: 'TABANCA', knife: 'BIÇAK', karambit: 'KARAMB.', butterfly: 'KELEBEK', rocket: 'ROKET', launcher: 'BOMBAATAR' })[w] || (typeof GUNS !== 'undefined' && GUNS[w] ? GUNS[w].name : w.toUpperCase());
function updateWeaponStrip() {
  const box = $('tWeapons'), show = state === 'play' && player.alive && performance.now() < (touch.stripUntil || 0);
  if (box.hidden === show) box.hidden = !show;
  if (!show) return;
  const list = weaponList(), sig = list.join(',');
  if (touch.wsig !== sig) {
    touch.wsig = sig;
    box.innerHTML = list.map((w, i) => `<button type="button" data-w="${w}"><small>${i + 1}</small>${shortName(w)}</button>`).join('');
  }
  const cur = wpn.next || wpn.cur;
  if (touch.wcur !== cur) { touch.wcur = cur; for (const b of box.children) b.classList.toggle('on', b.dataset.w === cur); }
}
if (IS_TOUCH) {
  buildTouchUI();
  $('tWeapons').addEventListener('touchstart', e => {
    const b = e.target.closest('button'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (state === 'play') { switchWeapon(b.dataset.w); touch.stripUntil = performance.now() + 700; }
  }, { passive: false });
}
