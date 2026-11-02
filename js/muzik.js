'use strict';
/* Dinamik müzik: tamamen kodla üretilir (dosya yok). Savaşın yoğunluğuna göre katmanlar açılıp kapanır:
   - sakin: koto benzeri telli çalgı (Japon "In" dizisi), yumuşak pad akorları
   - çatışma: taiko davulları, sonra küçük davul (shime); yoğunlaştıkça ritim sıklaşır
   - boss: kalın, bozuk bas ostinatosu ve ağır vuruşlar
   Menüde sakin tema çalar, lobide susar (ateş ve doğa sesleri). Ayarlar → Müzik ile ses düzeyi. */

const MUS = { ctx: null, out: null, L: {}, verb: null, step: 0, nextT: 0, bpm: 92, int: 0, boss: 0, timer: null, phrase: [], phraseBar: -99, lastState: '' };
const midiF = m => 440 * Math.pow(2, (m - 69) / 12);
const IN_SCALE = [52, 53, 57, 59, 60, 64, 65, 69, 71, 72, 76];   // E F A B C (Miyako-bushi)
const CHORDS = [[40, 47, 52, 55], [41, 48, 53, 57, 64], [45, 52, 57, 60], [40, 47, 52, 57]];   // Em · Fmaj7 · Am · Esus4

function musInit() {
  if (MUS.ctx || !AU.ctx) return !!MUS.ctx;
  const c = AU.ctx; MUS.ctx = c;
  MUS.out = c.createGain(); MUS.out.gain.value = 0; MUS.out.connect(AU.master);
  // yankı: üretilmiş, sönümlenen gürültü darbesi
  const len = c.sampleRate * 2.6, ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  MUS.verb = c.createConvolver(); MUS.verb.buffer = ir;
  const vg = c.createGain(); vg.gain.value = .55; MUS.verb.connect(vg); vg.connect(MUS.out);
  for (const [k, send] of [['pad', .5], ['koto', .45], ['perc', .18], ['boss', .12]]) {
    const g = c.createGain(); g.gain.value = 0; g.connect(MUS.out);
    const s = c.createGain(); s.gain.value = send; g.connect(s); s.connect(MUS.verb);
    MUS.L[k] = g;
  }
  MUS.padF = c.createBiquadFilter(); MUS.padF.type = 'lowpass'; MUS.padF.frequency.value = 700; MUS.padF.Q.value = .7; MUS.padF.connect(MUS.L.pad);
  const ws = c.createWaveShaper(), curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3.5); }
  ws.curve = curve; MUS.bossIn = c.createBiquadFilter(); MUS.bossIn.type = 'lowpass'; MUS.bossIn.frequency.value = 420;
  ws.connect(MUS.bossIn); MUS.bossIn.connect(MUS.L.boss); MUS.dist = ws;
  MUS.nextT = c.currentTime + .1;
  MUS.timer = setInterval(musSchedule, 30);
  return true;
}
const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0008, t + a + dec); };

