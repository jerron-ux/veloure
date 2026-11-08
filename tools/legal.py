# legal.py — ports the four legal pages from the Orion site to VELOURÉ pages.
# Source snapshots: reference/legal-src/<slug>.html (fetched 2026-11-08). Text is kept verbatim except:
# entity/brand swapped (Jerron's ruling: VELOURÉ LLC), site-domain mentions → "this website", links made
# relative, effective date/version reset for the new entity. Contact details stay Orion's (ruling: same for
# now). Auto-reply quotes on the SMS-consent page are NOT swapped: the shared numbers still send Orion's text.
# Flagged for counsel/Eric before the real domain goes live.
# run: uv run python tools/legal.py
import re, html, pathlib

R = pathlib.Path(__file__).resolve().parent.parent
SRC = R / "reference" / "legal-src"
EFFECTIVE = "November 08, 2026"

PAGES = {
    "privacy-policy": dict(title="Privacy Policy", applies="this website, the client portal at app.orioncapitalfunding.com, and all VELOURÉ services",
                           desc="How VELOURÉ LLC collects, uses, shares and protects your information."),
    "terms":          dict(title="Terms of Use", applies="this website and our qualifier / application tools",
                           desc="The terms that cover your use of the VELOURÉ website and application tools."),
    "sms-consent":    dict(title="SMS & text messaging consent", applies="text messages sent by VELOURÉ from its business numbers",
                           desc="How subscribers opt in to text messages from VELOURÉ LLC, what we send, and how to stop."),
    "sms-terms":      dict(title="SMS Terms & Conditions", applies="text messages sent by VELOURÉ from its business numbers",
                           desc="Terms for the VELOURÉ text-messaging program: opt-in, frequency, STOP and HELP."),
}

SUBS = [
    ('Orion Capital Funding LLC (d/b/a Orion Capital Funding, "Orion Capital")', 'VELOURÉ LLC (d/b/a VELOURÉ)'),
    ('Orion Capital Funding LLC, doing business as Orion Capital Funding', 'VELOURÉ LLC, doing business as VELOURÉ'),
    ('("Orion Capital Funding," "we," "us")', '("VELOURÉ," "we," "us")'),
    ('Orion Capital Funding Funding Consultation Texts', 'VELOURÉ Funding Consultation Texts'),
    ('Orion Capital Funding LLC', 'VELOURÉ LLC'),
    ('Orion Capital Funding', 'VELOURÉ'),
    ("Orion Capital's", "VELOURÉ's"),
    ('Orion Capital', 'VELOURÉ'),
    ('orioncapital-web-consent-v3-2026-11-02', 'veloure-web-consent-v1-2026-11-08'),
    # links → relative
    ('href="https://orioncapitalfunding.com/qualify/"', 'href="../#apply"'),
    ('href="/qualify/"', 'href="../#apply"'),
    ('href="https://www.orioncapitalfunding.com/', 'href="/'),
    ('href="https://orioncapitalfunding.com/', 'href="/'),
    ('href="/privacy-policy/"', 'href="../privacy-policy/"'),
    ('href="/terms/"', 'href="../terms/"'),
    ('href="/sms-terms/"', 'href="../sms-terms/"'),
    ('href="/sms-consent/"', 'href="../sms-consent/"'),
    ('href="/"', 'href="../"'),
    # textual domain mentions (never the portal or the mailbox — handled by regex below)
    ('orioncapitalfunding.com/qualify/', 'the application form'),
    ('orioncapitalfunding.com/sms-terms/', 'this page'),
    ('orioncapitalfunding.com/privacy-policy/', 'our Privacy Policy'),
    ('www.orioncapitalfunding.com', 'this website'),
    ('orioncapitalfunding.com (the "Site")', 'this website (the "Site")'),
]

