'use strict';
/* MARDİN: özgün taktik harita (VS, bomba, takım ölüm maçı), 80 x 80 m, kuzey = -z.
   Gün batımında bal rengi kesme taştan eski bir Anadolu kasabası. Batı ve doğu kenarı sur: mazgallardan ovaya bakılır,
   kuzeyde tepede kale. Yollar fırıldak gibi döner: iki üs çaprazda, her bölgeye üç giriş.
   - Saldıranlar güneybatıda (AŞAĞI KAPI), savunanlar kuzeydoğuda (KALE YOLU) doğar
   - A · HAN AVLUSU (kuzeybatı): revaklı kervansaray avlusu, ortada kuyu. Girişler: batıda SUR KAPISI (sur yolundan),
     güneyde ABBARA (üstü ev olan kemerli dar geçit, çeşme meydanından), kuzeydoğuda KONAK KAPISI (savunmadan)
   - B · BEDESTEN (güneydoğu): kubbeli bedestenin önünde tezgâhlı çarşı. Girişler: batıda BAKIRCILAR (ortadan),
     güneyde SARNIÇ AĞZI (saldıranların sütunlu yeraltı sarnıcından), doğuda BEDESTEN KAPISI (savunmanın sur dibi yolundan)
   - Orta · ÇEŞME MEYDANI: saat kulesi ve çınar. Dört sokak kaydırılmış: meydanın bir ağzından karşı ağzı düz görünmez
   Duvar ve siperlerin hepsi eksene hizalı kutu: çarpışma, mermi, botların ızgarası ve mini harita aynı kutuları kullanır.
   Görsel yüzler malzemeye göre tek ağda toplanır (az çizim çağrısı, telefonda da akıcı). Duvar dokusu dünya ölçüsünde
   döşenir: bitişik evlerin pencereleri ve kat silmeleri aynı hizaya düşer. */

/* ================= DOKULAR ================= */
// kare olmayan tuval dokusu (kenarlar 2'nin kuvveti)
function mdTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}
function mdRound(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}
// tek kesme taş: hafif renk farkı, üst kenarda ışık, altta gölge, keski izleri
function mdStone(g, x, y, w, h, l0, l1, hue = 36) {
  if (w < 2 || h < 2) return;
  g.fillStyle = `hsl(${hue - 3 + Math.random() * 7},${32 + Math.random() * 18}%,${l0 + Math.random() * (l1 - l0)}%)`; g.fillRect(x, y, w, h);
  const gr = g.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, 'rgba(255,244,220,.18)'); gr.addColorStop(.3, 'rgba(255,244,220,0)'); gr.addColorStop(1, 'rgba(70,45,20,.2)');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  if (Math.random() < .12) { g.fillStyle = 'rgba(80,60,40,.13)'; g.fillRect(x + Math.random() * w * .5, y + Math.random() * h * .4, w * .45, h * .5); }
}
// keski izleri: kısa açık / koyu çizgilerden tek bir 128 px desen (her taşa ayrı ayrı binlerce çizgi çizmek açılışı yavaşlatıyordu)
let mdChisel = null;
function mdChiselPat(g) {
  if (!mdChisel) {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'), im = x.createImageData(S, S), d = im.data;
    for (let i = 0; i < S * S / 36; i++) {
      const px = Math.random() * S | 0, py = Math.random() * S | 0, L = 1 + (Math.random() * 3 | 0), dark = Math.random() < .5, a = Math.round(255 * Math.random() * (dark ? .14 : .12));
      for (let k = 0; k < L; k++) { const o = (py * S + (px + k) % S) * 4; d[o] = dark ? 90 : 255; d[o + 1] = dark ? 60 : 248; d[o + 2] = dark ? 30 : 230; d[o + 3] = a; }
    }
    x.putImageData(im, 0, 0); mdChisel = c;
  }
  return g.createPattern(mdChisel, 'repeat');
}
// bölgeyi sıra sıra taşla ör (derzler koyu harç)
function mdCourses(g, x0, y0, w, h, ch, bw, l0, l1, mortar = '#7a6244', hue = 36) {
  g.fillStyle = mortar; g.fillRect(x0, y0, w, h);
  for (let y = y0, r = 0; y < y0 + h - 1; y += ch, r++) {
    let x = x0 - (r % 2 ? bw * .5 : bw * .12);
    while (x < x0 + w) {
      const ww = bw * (.65 + Math.random() * .7), a = Math.max(x0, x), b = Math.min(x0 + w, x + ww);
      mdStone(g, a + 1, y + 1, b - a - 2, Math.min(ch, y0 + h - y) - 2, l0, l1, hue);
      x += ww;
    }
  }
  g.fillStyle = mdChiselPat(g); g.fillRect(x0, y0, w, h);
}
const mdArch = (g, x, y, w, h) => { const r = w / 2; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r); g.arc(x + r, y + r, r, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); };
const mdPoint = (g, x, y, w, h) => {   // sivri kemer
  g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * .55);
  g.quadraticCurveTo(x + w * .02, y + w * .08, x + w / 2, y); g.quadraticCurveTo(x + w * .98, y + w * .08, x + w, y + w * .55);
  g.lineTo(x + w, y + h); g.closePath();
};
function mdFrame(g, path, x, y, w, h, pad) {
  g.fillStyle = '#efd9ab'; path(g, x - pad, y - pad, w + pad * 2, h + pad); g.fill();
  g.fillStyle = 'rgba(110,80,45,.5)'; path(g, x - 2, y - 2, w + 4, h + 2); g.fill();
}
const MD_SH = [['#5b3b22', '#2e1d10'], ['#3d6b6e', '#1f3c3e'], ['#6b4f2e', '#3b2a14'], ['#7a3f26', '#41200f']];
function mdKey(g, cx, y) { g.fillStyle = '#f4e2b8'; g.beginPath(); g.moveTo(cx - 8, y - 11); g.lineTo(cx + 8, y - 11); g.lineTo(cx + 5, y + 5); g.lineTo(cx - 5, y + 5); g.fill(); }
function mdSill(g, x, w, y) { g.fillStyle = '#f4e2b8'; g.fillRect(x - 14, y, w + 28, 7); g.fillStyle = 'rgba(60,40,20,.4)'; g.fillRect(x - 14, y + 7, w + 28, 4); }
// kemerli pencere: oyma taş çerçeve, panjur / demir parmaklık / açık kanat
function mdWin(g, cx, sill, sh, kind, w = 60, h = 112) {
  const x = cx - w / 2, y = sill - h;
  mdFrame(g, mdArch, x, y, w, h, 9);
  g.fillStyle = '#171310'; mdArch(g, x, y, w, h); g.fill();
  if (kind === 0) {
    g.fillStyle = sh[0]; mdArch(g, x + 2, y + 2, w - 4, h - 2); g.fill();
    g.strokeStyle = sh[1]; g.lineWidth = 2;
    for (let yy = y + w * .55; yy < y + h - 2; yy += 7) { g.beginPath(); g.moveTo(x + 4, yy); g.lineTo(x + w - 4, yy); g.stroke(); }
    g.fillStyle = sh[1]; g.fillRect(cx - 1.5, y + 6, 3, h - 6);
  } else if (kind === 1) {
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,190,120,.42)'); gr.addColorStop(.6, 'rgba(40,30,30,0)');
    g.fillStyle = gr; mdArch(g, x, y, w, h); g.fill();
    g.strokeStyle = '#2b2622'; g.lineWidth = 3;
    for (let xx = x + 10; xx < x + w - 2; xx += 10) { g.beginPath(); g.moveTo(xx, y + 6); g.lineTo(xx, y + h); g.stroke(); }
    g.beginPath(); g.moveTo(x, y + h * .55); g.lineTo(x + w, y + h * .55); g.stroke();
  } else {
    g.fillStyle = 'rgba(150,90,40,.45)'; mdArch(g, x + 6, y + 8, w - 12, h - 8); g.fill();
    g.fillStyle = sh[0]; g.fillRect(x - 15, y + w * .5, 13, h - w * .5); g.fillRect(x + w + 2, y + w * .5, 13, h - w * .5);
  }
  mdSill(g, x, w, sill); mdKey(g, cx, y);
}
function mdTwin(g, cx, sill, sh) {   // ikiz pencere: ortada ince sütunce, üstte gül pencere
  const w = 34, h = 104;
  for (const s of [-1, 1]) {
    const x = cx + s * 22 - w / 2, y = sill - h;
    g.fillStyle = '#efd9ab'; mdArch(g, x - 5, y - 5, w + 10, h + 5); g.fill();
    g.fillStyle = '#171310'; mdArch(g, x, y, w, h); g.fill();
    g.fillStyle = sh[0]; mdArch(g, x + 2, y + 2, w - 4, h - 2); g.fill();
    g.strokeStyle = sh[1]; g.lineWidth = 2; for (let yy = y + 22; yy < y + h; yy += 7) { g.beginPath(); g.moveTo(x + 3, yy); g.lineTo(x + w - 3, yy); g.stroke(); }
  }
  g.fillStyle = '#f4e2b8'; g.fillRect(cx - 3, sill - h + 16, 6, h - 16);
  g.beginPath(); g.arc(cx, sill - h - 18, 9, 0, 7); g.fill(); g.fillStyle = '#5a4630'; g.beginPath(); g.arc(cx, sill - h - 18, 5, 0, 7); g.fill();
  mdSill(g, cx - 40, 80, sill);
}
function mdDoor(g, cx, bot, sh) {   // kemerli ahşap kapı: çivili kanatlar, tokmak
  const w = 86, h = 164, x = cx - w / 2, y = bot - h;
  mdFrame(g, mdArch, x, y, w, h, 12);
  g.fillStyle = sh[0]; mdArch(g, x, y, w, h); g.fill();
  g.strokeStyle = sh[1]; g.lineWidth = 2; for (let xx = x + 10; xx < x + w; xx += 11) { g.beginPath(); g.moveTo(xx, y + 12); g.lineTo(xx, bot); g.stroke(); }
  g.fillStyle = '#20160e'; g.fillRect(cx - 1.5, y + 20, 3, h - 20);
  g.fillStyle = '#c8a050'; for (let yy = y + 60; yy < bot - 8; yy += 24) for (const xx of [x + 8, x + w - 8]) { g.beginPath(); g.arc(xx, yy, 2.5, 0, 7); g.fill(); }
  g.fillStyle = '#d9b060'; g.beginPath(); g.arc(cx + 11, y + h * .58, 4, 0, 7); g.fill();
  g.fillStyle = 'rgba(244,226,184,.95)'; g.fillRect(x - 16, bot - 6, w + 32, 6);   // eşik
}
function mdShop(g, cx, bot, sh, open = Math.random() < .5) {   // dükkân kemeri: ahşap kepenk ya da raflı, mallı iç
  const w = 176, h = 170, x = cx - w / 2, y = bot - h;
  mdFrame(g, mdArch, x, y, w, h, 10);
  if (!open) {
    g.fillStyle = sh[0]; mdArch(g, x, y, w, h); g.fill();
    g.strokeStyle = sh[1]; g.lineWidth = 3; for (let xx = x + 14; xx < x + w; xx += 16) { g.beginPath(); g.moveTo(xx, y + 34); g.lineTo(xx, bot); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 4, bot - 46, w - 8, 3);
  } else {
    g.fillStyle = '#211812'; mdArch(g, x, y, w, h); g.fill();
    const cols = ['#c0602a', '#b8862a', '#7a2a1a', '#d0a040', '#2f5a5a', '#8a3a20', '#a87a3a'];
    for (let s = 0; s < 3; s++) {
      const yy = bot - 34 - s * 40; g.fillStyle = '#4a3020'; g.fillRect(x + 10, yy, w - 20, 4);
      for (let i = 0; i < 9; i++) { g.fillStyle = cols[Math.random() * cols.length | 0]; const hh = 14 + Math.random() * 10; g.fillRect(x + 14 + i * 17, yy - hh, 12, hh); }
    }
    const gl = g.createRadialGradient(cx, bot - 60, 4, cx, bot - 60, 90); gl.addColorStop(0, 'rgba(255,170,80,.25)'); gl.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gl; mdArch(g, x, y, w, h); g.fill();
  }
}
function mdSmallWin(g, cx, y) {
  g.fillStyle = '#efd9ab'; g.fillRect(cx - 24, y - 4, 48, 54); g.fillStyle = '#1a1410'; g.fillRect(cx - 18, y + 2, 36, 42);
  g.strokeStyle = '#3a3028'; g.lineWidth = 3; for (let xx = cx - 12; xx <= cx + 12; xx += 8) { g.beginPath(); g.moveTo(xx, y + 2); g.lineTo(xx, y + 44); g.stroke(); }
}
function mdGrime(g, W, HH) {   // dipte kir (gölge yerine), yağmur izleri
  const gr = g.createLinearGradient(0, HH - 48, 0, HH); gr.addColorStop(0, 'rgba(60,38,18,0)'); gr.addColorStop(1, 'rgba(60,38,18,.5)');
  g.fillStyle = gr; g.fillRect(0, HH - 48, W, 48);
  for (let i = 0; i < 12; i++) {
    const x = Math.random() * W, y = Math.random() * HH * .6, w = 5 + Math.random() * 16, L = 120 + Math.random() * 160;
    const gg = g.createLinearGradient(0, y, 0, y + L); gg.addColorStop(0, 'rgba(80,58,34,.15)'); gg.addColorStop(1, 'rgba(80,58,34,0)');
    g.fillStyle = gg; g.fillRect(x, y, w, L);
  }
}
/* cephe dokusu: 7.2 m genişlik x 10.2 m yükseklik (3 kat, 3.4 m), tuval 512 x 512 ama 512 x 724 mantıksal ölçüde çizilir
   (metre başına eşit piksel). Zemin kat tuvalin altında: kapı, dükkân, küçük parmaklıklı pencere; üst katlarda kemerli pencereler. */
