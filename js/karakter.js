'use strict';
/* Oyuncu karakteri: iskeletli insan modeli (modeller/karakter.glb, Quaternius CC0, 62 kemik, 17 animasyon).
   Diğer oyuncular, 3. şahısta sen ve 1. şahısta aşağı bakınca kendi bacakların bu modeldir.
   - Bacaklar animasyondan: durma, yürüme, koşu (ileri / geri / sağ / sol), tekme, kılıçla bekleme ve vuruş
   - Silah: oyundaki gerçek silah modelleri omza / göğüs önüne yerleşir; iki kol ters kinematikle (IK) kabzaya ve kundağa
     uzanır, parmaklar kavrar; gövde ve baş bakış yönüne eğilir. Kılıç ve bıçak sağ elde, animasyonla sallanır.
   - Eğilme, kayma, havada (zıplama / düşme): bacak ve gövde pozları animasyonun üstüne eklenir
   - Ölüm: ragdoll. Her uzuv bir fizik gövdesi, eklemler sınırlı açıyla bağlı; ceset gerçek fizikle yığılır.
   Model yüklenmeden önce eski eklemli kutu karakter kullanılır (avatar.js), yüklenince kendiliğinden değişir.
   Kemik yönleri modele göre değiştiği için bütün pozlar dünya uzayında hesaplanır (kemik ekseninden bağımsız). */

const CHAR_H = 1.78;
const CHAR_HIP = .98;   // kalça ekleminin yerden yüksekliği (oturma pozu)
const _cv1 = new V3(), _cv2 = new V3(), _cv3 = new V3(), _cq1 = new THREE.Quaternion(), _cq2 = new THREE.Quaternion(), _cm = new THREE.Matrix4();

/* ================= KEMİK YARDIMCILARI (dünya uzayında) ================= */
const wpos = (b, out = new V3()) => b.getWorldPosition(out);
// kemiği dünya uzayında q kadar döndür (yerel dönüşe çevirerek)
function boneRotateWorld(bone, q) {
  bone.getWorldQuaternion(_cq1); bone.parent.getWorldQuaternion(_cq2);
  bone.quaternion.copy(_cq2.invert().multiply(q).multiply(_cq1));
  bone.updateMatrixWorld(true);
}
// kemiği (child yönü) dünya yönü dir'e en kısa dönüşle çevir
function boneAim(bone, child, dir) {
  const a = wpos(bone, _cv1), b = wpos(child, _cv2);
  const cur = b.sub(a).normalize();
  boneRotateWorld(bone, new THREE.Quaternion().setFromUnitVectors(cur, dir.clone().normalize()));
}
// iki vektörle yönlendirme: kemikten c1'e giden yön d1'e, (p1 → p2) yönü d2'ye hizalanır
function boneOrient(bone, c1, p1, p2, d1, d2) {
  const o = wpos(bone, new V3()), v1 = wpos(c1, new V3()).sub(o).normalize();
  const v2 = wpos(p2, new V3()).sub(wpos(p1, new V3()));
  const basis = (a, b) => { const x = a.clone().normalize(), z = x.clone().cross(b).normalize(), y = z.clone().cross(x); return new THREE.Matrix4().makeBasis(x, y, z); };
  const R = basis(d1, d2).multiply(basis(v1, v2).transpose());
  boneRotateWorld(bone, new THREE.Quaternion().setFromRotationMatrix(R));
}
// iki kemikli IK: omuzdan (upper) hedefe; dirsek pole yönüne bükülür
function ikArm(upper, lower, hand, target, pole) {
  const S = wpos(upper, new V3()), E0 = wpos(lower, new V3()), H0 = wpos(hand, new V3());
  const L1 = S.distanceTo(E0), L2 = E0.distanceTo(H0);
  const toT = target.clone().sub(S); let d = toT.length();
  d = clamp(d, Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
  const n = toT.normalize(), a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const p = pole.clone().addScaledVector(n, -n.dot(pole)).normalize();
  const E = S.clone().addScaledVector(n, a).addScaledVector(p, h);
  boneAim(upper, lower, E.clone().sub(S));
  boneAim(lower, hand, target.clone().sub(wpos(lower, new V3())));
}

/* ================= MODEL ================= */
// three'nin GLTF yükleyicisi düğüm adlarındaki noktayı siler ('LowerLeg.L' → 'LowerLegL'): iki adla da erişilsin
function boneMap(obj) {
  const B = {};
  obj.traverse(o => { if (!o.isBone) return; B[o.name] = o; const m = /^(.+?)([LR])$/.exec(o.name); if (m) B[m[1] + '.' + m[2]] = o; });
  return B;
}
/* KOSTÜMLER: aynı 62 kemikli iskeleti kullanan Quaternius (CC0) karakterleri. Animasyonlar hep karakter.glb'den gelir
   (kemik adlarıyla bağlanır). team: takım rengine boyanan malzemeler (hepsi tek malzemede birleşir: av.cloth),
   tint: sabit renk değişiklikleri. Standart dışındaki kostümler ilk giyildiğinde ayrı dosyadan yüklenir (js/kostum-<ad>.js). */
const CHAR_COSTUMES = {
  std: { name: 'SAVAŞÇI', model: 'karakter', team: ['Green'], tint: { LightGreen: 0x1c1c1d, Brown: 0x19191c, Brown2: 0x141416 } },
  kukuleta: { name: 'KUKULETALI SUİKASTÇI', model: 'kostum_kukuleta', team: ['LightBrown'], tint: { Brown: 0x221a14, Brown2: 0x16110d, DarkBrown: 0x1a1410 } },
  kral: { name: 'KRAL', model: 'kostum_kral', team: ['Blue'], tint: {} },
  golge: { name: 'GÖLGE', model: 'karakter', team: ['Green'], tint: { LightGreen: 0x0b0b0c, Brown: 0x0e0e10, Brown2: 0x0a0a0b, Black: 0x060606, Grey: 0x18181a, Hair: 0x0b0b0b, Eyebrows: 0x0b0b0b } },
  colkurdu: { name: 'ÇÖL KURDU', model: 'kostum_kukuleta', team: ['LightBrown'], tint: { Black: 0xa8916a, DarkBrown: 0x6e5a3e, Brown: 0x4a3a28, White: 0xd8cdb4 } },
  karakral: { name: 'KARA KRAL', model: 'kostum_kral', team: ['Blue'], tint: { Metal: 0x26262a, Metal_Dark: 0x101012, Beige: 0x1c1c20, DarkBrown: 0x121214, Hair_White: 0x2a2a2a } },
  // Sketchfab karakterleri (CC-BY): kendi iskeletleri var, ext ile görünmez kukla iskeletin pozunu kopyalarlar
  ksk: { name: 'KSK OPERATÖRÜ', model: 'kostum_ksk', ext: 'mixamo', team: [], tint: {} },
  asker: { name: 'PİYADE', model: 'kostum_asker', ext: 'mixamo', team: [], tint: {} },
  futurist: { name: 'ÖNCÜ (GELECEK)', model: 'kostum_futurist', ext: 'mixamo', team: [], tint: {} },
};
const COSTUME_LIST = Object.keys(CHAR_COSTUMES);
const CHAR_SRCS = {};   // kostüm → { scene, clips, k: ölçek, minY: zemin }
function charSource(cs = 'std') {
  const def = CHAR_COSTUMES[cs] || CHAR_COSTUMES.std;
  if (CHAR_SRCS[cs]) return CHAR_SRCS[cs];
  const base = MODELS.karakter, src = MODELS[def.model];
  if (!base) return null;
  if (!src) { modelYukle(def.model); return null; }
  if (def.ext) return (CHAR_SRCS[cs] = { scene: base.scene, clips: base.clips, k: charSource().k, minY: charSource().minY, def, ext: src });   // kukla: standart iskelet
  src.scene.updateMatrixWorld(true);
  const box = new THREE.Box3(); src.scene.traverse(o => { if (o.isBone) box.expandByPoint(o.getWorldPosition(new V3())); });
  // kemikler başın tepesini değil boynu / kafa kökünü verir: gerçek boy kafa kökünden ~%9 fazla
  const h = (box.max.y - box.min.y) * 1.09;
  return (CHAR_SRCS[cs] = { scene: src.scene, clips: base.clips, k: CHAR_H / h, minY: box.min.y, def });
}
// kendi kostümüm (tarayıcıda saklanır)
let myCostume = (() => { try { const c = localStorage.getItem('kk-kostum'); return CHAR_COSTUMES[c] ? c : 'std'; } catch (e) { return 'std'; } })();
function setCostume(cs) { if (!CHAR_COSTUMES[cs]) return; myCostume = cs; try { localStorage.setItem('kk-kostum', cs); } catch (e) { /* bu oturumda geçerli */ } charSource(cs); }
function charInstance(color, cs = 'std') {
  const S = charSource(cs) || charSource(); if (!S) return null;
  const def = S.def;
  const obj = THREE.SkeletonUtils.clone(S.scene);
  const root = new THREE.Group(); root.add(obj);
  obj.scale.multiplyScalar(S.k); obj.position.y = -S.minY * S.k;
  const bones = boneMap(obj), mats = {}, upper = [], lower = [];
  obj.traverse(o => {
    if (!o.isMesh) return;
    // üst gövde ve baş ağları (1. şahısta gizlenir): düğüm adı ağın kendisinde ya da bir üstündeki grupta
    if (/Body|Head/.test(o.name + ' ' + (o.parent ? o.parent.name : ''))) upper.push(o); else lower.push(o);
    o.frustumCulled = false; o.castShadow = false;
    const list = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
      // takım rengi alan malzemeler tek bir malzemede birleşir (av.cloth); diğerleri kostümün sabit renkleri
      const key = def.team.includes(m.name) ? '__team' : m.name;
      if (!mats[key]) {
        const c = mats[key] = m.clone();
        if (key === '__team') { c.color.setHex(color); c.name = 'team'; }
        else if (def.tint[m.name] !== undefined) { c.color.setHex(def.tint[m.name]); c.roughness = .95; }
        c.roughness = Math.max(c.roughness, .7);
      }
      return mats[key];
    });
    o.material = Array.isArray(o.material) ? list : list[0];
  });
  const mixer = new THREE.AnimationMixer(obj);
  // ayak kemikleri bacak zincirinde değil (ayrı IK hedefi): bağlama pozunda baldıra göre yerleri saklanır.
  // İki klip karışırken bacak dönmeleri ve ayak hedefi ayrı ayrı harmanlanır, ayak dizden kopabilir; bu yüzden
  // her karede ayağın yeri baldırın ucundan hesaplanır, yalnız açısı klipten alınır.
  root.updateMatrixWorld(true);
  const footRel = {};
  for (const sd of ['L', 'R']) { const sh = bones['LowerLeg.' + sd], ft = bones['Foot.' + sd]; if (sh && ft) footRel[sd] = sh.worldToLocal(ft.getWorldPosition(new V3())); }
  // her kemiğin dinlenme dönüşümü: her karede önce buna dönülür, sonra klip ve pozlar uygulanır (pozlar birikmesin)
  const rest = []; obj.traverse(o => { if (o.isBone) rest.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]); });
  // 1. şahısta bacaklar kameraya yapışık oyuncu ışığıyla çok yakından aydınlanır: koyu kopyalar kullanılır
  for (const m of lower) { m.userData.mat3 = m.material; const list = (Array.isArray(m.material) ? m.material : [m.material]).map(x => { const c = x.clone(); c.color.multiplyScalar(.45); c.roughness = 1; c.envMapIntensity = 0; return c; }); m.userData.mat1 = Array.isArray(m.material) ? list : list[0]; }
  const C = { root, obj, bones, mats, mixer, rest, upper, lower, footRel, src: S, clips: S.clips, actions: {}, cur: null, curName: '', oneShot: null, oneT: 0 };
  if (S.ext) extSetup(C, S, color);
  return C;
}

