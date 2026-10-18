'use strict';
/* Oyuncu: hareket, atılma, tekme, savunma, silah değiştirme ve katana */

const player = {
  body: new CANNON.Body({ mass: 70, material: mChar, fixedRotation: true, collisionFilterGroup: G_PLAYER, collisionFilterMask: G_STATIC | G_ENEMY | G_DEBRIS }),
  hp: 100, yaw: 0, pitch: 0, charges: 2, recharge: 0, dashT: 0, dashDir: new V3(), dashHit: new Set(),
  invuln: 0, grounded: false, coyote: 0, bob: 0, kickCd: 0, fov: 80, alive: true, deathT: 0,
  sprinting: false, crouchK: 0, slideT: 0, slideCd: 0, slideV: 0, slideDir: new V3(), slideHit: new Set(), spinT: 0,
  airJumps: 0, jumpBuf: 0, dashRefund: false, slideK: 0, lastVy: 0, stepN: 0,
};
let shiftDown = 0;            // Shift'e basıldığı an (ms); kısa basış = atılma, basılı tutma = koşma
// eğilme: Ctrl (C de çalışır)
const crouchHeld = () => keys.ControlLeft || keys.ControlRight || keys.KeyC;
const SLIDE_T = .75, SPIN_T = .34, SPRINT_HOLD = 180;
player.body.addShape(new CANNON.Sphere(.5));
player.body.allowSleep = false;
player.body.updateMassProperties();
world.addBody(player.body);
const EYE = 1.12;

const camPos = new V3(), camFwd = new V3(), flatF = new V3(), rightV = new V3(), upV = new V3(), tmp = new V3(), tmp2 = new V3();
const eyePos = new V3(0, 1.6, 7);   // oyuncunun gözü (3. şahısta kamera bunun arkasında durur)
function camVectors() {
  camera.getWorldDirection(camFwd);
  flatF.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  rightV.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  upV.set(0, 1, 0).applyQuaternion(camera.quaternion);
  camPos.copy(eyePos);
}
// vuruşlarda kameraya verilen küçük sarsıntı (yalpalama / eğilme)
const viewKick = { roll: 0, pitch: 0, yaw: 0 };
function kickView(roll, pitch, yaw = 0) { viewKick.roll += roll; viewKick.pitch += pitch; viewKick.yaw += yaw; }

/* ================= SİLAH DEĞİŞTİRME ================= */
const wpn = { cur: 'katana', next: null, t: 0, off: 0, drawing: false, dt: 1, prev: null };
function switchWeapon(w) {
  if (!player.alive) return;
  const target = wpn.next || wpn.cur;
  const list = weaponList();
  if (!w) w = list[(list.indexOf(target) + 1) % list.length];
  if (w === target || !list.includes(w)) return;
  wpn.next = w; wpn.t = 0; wpn.drawing = false; sfx.swap();
  ammo.reloadT = 0; shells.loading = false; m4.reloadT = 0; awp.reloadT = 0; pis.reloadT = 0;
  if (typeof gst !== 'undefined') for (const k in gst) gst[k].reloadT = 0;
}
// Q: en son kullanılan silaha geç (iki silah arasında gidip gelir)
function quickSwitch() {
  const list = weaponList();
  if (wpn.prev && wpn.prev !== (wpn.next || wpn.cur) && list.includes(wpn.prev)) switchWeapon(wpn.prev);
  else switchWeapon();
}
const WEAPONS = ['katana', 'uzi', 'shotgun', 'm4', 'awp'];
const weaponList = () => isVS() ? vsWeapons() : (special.kind && special.ammo > 0 ? WEAPONS.concat(special.kind) : WEAPONS);
const WEAPON_NAMES = { katana: 'KATANA', uzi: 'ÇİFT UZİ', shotgun: 'POMPALI', m4: 'M4', awp: 'AWP', pistol: 'TABANCA', knife: 'BIÇAK', karambit: 'KARAMBİT', butterfly: 'KELEBEK', rocket: 'ROKETATAR', launcher: 'BOMBAATAR' };
// değiştirme: eski silah indirilir (.17 sn), sonra yenisi kendi çekme animasyonuyla ele alınır; animasyon bitene kadar ateş edilemez
function updateWeaponSwitch(dt) {
  if (wpn.next) {
    if (!wpn.drawing) {
      wpn.t += dt / .17;
      if (wpn.t >= 1) {
        if (wpn.cur !== wpn.next) wpn.prev = wpn.cur;
        wpn.cur = wpn.next; wpn.drawing = true; wpn.dt = 0; sword.phase = 'idle'; sword.queued = null;
      }
    } else {
      wpn.dt += dt / drawDur(wpn.cur);
      if (wpn.dt >= 1) { wpn.next = null; wpn.drawing = false; wpn.dt = 1; wpn.t = 0; }
    }
  }
  wpn.off = wpn.next && !wpn.drawing ? Math.sin(Math.min(1, wpn.t) * Math.PI / 2) : 0;
  swordRoot.visible = trail.visible = wpn.cur === 'katana';
  uziRoot.visible = wpn.cur === 'uzi';
  sgRoot.visible = wpn.cur === 'shotgun';
  m4Root.visible = wpn.cur === 'm4';
  pisRoot.visible = wpn.cur === 'pistol';
  knifeRoot.visible = isKnife(wpn.cur);
}

/* ================= SAVUNMA ================= */
const block = { on: false, t: 0, k: 0, guard: 100, broken: 0, hitT: 0 };
function updateBlock(dt) {
  block.broken -= dt; block.hitT -= dt;
  const busy = wpn.cur === 'katana' && (sword.phase === 'wind' || sword.phase === 'swing');
  // pompalıda sağ tık savunma değil, odaklı atıştır
  const want = mouse.right && wpn.cur === 'katana' && player.alive && !wpn.next && block.broken <= 0 && !busy && state === 'play';
  if (want && !block.on) { block.on = true; block.t = 0; sword.queued = null; }
  else if (!want) block.on = false;
  if (block.on) block.t += dt;
  if (block.hitT <= 0) block.guard = Math.min(100, block.guard + (block.on ? 12 : 32) * dt);
  block.k += ((block.on ? 1 : 0) - block.k) * Math.min(1, dt * 16);
}

/* ================= KATANA VE DETAYLI EL MODELİ ================= */
const BLADE_L = 0.98;
const swordRoot = new THREE.Group(); vmScene.add(swordRoot);
const swordModel = new THREE.Group(); swordRoot.add(swordModel);
const bladeGrp = new THREE.Group(); swordModel.add(bladeGrp);

