'use strict';
/* Gerçekçi silah modelleri (gunkit.js parçalarıyla kurulur).
   Her kurucu, animasyonların kullandığı parçaları döndürür: şarjör, kızak / sürgü, pompa, alev, fişek çıkış noktası...
   Ölçek: tüfekler gerçeğin ~1.37 katı (silah ekranın sağ altında durduğu için), tabancalar ~1.
   Nişan çizgisi (sight): nişan alınca gözün geçtiği yükseklik; gez deliği ve arpacık ucu tam bu hizadadır. */

const GM = {};
const GM_X = new V3(1, 0, 0);

// dik kabzayı kavrayan el. rake: kabzanın arkaya yatma açısı. Önkol silaha göre aşağı-geriye uzanır.
function gmGripHand(parent, { left = false, r = .021, rake = .35, x = 0, y = 0, z = 0, trigger, arm = [.06, -.42, 1], ry = 0, rz = 0 } = {}) {
  const c = Math.cos(rake), s = Math.sin(rake), [ax, ay, az] = arm;
  const h = createTacticalHand(left, { grip: 'v', r, trigger, rake, arm: new V3(ax, ay * c - az * s, ay * s + az * c) });
  h.position.set(x, y, z); h.rotation.set(-rake, ry, rz);
  parent.add(h); return h;
}
// yatay sapı (el kundağı, pompa) alttan kavrayan destek eli
function gmBarHand(parent, { left = true, r = .036, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, grip = 'u', arm } = {}) {
  const h = createTacticalHand(left, { grip, r, arm });
  h.position.set(x, y, z); h.rotation.set(rx, ry, rz);
  parent.add(h); return h;
}
// şarjör değiştirirken şarjörü kavrayan destek eli: şarjör grubunun çocuğu (şarjörle birlikte hareket eder), başta gizli
function gmMagHand(mag, { r = .021, y = -.03, z = 0, rake = 0 } = {}) {
  const h = gmGripHand(mag, { left: true, r, rake, y, z, trigger: false, arm: [-.25, -.5, .9] });
  h.visible = false; return h;
}
// fişek kovanı (tüfek / tabanca): z ekseninde, ağzı -z
function gmCasing(len = .03, r = .0042, neck = .7) {
  return GK.latheGeo([[0, len / 2], [r, len / 2], [r, len / 2 - .002], [r * .92, len / 2 - .003], [r, len / 2 - .004], [r, -len * .15], [r * neck, -len * .3], [r * neck, -len / 2], [0, -len / 2]], 10);
}