/* ================= SİLAHLAR (3. şahıs) ================= */
// grip: sağ el, sup: sol el (silah modelinin kendi uzayında), butt: dipçik ucu (omza dayanır), s: dünya ölçeği
const TP_GUN = {
  m4: { make: () => GM.m4({ hands: false }), grip: [0, -.088, .093], sup: [0, .012, -.3], butt: .44, s: .73, rifle: true },
  ak47: { make: () => GM.ak({ hands: false }), grip: [0, -.075, .135], sup: [0, -.006, -.28], butt: .452, s: .73, rifle: true },
  fenek: { make: () => GM.fenek({ hands: false }), grip: [0, -.09, .07], sup: [0, .012, -.238], butt: .424, s: .73, rifle: true },
  awp: { make: () => GM.awp({ hands: false }), grip: [0, -.07, .118], sup: [0, -.022, -.23], butt: .475, s: .73, rifle: true },
  shotgun: { make: () => GM.r870({ hands: false }), grip: [0, -.088, .235], sup: [0, -.022, -.3], butt: .482, s: .73, rifle: true },
  launcher: { make: () => GM.m79({ hands: false }), grip: [0, -.045, .135], sup: [0, -.05, -.16], butt: .47, s: .73, rifle: true },
  rocket: { make: () => GM.rpg({ hands: false }), grip: [0, -.085, .03], sup: [0, -.08, -.218], butt: .1, s: .73, rocket: true },
  pistol: { make: () => GM.beretta({ hands: false }), grip: [0, -.055, .075], sup: [-.02, -.073, .068], s: 1, pistol: true },
  deagle: { make: () => GM.deagle({ hands: false }), grip: [0, -.06, .09], sup: [-.02, -.078, .082], s: 1, pistol: true },
  usps: { make: () => GM.usps({ hands: false }), grip: [0, -.055, .075], sup: [-.02, -.073, .068], s: 1, pistol: true },
  glock: { make: () => GM.glock({ hands: false }), grip: [0, -.055, .077], sup: [-.02, -.073, .07], s: 1, pistol: true },
  uzi: { make: () => GM.uzi(1, { hands: false }), grip: [0, -.088, .04], sup: [-.02, -.12, .045], s: 1, pistol: true },
};
// ax: oyuncunun eklenti kodu (aparat.js apNetCode); silah eklentileriyle kurulur, ÇİFT UZİ / ÇİFTE FENEK iki silahtır
function tpGun(av, w, ax = '') {
  const C = av.char; if (!TP_GUN[w]) return null;
  const key = w + '|' + ax;
  if (!C.guns[key]) {
    const def = TP_GUN[w], set = [], sel = typeof apNetParse === 'function' ? apNetParse(ax) : {}, dual = sel.bonus === 'cift' && (w === 'uzi' || w === 'fenek');
    for (let i = 0; i < (dual ? 2 : 1); i++) {
      const m = def.make(); m.g.scale.setScalar(def.s);
      if (typeof apDress === 'function' && AP_CLS[w]) apDress(w, m, sel, true);
      if (m.flash) m.flash.visible = false;
      if (m.gl) m.gl.visible = false;
      av.g.add(m.g); set.push(m.g);
    }
    set.dual = dual;
    C.guns[key] = set;
  }
  return C.guns[key];
}
// kılıç ve bıçak: sağ ele bağlanır
function tpBlade(av, w) {
  const C = av.char, key = w === 'katana' ? 'katana' : 'knife';
  if (!C.blades[key]) {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: 0xd4dbe3, metalness: .9, roughness: .22, envMap: envTex });
    const dark = new THREE.MeshStandardMaterial({ color: 0x151213, roughness: .7 });
    if (key === 'katana') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(.008, .03, .72), steel); blade.position.z = -.44; g.add(blade);
      const tsuba = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .008, 16), dark); tsuba.rotation.x = Math.PI / 2; tsuba.position.z = -.075; g.add(tsuba);
      const tsuka = new THREE.Mesh(new THREE.CylinderGeometry(.016, .017, .24, 10), new THREE.MeshStandardMaterial({ color: 0x7a1410, roughness: .8 })); tsuka.rotation.x = Math.PI / 2; tsuka.position.z = .04; g.add(tsuka);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(.006, .025, .18), steel); blade.position.z = -.14; g.add(blade);
      const h = new THREE.Mesh(new THREE.BoxGeometry(.02, .028, .1), dark); h.position.z = -.0; g.add(h);
    }
    av.g.add(g); C.blades[key] = g;
  }
  return C.blades[key];
}

