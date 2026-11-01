'use strict';
/* SAVUNMA modu (co-op; tek kişi de oynanır): Mühür Kalesi'nin ortasındaki Mühür Taşı'nı dalgalara karşı koru.
   - İblisler dört geçitten gelir; yakınlarındaki oyuncuya, önlerini kesen yapıya ya da doğrudan mühre saldırırlar
   - Öldürmeler ve temizlenen dalgalar takıma hurda kazandırır. Dalga aralarında 20 sn kurma süresi var (her an kurulabilir)
   - B: kurma menüsü · 1 makineli taret · 2 havan topu · 3 barikat · 4 mühür tamiri
     Önizleme: sol tık kur, sağ tık / B vazgeç, R barikatı döndürür
   - Ölen oyuncu 8 sn sonra mühürde yeniden doğar; mühür kırılırsa oyun biter
   Host yetkilidir: taretler, havan, hasar ve hurda hostta hesaplanır; durum saniyede 10 kez herkese gider. */

const isDefense = () => net.gameMode === 'defense';
const DEF_KINDS = {
  mg: { name: 'MAKİNELİ TARET', cost: 150, hp: 260, rad: .55 },
  havan: { name: 'HAVAN TOPU', cost: 250, hp: 220, rad: .55 },
  barikat: { name: 'BARİKAT', cost: 60, hp: 480, rad: .4 },
};
const DEF_ORDER = ['mg', 'havan', 'barikat', 'tamir'];
const DEF_REPAIR = 120, CORE_HP = 1200, DEF_MAX_BUILDS = 14, DEF_BUILD_T = 20, DEF_RESPAWN = 8;
const DEF_PORTALS = [[0, -21.6], [21.6, 0], [0, 21.6], [-21.6, 0]];
const KILL_SCRAP = { grunt: 10, imp: 10, runner: 8, brute: 30, shielder: 20, bomber: 12, flyer: 15, cellat: 150, witch: 150, boss: 300, lord: 300 };
const def = { scrap: 300, core: CORE_HP, builds: [], nextId: 1, menu: false, sel: null, rot: 0, ghosts: {}, ok: false, gx: 0, gz: 0, sendT: 0, respawnT: 0, shells: [], over: false, hitT: 0, hudT: 0, warned: false, crystal: null, coreGlow: null, coreRing: null, portals: [] };
const coreTg = { core: true, x: 0, y: .55, z: 0, vx: 0, vz: 0, rad: 1.45 };
const _dv1 = new V3(), _dv2 = new V3();