/* ================= ÇALGILAR ================= */
function mTaiko(t, vel, pitch = 1) {
  const c = MUS.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(100 * pitch, t); o.frequency.exponentialRampToValueAtTime(44 * pitch, t + .32);
  env(g, t, .004, vel, .75); o.connect(g); g.connect(MUS.L.perc); o.start(t); o.stop(t + .85);
  const n = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain();
  n.buffer = AU.noise; f.type = 'lowpass'; f.frequency.value = 1100; env(ng, t, .002, vel * .45, .1);
  n.connect(f); f.connect(ng); ng.connect(MUS.L.perc); n.start(t, Math.random() * .5); n.stop(t + .16);
}
function mShime(t, vel) {
  const c = MUS.ctx, n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  n.buffer = AU.noise; f.type = 'bandpass'; f.frequency.value = 2300 + Math.random() * 300; f.Q.value = 3;
  env(g, t, .002, vel, .06); n.connect(f); f.connect(g); g.connect(MUS.L.perc); n.start(t, Math.random() * .5); n.stop(t + .1);
  const o = c.createOscillator(), og = c.createGain(); o.type = 'triangle'; o.frequency.value = 410;
  env(og, t, .002, vel * .35, .07); o.connect(og); og.connect(MUS.L.perc); o.start(t); o.stop(t + .1);
}
function mKoto(t, m, vel, dur = 1.6) {
  const c = MUS.ctx, fq = midiF(m), o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(fq * 1.012, t); o.frequency.exponentialRampToValueAtTime(fq, t + .07);   // telin ilk anki gerginliği
  o2.type = 'triangle'; o2.frequency.value = fq * 2.003;
  f.type = 'lowpass'; f.Q.value = 3; f.frequency.setValueAtTime(fq * 7, t); f.frequency.exponentialRampToValueAtTime(fq * 1.3, t + .45);
  const g2 = c.createGain(); g2.gain.value = .3;
  env(g, t, .003, vel, dur);
  o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(MUS.L.koto);
  o.start(t); o2.start(t); o.stop(t + dur + .1); o2.stop(t + dur + .1);
}
function mPad(t, notes, dur) {
  const c = MUS.ctx;
  for (const m of notes) for (const det of [-7, 7]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = midiF(m); o.detune.value = det;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + 1.4); g.gain.setValueAtTime(.035, t + dur - .2); g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
    o.connect(g); g.connect(MUS.padF); o.start(t); o.stop(t + dur + 1.5);
  }
}
function mBass(t, m, dur, vel) {
  const c = MUS.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = 'sawtooth'; o.frequency.value = midiF(m);
  env(g, t, .01, vel, dur); o.connect(g); g.connect(MUS.dist); o.start(t); o.stop(t + dur + .1);
}
function mGong(t, vel) {
  const c = MUS.ctx;
  for (const [fq, a] of [[55, 1], [110.6, .5], [167, .3], [231, .18]]) {
    const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = fq;
    env(g, t, .01, vel * a, 3.5); o.connect(g); g.connect(MUS.L.perc); o.start(t); o.stop(t + 3.6);
  }
}

/* ================= DİZİCİ ================= */
// her 8 ölçüde yeni koto cümlesi; cümle 2 ölçü, art arda tekrarlanır (kulakta kalsın)
function musPhrase(bar) {
  const seedBar = Math.floor(bar / 8);
  if (MUS.phraseBar === seedBar) return MUS.phrase;
  let sd = seedBar * 9301 + 49297; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const out = []; let idx = 4 + (r() * 3 | 0);
  for (let s = 0; s < 32; s += 2) {
    if (r() < (s % 8 === 0 ? .75 : .38)) {
      idx = clamp(idx + Math.round((r() - .5) * 4), 0, IN_SCALE.length - 1);
      out.push([s, IN_SCALE[idx], .09 + r() * .06, s % 8 === 6 && r() < .4]);   // son öğe: yanına çift vuruş (süs)
    }
  }
  MUS.phrase = out; MUS.phraseBar = seedBar;
  return out;
}
function musStep(step, t) {
  const sd = 60 / MUS.bpm / 4, s16 = step % 16, bar = Math.floor(step / 16), I = MUS.int, B = MUS.boss;
  // pad: iki ölçüde bir akor
  if (s16 === 0 && bar % 2 === 0) mPad(t, CHORDS[(bar / 2) % CHORDS.length], sd * 32);
  // koto: sakinken bol, çatışmada seyrek, bossta yok
  const kotoP = B > .5 ? 0 : I < .35 ? 1 : I < .7 ? .5 : .15;
  if (kotoP > 0) for (const [s, m, v, orn] of musPhrase(bar)) if (s === (bar % 2) * 16 + s16 && Math.random() < kotoP + .2) { mKoto(t, m, v); if (orn) mKoto(t + sd * .5, m + (IN_SCALE.includes(m + 1) ? 1 : 2), v * .6, .8); }
  // taiko
  const lv = B > .5 ? 3 : I < .22 ? 0 : I < .5 ? 1 : I < .78 ? 2 : 3;
  const PAT = [[], [0, 8], [0, 6, 8, 11, 14], [0, 3, 6, 8, 10, 11, 13, 14, 15]][lv];
  if (lv === 0 && s16 === 0 && bar % 2 === 0 && MUS.lastState === 'menu') mTaiko(t, .18, .9);   // menüde uzaktan tek tük davul
  if (PAT.includes(s16)) mTaiko(t, (s16 % 8 === 0 ? .55 : .36) * (lv === 3 ? 1.1 : 1), s16 % 8 === 0 ? 1 : 1.25);
  if (lv >= 2 && s16 % 2 === 1 && Math.random() < (lv === 3 ? .9 : .5)) mShime(t, s16 % 4 === 3 ? .16 : .08);
  // boss: E1 tabanlı bozuk bas ve her ölçü başında ağır darbe
  if (B > .5) {
    const bass = [28, 28, 0, 28, 29, 0, 28, 0, 28, 28, 0, 31, 29, 0, 28, 26];
    if (bass[s16]) mBass(t, bass[s16], sd * 1.6, .32);
    if (s16 === 0) { mTaiko(t, .8, .7); if (bar % 4 === 0) mGong(t, .22); }
  }
}
function musSchedule() {
  if (!MUS.ctx) return;
  const sd = 60 / MUS.bpm / 4, now = MUS.ctx.currentTime;
  if (MUS.nextT < now - .5) MUS.nextT = now + .05;   // sekme arka planda kaldıysa yığılma olmasın
  while (MUS.nextT < now + .14) { if (MUS.out.gain.value > .002) musStep(MUS.step, MUS.nextT); MUS.nextT += sd; MUS.step++; }
}
// olaylara kısa müzik cümleleri
function musStinger(kind) {
  if (!MUS.ctx) return;
  const t = MUS.ctx.currentTime + .03;
  if (kind === 'clear') [64, 69, 71, 76].forEach((m, i) => mKoto(t + i * .11, m, .14, 1.8));
  else if (kind === 'boss') { mTaiko(t, 1, .65); mTaiko(t + .18, .8, .7); mGong(t, .45); }
  else if (kind === 'death') { mGong(t, .5); [64, 60, 57, 52].forEach((m, i) => mKoto(t + .3 + i * .22, m, .1, 2)); }
}