/* ================= M4A1 ================= */
GM.m4 = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .012, SL = .085;   // Y: namlu ekseni, SL: nişan çizgisi
  // ---- üst gövde (flat-top) ve üst ray ----
  GK.prof(g, GK.black, [[-.13, -.004], [-.13, .03, .002], [.104, .03, .002], [.116, .022, .004], [.116, -.004]], .044);
  GK.rail(g, GK.black, -.128, .1, .03, .021, .009);
  // fişek çıkış penceresi: koyu boşluk ve içinde parlak sürgü taşıyıcısı
  GK.box(g, GK.hole, .001, .017, .058, .0222, Y - .001, .004);
  GK.box(g, GK.steel, .001, .009, .046, .0228, Y - .001, .006);
  GK.tube(g, GK.steel, .0014, .068, .0225, -.0035, .004, 6);                       // toz kapağı menteşesi
  GK.prof(g, GK.black, [[.04, .004], [.06, .004], [.06, .028, .003], [.046, .028]], .008, .024);   // kovan saptırıcı
  GK.tube(g, GK.black, .0068, .03, .027, .016, .074, 12);                            // ileri itme (forward assist)
  GK.tube(g, GK.steel, .0072, .006, .027, .016, .092, 12);
  // kurma kolu (T-kol) ve mandalı
  const ch = new THREE.Group(); ch.position.set(0, .026, .118); g.add(ch);
  GK.rbox(ch, GK.dark, .016, .008, .03, 0, 0, -.004, .002);
  GK.rbox(ch, GK.dark, .044, .007, .011, 0, 0, .012, .003);
  // ---- alt gövde: şarjör yuvası, tetik korkuluğu, pimler, şalter ----
  GK.prof(g, GK.black, [[-.12, -.004], [.112, -.004], [.112, -.03, .004], [.09, -.048], [.045, -.048], [-.032, -.048], [-.04, -.05], [-.04, -.081, .003], [-.124, -.083, .003], [-.122, -.042], [-.12, -.03]], .041);
  GK.prof(g, GK.black, [[-.127, -.074], [-.037, -.074], [-.037, -.088, .003], [-.127, -.088, .003]], .046);   // genişleyen şarjör ağzı
  GK.guard(g, GK.black, -.028, .052, -.046, -.076, .012, .006);
  GK.trigger(g, GK.steel, -.047, .012);
  GK.screws(g, GK.steel, .041, [[-.013, .1], [-.013, -.112]], .0038);                  // sökme pimleri
  GK.pin(g, GK.dark, .0055, .005, .022, -.034, -.03, 12);                             // şarjör bırakma düğmesi
  GK.box(g, GK.dark, .003, .022, .013, -.0215, -.02, -.046);                          // sürgü tutucu
  GK.pin(g, GK.steel, .006, .003, -.022, -.024, .062, 12);                            // şalter göbeği
  GK.box(g, GK.steel, .003, .005, .022, -.0235, -.024, .052, -.5);                    // şalter kolu
  // ---- kabza (A2): arkaya ~22° yatık, ortasında parmak çıkıntısı ----
  GK.prof(g, GK.grip, [[.046, -.046], [.094, -.046], [.104, -.06], [.136, -.142, .01], [.134, -.152, .004], [.092, -.153, .006], [.074, -.11], [.064, -.096, .004], [.068, -.084], [.05, -.056]], .031);
  // ---- tampon borusu ve teleskopik dipçik ----
  GK.tube(g, GK.black, .0155, .23, 0, Y, .228, 18);
  GK.lathe(g, GK.steel, [[.0158, .113], [.0195, .113], [.0195, .123], [.0158, .123]], 0, Y);   // kale somunu
  GK.prof(g, GK.poly, [[.245, Y + .021, .004], [.398, Y + .024, .004], [.43, Y + .042, .006], [.43, Y - .086, .004], [.404, Y - .086], [.335, Y - .046, .02], [.27, Y - .021, .01], [.245, Y - .019, .004]], .044, 0,
    { holes: [[[.388, Y - .05], [.41, Y - .05], [.41, Y - .066], [.396, Y - .066]]] });
  GK.prof(g, GK.rubber, [[.428, Y + .043, .004], [.441, Y + .043, .004], [.441, Y - .088, .004], [.428, Y - .088, .004]], .047);
  GK.rbox(g, GK.dark, .011, .012, .04, 0, Y - .024, .27, .003);                      // dipçik kilidi
  // ---- dört raylı el kundağı (RIS) ----
  GK.rbox(g, GK.black, .054, .054, .25, 0, Y, -.255, .008);
  GK.rail(g, GK.black, -.375, -.135, Y + .026, .021, .008);
  GK.mesh(GK.railGeo(-.375, -.135, .021, .008), GK.black, g, .026, Y, 0, 0, 0, -Math.PI / 2);
  GK.mesh(GK.railGeo(-.375, -.135, .021, .008), GK.black, g, -.026, Y, 0, 0, 0, Math.PI / 2);
  GK.mesh(GK.railGeo(-.375, -.135, .021, .008), GK.black, g, 0, Y - .026, 0, 0, 0, Math.PI);
  GK.screws(g, GK.steel, .055, [[Y, -.16], [Y, -.35]], .003);
  GK.lathe(g, GK.black, [[.012, -.135], [.031, -.133], [.031, -.122], [.012, -.12]], 0, Y);   // namlu somunu / delta halka
  // ---- namlu, arpacık kulesi, alev gizleyici ----
  GK.lathe(g, GK.steel, [[.0105, -.13], [.0105, -.43], [.0095, -.43], [.0095, -.53], [.0085, -.535], [.0085, -.701]], 0, Y, 14);
  GK.prof(g, GK.black, [[-.43, Y - .016, .003], [-.388, Y - .016, .003], [-.388, Y + .015], [-.396, SL - .016, .004], [-.413, SL - .016, .004], [-.43, Y + .015]], .02);
  for (const s of [-1, 1]) GK.box(g, GK.black, .0035, .022, .014, s * .0085, SL - .006, -.405);   // arpacık kulakları
  GK.box(g, GK.dark, .0028, .022, .003, 0, SL - .011, -.405);                          // arpacık direği (ucu nişan çizgisinde)
  GK.box(g, GK.black, .008, .012, .016, 0, Y - .024, -.418);                           // süngü takozu
  GK.lathe(g, GK.steel, [[.0085, -.7], [.0115, -.703], [.0115, -.756], [.0104, -.76], [.0062, -.76], [.0062, -.75]], 0, Y, 16);
  for (const [sx, sy] of [[0, 1], [1, 0], [-1, 0], [.7, .7], [-.7, .7]]) GK.box(g, GK.hole, sx ? .0012 : .003, sy && !sx ? .0012 : .003, .032, sx * .0112, Y + sy * .0112, -.73);   // kafes yarıkları
  GK.bore(g, .0062, Y, -.7602);
  // ---- arka gez: delikli levha, gez deliği nişan çizgisinde ----
  GK.rbox(g, GK.black, .026, .008, .034, 0, .043, .074, .002);
  GK.plate(g, GK.black, [[-.013, .045], [.013, .045], [.013, SL + .006, .004], [.006, SL + .012, .003], [-.006, SL + .012, .003], [-.013, SL + .006, .004]], .006, 0, 0, .082,
    { holes: [GK.circle(0, SL, .0032, 14)] });
  GK.pin(g, GK.steel, .004, .004, .015, .052, .074, 10);                               // gez ayar düğmesi
  // ---- şarjör (STANAG, hafif kavisli) ----
  const mag = new THREE.Group(); mag.position.set(0, -.12, -.082); g.add(mag);
  GK.prof(mag, GK.black, [[-.036, .08], [-.038, .0], [-.045, -.088], [.025, -.088], [.033, .0], [.034, .08]], .03);
  for (const zz of [-.02, .014]) GK.prof(mag, GK.black, [[zz - .004, .06], [zz + .004, .06], [zz + .001 - .006, -.08], [zz - .007 - .006, -.08]], .032);   // yan nervürler
  GK.prof(mag, GK.dark, [[-.049, -.086, .003], [.029, -.086, .003], [.029, -.101, .004], [-.049, -.101, .004]], .035);   // taban
  // ---- M203 bomba atar (co-op'ta görünür) ----
  const gl = new THREE.Group(); g.add(gl);
  GK.lathe(gl, GK.od, [[.022, -.445], [.027, -.443], [.027, -.255], [.024, -.25], [.024, -.24]], 0, -.062, 22);
  GK.lathe(gl, GK.od, [[.022, -.445], [.02, -.445], [.02, -.42]], 0, -.062, 22);
  GK.bore(gl, .02, -.062, -.4452);
  GK.rbox(gl, GK.black, .036, .05, .085, 0, -.062, -.2, .008);                          // mekanizma gövdesi
  GK.prof(gl, GK.black, [[-.2, -.087], [-.175, -.087], [-.17, -.13, .006], [-.188, -.132, .004], [-.198, -.105]], .022);   // tetik kolu
  GK.rbox(gl, GK.black, .03, .014, .19, 0, -.032, -.33, .003);                          // ray kelepçesi
  GK.box(gl, GK.dark, .003, .03, .02, -.03, -.04, -.3);                                 // kadran nişangahı
  // ---- eller ----
  let lh = null, magHand = null;
  if (hands) {
    gmGripHand(g, { r: .021, rake: .38, y: -.088, z: .093, trigger: true });
    lh = gmBarHand(g, { r: .038, y: Y, z: -.3 });
    magHand = gmMagHand(mag, { r: .024, y: -.045, z: -.01, rake: -.08 });
  }
  const flash = GK.flash(g, Y, -.785);
  return { g, mag, gl, flash, ch, lh, magHand, port: new V3(.025, Y + .002, .006), sight: SL, muzzleZ: -.76 };
};