/* ================= HARİTA: MÜHÜR KALESİ ================= */
const swirlTex = canvasTex(128, (g, s) => {
  g.clearRect(0, 0, s, s);
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,230,200,1)'); gr.addColorStop(.25, 'rgba(255,90,30,.9)'); gr.addColorStop(.7, 'rgba(160,10,0,.55)'); gr.addColorStop(1, 'rgba(60,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  // girdap: ince, yarı saydam kollar ve dağınık kıvılcım lekeleri (şeker gibi keskin sarmal olmasın)
  for (let k = 0; k < 7; k++) {
    g.strokeStyle = `rgba(255,${150 + k * 12},90,${.08 + Math.random() * .1})`; g.lineWidth = 2 + Math.random() * 5;
    g.beginPath(); for (let a = .4; a < 7; a += .08) { const r = a * 8.6, t = a * .9 + k * Math.PI * 2 / 7; g.lineTo(s / 2 + Math.cos(t) * r, s / 2 + Math.sin(t) * r); } g.stroke();
  }
  for (let i = 0; i < 260; i++) { const a = Math.random() * 6.28, r = Math.random() * s * .45; g.fillStyle = `rgba(255,${120 + Math.random() * 120 | 0},60,${Math.random() * .25})`; g.fillRect(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r, 2, 2); }
}, 1, 1, false);
MAPS.kale = {
  name: 'MÜHÜR KALESİ', half: 24,
  fog: 0x0a0c15, fogD: .028, hemi: [0x5a6a9a, 0x1a0a08], hemiI: .62, moon: 0x9fb4ff, moonI: .42,
  lava: 0xff3a12, flame: 0xff7a22, light: 0xff7428, ember: 0xff7a2a, floor: 0xb4b0bc, wall: 0x9a9aae,
  spawn: () => new V3(rand(-2.5, 2.5), .6, rand(3.4, 5)),
  build() {
    def.portals = [];
    // Mühür Taşı: taş kaide, dört dikili taş, havada dönen kristal, yerde ışıyan mühür halkası
    const stone = new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x8a8a98, roughness: .9 });
    mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, .55, 8), stone)).position.set(0, .275, 0);
    mapMesh(new THREE.Mesh(new THREE.CylinderGeometry(.95, 1.1, .3, 8), stone)).position.set(0, .7, 0);
    const runeGlow = new THREE.MeshBasicMaterial({ color: 0x3ad8ff });
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 1.9, z = Math.sin(a) * 1.9;
      const ob = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.32, 1.9, .32), stone)); ob.position.set(x, .95, z); ob.rotation.y = -a;
      const st = mapMesh(new THREE.Mesh(new THREE.BoxGeometry(.06, 1.2, .02), runeGlow)); st.position.set(x * .915, 1.05, z * .915); st.rotation.y = -a + Math.PI / 2;
    }
    const cm = new THREE.MeshStandardMaterial({ color: 0x9ae8ff, emissive: 0x2ab8ff, emissiveIntensity: 1.2, roughness: .15, metalness: .2, transparent: true, opacity: .92 });
    def.crystal = mapMesh(new THREE.Mesh(new THREE.OctahedronGeometry(.6, 0), cm)); def.crystal.scale.set(1, 1.7, 1); def.crystal.position.set(0, 2.1, 0);
    def.coreGlow = mapMesh(new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x3ab8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }))); def.coreGlow.position.set(0, 2.1, 0); def.coreGlow.scale.set(4.5, 4.5, 1);
    def.coreRing = mapMesh(new THREE.Mesh(new THREE.RingGeometry(2.3, 2.6, 48), new THREE.MeshBasicMaterial({ color: 0x3ad8ff, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false })));
    def.coreRing.rotation.x = -Math.PI / 2; def.coreRing.position.y = .02;
    const L = torchLights[0]; L.position.set(0, 2.4, 0); L.color.setHex(0x4ac8ff); L.distance = 20; L.intensity = 2.2;
    addBlock(2.8, 3, 2.8, 0, 1.5, 0, null, true, true);
    // dört cehennem geçidi: taş kemer, içinde dönen ateş girdabı
    for (const [x, z] of DEF_PORTALS) {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.atan2(x, z); mapMesh(g);
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.8, 4.2, .9), pillarMat); p.position.set(s * 2.1, 2.1, 0); g.add(p); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(5, .8, 1), pillarMat); top.position.set(0, 4.4, 0); g.add(top);
      const sw = new THREE.Mesh(new THREE.CircleGeometry(1.75, 32), new THREE.MeshBasicMaterial({ map: swirlTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      sw.position.set(0, 2.05, 0); sw.scale.y = 1.15; g.add(sw); def.portals.push(sw);
      const sc = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .55, depthWrite: false })); sc.rotation.x = -Math.PI / 2; sc.position.set(0, .015, -1.4); g.add(sc);
      const ax = Math.abs(x) > 1;
      for (const s of [-1, 1]) addBlock(ax ? .9 : .8, 4.2, ax ? .8 : .9, x + (ax ? 0 : s * 2.1), 2.1, z + (ax ? s * 2.1 : 0), null, true, true);
    }
    // siperler: kırık sütunlar, alçak duvarlar, mangallar
    [[-9, -9, 2.4], [9, -9, 3.1], [9, 9, 2], [-9, 9, 2.8]].forEach(([x, z, h]) => addBlock(1.4, h, 1.4, x, h / 2, z, pillarMat, true, true));
    for (const s of [-1, 1]) {
      addBlock(3.2, 1.1, .7, s * 5.5, .55, -13, lowStoneMat, true, true); addBlock(3.2, 1.1, .7, s * 5.5, .55, 13, lowStoneMat, true, true);
      addBlock(.7, 1.1, 3.2, -13, .55, s * 5.5, lowStoneMat, true, true); addBlock(.7, 1.1, 3.2, 13, .55, s * 5.5, lowStoneMat, true, true);
    }
    [[-16, -16, 1], [16, 16, 2], [16, -16, 3], [-16, 16, 3]].forEach(([x, z, i]) => makeBrazier(x, z, i));
  },
};