def port(slug):
    s = (SRC / f"{slug}.html").read_text(encoding="utf-8", errors="replace")
    a = re.search(r"<article[^>]*>(.*?)</article>", s, re.S).group(1)
    # protect auto-reply quotes (what the shared numbers really send)
    keep = []
    if slug == "sms-consent":
        def hold(m): keep.append(m.group(0)); return f"@@KEEP{len(keep)-1}@@"
        a = re.sub(r"<em>“(You're|VELOURÉ|Orion Capital Funding:)[^<]*”</em>", hold, a)
    for old, new in SUBS: a = a.replace(old, new)
    a = re.sub(r"(?<![@.\w/])orioncapitalfunding\.com", "this website", a)      # bare domain mentions
    a = re.sub(r"tel:\+1[\d*]+", "tel:+18889849555", a)                            # normalise tel links
    a = re.sub(r"Version [\d.]+ · Effective [A-Za-z]+ \d{1,2}, \d{4}( · Supersedes[^<]*)?\.?", f"Version 1.0 · Effective {EFFECTIVE}.", a)
    a = re.sub(r'\s*style="[^"]*"', "", a)                                         # no inline styles (CSP)
    a = a.replace('class="mono"', 'class="meta"')
    a = re.sub(r"<img[^>]*>", '<img src="../assets/consent-checkbox.png" alt="The unchecked SMS consent checkbox beside the phone number field on the VELOURÉ booking form, with Privacy Policy and SMS Terms links" loading="lazy">', a)
    a = re.sub(r'<a href="/how-were-paid/"[^>]*>(.*?)</a>', r'', a)                 # page does not exist on VELOURÉ
    a = a.replace('href="/brand/sms-optin-form.png"', 'href="../assets/consent-checkbox.png"').replace('>/brand/sms-optin-form.png<', '>assets/consent-checkbox.png<')
    for i, k in enumerate(keep): a = a.replace(f"@@KEEP{i}@@", k)
    return a.strip()

TPL = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | VELOURÉ</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#0C0D10">
<link rel="icon" href="../assets/mark.svg" type="image/svg+xml">
<link rel="icon" href="../assets/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="../assets/apple-touch-icon.png">
<link rel="stylesheet" href="../tokens.css">
<link rel="stylesheet" href="../legal.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="bg" aria-hidden="true"></div>
<nav class="nav" aria-label="Primary">
  <a href="../" class="brand" aria-label="VELOURÉ home"><img class="mark" src="../assets/mark.svg" alt="" width="34" height="37"><span class="wm">VELOURÉ</span></a>
  <a class="back" href="../">← Back to the site</a>
</nav>
<main id="main">
  <header class="legal-head">
    <div class="lab">Legal</div>
    <h1>{title}</h1>
    <dl class="meta-row">
      <div><dt>Effective</dt><dd>{effective}</dd></div>
      <div><dt>Applies to</dt><dd>{applies}</dd></div>
      <div><dt>Company</dt><dd>VELOURÉ LLC, doing business as VELOURÉ</dd></div>
    </dl>
  </header>
  <article class="legal">
{body}
  </article>
  <nav class="legal-links" aria-label="Legal pages">
    <a href="../privacy-policy/">Privacy policy</a><a href="../terms/">Terms of use</a><a href="../sms-consent/">SMS consent</a><a href="../sms-terms/">SMS terms</a>
  </nav>
</main>
<footer>
  <p class="disclaimer"><b>Disclaimer.</b> VELOURÉ LLC, doing business as VELOURÉ, is a business funding brokerage. We are not a lender, we are not an investment adviser, and we do not offer or sell securities or investments. We do not guarantee funding approval, amounts, terms, or timelines. Approval, amounts, and terms are decided by lenders based on their own criteria and your individual circumstances. Nothing on this site is an offer or approval of credit.</p>
  <p class="copy">© 2026 VELOURÉ LLC. All rights reserved.</p>
</footer>
</body>
</html>
"""

for slug, meta in PAGES.items():
    out = R / slug / "index.html"; out.parent.mkdir(exist_ok=True)
    body = port(slug)
    out.write_text(TPL.format(title=meta["title"], desc=meta["desc"], applies=meta["applies"], effective=EFFECTIVE, body=body), encoding="utf-8")
    left = re.findall(r"Orion[^<]{0,40}", body)
    print(f"{slug}: {len(body):,} chars, residual 'Orion' mentions: {len(left)} {left[:3]}")
