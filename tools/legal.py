# legal.py — ports the four legal pages from the Orion site to VELOURÉ pages.
# Source snapshots: reference/legal-src/<slug>.html (fetched 2026-11-08). Text is kept verbatim except:
# entity/brand swapped (Jerron's ruling: VELOURÉ LLC), site-domain mentions → "this website", links made
# relative, effective date/version reset for the new entity. Phone stays Orion's (same for now); email = support@veloure.com
# PLACEHOLDER (ruling 2026-11-17, no mailbox yet). Auto-reply quotes on the SMS-consent page are NOT swapped: the shared numbers still send Orion's text.
# Flagged for counsel/Eric before the real domain goes live.
# run: uv run python tools/legal.py
import re, html, pathlib

R = pathlib.Path(__file__).resolve().parent.parent
SRC = R / "reference" / "legal-src"
if not SRC.exists(): SRC = pathlib.Path("C:/Users/jerro/Documents/Orion/veloure-site/reference/legal-src")  # worktrees: sources are git-ignored, read the main checkout
EFFECTIVE = "November 08, 2026"
HOST = (R / "CNAME").read_text(encoding="utf-8").strip()   # canonical host, one source of truth

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
    ('orioncapital-web-consent-v3-2026-11-02', 'veloure-web-consent-v2-2026-11-17'),
    ('session storage for your day/night display preference', 'local storage on your device for your light/dark display preference (it stays until you clear your browser data and is never sent to us)'),  # theme toggle (ruling 2026-11-18)
    ('support@orioncapitalfunding.com', 'support@veloure.com'),   # placeholder email (ruling 2026-11-17); quoted auto-replies are held out by `keep` in port()
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
    # protect auto-reply quotes (what the shared numbers really send). Source uses &ldquo;/&rdquo; entities and wraps "Orion\nCapital".
    keep = []
    if slug == "sms-consent":
        def hold(m): keep.append(m.group(0)); return f"@@KEEP{len(keep)-1}@@"
        a = re.sub(r"<em>(?:“|&ldquo;)(You're|VELOURÉ|Orion\s+Capital Funding:)[^<]*(?:”|&rdquo;)</em>", hold, a)
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
<link rel="canonical" href="{canon}">
<meta name="theme-color" content="#F4F1EB">
<script>(function(){{var t='light';try{{t=localStorage.getItem('veloure-theme')==='dark'?'dark':'light'}}catch(e){{}}var h=document.documentElement;h.setAttribute('data-theme',t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',t==='dark'?'#1C1C1C':'#F4F1EB')}})();</script>
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
  <a href="../" class="brand" aria-label="VELOURÉ home"><img class="mark" src="../assets/mark.svg" alt="" width="48" height="34"><span class="wm">VELOURÉ</span></a>
  <div class="nav-r"><a class="back" href="../">← Back to the site</a><button class="theme" id="themeBtn" type="button" aria-pressed="false" aria-label="Switch to dark theme"><svg class="moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg><svg class="sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg></button></div>
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
<script>(function(){{var b=document.getElementById('themeBtn'),h=document.documentElement;if(!b)return;function sync(){{var d=h.getAttribute('data-theme')==='dark';b.setAttribute('aria-pressed',d?'true':'false');b.setAttribute('aria-label',d?'Switch to light theme':'Switch to dark theme');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#1C1C1C':'#F4F1EB')}}b.addEventListener('click',function(){{var d=h.getAttribute('data-theme')!=='dark';h.setAttribute('data-theme',d?'dark':'light');try{{localStorage.setItem('veloure-theme',d?'dark':'light')}}catch(e){{}}sync()}});sync()}})();</script>
</body>
</html>
"""

for slug, meta in PAGES.items():
    out = R / slug / "index.html"; out.parent.mkdir(exist_ok=True)
    body = port(slug)
    out.write_text(TPL.format(title=meta["title"], desc=meta["desc"], applies=meta["applies"], effective=EFFECTIVE, body=body, canon=f"https://{HOST}/{slug}/"), encoding="utf-8")
    left = re.findall(r"Orion[^<]{0,40}", body)
    print(f"{slug}: {len(body):,} chars, residual 'Orion' mentions: {len(left)} {left[:3]}")
