'use strict';
/* Çekirdek: yardımcılar, render, dokular, fizik dünyası, ses */

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const V3 = THREE.Vector3;
const UP = new V3(0, 1, 0);

/* ================= RENDERER ================= */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.autoClear = false;

const scene = new THREE.Scene();
const FOG = 0x1d0705;
scene.background = new THREE.Color(FOG);
scene.fog = new THREE.FogExp2(FOG, 0.034);
const camera = new THREE.PerspectiveCamera(80, 1, 0.03, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);

// silah sahnesi (kılıç ve uziler her şeyin üstünde çizilir)
const vmScene = new THREE.Scene();
const vmCam = new THREE.PerspectiveCamera(62, 1, 0.01, 10);
// silah sahnesi ışıkları: nötr ana ışık, soğuk kontur ışığı, alttan sıcak ateş yansıması
vmScene.add(new THREE.AmbientLight(0x4a3c3a, 0.45));
vmScene.add(new THREE.HemisphereLight(0x9fb4d0, 0x3a1a10, .55));
const vmKey = new THREE.DirectionalLight(0xfff0e0, 1.5); vmKey.position.set(.8, 1.6, 1.2); vmScene.add(vmKey);
const vmRim = new THREE.DirectionalLight(0x9ec8ff, .9); vmRim.position.set(-1.2, 1, -1.5); vmScene.add(vmRim);
const vmFire = new THREE.PointLight(0xff5a20, .55, 4); vmFire.position.set(-0.6, -1, -0.5); vmScene.add(vmFire);
const vmMuzzle = new THREE.PointLight(0xffc070, 0, 3); vmMuzzle.position.set(0, -.1, -.8); vmScene.add(vmMuzzle);

const splatCv = $('splat'), sctx = splatCv.getContext('2d');
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = vmCam.aspect = w / h;
  camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  splatCv.width = Math.ceil(w / 2); splatCv.height = Math.ceil(h / 2);
}
window.addEventListener('resize', resize); resize();