/* ================= AWP (AW tipi, başparmak delikli dipçik) ================= */
GM.awp = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .026, SC = .088;   // SC: dürbün ekseni
  // ---- aksiyon gövdesi, dürbün rayı, fişek penceresi ----
  GK.rbox(g, GK.black, .042, .044, .27, 0, Y + .001, -.005, .016);
  GK.rail(g, GK.black, -.13, .11, Y + .021, .02, .008);
  GK.box(g, GK.hole, .001, .016, .062, .0212, Y + .005, .02);
  // ---- sürgü: namlu ekseni etrafında döner ve geri çekilir ----
  const bolt = new THREE.Group(); bolt.position.set(0, Y, .1); g.add(bolt);
  GK.tube(bolt, GK.chrome, .0122, .16, 0, 0, -.055, 16);
  GK.lathe(bolt, GK.black, [[0, .02], [.0152, .02], [.0162, .03], [.0162, .05], [.012, .058], [0, .058]], 0, 0, 18);
  GK.rod(bolt, GK.steel, [.008, 0, .012], [.042, -.014, .02], .0042);
  GK.mesh(new THREE.SphereGeometry(.011, 16, 12), GK.black, bolt, .047, -.017, .022).scale.set(1, 1, 1.25);
  // ---- ağır namlu ve namlu freni ----
  GK.lathe(g, GK.black, [[.0165, -.14], [.0165, -.3], [.0135, -.42], [.0125, -.905]], 0, Y, 18);
  GK.lathe(g, GK.black, [[.0125, -.905], [.017, -.908], [.017, -.985], [.0155, -.992], [.006, -.992], [.006, -.985]], 0, Y, 18);
  for (const zz of [-.925, -.947, -.969]) for (const s of [-1, 1]) GK.box(g, GK.hole, .001, .009, .012, s * .0168, Y, zz);
  GK.bore(g, .006, Y, -.9922);
  // ---- dürbün: göz merceği, gövde, taret kutusu, objektif ----
  GK.lathe(g, GK.black, [[0, .135], [.018, .135], [.021, .128], [.021, .085], [.019, .078], [.0145, .062], [.0145, -.105], [.017, -.12], [.025, -.17], [.0265, -.215], [.0265, -.248], [.0245, -.252], [0, -.252]], 0, SC, 28);
  GK.mesh(new THREE.CircleGeometry(.0225, 24), GK.lens, g, 0, SC, -.2528).rotation.y = Math.PI;
  GK.mesh(new THREE.CircleGeometry(.0165, 20), GK.lens, g, 0, SC, .1356);
  GK.rbox(g, GK.black, .036, .032, .06, 0, SC, -.035, .01);
  GK.mesh(new THREE.CylinderGeometry(.012, .012, .022, 20), GK.black, g, 0, SC + .026, -.035);
  GK.mesh(new THREE.CylinderGeometry(.0125, .0125, .006, 20), GK.steel, g, 0, SC + .039, -.035);
  GK.pin(g, GK.black, .011, .02, .026, SC, -.035, 20);
  GK.pin(g, GK.black, .015, .014, -.024, SC, -.035, 20);
  for (const zz of [-.085, .035]) {
    GK.lathe(g, GK.black, [[.0145, zz - .007], [.0192, zz - .007], [.0192, zz + .007], [.0145, zz + .007]], 0, SC, 20);
    GK.rbox(g, GK.black, .024, .016, .016, 0, .062, zz, .003);
    GK.screws(g, GK.steel, .039, [[SC - .016, zz]], .0025);
  }
  // ---- dipçik: tetik deliği ve başparmak deliği olan yeşil gövde ----
  GK.prof(g, GK.sniper, [[-.4, Y - .02, .008], [.13, Y - .02], [.165, Y + .006, .012], [.25, .062, .02], [.458, .062, .008],
    [.458, -.14, .008], [.3, -.128], [.165, -.15, .012], [.11, -.152, .012], [.092, -.07, .006], [.03, -.072, .01], [.018, -.05, .008], [-.1, -.05], [-.38, -.038, .012], [-.4, -.026, .008]], .048, 0,
  { holes: [[[.034, -.026, .006], [.032, -.06, .008], [.08, -.06, .008], [.084, -.026, .006]], [[.135, -.02, .01], [.142, -.112, .016], [.27, -.1, .02], [.255, 0, .02]]] });
  GK.prof(g, GK.rubber, [[.456, .064, .006], [.475, .064, .006], [.475, -.142, .006], [.456, -.142, .006]], .05);
  GK.screws(g, GK.steel, .048, [[.045, .3], [.045, .38]], .005);
  GK.trigger(g, GK.steel, -.026, .058);
  GK.mesh(new THREE.CylinderGeometry(.007, .007, .05, 10), GK.black, g, 0, -.16, .42);   // dipçik ayağı
  // katlanmış çatal ayak
  GK.rbox(g, GK.black, .03, .014, .03, 0, -.045, -.36, .004);
  for (const s of [-1, 1]) { GK.tube(g, GK.black, .0055, .2, s * .012, -.052, -.25, 10); GK.mesh(new THREE.SphereGeometry(.007, 10, 8), GK.rubber, g, s * .012, -.052, -.148); }
  // şarjör
  const mag = new THREE.Group(); mag.position.set(0, -.08, -.045); g.add(mag);
  GK.rbox(mag, GK.black, .034, .055, .07, 0, .0025, 0, .004);
  GK.rbox(mag, GK.dark, .037, .008, .074, 0, -.026, 0, .003);
  let lh = null, magHand = null;
  if (hands) {
    gmGripHand(g, { r: .022, rake: .21, y: -.07, z: .118, trigger: true });
    lh = gmBarHand(g, { r: .028, y: -.022, z: -.23 });
    magHand = gmMagHand(mag, { r: .022, y: -.012, z: 0 });
  }
  return { g, mag, bolt, lh, magHand, flash: GK.flash(g, Y, -1.02, 0xffd080), port: new V3(.022, Y + .005, .02), muzzleZ: -.99 };
};

/* ================= TABANCA (Beretta tipi, üstü açık kızak) ================= */
GM.beretta = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .022, SL = .041;
  const slide = new THREE.Group(); g.add(slide);
  GK.prof(slide, GK.black, [[-.122, .006, .002], [-.122, .031, .004], [-.1, .032], [-.098, .029], [-.008, .029], [0, .037], [.07, .038, .004], [.078, .03, .003], [.078, .006]], .03);
  for (let i = 0; i < 7; i++) GK.box(slide, GK.dark, .0312, .02, .0018, 0, .02, .04 + i * .0045);
  GK.box(slide, GK.black, .003, .009, .008, 0, .0365, -.114);
  GK.plate(slide, GK.black, [[-.011, .036], [.011, .036], [.011, SL + .0035], [.0018, SL + .0035], [.0018, SL], [-.0018, SL], [-.0018, SL + .0035], [-.011, SL + .0035]], .007, 0, 0, .07);
  for (const s of [-1, 1]) GK.pin(slide, GK.steel, .0042, .004, s * .0165, .031, .058, 10);
  GK.bore(slide, .0045, Y, -.1222);
  GK.tube(g, GK.steel, .0075, .12, 0, Y, -.061, 14);   // açıktan görünen namlu
  GK.prof(g, GK.black, [[-.1, .006], [.078, .006], [.086, 0, .004], [.112, -.1, .01], [.104, -.112, .006], [.064, -.113, .006], [.04, -.016, .006], [.03, -.046, .012], [-.03, -.046, .014], [-.048, -.012, .01], [-.1, -.006, .003]], .028, 0,
    { holes: [[[.032, -.015], [.023, -.038, .008], [-.024, -.038, .01], [-.038, -.015, .006]]] });
  GK.prof(g, GK.grip, [[.05, -.02], [.083, -.012], [.105, -.096, .008], [.099, -.106, .005], [.07, -.107, .005], [.052, -.03]], .033);
  GK.screws(g, GK.steel, .033, [[-.03, .062], [-.09, .08]], .0028);
  GK.prof(g, GK.black, [[.077, .008], [.088, .012], [.097, .029, .003], [.09, .033, .002], [.082, .02]], .008);   // horoz
  GK.trigger(g, GK.steel, -.015, .002);
  GK.box(g, GK.black, .003, .006, .03, -.0152, .002, .01);   // sürgü durdurucu
  const mag = new THREE.Group(); mag.position.set(0, -.075, .083); mag.rotation.x = -.25; g.add(mag);
  GK.rbox(mag, GK.steel, .02, .09, .034, 0, .012, 0, .004);
  GK.rbox(mag, GK.poly, .027, .009, .042, 0, -.038, .002, .003);
  let lh = null, magHand = null;
  if (hands) {
    gmGripHand(g, { r: .02, rake: .25, y: -.055, z: .075, trigger: true });
    lh = gmGripHand(g, { left: true, r: .026, rake: .25, x: -.02, y: -.073, z: .068, trigger: false, ry: .45 });
    magHand = gmMagHand(mag, { r: .018, y: -.03, z: .002 });
  }
  return { g, slide, mag, lh, magHand, flash: GK.flash(g, Y, -.135), port: new V3(.016, .031, -.03), sight: SL, muzzleZ: -.122, pistol: true };
};

