'use strict';
/* Fotoğraf dokuları (Poly Haven, CC0; kaynaklar doku/KAYNAK.md). js/doku-veri.js içinde base64 gelir: .exe sürümü oyunu
   file:// ile açar, resim dosyası WebGL'e yüklenemez ama data: adresi yüklenir. Resimler açılışta çözülür; harita
   kurulurken hazırsa fotoğraf, değilse eski çizim dokusu kullanılır. Yüksek grafikte taşlara kabartma (normal) haritası da eklenir. */
const DOKU = {};
if (typeof DOKU_VERI !== 'undefined') for (const k in DOKU_VERI) { const im = new Image(); im.src = DOKU_VERI[k]; DOKU[k] = im; }
const dokuHazir = k => { const im = DOKU[k]; return !!(im && im.complete && im.naturalWidth); };
const gfxHigh = () => SETTINGS.gfx === 'high';
// resimden doğrudan tekrarlı doku (renk: sRGB, normal: doğrusal)
function dokuTex(k, rx = 1, ry = rx, srgb = true) {
  if (!dokuHazir(k)) return null;
  const t = new THREE.Texture(DOKU[k]); t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = gfxHigh() ? 8 : 4;
  return t;
}
// tuvale foto dokuyu döşer: (x, y, w, h) alanına, her döşeme tw x th piksel
function dokuDose(g, k, x, y, w, h, tw, th = tw) {
  const im = DOKU[k];
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (let yy = y + h; yy > y - th; yy -= th) for (let xx = x; xx < x + w; xx += tw) g.drawImage(im, xx, yy - th, tw, th);   // alttan döşenir: zemin hizası tam taş sırasında
  g.restore();
}
// çizim tekrarlanabilsin diye geçici tohumlu Math.random (renk ve kabartma tuvali aynı pencereleri çizer)
function dokuTohum(seed, fn) {
  const R = Math.random; let s = (seed % 2147483646) + 1;
  Math.random = () => (s = s * 16807 % 2147483647) / 2147483647;
  try { return fn(); } finally { Math.random = R; }
}
// kabartma tuvali için: her boya düz yüzey rengine (#8080ff) döner, böylece pencere ve kapılar düz kalır
function dokuDuzCtx(g) {
  return new Proxy(g, {
    get(t, p) { const v = t[p]; return typeof v === 'function' ? v.bind(t) : v; },
    set(t, p, v) { t[p] = p === 'fillStyle' || p === 'strokeStyle' ? '#8080ff' : v; return true; },
  });
}