/* ================= KURULUM ================= */
function buildCharAvatar(color, name) {
  const g = new THREE.Group(); scene.add(g);
  const av = { g, color, char: null, label: null, cloth: null, parts: [], phase: 0, vel: new V3(), lastP: null, airK: 0, crouchK: 0, slideK: 0, swingK: 0, kickK: 0 };
  attachChar(av);
  if (name) { av.label = nameSprite(name, color); av.label.position.y = 2.25; g.add(av.label); }
  return av;
}
function attachChar(av) {
  const C = charInstance(av.color, av.costume || 'std'); if (!C) return false;
  if (!charSource(av.costume || 'std')) av.costume = 'std';   // kostüm henüz yüklenmediyse standartla başla, gelince değişir
  av.g.add(C.root); av.char = C; C.guns = {}; C.blades = {};
  av.cloth = C.mats.__team || new THREE.MeshStandardMaterial();
  // dinlenme ölçüleri (IK için)
  const B = C.bones;
  C.root.updateMatrixWorld(true);
  return true;
}
// kostüm değiştir: eski model çıkar, yenisi aynı avatar nesnesine takılır (takım rengi korunur). Model yüklenmediyse bekler.
function costumeSwap(av, cs) {
  if (!CHAR_COSTUMES[cs] || !charSource(cs)) return;
  const col = av.cloth ? av.cloth.color.getHex() : av.color;
  if (av.char) av.g.remove(av.char.root);
  av.char = null; av.costume = cs; av.color = col;
  attachChar(av);
}
// eski kutu karakteri yeni modele çevir (model sonradan yüklendiyse); av nesnesinin kimliği korunur
function upgradeAvatar(av) {
  if (av.char || !charSource()) return;
  const color = av.cloth ? av.cloth.color.getHex() : 0xb3110d;
  const label = av.label, old = av.g;
  const nu = buildCharAvatar(color, '');
  nu.g.position.copy(old.g ? old.g.position : old.position); nu.g.visible = old.visible;
  scene.remove(old);
  if (label) { old.remove(label); nu.g.add(label); }
  Object.assign(av, { g: nu.g, char: nu.char, cloth: nu.cloth, parts: [], blocky: false, label, phase: 0, vel: new V3(), lastP: null, airK: 0, crouchK: 0, slideK: 0, swingK: 0, kickK: 0 });
}

