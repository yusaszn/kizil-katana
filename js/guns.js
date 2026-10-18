'use strict';
/* PvP silahları: AK-47 (ana silah) ve tabancalar: Deagle, USP-S (susturuculu), Glock.
   Hepsi veriyle tanımlı: hasar, kafa çarpanı, isabet, geri tepme, ses ve model. Satın alma menüsünden alınır (shop.js). */

const GUNS = {
  ak47: {
    name: 'AK-47', slot: 'primary', mag: 30, rounds: 90, rate: 9.6, auto: true, reload: 2.45,
    dmg: 1.3, pvp: 27, head: 4.2, falloff: 32, spread: .03, ads: .009, moveMul: 2.2, bloom: .14, bloomMax: 1.6,
    recoil: .016, recoilYaw: .006, shake: .05, pose: [.2, -.2, -.46], adsPose: [0, -.088, -.34], adsFov: 16, heavy: false,
  },
  deagle: {
    name: 'DEAGLE', slot: 'pistol', mag: 7, rounds: 35, rate: 2.3, auto: false, reload: 2.1,
    dmg: 3, pvp: 52, head: 3.2, falloff: 26, spread: .02, ads: .004, moveMul: 4, bloom: .8, bloomMax: 2.5,
    recoil: .06, recoilYaw: .012, shake: .16, pose: [.15, -.15, -.47], adsPose: [0, -.095, -.36], adsFov: 14, heavy: true, slideBack: .05,
  },
  usps: {
    name: 'USP-S', slot: 'pistol', mag: 12, rounds: 24, rate: 5.5, auto: false, reload: 1.9,
    dmg: 1.8, pvp: 33, head: 3, falloff: 30, spread: .006, ads: .002, moveMul: 2.4, bloom: .35, bloomMax: 2,
    recoil: .022, recoilYaw: .004, shake: .03, pose: [.15, -.15, -.47], adsPose: [0, -.098, -.36], adsFov: 14, silenced: true, slideBack: .04,
  },
  glock: {
    name: 'GLOCK', slot: 'pistol', mag: 20, rounds: 120, rate: 7, auto: false, reload: 1.5,
    dmg: 1.2, pvp: 19, head: 2.6, falloff: 18, spread: .016, ads: .007, moveMul: 1.6, bloom: .25, bloomMax: 1.6,
    recoil: .014, recoilYaw: .005, shake: .025, pose: [.15, -.15, -.47], adsPose: [0, -.098, -.36], adsFov: 12, slideBack: .04,
  },
};
const isGun = w => !!GUNS[w];
const PISTOL_TYPES = ['pistol', 'deagle', 'usps', 'glock'];
const gst = {};
for (const id in GUNS) gst[id] = { mag: GUNS[id].mag, reserve: GUNS[id].rounds, reloadT: 0, cd: 0, adsK: 0, kick: 0, flashT: 0, slide: 0, bloom: 0, held: false };
Object.assign(WEAPON_NAMES, { ak47: 'AK-47', deagle: 'DEAGLE', usps: 'USP-S', glock: 'GLOCK' });
Object.assign(WEAPON_SHORT, { ak47: 'AK-47', deagle: 'DEAGLE', usps: 'USP-S', glock: 'GLOCK' });

/* ================= SESLER ================= */
sfx.ak47 = () => { if (!gate('ak', 40)) return; punch(120, .2, .95); nz(.2, 2600, 380, .7, .75); tn('sawtooth', 160, 45, .14, .3); };
sfx.deagle = () => { punch(90, .35, 1.2); nz(.35, 2200, 240, .6, .95); tn('square', 120, 35, .25, .4); nz(.5, 600, 120, .5, .25, 'lowpass'); };
sfx.usps = () => { if (!gate('usp', 40)) return; nz(.09, 1600, 500, 1.2, .35); punch(240, .06, .28); clink(2600, 3400, .04, .06); };
sfx.glock = () => { if (!gate('glk', 40)) return; punch(200, .1, .5); nz(.1, 3800, 900, .8, .5); tn('square', 260, 70, .08, .22); };