// Taktik eldiven malzemeleri (tüm silahlarda ve ellerde ortak kullanılır)
const palmMat = new THREE.MeshStandardMaterial({ color: 0x221815, roughness: .75 });
const knuckleMat = new THREE.MeshStandardMaterial({ color: 0x121010, roughness: .35, metalness: .6, envMap: envTex });
const strapMat = new THREE.MeshStandardMaterial({ color: 0x8a1812, roughness: .6 });
const tacticalSleeveMat = new THREE.MeshStandardMaterial({ color: 0x241814, roughness: .9 });

// Eklemli taktik eldivenli el: her parmak 3 boğum, yuvarlak eklemler, kabzanın etrafına sarılır.
// opts.grip: 'v' dik kabza (tabanca kabzası, ekseni y) · 'h' yatay sap (kılıç sapı, el kundağı, ekseni z)
// opts.r: kabza yarıçapı · opts.trigger: işaret parmağı tetikte (dik kabzada) · Sol el aynalanarak üretilir.
// El kökü kabzanın merkezindedir; önkol geriye (kameraya) doğru uzanır.
const gloveSeg = {};
function handSeg(parent, a, b, r0, r1, mat) {
  const d = b.clone().sub(a), len = d.length();
  const key = r0.toFixed(4) + r1.toFixed(4) + len.toFixed(3);
  const geo = gloveSeg[key] || (gloveSeg[key] = new THREE.CylinderGeometry(r1, r0, len, 10, 1));
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(a).addScaledVector(d, .5);
  m.quaternion.setFromUnitVectors(UP, d.divideScalar(len));
  parent.add(m);
  return m;
}
const jointGeo = new THREE.SphereGeometry(1, 10, 8);
function handJoint(parent, p, r, mat) { const m = new THREE.Mesh(jointGeo, mat); m.position.copy(p); m.scale.setScalar(r); parent.add(m); return m; }
function handChain(parent, pts, r0, r1, mat, tipMat) {
  for (let i = 0; i < pts.length - 1; i++) {
    const ra = r0 + (r1 - r0) * i / (pts.length - 1), rb = r0 + (r1 - r0) * (i + 1) / (pts.length - 1);
    handJoint(parent, pts[i], ra * 1.04, mat);
    handSeg(parent, pts[i], pts[i + 1], ra, rb, mat);
  }
  handJoint(parent, pts[pts.length - 1], r1, tipMat || mat);
}
const handLeather = new THREE.MeshStandardMaterial({ color: 0x2b201b, roughness: .72, metalness: .05 });
const handTip = new THREE.MeshStandardMaterial({ color: 0x3a2c24, roughness: .8 });          // açık uçlu parmak dikişi
const handPad = new THREE.MeshStandardMaterial({ color: 0x1c1614, roughness: .62, metalness: .15 });
const handCuff = new THREE.MeshStandardMaterial({ color: 0x8a1812, roughness: .6 });
const handSleeve = new THREE.MeshStandardMaterial({ color: 0x241a16, roughness: .92 });
const handSleeveDark = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: .95 });

function createTacticalHand(isLeft = false, opts = {}) {
  const grip = opts.grip || 'v', r = opts.r || .026, trigger = opts.trigger ?? (grip === 'v' && !isLeft);
  const out = new THREE.Group(), g = new THREE.Group(); out.add(g);
  if (isLeft) g.scale.x = -1;                 // sol el: aynalanmış sağ el
  const fr = .0095, Rf = r + fr * 1.05;       // parmak yarıçapı ve kabzadan uzaklık
  const V = (x, y, z) => new V3(x, y, z);
  // kabza çevresinde nokta: dik kabzada açı y ekseni etrafında (0 = arka, 90 = sağ, 180 = ön), yatayda z ekseni etrafında (0 = sağ, 90 = üst)
  const onGrip = (deg, along, rad = Rf) => {
    const a = deg * Math.PI / 180;
    return grip === 'v' ? V(Math.sin(a) * rad, along, Math.cos(a) * rad) : V(Math.cos(a) * rad, Math.sin(a) * rad, along);
  };
  let fingerAngles, rows, palmDeg, wrist, armDir, thumbPts;
  if (grip === 'v') {
    rows = [.028, .009, -.01, -.029];                    // işaret (üst) → serçe (alt)
    fingerAngles = [100, 150, 200, 245];
    palmDeg = 50;
    wrist = V(r * .45, -.042, r + .026);
    armDir = V(.06, -.42, 1).normalize();
    thumbPts = [onGrip(25, .03, r + .02), onGrip(-15, .04, r + .014), onGrip(-55, .036, r + .011), onGrip(-90, .03, r + .01)];
  } else {
    rows = [-.03, -.011, .008, .026];                    // işaret (ön) → serçe (arka)
    // çekiç tutuşu: avuç sağ üstte, parmaklar sağdan alta ve sola sarılır, başparmak üstten kapanır
    fingerAngles = [18, -42, -102, -155];
    palmDeg = 62;
    wrist = V(r * .75, r * .35, .064);
    armDir = V(.14, -.24, 1).normalize();
    thumbPts = [onGrip(70, -.006, r + .022), onGrip(102, -.026, r + .016), onGrip(138, -.04, r + .012), onGrip(168, -.046, r + .01)];
  }
  // ---- avuç: kabzanın arkasına oturan yuvarlatılmış yastık ----
  const pa = palmDeg * Math.PI / 180;
  // avuç: kabzaya yaslanan yassı elipsoit (kutu yerine yuvarlak hatlı)
  const palm = new THREE.Mesh(jointGeo, handLeather);
  palm.position.copy(onGrip(palmDeg, 0, r + .014));
  if (grip === 'v') { palm.scale.set(.034, .043, .015); palm.rotation.y = pa; }
  else { palm.scale.set(.015, .034, .043); palm.rotation.z = pa; }
  g.add(palm);
  // avuç topuğu: avucu bileğe bağlar
  handSeg(g, onGrip(palmDeg - 10, grip === 'v' ? -.022 : .022, r + .016), wrist, .022, .028, handLeather);
  // avuç kenarlarını yuvarlatan iki yastık
  handJoint(g, onGrip(palmDeg - 25, grip === 'v' ? -.03 : .03, r + .016), .02, handLeather);
  handJoint(g, onGrip(palmDeg + 15, grip === 'v' ? .025 : -.025, r + .018), .018, handLeather);
  // ---- parmaklar ----
  rows.forEach((y, i) => {
    const len = i === 3 ? .82 : i === 0 ? .95 : 1;       // serçe kısa
    const rr = fr * (i === 3 ? .85 : 1);
    let pts;
    if (i === 0 && trigger) {
      // işaret parmağı tetiğe uzanır: önce öne, sonra hafifçe aşağı kıvrılır
      const base = onGrip(fingerAngles[0], y + .004, Rf + .004);
      pts = [base, V(base.x * .5, y + .006, -(r + .02)), V(-.002, y - .004, -(r + .038)), V(-.004, y - .016, -(r + .044))];
    } else {
      const a = fingerAngles.map((d, k) => k ? fingerAngles[0] + (d - fingerAngles[0]) * len : d);
      pts = a.map((d, k) => onGrip(d, y + (grip === 'v' ? -k * .002 : k * .001), Rf + (k ? 0 : .004)));
    }
    handChain(g, pts, rr, rr * .82, handLeather, handTip);
    { const kj = handJoint(g, onGrip(fingerAngles[0] + (grip === 'v' ? -4 : 4), y, Rf + .007), .0085, handPad); kj.scale.set(.0085, .0085, .0085); }   // boğum yastığı
  });
  // el sırtı zırh plakası
  const plateDeg = grip === 'v' ? fingerAngles[0] - 32 : 42, pb = plateDeg * Math.PI / 180;
  const plate = new THREE.Mesh(grip === 'v' ? new THREE.BoxGeometry(.036, .062, .007) : new THREE.BoxGeometry(.007, .036, .062), handPad);
  plate.position.copy(onGrip(plateDeg, 0, Rf + .018));
  if (grip === 'v') plate.rotation.y = pb; else plate.rotation.z = pb;
  g.add(plate);
  // ---- başparmak ----
  handChain(g, thumbPts, .0115, .009, handLeather, handTip);
  handJoint(g, thumbPts[0], .02, handLeather);           // başparmak kökü (tenar kası)
  // ---- bilek, manşet ve önkol ----
  handJoint(g, wrist, .03, handLeather);
  const cuffEnd = wrist.clone().addScaledVector(armDir, .03);
  handSeg(g, wrist.clone().addScaledVector(armDir, -.004), cuffEnd, .033, .035, handCuff);
  const elbow = wrist.clone().addScaledVector(armDir, .42);
  handSeg(g, cuffEnd, wrist.clone().addScaledVector(armDir, .09), .036, .04, handSleeveDark);   // kıvrılmış kol ağzı
  handSeg(g, wrist.clone().addScaledVector(armDir, .09), elbow, .04, .047, handSleeve);
  for (const f of [.17, .26, .34]) handSeg(g, wrist.clone().addScaledVector(armDir, f), wrist.clone().addScaledVector(armDir, f + .018), .0425 + f * .012, .0435 + f * .012, handSleeveDark);   // kumaş kıvrımları
  return out;
}

