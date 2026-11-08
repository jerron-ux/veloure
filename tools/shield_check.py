# shield_check.py — renders shield.js alone (3 moments + a phone size) so the 3D object can be tuned.
# run: uv run --with playwright python tools/shield_check.py
import pathlib, http.server, threading, socketserver, functools
from playwright.sync_api import sync_playwright

R = pathlib.Path(__file__).resolve().parent.parent
html = """<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;background:#0C0D10;display:flex;gap:40px;align-items:center;justify-content:center;height:100vh}
#shield{position:relative;width:520px;height:572px}
#shield canvas{width:100%;height:100%;display:block}
#shield .still{display:none;width:100%;height:100%}
#shield.fallback canvas{display:none}#shield.fallback .still{display:block}
.glow{position:absolute;inset:-20%;background:radial-gradient(40% 40% at 50% 58%,rgba(168,205,224,.22),transparent 70%);z-index:-1}
</style></head><body>
<div id="shield"><div class="glow"></div><canvas></canvas><img class="still" src="/assets/mark.svg" alt=""></div>
<script src="/shield.js"></script></body></html>"""
(R / "tools" / "shield-check.html").write_text(html, encoding="utf-8")

PORT = 8791
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(R))
class Q(socketserver.TCPServer): allow_reuse_address = True
srv = Q(("127.0.0.1", PORT), handler); threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1200, "height": 700}, device_scale_factor=1)
    logs = []
    pg.on("console", lambda m: logs.append(m.type + ": " + m.text)); pg.on("pageerror", lambda e: logs.append("pageerror: " + str(e)))
    pg.goto(f"http://127.0.0.1:{PORT}/tools/shield-check.html")
    pg.wait_for_timeout(700); pg.screenshot(path=str(R / "tools" / "shield-0.7s.png"))
    pg.wait_for_timeout(2300); pg.screenshot(path=str(R / "tools" / "shield-3s.png"))
    pg.mouse.move(1000, 150); pg.wait_for_timeout(1500); pg.screenshot(path=str(R / "tools" / "shield-mouse.png"))
    print("class:", pg.evaluate("document.getElementById('shield').className"), "| canvas:", pg.evaluate("[document.querySelector('#shield canvas').width, document.querySelector('#shield canvas').height]"))
    print("logs:", logs)
    b.close()
srv.shutdown()