/* ================= ANİMASYON ================= */
function charPlay(C, name, { fade = .2, speed = 1, once = false } = {}) {
  const clip = C.clips[name]; if (!clip) return null;
  let a = C.actions[name]; if (!a) a = C.actions[name] = C.mixer.clipAction(clip);
  a.timeScale = speed;
  if (C.curName === name && !once) return a;
  a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); a.clampWhenFinished = once; a.play();
  if (C.cur && C.cur !== a) C.cur.crossFadeTo(a, fade, false);
  C.cur = a; C.curName = name;
  return a;
}
const GUN_W = w => !!TP_GUN[w];
// s: { x,y,z, yaw, pitch, speed, w, block, alive, crouch, slide, swing, kick, air?, legsOnly? }
function animateCharAvatar(av, dt, s) {
  const C = av.char, B = C.bones, k = r => Math.min(1, dt * r);
  av.g.position.set(s.x, s.y - .5, s.z);
  av.g.rotation.set(0, s.yaw + Math.PI, 0);
  av.g.updateMatrixWorld(true);   // kemik hesapları güncel dünya matrisiyle yapılsın
  // hız: konum farkından (ağdaki oyuncular için de çalışır)
  if (av.lastP && dt > 0) { _cv1.set(s.x - av.lastP.x, s.y - av.lastP.y, s.z - av.lastP.z).divideScalar(dt); av.vel.lerp(_cv1, k(10)); }
  av.lastP = av.lastP || new V3(); av.lastP.set(s.x, s.y, s.z);
  if (s.sit) av.vel.set(0, 0, 0);   // oturağa geçerken konum sıçraması koşu sanılmasın
  const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw), rx = Math.cos(s.yaw), rz = -Math.sin(s.yaw);
  const vf = av.vel.x * fx + av.vel.z * fz, vs = av.vel.x * rx + av.vel.z * rz, hs = Math.hypot(vf, vs);
  const air = s.air !== undefined ? s.air : Math.abs(av.vel.y) > 2.2;
  // kayma değeri sayıdır (oyuncuda yavaşça sıfıra iner, tam 0 olmaz): eşikle karar ver, sayı olarak yumuşat
  const slideIn = Math.min(1, +s.slide || 0);
  av.airK += ((air && slideIn < .3 ? 1 : 0) - av.airK) * k(8);
  av.crouchK += ((s.crouch || 0) - av.crouchK) * k(12);
  av.slideK += ((slideIn > .05 ? slideIn : 0) - av.slideK) * k(14);
  if (av.slideK < .002) av.slideK = 0;
  const w = s.w, melee = w === 'katana' || isKnife(w), gun = GUN_W(w);
  // ---- temel animasyon (bacaklar ve yürüyüş) ----
  if (!s.alive) { /* ölüm: ragdoll ayrı kopyada */ }
  else if (C.oneShot && C.oneT > 0) { C.oneT -= dt; if (C.oneT <= 0) C.oneShot = null; }
  else if (s.kick && !s.legsOnly) { charPlay(C, 'Kick_Right', { once: true, fade: .08, speed: 1.6 }); C.oneShot = 'kick'; C.oneT = .45; }
  else if (s.swing && melee && !av.swung) { charPlay(C, 'Sword_Slash', { once: true, fade: .06, speed: 1.9 }); C.oneShot = 'swing'; C.oneT = .38; }
  else if (hs > .6 && av.slideK < .2) {
    // yan ve çapraz hareket: modeldeki yan koşu klipleri gövdeyi tamamen yana çevirir; onun yerine ileri / geri koşu
    // oynatılır, bacaklar hareket yönüne döner (en fazla ~75°), gövde nişan yönünde kalır (aşağıda)
    const back = vf < -Math.abs(vs) * .35;
    const name = back ? 'Run_Back' : hs < 3.2 || av.crouchK > .5 ? 'Walk' : 'Run';
    charPlay(C, name, { speed: clamp(hs / (name === 'Walk' ? 1.8 : 5.5), .5, 1.9) });
  } else charPlay(C, melee ? 'Idle_Sword' : 'Idle', { fade: .3 });
  // bacak yönü: hareket yönünün bakış yönüne açısı (geri giderken arkaya göre)
  let legYaw = 0;
  if (hs > .6 && av.slideK < .2) { const ang = Math.atan2(vs, vf); legYaw = clamp(Math.abs(ang) > Math.PI * .6 ? (ang > 0 ? ang - Math.PI : ang + Math.PI) : ang, -1.3, 1.3); }
  av.legYaw = (av.legYaw || 0) + (legYaw - (av.legYaw || 0)) * k(8);
  av.swung = !!s.swing;
  // pozlar birikmesin diye her karede önce bir önceki karenin klip pozuna dönülür (dinlenme pozuna değil: three'nin
  // karıştırıcısı değeri değişmeyen izi kemiğe yeniden yazmaz, sabit izli kemik dinlenmede takılı kalırdı)
  for (const [b, p, q, sc] of C.snap || C.rest) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(sc); }
  C.mixer.update(dt);
  if (!C.snap) C.snap = C.rest.map(([b]) => [b, new V3(), new THREE.Quaternion(), new V3()]);
  for (const e of C.snap) { e[1].copy(e[0].position); e[2].copy(e[0].quaternion); e[3].copy(e[0].scale); }
  C.root.updateMatrixWorld(true);
  // ---- ayakların baldıra göre yeri (pozdan önce) ----
  const feet = ['L', 'R'].map(sd => {
    const shin = B['LowerLeg.' + sd], foot = B['Foot.' + sd];
    shin.updateMatrixWorld(true); foot.updateMatrixWorld(true);
    const qs = shin.getWorldQuaternion(new THREE.Quaternion()), qf = foot.getWorldQuaternion(new THREE.Quaternion());
    return { shin, foot, relPos: C.footRel[sd], relQ: qs.invert().multiply(qf) };
  });
  const gq = av.g.getWorldQuaternion(new THREE.Quaternion());
  const RIGHT = new V3(1, 0, 0).applyQuaternion(gq).negate(), UPW = new V3(0, 1, 0), FWD = new V3(fx, 0, fz);   // model +z ileri bakar, grup π döndü
  const rotW = (b, axis, a) => { if (b && Math.abs(a) > 1e-4) boneRotateWorld(b, new THREE.Quaternion().setFromAxisAngle(axis, a)); };
  // ---- yan / çapraz koşu: kalça ve bacaklar hareket yönüne döner, gövde karşı dönüşle nişan yönünde kalır ----
  if (Math.abs(av.legYaw) > .01) { rotW(B.Body, UPW, -av.legYaw); rotW(B.Abdomen, UPW, av.legYaw * .85); rotW(B.Chest, UPW, av.legYaw * .15); }
  // ---- eğilme / kayma / havada: kalça iner, dizler bükülür ----
  // oturma (lobi): kalça oturağa iner, uyluklar öne, baldırlar aşağı; dans ederken dizler tempoyla bükülür
  av.sitK = (av.sitK || 0) + ((s.sit ? 1 : 0) - (av.sitK || 0)) * k(9);
  if (s.sit) av.sitH = s.sit;
  const si = av.sitK > .002 ? av.sitK : 0;
  const emEnv = s.emote ? Math.min(1, (s.emoteT || 0) * 4, Math.max(0, ((EMOTE_DUR[s.emote] || 2) - (s.emoteT || 0)) * 4)) : 0;
  const bounce = s.emote === 'dance' ? Math.abs(Math.sin((s.emoteT || 0) * 4.2)) * .16 * emEnv : 0;
  const cr = av.crouchK * (1 - av.slideK) + bounce, sl = av.slideK, ai = av.airK * (1 - sl);
  C.obj.position.y = -C.src.minY * C.src.k - cr * .34 - sl * .55 + ai * .05 - si * Math.max(0, CHAR_HIP - (av.sitH || .47) - .08);
  C.obj.updateMatrixWorld(true);
  for (const sd of ['L', 'R']) {
    const up = B['UpperLeg.' + sd], lo = B['LowerLeg.' + sd], i = sd === 'R' ? 1 : 0;
    let hip = cr * .95 + ai * (.55 + i * .35), knee = cr * 1.7 + ai * (.9 + i * .2);
    if (sl > .02) { hip = hip * (1 - sl) + (i ? 1.45 : .15) * sl; knee = knee * (1 - sl) + (i ? .1 : 1.9) * sl; }
    if (si > 0) { const kh = (av.sitH || .47) > .65 ? 1.1 : 1.5; hip = hip * (1 - si) + (1.42 - i * .06) * si; knee = knee * (1 - si) + (kh + i * .1) * si; }
    rotW(up, RIGHT, hip); rotW(lo, RIGHT, -knee);
  }
  // ayaklar yeniden baldıra bağlanır
  for (const f of feet) {
    if (!f.relPos) continue;
    f.shin.updateMatrixWorld(true);
    const p = f.shin.localToWorld(f.relPos.clone()), q = f.shin.getWorldQuaternion(new THREE.Quaternion()).multiply(f.relQ);
    f.foot.parent.updateMatrixWorld(true);
    f.foot.position.copy(f.foot.parent.worldToLocal(p));
    f.foot.parent.getWorldQuaternion(_cq2); f.foot.quaternion.copy(_cq2.invert().multiply(q)); f.foot.updateMatrixWorld(true);
  }
  // ---- gövde: kayarken geriye yaslanır, eğilince öne; bakış yönüne eğilir ----
  const pitch = s.pitch || 0;
  rotW(B.Abdomen, RIGHT, -cr * .25 + sl * .45 + si * .1);   // + geriye yaslanma
  if (s.look) { rotW(B.Neck, UPW, s.look * .35); rotW(B.Head, UPW, s.look * .45); }   // oturan başını çevirir
  for (const n of ['Torso', 'Chest']) rotW(B[n], RIGHT, pitch * .22);
  rotW(B.Neck, RIGHT, pitch * .15); rotW(B.Head, RIGHT, pitch * .2);
  // ---- silah ve kollar ----
  for (const ww in C.guns) for (const gg of C.guns[ww]) gg.visible = false;
  for (const kk in C.blades) C.blades[kk].visible = false;
  if (s.legsOnly) { legsOnlyMode(C, true); return; }
  legsOnlyMode(C, false);
  if (!s.alive) return;
  if (gun) poseGun(av, s, w, pitch, RIGHT, FWD);
  else if (melee) poseBlade(av, w);
  if (s.block && melee) {
    // savunma: iki kol kılıcı yatay tutar
    const ch = wpos(B.Chest, new V3());
    const tgt = ch.clone().addScaledVector(FWD, .38).add(new V3(0, .12, 0));
    ikArm(B['UpperArm.R'], B['LowerArm.R'], B['Wrist.R'], tgt.clone().addScaledVector(RIGHT, .1), new V3(0, -1, 0).addScaledVector(RIGHT, 1));
    ikArm(B['UpperArm.L'], B['LowerArm.L'], B['Wrist.L'], tgt.clone().addScaledVector(RIGHT, -.05), new V3(0, -1, 0).addScaledVector(RIGHT, -1));
    if (melee) poseBlade(av, w);
  }
  if (si > .3 && !s.emote && !gun && !melee) {   // oturunca eller dizlerin üstünde
    for (const sd of ['L', 'R']) {
      const side = sd === 'R' ? 1 : -1, hp = wpos(B['UpperLeg.' + sd], new V3()), kn = wpos(B['LowerLeg.' + sd], new V3());
      ikArm(B['UpperArm.' + sd], B['LowerArm.' + sd], B['Wrist.' + sd], hp.lerp(kn, .72).addScaledVector(UPW, .09).addScaledVector(RIGHT, side * .03), RIGHT.clone().multiplyScalar(side).addScaledVector(FWD, -.8).addScaledVector(UPW, -.3));
    }
  }
  if (emEnv > 0 && !gun && !melee) poseEmote(av, s, emEnv, RIGHT, UPW, FWD);
  if (C.ext) { extPose(C.ext.pairs, C.ext.hips, C.root); if (C.ext.team) C.ext.team.color.setRGB(1, 1, 1).lerp(C.mats.__team.color, .45); }
}
// lobi hareketleri: el sallama, dans. env: giriş / çıkış yumuşatması (0..1)
function poseEmote(av, s, env, RIGHT, UPW, FWD) {
  const B = av.char.bones, t = s.emoteT || 0;
  const rot = (b, axis, a) => { if (b && Math.abs(a) > 1e-4) boneRotateWorld(b, new THREE.Quaternion().setFromAxisAngle(axis, a)); };
  const arm = (sd, tgt, pole) => { const w = B['Wrist.' + sd], cur = wpos(w, new V3()); ikArm(B['UpperArm.' + sd], B['LowerArm.' + sd], w, cur.lerp(tgt, env), pole); };
  if (s.emote === 'wave') {
    const sh = wpos(B['UpperArm.R'], new V3());
    arm('R', sh.addScaledVector(UPW, .42).addScaledVector(RIGHT, .26 + Math.sin(t * 9) * .12).addScaledVector(FWD, .1), RIGHT.clone().addScaledVector(UPW, -1).addScaledVector(FWD, -.4));
    rot(B.Head, UPW, -.15 * env);
  } else if (s.emote === 'dance') {
    const ph = t * 4.2, sway = Math.sin(ph) * env;
    rot(B.Abdomen, FWD, sway * .16); rot(B.Chest, FWD, -sway * .2); rot(B.Head, FWD, sway * .14);
    rot(B.Neck, RIGHT, Math.max(0, Math.sin(ph * 2)) * .22 * env);
    for (const sd of ['L', 'R']) {
      const side = sd === 'R' ? 1 : -1, sh = wpos(B['UpperArm.' + sd], new V3()), up = Math.sin(ph + (side > 0 ? 0 : Math.PI)) * .5 + .5;
      arm(sd, sh.addScaledVector(UPW, -.22 + up * .68).addScaledVector(RIGHT, side * (.3 + up * .08)).addScaledVector(FWD, .2), RIGHT.clone().multiplyScalar(side).addScaledVector(UPW, -.6));
    }
  }
}
// 1. şahısta yalnız bacaklar görünür: üst gövde ve baş ağları gizlenir (kamera içlerinden görünmesin)
function legsOnlyMode(C, on) {
  if (C.ext) C.ext.root.visible = !on;   // dış iskeletli kostüm: 1. şahısta gövde gizli (kamera kafanın içinde kalmasın)
  for (const m of C.upper) m.visible = !on;
  for (const m of C.lower) m.material = on ? m.userData.mat1 : m.userData.mat3;
}
// parmakları kavrama pozuna kıvır. Bu iskelette "1" kemikleri avuç içi (hepsi bilekten çıkar); boğumlar 2-3-4
function curlFingers(B, sd, amt, thumb = .5) {
  const i2 = B['Index2.' + sd], p2 = B['Pinky2.' + sd]; if (!i2 || !p2) return;
  const ax = wpos(i2, new V3()).sub(wpos(p2, new V3())); if (ax.lengthSq() < 1e-8) return;
  ax.normalize(); if (sd === 'L') ax.negate();
  for (const f of ['Index', 'Middle', 'Ring', 'Pinky']) for (let i = 2; i <= 4; i++) { const b = B[f + i + '.' + sd]; if (b) boneRotateWorld(b, new THREE.Quaternion().setFromAxisAngle(ax, amt * (i === 2 ? .85 : 1.05))); }
  for (let i = 2; i <= 3; i++) { const b = B['Thumb' + i + '.' + sd]; if (b) boneRotateWorld(b, new THREE.Quaternion().setFromAxisAngle(ax, thumb * .55)); }
}
function poseGun(av, s, w, pitch, RIGHT, FWD) {
  const C = av.char, B = C.bones, def = TP_GUN[w], set = tpGun(av, w, s.ax || ''); if (!set) return;
  const dual = set.dual;
  const cp = Math.cos(pitch), aim = new V3(FWD.x * cp, Math.sin(pitch), FWD.z * cp).normalize();
  const up = new V3(0, 1, 0).addScaledVector(aim, -aim.y).normalize();
  const right = aim.clone().cross(up).normalize();
  const shR = wpos(B['UpperArm.R'], new V3()), shL = wpos(B['UpperArm.L'], new V3()), mid = shR.clone().add(shL).multiplyScalar(.5);
  av.g.updateMatrixWorld(true);
  const invG = av.g.matrixWorld.clone().invert(), gqInv = av.g.getWorldQuaternion(new THREE.Quaternion()).invert();
  const place = (obj, origin) => {
    const m = new THREE.Matrix4().lookAt(origin, origin.clone().add(aim), up);   // lookAt +z'yi hedefin tersine kurar: silahın -z'si nişan yönüne
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    obj.position.copy(origin).applyMatrix4(invG); obj.quaternion.copy(gqInv).multiply(q); obj.visible = true;
    obj.updateMatrixWorld(true);
  };
  const toW = (obj, p) => new V3(...p).applyMatrix4(obj.matrixWorld);
  let gR, gL;
  if (dual) {
    for (let i = 0; i < 2; i++) place(set[i], mid.clone().addScaledVector(aim, .4).addScaledVector(right, i ? -.13 : .13).addScaledVector(up, -.06));
    gR = toW(set[0], def.grip); gL = toW(set[1], def.grip);
  } else if (def.pistol) {
    place(set[0], mid.clone().addScaledVector(aim, .46).addScaledVector(up, -.05).addScaledVector(right, .02));
    gR = toW(set[0], def.grip); gL = toW(set[0], def.sup);
  } else {
    // dipçik sağ omuz cebine dayanır
    const pocket = shR.clone().addScaledVector(right, -.05).addScaledVector(up, -.02).addScaledVector(aim, .04);
    const origin = pocket.clone().addScaledVector(aim, def.butt * def.s).addScaledVector(up, def.rocket ? .12 : 0);
    place(set[0], origin);
    gR = toW(set[0], def.grip); gL = toW(set[0], def.sup);
  }
  const down = new V3(0, -1, 0);
  // el yönleri: d1 bilekten parmak köküne, d2 serçeden işarete. Sağ el kabzayı yandan kavrar (parmaklar sola-öne, boğumlar yukarı);
  // sol el tüfekte kundağı alttan (avuç yukarı, işaret öne), tabancada sağ elin üstünden sarar
  const d1R = right.clone().multiplyScalar(-.75).addScaledVector(aim, .65).normalize(), d2R = up;
  const d1L = def.pistol || dual ? right.clone().multiplyScalar(dual ? .75 : .9).addScaledVector(aim, .4).normalize() : right.clone().multiplyScalar(.75).addScaledVector(up, .5).normalize();
  const d2L = def.pistol || dual ? up : aim;
  // IK hedefi bilektir: avuç ortası tutma noktasında, bilek parmak yönünün ~8 cm gerisinde
  const palmR = gR.clone().addScaledVector(right, .025), wristR = palmR.addScaledVector(d1R, -.075);
  const palmL = def.pistol || dual ? gL.clone() : gL.clone().addScaledVector(up, -.035), wristL = palmL.addScaledVector(d1L, -.07);
  ikArm(B['UpperArm.R'], B['LowerArm.R'], B['Wrist.R'], wristR, down.clone().addScaledVector(right, .8).addScaledVector(aim, -.3));
  ikArm(B['UpperArm.L'], B['LowerArm.L'], B['Wrist.L'], wristL, down.clone().addScaledVector(right, -.9).addScaledVector(aim, -.1));
  boneOrient(B['Wrist.R'], B['Middle2.R'], B['Pinky2.R'], B['Index2.R'], d1R, d2R);
  boneOrient(B['Wrist.L'], B['Middle2.L'], B['Pinky2.L'], B['Index2.L'], d1L, d2L);
  curlFingers(B, 'R', 1.1, .7); curlFingers(B, 'L', 1.15, .6);
}
function poseBlade(av, w) {
  const C = av.char, B = C.bones, bl = tpBlade(av, w), wr = B['Wrist.R'];
  // kılıç avuçta: sapı boğum çizgisi boyunca, ağzı başparmak yönünde
  const o = wpos(wr, new V3()), mid = wpos(B['Middle2.R'], new V3()), idx = wpos(B['Index2.R'], new V3()), pk = wpos(B['Pinky2.R'], new V3());
  const palm = o.clone().lerp(mid, .62);
  const along = idx.clone().sub(pk).normalize();   // serçeden işarete: kılıç ucu bu yönde
  const fing = mid.clone().sub(o).normalize();
  const up = fing.clone().cross(along).normalize();
  av.g.updateMatrixWorld(true);
  const m = new THREE.Matrix4().lookAt(palm, palm.clone().add(along), up);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  bl.position.copy(palm).applyMatrix4(av.g.matrixWorld.clone().invert());
  bl.quaternion.copy(av.g.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));
  bl.visible = true;
  curlFingers(B, 'R', 1.25, .8);
}

