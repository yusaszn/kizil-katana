'use strict';
/* Mini harita (sol üst): kuzey yukarıda. Duvarlar ve siperler haritaya göre bir kez çizilir, her karede üstüne oyuncular eklenir.
   VS / bomba: takım arkadaşları her zaman, rakipler sadece senin görüş hattındaysa (duvar ya da sis arkası görünmez).
   Co-op: bütün canavarlar ve bosslar. */

const mm = { cv: $('minimap'), base: document.createElement('canvas'), map: null, H: 0, t: 0, S: 180 };
const mmCtx = mm.cv.getContext('2d');
function mmBuildBase() {
  const S = mm.S, b = mm.base; b.width = b.height = S;
  const g = b.getContext('2d'), k = S / (2 * H), P = v => (v + H) * k;
  const M = MAPS[curMap] || {};
  g.fillStyle = curMap === 'col' ? '#b89a6a' : curMap === 'avlu' ? '#3a4458' : '#4a2a20'; g.fillRect(0, 0, S, S);
  const walls = statics.slice(baseStatics).filter(s => s.y0 < 2.4)   // tavanlar ve kapı kirişleri çizilmez (tünel yolu görünsün)
    .sort((a, b) => a.y1 - b.y1);
  for (const s of walls) {
    const tall = s.y1 > 2.4, low = s.y1 <= 1.65;
    g.fillStyle = tall ? 'rgba(20,14,10,.9)' : low ? 'rgba(90,64,40,.55)' : 'rgba(60,44,30,.75)';
    if (s.y0 > .2 && !tall) continue;   // platform üstündeki kasalar zaten platformla çiziliyor
    g.fillRect(P(s.x0), P(s.z0), Math.max(1, (s.x1 - s.x0) * k), Math.max(1, (s.z1 - s.z0) * k));
  }
  if (M.sites) for (const key in M.sites) {
    const s = M.sites[key];
    g.fillStyle = 'rgba(255,190,60,.18)'; g.fillRect(P(s.x0), P(s.z0), (s.x1 - s.x0) * k, (s.z1 - s.z0) * k);
    g.fillStyle = 'rgba(255,200,80,.95)'; g.font = 'bold 16px Chakra Petch, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(key, P((s.x0 + s.x1) / 2), P((s.z0 + s.z1) / 2));
  }
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
  mm.map = curMap; mm.H = H;
}
const mmV = new V3();
function mmSees(p) {
  mmV.set(p.x - eyePos.x, p.y + .9 - eyePos.y, p.z - eyePos.z);
  const d = mmV.length(); if (d < 1e-3) return true; mmV.divideScalar(d);
  if (rayStatic(eyePos, mmV, d) < d - .4) return false;
  return !(typeof smokeBlocks === 'function' && smokeBlocks(eyePos, p));
}
function updateMinimap(rdt) {
  const show = state !== 'menu' && SETTINGS.minimap !== false;
  mm.cv.hidden = !show; if (!show) return;
  mm.t -= rdt; if (mm.t > 0) return; mm.t = 1 / 20;
  if (mm.map !== curMap || mm.H !== H) mmBuildBase();
  const S = mm.S, k = S / (2 * H), P = v => (v + H) * k, g = mmCtx;
  g.clearRect(0, 0, S, S); g.drawImage(mm.base, 0, 0);
  const dot = (x, z, r, fill, ring) => { g.beginPath(); g.arc(P(x), P(z), r, 0, 7); g.fillStyle = fill; g.fill(); if (ring) { g.lineWidth = 1.5; g.strokeStyle = ring; g.stroke(); } };
  const blink = Math.sin(performance.now() / 120) > 0;
  const vsMode = isVS(), mt = vsMode ? myTeam() : null;
  // bomba
  if (typeof isBomb === 'function' && isBomb()) {
    const atk = mt === attackTeam();
    if (bomb.st === 'planted') dot(bomb.x, bomb.z, 5, blink ? '#ff3020' : '#701008', '#000');
    else if (bomb.st === 'dropped' && atk) dot(bomb.x, bomb.z, 4, '#ffb030', '#000');
  }
  // diğer oyuncular
  for (const id in net.players) {
    if (id === net.myId) continue;
    const p = net.players[id], pr = p.proxy; if (!pr || !pr.g.visible) continue;
    const pos = pr.pos;
    if (vsMode) {
      const mate = p.team === mt;
      if (!p.alive) { if (mate) { g.fillStyle = '#000'; g.font = 'bold 11px sans-serif'; g.fillText('✕', P(pos.x), P(pos.z)); } continue; }
      if (!mate && !mmSees(pos)) continue;
      const carrier = typeof bomb !== 'undefined' && bomb.st === 'carried' && bomb.carrier === id && mate;
      dot(pos.x, pos.z, 3.6, p.team === 'red' ? '#ff4a3a' : '#4a8aff', carrier ? '#ffb030' : mate ? '#fff' : '#000');
    } else dot(pos.x, pos.z, 3.4, '#' + p.color.toString(16).padStart(6, '0'), p.alive ? '#fff' : '#000');
  }
  // co-op: canavarlar
  if (!vsMode) for (const e of enemies) {
    const b = e.body.position, boss = isBossKind(e.kind);
    dot(b.x, b.z, boss ? 5 : 2.2, boss ? (blink ? '#ff2010' : '#ffd040') : e.elite ? '#ff5020' : '#c02818', boss ? '#000' : null);
  }
  // ben: bakış yönünde ok
  const pb = player.body.position, x = P(pb.x), z = P(pb.z), a = -player.yaw;
  g.save(); g.translate(x, z); g.rotate(a);
  g.beginPath(); g.moveTo(0, -6.5); g.lineTo(4.5, 5); g.lineTo(0, 2.5); g.lineTo(-4.5, 5); g.closePath();
  g.fillStyle = player.alive ? '#fff7e0' : '#777'; g.fill(); g.lineWidth = 1.2; g.strokeStyle = '#000'; g.stroke();
  g.restore();
}
