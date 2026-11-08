/* ==========================================================================
   world.js — the VELOURÉ world. One continuous 3D scene behind the whole page,
   travelled by scrolling (Active Theory posture): a chrome ring holding the
   shield, two chrome ribbons that loop and cross their way down the journey,
   floating chrome slabs and droplets at each station, and a volumetric dust
   field with depth-of-field bokeh that reacts to the pointer. three.js r170,
   self-hosted (vendor/). Native scroll stays native — the camera eases after it.
   Fallback (no WebGL / reduced motion): CSS gradient, static mark.
   ========================================================================== */
import * as THREE from './vendor/three.module.min.js';

(function init() {
  'use strict';
  const canvas = document.getElementById('world');
  if (!canvas) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 820px)').matches || /Mobi|Android/i.test(navigator.userAgent);
  const fail = (why) => { document.documentElement.classList.add('no-world'); canvas.remove(); window.dispatchEvent(new CustomEvent('world:ready', { detail: { ok: false, why } })); };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: 'high-performance', stencil: false });
  } catch (e) { return fail('webgl'); }
  if (!renderer.getContext()) return fail('webgl');

  const DPR = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(DPR);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  /* ---------- constants ---------- */
  const FOV = 38, CAM_Z = 5.4;
  const VIS_H = 2 * CAM_Z * Math.tan(FOV / 2 * Math.PI / 180);   // world units visible at z=0 (~3.72)
  const STEP = VIS_H;                                             // one viewport scrolled = one visible-height travelled
  const BLUE = new THREE.Color('#A8CDE0');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  camera.position.set(0, 0, CAM_Z);

  /* ---------- background: steel-blue haze → velvet black ---------- */
  function gradientTexture() {
    const c = document.createElement('canvas'); c.width = 16; c.height = 1024;
    const g = c.getContext('2d');
    const v = g.createLinearGradient(0, 0, 0, 1024);
    v.addColorStop(0.00, '#2f5468');
    v.addColorStop(0.14, '#1a2f3c');
    v.addColorStop(0.42, '#0c0f13');
    v.addColorStop(1.00, '#040506');
    g.fillStyle = v; g.fillRect(0, 0, 16, 1024);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  scene.background = gradientTexture();

  /* ---------- environment: a procedural studio for the chrome ---------- */
  function studioEnvironment() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const v = g.createLinearGradient(0, 0, 0, 512);
    v.addColorStop(0, '#dfeaf2'); v.addColorStop(0.35, '#55646f'); v.addColorStop(0.55, '#1c2126'); v.addColorStop(1, '#05060a');
    g.fillStyle = v; g.fillRect(0, 0, 1024, 512);
    const box = (x, y, w, h, color, a) => {
      const r = g.createLinearGradient(0, y, 0, y + h);
      r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, color); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = a; g.fillStyle = r; g.fillRect(x, y, w, h); g.globalAlpha = 1;
    };
    box(0, 70, 1024, 38, '#ffffff', 0.95);          // key softbox, full width
    box(120, 180, 300, 22, '#ffffff', 0.7);
    box(600, 210, 260, 16, '#cfe6f2', 0.8);
    box(300, 300, 420, 12, '#9ad2ff', 0.55);        // cool rim
    box(760, 330, 200, 10, '#ffb3c7', 0.5);         // warm rim → iridescent flashes
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(renderer);
    const env = pm.fromEquirectangular(t).texture;
    t.dispose(); pm.dispose();
    return env;
  }
  scene.environment = studioEnvironment();

  const chrome = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 1, roughness: 0.16, envMapIntensity: 1.35,
    iridescence: 0.55, iridescenceIOR: 1.45, iridescenceThicknessRange: [120, 460], clearcoat: 0.35, clearcoatRoughness: 0.2
  });
  const chromeDark = chrome.clone(); chromeDark.roughness = 0.3; chromeDark.envMapIntensity = 0.9; chromeDark.color = new THREE.Color('#9aa6b2');

  /* ---------- the emblem: chrome ring + shield ---------- */
  const emblem = new THREE.Group();
  const RING_R = mobile ? 0.44 : 0.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.026, 36, 200), chrome);
  emblem.add(ring);
  const shieldMat = new THREE.MeshStandardMaterial({ transparent: true, metalness: 0.55, roughness: 0.42, envMapIntensity: 1.3, alphaTest: 0.02 });
  const shield = new THREE.Mesh(new THREE.PlaneGeometry(RING_R * 1.18, RING_R * 1.18 * 1.1), shieldMat);
  shield.position.z = 0.01; shield.visible = false;
  emblem.add(shield);
  let emblemY = -0.22;
  emblem.position.set(0, emblemY, 0);
  scene.add(emblem);

  const texReady = new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 1126;
      c.getContext('2d').drawImage(img, 0, 0, 1024, 1126);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      shieldMat.map = t; shieldMat.needsUpdate = true; shield.visible = true; res(true);
    };
    img.onerror = () => res(false);
    img.src = 'assets/mark.svg';
  });

  /* ---------- journey geometry (depends on page height) ---------- */
  const journey = new THREE.Group(); scene.add(journey);
  let L = 10;                      // world length of the journey (world units below y=0)
  let built = { L: 0 };
  function pageLength() { return Math.max(1, (document.documentElement.scrollHeight - innerHeight) / Math.max(1, innerHeight)) * STEP; }

  /* A flat chrome ribbon: leaves the ring at its side, drops, crosses its twin
     under the emblem, loops out, then weaves down the whole journey, twisting
     slowly so the light runs along it. Built as a strip on the curve's frames. */
  const ribbonMat = chrome.clone(); ribbonMat.side = THREE.DoubleSide;
  function ribbon(side, len) {
    const s = side, R = RING_R, pts = [];
    pts.push(new THREE.Vector3(s * R * 0.98, -0.12, 0.0));
    pts.push(new THREE.Vector3(s * (R + 0.42), -0.78, 0.10 * s));
    pts.push(new THREE.Vector3(s * 0.12, -1.55, 0.09 * s));        // the crossing (twins pass at ±z)
    const n = Math.ceil((len + 4) / 1.45);
    for (let k = 0; k <= n; k++) {
      const y = -2.45 - k * 1.45;
      const amp = (R + 0.5) + Math.min(1.25, k * 0.075);
      const x = -s * amp * Math.cos(k * Math.PI / 3.6);
      const z = 0.18 * Math.sin(k * 0.9 + s) - 0.25 * Math.min(1, k / 6);
      pts.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.55);
    const M = Math.min(1600, 60 + n * 44);
    const fr = curve.computeFrenetFrames(M, false);
    const pos = new Float32Array((M + 1) * 6), nor = new Float32Array((M + 1) * 6), uv = new Float32Array((M + 1) * 4);
    const idx = [];
    const P = new THREE.Vector3(), S = new THREE.Vector3(), Nn = new THREE.Vector3();
    for (let i = 0; i <= M; i++) {
      const t = i / M;
      curve.getPointAt(t, P);
      const th = t * Math.PI * 2 * (2.2 + 0.4 * s) + s * 0.6;                 // slow twist along the length
      S.copy(fr.binormals[i]).multiplyScalar(Math.cos(th)).addScaledVector(fr.normals[i], Math.sin(th));
      Nn.crossVectors(fr.tangents[i], S).normalize();
      const w = (0.085 - 0.04 * Math.min(1, t * 1.6)) * 0.5;                 // tapers a little as it goes
      pos.set([P.x - S.x * w, P.y - S.y * w, P.z - S.z * w, P.x + S.x * w, P.y + S.y * w, P.z + S.z * w], i * 6);
      nor.set([Nn.x, Nn.y, Nn.z, Nn.x, Nn.y, Nn.z], i * 6);
      uv.set([0, t, 1, t], i * 4);
      if (i < M) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, ribbonMat);
    m.position.y = -0.22; // follow the emblem
    return m;
  }

  function rounded(w, h, r) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return new THREE.ShapeGeometry(s, 6);
  }

  let rand = mulberry(7);
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const drifters = [];   // slabs + droplets with their own slow motion
  function buildJourney() {
    while (journey.children.length) { const o = journey.children.pop(); o.geometry && o.geometry.dispose(); }
    drifters.length = 0;
    rand = mulberry(7);
    journey.add(ribbon(1, L), ribbon(-1, L));
    // stations: one per viewport of travel after the hero
    const stations = Math.max(2, Math.round(L / STEP));
    const slabGeo = rounded(0.9, 0.56, 0.08), slabGeoS = rounded(0.5, 0.32, 0.05);
    for (let s = 1; s <= stations; s++) {
      const baseY = -s * STEP;
      const count = mobile ? 1 : 2;
      for (let k = 0; k < count; k++) {
        const slab = new THREE.Mesh(rand() < 0.5 ? slabGeo : slabGeoS, rand() < 0.5 ? chrome : chromeDark);
        const sx = (k === 0 ? -1 : 1) * (1.4 + rand() * 1.4) * (rand() < 0.5 ? 1 : 0.8);
        slab.position.set(sx, baseY + (rand() - 0.5) * 2.2, -1.2 - rand() * 2.6);
        slab.rotation.set((rand() - 0.5) * 0.9, (rand() - 0.5) * 1.4, (rand() - 0.5) * 0.5);
        slab.userData = { r: [(rand() - 0.5) * 0.18, (rand() - 0.5) * 0.22, (rand() - 0.5) * 0.08], bob: rand() * 6.28, amp: 0.08 + rand() * 0.1 };
        journey.add(slab); drifters.push(slab);
      }
      const drops = mobile ? 2 : 4;
      for (let k = 0; k < drops; k++) {
        const r = 0.035 + rand() * 0.075;
        const d = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), chrome);
        d.position.set((rand() - 0.5) * 5.5, baseY + (rand() - 0.5) * 3.4, -2.5 + rand() * 3.4);
        d.userData = { r: [0, 0, 0], bob: rand() * 6.28, amp: 0.1 + rand() * 0.16 };
        journey.add(d); drifters.push(d);
      }
    }
    built.L = L;
  }

  /* ---------- dust: a volumetric point field with bokeh ---------- */
  const COUNT = mobile ? 900 : 2600;
  let dust = null;
  const dustUniforms = {
    uTime: { value: 0 }, uPR: { value: DPR }, uFocus: { value: CAM_Z }, uPointer: { value: new THREE.Vector3(0, 0, 0) }, uMax: { value: 46 * DPR }
  };
  function buildDust() {
    if (dust) { journey.remove(dust); dust.geometry.dispose(); }
    const pos = new Float32Array(COUNT * 3), size = new Float32Array(COUNT), seed = new Float32Array(COUNT), col = new Float32Array(COUNT * 3);
    const palette = [[0.86, 0.9, 0.95], [0.66, 0.8, 0.88], [0.85, 0.74, 0.46], [0.95, 0.96, 0.98]];
    const r2 = mulberry(21);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (r2() - 0.5) * 16;
      pos[i * 3 + 1] = 4 - r2() * (L + 10);
      pos[i * 3 + 2] = 3.2 - r2() * 12;
      size[i] = 1.2 + Math.pow(r2(), 2.2) * 3.2;
      seed[i] = r2();
      const c = palette[r2() < 0.18 ? 2 : (r2() < 0.35 ? 1 : (r2() < 0.5 ? 3 : 0))];
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: dustUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize; attribute float aSeed; attribute vec3 aColor;
        uniform float uTime, uPR, uFocus, uMax; uniform vec3 uPointer;
        varying float vBlur, vAlpha; varying vec3 vColor;
        void main(){
          vec3 p = position;
          p.x += sin(uTime*0.11 + aSeed*6.2831)*0.28;
          p.y += cos(uTime*0.08 + aSeed*4.1)*0.2;
          p.z += sin(uTime*0.07 + aSeed*9.3)*0.22;
          vec2 d = p.xy - uPointer.xy;
          float dist = length(d);
          p.xy += (d / max(dist, 0.001)) * smoothstep(1.4, 0.0, dist) * 0.42 * (1.0 - smoothstep(0.0, 3.0, abs(p.z)));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float depth = -mv.z;
          float blur = clamp(abs(depth - uFocus) / 4.2, 0.0, 1.0);
          vBlur = blur; vColor = aColor;
          vAlpha = (1.0 - blur*0.72) * smoothstep(0.3, 1.6, depth);
          float s = aSize * (1.0 + blur*2.4) * uPR * (11.0 / max(depth, 0.5));
          gl_PointSize = min(s, uMax);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vBlur, vAlpha; varying vec3 vColor;
        void main(){
          vec2 uv = gl_PointCoord - 0.5; float r = length(uv) * 2.0; if (r > 1.0) discard;
          float core = smoothstep(1.0, 0.0, r);
          float rim = smoothstep(0.62, 0.98, r) * smoothstep(1.0, 0.9, r);
          float a = mix(core, 0.22*core + rim*0.85 + 0.16, vBlur);
          gl_FragColor = vec4(vColor, a * vAlpha * 0.62);
        }`
    });
    dust = new THREE.Points(g, m); dust.frustumCulled = false;
    journey.add(dust);
  }

  /* ---------- sizing ---------- */
  let W = 1, H = 1;
  function size() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    // portrait phones: the emblem sits higher and smaller so the identity block below it stays clear
    const portrait = camera.aspect < 0.8;
    emblemY = portrait ? 0.72 : -0.22;
    emblem.scale.setScalar(portrait ? 0.74 : 1);
    journey.position.y = emblemY + 0.22;
    const nl = pageLength();
    if (Math.abs(nl - built.L) / Math.max(1, built.L) > 0.12 || !built.L) { L = nl; buildJourney(); buildDust(); }
  }
  size();
  addEventListener('resize', size);
  if ('ResizeObserver' in window) new ResizeObserver(() => { const nl = pageLength(); if (Math.abs(nl - built.L) / built.L > 0.12) size(); }).observe(document.body);

  /* ---------- pointer (shared with ui.js) ---------- */
  const ptr = window.__ptr || (window.__ptr = { x: 0, y: 0, tx: 0, ty: 0 });

  /* ---------- loop ---------- */
  const clock = new THREE.Clock();
  let camY = 0, camYT = 0, running = true, idleFrames = 0;
  const look = new THREE.Vector3();
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    const vp = scrollY / Math.max(1, H);                 // viewports scrolled
    camYT = -vp * STEP;
    camY += (camYT - camY) * (reduce ? 1 : Math.min(1, dt * 6.5));
    ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 5); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 5);
    const dive = Math.min(1, vp);                         // first viewport: the camera flies in
    camera.position.set(ptr.x * 0.28 + Math.sin(t * 0.21) * 0.06, camY - ptr.y * 0.16 + Math.sin(t * 0.17) * 0.05, CAM_Z - dive * 1.1 + Math.sin(t * 0.13) * 0.04);
    look.set(ptr.x * 0.12, camY - 0.08 - ptr.y * 0.06, -2);
    camera.lookAt(look);
    camera.rotation.z = Math.sin(t * 0.1) * 0.004 + ptr.x * -0.01;
    // emblem: idle sway + pointer tilt, drifting back as we leave
    emblem.rotation.y = Math.sin(t * 0.35) * 0.18 + ptr.x * 0.35;
    emblem.rotation.x = Math.sin(t * 0.27) * 0.06 - ptr.y * 0.22;
    emblem.position.z = -dive * 0.6; emblem.position.y = emblemY;
    ring.rotation.z = t * 0.12;
    for (let i = 0; i < drifters.length; i++) {
      const o = drifters[i], u = o.userData;
      o.rotation.x += u.r[0] * dt; o.rotation.y += u.r[1] * dt; o.rotation.z += u.r[2] * dt;
      o.position.x += Math.sin(t * 0.3 + u.bob) * u.amp * dt;
      o.position.y += Math.cos(t * 0.26 + u.bob) * u.amp * dt;
    }
    dustUniforms.uTime.value = t;
    dustUniforms.uFocus.value = CAM_Z - dive * 1.1 + 0.4;
    const visW = VIS_H * camera.aspect;
    dustUniforms.uPointer.value.set(ptr.x * visW * 0.5, camY - ptr.y * VIS_H * 0.5, 0);
    renderer.render(scene, camera);
  }
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) { clock.getDelta(); frame(); } });
  addEventListener('pointermove', (e) => { ptr.tx = (e.clientX / W) * 2 - 1; ptr.ty = (e.clientY / H) * 2 - 1; }, { passive: true });
  addEventListener('pointerleave', () => { ptr.tx = 0; ptr.ty = 0; });

  texReady.then(() => {
    renderer.compile(scene, camera);
    frame();
    document.documentElement.classList.add('world-on');
    window.dispatchEvent(new CustomEvent('world:ready', { detail: { ok: true } }));
  });
})();