/* ================= RAGDOLL ================= */
// [kemik, uç kemik, kalınlık]
const RAG = [
  ['Hips', 'Abdomen', .12], ['Abdomen', 'Neck', .14], ['Head', null, .11],
  ['UpperArm.L', 'LowerArm.L', .05], ['LowerArm.L', 'Wrist.L', .045], ['UpperArm.R', 'LowerArm.R', .05], ['LowerArm.R', 'Wrist.R', .045],
  ['UpperLeg.L', 'LowerLeg.L', .07], ['LowerLeg.L', 'Foot.L', .055], ['UpperLeg.R', 'LowerLeg.R', .07], ['LowerLeg.R', 'Foot.R', .055],
];
// [ebeveyn parça, çocuk parça, koni açısı, burulma]
const RAG_J = [[0, 1, .6, .3], [1, 2, .7, .5], [1, 3, 1.5, .8], [3, 4, 1.4, .2], [1, 5, 1.5, .8], [5, 6, 1.4, .2], [0, 7, 1.2, .4], [7, 8, 1.3, .1], [0, 9, 1.2, .4], [9, 10, 1.3, .1]];
const corpses = [];
const G_RAGDOLL = 16;
function spawnRagdoll(av, push) {
  const C = av.char; if (!C) return;
  legsOnlyMode(C, false);   // 1. şahısta büzülmüş üst gövde açılır
  av.g.updateMatrixWorld(true);
  // görünür ceset: canlı karakterin o anki pozunun kopyası
  const body = THREE.SkeletonUtils.clone(C.root);
  const holder = new THREE.Group(); holder.position.copy(av.g.position); holder.quaternion.copy(av.g.quaternion); holder.add(body); scene.add(holder);
  holder.updateMatrixWorld(true);
  const bones = boneMap(body); body.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  const feet = ['L', 'R'].map(sd => ({ shin: bones['LowerLeg.' + sd], foot: bones['Foot.' + sd], rel: bones['LowerLeg.' + sd].matrixWorld.clone().invert().multiply(bones['Foot.' + sd].matrixWorld) }));
  const parts = RAG.map(([bn, en, r]) => {
    const b = bones[bn]; if (!b) return null;
    const a = wpos(b, new V3());
    let e = en && bones[en] ? wpos(bones[en], new V3()) : null;
    if (!e) { const q = b.getWorldQuaternion(new THREE.Quaternion()); e = a.clone().add(new V3(0, .22, 0).applyQuaternion(q)); }
    const dir = e.clone().sub(a), len = Math.max(.06, dir.length()); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), dir);
    const rb = new CANNON.Body({ mass: bn === 'Abdomen' ? 14 : bn === 'Hips' ? 12 : bn === 'Head' ? 5 : 3.5, collisionFilterGroup: G_RAGDOLL, collisionFilterMask: G_STATIC, linearDamping: .05, angularDamping: .35 });
    rb.addShape(new CANNON.Box(new CANNON.Vec3(r, len / 2, r)));
    const mid = a.clone().addScaledVector(dir, len / 2);
    rb.position.set(mid.x, mid.y, mid.z); rb.quaternion.set(q.x, q.y, q.z, q.w);
    const pv = av.vel || new V3();
    rb.velocity.set(pv.x * .6 + push.x * rand(2.5, 4.5), Math.max(0, pv.y * .3) + rand(.5, 2), pv.z * .6 + push.z * rand(2.5, 4.5));
    rb.angularVelocity.set(rand(-2, 2), rand(-2, 2), rand(-2, 2));
    world.addBody(rb);
    // kemik ↔ gövde dönüşüm farkı (kemik dünya = gövde * fark)
    const bq = b.getWorldQuaternion(new THREE.Quaternion());
    const offQ = q.clone().invert().multiply(bq), offP = a.clone().sub(mid).applyQuaternion(q.clone().invert());
    return { bone: b, name: bn, rb, offQ, offP, len };
  });
  const cons = [];
  for (const [pi, ci, cone, twist] of RAG_J) {
    const P = parts[pi], Ch = parts[ci]; if (!P || !Ch) continue;
    const jw = wpos(Ch.bone, new V3());
    const toLocal = (rb, p) => { const v = new CANNON.Vec3(p.x, p.y, p.z); return rb.pointToLocalFrame(v); };
    // eklem ekseni: çocuk uzvun yönü (ebeveynin ve çocuğun kendi çerçevesinde)
    const cd = Ch.rb.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    const c = new CANNON.ConeTwistConstraint(P.rb, Ch.rb, { pivotA: toLocal(P.rb, jw), pivotB: toLocal(Ch.rb, jw), axisA: P.rb.vectorToLocalFrame(cd), axisB: new CANNON.Vec3(0, 1, 0), angle: cone, twistAngle: twist });
    world.addConstraint(c); cons.push(c);
  }
  // dış iskeletli kostüm: cesedin kopyasındaki görünür model de kukla iskeleti izler
  let ext = null;
  if (C.ext) { const named = {}; body.traverse(o => { if (o.isBone) named[o.name] = o; }); ext = { pairs: C.ext.pairs.map(p => ({ s: named[p.s.name], d: named[p.d.name], K: p.K })).filter(p => p.s && p.d), hips: C.ext.hips && { s: named[C.ext.hips.s.name], d: named[C.ext.hips.d.name], sR: C.ext.hips.sR, dR: C.ext.hips.dR }, root: body }; }
  corpses.push({ holder, bones, parts: parts.filter(Boolean), cons, feet, t: 0, ext });
  if (corpses.length > 6) removeCorpse(corpses[0]);
}
function removeCorpse(c) {
  for (const p of c.parts) world.remove(p.rb);
  for (const k of c.cons) world.removeConstraint(k);
  scene.remove(c.holder);
  corpses.splice(corpses.indexOf(c), 1);
}
const RAG_ORDER = ['Hips', 'Abdomen', 'Head', 'UpperArm.L', 'LowerArm.L', 'UpperArm.R', 'LowerArm.R', 'UpperLeg.L', 'LowerLeg.L', 'UpperLeg.R', 'LowerLeg.R'];
function updateRagdolls(dt) {
  for (const c of corpses.slice()) {
    c.t += dt;
    for (const name of RAG_ORDER) {
      const p = c.parts.find(p => p.name === name); if (!p) continue;
      const q = new THREE.Quaternion(p.rb.quaternion.x, p.rb.quaternion.y, p.rb.quaternion.z, p.rb.quaternion.w);
      const wq = q.clone().multiply(p.offQ);
      const par = p.bone.parent; par.updateMatrixWorld(true);
      const pq = par.getWorldQuaternion(new THREE.Quaternion()).invert();
      p.bone.quaternion.copy(pq.multiply(wq));
      if (name === 'Hips') {
        const wp = new V3(p.rb.position.x, p.rb.position.y, p.rb.position.z).add(p.offP.clone().applyQuaternion(q));
        p.bone.position.copy(wp.applyMatrix4(par.matrixWorld.clone().invert()));
      }
      p.bone.updateMatrixWorld(true);
    }
    if (c.ext) extPose(c.ext.pairs, c.ext.hips, c.ext.root);
    for (const f of c.feet) { const m = f.shin.matrixWorld.clone().multiply(f.rel); const p = new V3(), q = new THREE.Quaternion(), sc = new V3(); m.decompose(p, q, sc); f.foot.parent.updateMatrixWorld(true); f.foot.position.copy(p.applyMatrix4(f.foot.parent.matrixWorld.clone().invert())); f.foot.parent.getWorldQuaternion(_cq2); f.foot.quaternion.copy(_cq2.invert().multiply(q)); f.foot.updateMatrixWorld(true); }
    // 9 sn sonra fizik durur, 14 sn sonra yere gömülerek kaybolur
    if (c.t > 9 && !c.frozen) { c.frozen = true; for (const p of c.parts) p.rb.type = CANNON.Body.STATIC; }
    if (c.t > 13) c.holder.position.y -= dt * .25;
    if (c.t > 15) removeCorpse(c);
  }
}

