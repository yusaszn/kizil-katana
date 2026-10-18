'use strict';
/* Oyuncu karakteri (diğer oyuncular ve 3. şahısta sen): yuvarlak hatlı, eklemli siber ninja.
   Kalça → uyluk → diz → baldır → bot; omuz → üst kol → dirsek → ön kol → el. Silahlar sağ elde. */

// silindir + iki küre: yuvarlak uçlu uzuv (three r128'de CapsuleGeometry yok)
function capsule(r, len, mat, seg = 10) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat); g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 8), mat); top.position.y = len / 2; g.add(top);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(r, seg, 8), mat); bot.position.y = -len / 2; g.add(bot);
  body.userData.he = new V3(r, len / 2 + r, r);   // parçalanırken kutu boyutu olarak kullanılır
  g.userData.main = body;
  return g;
}
const AV_MAT = {
  dark: new THREE.MeshStandardMaterial({ color: 0x161211, roughness: .75 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc89d78, roughness: .7 }),
  armor: new THREE.MeshStandardMaterial({ color: 0x1c1918, roughness: .32, metalness: .75, envMap: envTex }),
  steel: new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: .95, roughness: .18, envMap: envTex }),
  red: new THREE.MeshStandardMaterial({ color: 0x99120e, roughness: .6 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xb88e36, metalness: .85, roughness: .35, envMap: envTex }),
  visor: new THREE.MeshBasicMaterial({ color: 0xff3520 }),
  glove: new THREE.MeshStandardMaterial({ color: 0x221815, roughness: .75 }),
  green: new THREE.MeshStandardMaterial({ color: 0x2f4a2a, roughness: .6 }),
};
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }

function buildAvatar(color, name) {
  const M = AV_MAT;
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: .8 });
  const g = new THREE.Group();          // ayak hizası
  const root = new THREE.Group(); g.add(root);   // çömelmede aşağı iner
  const parts = [];
  // ---- bacaklar ----
  const legs = [], knees = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sx * .11, .93, 0); root.add(hip);
    const thigh = capsule(.078, .3, M.dark); thigh.position.y = -.21; hip.add(thigh); parts.push(thigh.userData.main);
    mesh(new THREE.BoxGeometry(.12, .1, .05), M.armor, 0, -.04, .075, thigh);                    // uyluk zırhı
    const knee = new THREE.Group(); knee.position.y = -.42; hip.add(knee);
    mesh(new THREE.SphereGeometry(.062, 10, 8), M.armor, 0, 0, .035, knee);                       // dizlik
    const shin = capsule(.066, .28, M.dark); shin.position.y = -.2; knee.add(shin); parts.push(shin.userData.main);
    const boot = mesh(new THREE.BoxGeometry(.11, .1, .2), M.armor, 0, -.42, .045, knee);
    mesh(new THREE.BoxGeometry(.115, .03, .21), M.red, 0, -.36, .045, knee);                      // bot bağı
    legs.push(hip); knees.push(knee);
    void boot;
  }
  // ---- gövde ----
  const spine = new THREE.Group(); spine.position.y = .95; root.add(spine);
  const pelvis = mesh(new THREE.BoxGeometry(.3, .14, .18), M.dark, 0, 0, 0, spine);
  const belt = mesh(new THREE.BoxGeometry(.32, .06, .2), M.dark, 0, .07, 0, spine);
  mesh(new THREE.BoxGeometry(.07, .055, .21), M.gold, 0, .07, .005, spine);
  const abdomen = capsule(.13, .1, cloth); abdomen.position.y = .2; spine.add(abdomen); parts.push(abdomen.userData.main);
  const chest = mesh(new THREE.BoxGeometry(.38, .3, .21), cloth, 0, .43, 0, spine); chest.userData.he = new V3(.19, .15, .105); parts.push(chest);
  mesh(new THREE.BoxGeometry(.33, .26, .23), M.armor, 0, .43, .004, spine);                       // göğüs zırhı
  mesh(new THREE.BoxGeometry(.06, .25, .235), M.red, 0, .43, .006, spine);                        // kırmızı şerit
  for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(.1, 10, 8), M.armor, sx * .21, .55, 0, spine).scale.set(1, .7, 1);   // omuzluklar
  // sırttaki kın ve kabza (katana elde değilken görünür)
  const sheath = new THREE.Group(); sheath.position.set(0, .4, -.13); sheath.rotation.z = -.6; spine.add(sheath);
  mesh(new THREE.BoxGeometry(.035, .9, .05), M.dark, 0, -.05, 0, sheath);
  mesh(new THREE.BoxGeometry(.04, .06, .055), M.gold, 0, .4, 0, sheath);
  const sheathBlade = mesh(new THREE.CylinderGeometry(.017, .019, .24, 8), M.red, 0, .55, 0, sheath);
  // atkı: boyundan arkaya uçar
  const scarf = new THREE.Group(); scarf.position.set(0, .6, -.09); spine.add(scarf);
  const scarfA = mesh(new THREE.BoxGeometry(.07, .36, .015), M.red, -.04, -.18, 0, scarf);
  const scarfB = mesh(new THREE.BoxGeometry(.06, .3, .015), M.red, .04, -.15, -.01, scarf);
  // ---- kafa ----
  const neck = new THREE.Group(); neck.position.y = .66; spine.add(neck);
  mesh(new THREE.CylinderGeometry(.05, .06, .08, 8), M.skin, 0, .02, 0, neck);
  const head = new THREE.Group(); head.position.y = .17; neck.add(head);
  const skull = mesh(new THREE.SphereGeometry(.125, 14, 12), M.skin, 0, 0, 0, head); skull.userData.he = new V3(.12, .13, .12); parts.push(skull);
  const hood = mesh(new THREE.SphereGeometry(.14, 14, 12, 0, Math.PI * 2, 0, Math.PI * .62), M.dark, 0, .01, -.01, head);
  hood.rotation.x = -.25;
  mesh(new THREE.BoxGeometry(.2, .09, .1), M.armor, 0, -.055, .075, head);                          // yüz maskesi
  mesh(new THREE.BoxGeometry(.17, .028, .03), M.visor, 0, .03, .11, head);                           // parlayan vizör
  mesh(new THREE.CylinderGeometry(.132, .132, .04, 14), M.red, 0, .065, 0, head);                    // alın bandı
  const tails = new THREE.Group(); tails.position.set(0, .06, -.13); head.add(tails);
  mesh(new THREE.BoxGeometry(.025, .2, .01), M.red, -.03, -.1, 0, tails).rotation.z = .2;
  mesh(new THREE.BoxGeometry(.025, .17, .01), M.red, .03, -.085, 0, tails).rotation.z = -.2;
  // ---- kollar ----
  const arms = [], elbows = [], hands = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * .23, 1.4, 0); root.add(sh);
    const upper = capsule(.058, .2, cloth); upper.position.y = -.14; sh.add(upper); parts.push(upper.userData.main);
    const elbow = new THREE.Group(); elbow.position.y = -.3; sh.add(elbow);
    const fore = capsule(.052, .19, M.dark); fore.position.y = -.13; elbow.add(fore); parts.push(fore.userData.main);
    mesh(new THREE.CylinderGeometry(.062, .058, .12, 10), M.armor, 0, -.14, 0, elbow);              // bileklik zırhı
    const hand = new THREE.Group(); hand.position.y = -.28; elbow.add(hand);
    mesh(new THREE.BoxGeometry(.075, .085, .07), M.glove, 0, -.02, 0, hand);
    arms.push(sh); elbows.push(elbow); hands.push(hand);
  }
  // ---- silahlar (sağ elde; namlu elin -Y yönünde, kol öne uzanınca ileri bakar) ----
  const R = hands[1], L = hands[0];
  const along = (w, len, d, mat, parent, off = 0) => mesh(new THREE.BoxGeometry(w, len, d), mat, 0, -len / 2 - off, 0, parent);
  const katana = new THREE.Group(); R.add(katana);
  along(.012, .95, .035, M.steel, katana, .08); mesh(new THREE.CylinderGeometry(.04, .04, .01, 12), M.gold, 0, -.07, 0, katana);
  mesh(new THREE.CylinderGeometry(.018, .018, .2, 8), M.red, 0, .04, 0, katana);
  const uziR = new THREE.Group(); R.add(uziR); along(.05, .26, .07, M.armor, uziR, -.02);
  const uziL = new THREE.Group(); L.add(uziL); along(.05, .26, .07, M.armor, uziL, -.02);
  const sgun = new THREE.Group(); R.add(sgun); along(.05, .9, .07, M.armor, sgun, -.1); mesh(new THREE.BoxGeometry(.05, .22, .07), new THREE.MeshStandardMaterial({ color: 0x4a2a16 }), 0, .12, 0, sgun);
  const rifle = new THREE.Group(); R.add(rifle); along(.055, .85, .09, M.armor, rifle, -.1); mesh(new THREE.BoxGeometry(.035, .12, .06), M.dark, 0, -.15, .06, rifle);
  const sniper = new THREE.Group(); R.add(sniper); along(.05, 1.25, .08, M.green, sniper, -.15); mesh(new THREE.CylinderGeometry(.03, .03, .26, 8), M.armor, 0, -.2, .07, sniper);
  const pistol = new THREE.Group(); R.add(pistol); along(.04, .18, .07, M.armor, pistol, .0);
  const blade = new THREE.Group(); R.add(blade); along(.01, .22, .03, M.steel, blade, .06); along(.02, .08, .025, M.dark, blade, -.02);
  const rocket = new THREE.Group(); R.add(rocket);
  const tube = mesh(new THREE.CylinderGeometry(.065, .065, 1.0, 12), M.green, 0, -.3, 0, rocket); tube.rotation.x = 0;
  const launcher = new THREE.Group(); R.add(launcher);
  mesh(new THREE.CylinderGeometry(.075, .075, .14, 10), M.armor, 0, -.12, 0, launcher); along(.06, .42, .06, M.armor, launcher, .1);
  // ---- isim ----
  let label = null;
  if (name) { label = nameSprite(name, color); label.position.y = 2.25; g.add(label); }
  scene.add(g);
  return { g, root, legs, knees, arms, elbows, hands, spine, neck, head, scarf, tails, katana, uziL, uziR, sgun, rifle, sniper, pistol, blade, rocket, launcher, sheathBlade, label, cloth, parts, phase: 0, swingK: 0, crouchK: 0, kickK: 0 };
}

