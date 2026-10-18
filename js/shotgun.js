'use strict';
/* Pompalı: sol tık geniş saçma, sağ tık tek noktaya odaklı atış, pompalama ve fişek fişek doldurma.
   Boss'tan "Otomatik Pompalı" çıkarsa pompalamadan seri atar. */

const sgRoot = new THREE.Group(); vmScene.add(sgRoot); sgRoot.visible = false;
const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2a16, roughness: .7 });
const shellMat = new THREE.MeshStandardMaterial({ color: 0xa3140f, roughness: .5 });
const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: .9, roughness: .3, envMap: envTex });
function makeShell() {
  const s = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .07, 10), shellMat); s.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.0175, .0175, .018, 10), brassMat); base.position.y = -.04; s.add(base);
  return s;
}
const sg = (() => {
  const g = new THREE.Group();
  const add = (geo, mat, x, y, z, rx = 0, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; parent.add(m); return m; };
  add(new THREE.CylinderGeometry(.022, .022, .78, 10), gunDark, 0, .03, -.42, Math.PI / 2);   // namlu
  add(new THREE.CylinderGeometry(.018, .018, .62, 8), gunMetal, 0, -.022, -.36, Math.PI / 2); // fişek tüpü
  add(new THREE.BoxGeometry(.07, .09, .28), gunMetal, 0, .0, .02);                             // gövde
  add(new THREE.BoxGeometry(.03, .012, .1), gunDark, 0, -.046, .04);                           // doldurma yuvası
  add(new THREE.BoxGeometry(.06, .08, .32), woodMat, 0, -.03, .3, -.12);                       // dipçik
  add(new THREE.BoxGeometry(.05, .13, .06), woodMat, 0, -.09, .13, .35);                       // kabza
  // Sağ el: kabzayı kavrayan taktik el
  if (typeof createTacticalHand === 'function') {
    const rHand = createTacticalHand(false, { grip: 'v', r: .026 });
    rHand.position.set(0, -.085, .13);
    rHand.rotation.x = .35;
    g.add(rHand);
  } else {
    add(new THREE.BoxGeometry(.075, .07, .09), gloveMat, 0, -.1, .14, .3);
    add(new THREE.BoxGeometry(.085, .085, .5), sleeveMat, .02, -.14, .42);
  }
  const pump = new THREE.Group(); pump.position.set(0, -.02, -.3); g.add(pump);
  add(new THREE.CylinderGeometry(.034, .034, .2, 10), woodMat, 0, 0, 0, Math.PI / 2, pump);    // pompa kolu
  // Sol el: pompayı alttan kavrar ya da fişek doldurur
  const hand = new THREE.Group(); g.add(hand);
  if (typeof createTacticalHand === 'function') {
    const lHand = createTacticalHand(true, { grip: 'h', r: .036 });
    lHand.position.set(0, .01, -.02);
    hand.add(lHand);
  } else {
    add(new THREE.BoxGeometry(.075, .07, .1), gloveMat, 0, 0, 0, 0, hand);
    add(new THREE.BoxGeometry(.085, .085, .55), sleeveMat, -.06, -.06, .28, 0, hand);
  }
  const shell = makeShell(); shell.position.set(.01, .045, -.02); shell.rotation.x = Math.PI / 2; shell.visible = false; hand.add(shell);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: 0xffb850, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  flash.position.set(0, .03, -.86); flash.visible = false; g.add(flash);
  sgRoot.add(g);
  return { g, pump, hand, shell, flash, kick: 0, flashT: 0 };
})();
const SG_REST = P([.21, -.22, -.46], [0, .03, 0]);
const SG_AIM = P([.06, -.2, -.42], [0, 0, 0]);          // sağ tık: gözüne doğru kaldırır
const SG_LOAD = P([.2, -.24, -.46], [.25, .35, -.55]);  // doldururken yana yatırır
const sgPose = P([0, 0, 0], [0, 0, 0]);
const HAND_PUMP = new V3(0, -.06, -.3), HAND_PORT = new V3(.01, -.1, .04), HAND_BELT = new V3(-.12, -.3, .12);