/* ================= AK-47 ================= */
GM.ak = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .01, SL = .078;
  // ---- preslenmiş çelik gövde ve üst kapak ----
  GK.prof(g, GK.blued, [[-.155, .018], [.165, .018, .002], [.17, -.012, .004], [.16, -.034], [-.035, -.034], [-.04, -.04], [-.11, -.04], [-.115, -.034], [-.155, -.028, .004]], .044);
  GK.prof(g, GK.blued, [[-.082, .017], [.168, .017], [.176, .024, .004], [.17, .037, .008], [-.07, .043, .008], [-.082, .03, .004]], .046);
  GK.tube(g, GK.steel, .005, .01, 0, .028, .179, 10);
  // ---- arka gez bloğu, gez yaprağı ve gez çentiği (çentik dibi nişan çizgisinde) ----
  GK.prof(g, GK.blued, [[-.155, .018], [-.085, .018], [-.088, .03, .004], [-.11, SL - .013, .006], [-.15, SL - .02, .008], [-.155, .035]], .036);
  GK.box(g, GK.dark, .02, .004, .05, 0, SL - .011, -.11, -.09);
  GK.box(g, GK.dark, .024, .006, .01, 0, SL - .009, -.118);
  GK.plate(g, GK.blued, [[-.01, SL - .012], [.01, SL - .012], [.01, SL + .003], [.0018, SL + .003], [.0018, SL], [-.0018, SL], [-.0018, SL + .003], [-.01, SL + .003]], .004, 0, 0, -.088);
  // ---- fişek penceresi, sürgü taşıyıcısı ve kurma kolu (atışta geri gider) ----
  GK.box(g, GK.hole, .001, .017, .085, .0222, .006, .012);
  const slide = new THREE.Group(); g.add(slide);
  GK.box(slide, GK.steel, .002, .011, .07, .0226, .006, .012);
  GK.rod(slide, GK.steel, [.022, .006, -.03], [.042, .007, -.032], .0036);
  GK.mesh(new THREE.CylinderGeometry(.0056, .006, .012, 12), GK.steel, slide, .047, .007, -.032, 0, 0, Math.PI / 2);
  // ---- şalter kolu, perçinler, tetik ----
  GK.prof(g, GK.blued, [[-.02, .013], [.11, .013], [.116, .006, .003], [.105, -.001], [0, -.003], [-.018, -.014, .003], [-.028, -.012, .003], [-.026, .004]], .0028, .0235);
  GK.screws(g, GK.steel, .044, [[-.026, -.13], [-.026, -.142], [-.026, .118], [-.026, .13], [-.026, .145], [.004, -.14], [.008, .15]], .0022);
  GK.guard(g, GK.blued, .02, .095, -.034, -.064, .01, .005);
  GK.trigger(g, GK.blued, -.034, .056);
  GK.box(g, GK.blued, .012, .02, .006, 0, -.048, -.03, .3);   // şarjör mandalı
  // ---- muz şarjör ----
  const mag = new THREE.Group(); mag.position.set(0, -.04, -.072); g.add(mag);
  GK.prof(mag, GK.blued, GK.arcPts(-.3, .025, .264, .336, 0, .62, 14), .03);
  GK.prof(mag, GK.blued, GK.arcPts(-.3, .025, .292, .308, .05, .58, 12), .033);
  GK.prof(mag, GK.blued, GK.arcPts(-.3, .025, .258, .342, .6, .64, 3), .034);
  // ---- ahşap el kundakları, gaz borusu, bilezikler ----
  GK.prof(g, GK.wood, [[-.405, -.004, .006], [-.405, .016, .004], [-.162, .02, .004], [-.162, -.03, .006], [-.33, -.032, .02], [-.405, -.022, .01]], .052);
  GK.lathe(g, GK.wood, [[.012, -.4], [.0165, -.394], [.0165, -.206], [.012, -.2]], 0, .036, 18);
  GK.tube(g, GK.blued, .0105, .045, 0, .036, -.18, 14);
  GK.rbox(g, GK.blued, .055, .052, .01, 0, -.004, -.41, .012);
  GK.rbox(g, GK.blued, .05, .056, .01, 0, -.006, -.158, .01);
  GK.prof(g, GK.blued, [[-.448, Y - .013, .003], [-.41, Y - .013, .003], [-.41, .05, .004], [-.428, .05, .004], [-.448, .03]], .028);   // gaz bloğu
  // ---- namlu, arpacık kulesi ve kalkanı, temizleme çubuğu, ağız freni ----
  GK.lathe(g, GK.blued, [[.0095, -.16], [.0095, -.716]], 0, Y, 14);
  GK.prof(g, GK.blued, [[-.706, Y - .014, .003], [-.664, Y - .014, .003], [-.664, Y + .012], [-.672, SL - .022, .004], [-.698, SL - .022, .004], [-.706, Y + .012]], .02);
  GK.hood(g, GK.blackDS, .0125, .012, 0, SL - .009, -.686, 1.2);
  GK.box(g, GK.blued, .0028, .022, .0028, 0, SL - .011, -.686);
  GK.box(g, GK.blued, .008, .012, .018, 0, Y - .022, -.69);
  GK.tube(g, GK.steel, .0028, .29, 0, Y - .02, -.555, 8);
  GK.lathe(g, GK.blued, [[.0095, -.714], [.0118, -.716], [.0118, -.757], [.0108, -.76], [.0062, -.76], [.0062, -.752]], 0, Y, 16);
  GK.box(g, GK.hole, .006, .002, .014, -.006, Y + .011, -.75, 0, 0, .5);   // eğik fren ağzı
  GK.bore(g, .0062, Y, -.7602);
  // ---- bakalit kabza ve ahşap dipçik ----
  GK.prof(g, GK.bakelite, [[.098, -.033], [.146, -.033], [.15, -.04], [.172, -.142, .008], [.162, -.15, .006], [.128, -.148, .006], [.104, -.06], [.098, -.045]], .03);
  GK.prof(g, GK.wood, [[.163, .014, .003], [.442, -.004, .006], [.442, -.118, .006], [.2, -.042, .03], [.163, -.036, .003]], .04);
  GK.prof(g, GK.blued, [[.44, -.002, .004], [.452, -.002, .004], [.452, -.12, .004], [.44, -.12, .004]], .043);
  GK.prof(g, GK.blued, [[.16, .016], [.215, .008], [.215, 0], [.16, .004]], .042);
  let lh = null, magHand = null;
  if (hands) {
    gmGripHand(g, { r: .021, rake: .24, y: -.075, z: .135, trigger: true });
    lh = gmBarHand(g, { r: .033, y: -.006, z: -.28 });
    magHand = gmMagHand(mag, { r: .022, y: -.07, z: -.016, rake: -.32 });
  }
  return { g, mag, slide, lh, magHand, flash: GK.flash(g, Y, -.785), port: new V3(.024, .006, .01), sight: SL, muzzleZ: -.76 };
};

