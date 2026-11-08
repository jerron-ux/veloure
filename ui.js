/* ==========================================================================
   ui.js — the interface layer over the world: loader with counter, pointer
   cursor, the pill nav's live line, sound (a generated ambient — no files),
   scroll cue, and the depth drift of the panels. No deps.
   ========================================================================== */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var ptr = window.__ptr || (window.__ptr = { x: 0, y: 0, tx: 0, ty: 0 });

  /* ---------- loader: counts while the world compiles, min 900ms ---------- */
  var loader = document.getElementById('loader'), num = loader && loader.querySelector('.n');
  var t0 = performance.now(), worldDone = false, shown = 0, finished = false;
  function finish() {
    if (finished) return; finished = true;
    if (num) num.textContent = '100';
    document.documentElement.classList.add('loaded');
    setTimeout(function () { loader && loader.remove(); }, 1100);
  }
  function tickLoader() {
    if (finished) return;
    var el = performance.now() - t0;
    var cap = worldDone ? 100 : Math.min(92, el / 24);         // crawls to 92 until the world says ready
    shown += (cap - shown) * 0.12;
    if (num) num.textContent = String(Math.round(shown)).padStart(2, '0');
    if (worldDone && el > (reduce ? 0 : 900) && shown > 99) return finish();
    requestAnimationFrame(tickLoader);
  }
  addEventListener('world:ready', function () { worldDone = true; });
  setTimeout(function () { worldDone = true; }, 6000);           // never trap the visitor
  if (loader) requestAnimationFrame(tickLoader); else document.documentElement.classList.add('loaded');

  /* ---------- cursor: dot + ring, magnetic on controls ---------- */
  var cur = document.getElementById('cursor');
  if (cur && fine && !reduce) {
    document.documentElement.classList.add('has-cursor');
    var cx = innerWidth / 2, cy = innerHeight / 2, rx = cx, ry = cy, down = false, hot = null;
    addEventListener('pointermove', function (e) { cx = e.clientX; cy = e.clientY; }, { passive: true });
    addEventListener('pointerdown', function () { down = true; }); addEventListener('pointerup', function () { down = false; });
    document.addEventListener('pointerover', function (e) { hot = e.target.closest('a,button,.opt,.day,.slot,.tab,.check,input,select,textarea,label'); });
    (function loop() {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      cur.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      cur.classList.toggle('hot', !!hot); cur.classList.toggle('down', down);
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- pill nav: the line between items reacts to scroll velocity ---------- */
  var pill = document.getElementById('pill');
  var lastY = scrollY, vel = 0, wave = 0;
  addEventListener('scroll', function () { vel += Math.abs(scrollY - lastY); lastY = scrollY; }, { passive: true });
  if (pill && !reduce) (function pulse() {
    vel *= 0.86; wave += 0.18 + Math.min(0.9, vel / 300);
    pill.style.setProperty('--amp', Math.min(1, vel / 120).toFixed(3));
    pill.style.setProperty('--ph', (wave % 6.2832).toFixed(3));
    requestAnimationFrame(pulse);
  })();

  /* ---------- scroll cue + hero fade ---------- */
  var cue = document.getElementById('scrollCue'), heroId = document.querySelector('.hero-id');
  function onScroll() {
    var p = Math.min(1, scrollY / (innerHeight * 0.6));
    if (cue) cue.style.opacity = String(1 - p);
    if (heroId) { heroId.style.opacity = String(1 - p); heroId.style.transform = 'translate3d(0,' + (-p * 60).toFixed(1) + 'px,0)'; }
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- panels drift in depth as they pass the viewport centre ---------- */
  var floats = [].slice.call(document.querySelectorAll('.float'));
  if (floats.length && !reduce) (function drift() {
    var mid = innerHeight / 2;
    for (var i = 0; i < floats.length; i++) {
      var el = floats[i], r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      var d = ((r.top + r.height / 2) - mid) / innerHeight;    // -0.5 .. 0.5 around centre
      var k = +(el.getAttribute('data-depth') || 1);
      el.style.transform = 'translate3d(' + (ptr.x * -8 * k).toFixed(1) + 'px,' + (d * 46 * k).toFixed(1) + 'px,0) rotateX(' + (d * -3.2 * k).toFixed(2) + 'deg) rotateY(' + (ptr.x * 2.2 * k).toFixed(2) + 'deg)';
    }
    requestAnimationFrame(drift);
  })();

  /* ---------- sound: a generated ambient, off until asked ---------- */
  var sndBtn = document.getElementById('sndBtn'), player = document.getElementById('player'), pName = player && player.querySelector('.pn');
  var AC = null, master = null, nodes = [], on = false, preset = 0;
  var PRESETS = [
    { name: 'VELVET  --  01', root: 55, chord: [1, 1.5, 2, 2.997, 4.5], cutoff: 520, rate: 0.07 },
    { name: 'CHROME  --  02', root: 65.4, chord: [1, 1.498, 2.52, 3, 4], cutoff: 760, rate: 0.11 },
    { name: 'DUST  --  03', root: 49, chord: [1, 2, 2.4, 3.6, 4.8], cutoff: 420, rate: 0.05 }
  ];
  function stopVoices(fade) {
    nodes.forEach(function (n) { try { n.g.gain.setTargetAtTime(0, AC.currentTime, fade); n.o.stop(AC.currentTime + fade * 6); } catch (e) {} });
    nodes = [];
  }
  function startVoices() {
    var p = PRESETS[preset];
    var filt = AC.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = p.cutoff; filt.Q.value = 0.7; filt.connect(master);
    var lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = p.rate; lg.gain.value = p.cutoff * 0.45; lfo.connect(lg); lg.connect(filt.frequency); lfo.start();
    nodes.push({ o: lfo, g: lg });
    p.chord.forEach(function (ratio, i) {
      [-0.6, 0.6].forEach(function (det) {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = p.root * ratio; o.detune.value = det * (4 + i * 2);
        g.gain.value = 0; o.connect(g); g.connect(filt); o.start();
        g.gain.setTargetAtTime(0.032 / (1 + i * 0.5), AC.currentTime + i * 0.4, 1.6);
        nodes.push({ o: o, g: g });
      });
    });
    // air: filtered noise, very quiet
    var len = AC.sampleRate * 2, buf = AC.createBuffer(1, len, AC.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.25;
    var src = AC.createBufferSource(), ng = AC.createGain(), nf = AC.createBiquadFilter();
    src.buffer = buf; src.loop = true; nf.type = 'bandpass'; nf.frequency.value = 1800; nf.Q.value = 0.4; ng.gain.value = 0;
    src.connect(nf); nf.connect(ng); ng.connect(master); src.start(); ng.gain.setTargetAtTime(0.012, AC.currentTime, 3);
    nodes.push({ o: src, g: ng });
    if (pName) pName.textContent = p.name;
  }
  function setSound(state) {
    if (state && !AC) {
      try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
    }
    if (!AC) return;
    on = state;
    if (on) { AC.resume(); if (!nodes.length) startVoices(); master.gain.setTargetAtTime(0.9, AC.currentTime, 0.8); }
    else master.gain.setTargetAtTime(0, AC.currentTime, 0.5);
    document.documentElement.classList.toggle('sound-on', on);
    if (sndBtn) { sndBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); sndBtn.querySelector('span').textContent = on ? 'Sound on' : 'Sound off'; }
  }
  if (sndBtn) sndBtn.addEventListener('click', function () { setSound(!on); });
  if (player) player.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    preset = (preset + (b.classList.contains('prev') ? PRESETS.length - 1 : 1)) % PRESETS.length;
    if (pName) pName.textContent = PRESETS[preset].name;
    if (AC && on) { stopVoices(0.6); startVoices(); }
  });
  if (pName) pName.textContent = PRESETS[0].name;
  document.addEventListener('visibilitychange', function () { if (AC && on) master.gain.setTargetAtTime(document.hidden ? 0 : 0.9, AC.currentTime, 0.4); });
})();
