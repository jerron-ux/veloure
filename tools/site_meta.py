# tools/site_meta.py — robots.txt + sitemap.xml for the Veloure site. Host comes from CNAME (one source of truth).
# Run: python tools/site_meta.py   (re-run after any domain change or new page)
import pathlib, subprocess, datetime
R = pathlib.Path(__file__).resolve().parent.parent
HOST = (R / "CNAME").read_text(encoding="utf-8").strip()
PAGES = ["", "privacy-policy/", "terms/", "sms-consent/", "sms-terms/"]

def lastmod(rel):
    path = rel + "index.html" if rel else "index.html"
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", path], cwd=R, capture_output=True, text=True).stdout.strip()
    except Exception:
        out = ""
    return out or datetime.date.today().isoformat()

robots = f"User-agent: *\nAllow: /\nDisallow: /reference/\nDisallow: /screens/\nDisallow: /tools/\n\nSitemap: https://{HOST}/sitemap.xml\n"
(R / "robots.txt").write_text(robots, encoding="utf-8", newline="\n")
urls = "".join(f"  <url><loc>https://{HOST}/{p}</loc><lastmod>{lastmod(p)}</lastmod></url>\n" for p in PAGES)
sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n"
(R / "sitemap.xml").write_text(sitemap, encoding="utf-8", newline="\n")
print(f"robots.txt + sitemap.xml written for https://{HOST}/ ({len(PAGES)} urls)")
