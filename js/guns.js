'use strict';
/* PvP silahları: AK-47 (ana silah) ve tabancalar: Deagle, USP-S (susturuculu), Glock.
   Hepsi veriyle tanımlı: hasar, kafa çarpanı, isabet, geri tepme, ses ve model. Satın alma menüsünden alınır (shop.js). */

const GUNS = {
  ak47: {
    name: 'AK-47', slot: 'primary', mag: 30, rounds: 90, rate: 9.6, auto: true, reload: 2.45,
    dmg: 1.3, pvp: 27, head: 4.2, falloff: 32, spread: .03, ads: .009, moveMul: 2.2, bloom: .14, bloomMax: 1.6,
    recoil: .016, recoilYaw: .006, shake: .05, pose: [.2, -.2, -.46], adsPose: [0, -.088, -.34], adsFov: 16, heavy: false, slideBack: .05,
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
const gunRoots = {}, gunModels = {};
// modeller: gunmodels.js (AK-47, Deagle, USP-S, Glock)
for (const id in GUNS) {
  const root = new THREE.Group(); root.visible = false; vmScene.add(root);
  const m = GM[id === 'ak47' ? 'ak' : id]();
  if (m.sight) GUNS[id].adsPose[1] = -m.sight;   // nişanda gez ve arpacık tam göz hizasında
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
/* ================= SPREY DESENİ (CS tarzı) =================
   Otomatik tüfeklerde her mermi belli bir desene gider: ilk mermiler dimdik yukarı tırmanır, sonra sağa sola salınır.
   Desenin yarısı görüşü kaydırır (namlu kalkar), mermi ise desenin tamamına gider; ateş edenin fareyi aşağı (ve salınıma ters)
   çekerek deseni karşılaması gerekir. Ateş kesilince desen kısa sürede başa döner.
   İsabetsizlik: dururken ilk mermi tam isabet; koşarken çok dağılır, havadayken daha da çok; eğilmek ve nişan almak toplar. */
const SPRAY = {
  ak47: { climb: .12, k: 5.5, sway: .05, s0: 8, f: .36, ph: 0, base: .0035, run: .11, crouch: .62, view: .5 },
  m4: { climb: .085, k: 5, sway: .032, s0: 10, f: .42, ph: Math.PI, base: .0025, run: .09, crouch: .62, view: .5 },
};
const spray = { i: 0, last: 0, w: '' };
function sprayAt(P, i) {
  const up = P.climb * (1 - Math.exp(-i / P.k)), n = i - P.s0;
  const side = n <= 0 ? 0 : Math.sin(n * P.f + P.ph) * P.sway * Math.min(1, n / 4) + Math.max(0, i - 24) * .002;
  return [side, up];
}
// mermi yönü (kameraya göre) ve görüş kayması; camVectors() önceden çağrılmış olmalı
function sprayFire(w, ads) {
  const P = SPRAY[w];
  if (spray.w !== w) { spray.w = w; spray.i = 0; }
  const i = Math.floor(spray.i), [s1, u1] = sprayAt(P, i), [s0, u0] = i > 0 ? sprayAt(P, i - 1) : [0, 0];
  const sp = Math.hypot(player.body.velocity.x, player.body.velocity.z);
  let inacc = P.base + clamp((sp - 1.4) / 3.6, 0, 1) * P.run + Math.min(i, 10) * .0006;
  if (!player.grounded) inacc += .12;
  if (player.crouchK > .5) inacc *= P.crouch;
  if (ads) inacc *= .55;
  const ang = rand(0, 6.28), rr = Math.sqrt(Math.random()) * inacc;
  const dir = camFwd.clone().addScaledVector(rightV, s1 - P.view * s0 + Math.cos(ang) * rr).addScaledVector(upV, u1 - P.view * u0 + Math.sin(ang) * rr).normalize();
  player.pitch = Math.min(1.45, player.pitch + (u1 - u0) * P.view);
  player.yaw -= (s1 - s0) * P.view;
  spray.i = i + 1; spray.last = performance.now();
  return dir;
}
function updateSpray(dt) { if (performance.now() - spray.last > 110) spray.i = Math.max(0, spray.i - dt * 16); }
function fireGun(id) {
  const G = GUNS[id], s = gst[id], m = gunModels[id];
  s.mag--; netFx.sh++; netFx.ft = 0;
  s.kick = 1; s.slide = 1; s.flashT = G.silenced ? .03 : .05;
  m.flash.material.rotation = rand(0, 6.28); m.flash.scale.setScalar(G.silenced ? rand(.08, .12) : rand(.22, .34) * (G.heavy ? 1.4 : 1));
  muzzleGlow = G.silenced ? .25 : G.heavy ? 1.6 : 1;
  sfx[id](); shake(G.shake);
  ejectCasing(m, id === 'ak47' ? 'rifle' : 'pistol'); playerCasing(id); gunKickFor(id);
  if (!G.silenced && typeof flashWorld === 'function') flashWorld(G.heavy ? 3 : 2, 0xffa850, .05);
  const ads = s.adsK > .6;
  if (SPRAY[id]) {
    camVectors();
    const dir = sprayFire(id, ads);
    kickView(rand(-.006, .006), .004);
    muzzleW.copy(eyePos).addScaledVector(rightV, ads ? 0 : .17).addScaledVector(upV, -.1).addScaledVector(camFwd, .6);
    castHeadMul = G.head; castShot(dir, muzzleW.clone(), G.dmg, 1.2, .2, G.falloff, G.pvp); castHeadMul = 0;
    return;
  }
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
}
function updateGuns(dt) {
  const bob = viewBob(), low = lowerOffset(), t = performance.now() / 1000;
  for (const id in GUNS) {
    const G = GUNS[id], s = gst[id], m = gunModels[id], root = gunRoots[id];
    s.cd -= dt; s.bloom = Math.max(0, s.bloom - dt * (G.auto ? 3.5 : 2.2));
    if (id === 'ak47') updateSpray(dt);
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
    const rp = s.reloadT > 0 ? 1 - s.reloadT / G.reload : -1;
    // tabancada boş şarjörde kızak geride kilitli kalır; yeni şarjör takılınca bırakılır
    if (m.slide) m.slide.position.z = (G.slot === 'pistol' && s.mag <= 0 && (rp < 0 || rp < .7) ? 1 : s.slide) * G.slideBack;
    let tilt = 0, cock = 0;
    if (rp >= 0) {
      if (rp > .75 && rp < .95) cock = Math.sin((rp - .75) / .2 * Math.PI);
    }
    const slap = applyMagSwap(m, rp);   // destek eli şarjörü değiştirir (gunanim.js)
    if (m.slide && cock) m.slide.position.z = Math.max(m.slide.position.z, cock * G.slideBack);
    lerpPose(G.restP, G.adsP, s.adsK, gunPose);
    const sprint = player.sprinting && player.grounded ? 1 - s.adsK : 0, bk = 1 - s.adsK * .8;
    root.position.set(gunPose.p.x + sword.swayX + bob.x * bk, gunPose.p.y + sword.swayY + bob.y * bk - low - tilt * .07 - sprint * .06 + Math.sin(t * 1.4) * .0015 + slap * .013,
      gunPose.p.z + s.kick * (G.heavy ? .09 : .05) - cock * .03);
    root.rotation.set(gunPose.r.x + s.kick * (G.heavy ? .45 : G.slot === 'pistol' ? .25 : .07) - wpn.off * .8 + tilt * .35 - sprint * .5,
      gunPose.r.y + sprint * .4, gunPose.r.z - tilt * .8 + sprint * .3, 'YXZ');
  }
}