/* ================= MODELLER ================= */
const DM = {
  steel: new THREE.MeshStandardMaterial({ color: 0x2c2f34, metalness: .65, roughness: .42 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x17181b, metalness: .5, roughness: .5 }),
  olive: new THREE.MeshStandardMaterial({ color: 0x353b27, roughness: .7, metalness: .15 }),
  sand: new THREE.MeshStandardMaterial({ color: 0x5e5238, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x4e3620, roughness: .88 }),
  spike: new THREE.MeshStandardMaterial({ color: 0x5a5a60, metalness: .7, roughness: .4 }),
  ghostOk: new THREE.MeshBasicMaterial({ color: 0x5aff8a, transparent: true, opacity: .38, depthWrite: false }),
  ghostBad: new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: .38, depthWrite: false }),
  flash: new THREE.SpriteMaterial({ map: glowTex, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
};
const sandbagGeo = new THREE.CylinderGeometry(.13, .13, .4, 8);
function defModel(k) {
  const g = new THREE.Group(), add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const out = { g, head: null, tip: null, flash: null, tube: null };
  if (k === 'barikat') {
    // ahşap kazıklı barikat: iki dikme, üç kalas, öne bakan sivri kazıklar
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(.14, 1.1, .14), DM.wood, s * 1.08, .55, 0);
    for (const y of [.28, .6, .92]) { const p = add(new THREE.BoxGeometry(2.4, .2, .07), DM.wood, 0, y, .02); p.rotation.z = (y - .6) * .05; }
    for (let i = 0; i < 5; i++) { const c = add(new THREE.ConeGeometry(.05, .75, 6), DM.wood, -.96 + i * .48, .55, -.32); c.rotation.x = -1.05; }
    for (const s of [-1, 1]) { const b = add(new THREE.BoxGeometry(.1, 1.3, .1), DM.wood, s * .6, .5, -.15); b.rotation.set(.5, 0, s * .2); }
    return out;
  }
  // kum torbası halkası
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, b = add(sandbagGeo, DM.sand, Math.cos(a) * .48, .12, Math.sin(a) * .48); b.rotation.set(Math.PI / 2, 0, a); b.scale.z = .7; }
  const head = new THREE.Group(); g.add(head); out.head = head;
  if (k === 'mg') {
    add(new THREE.CylinderGeometry(.09, .16, .8, 8), DM.steel, 0, .4, 0);
    head.position.y = .86;
    add(new THREE.CylinderGeometry(.1, .1, .12, 10), DM.dark, 0, 0, 0, head);
    add(new THREE.BoxGeometry(.2, .2, .62), DM.olive, 0, .12, .05, head);                        // gövde
    const jacket = add(new THREE.CylinderGeometry(.055, .055, .5, 10), DM.dark, 0, .14, -.48, head); jacket.rotation.x = Math.PI / 2;   // soğutma ceketi
    const bar = add(new THREE.CylinderGeometry(.022, .022, .34, 8), DM.steel, 0, .14, -.88, head); bar.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(.18, .16, .24), DM.olive, .19, .08, .05, head);                     // fişek kutusu
    add(new THREE.BoxGeometry(.62, .42, .03), DM.olive, 0, .16, -.2, head);                       // kalkan
    add(new THREE.BoxGeometry(.04, .14, .3), DM.dark, 0, .08, .4, head);                          // tutamak
    out.tip = new THREE.Object3D(); out.tip.position.set(0, .14, -1.06); head.add(out.tip);
  } else {
    add(new THREE.CylinderGeometry(.46, .5, .06, 16), DM.dark, 0, .03, 0);                        // taban plakası
    head.position.y = .12;
    const tube = new THREE.Group(); tube.rotation.x = -.95; head.add(tube); out.tube = tube;
    const t = add(new THREE.CylinderGeometry(.085, .095, 1.15, 14), DM.olive, 0, .55, 0, tube);
    add(new THREE.CylinderGeometry(.1, .1, .08, 14), DM.dark, 0, 1.1, 0, tube);
    for (const s of [-1, 1]) { const l = add(new THREE.CylinderGeometry(.02, .02, .8, 6), DM.steel, s * .22, .32, -.3, head); l.rotation.set(-.35, 0, s * .3); }
    out.tip = new THREE.Object3D(); out.tip.position.set(0, 1.15, 0); tube.add(out.tip);
    t.userData.tube = true;
  }
  out.flash = new THREE.Sprite(DM.flash); out.flash.scale.set(.55, .55, 1); out.flash.visible = false; out.tip.add(out.flash);
  return out;
}
// can çubuğu: kameraya döner, yalnız hasarlıyken görünür
function defBar() {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, .09), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .6, depthWrite: false }));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, .07), new THREE.MeshBasicMaterial({ color: 0x5aff8a, depthWrite: false }));
  fill.position.z = .002; g.add(bg, fill); g.userData.fill = fill; g.visible = false; g.renderOrder = 9;
  return g;
}
function defGhost(k) {
  if (def.ghosts[k]) return def.ghosts[k];
  const m = defModel(k);
  m.g.traverse(o => { if (o.isMesh) o.material = DM.ghostOk; });
  if (m.flash) m.flash.visible = false;
  m.g.visible = false; scene.add(m.g);
  return (def.ghosts[k] = m);
}
const defFoot = (k, ry) => k === 'barikat' ? (Math.abs(Math.sin(ry)) > .5 ? [.3, 1.25] : [1.25, .3]) : [.48, .48];

