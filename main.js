/* ==========================================================================
   main.js — page behaviour + the live wiring carried over from the Orion
   funnel site (path finder, booking, application, consent, attribution,
   beacons). Business logic is kept verbatim where it matters; only
   presentation hooks and the brand/endpoint CONFIG block changed.
   PREVIEW GUARD: off the production hosts nothing is sent — submissions are
   simulated so review clicks never create leads.
   ========================================================================== */
(function () {
  "use strict";

  /* ================= CONFIG — the only block that carries brand or endpoint values =================
     Rulings 2026-11-08 (Jerron): entity VELOURÉ LLC · contact details same as Orion for now · the app
     moves to a new domain (not named yet) — set APP_ORIGIN and SITE_HOSTS when known. */
  var CONFIG = {
    brand: 'VELOURÉ',
    legalName: 'VELOURÉ LLC',
    phoneDisplay: '(888) 984-9555',
    email: 'support@orioncapitalfunding.com',
    /* hostnames on which the forms go live (any subdomain matches). The published staging host is
       velourefunding.com (custom domain, 2026-11-08) + jerron-ux.github.io (GitHub Pages origin). */
    siteHosts: ['velourefunding.com', 'www.velourefunding.com', 'jerron-ux.github.io', 'orioncapitalfunding.com'],
    /* the platform the forms post to. PENDING: the app's new domain. */
    appOrigin: 'https://app.orioncapitalfunding.com',
    appFnPath: '/api/apps/6abd3872a2920c3cae83d45b/functions/'
  };
  window.__siteConfig = CONFIG;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LIVE = CONFIG.siteHosts.some(function (h) {
    return new RegExp('(^|\\.)' + h.replace(/\./g, '\\.') + '$', 'i').test(location.hostname);
  });
  window.__ocLive = LIVE;
  if (!LIVE) {
    var badge = document.getElementById('previewBadge');
    if (badge) badge.hidden = false;
  }

  /* ================= LIVE WIRING TO THE PLATFORM =================
     Submissions POST to the app's publicIntake endpoint, which creates a Lead
     (lead_source: "website") and assigns it to a specialist. It is deliberately the only
     unauthenticated write path into the app, so it validates and rate-limits server-side. */
  function fn(name) { return CONFIG.appOrigin + CONFIG.appFnPath + name; }
  var INTAKE_URL = fn('publicIntake');
  var FALLBACK_CALENDAR_URL = '';
  var BOOKING_SLOTS_URL = fn('bookingSlots');
  var BOOKING_CREATE_URL = fn('bookingCreate');
  var BOOKING_POOL = 'closers';
  var liveBooking = { slots: null, slotMin: 15 };
  var LOADED_AT = Date.now();

  function simulate(res, ms) { return new Promise(function (r) { setTimeout(function () { r(res); }, ms || 700); }); }

  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }
  var ATTR_KEY = 'veloure-attr-v1';
  function captureAttribution() {
    try {
      var qp = new URLSearchParams(location.search);
      var fields = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid'];
      var found = {}, any = false;
      fields.forEach(function (k) { var v = qp.get(k); if (v) { found[k] = v; any = true; } });
      if (any) {
        found.captured_at = new Date().toISOString();
        try { sessionStorage.setItem(ATTR_KEY, JSON.stringify(found)); } catch (e) {}
        return found;
      }
    } catch (e) {}
    try { var raw = sessionStorage.getItem(ATTR_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
    try {
      var raw2 = getCookie('mm_acq') || getCookie('first_touch');
      if (raw2) {
        var c0 = raw2.charAt(0), parsed = {};
        if (c0 === '{' || c0 === '[') { parsed = JSON.parse(raw2); }
        else { new URLSearchParams(raw2).forEach(function (v, k) { parsed[k] = v; }); }
        if (parsed && (parsed.utm_source || parsed.gclid || parsed.fbclid)) {
          parsed.captured_at = new Date().toISOString();
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }
  var ATTRIBUTION = captureAttribution();

  // Contact-consent wording shown to the visitor. Version-stamped so the record stored with the lead
  // always says exactly what was agreed to. Bump the version whenever the text changes.
  // v1 under VELOURÉ LLC (2026-11-08) — same clauses as orioncapital-web-consent-v3-2026-11-02 with the
  // brand/entity swapped. SMS consent wording is a compliance item: Eric's OK before it goes live.
  var CONSENT_VERSION = 'veloure-web-consent-v1-2026-11-08';
  var CONSENT_TEXT = 'By providing my phone number and checking this box, I agree to receive SMS marketing and informational text messages from ' + CONFIG.brand + ' (' + CONFIG.legalName + '), including funding options and offers, appointment confirmations, document requests and application status updates. You are opting into marketing texts from ' + CONFIG.brand + '. Consent is not a condition of any purchase or service. Message frequency may vary. Standard message and data rates may apply. Reply STOP to opt out. Reply HELP for help, call ' + CONFIG.phoneDisplay + ' or email ' + CONFIG.email + '. We will not share mobile information with third parties for promotional or marketing purposes. See our Privacy Policy and SMS Terms.';
  var CONSENT_HTML = CONSENT_TEXT.replace('Privacy Policy', '<a href="privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>')
    .replace('SMS Terms', '<a href="sms-terms/" target="_blank" rel="noopener">SMS Terms</a>');
  var TERMS_VERSION = 'veloure-web-terms-v1-2026-11-08';
  var TERMS_TEXT = 'I accept the Terms of Service and Privacy Policy.';
  var TERMS_HTML = TERMS_TEXT.replace('Terms of Service', '<a href="terms/" target="_blank" rel="noopener">Terms of Service</a>')
    .replace('Privacy Policy', '<a href="privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>');
  function consentFields(source, smsOk) {
    var now = new Date().toISOString();
    return { contact_consent: !!smsOk, contact_consent_version: CONSENT_VERSION, contact_consent_text: CONSENT_TEXT,
             contact_consent_at: now, contact_consent_source: source,
             contact_consent_page: location.href.split('#')[0],
             contact_consent_user_agent: (navigator.userAgent || '').slice(0, 300),
             terms_accepted: true, terms_version: TERMS_VERSION, terms_text: TERMS_TEXT, terms_accepted_at: now };
  }
  function sendIntake(payload) {
    payload.elapsed_ms = Date.now() - LOADED_AT;
    payload.source_page = location.pathname + location.hash;
    payload.acq_landing = location.pathname;
    payload.oc_vid = window.__ocVid || '';
    payload.meta_event_id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'ev' + Date.now() + Math.random().toString(16).slice(2);
    payload.micro_site_path = location.pathname;
    payload.landing_path = location.pathname;
    if (ATTRIBUTION) {
      Object.keys(ATTRIBUTION).forEach(function (k) { if (payload[k] === undefined) payload[k] = ATTRIBUTION[k]; });
    }
    var hp = document.getElementById('hp_field');
    if (hp && hp.value) payload.company_website_hp = hp.value;
    if (!LIVE) { try { console.info('[preview] intake payload (not sent)', payload); } catch (e) {} return simulate({ ok: true, simulated: true }); }
    return fetch(INTAKE_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return { ok: r.ok }; });
    }).then(function (res) {
      try { if (res && res.ok && window.__obBeacon) window.__obBeacon('form_submit'); } catch (e) {}
      try { if (res && res.ok) window.ocTrack && window.ocTrack('lead_created', { event_id: payload.meta_event_id }); } catch (e) {}
      return res;
    }).catch(function () {
      return { ok: false, error: 'We could not reach our system. Please call (888) 984-9555.' };
    });
  }

  /* ---------- nav: sticky state, mobile sheet, current-section marker ---------- */
  var nav = document.getElementById('nav');
  function onScroll() { nav.classList.toggle('stuck', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var menuBtn = document.getElementById('menuBtn');
  function closeMenu() { document.body.classList.remove('menu-open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('.sheet a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- smooth anchors ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href'); if (id === '#') return;
    var el = document.querySelector(id); if (!el) return;
    e.preventDefault();
    var y = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- reveal ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  /* ---------- hero entrance + HUD (scene index) ---------- */
  var hud = document.getElementById('hud'), hudBar = hud && hud.querySelector('.bar i'), hudTxt = hud && hud.querySelector('b');
  var SCENE_NAMES = ['Velouré', 'What we do', 'Find your path', 'How it works', 'Who we help', 'Talk to an advisor'];
  var pillLinks = Array.prototype.slice.call(document.querySelectorAll('.pill a[data-scene]'));
  var lastIdx = -1;
  function markReady() { document.body.classList.add('ready'); }
  window.__orionStage = function (s, introDone) {
    if (introDone && !document.body.classList.contains('ready')) markReady();
    var idx = Math.round(s);
    if (hud) {
      hud.classList.toggle('on', idx > 0);
      if (hudBar) hudBar.style.width = (s / 5 * 100) + '%';
    }
    if (idx !== lastIdx) {
      lastIdx = idx;
      if (hudTxt) hudTxt.textContent = String(idx).padStart(2, '0') + ' / 05 — ' + SCENE_NAMES[idx];
      pillLinks.forEach(function (a) { a.classList.toggle('cur', +a.dataset.scene === idx); });
    }
  };
  // With the stage, the hero copy lands as the intro finishes (callback above). Without it
  // (fallback / no WebGL) reveal on a short timer; the second timer is a safety net.
  setTimeout(function () { if (!document.body.classList.contains('stage-ready')) markReady(); }, reduce ? 0 : 900);
  setTimeout(markReady, 3400);

  /* ---------- app links: one origin, set from CONFIG ---------- */
  document.querySelectorAll('a[data-app]').forEach(function (a) { a.href = CONFIG.appOrigin + (a.getAttribute('data-app') || ''); });

  /* ---------- scroll-spy: current section → nav marker (replaces the old stage callback) ---------- */
  (function () {
    var ids = ['top', 'what', 'router', 'how', 'fit', 'contact'];
    var secs = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!secs.length) return;
    var ticking = false;
    function spy() {
      ticking = false;
      var line = window.innerHeight * 0.38, cur = 0;
      secs.forEach(function (el, i) { if (el.getBoundingClientRect().top <= line) cur = i; });
      window.__orionStage(cur, false);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  })();

  /* ================= PATH FINDER ================= */
  var QS = [
    { k: 'entity', q: 'Do you have a business entity set up?',
      hint: 'An LLC, corporation, or similar — registered and active.',
      opts: [['yes', 'Yes, it’s registered and active'], ['no', 'No, not yet'], ['unsure', 'I’m not sure']] },
    { k: 'credit', q: 'Roughly where is your credit today?',
      hint: 'A rough idea is fine. Nothing here is checked or stored.',
      opts: [['low', 'Below 600'], ['mid', '600 – 699'], ['high', '700 or above'], ['unknown', 'I don’t know']] },
    { k: 'revenue', q: 'What’s your current monthly business revenue?',
      hint: 'Revenue, not profit. If the business hasn’t started, choose the first option.',
      opts: [['none', 'No revenue yet'], ['small', 'Under $10,000 / month'], ['mid', '$10,000 – $50,000 / month'], ['big', 'Over $50,000 / month']] },
    { k: 'goal', q: 'What matters most to you right now?',
      hint: 'We’ll weight your starting point toward this.',
      opts: [['funding', 'Getting funding'], ['qualify', 'Knowing what I could qualify for'], ['business', 'Setting up my business'], ['unsure', 'I’m not sure yet']] }
  ];
  var ans = {}, step = 0;
  var body = document.getElementById('routerBody');
  var prog = document.getElementById('prog').children;

  function setProg() { for (var i = 0; i < prog.length; i++) prog[i].classList.toggle('on', i <= step); }

  function render() {
    setProg();
    if (step >= QS.length) { return result(); }
    var Q = QS[step];
    var h = '<div class="q"><h3>' + Q.q + '</h3><p class="hint">' + Q.hint + '</p><div class="opts">';
    Q.opts.forEach(function (o, i) {
      h += '<button class="opt" data-v="' + o[0] + '"><span class="k">0' + (i + 1) + '</span><span>' + o[1] + '</span></button>';
    });
    h += '</div><div class="router-foot">';
    if (step > 0) h += '<button class="back" id="back">← Back</button>';
    h += '<span class="lab" style="margin-left:auto">Question ' + (step + 1) + ' of ' + QS.length + '</span>';
    h += '</div></div>';
    body.innerHTML = h;
    body.querySelectorAll('.opt').forEach(function (b) {
      b.addEventListener('click', function () { ans[QS[step].k] = b.dataset.v; step++; render(); });
    });
    var bk = document.getElementById('back');
    if (bk) bk.addEventListener('click', function () { step = Math.max(0, step - 1); render(); });
  }

  function decide() {
    var e = ans.entity, c = ans.credit, r = ans.revenue;
    var out = { track: '', lab: '', why: '', steps: [], parallel: '' };
    var hasEntity = (e === 'yes'), strongCredit = (c === 'high'), lowCredit = (c === 'low');
    var bigRevenue = (r === 'big'), someRevenue = (r === 'mid' || r === 'big');

    if (bigRevenue && hasEntity) {
      out.parallel = 'With revenue over $50,000 a month and an active entity, revenue-based funding is underwritten mostly on bank statements rather than personal credit. That usually moves fastest — we’d look at it alongside anything else you do.';
    }
    if (!hasEntity) {
      out.track = 'Business buildout'; out.lab = 'Your primary track';
      out.why = 'Lenders fund businesses they can underwrite. Without a registered, active entity there is nothing for them to look at yet — getting the structure right is the fastest route to real options.';
      out.steps = ['Register the entity and get the structure right from day one.',
                   'Set up business banking and the documentation lenders ask for.',
                   'Begin establishing a business credit profile in its own right.'];
      if (strongCredit) { out.parallel = out.parallel || 'Your personal credit is a real asset here — personal-credit-backed options may be available while the business is being built, so nothing has to wait.'; }
      else if (lowCredit) { out.parallel = out.parallel || 'Personal credit below 600 narrows the conventional options, so the business itself will need to carry more of the weight — which is exactly what a proper buildout is for.'; }
      return out;
    }
    if (c === 'unknown') {
      out.track = 'Start with a readiness review'; out.lab = 'Step zero';
      out.why = 'You have the entity; what we don’t know yet is how a lender would read your file. A short review of your revenue, documentation and credit profile tells us which lenders are realistic before you apply anywhere.';
      out.steps = ['Review your bank statements and business documentation.',
                   'Get a clear picture of your credit profile as lenders will see it.',
                   'From there we’ll tell you which lenders fit — and which to avoid.'];
      return out;
    }
    if (!someRevenue) {
      out.track = 'Business buildout'; out.lab = 'Your primary track';
      out.why = 'You have the entity, but with limited revenue so far most lenders will lean on your personal profile and business structure. Strengthening the business — banking history, documentation, business credit — is what opens the better options.';
      out.steps = ['Tighten the structure: banking, bookkeeping, and the documents lenders ask for.',
                   'Establish and build the business credit profile.',
                   'Match to the funding options that fit today while the rest builds.'];
      if (strongCredit) { out.parallel = out.parallel || 'With strong personal credit, some funding options may be open now — we’d look at both rather than making you wait.'; }
      else if (lowCredit) { out.parallel = out.parallel || 'With personal credit below 600 and limited revenue, expect the first options to be smaller. We’d set expectations honestly before you apply anywhere.'; }
      return out;
    }
    out.track = 'Funding'; out.lab = 'Your primary track';
    if (strongCredit) { out.why = 'An active entity, real revenue and strong credit is the combination lenders look for. The work now is packaging your file properly and going to the right lenders — not the most, the right ones.'; }
    else if (lowCredit) { out.why = 'An active entity with real revenue keeps the door open even with credit below 600 — those options are underwritten on the business, not just on you. The work is going to the right lenders with a clean, complete file.'; }
    else { out.why = 'An active entity with real revenue is a solid starting point, and your credit is in range for many lenders. The work now is packaging your file properly and going to the right ones.'; }
    out.steps = ['Package your file the way underwriters expect to receive it.',
                 'Match to lenders whose criteria actually fit your profile.',
                 'Review the offers together — you make every final call.'];
    if (!bigRevenue && lowCredit) { out.parallel = out.parallel || 'Expect lenders to weigh your bank statements and business structure heavily. We’d set expectations honestly before you apply anywhere.'; }
    return out;
  }

  function result() {
    var d = decide();
    var h = '<div class="res">';
    h += '<div class="rlab">' + d.lab + '</div>';
    h += '<h3>Start with <span class="track">' + d.track + '</span></h3>';
    h += '<p class="why">' + d.why + '</p>';
    h += '<div class="steps">';
    d.steps.forEach(function (s, i) { h += '<div class="step"><span class="sn">' + String(i + 1).padStart(2, '0') + '</span><span>' + s + '</span></div>'; });
    h += '</div>';
    if (d.parallel) { h += '<div class="par"><b>In parallel</b><span>' + d.parallel + '</span></div>'; }
    h += '<p class="legalnote">This is a starting point based on four answers — not an offer, an approval, '
      + 'or a promise of any result. Your actual plan depends on your full documentation, your credit '
      + 'profile as lenders see it, and each lender’s own criteria. We’d go through it with you properly on a call.</p>';
    h += '<div class="res-cta">'
      + '<a class="btn" href="#contact">Talk to an advisor <span class="ar">→</span></a>'
      + '<button class="btn btn-ghost" id="again" type="button">Start over</button>'
      + '</div></div>';
    body.innerHTML = h;
    for (var i = 0; i < prog.length; i++) prog[i].classList.add('on');
    var ag = document.getElementById('again');
    if (ag) ag.addEventListener('click', function () { ans = {}; step = 0; render(); });
    // carry the routed track into the application so it starts pre-filled
    if (typeof app !== 'undefined' && app.d && !app.d.services.length) {
      var svc = { 'Funding': 'Funding', 'Business buildout': 'Business buildout' }[d.track];
      if (svc) { app.d.services = [svc]; renderApp(); }
    }
  }
  render();

  /* ================= TABS ================= */
  var tabs = document.querySelectorAll('.tab');
  function showPanel(name) {
    tabs.forEach(function (t) {
      var on = t.dataset.panel === name;
      t.classList.toggle('on', on); t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    ['book', 'apply'].forEach(function (p) { document.getElementById('panel-' + p).classList.toggle('on', p === name); });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { showPanel(t.dataset.panel); }); });

  /* ================= BOOK A CALL ================= */
  var ESC = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var bk = { step: 1, day: null, time: null, name: '', email: '', phone: '', liveBooked: false };
  var bookBody = document.getElementById('bookBody');
  var HOST =
    '<div class="host">'
  + '  <span class="av" aria-hidden="true">&#9679;</span>'
  + '  <span class="hm"><b>Book a 15-minute funding call</b>'
  + '    <em>with one of our funding specialists</em></span>'
  + '  <span class="hb">15 min · Phone</span>'
  + '</div>';
  var DAYNM = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONNM = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function workdays(n) {
    var out = [], d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
    while (out.length < n) { if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return out;
  }
  var DAYS = workdays(10);
  function dayKeyEt(d) {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function fmtLiveLabel(iso) {
    try { return new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', ''); }
    catch (e) { return iso; }
  }
  function loadLiveSlots(done) {
    if (!LIVE || !window.fetch || !window.AbortController) { done(); return; }
    var ac = new AbortController();
    var timer = setTimeout(function () { ac.abort(); }, 4000);
    fetch(BOOKING_SLOTS_URL + '?pool=' + encodeURIComponent(BOOKING_POOL), { signal: ac.signal })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        clearTimeout(timer);
        if (!data || !data.ok || !Array.isArray(data.slots) || !data.slots.length) { done(); return; }
        liveBooking.slotMin = data.slot_min || 15;
        var byDay = {};
        data.slots.forEach(function (s) {
          var key = dayKeyEt(new Date(s.start));
          (byDay[key] = byDay[key] || []).push({ label: fmtLiveLabel(s.start), taken: false, iso: s.start });
        });
        liveBooking.slots = byDay;
        done();
      })
      .catch(function () { clearTimeout(timer); done(); });
  }
  function slotList(dayIdx) {
    var live = liveBooking.slots && liveBooking.slots[dayKeyEt(DAYS[dayIdx])];
    if (live) return live;
    var out = [];
    for (var i = 0; i < 16; i++) {
      var mins = 9 * 60 + i * 30, h = Math.floor(mins / 60), m = mins % 60;
      var ampm = h >= 12 ? 'pm' : 'am', hh = h > 12 ? h - 12 : h;
      var taken = ((dayIdx * 7 + i * 3) % 5 === 0) || ((dayIdx + i) % 11 === 0);
      out.push({ label: hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm, taken: taken });
    }
    return out;
  }
  function tzName() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time'; }
    catch (e) { return 'your local time'; }
  }

  function renderBook() {
    if (FALLBACK_CALENDAR_URL) {
      bookBody.innerHTML = HOST
        + '<iframe class="gcal" src="' + FALLBACK_CALENDAR_URL + '" title="Book a call" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
        + '<p class="legalnote" style="margin-top:14px">Booking a call is not an application, and not an offer or approval of credit.</p>';
      return;
    }
    if (bk.step === 1) {
      var h = HOST
        + '<div class="bk-h">Pick a day that works</div>'
        + '<div class="bk-s">' + (liveBooking.slots ? 'Pick an open time below — it books instantly.' : 'Tell us when suits you and a funding specialist confirms by email.') + ' No fee, and nothing to prepare.</div>'
        + '<div class="days">';
      DAYS.forEach(function (d, i) {
        h += '<button class="day' + (bk.day === i ? ' on' : '') + '" data-d="' + i + '">'
          + '<span class="dw">' + DAYNM[d.getDay()] + '</span>'
          + '<span class="dd">' + d.getDate() + '</span>'
          + '<span class="dm">' + MONNM[d.getMonth()] + '</span></button>';
      });
      h += '</div>';
      if (bk.day !== null) {
        h += '<div class="slots">';
        slotList(bk.day).forEach(function (s, i) {
          h += '<button class="slot' + (bk.time === i ? ' on' : '') + '" data-t="' + i + '"' + (s.taken ? ' disabled' : '') + '>' + s.label + '</button>';
        });
        h += '</div><div class="tz">Times shown in ' + ESC(tzName()) + '.</div>';
      }
      h += '<div class="btn-row"><button class="btn" id="bkNext"' + (bk.time === null ? ' disabled style="opacity:.45;cursor:not-allowed"' : '') + '>Continue <span class="ar">→</span></button></div>';
      bookBody.innerHTML = h;
      bookBody.querySelectorAll('.day').forEach(function (b) { b.addEventListener('click', function () { bk.day = +b.dataset.d; bk.time = null; renderBook(); }); });
      bookBody.querySelectorAll('.slot').forEach(function (b) { b.addEventListener('click', function () { bk.time = +b.dataset.t; renderBook(); }); });
      var nx = document.getElementById('bkNext');
      if (nx) nx.addEventListener('click', function () { if (bk.time !== null) { bk.step = 2; renderBook(); } });
      return;
    }
    if (bk.step === 2) {
      var d = DAYS[bk.day], s = slotList(bk.day)[bk.time];
      bookBody.innerHTML =
        '<div class="bk-sum"><b>' + DAYNM[d.getDay()] + ' ' + d.getDate() + ' ' + MONNM[d.getMonth()] + '</b><span>at ' + s.label + ' · 15 min</span></div>'
      + '<div class="bk-h">Where should we reach you?</div>'
      + '<div class="bk-s">We\'ll send a calendar invite and call you at this number.</div>'
      + '<div class="fieldrow">'
      + '<div class="field"><label for="bk-n">Full name</label><input id="bk-n" autocomplete="name" value="' + ESC(bk.name) + '"></div>'
      + '<div class="field"><label for="bk-p">Phone</label><input id="bk-p" type="tel" autocomplete="tel" value="' + ESC(bk.phone) + '"></div>'
      + '</div>'
      + '<div class="field"><label for="bk-e">Email</label><input id="bk-e" type="email" autocomplete="email" value="' + ESC(bk.email) + '"></div>'
      + '<div class="field"><label for="bk-m">What would you like to cover? (optional)</label><textarea id="bk-m"></textarea></div>'
      + '<label class="check" id="bkcs" style="margin-top:6px"><input type="checkbox" id="bkOk"><span>' + CONSENT_HTML + '</span></label>'
      + '<label class="check" id="bkts" style="margin-top:9px"><input type="checkbox" id="bkTos"><span>' + TERMS_HTML + '</span></label>'
      + '<div id="bkErr"></div>'
      + '<div class="btn-row"><button class="btn" id="bkDone">Request this time <span class="ar">→</span></button>'
      + '<button class="back" id="bkBack">← Change time</button></div>';
      document.getElementById('bkBack').addEventListener('click', function () { bk.step = 1; renderBook(); });
      ['bkOk', 'bkTos'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', function (e) { e.target.closest('.check').classList.toggle('on', e.target.checked); });
      });
      document.getElementById('bkDone').addEventListener('click', function () {
        bk.name = document.getElementById('bk-n').value.trim();
        bk.phone = document.getElementById('bk-p').value.trim();
        bk.email = document.getElementById('bk-e').value.trim();
        var e = [];
        if (!bk.name) e.push('your name');
        if (!bk.email || bk.email.indexOf('@') < 1) e.push('a valid email');
        if (!bk.phone) e.push('a phone number');
        if (e.length) { document.getElementById('bkErr').innerHTML = '<p class="err">Please add ' + e.join(', ') + '.</p>'; return; }
        if (!document.getElementById('bkTos').checked) {
          document.getElementById('bkErr').innerHTML = '<p class="err">Please accept the Terms of Service and Privacy Policy to continue.</p>'; return;
        }
        var btn = document.getElementById('bkDone');
        btn.disabled = true; btn.style.opacity = '.55'; btn.textContent = 'Sending…';
        var dd = DAYS[bk.day], ss = slotList(bk.day)[bk.time];
        var when = DAYNM[dd.getDay()] + ' ' + dd.getDate() + ' ' + MONNM[dd.getMonth()] + ' at ' + ss.label + ' (' + tzName() + ')';
        var parts = bk.name.split(/\s+/);
        var consentOk = document.getElementById('bkOk') && document.getElementById('bkOk').checked;
        var agenda = document.getElementById('bk-m').value.trim();

        if (ss.iso) {
          var hp = document.getElementById('hp_field');
          var qp = new URLSearchParams(location.search);
          var acqNotes = 'website booking, page=' + location.pathname
            + (qp.get('utm_source') ? ', utm_source=' + qp.get('utm_source') : '')
            + (qp.get('utm_campaign') ? ', utm_campaign=' + qp.get('utm_campaign') : '');
          var createReq = LIVE ? fetch(BOOKING_CREATE_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pool: BOOKING_POOL, source: 'website', start_at: ss.iso,
              name: bk.name, email: bk.email, phone: bk.phone, consent_sms: consentOk,
              notes: acqNotes + (agenda ? ' | ' + agenda : ''),
              company_website_hp: (hp && hp.value) || undefined
            })
          }).then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); }) : simulate({ ok: true });
          createReq.then(function (res) {
              if (res && res.ok) { bk.step = 3; bk.liveBooked = true; renderBook(); return; }
              btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = 'Request this time <span class="ar">→</span>';
              document.getElementById('bkErr').innerHTML = '<p class="err">' + ((res && res.error) || 'That time just filled up. Please pick another.') + '</p>';
              liveBooking.slots = null; bk.time = null;
              loadLiveSlots(function () { renderBook(); });
            })
            .catch(function () {
              btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = 'Request this time <span class="ar">→</span>';
              document.getElementById('bkErr').innerHTML = '<p class="err">We could not reach our system. Please call (888) 984-9555.</p>';
            });
          return;
        }

        sendIntake({
          first_name: parts[0] || bk.name,
          last_name: parts.slice(1).join(' '),
          email: bk.email, phone: bk.phone,
          services: ['Funding'],
          message: 'CALL REQUEST — preferred time: ' + when + '. ' + (agenda || 'No agenda given.'),
          consent: consentFields('website_booking', consentOk)
        }).then(function (res) {
          if (res && res.ok) { bk.step = 3; renderBook(); return; }
          btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = 'Request this time <span class="ar">→</span>';
          document.getElementById('bkErr').innerHTML = '<p class="err">' + ((res && res.error) || 'Something went wrong. Please call (888) 984-9555.') + '</p>';
        });
      });
      return;
    }
    var dd2 = DAYS[bk.day], ss2 = slotList(bk.day)[bk.time];
    bookBody.innerHTML =
      '<div class="done"><div class="ck"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12.5l5.5 5.5L20 7"/></svg></div>'
    + '<h3>' + (bk.liveBooked ? 'Call booked' : 'Request received') + '</h3>'
    + '<p>' + (bk.liveBooked
        ? ('Thanks ' + ESC(bk.name.split(' ')[0] || 'there') + '. A funding specialist will call you at ' + ESC(bk.phone) + ' — you will also get a confirmation by email.')
        : ('Thanks ' + ESC(bk.name.split(' ')[0] || 'there') + '. A funding specialist has your request and will confirm the time by email to ' + ESC(bk.email) + ' — usually within one business day.')) + '</p>'
    + '<div class="card">'
    + '<div><span>With</span><span>A funding specialist</span></div>'
    + '<div><span>' + (bk.liveBooked ? 'Booked for' : 'You asked for') + '</span><span>' + DAYNM[dd2.getDay()] + ' ' + dd2.getDate() + ' ' + MONNM[dd2.getMonth()] + ', ' + ss2.label + '</span></div>'
    + '<div><span>Length</span><span>15 minutes</span></div>'
    + '<div><span>We\'ll call</span><span>' + ESC(bk.phone) + '</span></div>'
    + '</div>'
    + '<p class="legalnote" style="margin:20px auto 0">This books a conversation only. It is not an application, and not an offer or approval of credit.</p>'
    + '<div class="btn-row" style="justify-content:center"><button class="btn btn-ghost" id="bkReset">Book another time</button></div>'
    + '</div>';
    document.getElementById('bkReset').addEventListener('click', function () {
      bk = { step: 1, day: null, time: null, name: '', email: '', phone: '', liveBooked: false }; renderBook();
    });
  }
  loadLiveSlots(function () { renderBook(); });

  /* ================= APPLICATION ================= */
  var app = { step: 0, d: { services: [] } };
  var appBody = document.getElementById('appBody'), appBar = document.getElementById('appBar');
  var SEL = function (id, label, opts, val) {
    var h = '<div class="field"><label for="' + id + '">' + label + '</label><select id="' + id + '">';
    opts.forEach(function (o) { h += '<option' + (val === o ? ' selected' : '') + '>' + o + '</option>'; });
    return h + '</select></div>';
  };
  var TXT = function (id, label, val, type, ac) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" type="' + (type || 'text') + '"'
      + (ac ? ' autocomplete="' + ac + '"' : '') + ' value="' + ESC(val || '') + '"></div>';
  };
  var APP_STEPS = [
    { title: 'About you', hint: 'So we know who we\'re helping.', render: function (d) {
        return '<div class="fieldrow">' + TXT('a-name', 'Full name', d.name, 'text', 'name') + TXT('a-phone', 'Phone', d.phone, 'tel', 'tel') + '</div>'
             + '<div class="fieldrow">' + TXT('a-email', 'Email', d.email, 'email', 'email') + TXT('a-state', 'State', d.state, 'text', 'address-level1') + '</div>';
      }, save: function (d) { d.name = v('a-name'); d.phone = v('a-phone'); d.email = v('a-email'); d.state = v('a-state'); },
      check: function (d) {
        var e = []; if (!d.name) e.push('your name');
        if (!d.email || d.email.indexOf('@') < 1) e.push('a valid email');
        if (!d.phone) e.push('a phone number'); return e;
      } },
    { title: 'Your business', hint: 'If you haven\'t started one yet, that\'s completely fine — say so below.', render: function (d) {
        return '<div class="fieldrow">' + TXT('a-bn', 'Business name (or “none yet”)', d.bn)
             + SEL('a-ent', 'Entity type', ['Not set up yet', 'LLC', 'S-Corp', 'C-Corp', 'Sole proprietor', 'Not sure'], d.ent) + '</div>'
             + '<div class="fieldrow">'
             + SEL('a-tib', 'Time in business', ['Not started', 'Under 6 months', '6–12 months', '1–2 years', '2+ years'], d.tib)
             + SEL('a-rev', 'Monthly revenue', ['No revenue yet', 'Under $10,000', '$10,000 – $50,000', 'Over $50,000'], d.rev) + '</div>'
             + TXT('a-ind', 'Industry', d.ind);
      }, save: function (d) { d.bn = v('a-bn'); d.ent = v('a-ent'); d.tib = v('a-tib'); d.rev = v('a-rev'); d.ind = v('a-ind'); },
      check: function () { return []; } },
    { title: 'What you\'re looking for', hint: 'Pick everything that applies — most clients need more than one.', render: function (d) {
        var svc = [['Funding', 'Business or personal capital'], ['Business buildout', 'Set up an entity lenders will underwrite']];
        var h = '<div class="checks">';
        svc.forEach(function (s) {
          var on = d.services.indexOf(s[0]) > -1;
          h += '<label class="check' + (on ? ' on' : '') + '"><input type="checkbox" data-svc="' + s[0] + '"' + (on ? ' checked' : '') + '>'
             + '<span><b>' + s[0] + '</b><em>' + s[1] + '</em></span></label>';
        });
        h += '</div><div style="height:16px"></div>'
          + '<div class="fieldrow">'
          + SEL('a-amt', 'Funding amount you have in mind', ['Not sure yet', 'Under $25,000', '$25,000 – $100,000', '$100,000 – $250,000', 'Over $250,000'], d.amt)
          + SEL('a-when', 'Timeline', ['As soon as possible', '1–3 months', '3–6 months', 'Just exploring'], d.when) + '</div>'
          + '<div class="field"><label for="a-use">What would the funds be used for?</label><textarea id="a-use">' + ESC(d.use || '') + '</textarea></div>';
        return h;
      }, save: function (d) { d.amt = v('a-amt'); d.when = v('a-when'); d.use = v('a-use'); },
      check: function (d) { return d.services.length ? [] : ['at least one service']; } },
    { title: 'Credit snapshot', hint: 'Rough answers are fine. This helps us point you at the right track.', render: function (d) {
        return '<div class="fieldrow">'
             + SEL('a-cr', 'Estimated personal credit', ['I don\'t know', 'Below 600', '600 – 699', '700 or above'], d.cr)
             + SEL('a-debt', 'Existing business debt', ['None', 'Under $25,000', '$25,000 – $100,000', 'Over $100,000'], d.debt) + '</div>'
             + SEL('a-dec', 'Have you been declined for funding recently?', ['No', 'Yes', 'Not sure'], d.dec)
             + '<div class="safety"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">'
             + '<rect x="4" y="10.5" width="16" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>'
             + '<span>We never ask for your Social Security number, bank logins, or full account numbers on this form. '
             + 'If documents are needed, we send a secure upload link after we speak.</span></div>';
      }, save: function (d) { d.cr = v('a-cr'); d.debt = v('a-debt'); d.dec = v('a-dec'); },
      check: function () { return []; } }
  ];
  function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function renderApp() {
    var total = APP_STEPS.length + 1;
    appBar.innerHTML = Array.from({ length: total }, function (_, i) { return '<i class="' + (i <= app.step ? 'on' : '') + '"></i>'; }).join('');
    if (app.step < APP_STEPS.length) {
      var S = APP_STEPS[app.step], d = app.d;
      appBody.innerHTML =
        '<div class="q"><h3>' + S.title + '</h3>'
      + '<p class="hint">' + S.hint + '</p>'
      + S.render(d) + '<div id="appErr"></div>'
      + '<div class="btn-row"><button class="btn" id="appNext">'
      + (app.step === APP_STEPS.length - 1 ? 'Review' : 'Continue') + ' <span class="ar">→</span></button>'
      + (app.step > 0 ? '<button class="back" id="appBack">← Back</button>' : '')
      + '<span class="lab" style="margin-left:auto">Step ' + (app.step + 1) + ' of ' + total + '</span></div></div>';
      appBody.querySelectorAll('[data-svc]').forEach(function (cb) {
        cb.addEventListener('change', function () {
          var n = cb.dataset.svc, i = app.d.services.indexOf(n);
          if (cb.checked && i < 0) app.d.services.push(n);
          if (!cb.checked && i > -1) app.d.services.splice(i, 1);
          cb.closest('.check').classList.toggle('on', cb.checked);
        });
      });
      document.getElementById('appNext').addEventListener('click', function () {
        S.save(app.d);
        var e = S.check(app.d);
        if (e.length) { document.getElementById('appErr').innerHTML = '<p class="err">Please add ' + e.join(', ') + '.</p>'; return; }
        app.step++; renderApp();
      });
      var b = document.getElementById('appBack');
      if (b) b.addEventListener('click', function () { S.save(app.d); app.step--; renderApp(); });
      return;
    }
    if (app.step === APP_STEPS.length) {
      var d2 = app.d;
      var rows = [['Name', d2.name], ['Email', d2.email], ['Phone', d2.phone], ['State', d2.state || '—'],
                  ['Business', d2.bn || '—'], ['Entity', d2.ent || '—'], ['Time in business', d2.tib || '—'],
                  ['Monthly revenue', d2.rev || '—'], ['Looking for', d2.services.join(', ') || '—'],
                  ['Amount', d2.amt || '—'], ['Timeline', d2.when || '—'], ['Credit', d2.cr || '—']];
      var h = '<div class="q"><h3>Check it over</h3>'
        + '<p class="hint">Make sure this looks right before you send it.</p><div class="review">';
      rows.forEach(function (r) { h += '<div><span>' + r[0] + '</span><span>' + ESC(r[1]) + '</span></div>'; });
      h += '</div>'
        + '<label class="check" id="cs1"><input type="checkbox" id="ok1"><span>' + CONSENT_HTML + '</span></label>'
        + '<label class="check" style="margin-top:9px" id="csT"><input type="checkbox" id="okT"><span>' + TERMS_HTML + '</span></label>'
        + '<label class="check" style="margin-top:9px" id="cs2"><input type="checkbox" id="ok2">'
        + '<span>I understand this is a request for a consultation — <b>not an application for credit</b>, '
        + 'and not an offer, approval, or guarantee of funding or any credit result.</span></label>'
        + '<div id="appErr2"></div>'
        + '<div class="btn-row"><button class="btn" id="appSend">Submit application <span class="ar">→</span></button>'
        + '<button class="back" id="appBack2">← Back</button></div></div>';
      appBody.innerHTML = h;
      ['ok1', 'okT', 'ok2'].forEach(function (id) {
        document.getElementById(id).addEventListener('change', function (e) { e.target.closest('.check').classList.toggle('on', e.target.checked); });
      });
      document.getElementById('appBack2').addEventListener('click', function () { app.step--; renderApp(); });
      document.getElementById('appSend').addEventListener('click', function () {
        if (!document.getElementById('okT').checked || !document.getElementById('ok2').checked) {
          document.getElementById('appErr2').innerHTML = '<p class="err">Please accept the Terms of Service and Privacy Policy and confirm this is a consultation request (the two boxes marked required). Text-message consent is optional.</p>'; return;
        }
        var btn = document.getElementById('appSend');
        btn.disabled = true; btn.style.opacity = '.55'; btn.textContent = 'Sending…';
        var d = app.d, parts = (d.name || '').trim().split(/\s+/);
        sendIntake({
          first_name: parts[0] || d.name || '',
          last_name: parts.slice(1).join(' '),
          email: d.email, phone: d.phone, state: d.state,
          services: d.services,
          business_name: d.bn, entity_type: d.ent, time_in_business: d.tib,
          monthly_revenue: d.rev, industry: d.ind,
          funding_amount: d.amt, timeline: d.when, use_of_funds: d.use,
          credit_band: d.cr, existing_debt: d.debt, recently_declined: d.dec,
          consent: consentFields('website_application', document.getElementById('ok1').checked)
        }).then(function (res) {
          if (res && res.ok) { app.step++; renderApp(); return; }
          btn.disabled = false; btn.style.opacity = ''; btn.innerHTML = 'Submit application <span class="ar">→</span>';
          document.getElementById('appErr2').innerHTML = '<p class="err">' + ((res && res.error) || 'Something went wrong. Please call (888) 984-9555.') + '</p>';
        });
      });
      return;
    }
    appBody.innerHTML =
      '<div class="done"><div class="ck"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12.5l5.5 5.5L20 7"/></svg></div>'
    + '<h3>Application received</h3>'
    + '<p>Thanks ' + ESC((app.d.name || '').split(' ')[0] || '') + '. A specialist will review this and get back to you within one business day.</p>'
    + '<div class="card"><div><span>Reference</span><span>ORD-' + String(Date.now()).slice(-6) + '</span></div>'
    + '<div><span>Sent to</span><span>' + ESC(app.d.email) + '</span></div>'
    + '<div><span>Next step</span><span>We call you</span></div></div>'
    + '<p class="legalnote" style="margin:20px auto 0">Submitting this does not create an obligation on either side, and is not an offer or approval of credit.</p>'
    + '<div class="btn-row" style="justify-content:center"><button class="btn btn-ghost" id="bookToo">Book a call as well</button></div></div>';
    document.getElementById('bookToo').addEventListener('click', function () { showPanel('book'); });
  }
  renderApp();

  /* deep link: #apply opens the application tab */
  function hashRoute() {
    if (location.hash === '#apply') {
      showPanel('apply');
      var el = document.getElementById('contact');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 64, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href="#apply"]'); if (!a) return;
    e.preventDefault(); history.replaceState(null, '', '#apply'); hashRoute();
  });
  window.addEventListener('hashchange', hashRoute);
  hashRoute();
})();

