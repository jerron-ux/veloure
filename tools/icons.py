# icons.py — builds the PNG icon set from assets/favicon.svg and the 1200x630 share image from the brand
# lockup render. run: uv run --with "playwright==1.64.0" --with pillow python tools/icons.py
# (Playwright 1.64 matches the Chromium build installed on this PC.)
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

R = pathlib.Path(__file__).resolve().parent.parent
A = R / "assets"
BG = "#0C0D10"                                   # site theme colour
svg = (A / "favicon.svg").read_text(encoding="utf-8")

with sync_playwright() as p:
    b = p.chromium.launch()
    # (size, file, opaque background?) — Apple touch icons cannot be transparent (iOS paints black), so fill it.
    for size, name, opaque in [(32, "favicon-32.png", False), (180, "apple-touch-icon.png", True), (512, "icon-512.png", False)]:
        pg = b.new_page(viewport={"width": size, "height": size}, device_scale_factor=1)
        pad = round(size * 0.06) if opaque else 0  # a little breathing room inside the rounded iOS tile
        inner = size - 2 * pad
        s = svg.replace('width="350" height="350"', f'width="{inner}" height="{inner}"')
        bg = BG if opaque else "transparent"
        pg.set_content(f"<html><body style='margin:0;background:{bg};display:flex;justify-content:center;align-items:center;width:{size}px;height:{size}px'>{s}</body></html>")
        pg.screenshot(path=str(A / name), omit_background=not opaque)
        pg.close()
        print("wrote", name, size, "px", "(opaque)" if opaque else "(transparent)")
    b.close()

# share image: the lockup render scaled 1024x572 -> 1200x670 and centre-cropped to 1200x630 (no seams)
src = R / "reference" / "brand" / "veloure-funding-lockup.png"
if src.exists():
    im = Image.open(src).convert("RGB").resize((1200, 670), Image.Resampling.LANCZOS)
    im = im.crop((0, 20, 1200, 650))
    im.save(A / "og.png", optimize=True)
    print("wrote og.png", im.size, f"{(A / 'og.png').stat().st_size // 1024} KB")
else:
    print("skip og.png — reference/brand/veloure-funding-lockup.png not on this machine")
