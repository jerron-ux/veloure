# world_check.py — renders the world headless (software WebGL), reports console errors, world/loader
# state, and screenshots the hero + three journey positions. run: uv run --with playwright python tools/world_check.py
import pathlib, http.server, threading, socketserver, functools, json, sys
from playwright.sync_api import sync_playwright

R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / "screens"; OUT.mkdir(exist_ok=True)
PORT = 8793
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
class Srv(socketserver.TCPServer): allow_reuse_address = True
srv = Srv(("127.0.0.1", PORT), functools.partial(Quiet, directory=str(R)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{PORT}/"
W = int(sys.argv[1]) if len(sys.argv) > 1 else 1440
H = int(sys.argv[2]) if len(sys.argv) > 2 else 900
tag = sys.argv[3] if len(sys.argv) > 3 else "world"

with sync_playwright() as pw:
    b = pw.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
    ctx = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=1, is_mobile=W < 600, has_touch=W < 600)
    pg = ctx.new_page()
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    pg.on("pageerror", lambda e: logs.append("pageerror: " + str(e)))
    pg.goto(URL); pg.wait_for_timeout(5000)
    pg.screenshot(path=str(OUT / f"{tag}_hero.png"))
    st = pg.evaluate("""() => ({
      loaded: document.documentElement.classList.contains('loaded'),
      worldOn: document.documentElement.classList.contains('world-on'),
      noWorld: document.documentElement.classList.contains('no-world'),
      loaderGone: !document.getElementById('loader'),
      canvas: (c => c ? [c.width, c.height] : null)(document.getElementById('world')),
      fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v,i,a)=>a.indexOf(v)===i),
      scrollH: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      pill: (document.querySelector('.pill')||{}).offsetHeight,
    })""")
    print(json.dumps(st, indent=1))
    h = st["scrollH"]
    for i, f in enumerate([0.16, 0.3, 0.45, 0.62, 0.78, 0.95], 1):
        pg.evaluate(f"window.scrollTo(0, {int((h - H) * f)})"); pg.wait_for_timeout(2600)
        pg.screenshot(path=str(OUT / f"{tag}_{i}.png"))
    print("console:", logs or "clean")
    b.close()
srv.shutdown()
print("screens ->", OUT)
