# VELOURÉ — public site (production source)

Rebrand of the Orion funnel site under the VELOURÉ shield brand. Built here, not in Lovable
(Lovable project "Screenshot Perfect" 344d182f… stays as the colour/copy reference only).

## Decisions (2026-11-08, Jerron: "full control, figure it out")
- **Stack:** static HTML + CSS + vanilla JS, no framework, no build step, no third-party scripts/fonts.
  Reason: the live Orion site runs under CSP `script-src 'self'; font-src 'self'` and the intake/booking
  logic is a vendored IIFE — a static site keeps both, and ships from any static host.
- **Colour:** the Lovable build's palette (black / sky-blue / silver / white, taken from the logo) → `tokens.css`.
- **Style / layout:** set by the Instagram reference Jerron sends (pending) — not the particle "Active Theory"
  posture of the earlier prototypes unless the reel says so.
- **Hosting target:** Cloudflare Pages (static) with `_headers` carrying the Orion CSP, HSTS, nosniff. Domain TBD.
- **Business logic:** `main.js` = the Orion IIFE ported verbatim (path finder, booking, application, consent
  text/versions, attribution, journey beacons) behind `LIVE`; off the production host everything is simulated
  and a "PREVIEW — FORMS NOT LIVE" badge shows.

## Files
| path | what |
|---|---|
| `tokens.css` | colour / layout tokens (type tokens come with the style) |
| `content.md` | every line of copy, with **[PENDING]** marks on entity/contact/domain-dependent lines |
| `main.js` | vendored business logic — still carries Orion contact/entity/endpoint values (pending) |
| `assets/mark.svg` | the shield mark as vector (chrome rim, navy face, silver serif V); `favicon-32.png`, `apple-touch-icon.png`, `icon-512.png` rendered from it |
| `assets/fonts/` | archivo-var, plexmono-400/500, cinzel-500 (woff2) — starting set, swapped per style |
| `tools/render_mark.py` | renders the mark beside the brand board at 300/96/40/24 px + lockups → `tools/mark-check.png`; writes the favicon set |
| `tools/reel.py` | `uv run python tools/reel.py <instagram url or video file> [fps]` → `reference/<name>/frames`, `sheet-N.png` |
| `reference/` | reel frames (DcLmjeZK1b2 = activetheory.net filmed on a laptop; the earlier reference) |

## Open items (blockers for shipping, not for building)
1. Style reference reel from Jerron → defines type, layout, motion.
2. ~~Legal entity~~ **Ruled 2026-11-08: VELOURÉ LLC.** Still needed: registered address if it differs from 30 N Gould St #11979, Sheridan WY ("same as Orion for now").
3. ~~Contact details~~ **Ruled: same as Orion for now** — phone (888) 984-9555, support@orioncapitalfunding.com. Site domain still unnamed.
4. ~~Wordmark~~ **Ruled: "VELOURÉ" only, no "Motor Group".**
5. Backend: **the app is moving to a new domain (unnamed yet)** → `CONFIG.appOrigin` + `CONFIG.siteHosts` in `main.js`, one edit.
6. Legal sub-pages (/privacy-policy/ /terms/ /sms-consent/ /sms-terms/) re-issued under VELOURÉ LLC; the SMS consent text is now `veloure-web-consent-v1-2026-11-08` (same clauses, entity swapped) — **Eric-gated** compliance wording.
7. "Aston Roman" font file (Cinzel is the stand-in). Going live on a public property is Eric-gated per the handbook.