// s: { x,y,z, yaw, pitch, speed, w, block, alive, crouch, swing, kick }
function animateAvatar(av, dt, s) {
  const k = (rate) => Math.min(1, dt * rate);
  av.g.position.set(s.x, s.y - .5, s.z);
  av.g.rotation.y = s.yaw + Math.PI;
  av.g.rotation.x += ((s.alive ? 0 : -1.45) - av.g.rotation.x) * k(6);
  av.phase += dt * (3.5 + Math.min(s.speed, 15) * 1.25);
  const mv = Math.min(1, s.speed / 4), run = Math.min(1, Math.max(0, (s.speed - 6) / 6));
  const ph = av.phase, sw = Math.sin(ph);
  av.crouchK += ((s.crouch || 0) - av.crouchK) * k(12);
  av.kickK += ((s.kick ? 1 : 0) - av.kickK) * k(s.kick ? 30 : 10);
  av.slideK = (av.slideK || 0) + ((s.slide || 0) - (av.slideK || 0)) * k(14);
  const c = av.crouchK * (1 - av.slideK), sl = av.slideK;
  // ---- bacaklar: yürürken diz bükülür, çömelince kalça iner ----
  av.root.position.y = -c * .32 + Math.abs(Math.cos(ph)) * .035 * mv * (1 - sl) - sl * .55;
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1, p = ph + (i ? Math.PI : 0);
    let hip = Math.sin(p) * (.55 + run * .35) * mv - c * 1.05;
    let knee = (.1 + Math.max(0, Math.sin(p + 1.6)) * (.8 + run * .6)) * mv + c * 1.75;
    // kayma: ön bacak dümdüz öne uzanır, arka bacak altta katlanır
    if (sl > .02) { const fh = i ? -1.45 : -.15, fk = i ? .12 : 2.0; hip = hip * (1 - sl) + fh * sl; knee = knee * (1 - sl) + fk * sl; }
    if (i === 1 && av.kickK > .02) { hip = hip * (1 - av.kickK) - 1.65 * av.kickK; knee = knee * (1 - av.kickK) + .1 * av.kickK; }
    av.legs[i].rotation.x += (hip - av.legs[i].rotation.x) * k(16);
    av.knees[i].rotation.x += (knee - av.knees[i].rotation.x) * k(16);
    av.legs[i].rotation.z = side * .03;
  }
  // ---- gövde ve kafa: nişan alınan yöne eğilir, koşarken öne yatar ----
  av.spine.rotation.x += (((run * .22 + c * .25) * (1 - sl) - sl * .5 - s.pitch * .25) - av.spine.rotation.x) * k(10);   // kayarken geriye yaslanır
  av.spine.rotation.y = Math.sin(ph) * .08 * mv;
  av.head.rotation.x = -s.pitch * .55 - av.spine.rotation.x * .5;
  av.scarf.rotation.x = .3 + sl * .5 + mv * .6 + Math.sin(ph * 2) * .15 * mv + Math.sin(performance.now() / 400) * .05;
  av.tails.rotation.x = .3 + mv * .5;
  // ---- silah görünürlüğü ----
  const w = s.w, melee = w === 'katana' || isKnife(w), uzi = w === 'uzi', two = w === 'shotgun' || w === 'm4' || w === 'ak47' || w === 'awp' || w === 'rocket' || w === 'launcher';
  av.katana.visible = w === 'katana'; av.uziL.visible = av.uziR.visible = uzi; av.sgun.visible = w === 'shotgun';
  const pis = PISTOL_TYPES.includes(w);
  av.rifle.visible = w === 'm4' || w === 'ak47'; av.sniper.visible = w === 'awp'; av.pistol.visible = pis; av.blade.visible = isKnife(w);
  av.rocket.visible = w === 'rocket'; av.launcher.visible = w === 'launcher';
  if (av.sheathBlade) av.sheathBlade.visible = w !== 'katana';
  // ---- kollar ----
  av.swingK = s.swing ? Math.min(1, av.swingK + dt * 7) : Math.max(0, av.swingK - dt * 5);
  const aim = -1.45 - s.pitch;
  let sR = [-.2 + sw * .45 * mv, 0, 0], eR = -.35, sL = [-.2 - sw * .45 * mv, 0, 0], eL = -.35;   // [x, y, z]
  if (s.block) { sR = [-1.6, 0, -.5]; eR = -1.4; sL = [-1.5, 0, .4]; eL = -1.4; }
  else if (uzi || PISTOL_TYPES.includes(w)) { sR = [aim, 0, .1]; eR = -.1; sL = uzi ? [aim, 0, -.1] : [aim + .1, 0, .45]; eL = uzi ? -.1 : -.5; }
  else if (two) { sR = [aim + .25, 0, .2]; eR = -.55; sL = [aim + .05, 0, -.55]; eL = -.25; }
  else if (av.swingK > 0) {
    const a = Math.sin(av.swingK * Math.PI);
    sR = [-1.8 + a * .6, 0, a * 1.5 - .7]; eR = -.4 - a * .4; sL = [-.4, 0, -.2]; eL = -.6;
  } else if (melee) { sR = [-.75 + sw * .25 * mv, 0, .1]; eR = -.9; }
  if (sl > .3 && !s.block) { sL = [.55, 0, .55]; eL = -.15; }   // kayarken boştaki el zemine uzanır
  for (let i = 0; i < 2; i++) {
    const t = i ? sR : sL, e = i ? eR : eL;
    av.arms[i].rotation.x += (t[0] - av.arms[i].rotation.x) * k(14);
    av.arms[i].rotation.y += (t[1] - av.arms[i].rotation.y) * k(14);
    av.arms[i].rotation.z += (t[2] - av.arms[i].rotation.z) * k(18);
    av.elbows[i].rotation.x += (e - av.elbows[i].rotation.x) * k(14);
  }
  // silah eli: tüfeklerde namlu ileri baksın
  av.hands[1].rotation.x = two || uzi || PISTOL_TYPES.includes(w) ? -.05 : melee ? -.3 : 0;
}