/* ================= KURMA / KALDIRMA ================= */
function defPlace(id, k, x, z, ry) {
  const K = DEF_KINDS[k], m = defModel(k);
  m.g.position.set(x, 0, z); m.g.rotation.y = ry; scene.add(m.g);
  const [hw, hd] = defFoot(k, ry), h = k === 'barikat' ? 1.05 : 1.15;
  const out = Math.atan2(-x, -z);   // namlu başta mühürden dışarı bakar
  const s = { id, k, x, z, ry, hp: K.hp, max: K.hp, m, cd: k === 'havan' ? 1.5 : 0, rt: 0, tgt: null, yaw: out, tyaw: out, shots: 0, seen: 0, recoil: 0, flashT: 0, hitT: 0 };
  s.body = new CANNON.Body({ mass: 0, material: mWorld, collisionFilterGroup: G_STATIC, collisionFilterMask: -1 });
  s.body.addShape(new CANNON.Box(new CANNON.Vec3(hw, h / 2, hd))); s.body.position.set(x, h / 2, z); world.addBody(s.body);
  s.st = { x0: x - hw, x1: x + hw, y0: 0, y1: h, z0: z - hd, z1: z + hd }; statics.push(s.st);
  s.tg = { build: s, x, y: .45, z, vx: 0, vz: 0, rad: Math.min(hw, hd) + .15 };
  s.bar = defBar(); s.bar.position.set(x, h + .45, z); scene.add(s.bar);
  def.builds.push(s);
  chips(new V3(x, .3, z), 24, .55, .45, .32, 3.5); sfx.wood();
  return s;
}
function defRemove(s, fx) {
  const i = def.builds.indexOf(s); if (i < 0) return;
  def.builds.splice(i, 1);
  scene.remove(s.m.g); scene.remove(s.bar); world.remove(s.body);
  const j = statics.indexOf(s.st); if (j >= 0) statics.splice(j, 1);
  if (fx) {
    const p = new V3(s.x, .6, s.z);
    if (s.k === 'barikat') { chips(p, 70, .45, .3, .16, 7); sfx.wood(); }
    else { sparks(p, 40, 9); chips(p, 30, .25, .27, .2, 7); explodeAt(p, false, 2); }
  }
}
function defValid(k, x, z, ry) {
  if (def.builds.length >= DEF_MAX_BUILDS) return false;
  if (Math.abs(x) > H - 1.6 || Math.abs(z) > H - 1.6 || Math.hypot(x, z) < 3.1) return false;
  for (const [px, pz] of DEF_PORTALS) if (Math.hypot(x - px, z - pz) < 3.8) return false;
  for (const s of def.builds) if (Math.hypot(x - s.x, z - s.z) < (k === 'barikat' || s.k === 'barikat' ? 1.7 : 1.3)) return false;
  const [hw, hd] = defFoot(k, ry);
  for (let i = baseStatics; i < statics.length; i++) { const st = statics[i]; if (x + hw > st.x0 && x - hw < st.x1 && z + hd > st.z0 && z - hd < st.z1) return false; }
  const pb = player.body.position;
  if (Math.abs(pb.x - x) < hw + .45 && Math.abs(pb.z - z) < hd + .45) return false;   // üstünde durduğun yere kurulmaz
  return true;
}
// host: istek doğrulanır, hurda düşülür, herkese duyurulur
function defTryPlace(k, x, z, ry) {
  const K = DEF_KINDS[k]; if (!K || def.over || def.scrap < K.cost || !defValid(k, x, z, ry)) return false;
  def.scrap -= K.cost;
  const s = defPlace(def.nextId++, k, x, z, ry);
  bcast({ t: 'dpl', id: s.id, k, x, z, ry });
  defSync(true);
  return true;
}
function defTryRepair() {
  if (def.over || def.scrap < DEF_REPAIR || def.core >= CORE_HP) return false;
  def.scrap -= DEF_REPAIR; def.core = Math.min(CORE_HP, def.core + CORE_HP * .3);
  bcast({ t: 'drp' }); defRepairFx(); defSync(true);
  return true;
}
function defRepairFx() {
  for (let i = 0; i < 90; i++) { const a = rand(0, 6.28), r = rand(.3, 2.2); emit(Math.cos(a) * r, rand(.2, 2.5), Math.sin(a) * r, 0, rand(1.5, 4), 0, 2, .3, .85, 1, rand(.5, 1.1)); }
  sfx.upgrade();
}

