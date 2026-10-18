'use strict';
/* Sesli sohbet: oyuncular birbirine doğrudan WebRTC ses araması yapar (PeerJS, her çift için bir arama).
   Bas-konuş (K basılı) ya da açık mikrofon. VS ve bomba modunda sadece takım arkadaşları duyulur, co-op'ta herkes.
   Mikrofon izni ilk kez konuşmak istediğinde istenir; izin yokken de karşıyı duyarsın (sessiz bir akış gönderilir). */

const voice = { ctx: null, silent: null, mic: null, asked: false, peerRef: null, calls: {}, remote: {}, levelT: 0, myLevel: 0, an: null, hudT: 0 };
const voiceMode = () => SETTINGS.voice || 'ptt';   // 'ptt' | 'open' | 'off'

function voiceCtx() {
  if (!voice.ctx) { try { voice.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (voice.ctx.state === 'suspended') voice.ctx.resume().catch(() => {});
  return voice.ctx;
}
// gönderilecek akış: mikrofon varsa o, yoksa sessiz bir akış (arama yine de kurulsun, karşıyı duyabilesin)
function voiceStream() {
  if (voice.mic) return new MediaStream([voice.mic]);
  if (!voice.silent) { const c = voiceCtx(); if (!c) return null; voice.silent = c.createMediaStreamDestination().stream; }
  return voice.silent;
}
function voiceAskMic() {
  if (voice.asked || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  voice.asked = true;
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(st => {
    voice.mic = st.getAudioTracks()[0];
    // açık aramalardaki sessiz parçayı mikrofonla değiştir
    for (const pid in voice.calls) {
      const pc = voice.calls[pid].peerConnection; if (!pc) continue;
      for (const s of pc.getSenders()) if (s.track && s.track.kind === 'audio') s.replaceTrack(voice.mic).catch(() => {});
    }
    const c = voiceCtx(); if (c) { voice.an = c.createAnalyser(); voice.an.fftSize = 256; c.createMediaStreamSource(st).connect(voice.an); }
    toast('MİKROFON AÇIK · ' + (voiceMode() === 'ptt' ? 'K BASILI TUT VE KONUŞ' : 'AÇIK MİKROFON'));
  }).catch(() => { toast('MİKROFON İZNİ VERİLMEDİ · SADECE DİNLEYEBİLİRSİN'); });
}
// gelen aramaları yanıtla: dinleyici bağlantı kurulur kurulmaz takılır (ilk arama kaçmasın)
function voiceHook(peer) {
  if (voice.peerRef !== peer) { voiceStopAll(); voice.peerRef = peer; }   // yeni oda: eski aramalar kapanır
  peer.on('call', call => {
    if (voiceMode() === 'off') { try { call.close(); } catch (e) { /* zaten kapalı */ } return; }
    const st = voiceStream(); if (!st) return;
    if (voice.calls[call.peer]) voiceDrop(call.peer);
    call.answer(st); voiceSetup(call);
  });
}
// host kendi oyuncu listesinde kimliği bağlantıdan (conn.peer) okur, misafirler oyuncu listesinden (pid)
const pidOf = p => p.pid || (p.conn && p.conn.peer) || (p.id === 'h' && net.peer ? net.peer.id : null);
function voicePidToPlayer(pid) { for (const id in net.players) if (pidOf(net.players[id]) === pid) return id; return null; }
function voiceSetup(call) {
  call.t0 = performance.now();
  voice.calls[call.peer] = call;
  call.on('stream', st => voiceAttach(call.peer, st));
  const end = () => voiceDrop(call.peer);
  call.on('close', end); call.on('error', end);
}
function voiceAttach(pid, st) {
  voiceDropAudio(pid);
  const a = new Audio(); a.srcObject = st; a.autoplay = true; a.play().catch(() => {});
  const r = { a, an: null, data: null, level: 0 };
  const c = voiceCtx();
  if (c) { try { r.an = c.createAnalyser(); r.an.fftSize = 256; r.data = new Uint8Array(r.an.fftSize); c.createMediaStreamSource(st).connect(r.an); } catch (e) { r.an = null; } }
  voice.remote[pid] = r;
}
function voiceDropAudio(pid) { const r = voice.remote[pid]; if (r) { r.a.pause(); r.a.srcObject = null; delete voice.remote[pid]; } }
function voiceDrop(pid) { const c = voice.calls[pid]; delete voice.calls[pid]; voiceDropAudio(pid); if (c) try { c.close(); } catch (e) { /* zaten kapalı */ } }
function voiceStopAll() { for (const pid in voice.calls) voiceDrop(pid); for (const pid in voice.remote) voiceDropAudio(pid); }
function voiceRms(an, data) { an.getByteTimeDomainData(data); let s = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; s += v * v; } return Math.sqrt(s / data.length); }

function updateVoice(rdt) {
  const inRoom = net.mode !== 'solo' && net.peer && net.peer.open;
  if (!inRoom || voiceMode() === 'off') { if (Object.keys(voice.calls).length) voiceStopAll(); if (voice.mic) voice.mic.enabled = false; $('voiceHud').innerHTML = ''; return; }
  // her oyuncu çifti için tek arama: kimliği küçük olan arar
  for (const id in net.players) {
    const p = net.players[id];
    const pid = pidOf(p);
    if (id === net.myId || !pid || voice.calls[pid] || !(net.myId < id)) continue;
    const st = voiceStream(); if (!st) break;
    try { voiceSetup(net.peer.call(pid, st)); } catch (e) { /* karşı taraf henüz hazır değil, sonra tekrar denenir */ }
  }
  // artık odada olmayanların ve 8 sn'de bağlanamayan aramaları kapat (aranan taraf sonra tekrar aranır)
  for (const pid in voice.calls) if (!voicePidToPlayer(pid) || (!voice.remote[pid] && performance.now() - voice.calls[pid].t0 > 8000)) voiceDrop(pid);
  // bas-konuş
  const talkKey = keys.KeyK && (state === 'play' || state === 'dead');
  if (talkKey && !voice.mic) voiceAskMic();
  const talking = voice.mic && (voiceMode() === 'open' || talkKey);
  if (voice.mic) voice.mic.enabled = !!talking;
  // takım filtresi ve ses seviyesi
  const vsMode = isVS(), mt = vsMode ? myTeam() : null;
  for (const pid in voice.remote) {
    const r = voice.remote[pid], id = voicePidToPlayer(pid);
    const hear = !vsMode || !id || teamOf(id) === mt;
    r.a.muted = !hear; r.a.volume = clamp(SETTINGS.voiceVol ?? .9, 0, 1);
  }
  // kim konuşuyor göstergesi
  voice.hudT -= rdt; if (voice.hudT > 0) return; voice.hudT = .1;
  const rows = [];
  if (talking) { voice.myLevel = voice.an ? voiceRms(voice.an, new Uint8Array(voice.an.fftSize)) : .1; rows.push(`<div class="vrow me"><i style="transform:scaleX(${Math.min(1, .25 + voice.myLevel * 8)})"></i>🎙 ${escapeHtml(playerName())}</div>`); }
  for (const pid in voice.remote) {
    const r = voice.remote[pid], id = voicePidToPlayer(pid); if (!id || r.a.muted || !r.an) continue;
    r.level = voiceRms(r.an, r.data);
    if (r.level > .02) rows.push(`<div class="vrow"><i style="transform:scaleX(${Math.min(1, .25 + r.level * 8)})"></i>🔊 ${escapeHtml(net.players[id].name)}</div>`);
  }
  const html = rows.join('');
  if (hud.voice !== html) { hud.voice = html; $('voiceHud').innerHTML = html; }
}
