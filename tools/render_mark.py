# render_mark.py — renders assets/mark.svg at several sizes on the site background next to the
# brand-board original, so the vector can be checked by eye; also writes the favicon PNG set.
# run: uv run --with playwright python tools/render_mark.py
import pathlib, base64, sys
from playwright.sync_api import sync_playwright

R = pathlib.Path(__file__).resolve().parent.parent
svg = (R / "assets" / "mark.svg").read_text(encoding="utf-8")
ref = pathlib.Path(r"C:\Users\jerro\AppData\Roaming\Hermes\composer-images\WhatsApp_Image_2026-11-07_at_11.17.05_PM_5017e3.jpg")
ref_uri = "data:image/jpeg;base64," + base64.b64encode(ref.read_bytes()).decode() if ref.exists() else ""
fonts = (R / "assets" / "fonts")
cinzel = fonts / "cinzel-500.woff2"
cinzel_uri = "data:font/woff2;base64," + base64.b64encode(cinzel.read_bytes()).decode() if cinzel.exists() else ""

html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Cinzel;src:url({cinzel_uri}) format('woff2');font-weight:500}}
body{{margin:0;background:#0C0D10;color:#F3F5F5;font-family:system-ui;padding:32px;width:1360px}}
.row{{display:flex;align-items:center;gap:48px;margin-bottom:40px}}
.ref{{width:300px;height:310px;overflow:hidden;position:relative;border:1px solid #333}}
.ref img{{position:absolute;left:-620px;top:-320px;width:1536px}}
.lab{{font:11px/1 ui-monospace,monospace;letter-spacing:.16em;text-transform:uppercase;color:#B8B9BC;margin-bottom:12px}}
.lock{{display:flex;align-items:center;gap:14px}}
.wm{{font:500 28px Cinzel,serif;letter-spacing:.18em;color:#F3F5F5}}
.wm small{{display:block;font:500 10px Cinzel,serif;letter-spacing:.42em;color:#A8CDE0;margin-top:6px}}
.white{{background:#FFFFFF;padding:24px;border-radius:4px}}
</style></head><body>
<div class="row">
  <div><div class="lab">Brand board (raster)</div><div class="ref"><img src="{ref_uri}"></div></div>
  <div><div class="lab">mark.svg @ 300px</div><div style="width:300px">{svg.replace('width="100" height="110"', 'width="300" height="330"')}</div></div>
  <div><div class="lab">@ 96 / 40 / 24 px</div><div class="lock">{svg.replace('width="100" height="110"', 'width="96" height="106"')}{svg.replace('width="100" height="110"', 'width="40" height="44"')}{svg.replace('width="100" height="110"', 'width="24" height="26"')}</div>
   <div class="lab" style="margin-top:28px">Nav lockup</div><div class="lock">{svg.replace('width="100" height="110"', 'width="34" height="37"')}<span class="wm">VELOURÉ</span></div>
   <div class="lab" style="margin-top:28px">Stacked lockup</div><div class="lock" style="flex-direction:column;align-items:center;gap:10px">{svg.replace('width="100" height="110"', 'width="64" height="70"')}<span class="wm" style="text-align:center">VELOURÉ<small>— MOTOR GROUP —</small></span></div>
  </div>
  <div><div class="lab">On white</div><div class="white">{svg.replace('width="100" height="110"', 'width="120" height="132"')}</div></div>
</div>
</body></html>"""

out = R / "tools" / "mark-check.html"
out.write_text(html, encoding="utf-8")
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1424, "height": 520}, device_scale_factor=2)
    pg.goto(out.as_uri())
    pg.wait_for_timeout(600)
    pg.screenshot(path=str(R / "tools" / "mark-check.png"), full_page=True)
    # favicon set, transparent background
    for size, name in [(32, "favicon-32.png"), (180, "apple-touch-icon.png"), (512, "icon-512.png")]:
        pg2 = b.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
        s = svg.replace('width="100" height="110"', f'width="{size*100/110:.2f}" height="{size}"')
        pg2.set_content(f"<html><body style='margin:0;background:transparent;display:flex;justify-content:center;align-items:center;width:{size}px;height:{size}px'>{s}</body></html>")
        pg2.screenshot(path=str(R / "assets" / name), omit_background=True)
        pg2.close()
    b.close()
print("wrote", R / "tools" / "mark-check.png")