/* ================= HEDEF ve HASAR (enemies.js çağırır) ================= */
// iblisin hedefi: 7 m içindeki oyuncu, önünü kesen yapı ya da mühür; boss önce oyuncuya gider
function defTarget(e, tgs) {
  const p = e.body.position;
  let best = null, bd = isBossKind(e.kind) ? Infinity : 49;
  for (const t of tgs) { if (t.dead) continue; const d = (t.x - p.x) ** 2 + (t.z - p.z) ** 2; if (d < bd) { bd = d; best = t; } }
  if (best) return best;
  let sb = null, sd = 3.2;
  for (const s of def.builds) { const d = Math.hypot(s.x - p.x, s.z - p.z) - s.tg.rad; if (d < sd) { sd = d; sb = s; } }
  return sb ? sb.tg : coreTg;
}
function defDamage(tg, dmg) {
  if (def.over || net.mode === 'guest') return;
  if (tg.core) {
    def.core -= dmg; def.hitT = .35;
    if (def.core < CORE_HP * .3 && !def.warned) { def.warned = true; bcast({ t: 'toast', text: 'MÜHÜR ÇATLIYOR!' }); toast('MÜHÜR ÇATLIYOR!'); sfx.roar(); }
    if (def.core <= 0) defLose();
    return;
  }
  const s = tg.build; if (!def.builds.includes(s)) return;
  s.hp -= dmg; s.hitT = .25;
  if (s.hp <= 0) { defRemove(s, true); bcast({ t: 'ddl', id: s.id }); }
}
// iblis ateş topu mühre ya da yapıya çarptı mı (host)
function defProjectileHit(p) {
  if (Math.hypot(p.x, p.z) < 1.7 && p.y < 3.2) { defDamage(coreTg, 12); return true; }
  for (const s of def.builds) if (Math.hypot(p.x - s.x, p.z - s.z) < s.tg.rad + .35 && p.y < 1.5) { defDamage(s.tg, 12); return true; }
  return false;
}
// kamikaze patlaması yapılara da vurur
function defBlast(c, R, dmg) {
  if (Math.hypot(c.x, c.z) < R + 1.4) defDamage(coreTg, dmg * 1.4);
  for (const s of def.builds.slice()) { const d = Math.hypot(c.x - s.x, c.z - s.z); if (d < R + s.tg.rad) defDamage(s.tg, dmg * 1.6 * (1 - d / (R + s.tg.rad + .5))); }
}
function defOnKill(e) { if (net.mode !== 'guest' && !def.over) def.scrap += KILL_SCRAP[e.kind] || 10; }
function defPortalSpawn() { const [x, z] = pick(DEF_PORTALS), ax = Math.abs(x) > 1; return [x - Math.sign(x) * 1.8 + (ax ? 0 : rand(-1.2, 1.2)), z - Math.sign(z) * 1.8 + (ax ? rand(-1.2, 1.2) : 0)]; }
function defLose() {
  if (def.over) return;
  bcast({ t: 'dover', n: waveN });
  defShowLose();
}
function defShowLose() {
  if (def.over) return;
  def.over = true; def.core = 0;
  explodeAt(new V3(0, 2, 0), false, 9); shake(1); flashWorld(6, 0x6ad8ff, .3);
  if (def.crystal) def.crystal.visible = false;
  player.alive = false; state = 'dead';
  setTimeout(() => {
    showEnd(waveN + '. dalgada mühür kırıldı');
    $('endTitle').textContent = 'Mühür Kırıldı';
  }, 1600);
}
function defPlayerDied() {
  def.respawnT = DEF_RESPAWN;
  banner('ÖLDÜN', DEF_RESPAWN + ' saniye sonra mühürde yeniden doğacaksın');
}