/* ================= YOĞUNLUK ================= */
function updateMusic(dt) {
  if (!MUS.ctx) { if (AU.ctx) musInit(); else return; }
  const st = state; MUS.lastState = st;
  let target = 0, boss = 0;
  if (st === 'play' || st === 'dead' || st === 'pause' || st === 'upgrade') {
    if (isVS()) target = vs.phase === 'live' ? .58 : .2;
    else {
      const pb = player.body.position; let near = 0;
      for (const e of enemies) { if (isBossKind(e.kind)) boss = 1; const p = e.body.position; if (Math.hypot(p.x - pb.x, p.z - pb.z) < 12) near++; }
      target = Math.min(1, enemies.length / 14 + near * .08) * (wave.active ? 1 : .35);
      if (isDefense() && def.core < CORE_HP * .3 && wave.active) target = Math.max(target, .85);
    }
    if (!player.alive) target *= .4;
  }
  MUS.int += (target - MUS.int) * Math.min(1, dt * (target > MUS.int ? .9 : .25));
  MUS.boss += (boss - MUS.boss) * Math.min(1, dt * .6);
  const c = MUS.ctx, now = c.currentTime, I = MUS.int, B = MUS.boss;
  const vol = st === 'lobby' ? 0 : (SETTINGS.music ?? .45) * (st === 'menu' ? .8 : 1);
  MUS.out.gain.setTargetAtTime(vol, now, .6);
  MUS.L.pad.gain.setTargetAtTime(.9 - I * .35, now, .5);
  MUS.L.koto.gain.setTargetAtTime(B > .5 ? 0 : 1 - I * .5, now, .5);
  MUS.L.perc.gain.setTargetAtTime(st === 'menu' ? .6 : .55 + I * .45, now, .3);
  MUS.L.boss.gain.setTargetAtTime(B, now, .8);
  MUS.padF.frequency.setTargetAtTime(600 + I * 900 + B * 400, now, .8);
  if (AU.drone) AU.drone.gain.setTargetAtTime(st === 'menu' || st === 'lobby' ? 0 : .06, now, .5);   // cehennem uğultusu yalnız maçta
}
// ses ilk dokunuşta açılır (tarayıcı kuralı): menü müziği ve ateş sesleri de böylece başlar
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { if (!AU.ctx) initAudio(); }, { once: true });
