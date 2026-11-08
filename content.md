# VELOURÉ — site copy (single source of truth)

Carried over from the Orion funnel page (orioncapitalfunding.com, snapshot 2026-11-07) with the brand name
swapped. Lines marked **[PENDING]** depend on answers from Jerron and must not ship as-is.

## Brand
- Name: **VELOURÉ** (wordmark, Roman serif — brand sheet says "Aston Roman"; Cinzel 500 is the stand-in)
- Descriptor on the brand board: "MOTOR GROUP" — **[PENDING]** Lovable build dropped it; confirm.
- Mark: chrome shield, navy glossy face, silver serif V — `assets/mark.svg`

## Meta
- Title: `VELOURÉ | Business Funding & Buildout`
- Description: `VELOURÉ is a US business funding brokerage. We help business owners build a fundable business and get matched with the right lenders.`
- Canonical / og:url / og:image host: **[PENDING domain]**
- JSON-LD FinancialService: name, legalName, address, telephone, email — **[PENDING entity + contact]**

## Nav
Logo lockup · What we do (#what) · Find your path (#router) · How it works (#how) · Who we help (#fit) · Blog (/blog/) **[PENDING: keep blog?]** · Client login (portal URL **[PENDING]**) · CTA "Book a call →" (#contact)
Phone sheet footer: Blog · Client login → · phone **[PENDING]**

## Hero
- Eyebrow: `Funding brokerage · Business buildout · US`
- H1 (four lines): `Get funded.` / `Build a business` / `lenders take` / `seriously.` — lines 3–4 in accent
- Sub: `VELOURÉ is a US business funding brokerage. We help entrepreneurs and business owners set up a fundable business and get matched with the right lenders — guided by real people, not guesswork.`
- Buttons: `Talk to an advisor →` (#contact) · `Start an application` (#apply)
- "What are you looking for?": `Business funding` (#what) · `Personal funding` (#what) · `Business buildout` (#what) · `Not sure yet — find your path` (#router)
- At a glance: Model — `Brokerage — we match, we don't lend` · Services — `Funding · Business buildout` · Your file — `One real person, start to finish` · To talk — `No fee · No obligation` · Reply — `Within one business day`

## 01 — What we do (#what)
- H2: `Two services.` / `One plan built around your situation.`
- Lede: `Some clients need both. Some need one. We start by working out which — then we do the work with you and keep you in the loop the whole way.`
- Service 01 — **Business & Personal Funding**: `We're a brokerage — we don't lend, we match. We review your profile, package your file the way lenders want to see it, and connect you with funding options that fit. You make every final call.`
  Note (verbatim): `We are not a lender. Approval, amounts, and terms are decided by lenders based on their own criteria.`
- Service 02 — **Business Buildout**: `Lenders fund businesses that look fundable. We help you set up the entity, structure, and paperwork lenders expect — so when it's time to apply, your business is ready.`
  Note: `Entity setup, business credit profile, documentation and banking structure — the groundwork most applications fail on.`

## 02 — Find your path (#router)
- H2: `Where do you stand right now?`
- Lede: `Four quick questions. No email required, nothing saved. You'll get an honest read on where you'd start — and what tends to come first.`
- Plate header: pulsing dot · `Path finder` · 4-segment progress `.prog` · mount `#routerBody` (quiz injected by main.js)
- Honeypot (off-screen, aria-hidden): `<label for="hp_field">Company website</label><input id="hp_field" name="company_website" type="text" tabindex="-1" autocomplete="off">`

## 03 — How it works (#how)
- H2: `Getting funded isn't luck.` / `It's preparation.`
- Lede: `Three stages, in order. You'll always know which one you're in.`
- Stage 01 — **Initial consultation**: `We start with a conversation about where you are today — your goals, your business, and your numbers. No fee, no pressure, no obligation to continue.`
- Stage 02 — **Your plan**: `We map out a clear plan across whichever areas apply to you — business setup and funding. You'll know what we're doing and why at every step.`
- Stage 03 — **We get to work**: `We put the plan into action: structuring your business, assembling your documentation, and preparing your file for lenders. Regular updates, and a real person to talk to.`
- Aside — **What it is not**: `Not a lender. Not an overnight fix. Not a guaranteed number. A structured process, with a person on your file who answers the phone.`

## 04 — Who we help (#fit)
- H2: `You're in the right place if you're…`
- `A business owner or entrepreneur looking for funding`
- `Setting up a business and want it structured to qualify`
- `Someone who wants a clear plan and a real person guiding it`
- Plate — **Straight talk**: `We'll be straight with you: getting funded takes preparation and time, and results depend on your situation. If you want an overnight fix or a guaranteed number, we're not the right firm. If you want a clear, structured process, we'd like to help.`

## 05 — Talk to an advisor (#contact)
- H2: `Let's talk about your next step.`
- Lede: `Tell us a bit about your goals and we'll get back to you within one business day. There's no fee to talk, and no obligation.`
- Startbox tabs: `Talk to an advisor` / `15 minutes, no fee` (mount `#bookBody`) · `Start an application` / `About 3 minutes` (`#appBar` + `#appBody`)
- Aside: portal card `Already a client?` / `Log in to your portal to track your file, upload documents, and message your specialist.` / `Client portal login →` **[PENDING portal URL]**
  Call us **[PENDING]** · Email **[PENDING]** · Business address **[PENDING entity + address]** · Hours `Monday – Friday, 9am – 5pm CT` / `We reply within one business day.`

## Footer
- Brand blurb: `A US business funding brokerage helping business owners build fundable businesses and get matched with the right lenders.`
- Explore: What we do · Find your path · How it works · Talk to an advisor · Start an application · Blog
- Company: phone · email · Client login — **[PENDING]**
- Legal: Privacy policy (/privacy-policy/) · Terms & conditions (/terms/) · SMS consent (/sms-consent/) · SMS terms (/sms-terms/) — pages **[PENDING: re-issue under the new entity]**
- Disclaimer **[PENDING entity — currently reads]**: `Disclaimer. Orion Capital Funding LLC, doing business as Orion Capital Funding, is a business funding brokerage. We are not a lender, we are not an investment adviser, and we do not offer or sell securities or investments. We do not guarantee funding approval, amounts, terms, or timelines. Approval, amounts, and terms are decided by lenders based on their own criteria and your individual circumstances. Nothing on this site is an offer or approval of credit.`
- © line **[PENDING entity]** · `Built for clarity, not hype.`

## In main.js (not page copy, but brand-bearing) — all **[PENDING entity / contact]**
- `CONSENT_TEXT` names "Orion Capital (Orion Capital Funding LLC)", (888) 984-9555, support@orioncapitalfunding.com; `CONSENT_VERSION orioncapital-web-consent-v3-2026-11-02`
- `TERMS_TEXT` / `TERMS_VERSION orioncapital-web-terms-v1-2026-10-14`
- Endpoints: `app.orioncapitalfunding.com/api/apps/6abd3872a2920c3cae83d45b/functions/{publicIntake,bookingSlots,bookingCreate,siteBeacon,webJourneyEvent}`
- `LIVE` host regex: `orioncapitalfunding.com` → must include the VELOURÉ domain