/* ================= TARETLER (host) ================= */
function defAcquire(s, range) {
  const from = _dv1.set(s.x, 1.15, s.z);
  let best = null, bd = range;
  for (const e of enemies) {
    const c = enemyCenter(e, _dv2), d = c.distanceTo(from);
    if (d >= bd) continue;
    const dir = c.clone().sub(from).divideScalar(d), o = from.clone().addScaledVector(dir, .75);
    if (rayStatic(o, dir, d - .75) < d - 1.2) continue;   // arada duvar var
    bd = d; best = e;
  }
  return best;
}
const defDmgScale = () => 1 + Math.max(0, waveN - 1) * .05;
function defMgFire(s, c) {
  const from = s.m.tip.getWorldPosition(new V3());
  const dir = c.clone().sub(from), dist = dir.length(); dir.divideScalar(dist);
  dir.x += rand(-.025, .025); dir.y += rand(-.015, .015); dir.z += rand(-.025, .025); dir.normalize();
  const t = rayStatic(from, dir, dist + 3), clear = t >= dist - .5;
  addTracer(from, from.clone().addScaledVector(dir, clear ? dist + rand(0, 2) : t), { chance: .5 });
  s.shots++; defShotFx(s, from);
  if (clear && enemies.includes(s.tgt) && Math.random() < .86) hurtEnemy(s.tgt, .8 * defDmgScale(), dir, randomNormal(), { bullet: true, at: c, by: 'tur', power: .35 });
}
function defShotFx(s, from) {
  s.flashT = .05; s.recoil = 1;
  if (!AU.ctx || !gate('tur' + s.id, 55)) return;
  const d = from.distanceTo(eyePos), f = clamp(1 - d / 42, 0, 1); if (f <= 0) return;
  if (s.k === 'mg') { nz(.07, 2800, 600, .9, .32 * f * f); punch(130, .05, .3 * f * f); }
  else { punch(62, .3, .8 * f); nz(.35, 600, 120, .8, .5 * f, 'lowpass'); }
}
// havan: en kalabalık iblis kümesini bulur, hareketine göre önünü hesaplar
function defMortarTarget(s) {
  let best = null, bs = 0;
  for (const e of enemies) {
    if (e.T.flying) continue;
    const p = e.body.position, d = Math.hypot(p.x - s.x, p.z - s.z);
    if (d < 6.5 || d > 34) continue;
    let n = 1; for (const o of enemies) if (o !== e && Math.hypot(o.body.position.x - p.x, o.body.position.z - p.z) < 3.5) n++;
    if (isBossKind(e.kind)) n += 2;
    if (n > bs) { bs = n; best = e; }
  }
  if (!best) return null;
  const p = best.body.position, v = best.body.velocity;
  return new V3(p.x + v.x * .9, 0, p.z + v.z * .9);
}
function defMortarFire(s, to) {
  const from = s.m.tip.getWorldPosition(new V3());
  defShell(from, to, true);
  bcast({ t: 'dsh', a: arr(from), b: arr(to) });
  s.shots++; defShotFx(s, from);
  for (let i = 0; i < 16; i++) emit(from.x, from.y, from.z, rand(-1, 1), rand(1, 3), rand(-1, 1), 2, .3, .3, .3, rand(.6, 1.2));
}
const shellGeo = new THREE.SphereGeometry(.08, 8, 6), shellMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
function defShell(a, b, real) {
  const m = new THREE.Mesh(shellGeo, shellMat); m.position.copy(a); scene.add(m);
  const d = Math.hypot(b.x - a.x, b.z - a.z);
  def.shells.push({ a: a.clone(), b: b.clone(), t: 0, T: .9 + d * .028, h: 3 + d * .32, m, real });
}
function updateShells(dt) {
  for (const sh of def.shells.slice()) {
    sh.t += dt; const u = Math.min(1, sh.t / sh.T);
    sh.m.position.lerpVectors(sh.a, sh.b, u); sh.m.position.y = sh.a.y + (sh.b.y - sh.a.y) * u + Math.sin(u * Math.PI) * sh.h;
    if (Math.random() < .7) emit(sh.m.position.x, sh.m.position.y, sh.m.position.z, rand(-.3, .3), rand(0, .5), rand(-.3, .3), 2, .35, .32, .3, rand(.3, .6));
    if (u >= 1) {
      scene.remove(sh.m); def.shells.splice(def.shells.indexOf(sh), 1);
      if (sh.real) explodeAt(new V3(sh.b.x, .4, sh.b.z), true, 3.8, 2.5 * defDmgScale(), 6 * defDmgScale(), 'tur');
    }
  }
}

