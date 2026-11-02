'use strict';
/* Silah görselleri (satın alma ekranı ve atölye): oyundaki gerçek 3D modeller bir kez küçük bir resme çizilir
   (yandan, namlu sağa), bellekte saklanır. Kalkan ve bombalar için elle çizilmiş simgeler. */
const ICONS = {};
const ICON_W = 240, ICON_H = 90;
function katanaIconModel() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0xd4dbe3, metalness: .9, roughness: .22, envMap: envTex });
  const dark = new THREE.MeshStandardMaterial({ color: 0x151213, roughness: .6, metalness: .3 });
  const wrap = new THREE.MeshStandardMaterial({ color: 0x8a1410, roughness: .8 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(.006, .032, .72), steel); blade.position.z = -.42; blade.rotation.x = -.04; g.add(blade);
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .008, 20), dark); tsuba.rotation.x = Math.PI / 2; tsuba.position.z = -.05; g.add(tsuba);
  const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(.017, .018, .26, 12), wrap); tsuka.rotation.x = Math.PI / 2; tsuka.position.z = .08; g.add(tsuka);
  for (let i = 0; i < 7; i++) { const d = new THREE.Mesh(new THREE.TorusGeometry(.0175, .003, 4, 10), dark); d.position.z = -.03 + i * .033; g.add(d); }
  return g;
}
const ICON_MAKERS = {
  ak47: () => GM.ak({ hands: false }).g, m4: () => { const m = GM.m4({ hands: false }); m.gl.visible = false; return m.g; }, awp: () => GM.awp({ hands: false }).g,
  deagle: () => GM.deagle({ hands: false }).g, usps: () => GM.usps({ hands: false }).g, glock: () => GM.glock({ hands: false }).g,
  pistol: () => GM.beretta({ hands: false }).g, shotgun: () => GM.r870({ hands: false }).g,
  uzi: () => { const g = new THREE.Group(), a = GM.uzi(1, { hands: false }).g, b = GM.uzi(-1, { hands: false }).g; b.position.set(0, .07, .06); g.add(a, b); return g; },
  knife: () => GM.knife().g, karambit: () => GM.karambit().b, butterfly: () => GM.butterfly().held, katana: katanaIconModel,
};
function renderIcon(id) {
  const mk = ICON_MAKERS[id]; if (!mk) return null;
  const obj = mk(), sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x3a3c44, 1.15));
  const d = new THREE.DirectionalLight(0xffffff, 1.5); d.position.set(1.2, 1.4, .4); sc.add(d);
  obj.traverse(o => { if (o.isSprite) o.visible = false; });
  sc.add(obj); obj.updateMatrixWorld(true);
  // ölçü yalnız görünen parçalardan (gizli alev sprite'ı, bomba atar vb. kutuyu şişirmesin)
  const box = new THREE.Box3(), tb = new THREE.Box3();
  const shown = o => { for (let q = o; q && q !== sc; q = q.parent) if (!q.visible) return false; return true; };
  obj.traverse(o => { if (!o.isMesh || !shown(o)) return; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); tb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); box.union(tb); });
  const size = box.getSize(new V3()), c = box.getCenter(new V3());
  obj.position.sub(c); obj.updateMatrixWorld(true);
  const aspect = ICON_W / ICON_H, hw = Math.max(size.z / 2, size.y / 2 * aspect) * 1.06, hh = hw / aspect;
  const cam = new THREE.OrthographicCamera(-hw, hw, hh, -hh, .01, 10); cam.position.set(3, 0, 0); cam.lookAt(0, 0, 0);
  const W = ICON_W, H = ICON_H, rt = new THREE.WebGLRenderTarget(W, H);
  rt.texture.encoding = THREE.sRGBEncoding;
  const prev = renderer.getRenderTarget(), pc = renderer.getClearColor(new THREE.Color()), pa = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam);
  const px = new Uint8Array(W * H * 4); renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
  renderer.setRenderTarget(prev); renderer.setClearColor(pc, pa);
  rt.dispose(); obj.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}
// elle çizilen simgeler: kalkanlar ve bombalar
function drawIcon(id) {
  const cv = document.createElement('canvas'); cv.width = ICON_W; cv.height = ICON_H;
  const g = cv.getContext('2d'), cx = ICON_W / 2, cy = ICON_H / 2;
  g.lineJoin = 'round';
  const vest = (helmet) => {
    g.fillStyle = '#3e4a32'; g.strokeStyle = '#1c2216'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 34, cy - 30); g.lineTo(cx - 14, cy - 34); g.lineTo(cx - 8, cy - 22); g.lineTo(cx + 8, cy - 22); g.lineTo(cx + 14, cy - 34); g.lineTo(cx + 34, cy - 30); g.lineTo(cx + 30, cy + 36); g.lineTo(cx - 30, cy + 36); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2c3424'; for (const x of [-20, 0, 20]) g.fillRect(cx + x - 7, cy + 4, 14, 18);
    if (helmet) { g.fillStyle = '#4a5636'; g.beginPath(); g.ellipse(cx + 66, cy + 4, 26, 22, 0, Math.PI, 0); g.fill(); g.fillRect(cx + 38, cy + 2, 56, 7); }
  };
  const gren = (body, label, ring) => {
    g.fillStyle = body; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 3;
    if (ring) { g.beginPath(); g.ellipse(cx, cy + 6, 24, 28, 0, 0, 7); g.fill(); g.stroke(); }
    else { g.beginPath(); g.roundRect ? g.roundRect(cx - 18, cy - 22, 36, 56, 6) : g.rect(cx - 18, cy - 22, 36, 56); g.fill(); g.stroke(); }
    g.fillStyle = '#2a2c30'; g.fillRect(cx - 9, cy - 34, 18, 14); g.fillRect(cx + 6, cy - 34, 26, 6);
    g.strokeStyle = '#8a8c90'; g.lineWidth = 2; g.beginPath(); g.arc(cx - 14, cy - 30, 7, 0, 7); g.stroke();
    if (label) { g.fillStyle = 'rgba(0,0,0,.65)'; g.font = 'bold 13px "Chakra Petch", Consolas, monospace'; g.textAlign = 'center'; g.fillText(label, cx, cy + 12); }
  };
  if (id === 'light') vest(false); else if (id === 'heavy') vest(true);
  else if (id === 'smoke') gren('#7a8a7a', 'SİS'); else if (id === 'flash') gren('#d8d8d0', 'FLAŞ'); else if (id === 'he') gren('#4a5632', '', true);
  else return null;
  return cv.toDataURL();
}
function iconFor(id) {
  if (ICONS[id] !== undefined) return ICONS[id];
  let url = null;
  try { url = ICON_MAKERS[id] ? renderIcon(id) : drawIcon(id); } catch (e) { url = null; }
  return (ICONS[id] = url);
}