const MD_TW = 7.2, MD_TH = 10.2;
function mdFacadeTex(variant, kind = 'ev') {
  return canvasTex(512, (g, s) => {
    g.save(); g.scale(1, s / 724);
    const W = 512, HH = 724, F = HH / 3, sh = MD_SH[variant % MD_SH.length];
    mdCourses(g, 0, 0, W, HH, 24, 46, kind === 'han' ? 64 : 60, kind === 'han' ? 76 : 73);
    for (let f = 0; f < 3; f++) {
      const bot = HH - f * F;
      if (f > 0) { g.fillStyle = '#ecd6a8'; g.fillRect(0, bot - 9, W, 9); g.fillStyle = 'rgba(70,45,20,.35)'; g.fillRect(0, bot, W, 4); }
      for (let b = 0; b < 2; b++) {
        const cx = b * 256 + 128, r = Math.random();
        if (kind === 'han') {   // kervansaray: altta sivri kemerli derin revak gözleri, üstte küçük kemerli odalar
          if (f === 0) {
            const w = 186, h = 206, x = cx - w / 2, y = bot - h;
            mdFrame(g, mdPoint, x, y, w, h, 12);
            const gd = g.createLinearGradient(0, y, 0, bot); gd.addColorStop(0, '#120c08'); gd.addColorStop(1, '#3a2a1c');
            g.fillStyle = gd; mdPoint(g, x, y, w, h); g.fill();
            g.fillStyle = sh[0]; mdArch(g, cx - 30, bot - 118, 60, 118); g.fill();   // dipte oda kapısı
          } else if (f === 1) { mdWin(g, cx, bot - 50, sh, 2, 74, 128); }
          else if (r < .5) mdSmallWin(g, cx, bot - 150);
        } else if (kind === 'bed') {   // çarşı: altta dükkân kemerleri, üstte küçük pencereler
          if (f === 0) mdShop(g, cx, bot, sh);
          else if (f === 1) { if (r < .7) mdSmallWin(g, cx, bot - 150); }
          else if (r < .35) mdSmallWin(g, cx, bot - 150);
        } else {
          if (f === 0) { if (r < .28) mdDoor(g, cx + (Math.random() - .5) * 70, bot, sh); else if (r < .5) mdShop(g, cx, bot, sh); else if (r < .8) mdSmallWin(g, cx + (Math.random() - .5) * 90, bot - 160); }
          else if (r < .55) mdWin(g, cx, bot - 62, sh, Math.random() * 3 | 0);
          else if (r < .8) mdTwin(g, cx, bot - 62, sh);
          else if (r < .9) mdSmallWin(g, cx, bot - 150);
        }
      }
    }
    mdGrime(g, W, HH);
    g.restore();
  }, 1, 1);
}
// dokular yalnız Mardin ilk kez kurulurken çizilir (her açılışta değil: başka haritada oynayan beklemesin)
const MD_SUN_U = .085;
let mdAshTex, mdIntTex, mdPaveTex, mdSlabTex, mdCobbleTex, mdWetTex, mdSkyTex, mdCastleTex, mdClockTex;
function mdTextures() {
  mdAshTex = canvasTex(256, (g, s) => { mdCourses(g, 0, 0, s, s, 32, 62, 61, 74); grain(g, s, 2500, .1); }, 1, 1);           // 2.4 m karo
  mdIntTex = canvasTex(256, (g, s) => {   // sarnıç ve abbara içi: koyu, nemli taş
    mdCourses(g, 0, 0, s, s, 32, 62, 30, 41, '#3a2e22');
    for (let i = 0; i < 14; i++) wrapBlob(g, s, Math.random() * s, s - Math.random() * 60, 20 + Math.random() * 40, 'rgba(30,40,30,.35)');
    grain(g, s, 2500, .1);
  }, 1, 1);
  mdPaveTex = canvasTex(512, (g, s) => {   // sokak: düzensiz taş plakalar
    g.fillStyle = '#5e5040'; g.fillRect(0, 0, s, s);
    let y = 0;
    for (const rh of [64, 52, 70, 58, 66, 54, 76, 72]) {
      let x = -Math.random() * 80;
      while (x < s) {
        const w = 56 + Math.random() * 74, c = `hsl(${30 + Math.random() * 10},${13 + Math.random() * 14}%,${55 + Math.random() * 14}%)`;
        for (const ox of [0, -s, s]) {
          if (x + ox + w < 0 || x + ox > s) continue;
          g.fillStyle = c; mdRound(g, x + ox + 2, y + 2, w - 4, rh - 4, 7); g.fill();
          g.fillStyle = 'rgba(255,245,225,.1)'; mdRound(g, x + ox + 4, y + 3, w - 8, (rh - 6) * .45, 6); g.fill();
        }
        x += w;
      }
      y += rh;
    }
    for (let i = 0; i < 26; i++) wrapBlob(g, s, Math.random() * s, Math.random() * s, 20 + Math.random() * 50, 'rgba(60,45,30,.12)');
    grain(g, s, 9000, .14);
  }, 12, 12);
  mdSlabTex = canvasTex(256, (g, s) => {   // han avlusu: büyük kare plakalar, çapraz derzli orta şerit
    g.fillStyle = '#6a5a44'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.fillStyle = `hsl(${32 + Math.random() * 8},${18 + Math.random() * 12}%,${60 + Math.random() * 12}%)`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
      g.fillStyle = 'rgba(255,240,210,.08)'; g.fillRect(i * 64 + 4, j * 64 + 4, 56, 20);
      if (Math.random() < .2) { g.strokeStyle = 'rgba(50,35,20,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(i * 64 + Math.random() * 60, j * 64 + 2); g.lineTo(i * 64 + Math.random() * 60, j * 64 + 62); g.stroke(); }
    }
    grain(g, s, 4000, .12);
  }, 1, 1);
  mdCobbleTex = canvasTex(256, (g, s) => {   // bedesten önü: arnavut kaldırımı
    g.fillStyle = '#54473a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 520; i++) {
      const x = Math.random() * s, y = Math.random() * s, rx = 6 + Math.random() * 5, ry = 5 + Math.random() * 4;
      for (const ox of [0, -s, s]) for (const oy of [0, -s, s]) {
        if (x + ox < -12 || x + ox > s + 12 || y + oy < -12 || y + oy > s + 12) continue;
        g.fillStyle = `hsl(${28 + Math.random() * 10},${12 + Math.random() * 10}%,${42 + Math.random() * 11}%)`;
        g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, Math.random() * 3, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,240,215,.07)'; g.beginPath(); g.ellipse(x + ox - 1, y + oy - 2, rx * .6, ry * .4, 0, 0, 7); g.fill();
      }
    }
    grain(g, s, 3000, .12);
  }, 1, 1);
  mdWetTex = canvasTex(256, (g, s) => {   // sarnıç tabanı: koyu, ıslak plaka
    g.fillStyle = '#1e1a16'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `hsl(${30 + Math.random() * 10},${10 + Math.random() * 10}%,${20 + Math.random() * 9}%)`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
    for (let i = 0; i < 10; i++) wrapBlob(g, s, Math.random() * s, Math.random() * s, 18 + Math.random() * 30, 'rgba(10,14,16,.5)');
    grain(g, s, 3000, .1);
  }, 1, 1);
  // gökyüzü kubbesi (eşdikdörtgen): üstte lacivert, ufukta turuncu; batı-güneybatıda güneşin parıltısı; ufkun altında pus ve ova tarlaları
  mdSkyTex = mdTex(1024, 512, (g, W, HH) => {
    const hz = HH / 2;
    const gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, '#2a3a6e'); gr.addColorStop(.42, '#5e6c9c'); gr.addColorStop(.74, '#c99a86'); gr.addColorStop(.92, '#f0b884'); gr.addColorStop(1, '#f8cf96');
    g.fillStyle = gr; g.fillRect(0, 0, W, hz);
    const su = MD_SUN_U * W, sy = hz - 22;
    for (const ox of [0, W, -W]) {
      const r = g.createRadialGradient(su + ox, sy, 3, su + ox, sy, 330); r.addColorStop(0, 'rgba(255,238,196,.95)'); r.addColorStop(.22, 'rgba(255,192,112,.55)'); r.addColorStop(1, 'rgba(255,150,90,0)');
      g.fillStyle = r; g.fillRect(0, 0, W, hz + 30);
    }
    for (let i = 0; i < 34; i++) {   // ince bulut şeritleri; güneşe yakın olanların altı turuncu
      const x = Math.random() * W, y = 40 + Math.random() * (hz - 90), w = 60 + Math.random() * 190, h = 4 + Math.random() * 8;
      const du = Math.min(Math.abs(x - su), W - Math.abs(x - su)) / W, warm = Math.max(0, 1 - du * 3.2);
      for (const ox of [0, -W, W]) {
        const c = g.createLinearGradient(0, y - h, 0, y + h);
        c.addColorStop(0, `rgba(${200 + warm * 50},${170 + warm * 40},${180 - warm * 40},.0)`); c.addColorStop(.5, `rgba(${220 + warm * 35},${170 + warm * 30},${150 - warm * 50},${.35 + warm * .3})`); c.addColorStop(1, `rgba(${255},${150 + warm * 50},${90},.0)`);
        g.fillStyle = c; g.beginPath(); g.ellipse(x + ox, y, w, h, 0, 0, 7); g.fill();
      }
    }
    const gp = g.createLinearGradient(0, hz, 0, HH);
    gp.addColorStop(0, '#f1c894'); gp.addColorStop(.06, '#cfae80'); gp.addColorStop(.3, '#9a8a60'); gp.addColorStop(1, '#6a5c3e');
    g.fillStyle = gp; g.fillRect(0, hz, W, HH - hz);
    for (let i = 0; i < 700; i++) {   // ova tarlaları: ufka yaklaştıkça incelir ve puslanır
      const t = Math.random(), y = hz + 4 + t * t * (HH - hz - 4), k = (y - hz) / (HH - hz);
      const w = 8 + Math.random() * 60 * (.3 + k), h = 1 + k * 14 * Math.random();
      g.fillStyle = ['rgba(150,140,80,', 'rgba(120,110,60,', 'rgba(190,160,100,', 'rgba(100,96,58,', 'rgba(170,120,70,'][Math.random() * 5 | 0] + (.15 + k * .5) + ')';
      g.fillRect(Math.random() * W, y, w, h);
    }
    const gh = g.createLinearGradient(0, hz - 14, 0, hz + 18); gh.addColorStop(0, 'rgba(255,216,160,0)'); gh.addColorStop(.5, 'rgba(255,216,160,.75)'); gh.addColorStop(1, 'rgba(255,216,160,0)');
    g.fillStyle = gh; g.fillRect(0, hz - 14, W, 32);
  });
  // kuzeyde tepedeki kale (uzak dekor): kayalık sırt, burçlu surlar, yamaçta evler. İçten bakıldığı için batı tuvalin sağında
  mdCastleTex = mdTex(1024, 256, (g, W, HH) => {
    g.clearRect(0, 0, W, HH);
    const ridge = x => 150 - 46 * Math.exp(-(((x - 560) / 260) ** 2)) - 16 * Math.sin(x * .013) - 8 * Math.sin(x * .041);
    g.beginPath(); g.moveTo(0, HH);
    for (let x = 0; x <= W; x += 8) g.lineTo(x, ridge(x));
    g.lineTo(W, HH); g.closePath();
    const rk = g.createLinearGradient(0, 80, 0, HH); rk.addColorStop(0, '#b0906c'); rk.addColorStop(1, '#8a7056'); g.fillStyle = rk; g.fill();
    for (let i = 0; i < 160; i++) {   // kaya katmanları
      const x = Math.random() * W, y = ridge(x) + 6 + Math.random() * 90, w = 20 + Math.random() * 70;
      g.fillStyle = Math.random() < .5 ? 'rgba(80,60,40,.18)' : 'rgba(230,200,160,.16)'; g.fillRect(x, y, w, 2 + Math.random() * 3);
    }
    // sur ve burçlar sırt boyunca
    for (let x = 300; x < 860; x += 6) {
      const y = ridge(x) - 22; g.fillStyle = '#a88c6c'; g.fillRect(x, y, 6.5, 24);
      if ((x / 6 | 0) % 2) { g.fillStyle = '#a88c6c'; g.fillRect(x, y - 5, 4, 5); }
    }
    for (const [x, w, h] of [[320, 22, 40], [410, 18, 34], [500, 30, 52], [585, 20, 38], [660, 34, 58], [760, 20, 36], [840, 22, 40]]) {
      const y = ridge(x + w / 2) - h; g.fillStyle = '#a08466'; g.fillRect(x, y, w, h + 14);
      g.fillStyle = '#e6c49a'; g.fillRect(x + w - 4, y, 4, h + 14);   // batıdan vuran ışık
      for (let k = 0; k < w; k += 6) g.fillRect(x + k, y - 5, 4, 5);
    }
    for (let i = 0; i < 70; i++) {   // yamaçta evler: küçük kutular, karanlık pencereler
      const x = 120 + Math.random() * 820, y = ridge(x) + 18 + Math.random() * 70, w = 10 + Math.random() * 16, h = 8 + Math.random() * 10;
      g.fillStyle = `hsl(36,${30 + Math.random() * 15}%,${58 + Math.random() * 12}%)`; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(40,28,20,.6)'; g.fillRect(x + 3, y + 3, 2, 3); if (w > 16) g.fillRect(x + w - 6, y + 3, 2, 3);
    }
    // bandın iki ucunda kaya yavaşça silinsin (gökyüzünde dikey kesik kalmasın)
    g.globalCompositeOperation = 'destination-out';
    for (const [a, b] of [[0, W * .14], [W, W * .86]]) {
      const f = g.createLinearGradient(a, 0, b, 0); f.addColorStop(0, 'rgba(0,0,0,1)'); f.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = f; g.fillRect(Math.min(a, b), 0, Math.abs(b - a), HH);
    }
    g.globalCompositeOperation = 'source-over';
  });
  mdClockTex = canvasTex(128, (g, s) => {
    const c = s / 2; g.fillStyle = '#efe6d0'; g.beginPath(); g.arc(c, c, c - 3, 0, 7); g.fill();
    g.strokeStyle = '#3a2a1a'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#2a1e14'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.beginPath(); g.arc(c + Math.sin(a) * (c - 14), c - Math.cos(a) * (c - 14), i % 3 ? 3 : 5, 0, 7); g.fill(); }
    g.lineCap = 'round';
    const hand = (a, L, w) => { g.lineWidth = w; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * L, c - Math.cos(a) * L); g.stroke(); };
    hand((6 + 40 / 60) / 12 * Math.PI * 2, c * .5, 6); hand(40 / 60 * Math.PI * 2, c * .78, 4);   // 18.40: gün batımı
  }, 1, 1);
}
const mdAwnTex = (a, b) => canvasTex(64, (g, s) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 8, 0, 8, s); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, s - 6, s, 6); grain(g, s, 300, .1); }, 1, 1);

