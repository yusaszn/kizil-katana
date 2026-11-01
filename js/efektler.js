'use strict';
/* Ekran efektleri (post-processing): sahne ve silah sahnesi ara görüntüye çizilir, sonra
   - parlama (bloom): ateş, namlu alevi, izli mermi, meşaleler hafifçe ışır
   - renk: kontrast ve doygunluk (ekran uzayında; sis ve gökyüzü rengi düz çizimdekiyle aynı kalır)
   - vinyet: kenarlar kararır; can azken kenarlar kızıllaşıp nabız gibi atar
   - hasar: vurulunca ekran kenarlarında renk kayması (kromatik sapma)
   - ince film taneciği
   Ayarlardan kapatılabilir (telefonda varsayılan kapalı). Gerekli dosyalar yüklenemezse eski düz çizim kullanılır. */

const FX = { composer: null, vmPass: null, bloom: null, grade: null, failed: false, w: 0, h: 0 };
const GRADE_SHADER = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uVig: { value: .32 }, uHurt: { value: 0 }, uLow: { value: 0 },
    uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uGrain: { value: .022 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVig, uHurt, uLow, uSat, uContrast, uGrain; uniform vec2 uRes; varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float ca = uHurt * 0.012 * dot(d, d) * 4.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + d * ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - d * ca).b);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = max(mix(vec3(l), col, uSat), 0.0);
      col = max((col - 0.5) * uContrast + 0.5, 0.0);
      float v = smoothstep(0.86, 0.22, length(d * vec2(1.0, 0.82)));
      col *= mix(1.0 - uVig, 1.0, v);
      col = mix(col, col * vec3(1.3, 0.5, 0.45) + vec3(0.05, 0.0, 0.0), uLow * (1.0 - v));
      float n = fract(sin(dot(vUv * uRes + uTime * 61.7, vec2(12.9898, 78.233))) * 43758.5453);
      gl_FragColor = vec4(col + (n - 0.5) * uGrain, 1.0);
    }`,
};
function fxSetup() {
  if (FX.composer || FX.failed) return !!FX.composer;
  try {
    if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.ShaderPass || !THREE.UnrealBloomPass) throw new Error('efekt dosyaları yok');
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const gl2 = renderer.capabilities.isWebGL2;
    // ara görüntü ekranla aynı (sRGB) kodlamada tutulur: three r128 sisi ve arka plan rengini kodlamadan sonra kattığı için
    // doğrusal ara görüntüde sis açık/puslu çıkıyordu. WebGL2'de kenar yumuşatmalı.
    const opts = { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, encoding: THREE.sRGBEncoding };
    const rt = gl2 && THREE.WebGLMultisampleRenderTarget ? new THREE.WebGLMultisampleRenderTarget(size.x, size.y, opts) : new THREE.WebGLRenderTarget(size.x, size.y, opts);
    rt.texture.encoding = THREE.sRGBEncoding;
    const composer = new THREE.EffectComposer(renderer, rt);
    const world = new THREE.RenderPass(scene, camera);
    const vm = new THREE.RenderPass(vmScene, vmCam); vm.clear = false; vm.clearDepth = true;
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), .42, .38, .93);
    const grade = new THREE.ShaderPass(GRADE_SHADER);
    composer.addPass(world); composer.addPass(vm); composer.addPass(bloom); composer.addPass(grade);
    Object.assign(FX, { composer, vmPass: vm, bloom, grade });
    fxResize();
    return true;
  } catch (e) { console.warn('ekran efektleri kapalı:', e.message); FX.failed = true; return false; }
}
function fxResize() {
  if (!FX.composer) return;
  const w = window.innerWidth, h = window.innerHeight;
  FX.composer.setPixelRatio(renderer.getPixelRatio());
  FX.composer.setSize(w, h);
  const s = renderer.getDrawingBufferSize(new THREE.Vector2());
  FX.grade.uniforms.uRes.value.set(s.x, s.y);
}
window.addEventListener('resize', fxResize);
// ana döngünün çizim adımı (game.js)
function renderFrame(showVm, dt) {
  if (SETTINGS.fx && fxSetup()) {
    const U = FX.grade.uniforms;
    U.uTime.value = (U.uTime.value + dt) % 1000;
    U.uHurt.value = typeof hurtFlash !== 'undefined' ? hurtFlash : 0;
    const low = typeof player !== 'undefined' && player.alive && state === 'play' && player.hp < ST.maxHp * .3 ? (.55 + Math.sin(gameTime * 6) * .25) * (1 - player.hp / (ST.maxHp * .3)) : 0;
    U.uLow.value += (low - U.uLow.value) * Math.min(1, dt * 6);
    FX.vmPass.enabled = showVm;
    FX.composer.render(dt);
    return;
  }
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  if (showVm) renderer.render(vmScene, vmCam);
}
