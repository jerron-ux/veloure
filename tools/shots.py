# shots.py — renders brand/site stills from the real pages: the Open Graph image (1200×630) and the
# SMS-consent checkbox capture that /sms-consent/ links to. run: uv run --with playwright python tools/shots.py
import pathlib, http.server, threading, socketserver, functools
from playwright.sync_api import sync_playwright

R = pathlib.Path(__file__).resolve().parent.parent
PORT = 8794
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class Srv(socketserver.TCPServer): allow_reuse_address = True
srv = Srv(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(R)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/"
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]

with sync_playwright() as pw:
    b = pw.chromium.launch(args=ARGS)
    # OG image: hero at 1200x630, no nav chrome, after the intro settles
    pg = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    pg.goto(URL); pg.wait_for_timeout(3600)
    pg.add_style_tag(content=".preview-badge,.pill,.login,.nav .btn-sm,.hero-foot{display:none!important}.nav{position:absolute;height:84px}.hero{padding-top:70px!important;min-height:630px!important;grid-template-rows:1fr}.hero-copy{padding:0!important}.hero h1{font-size:72px!important}.hero-sub{display:none}.hero-cta{display:none}.shield{width:400px!important}")
    pg.wait_for_timeout(800)
    pg.screenshot(path=str(R / "assets" / "og-image.jpg"), type="jpeg", quality=88, clip={"x": 0, "y": 0, "width": 1200, "height": 630})
    pg.close()
    # consent checkbox: booking form after picking a slot
    pg = b.new_page(viewport={"width": 1100, "height": 1400}, device_scale_factor=2)
    pg.goto(URL); pg.wait_for_timeout(2500)
    pg.evaluate("window.scrollTo({top: document.getElementById('contact').getBoundingClientRect().top + window.scrollY - 70, behavior:'instant'})"); pg.wait_for_timeout(800)
    days = pg.query_selector_all("#bookBody .day"); days[1].click(); pg.wait_for_timeout(300)
    slots = pg.query_selector_all("#bookBody .slot:not([disabled])"); slots[0].click(); pg.wait_for_timeout(300)
    pg.query_selector("#bookBody .btn").click(); pg.wait_for_timeout(600)
    pg.fill("#bookBody input[type=tel], #bookBody input[name=phone], #bookBody #bphone", "") if pg.query_selector("#bookBody input[type=tel], #bookBody input[name=phone], #bookBody #bphone") else None
    box = pg.query_selector("#bookBody .check")
    tel = pg.query_selector("#bookBody input[type=tel]")
    top = (tel.bounding_box()["y"] - 70) if tel else (box.bounding_box()["y"] - 60)
    bb = box.bounding_box()
    sb = pg.query_selector(".startbox").bounding_box()
    pg.screenshot(path=str(R / "assets" / "consent-checkbox.png"), clip={"x": sb["x"], "y": top, "width": sb["width"], "height": bb["y"] + bb["height"] + 24 - top})
    print("ok: assets/og-image.jpg, assets/consent-checkbox.png")
    b.close()
srv.shutdown()
