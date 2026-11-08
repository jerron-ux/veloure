# qa.py — renders the site headless (software WebGL), screenshots desktop + phone, walks the
# path finder / booking / application flows, and reports console errors + requests.
# run: uv run --with playwright python tools/qa.py
import pathlib, http.server, threading, socketserver, functools, json, time
from playwright.sync_api import sync_playwright

R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / "screens"; OUT.mkdir(exist_ok=True)
PORT = 8792

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class Srv(socketserver.TCPServer): allow_reuse_address = True
srv = Srv(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(R)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/"

def run(pw, name, viewport, mobile=False):
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = b.new_context(viewport=viewport, device_scale_factor=1, is_mobile=mobile, has_touch=mobile)
    pg = ctx.new_page()
    logs, reqs = [], []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: logs.append("pageerror: " + str(e)))
    pg.on("request", lambda r: reqs.append(r.url) if "127.0.0.1" not in r.url else None)
    pg.goto(URL); pg.wait_for_timeout(3200)
    pg.screenshot(path=str(OUT / f"{name}_00_hero.png"))
    # scroll through so reveals fire, then full page
    h = pg.evaluate("document.documentElement.scrollHeight")
    for y in range(0, h, 500): pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(90)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(600)
    pg.screenshot(path=str(OUT / f"{name}_full.png"), full_page=True)
    # station shots
    for sid in ["statement", "work", "process", "end"]:
        pg.evaluate(f"window.scrollTo({{top: document.getElementById('{sid}').offsetTop + innerHeight * 0.3, behavior:'instant'}})"); pg.wait_for_timeout(1600)
        pg.screenshot(path=str(OUT / f"{name}_{sid}.png"))
    # the work modals open from the arrow list / a11y buttons
    pg.evaluate("document.querySelector(\"#cards [data-card='funding']\").click()"); pg.wait_for_timeout(600)
    pg.screenshot(path=str(OUT / f"{name}_modal_funding.png"))
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    # path finder: open its modal, click an option 4 times
    pg.evaluate("document.querySelector(\".arrows [data-open='path']\").click()"); pg.wait_for_timeout(600)
    for i in range(4):
        opts = pg.query_selector_all("#routerBody .opt")
        if not opts: break
        opts[min(i, len(opts) - 1)].click(); pg.wait_for_timeout(350)
    pg.screenshot(path=str(OUT / f"{name}_router_result.png"))
    res_txt = pg.evaluate("(document.querySelector('#routerBody .res h3')||{}).textContent||''")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
    # booking: open the contact modal, pick a day + slot, continue
    pg.evaluate("document.querySelector('a.ask').click()"); pg.wait_for_timeout(700)
    pg.screenshot(path=str(OUT / f"{name}_book.png"))
    d = pg.query_selector_all("#bookBody .day"); s = None
    if d: d[1].click(); pg.wait_for_timeout(250); s = pg.query_selector_all("#bookBody .slot:not([disabled])")
    if s: s[0].click(); pg.wait_for_timeout(250)
    nxt = pg.query_selector("#bookBody .btn")
    if nxt: nxt.click(); pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT / f"{name}_book_form.png"))
    # application tab
    pg.click("#tab-apply"); pg.wait_for_timeout(400)
    pg.screenshot(path=str(OUT / f"{name}_apply.png"))
    modal_open = pg.evaluate("document.documentElement.classList.contains('modal-open')")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    if mobile:
        pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300)
    state = pg.evaluate("""() => ({
        ready: document.body.classList.contains('ready'),
        world: document.documentElement.className,
        badge: !document.getElementById('previewBadge').hidden,
        fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.style).filter((v,i,a)=>a.indexOf(v)===i),
        appLink: document.querySelector('a.login') ? document.querySelector('a.login').href : null,
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        h1: document.querySelector('h1').getAttribute('aria-label'),
        cur: (document.querySelector('.pill a.cur')||{}).textContent || null
    })""")
    print(f"== {name} ==")
    state['modalWorked'] = modal_open
    print(json.dumps(state, indent=1))
    print("router result:", res_txt.strip()[:80])
    print("console:", logs or "clean")
    print("external requests:", sorted(set(reqs)) or "none")
    b.close()

with sync_playwright() as pw:
    run(pw, "desktop", {"width": 1440, "height": 900})
    run(pw, "phone", {"width": 390, "height": 844}, mobile=True)
srv.shutdown()
print("screens ->", OUT)