const shells = { tube: 6, reserve: 24, cd: 0, pumpT: 0, loadT: 0, loading: false, aimK: 0, loadK: 0 };
const shellCap = () => ST.sgTube;
const LOAD_T = .42;
let sgClick = false, sgClickR = false;
const sgAiming = () => wpn.cur === 'shotgun' && !wpn.next && mouse.right && player.alive && state === 'play';
function startShellReload() {
  if (wpn.cur !== 'shotgun' || shells.loading || shells.tube >= shellCap()) return;
  if (shells.reserve <= 0) { sfx.empty(); return; }
  shells.loading = true; shells.loadT = LOAD_T * ST.sgLoad;
}
function fireShotgun(focused) {
  shells.tube--; netFx.sh++; netFx.ft = focused;
  shells.loading = false;
  sg.kick = 1; sg.flashT = .06; sg.flash.material.rotation = rand(0, 6.28); sg.flash.scale.setScalar(focused ? rand(.35, .45) : rand(.5, .7));
  muzzleGlow = 1.6;
  sfx.shotgun(); shake(.22);
  if (typeof flashWorld === 'function') flashWorld(3.2, 0xff8530, 0.08);
  player.pitch = Math.min(1.45, player.pitch + (focused ? .06 : .045));
  kickView(rand(-.03, .03), .035);
  camVectors();
  muzzleW.copy(camPos).addScaledVector(rightV, focused ? .06 : .2).addScaledVector(upV, -.12).addScaledVector(camFwd, .9);
  // geniş: yakında çok etkili saçılma; odaklı: saçmalar tek noktada toplanır, uzakta da vurur
  const spr = (focused ? .016 : .085 * ST.sgSpread) * (player.grounded ? 1 : 1.25);
  const muzzle = muzzleW.clone();
  for (let i = 0; i < ST.sgPellets; i++) {
    const ang = rand(0, 6.28), rr = Math.sqrt(Math.random()) * spr;
    const d = camFwd.clone().addScaledVector(rightV, Math.cos(ang) * rr).addScaledVector(upV, Math.sin(ang) * rr).normalize();
    castShot(d, muzzle, ST.sgDmg * (focused ? .9 : 1), focused ? 1.6 : 2.4, .35, (focused ? 16 : 6) * ST.sgRange, PVP_DMG.shotgun);
  }
  if (!ST.sgAuto) shells.pumpT = .5;
}
function updateShotgun(dt) {
  shells.cd -= dt;
  if (shells.pumpT > 0) {
    const before = shells.pumpT; shells.pumpT -= dt;
    if (before > .3 && shells.pumpT <= .3) {
      sfx.pump();
      // boş kovan dışarı fırlar
      if (wpn.cur === 'shotgun') { camVectors(); const p = eyePos.clone().addScaledVector(rightV, .25).addScaledVector(camFwd, .5); p.y -= .15; emit(p.x, p.y, p.z, rightV.x * 3 + rand(-.5, .5), 2.5, rightV.z * 3 + rand(-.5, .5), 2, .65, .08, .05, 1.2); }
    }
  }
  if (shells.loading) {
    shells.loadT -= dt;
    if (shells.loadT <= 0) {
      if (shells.reserve > 0 && shells.tube < shellCap()) { shells.tube++; shells.reserve--; sfx.shell(); }
      if (shells.tube >= shellCap() || shells.reserve <= 0) shells.loading = false; else shells.loadT = LOAD_T * ST.sgLoad;
    }
  }
  const active = wpn.cur === 'shotgun' && !wpn.next;
  const canFire = active && player.alive && state === 'play' && shells.pumpT <= 0 && shells.cd <= 0;
  const wantWide = mouse.left || sgClick, wantFocus = sgClickR || (ST.sgAuto && mouse.right && mouse.left);
  if (canFire && (wantWide || wantFocus)) {
    // sağ tık basılıyken sol tık da odaklı atar (nişan alıp ateş)
    const focused = wantFocus || (wantWide && mouse.right);
    if (shells.tube > 0) { fireShotgun(focused); shells.cd = ST.sgAuto ? .24 : .12; }
    else if (shells.reserve > 0) startShellReload();
    else sfx.empty();
  }
  sgClick = false; sgClickR = false;
  if (active && shells.tube <= 0 && shells.reserve > 0 && !shells.loading && shells.pumpT <= 0) startShellReload();

  // ---- animasyon ----
  const bob = viewBob(), low = lowerOffset();
  sg.kick = Math.max(0, sg.kick - dt * 7);
  sg.flashT -= dt; sg.flash.visible = sg.flashT > 0;
  shells.aimK += ((sgAiming() ? 1 : 0) - shells.aimK) * Math.min(1, dt * 12);
  shells.loadK += ((shells.loading ? 1 : 0) - shells.loadK) * Math.min(1, dt * 10);
  // pompalama: kol geri gelir, silah hafif yukarı kalkar
  const pumpK = shells.pumpT > 0 ? Math.sin((1 - shells.pumpT / .5) * Math.PI) : 0;
  sg.pump.position.z = -.3 + pumpK * .14;
  // sol el: pompada ya da fişek takıyor (kemerden fişeği alır, yuvaya iter)
  if (shells.loading) {
    const c = 1 - shells.loadT / (LOAD_T * ST.sgLoad);                 // 0 → 1 tek fişek döngüsü
    const fetch = c < .45 ? easeInOut(c / .45) : 1 - easeInOut((c - .45) / .55);
    sg.hand.position.lerpVectors(HAND_PORT, HAND_BELT, fetch);
    sg.hand.rotation.set(-.3 * fetch, 0, .4 * fetch);
    sg.shell.visible = c > .25;                                          // kemerden aldıktan sonra elde görünür
  } else {
    sg.hand.position.lerp(HAND_PUMP, Math.min(1, dt * 14));
    sg.hand.position.z = -.3 + pumpK * .14;
    sg.hand.rotation.set(0, 0, 0);
    sg.shell.visible = false;
  }
  lerpPose(SG_REST, SG_AIM, shells.aimK, sgPose);
  lerpPose(sgPose, SG_LOAD, shells.loadK, sgPose);
  if (player.sprinting && player.grounded && !shells.loading) { sgPose.r.x -= .35; sgPose.r.y += .4; sgPose.p.y -= .05; }
  sgRoot.position.set(sgPose.p.x + sword.swayX + bob.x, sgPose.p.y + sword.swayY + bob.y - low, sgPose.p.z + sg.kick * .14);
  sgRoot.rotation.set(sgPose.r.x + sg.kick * .38 + pumpK * .08 - wpn.off * .8, sgPose.r.y, sgPose.r.z, 'YXZ');
}
