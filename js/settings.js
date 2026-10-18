'use strict';
/* Ayarlar: FPS göstergesi, fare hassasiyeti, ses, görüş açısı, grafik kalitesi, kan miktarı. Tarayıcıda saklanır. */

const SETTINGS_DEFAULT = { showFps: false, thirdPerson: false, alwaysSprint: false, sens: 1, volume: .5, fov: 80, quality: 1.5, gore: 1 };
const SETTINGS = Object.assign({}, SETTINGS_DEFAULT);
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('kk-ayarlar') || '{}')); } catch (e) { /* kayıt yoksa varsayılanlar */ }

function saveSettings() { try { localStorage.setItem('kk-ayarlar', JSON.stringify(SETTINGS)); } catch (e) { /* saklanamazsa bu oturumda geçerli */ } }
function applySettings() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SETTINGS.quality));
  resize();
  if (AU.master) AU.master.gain.value = SETTINGS.volume;
  $('fps').hidden = !SETTINGS.showFps;
}

const SETTING_ROWS = [
  { key: 'showFps', label: 'FPS göstergesi', type: 'toggle' },
  { key: 'thirdPerson', label: '3. şahıs kamera (V)', type: 'toggle' },
  { key: 'alwaysSprint', label: 'Sürekli koş (Shift = atılma)', type: 'toggle' },
  { key: 'sens', label: 'Fare hassasiyeti', type: 'range', min: .2, max: 3, step: .05, fmt: v => v.toFixed(2) + '×' },
  { key: 'volume', label: 'Ses', type: 'range', min: 0, max: 1, step: .05, fmt: v => Math.round(v * 100) + '%' },
  { key: 'fov', label: 'Görüş açısı', type: 'range', min: 60, max: 110, step: 1, fmt: v => v + '°' },
  { key: 'quality', label: 'Çözünürlük', type: 'choice', options: [[.6, 'Düşük'], [1, 'Orta'], [1.5, 'Yüksek'], [2, 'Çok yüksek']] },
  { key: 'gore', label: 'Kan miktarı', type: 'choice', options: [[.35, 'Az'], [1, 'Normal'], [1.8, 'Kan gölü']] },
];
function buildSettings() {
  const box = $('settingRows'); box.innerHTML = '';
  for (const r of SETTING_ROWS) {
    const row = document.createElement('div'); row.className = 'srow';
    const id = 'set-' + r.key;
    const lab = document.createElement('label'); lab.htmlFor = id; lab.textContent = r.label; row.appendChild(lab);
    const ctl = document.createElement('div'); ctl.className = 'sctl';
    if (r.type === 'toggle') {
      const b = document.createElement('button'); b.type = 'button'; b.id = id; b.className = 'toggle';
      const sync = () => { b.textContent = SETTINGS[r.key] ? 'AÇIK' : 'KAPALI'; b.setAttribute('aria-pressed', SETTINGS[r.key]); b.classList.toggle('on', !!SETTINGS[r.key]); };
      b.addEventListener('click', () => { SETTINGS[r.key] = !SETTINGS[r.key]; sync(); saveSettings(); applySettings(); });
      sync(); ctl.appendChild(b);
    } else if (r.type === 'range') {
      const inp = document.createElement('input'); inp.type = 'range'; inp.id = id; inp.min = r.min; inp.max = r.max; inp.step = r.step; inp.value = SETTINGS[r.key];
      const out = document.createElement('output'); out.htmlFor = id; out.textContent = r.fmt(SETTINGS[r.key]);
      inp.addEventListener('input', () => { SETTINGS[r.key] = parseFloat(inp.value); out.textContent = r.fmt(SETTINGS[r.key]); saveSettings(); applySettings(); });
      ctl.appendChild(inp); ctl.appendChild(out);
    } else {
      const seg = document.createElement('div'); seg.className = 'seg'; seg.id = id; seg.setAttribute('role', 'group');
      for (const [val, name] of r.options) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = name;
        b.classList.toggle('on', SETTINGS[r.key] === val);
        b.addEventListener('click', () => { SETTINGS[r.key] = val; for (const x of seg.children) x.classList.remove('on'); b.classList.add('on'); saveSettings(); applySettings(); });
        seg.appendChild(b);
      }
      ctl.appendChild(seg);
    }
    row.appendChild(ctl); box.appendChild(row);
  }
}
let settingsFrom = 'start';
function openSettings(from) { settingsFrom = from; buildSettings(); $(from).hidden = true; $('settings').hidden = false; }
function closeSettings() { $('settings').hidden = true; $(settingsFrom).hidden = false; }
$('setBtnStart').addEventListener('click', () => openSettings('start'));
$('setBtnPause').addEventListener('click', () => openSettings('pause'));
$('setBack').addEventListener('click', closeSettings);
$('setReset').addEventListener('click', () => { Object.assign(SETTINGS, SETTINGS_DEFAULT); saveSettings(); applySettings(); buildSettings(); });

// FPS sayacı
const fpsMeter = { n: 0, t: 0 };
function updateFps(rawDt) {
  if (!SETTINGS.showFps) return;
  fpsMeter.n++; fpsMeter.t += rawDt;
  if (fpsMeter.t >= .5) { $('fps').textContent = Math.round(fpsMeter.n / fpsMeter.t) + ' FPS'; fpsMeter.n = 0; fpsMeter.t = 0; }
}
applySettings();