/* ================= ESKİ KARAKTERLE ORTAK ARAYÜZ ================= */
// model yüklendiyse yeni karakter, değilse eski eklemli kutu karakter (avatar.js); kutu karakter model gelince değişir
function buildAvatar(color, name) {
  if (charSource()) return buildCharAvatar(color, name);
  const av = buildBlockyAvatar(color, name); av.blocky = true; return av;
}
function animateAvatar(av, dt, s) {
  if (av.blocky && charSource()) upgradeAvatar(av);
  if (av.char && s && (s.cs || 'std') !== (av.costume || 'std')) costumeSwap(av, s.cs || 'std');
  if (av.char) animateCharAvatar(av, dt, s); else animateBlockyAvatar(av, dt, s);
}

/* ================= KOSTÜM SEÇİMİ (ana menü) ================= */
// düğmeye her basışta sıradaki kostüm; menüdeki karakterin üstünde hemen görünür (ilk kez giyilen kostüm yüklenir)
function costumeLabel() { const b = $('costumeBtn'); if (b) b.textContent = 'KOSTÜM: ' + CHAR_COSTUMES[myCostume].name; }
if ($('costumeBtn')) {
  $('costumeBtn').addEventListener('click', () => { setCostume(COSTUME_LIST[(COSTUME_LIST.indexOf(myCostume) + 1) % COSTUME_LIST.length]); costumeLabel(); if (typeof menuCam !== 'undefined') menuCam.focus = 5; });
  costumeLabel();
}

