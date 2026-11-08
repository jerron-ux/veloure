/* ==========================================================================
   flip.js — the cards flip as you scroll. Every `.flip` element is a two-faced 3D card (brand on the
   back, content on the front). Its rotation is scrubbed to scroll: 180° (back showing) when the card's
   top enters at the bottom of the viewport → 0° (content) by the time it has risen to ~42% of the
   viewport height. Scrolling back up reverses it. `data-flip` = y | -y | x (axis and direction).
   At rest the inline transform is cleared so text rasterises crisp. Reduced motion: no flip.
   ========================================================================== */
(function () {
  'use strict';
  var cards = [].slice.call(document.querySelectorAll('.flip'));
  if (!cards.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('no-flip');
    cards.forEach(function (c) { c.classList.add('flipped'); });
    return;
  }
  var vh = innerHeight, ticking = false;
  var START = 0.98, END = 0.42;                       // viewport fractions the card's top travels through
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }   // in-out: brand side lingers, flip lands mid-viewport
  function update() {
    ticking = false;
    var start = vh * START, span = vh * (START - END);
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i], r = el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) continue;  // far offscreen: leave as is
      var p = (start - r.top) / span;
      if (p < 0) p = 0; else if (p > 1) p = 1;
      if (p === el._p) continue;
      el._p = p;
      if (p >= 1) { el.style.transform = ''; el.classList.add('flipped'); continue; }
      el.classList.remove('flipped');
      var e = ease(p), a = 180 * (1 - e);
      var axis = el.getAttribute('data-flip') || 'y', sign = axis.charAt(0) === '-' ? -1 : 1;
      axis = axis.replace('-', '');
      el.style.transform = (axis === 'x' ? 'rotateX(' : 'rotateY(') + (sign * a).toFixed(2) + 'deg) translateZ(' + (-(1 - e) * 90).toFixed(1) + 'px)';
    }
  }
  function tick() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', function () { vh = innerHeight; cards.forEach(function (c) { c._p = -1; }); tick(); });
  // the booking/application box changes height as the user moves through it — keep its progress honest
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function () { cards.forEach(function (c) { c._p = -1; }); tick(); });
    cards.forEach(function (c) { ro.observe(c); });
  }
  update();
})();
