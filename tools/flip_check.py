# flip_check.py — screenshots cards mid-flip at chosen scroll progress values. run: uv run --with playwright python tools/flip_check.py
import pathlib, http.server, threading, socketserver, functools
from playwright.sync_api import sync_playwright
R = pathlib.Path(__file__).resolve().parent.parent
PORT = 8795
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class Srv(socketserver.TCPServer): allow_reuse_address = True
srv = Srv(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(R)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
with sync_playwright() as pw:
    b = pw.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(f"http://127.0.0.1:{PORT}/"); pg.wait_for_timeout(2500)
    def shoot(sel, p, name):
        # scroll so the card's top sits where progress == p  (top = vh*(0.98 - p*0.56))
        pg.evaluate("""([sel,p]) => { const el = document.querySelector(sel); const vh = innerHeight;
            const target = vh*(0.98 - p*0.56); window.scrollTo({top: el.getBoundingClientRect().top + scrollY - target, behavior:'instant'}); }""", [sel, p])
        pg.wait_for_timeout(500)
        info = pg.evaluate("sel => { const el = document.querySelector(sel); return {transform: el.style.transform, flipped: el.classList.contains('flipped'), top: Math.round(el.getBoundingClientRect().top)} }", sel)
        pg.screenshot(path=str(R / "screens" / f"flip_{name}.png")); print(name, info)
    shoot(".svc-a .plate", 0.30, "svc_030")
    shoot(".svc-a .plate", 0.62, "svc_062")
    shoot(".svc-a .plate", 1.0, "svc_100")
    shoot("#routerBox", 0.45, "router_045")
    shoot(".startbox", 0.35, "start_035")
    shoot(".portal", 0.5, "portal_050")
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.evaluate("window.scrollTo({top: 0, behavior:'instant'})"); pg.wait_for_timeout(300)
    print("errors:", errs)
    b.close()
srv.shutdown()