/* ================= DEAGLE ================= */
GM.deagle = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .028, SL = .061, M = GK.chrome;
  GK.prof(g, M, [[-.162, .011, .003], [-.162, .046, .004], [-.032, .046], [-.032, .011]], .03);   // sabit namlu
  GK.prof(g, M, [[-.16, .045], [-.036, .045], [-.036, .052, .002], [-.16, .052, .002]], .016);    // üst kanal
  GK.box(g, GK.dark, .0305, .002, .12, 0, .026, -.095);
  GK.bore(g, .0065, Y, -.1622);
  GK.box(g, M, .004, .009, .01, 0, .0565, -.152);
  const slide = new THREE.Group(); g.add(slide);
  GK.prof(slide, M, [[-.034, .012, .002], [-.034, .05, .004], [.088, .05, .006], [.096, .04, .004], [.096, .012]], .036);
  for (let i = 0; i < 6; i++) GK.box(slide, GK.dark, .0372, .026, .0018, 0, .031, .054 + i * .0065);
  GK.plate(slide, M, [[-.013, .049], [.013, .049], [.013, SL + .004], [.002, SL + .004], [.002, SL], [-.002, SL], [-.002, SL + .004], [-.013, SL + .004]], .007, 0, 0, .088);
  GK.box(slide, GK.hole, .001, .016, .044, .0182, .035, .006);
  for (const s of [-1, 1]) GK.pin(slide, M, .0055, .004, s * .0195, .04, .074, 12);
  GK.prof(g, M, [[-.16, .012], [.092, .012], [.1, .004, .004], [.126, -.1, .008], [.118, -.115, .006], [.072, -.116, .006], [.052, -.018, .006], [.042, -.052, .01], [-.024, -.052, .01], [-.03, -.012], [-.16, -.008, .003]], .03, 0,
    { holes: [[[.044, -.016], [.034, -.043, .008], [-.016, -.043, .008], [-.019, -.014]]] });
  GK.prof(g, GK.rubber, [[.06, -.02], [.098, -.008], [.12, -.098, .008], [.114, -.109, .005], [.076, -.11, .005], [.058, -.03]], .035);
  GK.prof(g, M, [[.094, .016], [.104, .022], [.114, .04, .003], [.106, .044, .002], [.098, .03]], .01);
  GK.trigger(g, M, -.014, .012);
  const mag = new THREE.Group(); mag.position.set(0, -.075, .093); mag.rotation.x = -.24; g.add(mag);
  GK.rbox(mag, M, .022, .09, .036, 0, .015, 0, .004);
  GK.rbox(mag, GK.dark, .03, .01, .05, 0, -.036, .002, .004);
  let lh = null, magHand = null;
  if (hands) {
    gmGripHand(g, { r: .021, rake: .24, y: -.06, z: .09, trigger: true });
    lh = gmGripHand(g, { left: true, r: .027, rake: .24, x: -.02, y: -.078, z: .082, trigger: false, ry: .45 });
    magHand = gmMagHand(mag, { r: .02, y: -.03, z: .002 });
  }
  return { g, slide, mag, lh, magHand, flash: GK.flash(g, Y, -.178), port: new V3(.019, .035, .006), sight: SL, muzzleZ: -.162, pistol: true };
};