/* ================= DOKULAR ================= */
function canvasTex(size, draw, rx = 1, ry = rx, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
  return t;
}
function grain(g, s, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '255,220,200'},${Math.random() * a})`; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); } }
const floorTex = canvasTex(512, (g, s) => {
  g.fillStyle = '#231b18'; g.fillRect(0, 0, s, s);
  const n = 4, t = s / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const l = 26 + Math.random() * 14;
    g.fillStyle = `hsl(12,${10 + Math.random() * 8}%,${l * .5}%)`;
    g.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
    g.fillStyle = 'rgba(255,200,170,.05)'; g.fillRect(i * t + 3, j * t + 3, t - 6, 3);
  }
  grain(g, s, 9000, .25);
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.5;
  for (let k = 0; k < 14; k++) { g.beginPath(); let x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); for (let m = 0; m < 6; m++) { x += rand(-30, 30); y += rand(-30, 30); g.lineTo(x, y); } g.stroke(); }
  for (let k = 0; k < 10; k++) { const x = Math.random() * s, y = Math.random() * s, r = rand(10, 50); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(40,0,0,.45)'); gr.addColorStop(1, 'rgba(40,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
}, 11);
const wallTex = canvasTex(512, (g, s) => {
  g.fillStyle = '#33241f'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `hsl(14,18%,${14 + Math.random() * 6}%)`; g.fillRect(i * 128 + 4, 4, 120, s - 8);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(i * 128, 0, 4, s);
    for (let y = 16; y < s; y += 60) { g.fillStyle = '#5a463c'; g.beginPath(); g.arc(i * 128 + 14, y, 3, 0, 7); g.arc(i * 128 + 114, y, 3, 0, 7); g.fill(); }
  }
  for (let k = 0; k < 40; k++) { const x = Math.random() * s, y = Math.random() * s * .6; const gr = g.createLinearGradient(x, y, x, y + rand(60, 220)); gr.addColorStop(0, 'rgba(110,40,15,.45)'); gr.addColorStop(1, 'rgba(110,40,15,0)'); g.fillStyle = gr; g.fillRect(x, y, rand(2, 8), 220); }
  grain(g, s, 8000, .25);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, s - 30, s, 30);
}, 11, 1.6);
const pillarTex = wallTex.clone(); pillarTex.needsUpdate = true; pillarTex.repeat.set(.45, 1.6);
const crateTex = canvasTex(256, (g, s) => {
  g.fillStyle = '#5b3a1f'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 6; i++) { g.fillStyle = `hsl(26,${40 + Math.random() * 10}%,${20 + Math.random() * 8}%)`; g.fillRect(0, i * s / 6 + 2, s, s / 6 - 4); }
  g.strokeStyle = '#2a170a'; g.lineWidth = 22; g.strokeRect(11, 11, s - 22, s - 22);
  g.lineWidth = 18; g.beginPath(); g.moveTo(20, 20); g.lineTo(s - 20, s - 20); g.stroke();
  g.strokeStyle = '#7a5230'; g.lineWidth = 3; g.strokeRect(4, 4, s - 8, s - 8);
  grain(g, s, 3000, .3);
});
const splatTex = canvasTex(128, (g, s) => {
  g.fillStyle = '#fff';
  const c = s / 2;
  g.beginPath(); g.arc(c, c, s * .26, 0, 7); g.fill();
  for (let i = 0; i < 14; i++) { const a = Math.random() * 7, d = rand(s * .18, s * .44), r = rand(2, 9); g.beginPath(); g.arc(c + Math.cos(a) * d, c + Math.sin(a) * d, r, 0, 7); g.fill(); }
  for (let i = 0; i < 7; i++) { const a = Math.random() * 7; g.lineWidth = rand(3, 8); g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a) * s * .4, c + Math.sin(a) * s * .4); g.stroke(); }
}, 1, 1, false);
splatTex.wrapS = splatTex.wrapT = THREE.ClampToEdgeWrapping;
const dotTex = canvasTex(32, (g, s) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 1, 0, 7); g.fill(); }, 1, 1, false);
const glowTex = canvasTex(64, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }, 1, 1, false);
const flashTex = canvasTex(64, (g, s) => {
  const c = s / 2; g.translate(c, c);
  for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); const gr = g.createLinearGradient(0, 0, c, 0); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -4); g.lineTo(c, 0); g.lineTo(0, 4); g.fill(); }
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, c * .5); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(-c, -c, s, s);
}, 1, 1, false);
const runeTex = canvasTex(512, (g, s) => {
  const c = s / 2; g.strokeStyle = '#fff'; g.fillStyle = '#fff';
  g.lineWidth = 6; g.beginPath(); g.arc(c, c, s * .46, 0, 7); g.stroke();
  g.lineWidth = 3; g.beginPath(); g.arc(c, c, s * .4, 0, 7); g.stroke();
  g.beginPath(); g.arc(c, c, s * .18, 0, 7); g.stroke();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.save(); g.translate(c + Math.cos(a) * s * .43, c + Math.sin(a) * s * .43); g.rotate(a); g.fillRect(-2, -8, 4, 16); if (i % 3 === 0) g.fillRect(-8, -2, 16, 4); g.restore(); }
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * s * .18, c + Math.sin(a) * s * .18); g.lineTo(c + Math.cos(a) * s * .4, c + Math.sin(a) * s * .4); g.stroke(); }
}, 1, 1, false);

// metal yansımaları için ortam haritası
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene(); envScene.background = new THREE.Color(0x1a0504);
const envBox = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); envScene.add(m); };
envBox(20, 1, 20, 0, -5, 0, 0xff4a14); envBox(6, .5, 6, 0, 6, 0, 0xfff0e0); envBox(1, 8, 8, 6, 0, 0, 0x5a1008); envBox(1, 8, 8, -6, 1, 2, 0xffa060);
const envTex = pmrem.fromScene(envScene, 0.03).texture;
// silahlar için nötr stüdyo yansıması: metal her haritada çelik gibi görünsün (cehennem kızılı yansımasın)
const vmEnvScene = new THREE.Scene(); vmEnvScene.background = new THREE.Color(0x1c1d20);
{ const vb = (w, h, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); vmEnvScene.add(m); };
  vb(20, 1, 20, 0, -5, 0, 0x2a2622); vb(8, .5, 5, 0, 6, 0, 0xe8ecf2); vb(1, 6, 10, 6, 1, 0, 0x9aa4b4); vb(1, 5, 6, -6, 0, 2, 0x5a5048); }
const vmEnvTex = pmrem.fromScene(vmEnvScene, 0.04).texture;

/* ================= FİZİK ================= */
const G_STATIC = 1, G_PLAYER = 2, G_ENEMY = 4, G_DEBRIS = 8;
const world = new CANNON.World();
world.gravity.set(0, -25, 0);
world.broadphase = new CANNON.SAPBroadphase(world);
world.solver.iterations = 7;
world.allowSleep = true;
const mWorld = new CANNON.Material('world'), mChar = new CANNON.Material('char');
world.defaultContactMaterial.friction = 0.35;
world.defaultContactMaterial.restitution = 0.12;
world.addContactMaterial(new CANNON.ContactMaterial(mWorld, mWorld, { friction: 0.4, restitution: 0.12 }));
world.addContactMaterial(new CANNON.ContactMaterial(mChar, mWorld, { friction: 0, restitution: 0 }));
world.addContactMaterial(new CANNON.ContactMaterial(mChar, mChar, { friction: 0, restitution: 0 }));

// dinamik ışıklar: silah patlamalarında hem silahı hem de oyun dünyasını aydınlatır
const worldMuzzle = new THREE.PointLight(0xffa050, 0, 16, 2);
camera.add(worldMuzzle);
let muzzleFlashT = 0;
function flashWorld(intensity = 2.5, color = 0xffa050, dur = 0.06) {
  vmMuzzle.color.setHex(color); vmMuzzle.intensity = intensity * 1.5;
  worldMuzzle.color.setHex(color); worldMuzzle.intensity = intensity;
  muzzleFlashT = dur;
}
function updateMuzzleFlash(dt) {
  if (muzzleFlashT > 0) {
    muzzleFlashT -= dt;
    if (muzzleFlashT <= 0) {
      vmMuzzle.intensity = 0;
      worldMuzzle.intensity = 0;
    } else {
      const f = muzzleFlashT / 0.06;
      vmMuzzle.intensity *= f;
      worldMuzzle.intensity *= f;
    }
  }
}

/* ================= SES ================= */
const AU = { ctx: null, last: {} };
function initAudio() {
  if (AU.ctx) { AU.ctx.resume(); return; }
  try {
    const C = window.AudioContext || window.webkitAudioContext; const c = new C(); AU.ctx = c;
    AU.master = c.createGain(); AU.master.gain.value = SETTINGS.volume;
    const comp = c.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-14, c.currentTime);
    comp.knee.setValueAtTime(18, c.currentTime);
    comp.ratio.setValueAtTime(6, c.currentTime);
    comp.attack.setValueAtTime(0.003, c.currentTime);
    comp.release.setValueAtTime(0.18, c.currentTime);
    AU.master.connect(comp); comp.connect(c.destination);

    // Beyaz ve pembe gürültü tamponu
    const buf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    AU.noise = buf;

    // Arka plan karanlık cehennem uğultusu (sub drone)
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
    const dg = c.createGain(); dg.gain.value = .06; lp.connect(dg); dg.connect(AU.master);
    for (const f of [40, 40.8, 60.5]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); }
  } catch (e) { AU.ctx = null; }
}
function gate(key, ms) { const n = performance.now(); if (AU.last[key] && n - AU.last[key] < ms) return false; AU.last[key] = n; return true; }

// Gürültü patlaması (noise burst)
function nz(dur, f0, f1, q, gain, type = 'bandpass') {
  const c = AU.ctx; if (!c) return; const t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = AU.noise; s.loop = true;
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(Math.max(20, f0), t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AU.master); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}

// Saf osilatör tonu (pitch glide)
function tn(type, f0, f1, dur, gain) {
  const c = AU.ctx; if (!c) return; const t = c.currentTime;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(Math.max(20, f0), t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + .05);
}

// Tok sub-bass vuruşu (silah patlamaları ve ağır darbeler için göğüs titreten punch)
function punch(f0, dur, gain, type = 'sine') {
  const c = AU.ctx; if (!c) return; const t = c.currentTime;
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(20, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(AU.master);
  o.start(t); o.stop(t + dur + 0.02);
}

// Çift harmonikli kristal metal çınlaması (parry, kılıç çarpması ve mermi sekmesi)
function clink(f0, f1, dur, gain) {
  const c = AU.ctx; if (!c) return; const t = c.currentTime;
  for (const f of [f0, f1, f0 * 1.52]) {
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.96, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain * (f === f0 ? 1 : 0.6), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AU.master);
    o.start(t); o.stop(t + dur + 0.03);
  }
}

// Ayak sesi: topuk tokluğu + taş zeminde kum hışırtısı. vol 0..1, pan -1 (sol) .. 1 (sağ), pitch: iri yaratıklarda pes
function stepSound(vol, pan = 0, pitch = 1) {
  const c = AU.ctx; if (!c || vol < .015) return; const t = c.currentTime;
  const out = c.createGain(); out.gain.value = vol;
  if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); out.connect(p); p.connect(AU.master); } else out.connect(AU.master);
  const o = c.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(110 * pitch, t); o.frequency.exponentialRampToValueAtTime(40 * pitch, t + .08);
  const g = c.createGain(); g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.0001, t + .1);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + .12);
  const s = c.createBufferSource(); s.buffer = AU.noise;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = (700 + Math.random() * 900) * pitch; f.Q.value = 1.3;
  const g2 = c.createGain(); g2.gain.setValueAtTime(.0001, t); g2.gain.exponentialRampToValueAtTime(.32, t + .004); g2.gain.exponentialRampToValueAtTime(.0001, t + .05 + Math.random() * .04);
  s.connect(f); f.connect(g2); g2.connect(out); s.start(t, Math.random() * .5); s.stop(t + .14);
}
// dünyadaki bir noktadan gelen ayak sesi: uzaklıkla kısılır, sağ / sol kulağa göre ayrılır
let stepBudget = 0, stepBudgetT = 0;
function stepAt(pos, loud, pitch = 1, range = 26) {
  if (!AU.ctx || loud <= 0) return;
  const now = performance.now(); if (now - stepBudgetT > 120) { stepBudgetT = now; stepBudget = 0; }
  if (stepBudget >= 5) return;   // aynı anda çok fazla adım sesi çalmasın
  const dx = pos.x - eyePos.x, dz = pos.z - eyePos.z, d = Math.hypot(dx, dz);
  if (d > range) return;
  const f = 1 - d / range, vol = loud * f * f;
  if (vol < .015) return;
  stepBudget++;
  const pan = d > .5 ? (dx * rightV.x + dz * rightV.z) / d * .85 : 0;
  stepSound(vol, pan, pitch);
}

const sfx = {
  // Katana savurma: havayı yaran tok rüzgar + çelik vınlaması
  swing: h => {
    nz(h ? .36 : .22, h ? 220 : 650, h ? 3200 : 4400, 1.2, h ? .55 : .38);
    tn('sine', h ? 180 : 340, h ? 60 : 120, h ? .25 : .14, h ? .35 : .22);
    nz(h ? .2 : .12, 1400, 3800, 3, .18);
  },
  // Islak et doğrama ve kemik çıtırtısı
  flesh: () => {
    if (!gate('flesh', 40)) return;
    punch(160, .14, .65);
    nz(.24, 1200, 160, .9, .8, 'lowpass');
    nz(.1, 3800, 1200, 3, .35);
    tn('sawtooth', 210, 45, .15, .4);
  },
  // Düşman katletme: tok patlama + derin sub drop
  kill: () => {
    if (!gate('kill', 50)) return;
    punch(140, .45, .9);
    nz(.55, 1400, 90, .7, .95, 'lowpass');
    tn('sawtooth', 110, 25, .45, .4);
    nz(.16, 4200, 1800, 2.5, .3);
  },
  wood: () => { if (!gate('wood', 50)) return; punch(220, .12, .6); nz(.16, 2600, 600, 1.6, .35); },
  dash: () => { punch(110, .2, .45); nz(.28, 420, 4800, 1.0, .5); tn('sine', 120, 35, .22, .35); },
  hurt: () => { if (!gate('hurt', 100)) return; punch(130, .25, .5); tn('sawtooth', 180, 50, .24, .3); nz(.24, 800, 180, 1.2, .5, 'lowpass'); },
  growl: p => { if (!gate('growl', 250)) return; tn('sawtooth', 85 * p, 38 * p, .7, .18); nz(.55, 320 * p, 120, 2.8, .15); },
  fire: () => { if (!gate('fire', 40)) return; nz(.42, 300, 1500, .9, .3); punch(140, .2, .35); },
  // Kusursuz Savunma (Parry): kristal berraklığında çelik rezonansı + yankı
  parry: () => {
    clink(1850, 2620, .7, .45);
    punch(190, .15, .5);
    nz(.12, 5800, 2800, 3.5, .35);
    tn('sine', 3400, 3100, .4, .2);
  },
  boom: () => { if (!gate('boom', 60)) return; punch(110, .6, .85); nz(.65, 1000, 45, .6, .75, 'lowpass'); },
  pickup: () => { if (!gate('pick', 50)) return; tn('triangle', 640, 1320, .14, .18); clink(1200, 1800, .12, .1); },
  ammo: () => { if (!gate('ammo', 50)) return; clink(1600, 2200, .08, .15); tn('triangle', 950, 1500, .07, .12); },
  kick: () => { punch(150, .22, .85); nz(.14, 1100, 250, 1.2, .45, 'lowpass'); },
  wave: () => { punch(90, 1.8, .4); tn('sawtooth', 55, 50, 1.8, .25); tn('sawtooth', 82.5, 78, 1.8, .18); },
  // Çift Uzi: keskin, seri, mekanik sürgü sesi
  uzi: () => {
    if (!gate('uzi', 25)) return;
    punch(160, .06, .45);
    nz(.07, 3600, 1100, .8, .55);
    tn('square', 240, 60, .06, .25);
    clink(2400, 3600, .04, .1);
  },
  ric: () => { if (!gate('ric', 80)) return; clink(3200, 4800, .1, .25); nz(.06, 7000, 3200, 4, .15); },
  reload: () => {
    clink(1400, 1900, .05, .15);
    setTimeout(() => { punch(180, .06, .3); clink(1100, 1600, .06, .18); }, 320);
    setTimeout(() => { punch(220, .08, .35); clink(1700, 2400, .07, .2); }, 750);
  },
  empty: () => { if (!gate('empty', 120)) return; clink(2800, 3600, .04, .16); },
  clang: () => { if (!gate('clang', 60)) return; clink(1100, 1750, .4, .35); punch(160, .15, .4); nz(.12, 4500, 1800, 3, .25); },
  slam: () => { if (!gate('slam', 100)) return; punch(85, .9, 1.0); nz(1.1, 600, 35, .5, .95, 'lowpass'); },
  roar: () => { if (!gate('roar', 350)) return; punch(75, 1.5, .6); tn('sawtooth', 60, 32, 1.8, .35); nz(1.5, 460, 100, 2.2, .3); },
  swap: () => { clink(1200, 1800, .09, .18); nz(.08, 1800, 600, 1.5, .15); },
  slide: () => { nz(.75, 1400, 220, .7, .42, 'lowpass'); punch(90, .25, .3); },
  jump2: () => { tn('sine', 340, 820, .15, .2); nz(.15, 2800, 1100, 1, .18); },
  // Pompalı: göğsü inleten sub-bass + saçma şakırtısı
  shotgun: () => {
    if (!gate('sg', 60)) return;
    punch(100, .38, 1.1);
    nz(.36, 2600, 100, .5, 1.1, 'lowpass');
    nz(.14, 5600, 2200, 1.2, .45);
    tn('square', 140, 30, .28, .45);
  },
  // Pompa kurma mekanizması (çift klik)
  pump: () => {
    clink(1400, 2100, .05, .2);
    setTimeout(() => { punch(210, .06, .35); clink(1600, 2500, .06, .25); }, 120);
  },
  shell: () => { clink(3200, 4600, .06, .14); },
  pistol: () => {
    if (!gate('pis', 45)) return;
    punch(180, .12, .55);
    nz(.12, 3400, 750, .8, .6);
    tn('square', 220, 55, .1, .3);
  },
  // M4: tok piyade tüfeği patlaması
  m4: () => {
    if (!gate('m4', 35)) return;
    punch(145, .15, .65);
    nz(.12, 2900, 650, .8, .65);
    tn('square', 160, 42, .1, .32);
    clink(2600, 3800, .04, .12);
  },
  // AWP: devasa sniper patlaması + sub rumble + mekanik sürgü
  awp: () => {
    punch(85, .85, 1.25);
    nz(.8, 3400, 60, .5, 1.2, 'lowpass');
    nz(.28, 6800, 2000, 1.1, .5);
    tn('square', 110, 25, .6, .5);
  },
  bolt: () => {
    clink(1600, 2400, .06, .2);
    setTimeout(() => { punch(240, .06, .3); clink(1800, 2800, .06, .22); }, 150);
  },
  launcher: () => { nz(.28, 700, 180, .8, .75, 'lowpass'); punch(150, .25, .65); },
  bigboom: () => {
    if (!gate('bigboom', 80)) return;
    punch(65, 1.6, 1.3);
    nz(1.5, 1400, 30, .5, 1.2, 'lowpass');
    nz(.45, 5500, 600, .8, .5);
  },
  land: h => { stepSound(Math.min(.7, .25 + h * .04), 0, .7); nz(.12, 600, 200, 1, Math.min(.3, .08 + h * .015)); },
  upgrade: () => { tn('sine', 480, 960, .3, .25); setTimeout(() => tn('sine', 720, 1440, .4, .2), 110); },
  // Düşük can kalp atışı
  heartbeat: () => {
    if (!gate('hb', 650)) return;
    punch(75, .18, .75);
    setTimeout(() => punch(65, .22, .6), 180);
  }
};