/* ================= MALZEMELER =================
   Taş, ahşap, kumaş: Lambert (ışık köşe başına; pürüzlü yüzeyde Standard ile aynı görünür, piksel başına iki kat ucuz).
   Metal, su, ıslak taş ve fenerlerin aydınlattığı iç mekân: Standard (parlama ve fener ışığı piksel başına). */
// renkler sRGB olarak yazılır, doğrusal uzaya çevrilir (yoksa çıkışta açılıp solar: koyu ahşap bej görünür)
const mdC = h => new THREE.Color(h).convertSRGBToLinear();
const mdLin = o => { const q = Object.assign({}, o); if (typeof q.color === 'number') q.color = mdC(q.color); return q; };
const mdStd = (o) => new THREE.MeshStandardMaterial(mdLin(Object.assign({ roughness: .92 }, o)));
// yalnız renkli (dokusuz) taş/ahşap/kumaş malzemeleri tek bir köşe renkli malzemede toplanır: bir çizim çağrısı
const mdLam = (o) => {
  const q = mdLin(o); delete q.roughness; delete q.metalness; delete q.flatShading;
  const m = new THREE.MeshLambertMaterial(q);
  if (!q.map && !q.transparent && !q.side) m.userData.vc = m.color.clone();
  return m;
};
/* iç mekân: gölge olmadığından güneş sarnıcın içini de aydınlatırdı. Bu malzemelerde güneş ve gök ışığı kısılır,
   fenerlerin (nokta ışık) sıcak halkası tam kalır */