{
  const s = new THREE.Shape(), L = BLADE_L;
  s.moveTo(0, -.017);
  s.quadraticCurveTo(L * .55, -.012, L - .1, .026);
  s.lineTo(L, .07);
  s.quadraticCurveTo(L - .04, .064, L - .11, .062);
  s.quadraticCurveTo(L * .55, .03, 0, .017);
  s.lineTo(0, -.017);
  const g = new THREE.ExtrudeGeometry(s, { depth: .006, bevelEnabled: true, bevelThickness: .003, bevelSize: .002, bevelSegments: 1, curveSegments: 10 });
  g.rotateY(Math.PI / 2); g.translate(-.003, 0, 0);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xe8eef4, metalness: .95, roughness: .16, envMap: envTex, envMapIntensity: 1.4 });
  bladeGrp.add(new THREE.Mesh(g, bladeMat));
  const bloodMat = new THREE.MeshStandardMaterial({ color: 0x6a0303, roughness: .2, metalness: .3, envMap: envTex, transparent: true, opacity: 0, depthWrite: false });
  const bloodLayer = new THREE.Mesh(g, bloodMat); bloodLayer.scale.set(1.25, 1.02, 1.0); bladeGrp.add(bloodLayer);
  swordModel.userData.bloodMat = bloodMat;
  const gold = new THREE.MeshStandardMaterial({ color: 0x9a7a3a, metalness: .9, roughness: .35, envMap: envTex });
  const habaki = new THREE.Mesh(new THREE.BoxGeometry(.016, .042, .04), gold); habaki.position.z = -.02; swordModel.add(habaki);
  const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .012, 18), new THREE.MeshStandardMaterial({ color: 0x1a1412, metalness: .8, roughness: .4, envMap: envTex }));
  tsuba.rotation.x = Math.PI / 2; tsuba.scale.set(.85, 1, 1.1); swordModel.add(tsuba);
  const tsukaTex = canvasTex(64, (gg, S) => { gg.fillStyle = '#1b0d0a'; gg.fillRect(0, 0, S, S); gg.fillStyle = '#7a1410'; for (let i = 0; i < 4; i++) { gg.beginPath(); gg.moveTo(S / 2, i * 16); gg.lineTo(S, i * 16 + 8); gg.lineTo(S / 2, i * 16 + 16); gg.lineTo(0, i * 16 + 8); gg.fill(); } }, 1, 4);
  const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(.017, .019, .3, 10), new THREE.MeshStandardMaterial({ map: tsukaTex, roughness: .9 }));
  tsuka.rotation.x = Math.PI / 2; tsuka.position.z = .157; swordModel.add(tsuka);

  // Katanayı sımsıkı tutan taktik eldivenli el
  const swordHand = createTacticalHand(false, { grip: 'h', r: .019 });
  swordHand.position.set(0, 0, .1);
  swordModel.add(swordHand);
}
const bladeLen = () => BLADE_L * (1 + ST.swordRange * .3);
const P = (p, r) => ({ p: new V3(...p), r: new V3(...r) });
const REST = P([.29, -.17, -.5], [.9, .45, .35]);   // kabzayı tutan el ekranda görünsün
const SPRINT_POSE = P([.36, -.5, -.42], [-.35, .25, 1.0]);   // koşarken kılıç geride, ucu aşağıda
const BLOCK_POSE = P([.08, -.2, -.5], [.18, 1.5, 2.9]);
const SW = {
  A: { start: P([.75, -.2, -.42], [.15, -1.35, -1.57]), end: P([-.72, -.45, -.45], [-.2, 1.45, -1.57]), wind: .06, swing: .11, rec: .2, dmg: 2, arc: 1.1, range: 3.0 },
  B: { start: P([-.72, -.15, -.42], [.15, 1.35, 1.57]), end: P([.75, -.45, -.45], [-.2, -1.45, 1.57]), wind: .06, swing: .11, rec: .2, dmg: 2, arc: 1.1, range: 3.0 },
  H: { start: P([.22, .2, -.3], [1.9, .05, 0]), end: P([.05, -.62, -.5], [-1.1, .05, 0]), wind: .17, swing: .12, rec: .3, dmg: 4.5, arc: .55, range: 3.5 },
  D: { start: P([.75, -.2, -.42], [.15, -1.35, -1.57]), end: P([-.72, -.45, -.45], [-.2, 1.45, -1.57]), wind: .03, swing: .14, rec: .2, dmg: 0, arc: 0, range: 0 },
  // kasırga: kayarken vurunca etrafındaki her şeyi iki kez biçer
  S: { start: P([.8, -.28, -.42], [.05, -1.5, -1.57]), end: P([-.8, -.3, -.42], [.05, 1.5, -1.57]), wind: .02, swing: .3, rec: .16, dmg: 2, arc: Math.PI, range: 3.3 },
};
const sword = { phase: 'idle', type: 'A', t: 0, from: P([0, 0, 0], [0, 0, 0]), cur: P([.42, -.4, -.6], [1, .45, .35]), queued: null, flip: false, hitDone: false, blood: 0, swayX: 0, swayY: 0 };
const dispPose = P([0, 0, 0], [0, 0, 0]);
function lerpPose(a, b, t, out) { out.p.lerpVectors(a.p, b.p, t); out.r.lerpVectors(a.r, b.r, t); return out; }
// Kesik pozu: düz çizgi yerine yay çizer, ortada bilek döner, sonda biraz öne uzanır
function swingPose(type, t, out) {
  const S = SW[type];
  lerpPose(S.start, S.end, easeInOut(t), out);
  const arcK = Math.sin(t * Math.PI);
  if (type === 'H') { out.p.z -= arcK * .18; out.p.y += arcK * .05; }
  else { out.p.y += arcK * (type === 'S' ? .05 : .12); out.p.z -= arcK * .16; out.r.z += arcK * (type === 'B' ? -.35 : .35); out.r.x -= arcK * .12; }
  return out;
}
function startSwing(type) {
  if (type === 'L') { type = sword.flip ? 'B' : 'A'; sword.flip = !sword.flip; }
  sword.type = type; sword.phase = 'wind'; sword.t = 0; sword.hitDone = false; sword.queued = null;
  sword.from.p.copy(sword.cur.p); sword.from.r.copy(sword.cur.r);
  netFx.sw++;
  sword.hit2 = false;
  if (type !== 'D') setTimeout(() => sfx.swing(type === 'H'), type === 'H' ? 140 : 40);
  if (type === 'S') { player.spinT = SPIN_T; setTimeout(() => sfx.swing(true), 150); }
  // kamera da kesiğe eşlik etsin
  if (type === 'A') kickView(.05, -.012, .02);
  else if (type === 'B') kickView(-.05, -.012, -.02);
  else if (type === 'H') kickView(0, .05);
}
function attackInput(type) {
  if (!player.alive || wpn.cur !== 'katana' || wpn.next || block.on || vsFrozen()) return;
  if (type === 'L' && player.slideT > 0) type = 'S';
  if (sword.phase === 'idle') startSwing(type);
  else sword.queued = type;
}