/* ================= USP-S (susturuculu) ================= */
GM.usps = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .02, SL = .039;
  const slide = new THREE.Group(); g.add(slide);
  GK.prof(slide, GK.black, [[-.112, .004, .003], [-.112, .028, .006], [.072, .031, .006], [.078, .025, .004], [.078, .004]], .03);
  for (let i = 0; i < 8; i++) GK.box(slide, GK.dark, .0312, .018, .0016, 0, .019, .04 + i * .004);
  GK.box(slide, GK.black, .0035, .008, .007, 0, .035, -.104);
  GK.mesh(new THREE.CircleGeometry(.0012, 8), GK.white, slide, 0, .0365, -.1003);
  GK.plate(slide, GK.black, [[-.0105, .03], [.0105, .03], [.0105, SL + .004], [.0018, SL + .004], [.0018, SL], [-.0018, SL], [-.0018, SL + .004], [-.0105, SL + .004]], .006, 0, 0, .07);
  for (const s of [-1, 1]) GK.mesh(new THREE.CircleGeometry(.0011, 8), GK.white, slide, s * .006, SL + .0012, .0732);
  GK.box(slide, GK.hole, .001, .014, .04, .0155, .021, 0);
  GK.lathe(g, GK.black, [[.012, -.112], [.0185, -.118], [.0185, -.296], [.016, -.302], [.006, -.302], [.006, -.296]], 0, Y, 24);   // susturucu
  for (const zz of [-.13, -.28]) GK.lathe(g, GK.dark, [[.0185, zz - .003], [.019, zz - .002], [.019, zz + .002], [.0185, zz + .003]], 0, Y, 24);
  GK.bore(g, .006, Y, -.3022);
  GK.prof(g, GK.poly, [[-.105, .004], [.074, .004], [.082, -.002, .004], [.108, -.1, .008], [.102, -.112, .006], [.06, -.113, .006], [.04, -.016, .006], [.03, -.046, .01], [-.025, -.046, .01], [-.035, -.012], [-.105, -.01, .004]], .028, 0,
    { holes: [[[.032, -.015], [.023, -.038, .008], [-.018, -.038, .008], [-.026, -.014]]] });
  GK.prof(g, GK.grip, [[.05, -.02], [.082, -.01], [.104, -.096, .008], [.098, -.106, .005], [.068, -.107, .005], [.052, -.03]], .0305);
  for (const zz of [-.09, -.07, -.05]) GK.box(g, GK.dark, .0285, .002, .006, 0, -.007, zz);   // ray yuvaları
  GK.prof(g, GK.black, [[.074, .006], [.084, .01], [.092, .024, .003], [.086, .028, .002], [.078, .018]], .008);
  GK.trigger(g, GK.black, -.014, .004);
  const mag = new THREE.Group(); mag.position.set(0, -.075, .083); mag.rotation.x = -.25; g.add(mag);
  GK.rbox(mag, GK.steel, .02, .088, .034, 0, .014, 0, .004);
  GK.rbox(mag, GK.poly, .026, .009, .042, 0, -.035, .002, .003);
  let lh = null, magHand = null;
  if (hands) {
    gmGripHand(g, { r: .02, rake: .25, y: -.055, z: .075, trigger: true });
    lh = gmGripHand(g, { left: true, r: .026, rake: .25, x: -.02, y: -.073, z: .068, trigger: false, ry: .45 });
    magHand = gmMagHand(mag, { r: .018, y: -.03, z: .002 });
  }
  return { g, slide, mag, lh, magHand, flash: GK.flash(g, Y, -.31, 0xffe0a0), port: new V3(.016, .021, 0), sight: SL, muzzleZ: -.302, pistol: true };
};

/* ================= GLOCK ================= */
GM.glock = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .02, SL = .038;
  const slide = new THREE.Group(); g.add(slide);
  GK.prof(slide, GK.black, [[-.105, .005, .002], [-.105, .031, .003], [.074, .031, .003], [.074, .005, .002]], .0285, 0, { bevel: .004 });
  for (let i = 0; i < 7; i++) GK.box(slide, GK.dark, .029, .02, .0016, 0, .019, .045 + i * .0038);
  GK.box(slide, GK.black, .0035, .007, .006, 0, .0345, -.098);
  GK.mesh(new THREE.CircleGeometry(.0012, 8), GK.white, slide, 0, .0355, -.0948);
  GK.plate(slide, GK.black, [[-.01, .029], [.01, .029], [.01, SL + .004], [.002, SL + .004], [.002, SL], [-.002, SL], [-.002, SL + .004], [-.01, SL + .004]], .006, 0, 0, .066);
  for (const s of [-1, 1]) GK.box(slide, GK.white, .0008, .0035, .0005, s * .0026, SL + .0018, .0693);
  GK.box(slide, GK.white, .0048, .0008, .0005, 0, SL + .0002, .0693);
  GK.box(slide, GK.hole, .001, .013, .036, .0148, .022, -.005);
  GK.bore(slide, .0045, Y, -.1052);
  GK.prof(g, GK.poly, [[-.098, .005], [.07, .005], [.078, 0, .004], [.086, -.004], [.112, -.1, .008], [.104, -.112, .006], [.064, -.112, .005], [.06, -.1], [.052, -.09, .004], [.056, -.079], [.048, -.068, .004], [.051, -.057], [.043, -.046, .004], [.042, -.016, .006], [.03, -.044, .01], [-.024, -.044, .01], [-.032, -.012], [-.098, -.009, .003]], .028, 0,
    { holes: [[[.032, -.015], [.024, -.036, .008], [-.016, -.036, .008], [-.024, -.013]]] });
  GK.prof(g, GK.grip, [[.054, -.022], [.086, -.012], [.106, -.096, .008], [.1, -.106, .005], [.068, -.106, .005], [.056, -.04]], .0295);
  GK.box(g, GK.dark, .022, .004, .04, 0, -.011, -.07);
  GK.trigger(g, GK.poly, -.014, .002);
  const mag = new THREE.Group(); mag.position.set(0, -.075, .085); mag.rotation.x = -.26; g.add(mag);
  GK.rbox(mag, GK.poly, .021, .088, .034, 0, .014, 0, .005);
  GK.rbox(mag, GK.poly, .026, .008, .04, 0, -.034, .002, .003);
  let lh = null, magHand = null;
  if (hands) {
    gmGripHand(g, { r: .02, rake: .27, y: -.055, z: .077, trigger: true });
    lh = gmGripHand(g, { left: true, r: .026, rake: .27, x: -.02, y: -.073, z: .07, trigger: false, ry: .45 });
    magHand = gmMagHand(mag, { r: .018, y: -.03, z: .002 });
  }
  return { g, slide, mag, lh, magHand, flash: GK.flash(g, Y, -.12), port: new V3(.016, .022, -.005), sight: SL, muzzleZ: -.105, pistol: true };
};