/* ================= DIŞ İSKELETLİ KOSTÜMLER (Sketchfab: Mixamo vb.) =================
   Görünmez kukla (standart iskelet) animasyonu, silah tutuşunu (IK) ve ragdoll'u yapar; her karede kostümün kendi
   kemikleri kuklanın kemikleriyle aynı dünya yönüne döndürülür. Dinlenme pozları farklıysa (A / T duruşu) her kemik
   dinlenmede kuklanın kemiğiyle aynı yöne bakacak şekilde hizalanır (K sabiti). */
const EXT_RIGS = {
  mixamo: (() => {
    const m = { Hips: 'Hips', Abdomen: 'Spine', Torso: 'Spine1', Chest: 'Spine2', Neck: 'Neck', Head: 'Head' };
    for (const [sd, S] of [['L', 'Left'], ['R', 'Right']]) {
      Object.assign(m, { ['Shoulder.' + sd]: S + 'Shoulder', ['UpperArm.' + sd]: S + 'Arm', ['LowerArm.' + sd]: S + 'ForeArm', ['Wrist.' + sd]: S + 'Hand', ['UpperLeg.' + sd]: S + 'UpLeg', ['LowerLeg.' + sd]: S + 'Leg', ['Foot.' + sd]: S + 'Foot' });
      for (const f of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) for (let i = 1; i <= 3; i++) m[f + i + '.' + sd] = S + 'Hand' + f + i;
    }
    return m;
  })(),
  sovalye: (() => {
    const m = { Hips: 'hips', Abdomen: 'spine', Chest: 'chest', Neck: 'neck', Head: 'head' };
    for (const sd of ['L', 'R']) {
      Object.assign(m, { ['Shoulder.' + sd]: sd + '_shoulder', ['UpperArm.' + sd]: sd + '_arm', ['LowerArm.' + sd]: sd + '_elbow', ['Wrist.' + sd]: sd + '_wrist', ['UpperLeg.' + sd]: sd + '_leg', ['LowerLeg.' + sd]: sd + '_knee', ['Foot.' + sd]: sd + '_anke' });
      for (const [f, g] of [['Index', 'point'], ['Middle', 'middle'], ['Ring', 'ring'], ['Pinky', 'pink'], ['Thumb', 'thumb']]) for (let i = 1; i <= 3; i++) m[f + i + '.' + sd] = sd + '_' + g + i;
    }
    return m;
  })(),
};
const _xq1 = new THREE.Quaternion(), _xq2 = new THREE.Quaternion(), _xv1 = new V3(), _xv2 = new V3();
// kemik adı: GLTF yükleyicisi ':' gibi işaretleri siler, Sketchfab sona _sayı ekler ('mixamorig:Hips_01' → 'mixamorigHips_01')
const extKey = n => n.replace(/_\d+$/, '');
function extFind(bones, want) {
  let hit = null;
  for (const b of bones) { const k = extKey(b.name); if (k === want) return b; if (!hit && k.endsWith(want) && /[a-z0-9]$/i.test(k.slice(0, -want.length) || 'x')) hit = b; }
  return hit;
}
function firstChildBone(b) { return b.children.find(c => c.isBone) || null; }
function extSetup(C, S, color) {
  const src = S.ext, def = S.def, rig = EXT_RIGS[def.ext];
  if (!src.extBox) src.extBox = skinnedBox(src.scene);
  const ext = THREE.SkeletonUtils.clone(src.scene), box = src.extBox, k = CHAR_H / Math.max(.01, box.max.y - box.min.y);
  ext.scale.multiplyScalar(k); const c = box.getCenter(new V3());
  ext.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  // takım rengi: en çok kullanılan (gövde) malzemesi takım rengine boyanır
  const use = {}; ext.traverse(o => { if (o.isMesh) { o.frustumCulled = false; const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; use[o.material.name] = (use[o.material.name] || 0) + n; } });
  const main = def.team.length ? def.team : [Object.entries(use).sort((a, b) => b[1] - a[1])[0][0]];
  const mats = {};
  ext.traverse(o => { if (!o.isMesh) return; const key = main.includes(o.material.name) ? '__team' : o.material.name; if (!mats[key]) { mats[key] = o.material.clone(); if (key === '__team') mats[key].color.setHex(color); } o.material = mats[key]; });
  // takım rengi kıyafetin kendi rengine karışır (tamamen boyamak dokuyu öldürür): av.cloth sahte malzeme, gerçek renk her karede
  const real = mats.__team; C.mats.__team = new THREE.MeshStandardMaterial({ color });
  C.root.add(ext);
  for (const m of [...C.upper, ...C.lower]) m.visible = false;   // kukla görünmez
  C.upper = []; C.lower = [];
  C.root.updateMatrixWorld(true);
  const dBones = []; ext.traverse(o => { if (o.isBone) dBones.push(o); });
  // yön: kostümün kalçasının sağ-sol ekseni kuklanınkiyle aynı olsun (bazı modeller ters ya da yana bakar)
  // (ayaktan parmak ucuna uzanan vektör: sağ / sol adları ters etiketlenmiş modellerde de doğru çalışır)
  { const sl = C.bones['Foot.L'], sr = sl && firstChildBone(sl), dl = extFind(dBones, rig['Foot.L']), dr = dl && firstChildBone(dl);
    if (sl && sr && dl && dr) {
      const a = wpos(sr, new V3()).sub(wpos(sl, new V3())), b = wpos(dr, new V3()).sub(wpos(dl, new V3()));
      const yaw = Math.atan2(a.x, a.z) - Math.atan2(b.x, b.z);
      if (Math.abs(yaw) > .05) { const pv = new THREE.Group(); C.root.add(pv); pv.add(ext); pv.rotation.y = yaw; C.root.updateMatrixWorld(true); }
    } }
  const depth = o => { let n = 0; while (o.parent) { n++; o = o.parent; } return n; };
  const pairs = [];
  for (const [sn, dn] of Object.entries(rig)) {
    const sb = C.bones[sn], db = extFind(dBones, dn); if (!sb || !db) continue;
    const sR = sb.getWorldQuaternion(new THREE.Quaternion()), dR = db.getWorldQuaternion(new THREE.Quaternion());
    // dinlenmede iki kemiğin yönünü (çocuğa doğru) eşle
    let al = new THREE.Quaternion();
    const sc = firstChildBone(sb), dc = firstChildBone(db);
    if (sc && dc && !/Foot|Wrist|Head|Neck/.test(sn)) {
      const sd = wpos(sc, new V3()).sub(wpos(sb, new V3())), dd = wpos(dc, new V3()).sub(wpos(db, new V3()));
      if (sd.lengthSq() > 1e-8 && dd.lengthSq() > 1e-8) al.setFromUnitVectors(dd.normalize(), sd.normalize());
    }
    const K = sR.clone().invert().multiply(al).multiply(dR);
    pairs.push({ s: sb, d: db, K, dep: depth(db) });
  }
  pairs.sort((a, b) => a.dep - b.dep);
  const hs = C.bones.Hips, hd = extFind(dBones, rig.Hips);
  const hips = hs && hd ? { s: hs, d: hd, sR: C.root.worldToLocal(wpos(hs, new V3())), dR: C.root.worldToLocal(wpos(hd, new V3())) } : null;
  C.ext = { root: ext, pairs, hips, team: real };
}
function extPose(pairs, hips, root) {
  if (hips && hips.s && hips.d) {
    root.updateMatrixWorld(true);
    const now = root.worldToLocal(wpos(hips.s, _xv1));
    const want = root.localToWorld(_xv2.copy(hips.dR).add(now.sub(hips.sR)));
    hips.d.parent.updateWorldMatrix(true, false);
    hips.d.position.copy(hips.d.parent.worldToLocal(want));
  }
  for (const p of pairs) {
    p.s.getWorldQuaternion(_xq1).multiply(p.K);
    p.d.parent.getWorldQuaternion(_xq2).invert();
    p.d.quaternion.copy(_xq2.multiply(_xq1));
    p.d.updateWorldMatrix(false, false);
  }
}