/* ================= GÜNCELLEME ================= */
function updateDefense(dt, rdt) {
  const host = net.mode !== 'guest';
  // mühür: döner, süzülür; can azaldıkça kızıla döner, vurulunca titrer
  if (def.crystal && !def.over) {
    const k = clamp(def.core / CORE_HP, 0, 1), t = gameTime;
    def.hitT = Math.max(0, def.hitT - dt);
    def.crystal.rotation.y += dt * (.8 + (1 - k) * 2);
    def.crystal.position.y = 2.1 + Math.sin(t * 1.6) * .12 + (def.hitT > 0 ? rand(-.04, .04) : 0);
    const col = _dv1.set(.23 + (1 - k) * .77, .85 * k + .15, 1 * k + .1);
    def.crystal.material.emissive.setRGB(col.x * .4, col.y * .6, col.z * .8); def.coreGlow.material.color.setRGB(col.x, col.y, col.z);
    def.coreRing.material.color.setRGB(col.x, col.y, col.z); def.coreRing.material.opacity = .45 + Math.sin(t * 3) * .15 + (def.hitT > 0 ? .3 : 0);
    torchLights[0].color.setRGB(col.x, col.y * .9, col.z); torchLights[0].intensity = 2 + Math.sin(t * 5) * .2 + def.hitT * 3;
  }
  for (const sw of def.portals) sw.rotation.z += dt * 1.6;
  // taretler ve havan (host); çok oyunculuda konuklar için görsel tarafı
  for (const s of def.builds) {
    if (host && !def.over && s.k === 'mg') {
      s.cd -= dt; s.rt -= dt;
      if (s.rt <= 0 || (s.tgt && !enemies.includes(s.tgt))) { s.rt = .3; s.tgt = defAcquire(s, 17); }
      if (s.tgt) {
        const c = enemyCenter(s.tgt, new V3());
        s.tyaw = Math.atan2(-(c.x - s.x), -(c.z - s.z));
        if (Math.abs(angDiff(s.tyaw, s.yaw)) < .14 && s.cd <= 0) { s.cd = .12; defMgFire(s, c); }
      }
    } else if (host && !def.over && s.k === 'havan') {
      s.cd -= dt;
      if (s.cd <= 0) {
        const to = defMortarTarget(s);
        if (to) { s.tyaw = Math.atan2(-(to.x - s.x), -(to.z - s.z)); s.yaw = s.tyaw; s.m.head.rotation.y = s.yaw - s.ry; s.m.head.updateMatrixWorld(true); defMortarFire(s, to); s.cd = 3.6; }
        else s.cd = .6;
      }
    }
    if (s.m.head) {
      s.yaw += clamp(angDiff(s.tyaw, s.yaw), -dt * 7, dt * 7);
      s.m.head.rotation.y = s.yaw - s.ry;
      s.recoil = Math.max(0, s.recoil - dt * 9);
      if (s.m.tube) s.m.tube.position.y = -s.recoil * .08;
      s.flashT -= dt; s.m.flash.visible = s.flashT > 0;
      if (s.m.flash.visible) s.m.flash.material.rotation = Math.random() * 6;
    }
    // can çubuğu
    const hurt = s.hp < s.max - 1;
    s.bar.visible = hurt;
    if (hurt) {
      s.bar.quaternion.copy(camera.quaternion);
      const f = clamp(s.hp / s.max, 0, 1), fl = s.bar.userData.fill;
      fl.scale.x = Math.max(.001, f); fl.position.x = -(1 - f) / 2; fl.material.color.setRGB(1 - f * .6, .3 + f * .7, .3);
    }
    s.hitT -= dt;
  }
  updateShells(dt);
  // yeniden doğuş
  if (!player.alive && !def.over && def.respawnT > 0) {
    def.respawnT -= rdt;
    if (def.respawnT <= 0) {
      const p = MAPS.kale.spawn(); player.body.position.set(p.x, .6, p.z); player.body.velocity.set(0, 0, 0);
      revivePlayer(1); toast('MÜHÜRDE YENİDEN DOĞDUN');
    }
  }
  defUpdateGhost();
  if (host && net.mode === 'host') { def.sendT -= rdt; if (def.sendT <= 0) defSync(); }
  // gösterge
  def.hudT -= rdt;
  if (def.hudT <= 0) {
    def.hudT = .1;
    $('defCoreFill').style.width = (clamp(def.core / CORE_HP, 0, 1) * 100).toFixed(1) + '%';
    const between = !wave.active && !def.over;
    setText('defInfo', 'HURDA ' + def.scrap + (between ? ' · KURMA SÜRESİ ' + Math.max(0, Math.ceil(wave.between)) + ' sn' : '') + ' · B: KUR');
    setText('defScrap', String(def.scrap));
    for (const k of DEF_ORDER) { const b = $('dm_' + k); const cost = k === 'tamir' ? DEF_REPAIR : DEF_KINDS[k].cost; b.classList.toggle('poor', def.scrap < cost); b.classList.toggle('on', def.sel === k); }
  }
}
// host → herkes: mühür, hurda, yapıların canı / nişanı / atış sayısı
function defSync(now) {
  def.sendT = .1;
  if (net.mode !== 'host') return;
  bcast({ t: 'dst', c: Math.round(def.core), s: def.scrap, b: def.builds.map(s => [s.id, Math.round(s.hp), r2(s.tyaw), s.shots]) });
}
function defApply(d) {
  def.core = d.c; def.scrap = d.s;
  for (const [id, hp, ty, shots] of d.b) {
    const s = def.builds.find(b => b.id === id); if (!s) continue;
    if (hp < s.hp) s.hitT = .25;
    s.hp = hp; s.tyaw = ty;
    if (shots > s.seen && s.seen > 0 && s.k === 'mg') {
      // konukta atış görüntüsü: taretin baktığı yöne iz
      const from = s.m.tip.getWorldPosition(new V3()), dir = new V3(-Math.sin(s.yaw), -.02, -Math.cos(s.yaw));
      for (let i = 0; i < Math.min(3, shots - s.seen); i++) { const t = rayStatic(from, dir, 18); addTracer(from, from.clone().addScaledVector(dir, t), { chance: .5 }); }
      defShotFx(s, from);
    }
    s.seen = shots;
  }
}
// yeni katılan konuğa mevcut yapılar
function defSendAll(conn) { for (const s of def.builds) conn.send({ t: 'dpl', id: s.id, k: s.k, x: s.x, z: s.z, ry: s.ry }); conn.send({ t: 'dst', c: Math.round(def.core), s: def.scrap, b: [] }); }
function defNet(d) {
  switch (d.t) {
    case 'dst': defApply(d); break;
    case 'dpl': if (!def.builds.some(s => s.id === d.id)) defPlace(d.id, d.k, d.x, d.z, d.ry); break;
    case 'ddl': { const s = def.builds.find(b => b.id === d.id); if (s) defRemove(s, true); break; }
    case 'dsh': defShell(v3(d.a), v3(d.b), false); break;
    case 'drp': defRepairFx(); break;
    case 'dover': waveN = d.n || waveN; defShowLose(); break;
  }
}
function defReset() {
  for (const s of def.builds.slice()) defRemove(s, false);
  for (const sh of def.shells) scene.remove(sh.m);
  Object.assign(def, { scrap: 300, core: CORE_HP, builds: [], nextId: 1, menu: false, sel: null, rot: 0, shells: [], over: false, respawnT: 0, hitT: 0, warned: false, sendT: 0 });
  for (const k in def.ghosts) def.ghosts[k].g.visible = false;
  $('defMenu').hidden = true;
  $('defHud').hidden = !isDefense();
  if (def.crystal) def.crystal.visible = true;
  if (isDefense()) banner('MÜHÜR KALESİ', 'Mührü koru · B ile taret ve barikat kur');
}