function mdInterior(mat, sun = .08, sky = .4) {
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin
      .replace('getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );', 'getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight ); directLight.color *= ' + sun.toFixed(3) + ';')
      .replace('irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );', 'irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry ) * ' + sky.toFixed(3) + ';')
      .replace('vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );', 'vec3 irradiance = getAmbientLightIrradiance( ambientLightColor ) * ' + sky.toFixed(3) + ';'));
  };
  mat.customProgramCacheKey = () => 'mdInt' + sun + '|' + sky;
  return mat;
}
let MD = null;
function mdInit() {
  if (MD) return;
  mdTextures();
  MD = {
    vc: new THREE.MeshLambertMaterial({ vertexColors: true }),
    facade: [0, 1, 2, 3].map(i => mdLam({ map: mdFacadeTex(i) })),
    han: mdLam({ map: mdFacadeTex(1, 'han') }),
    bed: mdLam({ map: mdFacadeTex(2, 'bed') }),
    ash: mdLam({ map: mdAshTex }),
    ashL: mdLam({ map: mdAshTex, color: 0xfff0d6 }),
    // iki yüzlü: tonozun dışı bir açıklıktan görünürse boşluk değil taş görünsün
    int: mdInterior(mdStd({ map: mdIntTex, side: THREE.DoubleSide })),
    trim: mdLam({ map: mdAshTex, color: 0xffeccc }),
    roof: mdLam({ color: 0xa8916e, roughness: .97 }),
    slab: mdLam({ map: mdSlabTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    cobble: mdLam({ map: mdCobbleTex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    wet: mdInterior(mdStd({ map: mdWetTex, roughness: .32, metalness: .15, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })),
    // abbara tabanı sokakla aynı doku ve ölçekte (derzler eşikte kesintisiz sürer), içeride kısık ışıkta
    intFloor: mdInterior(mdStd({ map: mdPaveTex, color: 0xd8c8b0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })),
    dome: mdLam({ map: mdAshTex, color: 0xf2e2c4 }),
    wood: mdLam({ color: 0x6a4a2c, roughness: .85 }),
    woodD: mdLam({ color: 0x3e2a18, roughness: .85 }),
    iron: mdStd({ color: 0x2a2724, roughness: .55, metalness: .6, envMap: vmEnvTex, envMapIntensity: .5 }),
    copper: mdStd({ color: 0xc8753e, roughness: .32, metalness: .85, envMap: vmEnvTex, envMapIntensity: .8 }),
    brass: mdStd({ color: 0xc9a24a, roughness: .35, metalness: .85, envMap: vmEnvTex, envMapIntensity: .8 }),
    water: mdStd({ color: 0x2f5f66, roughness: .06, metalness: .35, transparent: true, opacity: .86, envMap: vmEnvTex, envMapIntensity: .6 }),
    sack: mdLam({ color: 0xb49a6a, roughness: 1 }),
    bale: [0xa8916a, 0x93805c, 0xb39d76].map(c => mdLam({ color: c, roughness: 1 })),   // çuval bezine sarılı pamuk balyaları
    leaf: mdLam({ color: 0x5f7f32, roughness: .8 }),
    leafD: mdLam({ color: 0x45622a, roughness: .85 }),
    bark: mdLam({ color: 0x7a6a58, roughness: .95 }),
    spice: [0xb8321e, 0xd89a1e, 0x7a3a1a, 0xc8601e, 0x5a6a2a].map(c => mdLam({ color: c, roughness: 1 })),
    rug: mdLam({ map: typeof kilimTex !== 'undefined' ? kilimTex : null, color: typeof kilimTex !== 'undefined' ? 0xffffff : 0x8a2a1e, side: THREE.DoubleSide }),
    awn: [mdAwnTex('#b8321e', '#efe2c4'), mdAwnTex('#2f6a5a', '#efe2c4'), mdAwnTex('#c8901e', '#7a2a1a')].map(t => mdLam({ map: t, side: THREE.DoubleSide })),
    clock: new THREE.MeshLambertMaterial({ map: mdClockTex }),
    glass: mdLam({ color: 0x1a1612, roughness: .3 }),
    lamp: new THREE.MeshBasicMaterial({ color: mdC(0xffd08a) }),
    pot: mdLam({ color: 0x9a4a2a, roughness: .9 }),
    flower: mdLam({ color: 0xc8202a, roughness: .9 }),
    // ışık ve su: çeşme akıntısı, sarnıç ışık hüzmeleri ve yerdeki ışık lekeleri
    stream: new THREE.MeshBasicMaterial({ color: mdC(0xbfe8f0), transparent: true, opacity: .42, depthWrite: false }),
    beam: new THREE.MeshBasicMaterial({ color: mdC(0xffd2a0), transparent: true, opacity: .1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    spot: new THREE.MeshBasicMaterial({ color: mdC(0xffd2a0), transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }),
    sky: new THREE.MeshBasicMaterial({ map: mdSkyTex, side: THREE.BackSide, fog: false, depthWrite: false }),
    castle: new THREE.MeshBasicMaterial({ map: mdCastleTex, side: THREE.BackSide, transparent: true, depthWrite: false }),
    sun: [1, .45].map(op => new THREE.SpriteMaterial({ map: glowTex, color: mdC(0xffe0b0), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: op })),
  };
  MD.sackGeo = new THREE.SphereGeometry(.34, 6, 4); MD.sackGeo.userData.keep = true;   // yüzlerce çuval tek geometriyi paylaşır
}

/* ================= TOPLU AĞ (malzeme başına bir mesh) =================
   Her malzemenin bütün parçaları tek ağda: harita küçük, parçalara bölmek kırpmada kazandırmıyor, çizim çağrısını
   ikiye katlıyordu. Yalnız renkli malzemeler köşe rengiyle tek ağda toplanır. */
const mdBatches = new Map();
function mdBatch(mat, nv) {
  const real = mat.userData.vc ? MD.vc : mat;
  let e = mdBatches.get(real.id); if (!e) mdBatches.set(real.id, e = { mat: real, list: [] });
  let b = e.list[e.list.length - 1];
  if (!b || b.p.length / 3 + nv > 60000) e.list.push(b = { p: [], n: [], u: [], i: [], c: real === MD.vc ? [] : null });   // 16 bit indeks sınırı
  return b;
}
// dörtgen: o sol alt köşe, R sağa, U yukarı (dışarıdan bakınca); doku dünya ölçüsünde (tw x th metrede bir), u0/v0 başlangıç
function mdQuad(mat, o, R, U, tw, th, u0, v0) {
  const B = mdBatch(mat, 4), k = B.p.length / 3, vc = mat.userData.vc, rl = Math.hypot(R[0], R[1], R[2]), ul = Math.hypot(U[0], U[1], U[2]);
  let nx = R[1] * U[2] - R[2] * U[1], ny = R[2] * U[0] - R[0] * U[2], nz = R[0] * U[1] - R[1] * U[0]; const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl; ny /= nl; nz /= nl;
  for (const [a, b] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    B.p.push(o[0] + R[0] * a + U[0] * b, o[1] + R[1] * a + U[1] * b, o[2] + R[2] * a + U[2] * b);
    B.n.push(nx, ny, nz); B.u.push(u0 + a * rl / tw, v0 + b * ul / th);
    if (B.c) B.c.push(vc.r, vc.g, vc.b);
  }
  B.i.push(k, k + 1, k + 2, k, k + 2, k + 3);
}
// eksene hizalı kutunun yüzleri (alt yüz istenmedikçe yok): 'e' +x, 'w' -x, 's' +z, 'n' -z, 't' üst, 'b' alt
function mdBox(x0, x1, y0, y1, z0, z1, mat, sides = 'ewsnt', tw = 2.4, th = 2.4, topMat = mat) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0;
  if (sides.includes('e')) mdQuad(mat, [x1, y0, z1], [0, 0, -d], [0, h, 0], tw, th, -z1 / tw, y0 / th);
  if (sides.includes('w')) mdQuad(mat, [x0, y0, z0], [0, 0, d], [0, h, 0], tw, th, z0 / tw, y0 / th);
  if (sides.includes('s')) mdQuad(mat, [x0, y0, z1], [w, 0, 0], [0, h, 0], tw, th, x0 / tw, y0 / th);
  if (sides.includes('n')) mdQuad(mat, [x1, y0, z0], [-w, 0, 0], [0, h, 0], tw, th, -x1 / tw, y0 / th);
  if (sides.includes('t')) mdQuad(topMat, [x0, y1, z1], [w, 0, 0], [0, 0, -d], tw, tw, x0 / tw, -z1 / tw);
  if (sides.includes('b')) mdQuad(topMat, [x0, y0, z0], [w, 0, 0], [0, 0, d], tw, tw, x0 / tw, z0 / tw);
}
const mdSolid = (x0, x1, y0, y1, z0, z1) => addBlock(x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, null, true, true);
// görünür + katı kutu
function mdBlock(x0, x1, y0, y1, z0, z1, mat, sides = 'ewsnt', tw = 2.4, th = 2.4) { mdBox(x0, x1, y0, y1, z0, z1, mat, sides, tw, th); mdSolid(x0, x1, y0, y1, z0, z1); }
const _mdM = new THREE.Matrix4(), _mdQ = new THREE.Quaternion(), _mdE = new THREE.Euler(), _mdP = new V3(), _mdS = new V3(), _mdN = new THREE.Matrix3(), _mdT = new V3();
// hazır geometriyi dönüştürüp topluya ekle; wuv: [tw, th] verilirse doku dünya koordinatından (yüz yönüne göre)
// dönüş sırası: önce rz ve rx (parçanın kendi eğimi), sonra ry (yön): 'YXZ'
function mdGeo(mat, geo, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = sx, sz = sx, wuv = null, us = 1, vs = 1) {
  _mdM.compose(_mdP.set(x, y, z), _mdQ.setFromEuler(_mdE.set(rx, ry, rz, 'YXZ')), _mdS.set(sx, sy, sz)); _mdN.getNormalMatrix(_mdM);
  const P = geo.attributes.position, Nn = geo.attributes.normal, U = geo.attributes.uv, B = mdBatch(mat, P.count), k = B.p.length / 3, vc = mat.userData.vc;
  for (let i = 0; i < P.count; i++) {
    _mdT.fromBufferAttribute(P, i).applyMatrix4(_mdM); const px = _mdT.x, py = _mdT.y, pz = _mdT.z; B.p.push(px, py, pz);
    _mdT.fromBufferAttribute(Nn, i).applyMatrix3(_mdN).normalize(); B.n.push(_mdT.x, _mdT.y, _mdT.z);
    if (wuv) {
      const ax = Math.abs(_mdT.x), ay = Math.abs(_mdT.y), az = Math.abs(_mdT.z);
      if (ay >= ax && ay >= az) B.u.push(px / wuv[0], pz / wuv[0]); else if (ax >= az) B.u.push(pz / wuv[0], py / wuv[1]); else B.u.push(px / wuv[0], py / wuv[1]);
    } else B.u.push((U ? U.getX(i) : 0) * us, (U ? U.getY(i) : 0) * vs);
    if (B.c) B.c.push(vc.r, vc.g, vc.b);
  }
  if (geo.index) for (let i = 0; i < geo.index.count; i++) B.i.push(geo.index.getX(i) + k);
  else for (let i = 0; i < P.count; i++) B.i.push(i + k);
  if (!geo.userData.keep) geo.dispose();
}
// iç yüzü görünsün: üçgen sırası çevrilir, normaller terslenir (kuyunun içi gibi)
function mdFlip(geo) {
  const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }
  const n = geo.attributes.normal.array; for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return geo;
}
function mdFlush() {
  for (const { mat, list } of mdBatches.values()) for (const B of list) {
    if (!B.i.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(B.u, 2)); g.setIndex(B.i); g.computeBoundingSphere();
    if (B.c) g.setAttribute('color', new THREE.Float32BufferAttribute(B.c, 3));
    const m = mapMesh(new THREE.Mesh(g, mat)); m.matrixAutoUpdate = false; m.updateMatrix();
    if (mat.transparent) m.renderOrder = 2;
  }
  mdBatches.clear();
}

/* ================= YAPI PARÇALARI ================= */
// kemer: açıklık span, kemer başlangıcı spring, üst kenar top, kalınlık depth. axis 'z': geçit z boyunca (yüz z'ye dik)
// geçidin ortası (cx, cz); kalınlık cz'den +z yönüne (axis 'x' ise cx'ten +x'e). frame: açıklığın iki yanında ayak genişliği
function mdPortal(cx, cz, axis, span, spring, top, depth, mat, frame = 0, solidTop = true) {
  const S = span / 2, F = S + frame, sh = new THREE.Shape();
  if (frame > 0) {   // ayaklı kemer: iç yüzü 1.5 cm içeride (geçidin duvarıyla aynı düzlemde titremesin)
    const Si = S - .015;
    sh.moveTo(-F, 0); sh.lineTo(-F, top); sh.lineTo(F, top); sh.lineTo(F, 0); sh.lineTo(Si, 0); sh.lineTo(Si, spring);
    sh.absarc(0, spring, Si, 0, Math.PI, false); sh.lineTo(-Si, 0); sh.lineTo(-F, 0);
  } else {   // ayaksız: yalnız kemerin üstündeki taş (yanları evlerin duvarı)
    sh.moveTo(-S, spring); sh.lineTo(-S, top); sh.lineTo(S, top); sh.lineTo(S, spring); sh.absarc(0, spring, S, 0, Math.PI, false);
  }
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 12 });
  if (axis === 'z') mdGeo(mat, geo, cx, 0, cz, 0, 0, 0, 1, 1, 1, [2.4, 2.4]);
  else mdGeo(mat, geo, cx, 0, cz, Math.PI / 2, 0, 0, 1, 1, 1, [2.4, 2.4]);
  if (solidTop && top > spring + S) {   // kemer taşı mermiyi tutsun: tepeden yukarısı tam, omuzlar basamaklı (açıklığın içi boş kalır)
    const box = (a, b, y0) => axis === 'z' ? mdSolid(cx + a, cx + b, y0, top, cz, cz + depth) : mdSolid(cx, cx + depth, y0, top, cz + a, cz + b);
    box(-F, F, spring + S);
    for (const sg of [-1, 1]) {
      box(Math.min(sg * .72 * S, sg * S), Math.max(sg * .72 * S, sg * S), spring + .7 * S);
      box(Math.min(sg * .92 * S, sg * S), Math.max(sg * .92 * S, sg * S), spring + .4 * S);
    }
  }
  if (frame > 0) for (const s of [-1, 1]) {   // yandaki ayaklar
    const a = Math.min(s * S, s * F), b = Math.max(s * S, s * F);
    if (axis === 'z') mdSolid(cx + a, cx + b, 0, top, cz, cz + depth); else mdSolid(cx, cx + depth, 0, top, cz + a, cz + b);
  }
}
// beşik tonoz (içi görünür): x0..x1 / z0..z1 kutusunun üstünde, eksen boyunca yarım silindir
function mdVault(x0, x1, z0, z1, spring, axis, mat, seg = 12) {
  const alongX = axis === 'x', c = alongX ? (z0 + z1) / 2 : (x0 + x1) / 2, S = alongX ? (z1 - z0) / 2 : (x1 - x0) / 2, L = alongX ? x1 - x0 : z1 - z0;
  const pt = (a, t) => alongX ? [x0 + t * L, spring + S * Math.sin(a), c + S * Math.cos(a)] : [c + S * Math.cos(a), spring + S * Math.sin(a), z0 + t * L];
  for (let i = 0; i < seg; i++) {
    const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg, o = pt(a0, 0), e = pt(a0, 1), u = pt(a1, 0);
    let R = [e[0] - o[0], e[1] - o[1], e[2] - o[2]], U = [u[0] - o[0], u[1] - o[1], u[2] - o[2]], O = o;
    // ön yüz içeriye (eksene) baksın
    const am = (a0 + a1) / 2, inw = alongX ? [0, -Math.sin(am), -Math.cos(am)] : [-Math.cos(am), -Math.sin(am), 0];
    const n = [R[1] * U[2] - R[2] * U[1], R[2] * U[0] - R[0] * U[2], R[0] * U[1] - R[1] * U[0]];
    if (n[0] * inw[0] + n[1] * inw[1] + n[2] * inw[2] < 0) { O = e; R = [-R[0], -R[1], -R[2]]; }
    mdQuad(mat, O, R, U, 2.4, 2.4, 0, i * Math.PI * S / seg / 2.4);
  }
}
function mdCrate(x, z, s = 1.15, y = 0, n = 1) { for (let i = 0; i < n; i++) { mdGeo(colCrateMat, new THREE.BoxGeometry(s, s, s), x, y + s / 2 + i * s, z); mdSolid(x - s / 2, x + s / 2, y + i * s, y + (i + 1) * s, z - s / 2, z + s / 2); } }
function mdSacks(x0, x1, z0, z1, h) {   // çuval yığını: tek çarpışma kutusu, üstünde yuvarlak çuvallar
  mdSolid(x0, x1, 0, h, z0, z1);
  const nx = Math.max(1, Math.round((x1 - x0) / .62)), nz = Math.max(1, Math.round((z1 - z0) / .62)), rows = Math.max(1, Math.round(h / .42));
  for (let r = 0; r < rows; r++) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (r === rows - 1 && (i + j) % 3 === 2) continue;
    mdGeo(MD.sack, MD.sackGeo, x0 + (i + .5) * (x1 - x0) / nx, .21 + r * .42, z0 + (j + .5) * (z1 - z0) / nz, (i * 7 + j) % 3, 0, 0, (x1 - x0) / nx / .6, .62, (z1 - z0) / nz / .66);
  }
}
function mdCart(x, z, alongZ, tall = false) {   // iki tekerlekli ahşap yük arabası (eksene hizalı çarpışma); tall: üstü tavana kadar çuval
  const ry = alongZ ? 0 : Math.PI / 2, L = 2.6, W = 1.3;
  const loc = (lx, lz) => alongZ ? [x + lx, z + lz] : [x + lz, z - lx];
  const put = (geo, mat, lx, y, lz, rx = 0, rz = 0) => { const [px, pz] = loc(lx, lz); mdGeo(mat, geo, px, y, pz, ry, rx, rz); };
  put(new THREE.BoxGeometry(W, .12, L), MD.wood, 0, .86, 0);
  for (const s of [-1, 1]) put(new THREE.BoxGeometry(.08, .42, L), MD.wood, s * W / 2, 1.1, 0);
  put(new THREE.BoxGeometry(W, .42, .08), MD.wood, 0, 1.1, L / 2);
  for (const s of [-1, 1]) {
    put(new THREE.CylinderGeometry(.62, .62, .1, 14), MD.woodD, s * (W / 2 + .1), .62, .2, 0, Math.PI / 2);
    put(new THREE.CylinderGeometry(.12, .12, .16, 8), MD.iron, s * (W / 2 + .1), .62, .2, 0, Math.PI / 2);
    put(new THREE.BoxGeometry(.08, .08, 1.6), MD.wood, s * .42, .7, -L / 2 - .7, -.2);   // oklar
  }
  const [cx, cz] = loc(0, -.15); if (alongZ) mdSolid(cx - .85, cx + .85, 0, 1.35, cz - 1.45, cz + 1.45); else mdSolid(cx - 1.45, cx + 1.45, 0, 1.35, cz - .85, cz + .85);
  if (!tall) { put(new THREE.BoxGeometry(W - .2, .4, L * .5), MD.sack, 0, 1.12, .3); return; }
  // yüksek yük: üç kat çuval, iple bağlı (boyu aşan siper)
  for (const [w, h, l, y] of [[W - .08, .44, L - .2, 1.14], [W - .14, .42, L - .3, 1.57], [W - .3, .36, L - .7, 1.96]]) {
    put(new THREE.BoxGeometry(w, h, l), MD.sack, 0, y, 0);
    for (const t of [-.3, .3]) put(new THREE.BoxGeometry(w + .02, h + .02, .04), MD.woodD, 0, y, t * l);
  }
  const [lx, lz] = loc(0, 0);
  if (alongZ) mdSolid(lx - (W - .08) / 2, lx + (W - .08) / 2, 1.35, 2.14, lz - (L - .2) / 2, lz + (L - .2) / 2); else mdSolid(lx - (L - .2) / 2, lx + (L - .2) / 2, 1.35, 2.14, lz - (W - .08) / 2, lz + (W - .08) / 2);
}
// taş havuz: dış ve iç yüzler, kenar taşı, su; çarpışma tam kutu
function mdBasin(x0, x1, z0, z1, h, wall, waterY) {
  mdBox(x0, x1, 0, h, z0, z1, MD.ashL, 'ewsn');
  const ix0 = x0 + wall, ix1 = x1 - wall, iz0 = z0 + wall, iz1 = z1 - wall, y0 = Math.max(0, waterY - .25);
  mdBox(x0, ix0, y0, h, iz0, iz1, MD.ashL, 'e'); mdBox(ix1, x1, y0, h, iz0, iz1, MD.ashL, 'w');
  mdBox(ix0, ix1, y0, h, z0, iz0, MD.ashL, 's'); mdBox(ix0, ix1, y0, h, iz1, z1, MD.ashL, 'n');
  mdBox(x0, ix0, 0, h, z0, z1, MD.trim, 't'); mdBox(ix1, x1, 0, h, z0, z1, MD.trim, 't');
  mdBox(ix0, ix1, 0, h, z0, iz0, MD.trim, 't'); mdBox(ix0, ix1, 0, h, iz1, z1, MD.trim, 't');
  mdQuad(MD.water, [ix0, waterY, iz1], [ix1 - ix0, 0, 0], [0, 0, -(iz1 - iz0)], 1, 1, 0, 0);
  mdSolid(x0, x1, 0, h, z0, z1);
}
function mdBarrel(x, z) {
  mdGeo(MD.wood, new THREE.CylinderGeometry(.4, .4, 1.1, 12), x, .55, z);
  for (const y of [.2, .9]) mdGeo(MD.iron, new THREE.CylinderGeometry(.415, .415, .05, 12), x, y, z);
  mdSolid(x - .4, x + .4, 0, 1.1, z - .4, z + .4);
}
function mdLantern(x, y, z, li, wall, hangTo = 0) {   // demir fener (duvar kollu ya da hangTo yüksekliğine çubukla asılı), isteğe bağlı nokta ışık
  mdGeo(MD.iron, new THREE.BoxGeometry(.28, .04, .28), x, y + .22, z);
  mdGeo(MD.iron, new THREE.ConeGeometry(.2, .16, 4), x, y + .32, z, Math.PI / 4);
  mdGeo(MD.lamp, new THREE.BoxGeometry(.2, .3, .2), x, y + .04, z);
  if (wall) mdGeo(MD.iron, new THREE.BoxGeometry(wall[0] ? .7 : .04, .04, wall[1] ? .7 : .04), x + wall[0] * .35, y + .3, z + wall[1] * .35);
  if (hangTo > y + .4) mdGeo(MD.iron, new THREE.CylinderGeometry(.014, .014, hangTo - y - .38, 5), x, (hangTo + y + .38) / 2, z);
  const fl = mapMesh(new THREE.Sprite(flameMat)); fl.position.set(x, y + .05, z); fl.scale.set(.7, .8, 1);
  if (li != null) { const L = torchLights[li]; L.position.set(x, y, z); L.color.setHex(0xffb060); L.distance = 13; L.intensity = 1.5; }
}
function mdPlant(x, z, s = 1) {   // saksıda sardunya
  mdGeo(MD.pot, new THREE.CylinderGeometry(.24 * s, .18 * s, .36 * s, 10), x, .18 * s, z);
  mdGeo(MD.leaf, new THREE.IcosahedronGeometry(.32 * s, 0), x, .5 * s, z);
  for (let i = 0; i < 4; i++) mdGeo(MD.flower, new THREE.IcosahedronGeometry(.07 * s, 0), x + Math.cos(i * 1.6) * .2 * s, .66 * s, z + Math.sin(i * 1.6) * .2 * s);
}
function mdTree(x, z, s, trunkH) {   // çınar / incir: gövde, dallar, köşeli yaprak kümeleri
  mdGeo(MD.bark, new THREE.CylinderGeometry(.34 * s, .5 * s, trunkH, 10), x, trunkH / 2, z);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7 + .4, L = 2.4 * s;
    mdGeo(MD.bark, new THREE.CylinderGeometry(.12 * s, .22 * s, L, 7), x + Math.cos(a) * L * .32, trunkH + L * .28, z + Math.sin(a) * L * .32, -a, 0, -.65);
  }
  const blobs = [[0, 1.6, 0, 2.6], [1.8, 1.1, .8, 2.1], [-1.6, 1.2, -.9, 2.2], [.7, 2.5, -1.4, 1.9], [-1, 2.3, 1.5, 2], [2, 2.1, -1.2, 1.6], [-2.2, .8, .9, 1.6]];
  blobs.forEach(([bx, by, bz, r], i) => { const g = new THREE.IcosahedronGeometry(r * s, 1); g.computeVertexNormals(); mdGeo(i % 2 ? MD.leafD : MD.leaf, g, x + bx * s, trunkH + by * s, z + bz * s, i); });
  mdSolid(x - .45 * s, x + .45 * s, 0, trunkH + .6, z - .45 * s, z + .45 * s);
}
// parmaklıklı pencere (sebil ve nöbet evi): koyu pencere, demir çubuklar, altta taş denizlik. side: 'e' 'w' 's' 'n' (yüzün yönü)
function mdGrille(side, p, c, y0, y1, w) {   // p: yüzün düzlemi (x ya da z), c: pencerenin ortası (öbür eksen)
  const sg = side === 'e' || side === 's' ? 1 : -1, ax = side === 'e' || side === 'w';
  // d0..d1: yüzden dışarı uzaklık, a0..a1: yüz boyunca aralık
  const box = (d0, d1, a0, a1, yy0, yy1, mat, sd, t = 2.4) => {
    const q0 = sg > 0 ? p + d0 : p - d1, q1 = sg > 0 ? p + d1 : p - d0;
    if (ax) mdBox(q0, q1, yy0, yy1, a0, a1, mat, sd, t, t); else mdBox(a0, a1, yy0, yy1, q0, q1, mat, sd, t, t);
  };
  box(0, .02, c - w / 2, c + w / 2, y0, y1, MD.glass, side, 1);
  const n = Math.max(3, Math.round(w / .16));
  for (let i = 1; i < n; i++) { const a = c - w / 2 + w * i / n; box(.02, .05, a - .015, a + .015, y0, y1, MD.iron, 'ewsn'); }
  const ym = (y0 + y1) / 2;
  box(.02, .05, c - w / 2, c + w / 2, ym - .015, ym + .015, MD.iron, 'ewsnt');
  box(0, .12, c - w / 2 - .1, c + w / 2 + .1, y0 - .09, y0, MD.trim, 'ewsnt');   // denizlik
}
// pamuk balyası yığını (boyu aşan siper): x0..x1 genişlik, z boyunca balyalar, kat kat ve tuğla gibi şaşırtmalı; çarpışma tek kutu
function mdBales(x0, x1, z0, z1, layers) {
  const n = Math.max(1, Math.round((z1 - z0) / 1.15)), L = (z1 - z0) / n, H = .85;
  for (let r = 0; r < layers; r++) {
    const cuts = [z0]; for (let i = 1; i < n; i++) cuts.push(z0 + i * L + (r % 2 ? -L / 2 : 0)); if (r % 2) cuts.push(z1 - L / 2); cuts.push(z1);
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i] + .025, b = cuts[i + 1] - .025, y = r * H, j = ((i * 5 + r * 3) % 4) * .02, top = r === layers - 1 ? 0 : ((i * 7 + r) % 3) * .02;
      mdBox(x0 + .015 + j, x1 - .015 - j * .5, y, y + H - .03 - top, a, b, MD.bale[(i * 2 + r) % 3], 'ewsnt', 1.2, .85);
      for (const t of b - a > .8 ? [.28, .72] : [.5]) { const zz = a + (b - a) * t; mdBox(x0 + j - .01, x1 - j * .5 + .01, y, y + H - .02 - top, zz - .025, zz + .025, MD.woodD, 'ewt', 1, 1); }   // ip
    }
  }
  const T = layers * H;
  mdBox(x0 + .1, x1 - .1, T, T + .03, z0 + .6, z0 + 2.4, MD.rug, 'ewsnt', 1, 1);   // üstüne serilmiş kilim, kenarından sarkar
  mdBox(x1 - .1, x1 - .07, T - .7, T + .03, z0 + .6, z0 + 2.4, MD.rug, 'e', 1, 1);
  mdSolid(x0, x1, 0, T, z0, z1);
}
function mdStall(x0, x1, z0, z1, awn, facing) {   // çarşı tezgâhı: ahşap tezgâh (siper), üstte tente, üzerinde mal
  mdBox(x0, x1, 0, 1.0, z0, z1, MD.wood, 'ewsnt', 1, 1); mdSolid(x0, x1, 0, 1.0, z0, z1);
  mdBox(x0 - .05, x1 + .05, 1.0, 1.06, z0 - .05, z1 + .05, MD.woodD, 'ewsnt', 1, 1);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongX = x1 - x0 > z1 - z0, L = alongX ? x1 - x0 : z1 - z0;
  for (const s of [-1, 1]) {   // tente direkleri (tezgâhın arka köşelerinde)
    const px = alongX ? cx + s * (L / 2 - .08) : cx - .45 * (facing || 1), pz = alongX ? cz - .45 * (facing || 1) : cz + s * (L / 2 - .08);
    mdGeo(MD.woodD, new THREE.CylinderGeometry(.04, .04, 2.4, 6), px, 1.2, pz);
  }
  const aw = new THREE.PlaneGeometry(alongX ? L + .3 : 1.9, alongX ? 1.9 : L + .3); aw.rotateX(-Math.PI / 2);
  mdGeo(awn, aw, cx, 2.35, cz, 0, alongX ? .22 * (facing || 1) : 0, alongX ? 0 : -.22 * (facing || 1));
  // mallar: baharat külahları, bakır kaplar
  const n = Math.max(2, Math.floor(L / .5));
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n - .5, px = alongX ? cx + t * L : cx, pz = alongX ? cz : cz + t * L;
    if (i % 3 === 2) mdGeo(MD.copper, new THREE.SphereGeometry(.17, 10, 8), px, 1.2, pz, 0, 0, 0, 1, .8, 1);
    else { mdGeo(MD.woodD, new THREE.CylinderGeometry(.21, .21, .06, 10), px, 1.09, pz); mdGeo(MD.spice[(i * 3 + n) % MD.spice.length], new THREE.ConeGeometry(.19, .26, 10), px, 1.25, pz); }
  }
}

