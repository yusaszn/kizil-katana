'use strict';
/* Telefon ve tablet kontrolleri: solda sanal analog çubuk (hareket, sonuna kadar itince koşu), sağda kaydırarak nişan alma,
   sağ altta tuşlar. Ateş tuşuna basılıyken aynı parmakla kaydırınca nişan da alınır. Klavye/fare ile oynayanlarda hiç görünmez. */

const IS_TOUCH = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && matchMedia('(pointer: coarse)').matches;
const touch = { stick: null, look: null, sx: 0, sy: 0, kx: 0, ky: 0, btn: {} };

// telefonda varsayılan çözünürlük düşük (kayıtlı bir ayar yoksa): akıcı oynansın
if (IS_TOUCH) {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('kk-ayarlar') || '{}'); } catch (e) { /* kayıt yok */ }
  if (saved.quality == null) { SETTINGS.quality = 1; applySettings(); }
  document.body.classList.add('touchdev');
}

// tuş: [kimlik, yazı, mod koşulu, basınca, bırakınca]
const TBTN = [
  ['fire', 'ATEŞ', () => true, () => { mouse.left = true; sgClick = true; rifClick = true; attackInput('L'); }, () => { mouse.left = false; }],
  ['aim', 'NİŞAN', () => true, () => { mouse.right = true; sgClickR = true; rifClickR = true; if (isKnife(wpn.cur)) knifeAttack(true); }, () => { mouse.right = false; }],
  ['jump', 'ZIPLA', () => true, () => { player.jumpBuf = .15; }],
  ['crouch', 'EĞİL', () => true, () => { keys.ControlLeft = true; crouchInput(); }, () => { keys.ControlLeft = false; }],
  ['dash', 'ATIL', () => !isVS(), () => dash()],
  ['kick', 'TEKME', () => true, () => kick()],
  ['reload', 'ŞARJÖR', () => true, () => { startReload(); startShellReload(); rifleReload(); pistolReload(); gunReload(); }],
  ['swap', 'SİLAH', () => true, () => quickSwitch()],
  ['heavy', 'AĞIR', () => !isVS() && wpn.cur === 'katana', () => attackInput('H')],
  ['pick', 'ÖZELLİK', () => !isVS() && picksLeft() > 0, () => openPick()],
  ['buy', 'SATIN AL', () => isVS() && vs.phase === 'buy', () => toggleBuy()],
  ['team', 'TAKIM', () => isVS(), () => toggleTeamPick()],
  ['smoke', 'SİS', () => isVS() && eco.smoke > 0, () => throwUtil('smoke')],
  ['flash', 'FLAŞ', () => isVS() && eco.flash > 0, () => throwUtil('flash')],
  ['bomb', 'BOMBA', () => typeof isBomb === 'function' && isBomb(), () => { keys.Digit4 = true; }, () => { keys.Digit4 = false; }],
  ['talk', 'KONUŞ', () => net.mode !== 'solo' && voiceMode() === 'ptt', () => { keys.KeyK = true; }, () => { keys.KeyK = false; }],
  ['cam', 'KAMERA', () => true, () => { SETTINGS.thirdPerson = !SETTINGS.thirdPerson; saveSettings(); }],
  ['pause', 'II', () => true, () => openPause()],
];

function buildTouchUI() {
  const root = $('touch');
  root.innerHTML = '<div id="tStickZone"></div><div id="tLookZone"></div><div id="tStick"><i></i></div>' +
    TBTN.map(([id, txt]) => `<button type="button" class="tb" id="tb_${id}" data-id="${id}">${txt}</button>`).join('') +
    '<div id="tRotate">Telefonu yan çevir</div>';
  for (const [id, , , down, up] of TBTN) {
    const el = $('tb_' + id);
    el.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation();
      if (state !== 'play' && state !== 'dead' && id !== 'pause') return;
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
      if (touch.look && t.identifier === touch.look.id && (state === 'play') && player.alive && !anyMenu()) {
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
  const show = IS_TOUCH && (state === 'play' || state === 'dead');
  if (root.hidden === show) root.hidden = !show;
  if (!show) { if (touch.stickKeys) { keys.KeyW = keys.KeyA = keys.KeyS = keys.KeyD = false; shiftDown = 0; touch.stickKeys = false; } return; }
  // çubuk → WASD (sonuna kadar ileri: koşu)
  const k = .3;
  keys.KeyW = touch.ky < -k; keys.KeyS = touch.ky > k; keys.KeyA = touch.kx < -k; keys.KeyD = touch.kx > k;
  const far = Math.hypot(touch.kx, touch.ky) > .92 && touch.ky < -.5;
  shiftDown = far ? performance.now() - 1000 : 0;
  touch.stickKeys = true;
  // moda göre görünen tuşlar
  for (const [id, , cond] of TBTN) { const el = $('tb_' + id), on = !!cond(); if (el.hidden === on) el.hidden = !on; }
  $('tRotate').hidden = innerWidth >= innerHeight;
}
if (IS_TOUCH) buildTouchUI();