/* ================= POMPALI (870 tipi) ================= */
// fişek: dik eksenli (y), pirinç taban aşağıda
GM.shell = () => {
  const s = new THREE.Group();
  s.add(new THREE.Mesh(new THREE.LatheGeometry([[0, .036], [.006, .0365], [.0118, .035], [.0135, .032], [.0135, -.02]].map(([r, y]) => new THREE.Vector2(r, y)), 16), GK.shell));
  s.add(new THREE.Mesh(new THREE.LatheGeometry([[.0135, -.02], [.0141, -.0205], [.0141, -.035], [.0149, -.036], [.0149, -.039], [0, -.039]].map(([r, y]) => new THREE.Vector2(r, y)), 16), GK.brass));
  return s;
};
GM.r870 = ({ hands = true } = {}) => {
  const g = new THREE.Group(), Y = .022;
  // ---- gövde, fişek çıkış penceresi, doldurma ağzı ----
  GK.prof(g, GK.black, [[-.125, -.05], [-.125, .036, .004], [-.11, .042, .004], [.12, .045, .006], [.165, .03, .016], [.165, -.05]], .05);
  GK.box(g, GK.hole, .001, .034, .08, .0252, .013, -.02);
  GK.box(g, GK.steel, .001, .016, .044, .0258, .013, -.012);
  GK.box(g, GK.hole, .028, .001, .09, 0, -.0505, .025);
  GK.screws(g, GK.steel, .05, [[-.035, .06], [-.035, .14]], .003);
  // ---- tetik korkuluğu, tetik, emniyet ----
  GK.guard(g, GK.black, .115, .19, -.05, -.085, .012, .006);
  GK.trigger(g, GK.steel, -.051, .156);
  GK.pin(g, GK.steel, .004, .056, 0, -.057, .18, 10);
  GK.box(g, GK.steel, .004, .008, .014, .012, -.057, .105);
  // ---- namlu, arpacık boncuğu, şarjör tüpü, kelepçe ----
  GK.lathe(g, GK.steel, [[.0155, -.125], [.0155, -.858], [.0145, -.862], [.011, -.862], [.011, -.855]], 0, Y, 20);
  GK.bore(g, .011, Y, -.8622);
  GK.mesh(new THREE.SphereGeometry(.0032, 10, 8), GK.brass, g, 0, Y + .0175, -.85);
  GK.lathe(g, GK.black, [[.0135, -.125], [.0135, -.735]], 0, -.022, 18);
  GK.lathe(g, GK.steel, [[.0135, -.735], [.0148, -.738], [.0148, -.762], [.012, -.766], [0, -.766]], 0, -.022, 18);
  GK.rbox(g, GK.black, .032, .07, .02, 0, 0, -.72, .012);
  // ---- pompa: tırtıklı ahşap kol ve iki hareket kolu ----
  const pump = new THREE.Group(); pump.position.set(0, -.02, -.3); g.add(pump);
  const rib = [[.021, -.1], [.0275, -.096]];
  for (let i = 0; i < 9; i++) { const z = -.09 + i * .0205; rib.push([.0275, z], [.0256, z + .006], [.0256, z + .0125], [.0275, z + .0185]); }
  rib.push([.0275, .096], [.021, .1]);
  GK.lathe(pump, GK.wood, rib, 0, -.002, 22).scale.x = .95;
  for (const s of [-1, 1]) GK.tube(pump, GK.steel, .0025, .19, s * .016, .006, .19, 8);
  // ---- sol yanda yedek fişek taşıyıcı ----
  GK.prof(g, GK.black, [[-.075, -.032], [.05, -.032], [.05, .03], [-.075, .03]], .004, -.027);
  for (let i = 0; i < 4; i++) { const sh = GM.shell(); sh.position.set(-.043, -.004, -.058 + i * .031); g.add(sh); }
  // ---- tabancalı ahşap dipçik ve lastik pabuç ----
  GK.prof(g, GK.wood, [[.163, .036, .003], [.3, .022], [.462, .016, .006], [.462, -.15, .006], [.33, -.092, .02], [.25, -.07, .02], [.276, -.148, .01], [.232, -.146, .01], [.195, -.065, .008], [.17, -.055], [.163, -.05]], .044);
  GK.prof(g, GK.rubber, [[.46, .018, .006], [.482, .018, .006], [.482, -.152, .006], [.46, -.152, .006]], .047);
  // ---- eller: sağ el kabzada, sol el pompada (doldururken fişeği bu el taşır) ----
  const hand = new THREE.Group(); g.add(hand);
  if (hands) {
    gmGripHand(g, { r: .023, rake: .37, y: -.088, z: .235, trigger: true });
    gmBarHand(hand, { r: .033, y: .04, z: -.02 });
  }
  const shell = GM.shell(); shell.position.set(.012, .075, -.02); shell.rotation.x = Math.PI / 2; shell.visible = false; hand.add(shell);
  return { g, pump, hand, shell, flash: GK.flash(g, Y, -.885, 0xffb850), kick: 0, flashT: 0, port: new V3(.027, .015, -.02), sight: .044 };
};

/* ================= UZI ================= */
GM.uzi = (side = 1, { hands = true } = {}) => {
  const g = new THREE.Group(), Y = .012, SL = .062;
  GK.prof(g, GK.black, [[-.15, -.04, .004], [-.15, .034, .006], [.148, .034, .006], [.148, -.04, .004]], .06);
  for (const yy of [-.004, -.024]) GK.box(g, GK.black, .0625, .005, .25, 0, yy, -.005);
  GK.prof(g, GK.black, [[-.13, .033], [.148, .033], [.148, .044, .004], [-.13, .044, .004]], .054);
  GK.rbox(g, GK.dark, .014, .012, .022, 0, .05, -.07, .003);
  for (let i = 0; i < 4; i++) GK.box(g, GK.steel, .015, .0015, .002, 0, .0565, -.078 + i * .005);
  // kulaklı arpacık ve delikli gez (ikisi de nişan çizgisinde)
  GK.box(g, GK.black, .02, .008, .016, 0, .048, -.132);
  for (const s of [-1, 1]) { GK.box(g, GK.black, .0035, .016, .014, s * .0085, SL - .006, -.132); GK.box(g, GK.black, .0035, .016, .014, s * .0085, SL - .006, .13); }
  GK.box(g, GK.dark, .0025, .014, .003, 0, SL - .007, -.132);
  GK.box(g, GK.black, .02, .008, .016, 0, .048, .13);
  GK.plate(g, GK.black, [[-.006, .052], [.006, .052], [.006, SL + .003], [-.006, SL + .003]], .003, 0, 0, .13, { holes: [GK.circle(0, SL, .0022, 12)] });
  // namlu somunu (tırtıklı) ve kısa namlu
  GK.lathe(g, GK.black, [[.018, -.149], [.0185, -.152], [.0185, -.17], [.012, -.176], [.009, -.176]], 0, Y, 20);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; GK.box(g, GK.dark, .003, .003, .016, Math.cos(a) * .0186, Y + Math.sin(a) * .0186, -.161, 0, 0, a); }
  GK.lathe(g, GK.steel, [[.0085, -.176], [.0085, -.225], [.0078, -.228], [.0045, -.228], [.0045, -.22]], 0, Y, 14);
  GK.bore(g, .0045, Y, -.2282);
  GK.box(g, GK.hole, .001, .022, .045, .0305, .008, -.035);
  // tetik korkuluğu, kabza (şarjör içinde), kabza emniyeti, şalter
  GK.guard(g, GK.black, -.07, .005, -.04, -.072, .014, .006);
  GK.trigger(g, GK.steel, -.041, -.03);
  GK.prof(g, GK.grip, [[0, -.04], [.072, -.04], [.08, -.17, .006], [.012, -.17, .006]], .036);
  GK.prof(g, GK.steel, [[.07, -.045], [.078, -.045], [.086, -.14, .003], [.079, -.14]], .02);
  GK.pin(g, GK.steel, .005, .004, -.0195, -.03, .045, 10);
  const mag = new THREE.Group(); mag.position.set(0, -.21, .044); mag.rotation.x = -.06; g.add(mag);
  GK.rbox(mag, GK.black, .026, .13, .034, 0, .02, 0, .004);
  GK.rbox(mag, GK.dark, .03, .01, .04, 0, -.047, 0, .004);
  if (hands) gmGripHand(g, { left: side === -1, r: .028, rake: .06, y: -.088, z: .04, trigger: true });
  return { g, mag, flash: GK.flash(g, Y, -.24, 0xffc860), port: new V3(.032, .008, -.035), sight: SL };
};

