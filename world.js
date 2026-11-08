/* ==========================================================================
   world.js — the VELOURÉ world. One continuous scene behind the page, travelled
   by scrolling. Posture copied from activetheory.net: a chrome emblem hanging
   on a ribbon, dust with depth of field, a statement set in glitching display
   type inside the scene, work as floating cards you can pick, a lit stage,
   and the emblem waiting again at the end. three.js, self-hosted; CSP-clean.
   ========================================================================== */
import * as THREE from './vendor/three.module.min.js';

(function init() {
  const html = document.documentElement;
  const canvas = document.getElementById('world');
  if (!canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 820px)').matches || (('ontouchstart' in window) && innerWidth < 1024);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false });
  } catch (e) { html.classList.add('no-world'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  html.classList.add('world-on');

  const scene = new THREE.Scene();
  const FOV = 38;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 140);
  const CAM_Z = 5.4;
  camera.position.set(0, 0, CAM_Z);
  const VIS_H = 2 * CAM_Z * Math.tan(FOV * Math.PI / 360);   // world height visible at z=0 (~3.72)
  const STEP = VIS_H;                                         // one viewport scrolled = one visible-height travelled
  const visW = () => VIS_H * camera.aspect;

  /* ---------- background: haze at the top, black below ---------- */
  {
    const c = document.createElement('canvas'); c.width = 16; c.height = 1024;
    const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 1024);
    gr.addColorStop(0, '#2b5468'); gr.addColorStop(0.16, '#172c38'); gr.addColorStop(0.42, '#0b0e12'); gr.addColorStop(1, '#040506');
    g.fillStyle = gr; g.fillRect(0, 0, 16, 1024);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
  }

  /* ---------- environment for the chrome: a soft studio with two coloured lamps ---------- */
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#dce9f2'); gr.addColorStop(0.35, '#55646f'); gr.addColorStop(0.62, '#1a2026'); gr.addColorStop(1, '#05070a');
    g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
    const box = (x, y, w, h, col, a) => { const r = g.createLinearGradient(0, y, 0, y + h); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, col); r.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = a; g.fillStyle = r; g.fillRect(x, y, w, h); g.globalAlpha = 1; };
    box(60, 90, 420, 70, '#ffffff', 0.95); box(560, 150, 380, 50, '#ffffff', 0.8); box(200, 250, 700, 40, '#ffffff', 0.5);
    const spot = (x, y, r, col) => { const s = g.createRadialGradient(x, y, 0, x, y, r); s.addColorStop(0, col); s.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = s; g.fillRect(x - r, y - r, r * 2, r * 2); };
    spot(300, 320, 150, 'rgba(255,150,190,0.75)'); spot(800, 300, 170, 'rgba(140,200,255,0.8)'); spot(520, 60, 120, 'rgba(168,205,224,0.9)');
    const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(tex).texture; pm.dispose(); tex.dispose();
  }

  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.14, envMapIntensity: 1.5, iridescence: 0.55, iridescenceIOR: 1.45, iridescenceThicknessRange: [120, 440], clearcoat: 0.35, clearcoatRoughness: 0.2 });
  const ribbonMat = chrome.clone(); ribbonMat.side = THREE.DoubleSide;
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0a0d11, metalness: 0.75, roughness: 0.38, envMapIntensity: 0.9 });

  /* ---------- the emblem: chrome ring + shield (the mark itself, as a texture) ---------- */
  const RING_R = 0.5;
  const shieldTex = new THREE.Texture(); shieldTex.colorSpace = THREE.SRGBColorSpace;
  const shieldReady = new Promise(res => {
    const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 1126; c.getContext('2d').drawImage(img, 0, 0, 1024, 1126); shieldTex.image = c; shieldTex.needsUpdate = true; res(); }; img.onerror = res; img.src = 'assets/mark.svg';
  });
  function makeEmblem() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.028, 24, 160), chrome));
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.616), new THREE.MeshStandardMaterial({ map: shieldTex, transparent: true, alphaTest: 0.02, metalness: 0.55, roughness: 0.42, envMapIntensity: 1.1 }));
    sh.position.z = 0.02; g.add(sh);
    return g;
  }
  const emblem = makeEmblem(); scene.add(emblem);
  const emblem2 = makeEmblem(); scene.add(emblem2);
  const EMB_Y = -0.1;
  emblem.position.set(0, EMB_Y, 0);

  /* ---------- page geometry: sections give the world its stations ---------- */
  const sec = id => document.getElementById(id);
  const S = { statement: sec('statement'), work: sec('work'), process: sec('process'), end: sec('end') };
  // world y of the point `frac` of the way down an element (what the camera centres on when that point is mid-viewport)
  function yAt(el, frac) { const vh = innerHeight || 1; const page = el.offsetTop + frac * el.offsetHeight; return -(page - vh / 2) / vh * STEP; }
  function pageLength() { return Math.max(1, (document.documentElement.scrollHeight - innerHeight) / Math.max(1, innerHeight)) * STEP; }

  const journey = new THREE.Group(); scene.add(journey);
  let built = { L: 0, W: 0 };
  let L = 10, yEnd = -10;

  /* ---------- the ribbon: hangs the emblem, crosses, weaves down, hangs the emblem again at the end ---------- */
  function ribbonStrip(pts, s, twist) {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.55);
    const M = Math.min(2400, 80 + pts.length * 42);
    const fr = curve.computeFrenetFrames(M, false);
    const pos = new Float32Array((M + 1) * 6), nor = new Float32Array((M + 1) * 6), uv = new Float32Array((M + 1) * 4), idx = [];
    const P = new THREE.Vector3(), Sd = new THREE.Vector3(), Nn = new THREE.Vector3();
    for (let i = 0; i <= M; i++) {
      const t = i / M; curve.getPointAt(t, P);
      const th = t * Math.PI * 2 * twist + s * 0.6;
      Sd.copy(fr.binormals[i]).multiplyScalar(Math.cos(th)).addScaledVector(fr.normals[i], Math.sin(th));
      Nn.crossVectors(fr.tangents[i], Sd).normalize();
      const w = 0.04;
      pos.set([P.x - Sd.x * w, P.y - Sd.y * w, P.z - Sd.z * w, P.x + Sd.x * w, P.y + Sd.y * w, P.z + Sd.z * w], i * 6);
      nor.set([Nn.x, Nn.y, Nn.z, Nn.x, Nn.y, Nn.z], i * 6);
      uv.set([0, t, 1, t], i * 4);
      if (i < M) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    return new THREE.Mesh(geo, ribbonMat);
  }
  function ribbon(s) {
    const R = RING_R, V = (x, y, z) => new THREE.Vector3(x, y, z), pts = [];
    // from above, cross over the emblem, wrap it, cross under it
    pts.push(V(s * 0.22, EMB_Y + 7.0, 0.05 * s), V(s * 0.95, EMB_Y + 2.5, 0.12 * s), V(-s * 0.10, EMB_Y + 1.05, 0.08 * s), V(-s * (R + 0.04), EMB_Y, 0.0), V(-s * 0.55, EMB_Y - 0.85, 0.1 * s), V(s * 0.12, EMB_Y - 1.45, 0.09 * s));
    // the journey: a slow weave down the whole page
    const y0 = EMB_Y - 2.4, y1 = yEnd + 2.4; const n = Math.max(2, Math.floor((y0 - y1) / 1.45));
    const wTop = S.work ? yAt(S.work, 0.02) : 1, wBot = S.work ? yAt(S.work, 0.98) : 0;
    for (let k = 0; k <= n; k++) { const y = y0 - k * 1.45; const amp = (R + 0.5) + Math.min(1.3, k * 0.07); const deep = (y < wTop && y > wBot) ? -2.3 : 0; pts.push(V(s * amp * Math.cos(k * Math.PI / 3.6), y, 0.18 * Math.sin(k * 0.9 + s) - 0.3 * Math.min(1, k / 6) + deep)); }
    // the end: wrap the second emblem and tail off
    pts.push(V(-s * 0.10, yEnd + 1.05, 0.08 * s), V(s * (R + 0.04), yEnd, 0.0), V(s * 0.55, yEnd - 0.85, 0.1 * s), V(-s * 0.12, yEnd - 1.45, 0.09 * s), V(-s * 0.7, yEnd - 4.5, -0.4));
    return ribbonStrip(pts, s, 2.2 + 0.4 * s);
  }

  /* ---------- text in the world: display type with a scanline glitch ---------- */
  const glitchVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
  const glitchFS = `
    uniform sampler2D tMap; uniform float uTime, uGlitch, uOpacity; varying vec2 vUv;
    float rnd(float x){ return fract(sin(x * 12.9898) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float row = floor(uv.y * 56.0);
      float r = rnd(row + floor(uTime * 9.0) * 0.37);
      float shift = (r > 0.9 ? (r - 0.9) * 1.6 : 0.0) * uGlitch * (rnd(row * 3.1 + floor(uTime * 9.0)) - 0.5);
      uv.x += shift;
      float scan = 0.82 + 0.18 * step(0.5, fract(uv.y * 150.0));
      vec4 c = texture2D(tMap, uv);
      float ar = texture2D(tMap, uv + vec2(0.006 * uGlitch * r, 0.0)).a;
      float ab = texture2D(tMap, uv - vec2(0.006 * uGlitch * r, 0.0)).a;
      vec3 col = c.rgb * scan + vec3(0.35, 0.8, 1.0) * ab * 0.35 * uGlitch + vec3(1.0, 0.45, 0.7) * ar * 0.35 * uGlitch;
      float a = max(c.a, max(ar, ab) * 0.6 * uGlitch) * uOpacity;
      if (a < 0.01) discard;
      gl_FragColor = vec4(col, a);
    }`;
  const textPlanes = [];
  function textPlane(lines, opts) {
    const o = Object.assign({ size: 150, weight: 700, width: 2048, align: 'left', color: '#F2F7F9', lineHeight: 0.98, family: 'Chakra Petch' }, opts || {});
    const c = document.createElement('canvas'); const g = c.getContext('2d');
    const font = `${o.weight} ${o.size}px "${o.family}", "Share Tech Mono", monospace`;
    g.font = font;
    let w = 0; lines.forEach(l => { w = Math.max(w, g.measureText(l).width); });
    c.width = Math.ceil(Math.min(o.width, w + 40)); c.height = Math.ceil(lines.length * o.size * o.lineHeight + o.size * 0.3);
    g.font = font; g.fillStyle = o.color; g.textBaseline = 'alphabetic'; g.textAlign = o.align;
    const x = o.align === 'left' ? 10 : c.width / 2;
    lines.forEach((l, i) => g.fillText(l, x, o.size * 0.92 + i * o.size * o.lineHeight));
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const mat = new THREE.ShaderMaterial({ uniforms: { tMap: { value: tex }, uTime: { value: 0 }, uGlitch: { value: 0.2 }, uOpacity: { value: 1 } }, vertexShader: glitchVS, fragmentShader: glitchFS, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const aspect = c.width / c.height;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1 / aspect), mat);
    m.userData.aspect = aspect; textPlanes.push(m);
    return m;
  }

  /* ---------- cards: the work, floating in space ---------- */
  const cardDefs = [...document.querySelectorAll('#cards [data-card]')].map(b => ({ id: b.dataset.card, title: b.dataset.title || b.textContent.trim(), kicker: b.dataset.kicker || '', hue: parseFloat(b.dataset.hue || '200') }));
  const cards = [];
  function roundedPlane(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const geo = new THREE.ShapeGeometry(s, 8);
    const uv = geo.attributes.uv; const p = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
    return geo;
  }
  let seed = 11; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function cardTexture(def, i) {
    const W = 1024, H = 640, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.fillStyle = '#0a0f15'; g.fillRect(0, 0, W, H);
    // painterly weather: soft blooms in the card's hue family, silver and a little gold
    for (let k = 0; k < 26; k++) {
      const x = rnd() * W, y = rnd() * H, r = 120 + rnd() * 320;
      const h = def.hue + (rnd() - 0.5) * 60, sat = 35 + rnd() * 35, lig = 22 + rnd() * 30, a = 0.08 + rnd() * 0.16;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `hsla(${h},${sat}%,${lig}%,${a})`); gr.addColorStop(1, 'hsla(0,0%,0%,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    for (let k = 0; k < 7; k++) { const x = rnd() * W, y = rnd() * H, r = 60 + rnd() * 160; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${k % 3 ? '215,228,236' : '214,186,120'},${0.08 + rnd() * 0.1})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    // grain
    const id = g.getImageData(0, 0, W, H), d = id.data; for (let p = 0; p < d.length; p += 16) { const n = (rnd() - 0.5) * 18; d[p] += n; d[p + 1] += n; d[p + 2] += n; } g.putImageData(id, 0, 0);
    // scanlines + vignette
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 2);
    const vg = g.createLinearGradient(0, 0, W, 0); vg.addColorStop(0, 'rgba(0,0,0,0.42)'); vg.addColorStop(0.6, 'rgba(0,0,0,0)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    // frame
    g.strokeStyle = 'rgba(191,227,236,0.55)'; g.lineWidth = 3; g.beginPath(); g.roundRect(6, 6, W - 12, H - 12, 34); g.stroke();
    // type
    g.textBaseline = 'alphabetic'; g.fillStyle = 'rgba(191,227,236,0.9)'; g.font = '400 24px "Chakra Petch", "Share Tech Mono", monospace';
    g.fillText(`${String(i + 1).padStart(2, '0')}  //  ${def.kicker.toUpperCase()}`, 64, 92);
    const title = def.title.toUpperCase().split(' '); const lines = []; let cur = '';
    g.font = '700 108px "Chakra Petch", "Share Tech Mono", monospace';
    title.forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (g.measureText(t).width > W - 150 && cur) { lines.push(cur); cur = wd; } else cur = t; }); if (cur) lines.push(cur);
    const baseY = H / 2 + 20 - (lines.length - 1) * 52;
    lines.forEach((l, k) => { const y = baseY + k * 108; g.fillStyle = 'rgba(80,220,255,0.55)'; g.fillText(l, 60, y); g.fillStyle = 'rgba(255,90,150,0.45)'; g.fillText(l, 68, y + 2); g.fillStyle = '#F4F8FA'; g.fillText(l, 64, y); });
    g.fillStyle = 'rgba(191,227,236,0.75)'; g.font = '400 22px "Chakra Petch", "Share Tech Mono", monospace'; g.fillText('OPEN  ->', 64, H - 64);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  }

  /* ---------- dust ---------- */
  const dustVS = `
    attribute float aSize; attribute float aSeed; attribute vec3 aColor;
    uniform float uTime, uPR, uFocus; uniform vec3 uPointer;
    varying float vBlur; varying vec3 vColor; varying float vAlpha;
    void main(){
      vec3 p = position;
      p.x += sin(uTime * 0.12 + aSeed * 6.283) * 0.25;
      p.y += cos(uTime * 0.09 + aSeed * 4.0) * 0.18;
      p.z += sin(uTime * 0.07 + aSeed * 9.0) * 0.2;
      vec2 d = p.xy - uPointer.xy; float dist = length(d);
      p.xy += normalize(d + 0.0001) * smoothstep(1.1, 0.0, dist) * 0.3;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      float depth = -mv.z;
      float blur = clamp(abs(depth - uFocus) / 4.2, 0.0, 1.0);
      vBlur = blur; vColor = aColor; vAlpha = 1.0 - blur * 0.6;
      gl_PointSize = min(44.0 * uPR, aSize * (1.0 + blur * 2.4) * uPR * (12.0 / depth));
      gl_Position = projectionMatrix * mv;
    }`;
  const dustFS = `
    varying float vBlur; varying vec3 vColor; varying float vAlpha;
    void main(){
      vec2 uv = gl_PointCoord - 0.5; float r = length(uv) * 2.0; if (r > 1.0) discard;
      float core = smoothstep(1.0, 0.0, r);
      float rim = smoothstep(0.7, 1.0, r) * smoothstep(1.0, 0.86, r);
      float a = mix(core, 0.3 * core + rim * 0.55 + 0.16, vBlur);
      gl_FragColor = vec4(vColor, a * vAlpha * 0.85);
    }`;
  const dustMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uFocus: { value: 5.2 }, uPointer: { value: new THREE.Vector3(0, 0, 0) } }, vertexShader: dustVS, fragmentShader: dustFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  let dust = null;
  function buildDust() {
    const N = mobile ? 900 : 2300; const pos = new Float32Array(N * 3), size = new Float32Array(N), sd = new Float32Array(N), col = new Float32Array(N * 3);
    const span = L + 14, spreadX = 10;
    for (let i = 0; i < N; i++) {
      const z = -9 + rnd() * 12.5; pos[i * 3] = (rnd() - 0.5) * spreadX * (1 + Math.max(0, -z) * 0.12); pos[i * 3 + 1] = 5 - rnd() * span; pos[i * 3 + 2] = z;
      size[i] = 1.4 + rnd() * 2.6; sd[i] = rnd();
      const k = rnd(); const c = k < 0.5 ? [0.86, 0.91, 0.95] : k < 0.78 ? [0.66, 0.8, 0.88] : k < 0.93 ? [0.86, 0.74, 0.46] : [0.75, 0.62, 0.9];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    dust = new THREE.Points(geo, dustMat); dust.frustumCulled = false; journey.add(dust);
  }
  function pointsCloud(N, fn, size) {
    const pos = new Float32Array(N * 3), sz = new Float32Array(N), sd = new Float32Array(N), col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { const o = fn(i); pos.set(o.p, i * 3); col.set(o.c, i * 3); sz[i] = size * (0.6 + rnd() * 0.8); sd[i] = rnd(); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, dustMat); pts.frustumCulled = false; return pts;
  }

  /* ---------- build everything that depends on page size ---------- */
  const drifters = [];
  let statementPlane = null, platform = null, knot = null, stageTorus = null;
  function clearJourney() {
    while (journey.children.length) {
      const o = journey.children.pop();
      if (o.geometry) o.geometry.dispose();
      if (o.material && o.material.uniforms && o.material.uniforms.tMap) { o.material.uniforms.tMap.value.dispose(); o.material.dispose(); }
      else if (o.material && o.material.map && o.userData.card) { o.material.map.dispose(); o.material.dispose(); }
    }
    drifters.length = 0; cards.length = 0; textPlanes.length = 0; dust = null; stageTorus = null;
  }
  function buildJourney() {
    clearJourney();
    seed = 11;
    L = pageLength();
    yEnd = S.end ? yAt(S.end, 0.5) - 0.1 : -L - 0.1;
    const vw = visW();
    journey.add(ribbon(1), ribbon(-1));
    emblem2.position.set(0, yEnd, 0);

    // statement: the big words live in the scene, left, with the ring passing through
    if (S.statement) {
      const lines = (S.statement.dataset.lines || 'BUILT|FOR|CAPITAL.').split('|');
      statementPlane = textPlane(lines, { size: 190, weight: 700 });
      const targetW = Math.min(vw * (mobile ? 0.9 : 0.56), 3.2);
      statementPlane.scale.set(targetW, targetW, 1);
      const h = targetW / statementPlane.userData.aspect;
      statementPlane.position.set(-vw / 2 + (mobile ? vw * 0.05 : vw * 0.06) + targetW / 2, yAt(S.statement, mobile ? 0.38 : 0.5) + (mobile ? h * 0.1 : 0), -0.35);
      journey.add(statementPlane);
      // the platform: a dark slab just above the eye, seen edge-on, carrying gold dust along its lip
      platform = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.PlaneGeometry(60, 9), new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 0.4, roughness: 0.75, envMapIntensity: 0.35, side: THREE.DoubleSide }));
      slab.rotation.x = -Math.PI / 2; slab.position.set(0, 0, -5.5); platform.add(slab);
      platform.add(pointsCloud(mobile ? 320 : 1000, () => { const x = (rnd() - 0.5) * 26, z = -1.2 - rnd() * rnd() * 8; const lift = (rnd() - 0.5) * 0.5 * (1 + (-z) * 0.08); const warm = rnd() < 0.72; return { p: [x, lift, z], c: warm ? [0.92, 0.78, 0.44] : [0.86, 0.9, 0.95] }; }, 2.6));
      platform.position.set(0, yAt(S.statement, 0.5) + 1.05, 0); platform.visible = false;
      journey.add(platform);
    }

    // work: floating cards you can pick, around a chrome knot and bursts of colour
    if (S.work && cardDefs.length) {
      const n = cardDefs.length;
      cardDefs.forEach((def, i) => {
        const f = 0.1 + (i / Math.max(1, n - 1)) * 0.78;
        const w = mobile ? Math.min(vw * 0.86, 2.2) : 2.0, h = w * 0.625;
        const m = new THREE.Mesh(roundedPlane(w, h, 0.11), new THREE.MeshBasicMaterial({ map: cardTexture(def, i), transparent: true, opacity: 0.94, side: THREE.DoubleSide }));
        const side = i % 2 ? 1 : -1;
        m.position.set(mobile ? side * 0.12 : (side > 0 ? 0.95 + rnd() * 0.9 : -0.35 + rnd() * 0.5) * (vw / 5.95), yAt(S.work, f) + (rnd() - 0.5) * 0.2, -0.6 - rnd() * 1.2);
        m.rotation.set((rnd() - 0.5) * 0.3, side * (0.2 + rnd() * 0.3) * -1, (rnd() - 0.5) * 0.08);
        m.userData = { card: def.id, base: m.position.clone(), rot: m.rotation.clone(), seed: rnd() * 10, hover: 0 };
        journey.add(m); cards.push(m);
      });
      knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.62, 0.17, 220, 28, 2, 3), chrome);
      knot.position.set(mobile ? 0.9 : vw * 0.18, yAt(S.work, 0.5), -2.6); knot.userData.spin = 0.25; journey.add(knot); drifters.push(knot);
      const bursts = [[0.78, 0.5, 0.95], [0.4, 0.85, 0.9], [0.9, 0.78, 0.45]];
      bursts.forEach((c, k) => { const cx = (k - 1) * 1.6 + (rnd() - 0.5), cy = yAt(S.work, 0.25 + k * 0.25), cz = -1.6 - rnd() * 2; journey.add(pointsCloud(mobile ? 160 : 420, () => { const r = Math.pow(rnd(), 0.5) * 1.3, a = rnd() * 6.283, b = (rnd() - 0.5) * 2.2; return { p: [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7 + b * 0.3, cz + b], c: c }; }, 2.0)); });
      for (let k = 0; k < (mobile ? 5 : 12); k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05 + rnd() * 0.09, 24, 16), chrome); d.position.set((rnd() - 0.5) * vw * 1.1, yAt(S.work, rnd()), -1.5 + rnd() * 2.6); d.userData.spin = 0; d.userData.bob = rnd() * 6; journey.add(d); drifters.push(d); }
    }

    // process: a lit stage — a ring of particles over a reflective floor between chrome pillars
    if (S.process) {
      const cy = yAt(S.process, 0.5), cx = mobile ? 0 : vw * 0.2;
      stageTorus = pointsCloud(mobile ? 700 : 1800, () => { const u = rnd() * 6.283, v = rnd() * 6.283, R = 1.0, r = 0.14 + rnd() * 0.22; const k = rnd(); const c = k < 0.55 ? [0.88, 0.92, 0.96] : k < 0.85 ? [0.66, 0.8, 0.92] : [0.72, 0.55, 0.95]; return { p: [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)], c }; }, 2.2);
      stageTorus.position.set(cx, cy + 0.15, -1.6); stageTorus.rotation.set(0.35, 0, 0.2); journey.add(stageTorus);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 0.5, roughness: 0.6, envMapIntensity: 0.45 })); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, cy - 1.5, -3.2); journey.add(floor);
      for (let k = 0; k < 6; k++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 4.2, 12), chrome); const a = (k / 6) * 6.283; p.position.set(cx + Math.cos(a) * 2.2, cy + 0.6, -1.6 + Math.sin(a) * 1.4); journey.add(p); }
    }

    buildDust();
    built = { L, W: innerWidth };
  }

  /* ---------- sizing ---------- */
  let W = 1, H = 1;
  function size() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    const portrait = camera.aspect < 0.8;
    emblem.scale.setScalar(portrait ? 0.8 : 1); emblem2.scale.setScalar(portrait ? 0.8 : 1);
    const nl = pageLength();
    if (!built.L || Math.abs(nl - built.L) / built.L > 0.08 || Math.abs(W - built.W) > 120) buildJourney();
  }
  let fontsReady = false;
  const fontLoad = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('700 100px "Chakra Petch"'), document.fonts.load('400 24px "Chakra Petch"')]).catch(() => { }) : Promise.resolve();
  Promise.all([fontLoad, shieldReady]).then(() => { fontsReady = true; built.L = 0; size(); });
  size();
  addEventListener('resize', () => size());
  if ('ResizeObserver' in window) new ResizeObserver(() => { const nl = pageLength(); if (built.L && Math.abs(nl - built.L) / built.L > 0.08) size(); }).observe(document.body);

  /* ---------- pointer: parallax, dust push, card picking ---------- */
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let hovered = null; let downAt = null;
  function overUI(t) { return t && t !== canvas && t.closest && t.closest('.ui, .nav, .modal, button, a, input, select, textarea, label'); }
  function pick(cx, cy) {
    if (!cards.length) return null;
    ndc.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1); ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(cards, false)[0]; return hit ? hit.object : null;
  }
  let lastPick = 0;
  addEventListener('pointermove', e => {
    ptr.tx = (e.clientX / W) * 2 - 1; ptr.ty = (e.clientY / H) * 2 - 1;
    const now = performance.now(); if (now - lastPick < 40) return; lastPick = now;
    if (overUI(e.target) || html.classList.contains('modal-open')) { setHover(null); return; }
    setHover(pick(e.clientX, e.clientY));
  }, { passive: true });
  function setHover(o) {
    if (o === hovered) return; hovered = o;
    html.classList.toggle('card-hover', !!o);
    document.dispatchEvent(new CustomEvent('veloure:hover', { detail: { id: o ? o.userData.card : null } }));
  }
  addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY, performance.now()]; }, { passive: true });
  addEventListener('pointerup', e => {
    if (!downAt) return; const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); const dt = performance.now() - downAt[2]; downAt = null;
    if (moved > 8 || dt > 600 || overUI(e.target) || html.classList.contains('modal-open')) return;
    const o = pick(e.clientX, e.clientY); if (o) document.dispatchEvent(new CustomEvent('veloure:open', { detail: { id: o.userData.card } }));
  });

  /* ---------- scroll ---------- */
  let camY = 0, camYT = 0, vel = 0, lastY = 0, glitch = 0.15;
  function onScroll() { camYT = -(scrollY / Math.max(1, H)) * STEP; }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- frame ---------- */
  const clock = new THREE.Clock(); let running = true, readySent = false;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });
  const tmp = new THREE.Vector3();
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    const kp = 1 - Math.exp(-dt * 4.5); ptr.x += (ptr.tx - ptr.x) * kp; ptr.y += (ptr.ty - ptr.y) * kp;
    camY += (camYT - camY) * (reduce ? 1 : 1 - Math.exp(-dt * 6.5));
    vel += ((camY - lastY) / Math.max(dt, 0.001) - vel) * 0.1; lastY = camY;
    const p = -camY / STEP;                                   // viewports travelled
    const speed = Math.min(1, Math.abs(vel) / 6);
    glitch += ((0.12 + speed * 1.2) - glitch) * (1 - Math.exp(-dt * 8));

    // camera: down the ribbon, a dive at the start, pointer parallax, a gentle sway
    const dive = THREE.MathUtils.smoothstep(p, 0.05, 1.0) * (1 - THREE.MathUtils.smoothstep(p, 1.6, 2.6));
    camera.position.x = Math.sin(p * 1.1) * 0.3 + ptr.x * 0.28;
    camera.position.y = camY - ptr.y * 0.16;
    camera.position.z = CAM_Z - dive * 0.9;
    camera.lookAt(camera.position.x * 0.4, camY - 0.08, 0);
    camera.rotation.z = -ptr.x * 0.012;

    // the emblem: hangs at home, then rides along until the statement, spinning like a coin
    const ride = THREE.MathUtils.smoothstep(p, 0.02, 1.0), leave = THREE.MathUtils.smoothstep(p, 1.35, 1.9);
    const ex = THREE.MathUtils.lerp(0, (mobile ? 0.45 : visW() * 0.13), ride);
    const ey = THREE.MathUtils.lerp(EMB_Y, camY + 0.05, ride) - leave * 0.4;
    if (p < 1.9) { emblem.position.set(ex + ptr.x * 0.05, ey, THREE.MathUtils.lerp(0, 0.9, ride) - leave * 0.6); emblem.userData.last = emblem.position.clone(); }
    else if (emblem.userData.last) emblem.position.copy(emblem.userData.last);
    emblem.rotation.y = Math.sin(t * 0.35) * 0.18 + ptr.x * 0.3 + ride * t * 0.9;
    emblem.rotation.x = Math.sin(t * 0.27) * 0.06 - ptr.y * 0.2;
    emblem2.rotation.y = Math.sin(t * 0.3 + 1) * 0.2 + ptr.x * 0.3;
    emblem2.rotation.x = Math.sin(t * 0.22) * 0.06 - ptr.y * 0.2;

    if (platform) platform.visible = p > 0.45 && p < 2.4;

    // text glitch + idle flicker
    for (const tp of textPlanes) { tp.material.uniforms.uTime.value = t; tp.material.uniforms.uGlitch.value = glitch * (0.7 + 0.3 * Math.sin(t * 3.1)); }

    // cards: idle drift, hover lift
    for (const c of cards) {
      const u = c.userData; u.hover += ((hovered === c ? 1 : 0) - u.hover) * (1 - Math.exp(-dt * 9));
      c.position.x = u.base.x + Math.sin(t * 0.33 + u.seed) * 0.06 + ptr.x * 0.05 * (1 + u.seed * 0.05);
      c.position.y = u.base.y + Math.cos(t * 0.27 + u.seed) * 0.05;
      c.position.z = u.base.z + u.hover * 0.35;
      c.rotation.x = u.rot.x + Math.sin(t * 0.21 + u.seed) * 0.03 - ptr.y * 0.05 * u.hover;
      c.rotation.y = u.rot.y * (1 - u.hover * 0.6) + Math.cos(t * 0.19 + u.seed) * 0.03 + ptr.x * 0.08 * u.hover;
      c.material.opacity = 0.94 + u.hover * 0.06;
    }
    for (const d of drifters) { d.rotation.y += dt * (0.18 + (d.userData.spin || 0)); d.rotation.x += dt * 0.07; if (d.userData.bob !== undefined) d.position.y += Math.sin(t * 0.5 + d.userData.bob) * 0.0012; }
    if (stageTorus) stageTorus.rotation.z += dt * 0.12;

    // dust: pointer in world space at z=0 plane; focus follows the camera
    const vw = visW(); tmp.set(ptr.x * vw / 2 + camera.position.x, camY - ptr.y * VIS_H / 2, 0);
    dustMat.uniforms.uPointer.value.copy(tmp); dustMat.uniforms.uTime.value = t; dustMat.uniforms.uFocus.value = camera.position.z - 0.2;

    renderer.render(scene, camera);
    if (!readySent && fontsReady) { readySent = true; document.dispatchEvent(new CustomEvent('world:ready')); }
    window.__worldState = { p, speed };
  }
  loop();
  setTimeout(() => { if (!readySent) { readySent = true; document.dispatchEvent(new CustomEvent('world:ready')); } }, 6000);
})();