// kesik izi
const TN = 16;
const trailPos = new Float32Array(TN * 2 * 3), trailCol = new Float32Array(TN * 2 * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3).setUsage(THREE.DynamicDrawUsage));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3).setUsage(THREE.DynamicDrawUsage));
{ const idx = []; for (let i = 0; i < TN - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } trailGeo.setIndex(idx); }
const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
trail.frustumCulled = false; vmScene.add(trail);
const tObj = new THREE.Object3D(); tObj.rotation.order = 'YXZ';
const tPose = P([0, 0, 0], [0, 0, 0]);
function updateTrail() {
  let head = -1, len = 0;
  const S = SW[sword.type];
  if (sword.phase === 'swing') { head = sword.t; len = .6; }
  else if (sword.phase === 'rec' && sword.t < .35) { head = 1; len = .6 * (1 - sword.t / .35); }
  if (head < 0 || len <= 0) { trailGeo.setDrawRange(0, 0); return; }
  const heavy = sword.type === 'H', L = bladeLen();
  const cmb = Math.min(1, (typeof combo !== 'undefined' ? combo.n : 0) / 7);
  for (let i = 0; i < TN; i++) {
    const tt = Math.max(0, head - len * i / (TN - 1));
    swingPose(sword.type, tt, tPose);
    tObj.position.copy(tPose.p); tObj.rotation.set(tPose.r.x, tPose.r.y, tPose.r.z); tObj.updateMatrix();
    const b = new V3(0, 0, -.3).applyMatrix4(tObj.matrix), t = new V3(0, .04, -L - .05).applyMatrix4(tObj.matrix);
    trailPos.set([b.x, b.y, b.z, t.x, t.y, t.z], i * 6);
    const f = Math.pow(1 - i / (TN - 1), 1.6) * (heavy ? 1.3 : .95);
    const bl = sword.blood;
    // İç taban rengi: koyu kordan parlak akkor turuncuya
    const r1 = f * (0.85 + cmb * .7), g1 = f * (0.12 + cmb * .4), b1 = f * (0.05 + cmb * .1);
    // Dış uç rengi: parlak alev ve lav rengi
    const r2 = f * (1.3 + cmb * .5), g2 = f * (0.35 + cmb * .6 - bl * .2), b2 = f * (0.18 + cmb * .3 - bl * .15);
    trailCol.set([r1, g1, b1, r2, g2, b2], i * 6);
  }
  trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
  trailGeo.setDrawRange(0, (TN - 1) * 6);
}

