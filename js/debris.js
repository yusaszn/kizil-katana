'use strict';
/* Kesilebilen parçalar: sandıklar ve et parçaları. Her kesik parçayı en uygun ekseninden ikiye böler. */

const MAXP = 200;
const pieces = [];
const fleshCut = new THREE.MeshStandardMaterial({ color: 0x8a0606, emissive: 0x2a0000, roughness: .35, metalness: .1 });
const woodCut = new THREE.MeshStandardMaterial({ color: 0xb98a55, roughness: .9 });
const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: .85 });
let gameTime = 0;

function makePiece(he, pos, quat, mats, cutMat, kind) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(he.x * 2, he.y * 2, he.z * 2), mats);
  mesh.position.copy(pos); mesh.quaternion.copy(quat); scene.add(mesh);
  const vol = 8 * he.x * he.y * he.z;
  const body = new CANNON.Body({ mass: Math.max(.15, vol * (kind === 'wood' ? 22 : 40)), material: mWorld, collisionFilterGroup: G_DEBRIS, collisionFilterMask: G_STATIC | G_PLAYER | G_DEBRIS, linearDamping: .04, angularDamping: .08 });
  body.addShape(new CANNON.Box(new CANNON.Vec3(he.x, he.y, he.z)));
  body.position.set(pos.x, pos.y, pos.z); body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
  body.sleepSpeedLimit = .3; body.sleepTimeLimit = .7;
  world.addBody(body);
  const p = { mesh, body, he: he.clone(), mats, cutMat, kind, bleed: 0, born: gameTime };
  pieces.push(p);
  if (pieces.length > MAXP) removePiece(pieces[0]);
  return p;
}
function removePiece(p) {
  const i = pieces.indexOf(p); if (i < 0) return;
  pieces.splice(i, 1); scene.remove(p.mesh); p.mesh.geometry.dispose(); world.remove(p.body);
}
function spawnCrate(x, y, z, s = .5) {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, rand(0, 6.28));
  return makePiece(new V3(s, s, s), new V3(x, y, z), q, Array(6).fill(crateMat), woodCut, 'wood');
}
const cq = new CANNON.Quaternion(), cv = new CANNON.Vec3();
function splitPiece(p, n, push, force) {
  if (!pieces.includes(p)) return;
  const bq = p.body.quaternion;
  bq.inverse(cq); cq.vmult(cv.set(n.x, n.y, n.z), cv);
  const a = [Math.abs(cv.x), Math.abs(cv.y), Math.abs(cv.z)];
  const he = [p.he.x, p.he.y, p.he.z];
  let ax = a.indexOf(Math.max(a[0], a[1], a[2]));
  if (he[ax] < .07) ax = he.indexOf(Math.max(he[0], he[1], he[2]));
  const bp = p.body.position;
  const center = new V3(bp.x, bp.y, bp.z);
  if (he[ax] < .07) {
    if (p.kind === 'flesh') bloodBurst(center, push, 26, 5, 3); else chips(center, 16, .45, .3, .16);
    removePiece(p); return;
  }
  const nhe = he.slice(); nhe[ax] /= 2;
  const q3 = new THREE.Quaternion(bq.x, bq.y, bq.z, bq.w);
  const v = p.body.velocity;
  for (const s of [1, -1]) {
    const off = new V3(); off.setComponent(ax, s * nhe[ax]); off.applyQuaternion(q3);
    const mats = p.mats.slice(); mats[ax * 2 + (s > 0 ? 1 : 0)] = p.cutMat;
    const np = makePiece(new V3(nhe[0], nhe[1], nhe[2]), center.clone().add(off), q3, mats, p.cutMat, p.kind);
    const sep = off.clone().normalize().multiplyScalar(rand(2, 4));
    np.body.velocity.set(v.x + sep.x + push.x * force * rand(.6, 1.2), v.y + sep.y + push.y * force + rand(1, 3.5), v.z + sep.z + push.z * force * rand(.6, 1.2));
    np.body.angularVelocity.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
    if (p.kind === 'flesh') np.bleed = rand(1.2, 2.4);
  }
  if (p.kind === 'flesh') bloodBurst(center, push, 40, 6, 3.5); else chips(center, 14, .5, .33, .17);
  removePiece(p);
}
function randomNormal() { return new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(); }

function updateDebris(dt) {
  for (const p of pieces) {
    const b = p.body;
    p.mesh.position.set(b.position.x, b.position.y, b.position.z);
    p.mesh.quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
    if (p.bleed > 0) {
      p.bleed -= dt;
      const n = Math.random() < p.bleed * .8 ? 2 : 0;
      for (let i = 0; i < n; i++) emit(b.position.x, b.position.y, b.position.z, b.velocity.x * .3 + rand(-1.5, 1.5), rand(1, 4), b.velocity.z * .3 + rand(-1.5, 1.5), 1, rand(.3, .55), 0, 0, 1.5);
    }
    if (b.position.y < -5) b.position.set(0, 5, 0);
  }
}
