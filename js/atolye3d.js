'use strict';
/* ATÖLYE canlı 3D görünüm: seçili silah büyük ve gerçek modeliyle, seçtiğin kaplama ve nişangahla döner.
   Sürükle: her yönden çevir (sağ, sol, üst) · tekerlek / iki parmak: yakınlaştır. Bir süre dokunmazsan kendi döner. */
const ws = { open: false, scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 1, .005, 30), root: new THREE.Group(), model: null, sig: '',
  yaw: 1.25, pitch: .16, zoom: 1, dist: 1.2, drag: null, idleT: 9, pinch: 0 };
ws.scene.background = new THREE.Color(0x0d0a09);
ws.scene.add(ws.root);
{ // stüdyo ışığı: üstten anahtar ışık, arkadan soğuk kenar ışığı, yumuşak dolgu
  ws.scene.add(new THREE.HemisphereLight(0xfff4ea, 0x26201c, .85));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(1.2, 2, 1.6); ws.scene.add(key);
  const rim = new THREE.DirectionalLight(0x8ab4ff, 1.1); rim.position.set(-1.6, .8, -1.8); ws.scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffd2b0, .45); fill.position.set(-1, -.4, 1.2); ws.scene.add(fill);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x6a2018, transparent: true, opacity: .55, depthWrite: false }));
  spot.rotation.x = -Math.PI / 2; spot.position.y = -.22; spot.scale.setScalar(1.3); ws.scene.add(spot); ws.spot = spot;
}
function wsMake(w) {
  if (w === 'katana') return { g: katanaIconModel() };
  if (w === 'knife') return { g: GM.knife().g };
  if (w === 'karambit') return { g: GM.karambit().b };
  if (w === 'butterfly') return { g: GM.butterfly().held };
  const mk = { ak47: GM.ak, fenek: GM.fenek, m4: GM.m4, awp: GM.awp, deagle: GM.deagle, usps: GM.usps, glock: GM.glock, pistol: GM.beretta, shotgun: GM.r870 }[w];
  if (mk) { const m = mk({ hands: false }); if (m.gl) m.gl.visible = false; return m; }
  if (w === 'uzi') { const g = new THREE.Group(), a = GM.uzi(1, { hands: false }).g; g.add(a); return { g }; }
  return null;
}
// seçili silahı kaplaması ve nişangahıyla kur (değişiklik yoksa dokunma)
function wsBuild(w) {
  const sig = w + '|' + (skinSel[w] || 'std') + '|' + (sightSel[w] || 'iron');
  if (ws.sig === sig && ws.model) return; ws.sig = sig;
  if (ws.model) { ws.root.remove(ws.model.g); ws.model.g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); ws.model = null; }
  const m = wsMake(w); if (!m) return;
  m.g.traverse(o => { if (o.isSprite) o.visible = false; });
  skinTo(m.g, w, skinSel[w] || 'std');
  const S = SIGHTS.find(s => s.id === (sightSel[w] || 'iron')), C = SIGHT_GUNS[w];
  if (C && S && S.id !== 'iron' && sightOpen(S)) {
    const o = S.id === 'holo' ? opticHolo() : opticRedDot(); o.g.position.set(0, C.mountY, C.mountZ); m.g.add(o.g);
    if (m.rear) m.rear.visible = false;
  }
  ws.root.add(m.g); ws.model = m;
  linearizeViewmodel(ws.scene);
  // ortala ve sığdır (yalnız görünen parçalar)
  m.g.position.set(0, 0, 0); ws.root.updateMatrixWorld(true);
  const box = new THREE.Box3(), tb = new THREE.Box3();
  const shown = o => { for (let q = o; q && q !== ws.root; q = q.parent) if (!q.visible) return false; return true; };
  m.g.traverse(o => { if (!o.isMesh || !shown(o)) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tb); });
  const c = box.getCenter(new V3()), size = box.getSize(new V3());
  m.g.position.sub(c);
  ws.dist = Math.max(size.x, size.y, size.z) * .5 / Math.tan(ws.cam.fov * Math.PI / 360) * 1.25;
  ws.spot.position.y = -size.y / 2 - .02; ws.spot.scale.setScalar(Math.max(size.z, .3) * .9);
  $('wsName').textContent = (SKIN_WEAPONS.find(([id]) => id === w) || [, w])[1];
}
function wsShow(on) {
  ws.open = on; $('wsHint').hidden = !on;
  if (on) { ws.sig = ''; ws.yaw = 1.25; ws.pitch = .16; ws.zoom = 1; wsBuild(skinUI.w); ws.idleT = 0; }
  else if (ws.model) { ws.root.remove(ws.model.g); ws.model = null; ws.sig = ''; }
}
// ana döngünün çizimi (atölye açıkken)
function wsRender(dt) {
  ws.idleT += dt;
  if (!ws.drag && ws.idleT > 2.5) ws.yaw += dt * .35;
  const W = innerWidth, Hh = innerHeight, narrow = W < 820, cam = ws.cam;
  if (cam.aspect !== W / Hh) { cam.aspect = W / Hh; }
  cam.setViewOffset(W, Hh, narrow ? 0 : -W * .22, narrow ? Hh * .2 : 0, W, Hh);
  const d = ws.dist / ws.zoom;
  cam.position.set(Math.sin(ws.yaw) * Math.cos(ws.pitch) * d, Math.sin(ws.pitch) * d, Math.cos(ws.yaw) * Math.cos(ws.pitch) * d);
  cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  renderer.setRenderTarget(null); renderer.clear(); renderer.render(ws.scene, cam);
}
// sürükle / yakınlaştır (panelin dışında)
const wsOnPanel = e => !!(e.target.closest && e.target.closest('#skins .panel'));
$('skins').addEventListener('pointerdown', e => { if (!ws.open || wsOnPanel(e)) return; ws.drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; ws.idleT = 0; });
window.addEventListener('pointermove', e => {
  if (!ws.drag || e.pointerId !== ws.drag.id) return;
  ws.yaw -= (e.clientX - ws.drag.x) * .009; ws.pitch = clamp(ws.pitch + (e.clientY - ws.drag.y) * .006, -.9, 1.2);
  ws.drag.x = e.clientX; ws.drag.y = e.clientY; ws.idleT = 0;
});
window.addEventListener('pointerup', e => { if (ws.drag && e.pointerId === ws.drag.id) ws.drag = null; });
$('skins').addEventListener('wheel', e => { if (!ws.open || wsOnPanel(e)) return; ws.zoom = clamp(ws.zoom * (e.deltaY > 0 ? .9 : 1.1), .7, 3.2); ws.idleT = 0; e.preventDefault(); }, { passive: false });
$('skins').addEventListener('touchmove', e => {
  if (!ws.open || e.touches.length !== 2) return;
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  if (ws.pinch) ws.zoom = clamp(ws.zoom * d / ws.pinch, .7, 3.2);
  ws.pinch = d; ws.idleT = 0;
}, { passive: true });
$('skins').addEventListener('touchend', () => { ws.pinch = 0; });