/* ================= SALDIRILAR ================= */
function deflectFireball(f) {
  f.deflected = true; f.vel.copy(camFwd).multiplyScalar(30); f.s.material = fbGlowBlue; f.life = 4; f.by = net.myId;
  if (net.mode === 'guest') toHost({ t: 'deflect', id: f.id, v: arr(f.vel) });
  else bcast({ t: 'fbd', id: f.id, p: arr(f.pos), v: arr(f.vel) });
  hitStop = Math.max(hitStop, .13); shake(.3); sfx.parry(); toast('SEKTİ!'); score += 50;
}
function doHit(type) {
  const S = SW[type];
  camVectors();
  const spin = type === 'S';
  const range = (S.range + ST.swordRange) * (spin ? Math.sqrt(ST.stormMul) : 1);
  const arc = spin ? Math.PI : Math.min(1.5, S.arc * ST.swordArc);
  const dmg = S.dmg * ST.swordDmg * (spin ? ST.stormMul : 1);
  const swingDir = type === 'A' ? rightV.clone().negate() : type === 'B' ? rightV.clone() : flatF.clone().setY(-.7).normalize();
  const push = swingDir.clone().multiplyScalar(type === 'H' ? .3 : .65).add(flatF).normalize();
  const cutN = type === 'H' ? rightV.clone() : UP.clone().addScaledVector(rightV, rand(-.35, .35)).normalize();
  const cosA = Math.cos(arc);
  let hits = 0;
  for (const f of fireballs.slice()) {
    if (f.deflected) continue;
    tmp.copy(f.pos).sub(camPos); const dl = tmp.length();
    if (dl < range + .8 && tmp.divideScalar(dl).dot(camFwd) > Math.cos(arc + .3)) { deflectFireball(f); hits++; }
  }
  for (const e of enemies.slice()) {
    const b = e.body.position;
    const dx = b.x - camPos.x, dz = b.z - camPos.z, dh = Math.hypot(dx, dz);
    if (dh - e.r > range) continue;
    if (b.y - camPos.y > 1.2) continue;   // tepedeki uçanlara kılıç yetişmez (zıplayınca yetişir)
    if (!spin && dh > e.r + .5 && (dx * flatF.x + dz * flatF.z) / dh < cosA) continue;
    const pd = spin ? new V3(dx, 0, dz).normalize() : push;
    hurtEnemy(e, dmg, pd, cutN, { big: type === 'H' || spin });
    hits++;
  }
  const cand = [];
  for (const p of pieces) {
    const bp = p.body.position;
    tmp.set(bp.x - camPos.x, bp.y - camPos.y, bp.z - camPos.z);
    const dl = tmp.length();
    if (dl > range + .3) continue;
    if (!spin && dl > 1.1 && tmp.divideScalar(dl).dot(camFwd) < Math.cos(arc + .15)) continue;
    cand.push([dl, p]);
  }
  cand.sort((a, b) => a[0] - b[0]);
  let wood = false, flesh = false;
  for (const [, p] of cand.slice(0, spin ? 12 : 7)) {
    if (p.kind === 'wood') wood = true; else flesh = true;
    p.body.wakeUp();
    const bp = p.body.position;
    splitPiece(p, cutN, spin ? new V3(bp.x - camPos.x, .3, bp.z - camPos.z).normalize() : push, 5);
    hits++;
  }
  if (isVS()) hits += pvpMelee(range, arc, spin ? PVP_DMG.katanaS : type === 'H' ? PVP_DMG.katanaH : PVP_DMG.katanaL, { w: 'katana', kn: type === 'H' ? 6 : 3 });
  if (wood) sfx.wood();
  if (flesh) { sfx.flesh(); sword.blood = Math.min(1, sword.blood + .1); }
  if (hits) { hitStop = Math.max(hitStop, .045); shake(.15); }
}

/* ================= TEKME BACAĞI (ekranda görünür) ================= */
const kickLeg = new THREE.Group(); vmScene.add(kickLeg); kickLeg.visible = false;
{
  const pants = new THREE.MeshStandardMaterial({ color: 0x1f1a17, roughness: .9 });
  const boot = new THREE.MeshStandardMaterial({ color: 0x120c0a, roughness: .6, metalness: .2 });
  const shin = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, .7), pants); shin.position.z = .1; kickLeg.add(shin);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(.17, .14, .3), boot); foot.position.set(0, .02, -.36); kickLeg.add(foot);
  const sole = new THREE.Mesh(new THREE.BoxGeometry(.18, .05, .32), new THREE.MeshStandardMaterial({ color: 0x3a1a10, roughness: .8 })); sole.position.set(0, -.07, -.36); kickLeg.add(sole);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(.175, .03, .08), new THREE.MeshStandardMaterial({ color: 0x8a1410 })); strap.position.set(0, .07, -.25); kickLeg.add(strap);
}
let kickAnim = 0;
const KICK_T = .38;
function updateKickLeg(dt) {
  kickAnim = Math.max(0, kickAnim - dt);
  const slideLeg = player.slideK > .05 && kickAnim <= 0;
  kickLeg.visible = (kickAnim > 0 || slideLeg) && !SETTINGS.thirdPerson && player.alive;
  if (!kickLeg.visible) return;
  if (slideLeg) {
    // kayma: bacak öne uzanır, ayak ucu yukarı, zeminde titrer
    const s = easeOut(player.slideK), j = player.slideT > 0 ? Math.sin(performance.now() / 22) * .006 : 0;
    kickLeg.position.set(.16, -1.25 + s * .5 + j, -.5 - s * .3);
    kickLeg.rotation.set(-.55 + s * .45, -.12, .08, 'YXZ');
    return;
  }
  const t = 1 - kickAnim / KICK_T;                  // 0 → 1
  const out = t < .35 ? easeOut(t / .35) : 1 - easeInOut((t - .35) / .65);
  // aşağıdan yukarı ve ileri doğru savrulur, sonra geri çekilir
  kickLeg.position.set(.1, -1.1 + out * .62, -.55 - out * .35);
  kickLeg.rotation.set(-.9 + out * .95, -.08, .05, 'YXZ');
}

function kick() {
  if (player.kickCd > 0 || !player.alive || state !== 'play' || vsFrozen()) return;
  player.kickCd = .55; camVectors(); shake(.12);
  kickAnim = KICK_T; netFx.kc = (netFx.kc || 0) + 1; kickView(0, -.03);
  const kp = ST.kickPower;
  let hit = false;
  for (const e of enemies) {
    const b = e.body.position; const dx = b.x - camPos.x, dz = b.z - camPos.z, dh = Math.hypot(dx, dz);
    if (dh - e.r > 2.4 || (dx * flatF.x + dz * flatF.z) / dh < .45) continue;
    applyKick(e, flatF, kp, net.myId);
    hurtEnemy(e, kp > 1 ? 2 : .5, flatF, UP, {});
    hit = true;
  }
  for (const p of pieces) {
    const bp = p.body.position; tmp.set(bp.x - camPos.x, 0, bp.z - camPos.z); const dl = tmp.length();
    if (dl > 2.8 || tmp.divideScalar(dl).dot(flatF) < .3) continue;
    p.body.wakeUp();
    const m = p.body.mass;
    p.body.applyImpulse(new CANNON.Vec3(flatF.x * m * 14 * kp, m * 5, flatF.z * m * 14 * kp), p.body.position);
    hit = true;
  }
  if (isVS() && pvpMelee(2.4, 1.1, PVP_DMG.kick, { w: 'kick', kn: 13 })) hit = true;
  if (hit) { sfx.kick(); hitStop = Math.max(hitStop, .04); }
}

