/* ==========================================================================
   ui.js — the interface over the world: the slash-disc loader, cursor, pill
   nav line, sound + ticker, modals (contact / path finder / the work), the
   arrow list, and the glue between picked cards and their pages.
   ========================================================================== */
(function () {
  'use strict';
  var html = document.documentElement, body = document.body;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;

  /* ---------- loader: a disc of slashes with digits breathing through it, >>> in the middle ---------- */
  var loader = document.getElementById('loader'), ldc = document.getElementById('ldc');
  var loaderDone = false, loaderStart = performance.now(), ldTimer = null;
  function drawLoader() {
    if (!ldc) return;
    var dpr = Math.min(2, devicePixelRatio || 1), size = Math.min(innerWidth, innerHeight) * 0.46;
    ldc.width = size * dpr; ldc.height = size * dpr; ldc.style.width = size + 'px'; ldc.style.height = size + 'px';
    var g = ldc.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, size, size);
    var cell = Math.max(9, size / 30), cols = Math.floor(size / cell), rows = Math.floor(size / (cell * 1.15));
    var r = size / 2 - cell, cx = size / 2, cy = size / 2, t = performance.now() / 1000;
    g.font = '400 ' + (cell * 1.05) + 'px "Share Tech Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var x = (i + 0.5) * cell + (size - cols * cell) / 2, y = (j + 0.5) * cell * 1.15 + (size - rows * cell * 1.15) / 2;
      var d = Math.hypot(x - cx, y - cy); if (d > r) continue;
      var h = Math.sin(i * 12.9898 + j * 78.233 + Math.floor(t * 6) * 0.7) * 43758.5453; h = h - Math.floor(h);
      var isDigit = h > 0.955, near = 1 - d / r;
      g.fillStyle = isDigit ? 'rgba(191,227,236,' + (0.55 + near * 0.4) + ')' : 'rgba(191,227,236,' + (0.14 + near * 0.22) + ')';
      g.fillText(isDigit ? String(Math.floor(h * 97) % 10) : '/', x, y);
    }
    g.fillStyle = 'rgba(8,12,16,0.92)'; g.fillRect(cx - cell * 2.6, cy - cell * 0.9, cell * 5.2, cell * 1.8);
    g.fillStyle = Math.floor(t * 2) % 2 ? '#EAF6FA' : '#BFE3EC'; g.font = '700 ' + (cell * 1.5) + 'px "Chakra Petch", "Share Tech Mono", monospace'; g.fillText('>>>', cx, cy + 1);
  }
  function tickLoader() { if (loaderDone) return; drawLoader(); ldTimer = setTimeout(tickLoader, 110); }
  tickLoader();
  function finishLoader() {
    if (loaderDone) return;
    var wait = Math.max(0, 1500 - (performance.now() - loaderStart));
    setTimeout(function () { loaderDone = true; clearTimeout(ldTimer); html.classList.add('loaded'); setTimeout(function () { if (loader) loader.remove(); }, 1300); }, wait);
  }
  document.addEventListener('world:ready', finishLoader);
  setTimeout(finishLoader, 7000);
  if (html.classList.contains('no-world')) finishLoader();

  /* ---------- cursor ---------- */
  var cur = document.getElementById('cursor');
  if (cur && fine && !reduce) {
    html.classList.add('has-cursor');
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    addEventListener('pointerdown', function () { cur.classList.add('down'); });
    addEventListener('pointerup', function () { cur.classList.remove('down'); });
    (function step() { cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22; cur.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)'; requestAnimationFrame(step); })();
    var hotSel = 'a, button, .tab, .opt, .day, .slot, .check, input, select, textarea, label';
    document.addEventListener('pointerover', function (e) { if (e.target.closest && e.target.closest(hotSel)) cur.classList.add('hot'); });
    document.addEventListener('pointerout', function (e) { if (e.target.closest && e.target.closest(hotSel)) cur.classList.remove('hot'); });
    document.addEventListener('veloure:hover', function (e) { cur.classList.toggle('hot', !!(e.detail && e.detail.id) || cur.classList.contains('hot')); if (!(e.detail && e.detail.id)) cur.classList.remove('hot'); });
  }

  /* ---------- the pill's line ripples with scroll; DOM text glitches while moving ---------- */
  var lines = [].slice.call(document.querySelectorAll('.pill .ln')), amp = 0, ph = 0, lastS = scrollY, scrollTimer = null;
  addEventListener('scroll', function () {
    amp = Math.min(1, amp + Math.min(0.6, Math.abs(scrollY - lastS) / 160)); lastS = scrollY;
    html.classList.add('scrolling'); clearTimeout(scrollTimer); scrollTimer = setTimeout(function () { html.classList.remove('scrolling'); }, 160);
  }, { passive: true });
  (function wave() { amp *= 0.93; ph += 0.35 + amp * 1.2; lines.forEach(function (l) { l.style.setProperty('--amp', amp.toFixed(3)); l.style.setProperty('--ph', ph.toFixed(2)); }); requestAnimationFrame(wave); })();

  /* ---------- sound: generated ambient, three moods, off until asked ---------- */
  var sndBtn = document.getElementById('sndBtn'), player = document.getElementById('player'), pn = player && player.querySelector('.pn');
  var presets = [
    { name: 'VELVET -- 01', notes: [55, 82.41, 110, 164.81], cutoff: 520, rate: 0.06, wave: 'sine' },
    { name: 'CHROME -- 02', notes: [61.74, 92.5, 123.47, 185], cutoff: 760, rate: 0.09, wave: 'triangle' },
    { name: 'VAULT -- 03', notes: [49, 73.42, 98, 146.83], cutoff: 420, rate: 0.045, wave: 'sine' }
  ];
  var ac = null, master = null, voices = [], pi = 0, on = false;
  function stopVoices() { voices.forEach(function (v) { try { v.g.gain.setTargetAtTime(0, ac.currentTime, 0.4); v.o.stop(ac.currentTime + 2); } catch (e) { } }); voices = []; }
  function startPreset(i) {
    if (!ac) return; stopVoices(); var p = presets[i];
    var filt = ac.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = p.cutoff; filt.Q.value = 0.7;
    var lfo = ac.createOscillator(); lfo.frequency.value = p.rate; var lg = ac.createGain(); lg.gain.value = p.cutoff * 0.45; lfo.connect(lg); lg.connect(filt.frequency); lfo.start();
    var delay = ac.createDelay(1.5); delay.delayTime.value = 0.62; var fb = ac.createGain(); fb.gain.value = 0.32; delay.connect(fb); fb.connect(delay);
    filt.connect(master); filt.connect(delay); delay.connect(master);
    p.notes.forEach(function (f, k) {
      [0, 1].forEach(function (d) {
        var o = ac.createOscillator(); o.type = p.wave; o.frequency.value = f * (d ? 1.004 : 0.997);
        var g = ac.createGain(); g.gain.value = 0; o.connect(g); g.connect(filt); o.start();
        g.gain.setTargetAtTime(0.055 / (k + 1), ac.currentTime + k * 0.4, 1.6);
        voices.push({ o: o, g: g });
      });
    });
    voices.push({ o: lfo, g: lg });
    if (pn) pn.textContent = p.name;
  }
  function setSound(state) {
    on = state; html.classList.toggle('sound-on', on);
    if (sndBtn) { sndBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); var l = sndBtn.querySelector('span'); if (l) l.textContent = on ? 'Sound on' : 'Sound off'; }
    if (on) {
      if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination); } catch (e) { on = false; html.classList.remove('sound-on'); return; } }
      if (ac.state === 'suspended') ac.resume();
      startPreset(pi); master.gain.setTargetAtTime(0.9, ac.currentTime, 0.8);
    } else if (ac) { master.gain.setTargetAtTime(0, ac.currentTime, 0.5); setTimeout(function () { if (!on) stopVoices(); }, 1500); }
  }
  if (sndBtn) sndBtn.addEventListener('click', function () { setSound(!on); });
  if (player) {
    player.querySelector('.prev').addEventListener('click', function () { pi = (pi + presets.length - 1) % presets.length; if (on) startPreset(pi); else if (pn) pn.textContent = presets[pi].name; });
    player.querySelector('.next').addEventListener('click', function () { pi = (pi + 1) % presets.length; if (on) startPreset(pi); else if (pn) pn.textContent = presets[pi].name; });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && on) setSound(false); });

  /* ---------- modals ---------- */
  var openId = null, lastFocus = null;
  function modal(id) { return document.getElementById('m-' + id); }
  function openModal(id, opts) {
    var m = modal(id); if (!m) return false;
    if (openId && openId !== id) { var prev = modal(openId); prev.hidden = true; prev.classList.remove('on'); }
    openId = id; lastFocus = document.activeElement;
    m.hidden = false; requestAnimationFrame(function () { m.classList.add('on'); });
    html.classList.add('modal-open');
    var f = m.querySelector('.m-close'); if (f) f.focus({ preventScroll: true });
    if (opts && opts.panel) { var tab = document.getElementById('tab-' + opts.panel); if (tab) tab.click(); }
    document.dispatchEvent(new CustomEvent('veloure:modal', { detail: { id: id } }));
    return true;
  }
  function closeModal() {
    if (!openId) return; var m = modal(openId); openId = null;
    m.classList.remove('on'); setTimeout(function () { m.hidden = true; }, 420);
    html.classList.remove('modal-open');
    if (location.hash === '#contact' || location.hash === '#apply' || location.hash === '#path') history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openId) closeModal(); });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('.m-close') || (t.classList && t.classList.contains('modal'))) { e.preventDefault(); closeModal(); return; }
    var o = t.closest('[data-open]'); if (o) { e.preventDefault(); e.stopPropagation(); var id = o.getAttribute('data-open'); if (id === 'apply') openModal('contact', { panel: 'apply' }); else if (id === 'contact') openModal('contact', { panel: 'book' }); else openModal(id); return; }
    var a = t.closest('a[href="#contact"], a[href="#apply"], a[href="#router"], a[href="#path"]');
    if (a) { e.preventDefault(); e.stopPropagation(); var h = a.getAttribute('href'); if (h === '#apply') openModal('contact', { panel: 'apply' }); else if (h === '#contact') openModal('contact', { panel: 'book' }); else openModal('path'); }
  }, true);
  document.addEventListener('veloure:open', function (e) { var id = e.detail && e.detail.id; if (!id) return; if (id === 'contact' || id === 'apply') openModal('contact', { panel: id === 'apply' ? 'apply' : 'book' }); else if (id === 'portal') { var a = document.querySelector('a.login'); if (a) a.click(); } else openModal(id); });
  // deep links
  function route() { var h = location.hash; if (h === '#contact') openModal('contact', { panel: 'book' }); else if (h === '#apply') openModal('contact', { panel: 'apply' }); else if (h === '#path' || h === '#router') openModal('path'); }
  addEventListener('hashchange', route); route();
  // "open" links inside the work modals that go to another modal
  document.addEventListener('veloure:modal', function () { /* reserved for analytics hooks */ });

  /* ---------- scroll-to for nav links that are stations ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-scroll]'); if (!a) return;
    var el = document.querySelector(a.getAttribute('href')); if (!el) return;
    e.preventDefault(); if (openId) closeModal();
    scrollTo({ top: el.offsetTop + (parseFloat(a.getAttribute('data-scroll')) || 0) * innerHeight, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- station labels: show the right overlay for where you are ---------- */
  var overs = [].slice.call(document.querySelectorAll('.over[data-for]'));
  function placeOvers() {
    var vh = innerHeight, y = scrollY + vh / 2;
    overs.forEach(function (o) {
      var el = document.getElementById(o.getAttribute('data-for')); if (!el) return;
      var top = el.offsetTop, bot = top + el.offsetHeight, a = parseFloat(o.getAttribute('data-from') || '0'), b = parseFloat(o.getAttribute('data-to') || '1');
      var from = top + a * (bot - top), to = top + b * (bot - top);
      var onIt = y >= from && y <= to;
      o.classList.toggle('on', onIt);
    });
  }
  addEventListener('scroll', placeOvers, { passive: true }); addEventListener('resize', placeOvers); placeOvers();
  setTimeout(placeOvers, 600);
})();