/* ================= MODELLER ================= */
const gunWood = new THREE.MeshStandardMaterial({ color: 0x7a4422, roughness: .62 });
const gunSilver = new THREE.MeshStandardMaterial({ color: 0x80848c, metalness: .7, roughness: .28, envMap: envTex });
const gunPoly = new THREE.MeshStandardMaterial({ color: 0x2a2c30, roughness: .45, metalness: .35 });
const gunRubber = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .9 });
function gAdd(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m; }
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), C = (r0, r1, l, s = 12) => new THREE.CylinderGeometry(r0, r1, l, s);
function gunFlash(g, z, y, col = 0xffc060) {
  const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  f.position.set(0, y, z); f.visible = false; g.add(f); return f;
}
const gunRoots = {}, gunModels = {};
function buildAK() {
  const g = new THREE.Group();
  gAdd(g, B(.054, .072, .3), gunMetal, 0, 0, 0);                                   // gövde
  gAdd(g, B(.05, .018, .27), gunDark, 0, .044, .005);                              // toz kapağı
  gAdd(g, C(.025, .025, .27, 12), gunDark, 0, .036, .005, Math.PI / 2).scale.set(1, 1, .45);
  gAdd(g, B(.03, .028, .045), gunDark, 0, .058, -.12);                             // gez
  gAdd(g, B(.03, .012, .02), gunMetal, .034, .018, -.03);                          // kurma kolu
  gAdd(g, B(.062, .058, .2), gunWood, 0, -.006, -.26);                             // alt el kundağı
  gAdd(g, C(.019, .019, .19, 10), gunWood, 0, .04, -.255, Math.PI / 2);            // üst kundak (gaz borusu)
  gAdd(g, B(.03, .045, .03), gunMetal, 0, .03, -.375);                             // gaz bloğu
  gAdd(g, C(.011, .011, .32, 10), gunDark, 0, .01, -.52, Math.PI / 2);             // namlu
  gAdd(g, C(.007, .007, .2, 8), gunDark, 0, .034, -.47, Math.PI / 2);              // gaz borusu ucu
  gAdd(g, B(.008, .05, .01), gunDark, 0, .045, -.62);                               // arpacık
  gAdd(g, new THREE.TorusGeometry(.016, .003, 6, 12), gunDark, 0, .05, -.62);
  gAdd(g, C(.017, .015, .055, 10), gunDark, 0, .01, -.69, Math.PI / 2);            // namlu freni
  const mag = new THREE.Group(); mag.position.set(0, -.04, -.07); g.add(mag);       // kavisli şarjör
  for (let i = 0; i < 4; i++) gAdd(mag, B(.034, .052, .062), gunMetal, 0, -.024 - i * .044, -i * .017 - i * i * .004, -(.08 + i * .13));
  gAdd(g, B(.036, .1, .046), gunDark, 0, -.08, .1, .35);                            // kabza
  gAdd(g, B(.008, .03, .07), gunDark, 0, -.052, .035);                              // tetik korkuluğu
  gAdd(g, B(.045, .07, .26), gunWood, 0, -.028, .3, -.08);                          // dipçik
  gAdd(g, B(.047, .085, .02), gunRubber, 0, -.04, .43, -.08);
  const rH = createTacticalHand(false, { grip: 'v', r: .021 }); rH.position.set(0, -.075, .1); rH.rotation.x = .35; g.add(rH);
  const lH = createTacticalHand(true, { grip: 'h', r: .034 }); lH.position.set(0, -.004, -.26); g.add(lH);
  return { g, mag, flash: gunFlash(g, -.75, .01), muzzleZ: -.75 };
}
function buildPistol(kind) {
  const g = new THREE.Group(), slide = new THREE.Group(); g.add(slide);
  let flashZ;
  if (kind === 'deagle') {
    gAdd(slide, B(.042, .046, .23), gunSilver, 0, .028, -.04);                     // iri kızak
    for (let i = 0; i < 5; i++) gAdd(slide, B(.044, .03, .004), gunDark, 0, .028, .045 + i * .01);   // tırtıklar
    gAdd(slide, B(.026, .008, .2), gunSilver, 0, .055, -.04);                       // üst rampa
    gAdd(slide, B(.006, .014, .01), gunDark, 0, .065, -.14);                        // arpacık
    gAdd(slide, B(.03, .012, .012), gunDark, 0, .063, .06);                         // gez
    gAdd(g, B(.038, .03, .19), gunSilver, 0, -.008, -.045);                         // gövde
    gAdd(g, B(.012, .022, .018), gunDark, 0, .056, .09);                            // horoz
    gAdd(g, B(.04, .115, .055), gunRubber, 0, -.072, .055, .2);                     // kabza
    flashZ = -.17;
  } else if (kind === 'usps') {
    gAdd(slide, B(.032, .034, .19), gunPoly, 0, .022, -.02);
    gAdd(slide, B(.005, .01, .008), gunDark, 0, .043, -.1);
    gAdd(g, B(.03, .026, .17), gunPoly, 0, -.005, -.025);
    gAdd(g, C(.019, .019, .19, 14), gunDark, 0, .02, -.205, Math.PI / 2);          // susturucu
    gAdd(g, C(.02, .02, .012, 14), gunMetal, 0, .02, -.3, Math.PI / 2);
    gAdd(g, B(.033, .105, .047), gunPoly, 0, -.068, .05, .22);
    flashZ = -.31;
  } else {   // glock
    gAdd(slide, B(.032, .036, .18), gunPoly, 0, .022, -.02);
    for (let i = 0; i < 4; i++) gAdd(slide, B(.034, .026, .003), gunDark, 0, .022, .04 + i * .009);
    gAdd(slide, B(.005, .01, .008), gunDark, 0, .044, -.1);
    gAdd(g, B(.03, .026, .16), gunPoly, 0, -.005, -.02);
    gAdd(g, B(.034, .102, .048), gunPoly, 0, -.068, .05, .22);
    for (let i = 0; i < 3; i++) gAdd(g, B(.036, .006, .01), gunDark, 0, -.045 - i * .022, .03 - i * .005);   // parmak oyukları
    flashZ = -.12;
  }
  gAdd(g, B(.007, .025, .05), gunDark, 0, -.03, .01);                               // tetik korkuluğu
  const mag = gAdd(g, B(.026, .09, .034), gunMetal, 0, -.075, .052, .22);
  const hand = createTacticalHand(false, { grip: 'v', r: .02 }); hand.position.set(0, -.064, .05); hand.rotation.x = .22; g.add(hand);
  // destek eli: tabancayı alttan saran sol el
  const sup = createTacticalHand(true, { grip: 'v', r: .024, trigger: false }); sup.position.set(-.02, -.08, .045); sup.rotation.set(.25, .5, 0); g.add(sup);
  return { g, slide, mag, flash: gunFlash(g, flashZ, .022, kind === 'usps' ? 0xffe0a0 : 0xffc060) };
}
for (const id in GUNS) {
  const root = new THREE.Group(); root.visible = false; vmScene.add(root);
  const m = id === 'ak47' ? buildAK() : buildPistol(id);
  root.add(m.g); gunRoots[id] = root; gunModels[id] = m;
  GUNS[id].restP = P(GUNS[id].pose, [0, .03, 0]); GUNS[id].adsP = P(GUNS[id].adsPose, [0, 0, 0]);
}
const gunPose = P([0, 0, 0], [0, 0, 0]);