function applyKick(e, dir, kp, by) {
  if (e.remote) { toHost({ t: 'kick', id: e.id, dir: arr(dir), kp }); return; }
  if (isBossKind(e.kind)) { e.body.velocity.x += dir.x * 2 * kp; e.body.velocity.z += dir.z * 2 * kp; return; }
  const k = (e.kind === 'brute' ? 7 : 17) * Math.sqrt(kp);
  e.body.velocity.set(dir.x * k, 5, dir.z * k);
  e.stun = e.kind === 'brute' ? .4 : 1.1; e.kicked = 1.1; e.kickBy = by; e.windup = 0; e.charge = 0;
}

function crouchInput(landing) {
  if (!player.alive || state !== 'play' || player.slideT > 0 || (player.slideCd > 0 && !landing) || player.dashT > 0 || vsFrozen()) return;
  const v = player.body.velocity, hs = Math.hypot(v.x, v.z);
  if (!player.grounded || hs < (landing ? 6 : 11.5)) return;
  player.slideDir.set(v.x / hs, 0, v.z / hs);
  player.slideV = hs + 4; player.slideT = SLIDE_T; player.slideHit.clear();
  sfx.slide(); shake(.08);
}

function dash() {
  if (isVS()) return;   // VS'de atılma yok, sadece kayma
  if (!player.alive || player.charges < 1 || player.dashT > 0 || state !== 'play') return;
  player.charges--;
  camVectors();
  const d = new V3();
  if (keys.KeyW) d.add(flatF); if (keys.KeyS) d.sub(flatF); if (keys.KeyD) d.add(rightV); if (keys.KeyA) d.sub(rightV);
  if (d.lengthSq() < .01) d.copy(flatF);
  player.dashDir.copy(d.normalize());
  player.dashT = .2; player.dashHit.clear(); player.dashRefund = false; player.slideT = 0;
  player.body.collisionFilterMask = G_STATIC | G_DEBRIS;
  dashFlash = 1; sfx.dash();
  if (wpn.cur === 'katana' && !block.on) startSwing('D');
}

