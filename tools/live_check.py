# live_check.py — opens the PUBLISHED site in a real browser context and proves the live wiring:
# LIVE flag on, no preview badge, booking slots fetched from the platform, path finder working,
# console clean. Never submits a form. run: uv run --with playwright python tools/live_check.py [url]
import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "https://jerron-ux.github.io/veloure/"
with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    logs, api = [], []
    pg.on("console", lambda m: logs.append(m.type + ": " + m.text) if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: logs.append("pageerror: " + str(e)))
    pg.on("response", lambda r: api.append((r.request.method, r.url.split("/functions/")[-1].split("?")[0], r.status)) if "app.orioncapitalfunding.com" in r.url else None)
    pg.goto(URL, wait_until="networkidle"); pg.wait_for_timeout(3500)
    pg.evaluate("window.scrollTo({top: document.getElementById('contact').getBoundingClientRect().top + window.scrollY - 70, behavior:'instant'})"); pg.wait_for_timeout(2500)
    days = pg.query_selector_all("#bookBody .day")
    if days: days[0].click(); pg.wait_for_timeout(600)
    slots = pg.query_selector_all("#bookBody .slot:not([disabled])")
    first_slot = slots[0].inner_text() if slots else None
    pg.screenshot(path="screens/live_booking.png")
    pg.evaluate("window.scrollTo({top: document.getElementById('router').getBoundingClientRect().top + window.scrollY - 70, behavior:'instant'})"); pg.wait_for_timeout(500)
    for i in range(4):
        o = pg.query_selector_all("#routerBody .opt")
        if not o: break
        o[0].click(); pg.wait_for_timeout(300)
    state = pg.evaluate("""() => ({
      live: window.__ocLive, badgeHidden: document.getElementById('previewBadge').hidden,
      shield: document.getElementById('shield').className,
      fonts: [...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family).filter((v,i,a)=>a.indexOf(v)===i),
      https: location.protocol, title: document.title,
      routerResult: (document.querySelector('#routerBody .res h3')||{}).textContent || null,
      legalLinks: [...document.querySelectorAll('footer .foot a')].map(a=>a.href).filter(h=>/privacy|terms|sms/.test(h))
    })""")
    print(json.dumps(state, indent=1))
    print("days:", len(days), "| open slots on first day:", len(slots), "| first:", first_slot)
    print("platform calls:", api)
    print("console:", logs or "clean")
    # legal pages reachable from the live host
    for slug in ["privacy-policy", "terms", "sms-consent", "sms-terms"]:
        r = pg.goto(URL + slug + "/"); pg.wait_for_timeout(400)
        print(slug, r.status, pg.title(), "| img ok:" if slug != "sms-consent" else "| img natural width:", pg.evaluate("(document.querySelector('.legal img')||{}).naturalWidth") if slug == "sms-consent" else "")
    b.close()
