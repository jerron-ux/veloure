/* ==========================================================================
   shield.js — the VELOURÉ shield as a real 3D object. Raw WebGL1, no deps.
   Geometry: the logo outline extruded into a bevelled chrome rim, a groove,
   a glossy domed navy face and a brushed-silver V decal. Shading: procedural
   studio environment (fake reflections), key light, fresnel, a travelling
   light sweep. Idle sway + mouse parallax. Pauses when offscreen or hidden.
   Fallback (no WebGL / reduced motion): the static SVG mark.
   ========================================================================== */
(function () {
  'use strict';
  var host = document.getElementById('shield'); if (!host) return;
  var canvas = host.querySelector('canvas');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null;
  try { gl = !reduce && canvas && canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
  if (!gl) { host.classList.add('fallback'); return; }

  /* ---------- outline of the mark (SVG units, 100 x 110 box) ---------- */
  var SEG = [
    ['C', [50, 3], [64, 7.2], [80, 9.8], [96, 10.6]],
    ['L', [96, 10.6], [96, 53]],
    ['C', [96, 53], [96, 78.5], [75.5, 97.5], [50, 107.5]],
    ['C', [50, 107.5], [24.5, 97.5], [4, 78.5], [4, 53]],
    ['L', [4, 53], [4, 10.6]],
    ['C', [4, 10.6], [20, 9.8], [36, 7.2], [50, 3]]
  ];
  function sampleOutline(n) {
    var dense = [];
    SEG.forEach(function (s) {
      for (var i = 0; i < 48; i++) {
        var t = i / 48, mt = 1 - t, p;
        if (s[0] === 'L') p = [s[1][0] + (s[2][0] - s[1][0]) * t, s[1][1] + (s[2][1] - s[1][1]) * t];
        else p = [mt * mt * mt * s[1][0] + 3 * mt * mt * t * s[2][0] + 3 * mt * t * t * s[3][0] + t * t * t * s[4][0],
                  mt * mt * mt * s[1][1] + 3 * mt * mt * t * s[2][1] + 3 * mt * t * t * s[3][1] + t * t * t * s[4][1]];
        dense.push(p);
      }
    });
    var L = [0], m = dense.length;
    for (var i = 1; i <= m; i++) { var a = dense[i - 1], b = dense[i % m]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    var total = L[m], out = [];
    for (var k = 0; k < n; k++) {
      var d = total * k / n, j = 0; while (L[j + 1] < d) j++;
      var a2 = dense[j], b2 = dense[(j + 1) % m], f = (d - L[j]) / (L[j + 1] - L[j]);
      out.push([a2[0] + (b2[0] - a2[0]) * f, a2[1] + (b2[1] - a2[1]) * f]);
    }
    return out;
  }

  /* ---------- mesh ---------- */
  var CX = 50, CY = 56, K = 52.25, N = 144, ring = sampleOutline(N);
  var pos = [], nrm = [], uv = [], mat = [], idx = [];
  function pushV(x, y, z, m) { pos.push((x - CX) / K, -(y - CY) / K, z); nrm.push(0, 0, 0); uv.push(x / 100, y / 110); mat.push(m); return pos.length / 3 - 1; }
  function ringAt(inset, z, m) { var r = []; ring.forEach(function (q) { r.push(pushV(CX + (q[0] - CX) * (1 - inset), CY + (q[1] - CY) * (1 - inset), z, m)); }); return r; }
  // rim cross-section: outer wall → chamfer → flat → raised bead → groove → face edge   [inset, z, material]
  var PROF = [[0, -0.05, 0], [0.008, 0.03, 0], [0.03, 0.06, 0], [0.05, 0.062, 0], [0.07, 0.088, 0], [0.09, 0.088, 0], [0.108, 0.05, 0], [0.118, 0.034, 1], [0.126, 0.03, 1], [0.134, 0.046, 2]];
  var rings = PROF.map(function (p) { return ringAt(p[0], p[1], p[2]); });
  function faceZ(inset) { var r = (1 - inset) / (1 - 0.134); return 0.046 + 0.09 * Math.sqrt(Math.max(0, 1 - r * r)); }
  [0.24, 0.38, 0.54, 0.7, 0.86].forEach(function (ins) { rings.push(ringAt(ins, faceZ(ins), 2)); });
  var centre = pushV(CX, CY, faceZ(1), 2);
  for (var a = 0; a < rings.length - 1; a++) {
    var r0 = rings[a], r1 = rings[a + 1];
    for (var i = 0; i < N; i++) { var j = (i + 1) % N; idx.push(r0[i], r1[i], r1[j], r0[i], r1[j], r0[j]); }
  }
  var last = rings[rings.length - 1];
  for (var i2 = 0; i2 < N; i2++) idx.push(last[i2], centre, last[(i2 + 1) % N]);
  var frontTris = idx.length;
  var back = ringAt(0, -0.05, 3), bc = pushV(CX, CY, -0.05, 3);
  for (var i3 = 0; i3 < N; i3++) idx.push(back[(i3 + 1) % N], bc, back[i3]);

  // normals: accumulate oriented face normals (front geometry), flat -z for the back cap
  for (var t = 0; t < frontTris; t += 3) {
    var A = idx[t] * 3, B = idx[t + 1] * 3, C = idx[t + 2] * 3;
    var ux = pos[B] - pos[A], uy = pos[B + 1] - pos[A + 1], uz = pos[B + 2] - pos[A + 2];
    var vx = pos[C] - pos[A], vy = pos[C + 1] - pos[A + 1], vz = pos[C + 2] - pos[A + 2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    var cx = (pos[A] + pos[B] + pos[C]) / 3, cy = (pos[A + 1] + pos[B + 1] + pos[C + 1]) / 3, cz = (pos[A + 2] + pos[B + 2] + pos[C + 2]) / 3;
    if (nx * cx + ny * cy + nz * (cz + 0.6) < 0) { nx = -nx; ny = -ny; nz = -nz; } // orient away from a point behind the centre
    [A, B, C].forEach(function (v) { nrm[v] += nx; nrm[v + 1] += ny; nrm[v + 2] += nz; });
  }
  for (var v = 0; v < nrm.length; v += 3) {
    var l = Math.hypot(nrm[v], nrm[v + 1], nrm[v + 2]) || 1;
    if (mat[v / 3] === 3) { nrm[v] = 0; nrm[v + 1] = 0; nrm[v + 2] = -1; } else { nrm[v] /= l; nrm[v + 1] /= l; nrm[v + 2] /= l; }
  }

  /* ---------- the V decal (brushed silver + navy shadow), drawn once ---------- */
  function decal() {
    var S = 1024, c = document.createElement('canvas'); c.width = S; c.height = S;
    var g = c.getContext('2d'); g.scale(S / 100, S / 110);
    function V(ox, oy) {
      g.beginPath(); g.moveTo(20 + ox, 27 + oy); g.lineTo(35.5 + ox, 27 + oy); g.lineTo(55.9 + ox, 68.5 + oy); g.lineTo(72.5 + ox, 27 + oy); g.lineTo(78 + ox, 27 + oy); g.lineTo(52 + ox, 92 + oy); g.closePath();
      g.moveTo(15.5 + ox, 22.5 + oy); g.lineTo(40 + ox, 22.5 + oy); g.lineTo(35.5 + ox, 27 + oy); g.lineTo(20 + ox, 27 + oy); g.closePath();
      g.moveTo(65.5 + ox, 22.5 + oy); g.lineTo(83 + ox, 22.5 + oy); g.lineTo(78 + ox, 27 + oy); g.lineTo(72.5 + ox, 27 + oy); g.closePath();
      g.fill();
    }
    g.fillStyle = 'rgba(4,16,30,.92)'; V(1.6, 2.2);
    var grad = g.createLinearGradient(0, 22, 20, 92);
    grad.addColorStop(0, '#FFFFFF'); grad.addColorStop(.3, '#E6E9EC'); grad.addColorStop(.55, '#A9AFB7'); grad.addColorStop(.78, '#DCDFE3'); grad.addColorStop(1, '#7F858E');
    g.fillStyle = grad; V(0, 0);
    return c;
  }

  /* ---------- GL setup ---------- */
  var VS = 'attribute vec3 aPos;attribute vec3 aNrm;attribute vec2 aUv;attribute float aMat;' +
    'uniform mat4 uProj,uView,uModel;varying vec3 vPos,vNrm;varying vec2 vUv;varying float vMat;' +
    'void main(){vec4 wp=uModel*vec4(aPos,1.0);vPos=wp.xyz;vNrm=normalize((uModel*vec4(aNrm,0.0)).xyz);vUv=aUv;vMat=aMat;gl_Position=uProj*uView*wp;}';
  var FS = 'precision mediump float;varying vec3 vPos,vNrm;varying vec2 vUv;varying float vMat;' +
    'uniform vec3 uCam;uniform float uSweep;uniform sampler2D uDecal;' +
    'float sb(vec3 r,vec3 d,float w){return pow(max(dot(r,normalize(d)),0.0),w);}' +
    'vec3 env(vec3 r){' +
    '  float up=smoothstep(-0.3,0.7,r.y);' +
    '  vec3 c=mix(vec3(0.03,0.035,0.05),vec3(1.5,1.56,1.65),up);' +
    '  c*=1.0-0.85*exp(-pow(r.y*7.0,2.0));' +                                  /* dark horizon stripe */
    '  c+=vec3(1.0,0.98,0.96)*sb(r,vec3(-0.6,0.7,0.5),28.0)*2.4;' +            /* key softbox, upper left */
    '  c+=vec3(0.62,0.78,0.90)*sb(r,vec3(0.85,0.05,0.45),22.0)*1.0;' +         /* cool fill, right */
    '  c+=vec3(0.55,0.75,0.95)*sb(r,vec3(0.2,-0.9,0.3),10.0)*0.5;' +           /* blue floor bounce */
    '  vec3 sd=normalize(vec3(cos(uSweep),0.45,sin(uSweep)));' +
    '  c+=vec3(1.0)*sb(r,sd,260.0)*2.5;' +                                      /* travelling sweep */
    '  return c;}' +
    'void main(){' +
    '  vec3 N=normalize(vNrm);vec3 V=normalize(uCam-vPos);vec3 R=reflect(-V,N);' +
    '  float fres=pow(1.0-max(dot(N,V),0.0),3.0);' +
    '  vec3 L=normalize(vec3(-0.5,0.8,0.9));vec3 H=normalize(L+V);float spec=pow(max(dot(N,H),0.0),120.0);' +
    '  vec3 col;' +
    '  if(vMat<0.5){vec3 e=env(R);col=e*vec3(0.92,0.94,0.98)*(0.8+0.3*fres)+spec*0.8;}' +
    '  else if(vMat<1.5){col=vec3(0.02,0.028,0.04)+env(R)*0.03;}' +
    '  else if(vMat<2.5){' +
    '    vec3 Lk=normalize(vec3(-0.45,0.75,0.6));' +
    '    float broad=pow(max(dot(R,Lk),0.0),10.0);' +                          /* soft gloss bloom */
    '    vec2 d2=vUv-vec2(0.72,0.24);float sheenUR=exp(-dot(d2,d2)*9.0);' +     /* the logo\'s cyan sheen, upper right */
    '    vec3 base=vec3(0.012,0.05,0.10)*mix(1.0,0.45,smoothstep(0.4,1.0,vUv.y));' +
    '    col=base+sheenUR*vec3(0.16,0.42,0.62)*0.9+broad*vec3(0.5,0.75,0.95)*0.55' +
    '       +env(R)*0.12*(0.35+fres)+spec*vec3(0.85,0.93,1.0)*1.2+fres*vec3(0.42,0.63,0.78)*0.55;' +
    '    vec4 d=texture2D(uDecal,vUv);' +
    '    if(d.a>0.002){vec3 dc=d.rgb/d.a;vec3 metal=dc*(0.3+0.75*env(R).g)+spec*1.1;col=mix(col,metal,d.a);}' +
    '  } else {col=vec3(0.02,0.025,0.035);}' +
    '  col=vec3(1.0)-exp(-col*1.25);col=pow(col,vec3(1.0/1.8));' +
    '  gl_FragColor=vec4(col,1.0);}';
  function shader(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { throw new Error(gl.getShaderInfoLog(s)); } return s; }
  var prog;
  try {
    prog = gl.createProgram(); gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { host.classList.add('fallback'); try { console.warn('[shield] ' + e.message); } catch (e2) {} return; }
  gl.useProgram(prog);
  function buf(data, name, size) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, name); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
  }
  buf(pos, 'aPos', 3); buf(nrm, 'aNrm', 3); buf(uv, 'aUv', 2); buf(mat, 'aMat', 1);
  var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, decal());
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  var U = {}; ['uProj', 'uView', 'uModel', 'uCam', 'uSweep', 'uDecal'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform1i(U.uDecal, 0);
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0, 0, 0, 0);

  /* ---------- matrices ---------- */
  function persp(fov, asp, n, f) { var t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; }
  function mul(a, b) { var o = new Array(16); for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; }
  function rotX(r) { var c = Math.cos(r), s = Math.sin(r); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
  function rotY(r) { var c = Math.cos(r), s = Math.sin(r); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
  function rotZ(r) { var c = Math.cos(r), s = Math.sin(r); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
  function scl(s) { return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]; }
  function trans(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; }

  /* ---------- sizing ---------- */
  var phone = matchMedia('(max-width: 820px)').matches, dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2), W = 1, H = 1;
  function resize() {
    var r = host.getBoundingClientRect(); W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);

  /* ---------- interaction ---------- */
  var mx = 0, my = 0, tx = 0, ty = 0;
  if (!phone) window.addEventListener('pointermove', function (e) { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  var running = true, visible = true;
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && !running) loop(); }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !running) loop(); });

  var CAM = [0, 0, 5.2], t0 = performance.now(), shown = false;
  function ease(x) { return 1 - Math.pow(1 - x, 3); }
  function frame(now) {
    var time = (now - t0) / 1000, intro = ease(Math.min(1, time / 1.8));
    mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
    var yaw = (1 - intro) * -1.1 + Math.sin(time * 0.35) * 0.2 + mx * 0.3;
    var pitch = -0.08 + Math.sin(time * 0.23) * 0.05 + my * 0.16;
    var roll = Math.sin(time * 0.17) * 0.015;
    var s = 0.78 + 0.22 * intro;
    var model = mul(trans(0, 0, 0), mul(rotY(yaw), mul(rotX(pitch), mul(rotZ(roll), scl(s)))));
    gl.uniformMatrix4fv(U.uModel, false, model);
    gl.uniformMatrix4fv(U.uView, false, trans(-CAM[0], -CAM[1], -CAM[2]));
    gl.uniformMatrix4fv(U.uProj, false, persp(0.42, W / H, 0.1, 20));
    gl.uniform3fv(U.uCam, CAM);
    gl.uniform1f(U.uSweep, 1.2 + time * 0.45);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    if (!shown) { shown = true; host.classList.add('on'); }
  }
  function loop() {
    if (document.hidden || !visible) { running = false; return; }
    running = true; frame(performance.now()); requestAnimationFrame(loop);
  }
  loop();
})();