/* ================= HAREKET ================= */
const rayFrom = new CANNON.Vec3(), rayTo = new CANNON.Vec3(), rayRes = new CANNON.RaycastResult();
function updatePlayer(dt) {
  const b = player.body, v = b.velocity;
  camVectors();
  rayFrom.copy(b.position); rayTo.set(b.position.x, b.position.y - .62, b.position.z);
  rayRes.reset();
  const g = world.raycastClosest(rayFrom, rayTo, { collisionFilterMask: G_STATIC | G_DEBRIS, skipBackfaces: true }, rayRes);
  const wasGrounded = player.grounded;
  if (g && v.y < 3) { player.grounded = true; player.coyote = .1; } else { player.grounded = false; player.coyote -= dt; }
  // yere iniş sesi: ne kadar hızlı düştüysen o kadar tok
  if (player.grounded && !wasGrounded && player.lastVy < -6 && player.alive) { sfx.land(-player.lastVy); if (player.lastVy < -11) shake(.06); }
  // havadayken eğilme tuşu basılı tutuluyorsa yere değer değmez kaymaya geçer (kayma → zıpla → kayma zinciri)
  if (player.grounded && !wasGrounded && crouchHeld() && player.slideT <= 0) crouchInput(true);
  player.lastVy = v.y;
  player.slideK += ((player.slideT > 0 ? 1 : 0) - player.slideK) * Math.min(1, dt * (player.slideT > 0 ? 14 : 7));
  if (player.charges < ST.maxDash) { player.recharge += dt; if (player.recharge >= ST.dashRecharge) { player.recharge = 0; player.charges++; } }
  else player.recharge = 0;
  player.kickCd -= dt; player.invuln -= dt; player.slideCd -= dt; player.jumpBuf -= dt;
  player.crouchK += (((crouchHeld() && player.alive) || player.slideT > 0 ? 1 : 0) - player.crouchK) * Math.min(1, dt * 12);
  if (player.dashT > 0) {
    player.dashT -= dt;
    const d = player.dashDir;
    v.x = d.x * 34; v.z = d.z * 34; v.y = Math.max(v.y, 0) * .2;
    const pb = b.position;
    for (const e of enemies.slice()) {
      if (player.dashHit.has(e)) continue;
      const ep = e.body.position;
      if (Math.hypot(ep.x - pb.x, ep.z - pb.z) < e.r + 1.3) {
        player.dashHit.add(e);
        hurtEnemy(e, 3 * ST.swordDmg, rightV.clone().multiplyScalar(Math.random() < .5 ? 1 : -1).add(d).normalize(), UP.clone().addScaledVector(rightV, rand(-.4, .4)).normalize(), { big: true });
        hitStop = Math.max(hitStop, .05);
        if (ST.bloodDash) {
          player.hp = Math.min(ST.maxHp, player.hp + 8);
          if (!player.dashRefund) { player.dashRefund = true; player.charges = Math.min(ST.maxDash, player.charges + 1); }
        }
      }
    }
    for (const p of pieces.slice()) {
      const bp = p.body.position;
      if (Math.hypot(bp.x - pb.x, bp.z - pb.z) < 1.2 && bp.y < 2.2 && p.born < gameTime - .1) { p.body.wakeUp(); if (p.he.x + p.he.y + p.he.z > .25) splitPiece(p, UP, d, 6); }
    }
    for (let i = 0; i < 6; i++) emit(pb.x + rand(-.3, .3), pb.y + rand(0, 1.2), pb.z + rand(-.3, .3), -d.x * 4, rand(-.5, .5), -d.z * 4, 2, .9, .85, .8, .25);
    if (player.dashT <= 0) { v.x = d.x * 12; v.z = d.z * 12; b.collisionFilterMask = G_STATIC | G_ENEMY | G_DEBRIS; }
  } else if (player.slideT > 0 && player.alive) {
    // kayma: hızla ileri kayar, değdiği düşmanları devirir; zıplarsan hızını koruyarak fırlarsın
    player.slideT -= dt;
    const f = Math.max(0, player.slideT / SLIDE_T), d = player.slideDir;
    const sp = 8 + (player.slideV - 8) * f;
    v.x = d.x * sp; v.z = d.z * sp;
    const pb = b.position;
    for (const e of enemies) {
      if (player.slideHit.has(e)) continue;
      const ep = e.body.position;
      // devirme: düşman havaya kalkar ama uzağa uçmaz, kasırgayla biçilebilsin
      if (Math.hypot(ep.x - pb.x, ep.z - pb.z) < e.r + .9) { player.slideHit.add(e); applyKick(e, d, .06, net.myId); shake(.1); sfx.kick(); }
    }
    if (Math.random() < .7) emit(pb.x + rand(-.3, .3), .05, pb.z + rand(-.3, .3), -d.x * 3 + rand(-1, 1), rand(.5, 2), -d.z * 3 + rand(-1, 1), 2, .5, .42, .36, .4);
    if (player.jumpBuf > 0 && player.coyote > 0) {
      player.slideT = 0; player.jumpBuf = 0; player.coyote = 0;
      if (isVS()) { v.y = 9.5; }   // VS: kayarken zıplama sadece zıplama, öne fırlatmaz
      else {
        // kayarken zıplama: öne doğru kısa bir atılma
        v.x = d.x * (sp + 7); v.z = d.z * (sp + 7); v.y = 8.5;
        dashFlash = .6; sfx.dash(); shake(.08);
      }
    }
    if (player.slideT <= 0) player.slideCd = .35;
  } else if (player.alive && state === 'play' && vsFrozen()) {
    // raunt hazırlığında herkes yerinde bekler
    v.x *= .8; v.z *= .8; player.jumpBuf = 0; player.sprinting = false;
  } else if (player.alive && state === 'play') {
    const wish = new V3();
    if (keys.KeyW || keys.ArrowUp) wish.add(flatF); if (keys.KeyS || keys.ArrowDown) wish.sub(flatF);
    if (keys.KeyD || keys.ArrowRight) wish.add(rightV); if (keys.KeyA || keys.ArrowLeft) wish.sub(rightV);
    if (wish.lengthSq() > 0) wish.normalize();
    const crouching = crouchHeld() && player.grounded;
    const shiftHeld = shiftDown && performance.now() - shiftDown >= SPRINT_HOLD;
    // ateş ederken ya da nişan alırken koşu iptal olur (silah yere bakarken ileri ateş edilmesin)
    const gun = wpn.cur !== 'katana' && !isKnife(wpn.cur);
    if (gun && (mouse.left || mouse.right)) player.fireLock = .35; else player.fireLock = (player.fireLock || 0) - dt;
    player.sprinting = (SETTINGS.alwaysSprint || shiftHeld) && (keys.KeyW || keys.ArrowUp) && !block.on && !crouching && !(player.fireLock > 0);
    const aimSlow = m4.adsK > .5 || awp.scopeK > .5 || pis.adsK > .5 || uziAim.k > .5 ? .6 : 1;
    const knifeFast = isKnife(wpn.cur) ? 1.12 : 1;   // bıçakla daha hızlı koşulur
    const sp = ST.moveSpeed * (isVS() ? .85 : 1) * knifeFast * aimSlow * (block.on ? .55 : 1) * (crouching ? .6 : player.sprinting ? (isVS() ? 1.45 : 2.05) : 1), acc = player.grounded ? 14 : 3.5;
    const k = Math.min(1, acc * dt);
    if (player.grounded) { v.x += (wish.x * sp - v.x) * k; v.z += (wish.z * sp - v.z) * k; }
    else {
      // havada momentum korunur: tuşa basmazsan hızın düşmez, basarsan yön değiştirirsin
      const hs0 = Math.hypot(v.x, v.z), tgt = Math.max(sp, hs0);
      if (wish.lengthSq() > 0) { v.x += (wish.x * tgt - v.x) * k; v.z += (wish.z * tgt - v.z) * k; }
    }
    if (player.grounded) player.airJumps = ST.airJumps;
    if (player.jumpBuf > 0) {
      if (player.coyote > 0) { v.y = 9.5; player.coyote = 0; player.grounded = false; player.jumpBuf = 0; }
      else if (player.airJumps > 0) {
        player.airJumps--; player.jumpBuf = 0; v.y = 9;
        const pb = b.position; for (let i = 0; i < 14; i++) emit(pb.x, pb.y - .4, pb.z, rand(-3, 3), rand(-2, 0), rand(-3, 3), 2, .9, .85, .8, .3);
        sfx.jump2();
      }
    }
    const hs = Math.hypot(v.x, v.z);
    if (player.grounded && hs > 1) player.bob += dt * hs * 1.1;
    // ayak sesi: her adımda bir; eğilerek yürürken sessiz, koşarken daha yüksek
    const stepN = Math.floor(player.bob / Math.PI);
    if (stepN !== player.stepN) { player.stepN = stepN; if (player.grounded && hs > 1.5) stepSound(crouching ? .03 : player.sprinting ? .34 : .2, 0, player.sprinting ? 1.05 : 1); }
  } else {
    v.x *= .9; v.z *= .9;
  }
}
function syncCamera(dt, rdt) {
  const b = player.body.position;
  let y = b.y + EYE - player.crouchK * .55 - player.slideK * .14;
  if (!player.alive) { player.deathT += rdt; y = b.y + Math.max(-.1, EYE - player.deathT * 1.4); }
  const tp = SETTINGS.thirdPerson;
  const bobY = tp ? 0 : Math.sin(player.bob * 2) * .045, bobX = tp ? 0 : Math.cos(player.bob) * .03;
  eyePos.set(b.x + rightV.x * bobX, y + bobY, b.z + rightV.z * bobX);
  camera.position.copy(eyePos);
  trauma = Math.max(0, trauma - rdt * 1.6);
  const sh = trauma * trauma;
  const t = performance.now() / 1000;
  const strafe = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  // kesik sarsıntısı yumuşakça söner
  const vk = Math.pow(.0005, rdt);
  viewKick.roll *= vk; viewKick.pitch *= vk; viewKick.yaw *= vk;
  // kasırga kesiğinde kamera bir tur döner
  let spin = 0;
  if (player.spinT > 0) { player.spinT -= dt; spin = easeInOut(1 - Math.max(0, player.spinT) / SPIN_T) * Math.PI * 2; }
  const slideRoll = player.slideK * .11 + (player.slideT > 0 ? Math.sin(t * 38) * .004 : 0);   // kayarken yana yatar, zemin titretir
  camera.rotation.set(
    player.pitch + viewKick.pitch + sh * .08 * Math.sin(t * 47) + player.slideK * .05,
    player.yaw + spin + viewKick.yaw + sh * .08 * Math.sin(t * 53 + 1),
    viewKick.roll + sh * .06 * Math.sin(t * 37 + 2) - strafe * .018 + slideRoll + (player.alive ? 0 : Math.min(.7, player.deathT * .6)));
  if (tp) {
    // omuz üstü kamera: arkaya ve biraz sağa çekilir, duvara girerse yaklaşır
    camera.updateMatrixWorld();
    tmp.set(.8, .3, 3.2).applyQuaternion(camera.quaternion);
    const len = tmp.length(); tmp.divideScalar(len);
    const hit = rayStatic(eyePos, tmp, len);
    camera.position.copy(eyePos).addScaledVector(tmp, Math.max(.3, hit - .25));
  }
  // VS: ölüyken yaşayan takım arkadaşının arkasından izle
  const spec = spectateTarget();
  if (spec) {
    const pr = spec.proxy;
    tmp.set(Math.sin(pr.yaw) * 3.2, 1.9, Math.cos(pr.yaw) * 3.2);
    camera.position.set(pr.pos.x + tmp.x, pr.pos.y + tmp.y, pr.pos.z + tmp.z);
    camera.rotation.set(-.25, pr.yaw, 0);
  }
  const fovT = aimFov(SETTINGS.fov + (player.dashT > 0 ? 18 : player.slideT > 0 ? 12 : player.sprinting ? 7 : 0) - (sgAiming() ? 12 : 0));
  player.fov += (fovT - player.fov) * Math.min(1, rdt * 10);
  camera.fov = player.fov; camera.updateProjectionMatrix();
  updateMyAvatar(rdt);
}