/* ================= ROKETATAR (RPG tipi) ================= */
GM.rpg = ({ hands = true } = {}) => {
  const g = new THREE.Group();
  GK.lathe(g, GK.steel, [[.021, -.5], [.024, -.497], [.024, .3], [.026, .31], [.026, .33]], 0, 0, 22);
  GK.lathe(g, GK.steel, [[.026, .33], [.03, .35], [.046, .44], [.047, .45], [.043, .45], [.022, .36]], 0, 0, 24);   // arka ağız
  GK.mesh(new THREE.CircleGeometry(.024, 18), GK.hole, g, 0, 0, .362);
  GK.lathe(g, GK.wood, [[.024, -.13], [.031, -.125], [.032, -.11], [.032, .08], [.031, .095], [.024, .1]], 0, 0, 22);   // ahşap ısı kalkanı
  for (const zz of [-.135, .105]) GK.lathe(g, GK.steel, [[.024, zz - .006], [.0335, zz - .005], [.0335, zz + .005], [.024, zz + .006]], 0, 0, 22);
  // kabzalar, tetik
  GK.rbox(g, GK.black, .022, .014, .26, 0, -.028, -.1, .004);
  GK.prof(g, GK.poly, [[-.005, -.032], [.04, -.032], [.06, -.14, .008], [.054, -.15, .005], [.024, -.15, .005], [.002, -.06]], .028);
  GK.guard(g, GK.black, -.068, -.002, -.034, -.064, .01, .005);
  GK.trigger(g, GK.steel, -.035, -.04);
  GK.prof(g, GK.poly, [[-.24, -.032], [-.2, -.032], [-.196, -.13, .008], [-.236, -.132, .008]], .028);
  // gezler ve yan optik nişangah
  GK.box(g, GK.steel, .004, .03, .008, 0, .036, -.42);
  GK.plate(g, GK.steel, [[-.008, .022], [.008, .022], [.008, .05], [.002, .05], [.002, .044], [-.002, .044], [-.002, .05], [-.008, .05]], .004, 0, 0, -.15);
  GK.rbox(g, GK.black, .012, .03, .05, -.03, .03, -.08, .004);
  GK.rbox(g, GK.black, .032, .05, .12, -.058, .045, -.08, .01);
  GK.lathe(g, GK.black, [[.012, -.14], [.016, -.15], [.016, -.165], [0, -.165]], -.058, .052, 18);
  GK.lathe(g, GK.rubber, [[0, .02], [.012, .02], [.017, .03], [.018, .055], [.014, .055]], -.058, .052, 18);
  GK.mesh(new THREE.CircleGeometry(.004, 10), GK.glowRed, g, -.058, .052, .0205);
  // savaş başlığı (ateşten sonra önden takılır)
  const head = new THREE.Group(); head.position.z = -.52; g.add(head);
  GK.lathe(head, GK.grenade, [[0, -.37], [.005, -.37], [.005, -.335], [.012, -.32], [.03, -.25], [.042, -.17], [.043, -.11], [.04, -.075], [.028, -.045], [.02, -.02], [.02, .03]], 0, 0, 26);
  GK.lathe(head, GK.brass, [[0, -.381], [.004, -.379], [.005, -.37], [0, -.37]], 0, 0, 12);
  GK.lathe(head, GK.od, [[.019, .03], [.019, .2], [0, .2]], 0, 0, 16);
  if (hands) {
    gmGripHand(g, { r: .021, rake: .16, y: -.085, z: .03, trigger: true });
    gmGripHand(g, { left: true, r: .021, rake: .03, y: -.08, z: -.218, trigger: false });
  }
  return { g, head };
};

/* ================= BOMBAATAR (M79 tipi, kırma namlu) ================= */
GM.m79 = ({ hands = true } = {}) => {
  const g = new THREE.Group();
  // namlu grubu: menteşe gövdenin alt önünde; açılınca namlu aşağı, fişek yatağı yukarı bakar
  const barrel = new THREE.Group(); barrel.position.set(0, -.035, -.06); g.add(barrel);
  GK.lathe(barrel, GK.od, [[.03, 0], [.033, -.004], [.033, -.35], [.031, -.356], [.025, -.356], [.025, -.34]], 0, .035, 26);
  GK.bore(barrel, .025, .035, -.3562);
  GK.box(barrel, GK.od, .006, .012, .01, 0, .073, -.34);
  GK.prof(barrel, GK.steel, [[-.12, .066], [-.05, .066], [-.05, .074], [-.12, .071]], .026);   // katlı merdiven gez
  GK.prof(barrel, GK.wood, [[-.21, 0, .006], [-.01, 0], [-.01, -.031, .01], [-.18, -.025, .015], [-.21, -.013, .008]], .05);   // el kundağı
  const shell = new THREE.Group(); shell.position.set(0, .035, 0); barrel.add(shell);
  GK.lathe(shell, GK.brass, [[0, .006], [.031, .006], [.031, -.004], [.028, -.006], [.028, -.06]], 0, 0, 22);
  GK.mesh(new THREE.CircleGeometry(.006, 12), GK.steel, shell, 0, 0, .0062);   // kapsül
  // gövde, mandal, tetik
  GK.prof(g, GK.steel, [[-.062, -.034, .004], [-.062, .03, .006], [.04, .036, .008], [.065, .02, .006], [.065, -.034]], .05);
  GK.prof(g, GK.steel, [[0, .034], [.045, .04], [.05, .046, .003], [.01, .044]], .012);
  GK.guard(g, GK.steel, .005, .08, -.034, -.064, .012, .006);
  GK.trigger(g, GK.steel, -.035, .045);
  // ahşap dipçik ve geniş lastik pabuç
  GK.prof(g, GK.wood, [[.062, .03, .006], [.2, .012], [.44, .02, .008], [.44, -.13, .008], [.26, -.1, .03], [.14, -.07, .02], [.1, -.055], [.065, -.035]], .046);
  GK.prof(g, GK.rubber, [[.438, .022, .006], [.47, .022, .008], [.47, -.135, .008], [.438, -.132, .006]], .05);
  if (hands) {
    gmGripHand(g, { r: .022, rake: .7, y: -.045, z: .135, trigger: true });
    gmBarHand(barrel, { r: .027, y: -.015, z: -.1 });
  }
  return { g, barrel, shell };
};