/* ================= KURMA MENÜSÜ ve ÖNİZLEME ================= */
function defToggleMenu() {
  if (def.sel) { defCancel(); return; }
  def.menu = !def.menu; $('defMenu').hidden = !def.menu;
}
function defChoose(k) {
  if (k === 'tamir') {
    if (net.mode === 'guest') toHost({ t: 'drep' });
    else if (!defTryRepair()) toast(def.core >= CORE_HP ? 'MÜHÜR ZATEN SAĞLAM' : 'HURDA YETMİYOR');
    def.menu = false; $('defMenu').hidden = true; return;
  }
  if (def.scrap < DEF_KINDS[k].cost) { toast('HURDA YETMİYOR'); return; }
  def.sel = k; def.menu = false; $('defMenu').hidden = true;
}
function defCancel() { def.sel = null; for (const k in def.ghosts) def.ghosts[k].g.visible = false; }
function defUpdateGhost() {
  for (const k in def.ghosts) if (k !== def.sel) def.ghosts[k].g.visible = false;
  if (!def.sel || !player.alive || state !== 'play') { if (def.sel && def.ghosts[def.sel]) def.ghosts[def.sel].g.visible = false; return; }
  const gh = defGhost(def.sel);
  camera.getWorldDirection(_dv1);
  let x, z;
  if (_dv1.y < -.08) { const t = Math.min(7, -camera.position.y / _dv1.y); x = camera.position.x + _dv1.x * t; z = camera.position.z + _dv1.z * t; }
  else { x = player.body.position.x + flatF.x * 4; z = player.body.position.z + flatF.z * 4; }
  x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2;
  let ry = def.sel === 'barikat' ? (def.rot ? Math.PI / 2 : 0) + (Math.abs(flatF.x) > Math.abs(flatF.z) ? Math.PI / 2 : 0) : Math.atan2(flatF.x, flatF.z);
  if (def.sel === 'barikat' && -Math.sin(ry) * x - Math.cos(ry) * z < 0) ry += Math.PI;   // kazıklar dışarı (iblislere) baksın
  def.gx = x; def.gz = z; def.gry = ry;
  def.ok = defValid(def.sel, x, z, ry) && def.scrap >= DEF_KINDS[def.sel].cost;
  gh.g.visible = true; gh.g.position.set(x, 0, z); gh.g.rotation.y = ry;
  const mat = def.ok ? DM.ghostOk : DM.ghostBad;
  gh.g.traverse(o => { if (o.isMesh) o.material = mat; });
}
function defConfirm() {
  if (!def.sel) return;
  if (!def.ok) { toast('BURAYA KURULAMAZ'); return; }
  const k = def.sel, x = def.gx, z = def.gz, ry = def.gry;
  if (net.mode === 'guest') toHost({ t: 'dreq', k, x, z, ry });
  else if (!defTryPlace(k, x, z, ry)) { toast('BURAYA KURULAMAZ'); return; }
  if (def.scrap - DEF_KINDS[k].cost < DEF_KINDS[k].cost) defCancel();   // bir tane daha alacak hurda yoksa önizleme kapanır
}
// game.js tuş / fare yönlendirmesi: true dönerse olay kullanıldı
function defKey(e) {
  if (!isDefense() || state !== 'play') return false;
  if (e.code === 'KeyB') { defToggleMenu(); return true; }
  if (def.menu) { const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (i >= 0) { defChoose(DEF_ORDER[i]); return true; } }
  if (def.sel && e.code === 'KeyR') { def.rot = def.rot ? 0 : 1; return true; }
  return false;
}
function defMouse(e) {
  if (!isDefense() || !def.sel) return false;
  if (e.button === 0) defConfirm(); else if (e.button === 2) defCancel();
  return true;
}
for (const k of DEF_ORDER) $('dm_' + k).addEventListener('click', () => defChoose(k));
$('defBtn').addEventListener('click', () => { leaveRoom(true); net.gameMode = 'defense'; resetGame(); play(); });