/* ================= 3. ŞAHIS: KENDİ KARAKTERİN ================= */
let myAvatar = null;
function updateMyAvatar(dt) {
  const tp = SETTINGS.thirdPerson;
  if (!tp) { if (myAvatar) myAvatar.g.visible = false; return; }
  if (!myAvatar) myAvatar = buildAvatar(0xb3110d, '');
  myAvatar.cloth.color.setHex(isVS() ? TEAMS[myTeam()].color : 0xb3110d);
  myAvatar.g.visible = !(isVS() && !player.alive);
  const b = player.body.position, v = player.body.velocity;
  animateAvatar(myAvatar, dt, {
    x: b.x, y: b.y, z: b.z, yaw: player.yaw, pitch: player.pitch, speed: Math.hypot(v.x, v.z),
    w: wpn.cur, block: block.on, alive: player.alive, crouch: player.crouchK, slide: player.slideK,
    swing: sword.phase === 'wind' || sword.phase === 'swing', kick: kickAnim > 0,
  });
}

/* ================= KATANA ANİMASYONU ================= */
const curPose = sword.cur;
function viewBob() {
  const spd = Math.hypot(player.body.velocity.x, player.body.velocity.z);
  const sprintMul = player.sprinting ? 1.5 : 1.0;
  const slideOff = -player.slideK * .07;
  const k = (player.grounded ? Math.min(1.8, spd / 3.8) : 0.4) * sprintMul;
  return {
    x: Math.cos(player.bob) * .016 * k,
    y: Math.sin(player.bob * 2) * .022 * k + slideOff,
    rz: Math.sin(player.bob) * .018 * k + player.slideK * .2
  };
}
function lowerOffset() { return wpn.off * .7 + (player.alive ? 0 : Math.min(1.5, player.deathT * 2)); }
function updateSword(dt) {
  const S = SW[sword.type];
  if (sword.phase === 'wind') {
    sword.t += dt / S.wind; lerpPose(sword.from, S.start, easeOut(Math.min(1, sword.t)), curPose);
    if (sword.t >= 1) { sword.phase = 'swing'; sword.t = 0; }
  } else if (sword.phase === 'swing') {
    sword.t += dt / S.swing; swingPose(sword.type, Math.min(1, sword.t), curPose);
    if (!sword.hitDone && sword.t >= .35) { sword.hitDone = true; if (sword.type !== 'D') doHit(sword.type); }
    if (sword.type === 'S' && !sword.hit2 && sword.t >= .8) { sword.hit2 = true; doHit('S'); }
    if (sword.t >= 1) { sword.phase = 'rec'; sword.t = 0; }
  } else if (sword.phase === 'rec') {
    sword.t += dt / S.rec; lerpPose(S.end, REST, easeOut(Math.min(1, sword.t)), curPose);
    if (sword.queued && sword.t > .12 && !block.on) startSwing(sword.queued);
    else if (sword.t >= 1) sword.phase = 'idle';
  } else {
    const t = performance.now() / 1000;
    const target = player.sprinting && player.grounded ? SPRINT_POSE : REST;
    curPose.p.lerp(target.p, Math.min(1, dt * 8)); curPose.r.lerp(target.r, Math.min(1, dt * 8));
    // nefes alırken yumuşak organik salınım
    curPose.p.y += Math.sin(t * 1.6) * .002; curPose.p.x += Math.sin(t * .8) * .0012; curPose.r.z += Math.sin(t * 1.1) * .0016;
  }
  lerpPose(curPose, BLOCK_POSE, block.k, dispPose);
  if (block.hitT > 0) dispPose.p.z += block.hitT * .25;
  sword.swayX *= Math.pow(.002, dt); sword.swayY *= Math.pow(.002, dt);
  const bob = viewBob();
  swordRoot.position.set(dispPose.p.x + sword.swayX + bob.x, dispPose.p.y + sword.swayY + bob.y - lowerOffset(), dispPose.p.z);
  swordRoot.rotation.set(dispPose.r.x - wpn.off * .8 - sword.swayY * 1.2, dispPose.r.y + sword.swayX * 1.4, dispPose.r.z + (bob.rz || 0) - sword.swayX * 1.6, 'YXZ');
  bladeGrp.scale.z = 1 + ST.swordRange * .3;
  sword.blood = Math.max(0, sword.blood - dt * .03);
  swordModel.userData.bloodMat.opacity = sword.blood * .95;
  updateTrail();
}