/* ================= ATEŞ VE ŞARJÖR ================= */
function resetGuns() { for (const id in GUNS) Object.assign(gst[id], { mag: GUNS[id].mag, reserve: GUNS[id].rounds, reloadT: 0, cd: 0, adsK: 0, bloom: 0 }); }
function gunReload() {
  const id = wpn.cur; if (!isGun(id)) return;
  const s = gst[id], G = GUNS[id];
  if (s.reloadT > 0 || s.mag >= G.mag) return;
  if (s.reserve <= 0) { sfx.empty(); return; }
  s.reloadT = G.reload; sfx.reload();
}
const gunAdsFov = () => { let f = 0; for (const id in GUNS) f = Math.max(f, gst[id].adsK * GUNS[id].adsFov); return f; };
function fireGun(id) {
  const G = GUNS[id], s = gst[id], m = gunModels[id];
  s.mag--; netFx.sh++; netFx.ft = 0;
  s.kick = 1; s.slide = 1; s.flashT = G.silenced ? .03 : .05;
  m.flash.material.rotation = rand(0, 6.28); m.flash.scale.setScalar(G.silenced ? rand(.08, .12) : rand(.22, .34) * (G.heavy ? 1.4 : 1));
  muzzleGlow = G.silenced ? .25 : G.heavy ? 1.6 : 1;
  sfx[id](); shake(G.shake);
  if (!G.silenced && typeof flashWorld === 'function') flashWorld(G.heavy ? 3 : 2, 0xffa850, .05);
  const ads = s.adsK > .6;
  player.pitch = Math.min(1.45, player.pitch + G.recoil * (ads ? .75 : 1)); player.yaw += rand(-1, 1) * G.recoilYaw;
  kickView(rand(-.01, .01), G.recoil * .7);
  camVectors();
  const moving = Math.hypot(player.body.velocity.x, player.body.velocity.z) > 2;
  const spr = (ads ? G.ads : G.spread) * (moving ? G.moveMul : 1) * (player.grounded ? 1 : 2.5) * (1 + s.bloom);
  s.bloom = Math.min(G.bloomMax, s.bloom + G.bloom);
  muzzleW.copy(eyePos).addScaledVector(rightV, ads ? 0 : .17).addScaledVector(upV, -.1).addScaledVector(camFwd, .6);
  castHeadMul = G.head;
  castShot(spreadDir(spr), muzzleW.clone(), G.dmg, 1.2, .2, G.falloff, G.pvp);
  castHeadMul = 0;
  // boş kovan sağa fırlar
  const p = eyePos.clone().addScaledVector(rightV, .18).addScaledVector(camFwd, .4); p.y -= .08;
  emit(p.x, p.y, p.z, rightV.x * rand(2, 3.5), rand(2, 3), rightV.z * rand(2, 3.5), 2, .85, .65, .15, 1);
}
function updateGuns(dt) {
  const bob = viewBob(), low = lowerOffset(), t = performance.now() / 1000;
  for (const id in GUNS) {
    const G = GUNS[id], s = gst[id], m = gunModels[id], root = gunRoots[id];
    s.cd -= dt; s.bloom = Math.max(0, s.bloom - dt * (G.auto ? 3.5 : 2.2));
    if (s.reloadT > 0) { s.reloadT -= dt; if (s.reloadT <= 0) { s.reloadT = 0; const n = Math.min(G.mag - s.mag, s.reserve); s.mag += n; s.reserve -= n; } }
    const on = wpn.cur === id;
    root.visible = on && !SETTINGS.thirdPerson;
    if (!on) { s.held = false; continue; }
    const playing = !wpn.next && player.alive && state === 'play' && !vsFrozen() && s.reloadT <= 0;
    if (playing) {
      const want = G.auto ? (mouse.left || rifClick) : (rifClick || (mouse.left && !s.held));
      if (want && s.cd <= 0) {
        if (s.mag > 0) { fireGun(id); s.cd = 1 / G.rate; }
        else if (s.reserve > 0) gunReload(); else { sfx.empty(); s.cd = .3; }
      }
    }
    s.held = mouse.left;
    if (s.mag <= 0 && s.reserve > 0 && s.reloadT <= 0 && !wpn.next) gunReload();
    // ---- animasyon ----
    s.adsK += (((mouse.right && playing) ? 1 : 0) - s.adsK) * Math.min(1, dt * 14);
    s.kick = Math.max(0, s.kick - dt * (G.heavy ? 6 : 11)); s.slide = Math.max(0, s.slide - dt * 15);
    s.flashT -= dt; m.flash.visible = s.flashT > 0;
    if (m.slide) m.slide.position.z = s.slide * G.slideBack;
    const rp = s.reloadT > 0 ? 1 - s.reloadT / G.reload : -1;
    let tilt = 0, drop = 0, cock = 0;
    if (rp >= 0) {
      tilt = Math.sin(rp * Math.PI);
      drop = rp < .3 ? easeOut(rp / .3) * .4 : rp < .68 ? .4 - easeOut((rp - .3) / .38) * .4 : 0;
      if (rp > .75 && rp < .95) cock = Math.sin((rp - .75) / .2 * Math.PI);
    }
    const magY0 = id === 'ak47' ? -.04 : -.075;
    m.mag.position.y = magY0 - drop; m.mag.visible = drop < .35;
    if (m.slide && cock) m.slide.position.z = Math.max(m.slide.position.z, cock * G.slideBack);
    lerpPose(G.restP, G.adsP, s.adsK, gunPose);
    const sprint = player.sprinting && player.grounded ? 1 - s.adsK : 0, bk = 1 - s.adsK * .8;
    root.position.set(gunPose.p.x + sword.swayX + bob.x * bk, gunPose.p.y + sword.swayY + bob.y * bk - low - tilt * .07 - sprint * .06 + Math.sin(t * 1.4) * .0015,
      gunPose.p.z + s.kick * (G.heavy ? .09 : .05) - cock * .03);
    root.rotation.set(gunPose.r.x + s.kick * (G.heavy ? .45 : G.slot === 'pistol' ? .25 : .07) - wpn.off * .8 + tilt * .35 - sprint * .5,
      gunPose.r.y + sprint * .4, gunPose.r.z - tilt * .8 + sprint * .3, 'YXZ');
  }
}