/* ================= SITE BEACON + STRUCTURED JOURNEY (verbatim from the current site) ================= */
(function () {
  "use strict";
  if (!window.__ocLive) { window.__obBeacon = function () {}; window.__obJourney = function () {}; return; } /* preview: no telemetry */
  try {
    var CFG = window.__siteConfig || { appOrigin: 'https://app.orioncapitalfunding.com', appFnPath: '/api/apps/6abd3872a2920c3cae83d45b/functions/' };
    var BEACON_URL = CFG.appOrigin + CFG.appFnPath + 'siteBeacon';
    var JOURNEY_URL = CFG.appOrigin + CFG.appFnPath + 'webJourneyEvent';
    var SID_KEY = 'ob_sid', FIRST_KEY = 'ob_first_sent', FSTART_KEY = 'ob_form_started';
    var OC_VID_KEY = 'oc_vid', OC_VID_DAYS = 365;
    function qp(name) { try { return new URLSearchParams(location.search).get(name) || ''; } catch (e) { return ''; } }
    function genSid() { var s = '', chars = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length)); return s; }
    function getCookie(name) {
      try { var parts = ('; ' + document.cookie).split('; ' + name + '='); if (parts.length < 2) return ''; return decodeURIComponent(parts.pop().split(';').shift()); } catch (e) { return ''; }
    }
    function setCookie(name, val, days) {
      try { var d = new Date(); d.setTime(d.getTime() + days * 86400000); document.cookie = name + '=' + encodeURIComponent(val) + '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax'; } catch (e) {}
    }
    var sid;
    try { sid = sessionStorage.getItem(SID_KEY); if (!sid) { sid = genSid(); sessionStorage.setItem(SID_KEY, sid); } } catch (e) { sid = genSid(); }
    var ocVid = getCookie(OC_VID_KEY);
    if (!ocVid) { ocVid = genSid() + genSid(); setCookie(OC_VID_KEY, ocVid, OC_VID_DAYS); }
    else { setCookie(OC_VID_KEY, ocVid, OC_VID_DAYS); }
    window.__ocVid = ocVid;
    var pageEnteredAt = Date.now();
    var ftUtm = {};
    var firstTouchRaw = getCookie('mm_acq') || getCookie('first_touch') || '';
    if (firstTouchRaw) {
      try { var c0 = firstTouchRaw.charAt(0); if (c0 === '{' || c0 === '[') { ftUtm = JSON.parse(firstTouchRaw); } else { new URLSearchParams(firstTouchRaw).forEach(function (v, k) { ftUtm[k] = v; }); } } catch (e) {}
    }
    function sendJourney(ev, extra) {
      try {
        var payload = { visitor_id: ocVid, ev: ev, path: location.pathname };
        if (extra) { for (var k in extra) { if (extra.hasOwnProperty(k)) payload[k] = extra[k]; } }
        if (ev === 'pageview') {
          payload.utm_source = qp('utm_source') || ftUtm.utm_source || '';
          payload.utm_medium = qp('utm_medium') || ftUtm.utm_medium || '';
          payload.utm_campaign = qp('utm_campaign') || ftUtm.utm_campaign || '';
          payload.utm_content = qp('utm_content') || ftUtm.utm_content || '';
          payload.referrer_host = (function () { try { return document.referrer ? (new URL(document.referrer)).host : ''; } catch (e) { return ''; } })();
        }
        var body = JSON.stringify(payload);
        if (ev === 'pagehide' && window.navigator && navigator.sendBeacon) {
          try { if (navigator.sendBeacon(JOURNEY_URL, new Blob([body], { type: 'text/plain' }))) return; } catch (e) {}
        }
        fetch(JOURNEY_URL, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: body }).catch(function () {});
      } catch (e) {}
    }
    window.__obJourney = sendJourney;
    function send(ev) {
      try {
        var ref = '';
        try { ref = document.referrer ? (new URL(document.referrer)).host : ''; } catch (e) {}
        var payload = { ev: ev, path: location.pathname, ref: ref,
          utm_source: qp('utm_source') || ftUtm.utm_source || '', utm_medium: qp('utm_medium') || ftUtm.utm_medium || '',
          utm_campaign: qp('utm_campaign') || ftUtm.utm_campaign || '', utm_content: qp('utm_content') || ftUtm.utm_content || '',
          sid: sid, ts: Date.now() };
        fetch(BEACON_URL, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }).catch(function () {});
      } catch (e) {}
    }
    window.__obBeacon = function (ev) { send(ev); };
    var firstSent = false;
    try { firstSent = sessionStorage.getItem(FIRST_KEY) === '1'; } catch (e) {}
    if (!firstSent) { send('first'); try { sessionStorage.setItem(FIRST_KEY, '1'); } catch (e) {} }
    send('view');
    sendJourney('pageview');
    window.addEventListener('pagehide', function () { sendJourney('pagehide', { seconds: Math.round((Date.now() - pageEnteredAt) / 1000) }); });
    document.addEventListener('input', function (e) {
      try {
        if (!e.target || !e.target.closest || !e.target.closest('.router-body')) return;
        var started = false;
        try { started = sessionStorage.getItem(FSTART_KEY) === '1'; } catch (err) {}
        if (started) return;
        try { sessionStorage.setItem(FSTART_KEY, '1'); } catch (err) {}
        send('form_start'); sendJourney('app_start');
      } catch (err) {}
    }, true);
    document.addEventListener('click', function (e) {
      try {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (href.indexOf('tel:') === 0) { send('tel_click'); return; }
        var cls = a.className || '';
        if (href.indexOf('/qualify') !== -1 || href.indexOf('#apply') !== -1 || (' ' + cls + ' ').indexOf(' btn ') !== -1 || /\bbtn\b/.test(cls)) { send('cta_click'); }
      } catch (err) {}
    }, true);
  } catch (e) {}
})();