/* ================= HARİTA ================= */
// yürünebilir dikdörtgenler [x0, x1, z0, z1] (1 m hücre). Geri kalan her hücre ev olur
const MD_OPEN = [
  [-39, -22, 26, 38],   // saldırı üssü: AŞAĞI KAPI
  [-39, -32, 6, 26],    // sur yolu (güney)
  [-39, -26, -6, 6],    // burç meydanı
  [-31, -26, -30, -6],  // sur yolu (kuzey)
  [-26, -24, -30, -25], // SUR KAPISI → A
  [-24, -7, -38, -20],  // A · HAN AVLUSU
  [-14, -10, -20, -6],  // ABBARA
  [-14, -7, -6, -1],    // abbara ağzı
  [-7, 7, -7, 7],       // ÇEŞME MEYDANI
  [-6, -1, 7, 14],      // meydanın güney sokağı
  [-24, -1, 14, 19],    // aşağı sokak
  [-27, -21, 14, 26],   // üssün kuzeydoğu çıkışı
  [-22, -16, 32, 37],   // sarnıç girişi
  [-16, 8, 26, 38],     // SARNIÇ
  [8, 16, 17, 30],      // SARNIÇ AĞZI → B
  [12, 30, -2, 18],     // B · BEDESTEN
  [7, 12, 1, 6],        // BAKIRCILAR → B
  [22, 39, -38, -24],   // savunma üssü: KALE YOLU
  [6, 22, -31, -26],    // konak yolu
  [-4, 6, -38, -26],    // konak avlusu
  [-7, -4, -37, -33],   // KONAK KAPISI → A
  [22, 27, -24, -17],   // yukarı sokak
  [1, 27, -22, -17],    // kale sokağı
  [1, 6, -17, -7],      // meydanın kuzey sokağı
  [32, 39, -24, 3],     // sur dibi (doğu)
  [30, 32, -2, 3],      // BEDESTEN KAPISI → B
];
const MD_COVER = [[-14, -10, -18, -8], [-16, 8, 26, 38], [-22, -16, 32, 37], [8, 16, 22, 30]];   // üstü kapalı: abbara, sarnıç, sarnıç girişi, sarnıç ağzı
const MD_KONAK = [-4, 6, -38, -26];
MAPS.mardin = {
  name: 'MARDİN', half: 40, open: true, mmBg: '#b9a27e', verb: .14,
  fog: 0xe9bd90, sky: 0xe9bd90, fogD: .006, hemi: [0xffe2bc, 0x6a4c34], hemiI: .78, moon: 0xffbf78, moonI: 1.55, pl: .18,
  lava: 0x000000, flame: 0xffa040, light: 0xffb060, ember: 0xffffff, floor: 0xffffff, wall: 0xffffff, noEmbers: true,
  floorTex: () => mdPaveTex, wallTex: () => mdAshTex,
  sites: { A: { x0: -24, x1: -7, z0: -38, z1: -20 }, B: { x0: 12, x1: 30, z0: -2, z1: 18 } },
  spawn(team) {
    const south = typeof isBomb === 'function' && isBomb() ? team === attackTeam() : team === 'red';
    return south ? new V3(rand(-37, -25.5), .6, rand(28.2, 35.6)) : new V3(rand(24.5, 37), .6, -rand(26.2, 36.2));
  },
  build() {
    mdInit();
    moon.position.set(-60, 19, 34);   // alçak, batı-güneybatıdan vuran akşam güneşi
    const N = 80, O = 40, walk = new Uint8Array(N * N), cov = new Uint8Array(N * N);   // walk: 0 ev, 1 yol, 2 ayrılmış (kendi modeli var), 3 sur korkuluğu
    const K = (x, z) => (x + O) * N + (z + O), inMap = (x, z) => x >= -O && x < O && z >= -O && z < O;
    const fill = (arr, x0, x1, z0, z1, v) => { for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) if (inMap(x, z)) arr[K(x, z)] = v; };
    for (const r of MD_OPEN) fill(walk, ...r, 1);
    for (const r of MD_COVER) fill(cov, ...r, 1);
    fill(walk, -39, -35, -3, 3, 2);   // burç
    // batı ve doğu kenarında yolun bittiği yerde alçak sur korkuluğu (mazgallardan ova görünür)
    for (let z = -O; z < O; z++) { if (walk[K(-39, z)] === 1) walk[K(-40, z)] = 3; if (walk[K(38, z)] === 1) walk[K(39, z)] = 3; }
    const inR = (r, x, z) => x >= r[0] && x < r[1] && z >= r[2] && z < r[3];
    const SA = [-24, -7, -38, -20], SB = [12, 30, -2, 18];
    /* ---- evler: yol olmayan hücreler kutulara birleşir (en çok 10 x 10 m), yükseklik hücreden türetilir (her istemcide aynı) ---- */
    const used = new Uint8Array(N * N), hOf = new Float32Array(N * N), boxes = [];
    const zoneH = (x, z) => inR([12, 30, -17, -2], x, z) ? 7.6 : 0;   // bedesten bloğu: düz dam, üstünde kubbeler
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const k = i * N + j; if (walk[k] || used[k]) continue;
      const zh = zoneH(i - O, j - O), same = kk => !walk[kk] && !used[kk] && zoneH((kk / N | 0) - O, kk % N - O) === zh;
      let j2 = j; while (j2 + 1 < N && j2 - j < 9 && same(i * N + j2 + 1)) j2++;
      let i2 = i;
      grow: while (i2 + 1 < N && i2 - i < 9) { for (let jj = j; jj <= j2; jj++) if (!same((i2 + 1) * N + jj)) break grow; i2++; }
      for (let x = i; x <= i2; x++) for (let z = j; z <= j2; z++) used[x * N + z] = 1;
      const x0 = i - O, x1 = i2 + 1 - O, z0 = j - O, z1 = j2 + 1 - O;
      const touch = r => x0 - 1 < r[1] && x1 + 1 > r[0] && z0 - 1 < r[3] && z1 + 1 > r[2];
      let h = zh || (touch(SA) ? 8.8 : 6.2 + ((i * 7 + j * 13) % 5) * .85);
      if (x0 <= -39 || x1 >= 39 || z0 <= -39 || z1 >= 39) h = Math.max(h, 7.4);   // kenar evleri: dışarısı görünmesin
      boxes.push({ x0, x1, z0, z1, h, v: (i * 3 + j * 5) % 4 });
      for (let x = i; x <= i2; x++) for (let z = j; z <= j2; z++) hOf[x * N + z] = h;
      mdSolid(x0, x1, 0, h, z0, z1);
    }
    // cephe yüzleri hücre kenarı başına: önündeki yola göre malzeme (han, bedesten, sarnıç içi, konak, sıradan ev)
    const faceMat = (x, z, box) => cov[K(x, z)] ? MD.int : inR(SA, x, z) ? MD.han : inR(SB, x, z) ? MD.bed : inR(MD_KONAK, x, z) ? MD.facade[1] : MD.facade[box.v];
    const boxOf = new Int32Array(N * N).fill(-1); boxes.forEach((b, bi) => { for (let x = b.x0; x < b.x1; x++) for (let z = b.z0; z < b.z1; z++) boxOf[K(x, z)] = bi; });
    const DIRS = [[1, 0, 'e'], [-1, 0, 'w'], [0, 1, 's'], [0, -1, 'n']];
    for (let x = -O; x < O; x++) for (let z = -O; z < O; z++) {
      if (walk[K(x, z)]) continue;
      const b = boxes[boxOf[K(x, z)]], h = b.h;
      for (const [dx, dz, sd] of DIRS) {
        const qx = x + dx, qz = z + dz; if (!inMap(qx, qz)) continue;
        const q = K(qx, qz); let y0 = 0, mat;
        if (walk[q]) mat = faceMat(qx, qz, b);
        else { const hq = hOf[q]; if (hq >= h - .01) continue; y0 = hq; mat = MD.facade[b.v]; }
        const tin = mat === MD.int;   // iç taş dokusu tonozlarla aynı ölçüde (2.4 m)
        mdBox(x, x + 1, y0, h, z, z + 1, mat, sd, tin ? 2.4 : MD_TW, tin ? 2.4 : MD_TH);
        // saçak (kat kornişi): dışa taşan ince bant
        const e = .14, t = .3;
        if (sd === 'e') mdBox(x + 1, x + 1 + e, h - t, h + .06, z, z + 1, MD.trim, 'eb');
        if (sd === 'w') mdBox(x - e, x, h - t, h + .06, z, z + 1, MD.trim, 'wb');
        if (sd === 's') mdBox(x, x + 1, h - t, h + .06, z + 1, z + 1 + e, MD.trim, 'sb');
        if (sd === 'n') mdBox(x, x + 1, h - t, h + .06, z - e, z, MD.trim, 'nb');
      }
    }
    for (const b of boxes) mdBox(b.x0, b.x1, 0, b.h, b.z0, b.z1, MD.roof, 't');
    /* ---- sur korkuluğu: dış kenarda 1.15 m duvar, üstünde mazgal dişleri ---- */
    for (let z = -O; z < O; z++) for (const x of [-40, 39]) {
      if (walk[K(x, z)] !== 3) continue;
      mdBlock(x, x + 1, 0, 1.15, z, z + 1, MD.ashL, x < 0 ? 'et' : 'wt');
      for (const zz of [z + .05, z + .55]) if (((z + 40) * 2 + (zz > z + .3 ? 1 : 0)) % 2 === 0) mdBox(x + .1, x + .9, 1.15, 1.85, zz, zz + .45, MD.ashL, 'ewsnt');
    }
    /* ---- burç: surdan taşan yuvarlak kule ---- */
    mdGeo(MD.ash, new THREE.CylinderGeometry(3.4, 3.7, 10.5, 28, 1, true), -38.6, 5.25, 0, 0, 0, 0, 1, 1, 1, null, 9, 4.4);
    mdGeo(MD.trim, new THREE.CylinderGeometry(3.6, 3.6, .4, 28), -38.6, 10.5, 0);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; mdGeo(MD.ashL, new THREE.BoxGeometry(.8, .8, .5), -38.6 + Math.cos(a) * 3.3, 11.1, Math.sin(a) * 3.3, -a); }
    for (let i = 0; i < 3; i++) { const a = (i - 1) * .55; mdGeo(MD.glass, new THREE.BoxGeometry(.25, 1.1, .35), -38.6 + Math.cos(a) * 3.45, 6.4, Math.sin(a) * 3.45, -a); }   // mazgal pencereleri
    // çarpışma: göz hizasındaki yarıçapa (3.66) göre basamaklı kutular, görünen taş hiçbir yerde kutunun dışına taşmaz
    for (const [zz, xx] of [[1.5, -34.94], [2.4, -35.26], [3.0, -35.84], [3.5, -36.5], [3.7, -37.53]]) mdSolid(-40, xx, 0, 10.5, -zz, zz);
    /* ---- zemin kaplamaları: han avlusunda büyük plaka, bedesten önünde arnavut kaldırımı, sarnıçta ıslak taş ---- */
    const floorPatch = (x0, x1, z0, z1, mat, tw, u0 = x0 / tw, v0 = -z1 / tw) => mdQuad(mat, [x0, .006, z1], [x1 - x0, 0, 0], [0, 0, -(z1 - z0)], tw, tw, u0, v0);
    floorPatch(-24, -7, -38, -20, MD.slab, 3.6); floorPatch(-26, -24, -30, -25, MD.slab, 3.6);
    floorPatch(12, 30, -2, 18, MD.cobble, 2.2); floorPatch(7, 12, 1, 6, MD.cobble, 2.2); floorPatch(30, 32, -2, 3, MD.cobble, 2.2);
    floorPatch(-16, 8, 26, 38, MD.wet, 3.2); floorPatch(-22, -16, 32, 37, MD.wet, 3.2); floorPatch(8, 16, 22, 30, MD.wet, 3.2);
    floorPatch(-14, -10, -18, -8, MD.intFloor, 80, (-14 + 40) / 80, (40 - -8) / 80);   // sokak zemini gibi: uv = (x+40)/80, (40-z)/80

    /* ---- A · HAN AVLUSU: kuzey kenarda revak (sütunlar + dam), ortada kuyu, çuvallar, araba ---- */
    const AH = 3.7;
    // revak avlunun batı üçte ikisinde: doğu ucu (konak kapısının önü) açık kalsın, geçit daralmasın
    mdBox(-24, -11.3, AH, AH + .45, -38, -35.0, MD.trim, 'estb'); mdSolid(-24, -11.3, AH, AH + .45, -38, -35.0);
    for (const x of [-22.1, -18.8, -15.5, -12.2]) {
      mdBlock(x - .4, x + .4, 0, AH, -35.8, -35.0, MD.ashL, 'ewsn');
      mdBox(x - .5, x + .5, AH - .3, AH, -35.9, -34.9, MD.trim, 'ewsn');
    }
    for (const [a, b] of [[-24, -22.5], [-21.7, -19.2], [-18.4, -15.9], [-15.1, -12.6]]) {   // sütunlar arası kemerler (kemer taşı mermiyi tutar)
      const span = b - a; if (span < 1.2) continue;
      mdPortal((a + b) / 2, -35.8, 'z', span, AH - .25 - span / 2, AH, .8, MD.ashL, 0);
    }
    // kuyu
    mdGeo(MD.ashL, new THREE.CylinderGeometry(.95, 1.0, .95, 18, 1, true), -15.5, .475, -27.5, 0, 0, 0, 1, 1, 1, null, 3, 1);
    mdGeo(MD.ash, mdFlip(new THREE.CylinderGeometry(.86, .87, .42, 18, 1, true)), -15.5, .76, -27.5, 0, 0, 0, 1, 1, 1, null, 3, .5);   // kuyunun iç duvarı (su ile ağız arası)
    mdGeo(MD.trim, new THREE.TorusGeometry(.97, .1, 6, 18), -15.5, .95, -27.5, 0, Math.PI / 2);
    mdGeo(MD.water, new THREE.CircleGeometry(.9, 16), -15.5, .55, -27.5, 0, -Math.PI / 2);
    for (const s of [-1, 1]) mdGeo(MD.woodD, new THREE.BoxGeometry(.12, 1.9, .12), -15.5 + s * .9, 1.45, -27.5);
    mdGeo(MD.woodD, new THREE.CylinderGeometry(.07, .07, 2, 8), -15.5, 2.2, -27.5, 0, 0, Math.PI / 2);
    mdGeo(MD.iron, new THREE.CylinderGeometry(.15, .12, .22, 10), -15.5, 1.5, -27.5);
    mdSolid(-16.5, -14.5, 0, .95, -28.5, -26.5);
    // siperler: boyu aşan çuval yığını, yüklü araba, iki kat sandıklar (alçak siper bu motorda korumaz: vuruş silindiri 1.9 m)
    mdSacks(-22.2, -19.6, -24.8, -23.6, 2.1);
    mdCart(-10, -27.2, true, true);
    mdCrate(-21.5, -31.6, 1.25, 0, 2); mdCrate(-20.1, -32.0, 1.0); mdCrate(-8.4, -22.5, 1.3, 0, 2);
    mdBasin(-19.3, -16.9, -20.95, -20.15, .7, .12, .56);   // yalak (su teknesi)
    mdLantern(-24 + .25, 2.9, -33, null, [-1, 0]); mdLantern(-7 - .25, 2.9, -24, null, [1, 0]);
    for (const [x, z] of [[-23.5, -20.5], [-7.5, -37.4], [-23.4, -37.4]]) mdPlant(x, z, 1.2);

    /* ---- ABBARA: kemerli dar geçit, üstü ev ---- */
    mdVault(-14, -10, -18, -8, 2.8, 'z', MD.int);
    mdBox(-14.2, -9.8, 4.8, 8.4, -18, -8, MD.facade[2], 'ewt', MD_TW, MD_TH);   // geçidin üstündeki ev
    mdSolid(-14, -10, 4.8, 8.4, -18, -8);
    mdPortal(-12, -18.45, 'z', 4, 2.8, 8.4, .45, MD.ashL, .6);    // A tarafı: oymalı han kapısı
    mdBox(-14.9, -9.1, 8.2, 8.6, -18.6, -18, MD.trim, 'nsewt');
    mdPortal(-12, -8, 'z', 4, 2.8, 8.4, .35, MD.ash, 0);          // meydan tarafı
    mdLantern(-12, 3.2, -13, 2, null, 4.8);

    /* ---- SUR KAPISI (A'nın batısı) ve sur yolundaki kemerler ---- */
    mdPortal(-26, -27.5, 'x', 5, 2.6, 8.8, 2, MD.ashL, 0);
    mdPortal(-26.6, -27.5, 'x', 5, 2.6, 9.4, .6, MD.ashL, 1.2);    // dışa taşan kapı çerçevesi
    mdPortal(-7, -35, 'x', 4, 2.6, 8.8, 3, MD.ashL, 0);             // konak kapısı (A'nın kuzeydoğusu)
    mdPortal(-28.5, -18, 'z', 5, 3.2, 7.2, .9, MD.ash, 0);          // sur yolu (kuzey) kemeri

    /* ---- ÇEŞME MEYDANI: çeşme, saat kulesi, çınar, banklar ---- */
    mdBasin(-1.6, 1.6, -1.6, 1.6, .75, .24, .6);
    mdBlock(-.55, .55, 0, 2.9, -.55, .55, MD.ashL);
    mdGeo(MD.trim, new THREE.BoxGeometry(1.3, .2, 1.3), 0, 2.95, 0);
    mdGeo(MD.dome, new THREE.SphereGeometry(.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, 3.05, 0, 0, 0, 0, 1, 1, 1, null, 7, 2.2);
    mdGeo(MD.brass, new THREE.SphereGeometry(.1, 8, 6), 0, 3.72, 0);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; mdGeo(MD.brass, new THREE.CylinderGeometry(.04, .05, .3, 8), Math.sin(a) * .68, 1.55, Math.cos(a) * .68, a, Math.PI / 2); }
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; mdGeo(MD.stream, new THREE.PlaneGeometry(.06, .8), Math.sin(a) * .82, 1.12, Math.cos(a) * .82, a); }
    // saat kulesi (meydanın kuzey bloğunda): gövde, saat kadranları, kemerli çan katı, piramit külah
    const TX0 = -5, TX1 = -1, TZ0 = -11.4, TZ1 = -6.7;
    mdBox(TX0, TX1, 0, 16.2, TZ0, TZ1, MD.ashL, 'ewsn'); mdSolid(TX0, TX1, 0, 21, TZ0, TZ1);
    mdBox(TX0 - .15, TX1 + .15, 16.2, 16.6, TZ0 - .15, TZ1 + .15, MD.trim, 'ewsntb');
    for (const [x, z, ry] of [[-3, TZ1 + .02, 0], [-3, TZ0 - .02, Math.PI], [TX1 + .02, -9.05, Math.PI / 2], [TX0 - .02, -9.05, -Math.PI / 2]]) {
      mdGeo(MD.clock, new THREE.CircleGeometry(1.15, 24), x, 14.2, z, ry);
    }
    for (const [x0, x1, z0, z1] of [[TX0, TX0 + .7, TZ0, TZ0 + .7], [TX1 - .7, TX1, TZ0, TZ0 + .7], [TX0, TX0 + .7, TZ1 - .7, TZ1], [TX1 - .7, TX1, TZ1 - .7, TZ1]]) mdBox(x0, x1, 16.6, 19.4, z0, z1, MD.ashL, 'ewsn');
    mdBox(TX0 + .7, TX1 - .7, 16.6, 19.4, TZ0 + .7, TZ1 - .7, MD.glass, 'ewsn');
    mdBox(TX0 - .15, TX1 + .15, 19.4, 19.8, TZ0 - .15, TZ1 + .15, MD.trim, 'ewsntb');
    mdGeo(MD.roof, new THREE.ConeGeometry(3.1, 3.4, 4, 1), -3, 21.5, -9.05, Math.PI / 4);
    mdGeo(MD.brass, new THREE.SphereGeometry(.18, 8, 6), -3, 23.3, -9.05);
    mdTree(4.6, 5.6, 1, 5.4);                                      // çınar (güneydoğu köşesinde: köşklerin yanındaki geçitler açık kalsın)
    mdBlock(-6.55, -6.0, 0, .45, 5.0, 6.9, MD.wood, 'ewsnt', 1, 1);   // banklar
    mdBlock(1.6, 3.8, 0, .45, 6.4, 6.95, MD.wood, 'ewsnt', 1, 1);
    mdCrate(-6.2, -6.2, 1.1); mdBarrel(6.3, 6.3);
    /* çeşmenin iki yanında iki köşk: meydanın ağızları arasındaki çapraz uzun görüşü keser (orta sokaklardan karşı sokağa nişan yok) */
    {   // sebil (güneybatı): parmaklıklı pencereler, kubbe
      const x0 = -3.5, x1 = -1.5, z0 = 2.5, z1 = 4.5, h = 2.7, cx = -2.5, cz = 3.5;
      mdBox(x0, x1, 0, .3, z0, z1, MD.trim, 'ewsn'); mdBox(x0, x1, .3, h, z0, z1, MD.ashL, 'ewsn');
      mdGrille('e', x1, cz, 1.05, 2.15, .9); mdGrille('w', x0, cz, 1.05, 2.15, .9); mdGrille('s', z1, cx, 1.05, 2.15, .9); mdGrille('n', z0, cx, 1.05, 2.15, .9);
      mdBox(x0 - .12, x1 + .12, h, h + .26, z0 - .12, z1 + .12, MD.trim, 'ewsntb');
      mdGeo(MD.ashL, new THREE.CylinderGeometry(.8, .86, .3, 16), cx, h + .41, cz);
      mdGeo(MD.dome, new THREE.SphereGeometry(.8, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), cx, h + .56, cz, 0, 0, 0, 1, 1, 1, null, 7, 2.2);
      mdGeo(MD.brass, new THREE.SphereGeometry(.09, 8, 6), cx, h + 1.45, cz);
      mdGeo(MD.brass, new THREE.CylinderGeometry(.03, .03, .26, 6), cx, .62, z1 + .14, 0, Math.PI / 2);   // musluk
      mdSolid(x0, x1, 0, h + .26, z0, z1);
    }
    {   // kahve ocağı (kuzeydoğu): taş dükkân, kepenk, piramit dam, ocak bacası
      const x0 = 1.5, x1 = 3.9, z0 = -4.5, z1 = -2.5, h = 2.7, cx = 2.7, cz = -3.5;
      mdBlock(x0, x1, 0, h, z0, z1, MD.ash, 'ewsn');
      mdBox(x0 - .03, x0, .95, 2.15, z0 + .3, z1 - .3, MD.wood, 'w', 1, 1); mdBox(x0 - .05, x0, .9, .95, z0 + .25, z1 - .25, MD.woodD, 'wt', 1, 1);
      mdBox(cx - .6, cx + .6, .3, 2.1, z1, z1 + .03, MD.woodD, 's', 1, 1);   // kapı
      mdBox(x0 - .04, x0, 2.22, 2.5, z0 + .45, z1 - .45, MD.woodD, 'w', 1, 1);   // tabela
      mdGrille('n', z0, cx, 1.3, 2.05, .6); mdGrille('e', x1, cz, 1.3, 2.05, .6);
      for (const z of [z0 + .55, cz, z1 - .55]) mdGeo(MD.copper, new THREE.CylinderGeometry(.09, .11, .2, 10), x0 - .04, 1.05, z);   // tezgâhta cezveler
      mdBox(x0 - .08, x1 + .08, h - .22, h, z0 - .08, z1 + .08, MD.trim, 'ewsnb');
      mdGeo(MD.roof, new THREE.ConeGeometry(1.75, 1.0, 4, 1), cx, h + .5, cz, Math.PI / 4, 0, 0, 1.2, 1, 1);
      mdGeo(MD.iron, new THREE.CylinderGeometry(.07, .07, .9, 8), x1 - .45, h + .8, z0 + .45);
    }
    for (const [x, z] of [[-6.6, -.6], [6.6, -6.6], [-.4, 6.6]]) mdPlant(x, z, 1.1);
    mdPortal(-3.5, 10.5, 'z', 5, 3.0, 6.8, .9, MD.ash, 0);       // güney sokağı kemeri
    mdPortal(3.5, -14.5, 'z', 5, 3.0, 6.8, .9, MD.ash, 0);       // kuzey sokağı kemeri

    /* ---- aşağı sokak ve üs çıkışları ---- */
    mdPortal(-11, 16.5, 'x', 5, 3.2, 7, .9, MD.ash, 0);          // aşağı sokakta sabat
    mdBarrel(-1.6, 18.4); mdCrate(-26.3, 18.2, 1.1); mdCrate(-26.4, 15.1, 1.0);
    mdCrate(-33.4, 16.5, 1.2, 0, 2); mdCrate(-38.3, 9.6, 1.1); mdCrate(-38.3, 10.75, .9);
    mdCrate(-27.2, -4.8, 1.2);
    mdCrate(-30.2, -14.2, 1.1, 0, 2); mdBarrel(-26.6, -21.2);
    {   // burç meydanında nöbet evi: sur yolunun upuzun düz hattını (üs ile kale kapısı arası) keser
      const x0 = -32.5, x1 = -30, z0 = -1.5, z1 = 1.5, h = 3.0;
      mdBlock(x0, x1, 0, h, z0, z1, MD.ashL, 'ewsn');
      mdBox(x0 - .12, x1 + .12, h, h + .22, z0 - .12, z1 + .12, MD.trim, 'ewsntb'); mdSolid(x0, x1, h, h + .22, z0, z1);
      for (const x of [x0 + .1, (x0 + x1) / 2 - .2, x1 - .5]) for (const z of [z0 - .1, z1 - .2]) mdBox(x, x + .4, h + .22, h + .66, z, z + .3, MD.ashL, 'ewsnt');   // mazgal dişleri
      for (const z of [-.7, .4]) for (const x of [x0 - .1, x1 - .2]) mdBox(x, x + .3, h + .22, h + .66, z, z + .3, MD.ashL, 'ewsnt');
      mdBox(x1, x1 + .03, 0, 2.05, -.5, .5, MD.woodD, 'e', 1, 1); mdBox(x1, x1 + .1, 2.05, 2.25, -.65, .65, MD.trim, 'ewsnt');   // kapı ve lento
      mdBox(-31.35, -31.15, 1.5, 2.4, z0 - .02, z0, MD.glass, 'n', 1, 1); mdBox(-31.35, -31.15, 1.5, 2.4, z1, z1 + .02, MD.glass, 's', 1, 1);   // mazgal
      mdGrille('w', x0, 0, 1.2, 2.2, .8);
    }
    // saldırı üssü: güney surunda kapalı şehir kapısı, kenarda araba ve saman
    mdPortal(-30.5, 37.4, 'z', 5.2, 2.8, 9, .6, MD.ashL, 1.4);
    mdBox(-33.1, -27.9, 0, 5.4, 37.96, 38, MD.woodD, 'n', 1, 1);
    mdCart(-23.6, 30.2, true); mdSacks(-38.6, -37.2, 26.2, 27.6, 1.0);

    /* ---- SARNIÇ: sütunlar, üç beşik tonoz, tavan; girişte ve ağızda kemer ---- */
    for (const zc of [28, 32, 36]) mdVault(-16, 8, zc - 2, zc + 2, 3.2, 'x', MD.int);
    mdSolid(-16, 8, 5.2, 5.8, 26, 38);
    for (const z of [30, 34]) {
      mdBox(-16, 8, 2.95, 3.35, z - .3, z + .3, MD.int, 'snb');   // kemer üzengi hattı
      for (const x of [-12, -7, -2, 3]) {
        mdGeo(MD.int, new THREE.CylinderGeometry(.42, .42, 2.8, 12), x, 1.55, z, 0, 0, 0, 1, 1, 1, null, 1.1, 1.2);
        mdBox(x - .55, x + .55, 0, .3, z - .55, z + .55, MD.int, 'ewsnt'); mdBox(x - .55, x + .55, 2.65, 2.95, z - .55, z + .55, MD.int, 'ewsntb');
        mdSolid(x - .5, x + .5, 0, 3.2, z - .5, z + .5);
      }
    }
    // tavandaki ışık bacaları: aşağı inen sıcak ışık hüzmesi
    for (const [x, z] of [[-9.5, 32], [.5, 28], [5.5, 36]]) {
      mdGeo(MD.beam, new THREE.CylinderGeometry(.45, .9, 5.1, 12, 1, true), x, 2.6, z);
      mdGeo(MD.spot, new THREE.CircleGeometry(.95, 16), x, .02, z, 0, -Math.PI / 2);
      mdGeo(MD.lamp, new THREE.CircleGeometry(.42, 12), x, 5.15, z, 0, Math.PI / 2);
    }
    // fenerler üzengi kirişlerinden asılı
    mdLantern(-9.5, 2.5, 30, 0, null, 2.95); mdLantern(.5, 2.5, 34, 1, null, 2.95);
    mdBlock(-15.4, -14.2, 0, .8, 36.6, 37.8, MD.int); mdBlock(6.4, 7.4, 0, .6, 36.8, 37.8, MD.int);   // yıkık taş blokları
    // sarnıç girişi: üstü tonoz, üssün tarafında kemer
    mdVault(-22, -16, 32, 37, 2.4, 'x', MD.int);
    mdSolid(-22, -16, 4.9, 7.2, 32, 37); mdBox(-22, -16, 4.9, 7.2, 32, 37, MD.roof, 't');
    mdPortal(-16.3, 34.5, 'x', 5, 2.4, 5.8, .3, MD.int, 0, false);   // salona açılan ağız: tonozlar arası duvar
    mdPortal(-22.45, 34.5, 'x', 5, 2.4, 7.2, .45, MD.ashL, .7);
    // sarnıç ağzı (B'ye çıkış): düz tavan, kuzeyde kemer
    mdVault(8, 16, 22, 30, 2.2, 'z', MD.int, 16);
    mdSolid(8, 16, 6.2, 8.4, 22, 30); mdBox(8, 16, 7.0, 8.4, 22, 30, MD.facade[3], 'n', MD_TW, MD_TH); mdBox(8, 16, 6.2, 8.4, 22, 30, MD.roof, 't');
    mdPortal(12, 21.6, 'z', 8, 2.2, 7.0, .4, MD.ashL, 0);
    mdPortal(8, 28, 'x', 4, 3.2, 6.4, .3, MD.int, 0, false);         // salondan ağza geçişte tonozlar arası duvar
    mdLantern(15.6, 2.6, 25, 3, [1, 0]);
    mdCrate(15.2, 20.0, 1.2);

    /* ---- B · BEDESTEN: kubbeler, cümle kapısı, tezgâhlar, bakır yığını ---- */
    for (const x of [15, 21, 27]) {
      mdGeo(MD.ashL, new THREE.CylinderGeometry(2.6, 2.7, .9, 20), x, 8.05, -9.5);
      mdGeo(MD.dome, new THREE.SphereGeometry(2.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), x, 8.5, -9.5, 0, 0, 0, 1, 1, 1, null, 7, 2.2);
      mdGeo(MD.ashL, new THREE.CylinderGeometry(.35, .4, .5, 10), x, 11.3, -9.5);
      mdGeo(MD.brass, new THREE.SphereGeometry(.16, 8, 6), x, 11.7, -9.5);
    }
    mdPortal(21, -2.0, 'z', 3.2, 2.6, 6.6, .6, MD.ashL, 1.1);    // cümle kapısı (kapalı)
    mdBox(19.4, 22.6, 0, 4.2, -2.0, -1.97, MD.woodD, 's', 1, 1);
    mdStall(15, 18.2, 5.8, 6.8, MD.awn[0], 1); mdStall(23.2, 26.4, 2.8, 3.8, MD.awn[1], -1);
    // boyu aşan siperler: kapalı kapının önünden güneye pamuk balyaları (doğu kapısı ile bakırcılar arası görüşü keser), sandık yığını
    mdBales(20.4, 21.6, -1.4, 4.5, 3);
    mdCrate(23.1, 8.1, 1.2, 0, 2); mdCrate(24.3, 8.1, 1.2, 0, 2);
    mdStall(28.6, 29.6, 8.5, 11.5, MD.awn[2], -1);
    // bakır yığını: 3x3 kap, üstünde 2x2, en üstte 1 (piramit); çarpışma kat kat
    for (const [n, y] of [[3, .22], [2, .66], [1, 1.1]]) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = 26.6 + (i - (n - 1) / 2) * .55, z = 11.6 + (j - (n - 1) / 2) * .55, k = i * 3 + j + n;
      mdGeo(MD.copper, new THREE.CylinderGeometry(.25 + (k % 3) * .012, .29, .44, 12), x, y, z, k);
    }
    mdSolid(25.75, 27.45, 0, .44, 10.75, 12.45); mdSolid(26.02, 27.18, .44, .88, 11.02, 12.18); mdSolid(26.3, 26.9, .88, 1.32, 11.3, 11.9);
    mdSacks(16.5, 18.7, 13.1, 14.3, 2.1);   // boyu aşan çuval yığını, üstünde iki rulo kilim yan yana
    for (const z of [13.45, 13.95]) mdGeo(MD.rug, new THREE.CylinderGeometry(.22, .22, 2.1, 10), 17.6, 2.32, z, 0, 0, Math.PI / 2);
    mdCrate(28.6, 16.6, 1.3, 0, 2); mdCrate(13.3, -.8, 1.2); mdCart(21.5, 15.6, false);
    // asılı kilimler ve bakır kaplar (bakırcılar)
    for (const [x, z, ry] of [[12.02, 10, Math.PI / 2], [29.98, 13.5, -Math.PI / 2], [17.5, 17.98, Math.PI]]) {
      mdGeo(MD.rug, new THREE.PlaneGeometry(1.6, 2.3), x, 2.5, z, ry);
    }
    for (let i = 0; i < 7; i++) {
      const x = 7.6 + i * .62, z = i % 2 ? 1.3 : 5.7;
      mdGeo(MD.iron, new THREE.CylinderGeometry(.01, .01, .5, 4), x, 3.05, z);
      mdGeo(MD.copper, new THREE.SphereGeometry(.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * .6), x, 2.6, z, 0, Math.PI);
    }
    mdLantern(12.25, 3.0, 7.5, null, [-1, 0]); mdLantern(29.75, 3.0, 6, null, [1, 0]);
    mdPortal(30, .5, 'x', 5, 2.8, 7.6, 2, MD.ashL, 0);            // bedesten (doğu) kapısı
    mdPortal(11, 3.5, 'x', 5, 2.9, 7.2, 1, MD.ashL, 0);           // bakırcılar kemeri

    /* ---- savunma tarafı: kale yolu, konak avlusu, kale sokağı, sur dibi ---- */
    mdBasin(-.4, 2.4, -33.4, -30.6, .5, .2, .38);   // konak havuzu ve fıskiyesi
    mdBlock(.75, 1.25, 0, 1.1, -32.25, -31.75, MD.ashL);
    mdPortal(1, -37.95, 'z', 4.4, 2.8, 7.2, .5, MD.ashL, .8, false);   // eyvan (kuzey duvarda derin kemer)
    mdBox(-1.2, 3.2, 0, 4.9, -38, -37.95, MD.glass, 's', 1, 1);
    mdTree(-2.6, -27.4, .65, 2.6); mdTree(4.8, -36.6, .6, 2.4);   // incir ağaçları
    mdPlant(5.4, -26.6, 1.2); mdPlant(-3.5, -37.4, 1.2);
    mdCrate(14, -26.6, 1.1); mdCrate(23.2, -37.2, 1.2); mdCrate(38.2, -25.0, 1.1); mdCrate(38.2, -26.2, .9);
    mdPortal(12, -19.5, 'x', 5, 3.2, 7, .9, MD.ash, 0);          // kale sokağında sabat
    mdPortal(24.5, -23, 'z', 5, 3.2, 7, .9, MD.ash, 0);          // yukarı sokak kemeri
    mdBarrel(8, -21.4); mdCrate(19, -17.6, 1.2);
    mdCart(37, -10, true); mdCrate(33, -1.6, 1.2); mdSacks(37.6, 38.8, -19.8, -17.4, 1.0);
    mdLantern(14, 3, -30.75, null, [0, -1]); mdLantern(32.25, 3, -12, null, [-1, 0]); mdLantern(-6.75, 3, 3.5, null, [-1, 0]);
    // kale yolu: kuzey kenarda kaleye çıkan kapı
    mdPortal(30.5, -38, 'z', 5, 2.8, 9.4, .6, MD.ashL, 1.4);
    mdBox(28, 33, 0, 5.3, -38, -37.96, MD.woodD, 's', 1, 1);

    /* ---- bölge işaretleri ---- */
    for (const [k, x, z] of [['A', -15.5, -31.5], ['B', 18.6, 10.2]]) mdGeo(siteLetter(k), new THREE.PlaneGeometry(4.5, 4.5), x, .03, z, 0, -Math.PI / 2);
    const sign = (k, x, z, ry) => mdGeo(siteLetter(k), new THREE.PlaneGeometry(1.4, 1.4), x, 2.7, z, ry);
    sign('A', -26.03, -9, -Math.PI / 2); sign('A', -8.5, -5.97, 0); sign('A', -3.97, -31, Math.PI / 2);
    sign('B', 6.97, -1.5, -Math.PI / 2); sign('B', 8.03, 25, Math.PI / 2); sign('B', 32.03, -4, Math.PI / 2);

    /* ---- gökyüzü kubbesi, güneş, kuzeyde kale (kamerayla gezer: hep sonsuzda görünür) ---- */
    // kubbe opak işlerin en sonunda çizilir: yalnız hiçbir şeyin örtmediği gök piksellerini boyar
    const dome = mapMesh(new THREE.Mesh(new THREE.SphereGeometry(170, 32, 16), MD.sky));
    dome.renderOrder = 2; dome.frustumCulled = false;
    dome.onBeforeRender = (r, s, cam) => { dome.position.copy(cam.getWorldPosition(_mdP)); dome.updateMatrixWorld(true); };
    const castle = new THREE.Mesh(new THREE.CylinderGeometry(150, 150, 80, 40, 1, true, Math.PI - .95, 1.9), MD.castle);
    castle.position.y = 22; castle.frustumCulled = false; dome.add(castle);
    const sd = new V3(-.85, .13, .5).normalize();
    for (const [sc, i] of [[16, 0], [80, 1]]) {
      const sun = new THREE.Sprite(MD.sun[i]);
      sun.position.copy(sd).multiplyScalar(150); sun.scale.setScalar(sc); sun.frustumCulled = false; dome.add(sun);
    }
    mdFlush();
  },
};
