# Crowd Conscious — Refined Strategy (April 2026)

**Context inputs:** `docs/PLATFORM-FULL-AUDIT-2026-04-16.md`, live site walkthrough of `www.crowdconscious.app` (home, `/sponsor→/pulse`, `/predictions`, `/locations`), and the **April 16, 2026 CEO digest**.

**Runway anchor:** **~56 days to Estadio Azteca kickoff (Jun 11, 2026).** Every decision below is filtered through this.

---

## 0. One-page reality check

| Metric (from CEO digest + live site) | Value | Interpretation |
|---|---|---|
| Registered users | **251–258** | Near-flat growth; +0 in last 24h. |
| Daily active predictors | **3 registered + 6 anonymous** | Anonymous outpaces registered by 2×. |
| **Anonymous → registered conversion (30d)** | **0%** | Funnel is broken, not low. |
| Active markets | **43** | **~23% have 0 predictions** — catalog inflation. |
| Top market | **"¿Es Club Reset un lugar Consciente?" — 18 votes** | Local, place-based, community-recognizable. |
| Conscious Fund balance | **$0 MXN** | The core proof is not proven. |
| Inbox submissions (pending/new) | **0 / 0** | Community-led market creation is dormant. |
| Sponsor report last run | **Skipped Apr 1 (no active cycle)** | No paying sponsor in last cycle. |
| Agents health | **All green, 0 errors in 24h** | Infra is not the bottleneck. |

**Conclusion:** The platform **works**; the **product hasn't found its wedge**. The wedge is visible in the data — **place-based, locally-anchored markets** (Club Reset) — not generic aspirational ones (Artemis, Golden Boot).

---

## 1. What is genuinely working

1. **Conscious Locations as a format.** The clearest IA on the site (swipe + confidence + score after 10 votes + perks). Three seeded places, and the top market across the entire platform is a location market. **This is the wedge.**
2. **Conscious Pulse positioning.** Public pricing ($5K / $12K / $20K / Custom MXN), clear differentiation vs. surveys/focus groups, "First consultation free for new clients." Reads like a real B2B product.
3. **Technical foundation.** Next.js 15, Supabase RLS, modular Stripe webhooks, 5 functional AI agents with DB logging, `cron_job_runs` health table. Build passes cleanly. **Engineering is ahead of product-market fit.**
4. **AI agent layer is operational.** CEO digest you're reading is the proof: daily, structured, actionable. News monitor already feeding actionable signals (Afores crisis, subsidios de gasolina, ESG Mundial).
5. **World Cup framing on the landing.** Countdown, CDMX anchor, Estadio Azteca. Strong emotional hook.
6. **Anonymous voting works.** 6 anonymous voters/day vs. 3 registered proves frictionless voting is possible and used.
7. **Free-to-play + democratic giving narrative.** The positioning (prediction + impact) is genuinely differentiated from Polymarket/Kalshi.

---

## 2. What to clean up or remove — immediately

### 2.1 Kill the login gate on `/predictions`
- **Observed:** `https://www.crowdconscious.app/predictions` redirects to `/login`.
- **Consequence:** New visitors cannot explore the main product. This **is** the 0% conversion problem.
- **Action:** Let `/predictions` render the feed for anonymous users (the anonymous vote system already exists — see migrations `147_guest_market_votes.sql`, `158_anonymous_alias_system.sql`, `169_xp_anonymous_resolution…`, `190_alias_vote_conscious_locations.sql`). Show a **"Claim your XP"** CTA after the **first anonymous vote**, not before.

### 2.2 Broken `/communities` links
- Audit finding: no `app/communities` pages exist, yet several components link there (`SimpleDashboard`, `CommunityCarousel`, `NotificationSystem`, `AdminDashboardClient`).
- **Action:** Either remove the links, 301-redirect `/communities*` → `/locations`, or rebuild a simple `/communities` page that is literally the Locations listing (if that is the intent).

### 2.3 Landing-page hygiene
- **Mixed language**: Spanish hero, English nav (`Markets`, `Leaderboard`, `Sponsor`, `About`, `Sponsors`, `Contact`). Pick one per locale and stick with it.
- **Disabled "Subscribe" button** on newsletter form (observed twice on the landing and in footer). Either fix the handler or remove the form until it works.
- **Duplicate newsletter block** in page body and footer.
- **Two "ES/EN" toggles** in the footer area.
- **Featured markets with 0% bars and 1–2 votes** (Golden Boot, Colombia semifinals) appear on the landing. **Hide any market with <5 votes** from public surfaces. Zero-vote bars are anti-social-proof.
- **"Sponsor" in top nav** redirects to `/pulse`. Rename the nav link to **"For Brands"** or **"Pulse"** so the destination matches the label.

### 2.4 Market catalog pruning
- **10 markets with 0 predictions** (23% of catalog). Archive or refocus them.
- **Rule of thumb pre-Mundial:** if a market hasn't earned a vote in 7 days, it either gets rewritten, promoted in an email, or archived. Dead markets make every other market look dead.

### 2.5 Documentation sprawl
- ~130 `.md` files in the repo root. From this audit forward, treat **`vercel.json` + `docs/PLATFORM-FULL-AUDIT-2026-04-16.md` + this file** as canonical. Move the rest to `docs/archives/` (most are already duplicated there).

### 2.6 Operational leftovers surfaced by the audit
- `docs/AGENTS-CRON-SETUP.md` lists 9:00 UTC for daily agents; real schedules are 14:00–16:00 UTC. Update.
- `monthly-impact` has `maxDuration` in `vercel.json` but is **not in the `crons` array** — confirm whether it actually ships.
- Admin `run-agent` switch is missing `sponsor-report`; add it so you can trigger it on demand.

---

## 3. Refined strategic thesis

> **Crowd Conscious is not a Polymarket clone. It is a sentiment + trust layer for places, causes, and cultural moments — monetized via Conscious Pulse (B2B) and Conscious Locations (B2B2C), anchored by free-to-play predictions for distribution.**

Three product surfaces, in priority order:

1. **Conscious Locations** — Acquisition engine. Local, shareable, sticky. (Club Reset proves this.)
2. **Conscious Pulse** — Revenue engine. Municipalities, brands, influencers. Priced in MXN.
3. **Free predictions + Conscious Fund** — Narrative engine. Converts the above into brand trust via democratic giving.

Predictions are **not** the revenue product — they are the **top of funnel** and the **narrative glue** that makes Pulse defensible vs. Typeform / Google Forms / Polymarket.

---

## 4. What to explore (next 56 days)

### 4.1 Weaponize Locations before the Mundial

- **Goal:** 25 Conscious Locations in CDMX by June 11.
- Seed path: the 3 existing (Club Reset, Magenta, Cabra de Monte) already link to their Instagram → reach out, get them to post a story asking their followers to vote. Each location that crosses 10 votes unlocks the **Conscious Score** on the card, which is share-worthy content.
- Every location is effectively **a free, reusable landing page** for acquisition, and **a warm lead** for Conscious Pulse (they already trust the brand).

### 4.2 "Mundial Pulse" productization

Bundle a World Cup SKU on top of the existing Pulse pricing:

- **Mundial Pulse Pack** — 5 Pulses during the tournament (group stage / R16 / QF / SF / Final), featured on the platform, branded sponsor card, included in newsletter and daily digest. **~$50,000 MXN per brand.**
- **Founding Sponsor tier** — First 5 brands get 50% off, permanent logo on the homepage "Trusted Brands" row, and 40% to Conscious Fund (highest tier). **Unblocks the $0 fund problem.**
- **Municipality pilot** — One free 30-day Pulse for a CDMX alcaldía (e.g. "¿Qué debería priorizar la alcaldía antes del Mundial?"). A single case study beats a thousand landing pages.

### 4.3 Sponsor narrative hooks already sitting in the news monitor

The news monitor agent surfaced exactly the hooks you need. Operationalize them:

| News Monitor signal | Target sponsor vertical | Market angle |
|---|---|---|
| Afores crisis | Afores, fintech | "¿Afectará la crisis de Afores la asistencia de jubilados al Mundial 2026?" |
| Subsidios a gasolina $220K MDP | Energéticas, movilidad | "¿Superarán $250,000 MDP los subsidios a gasolina durante 2026?" |
| ESG / CDMX sustentabilidad Mundial | Marcas sustentables | "¿Cumplirá CDMX compromisos de sustentabilidad para Mundial 2026?" |
| Transiciones CEO / liderazgo | Corporate / B2B | Conscious Pulse survey for HR & leadership |
| IA operacional | SaaS / tech | Pulse on AI adoption in Mexican SMB |

**The agents are already doing sales research for you.** Turn the daily CEO digest into a **one-page sponsor outreach doc** that gets sent to your sales pipeline. (This is a ~1 day build on top of `ceo-digest.ts`.)

### 4.4 Anonymous → Registered aha-moment

Today: user lands → redirected to login → leaves.
Target flow:

1. Land on `/predictions` (no redirect).
2. Vote anonymously on one market.
3. **Instant feedback**: "Your vote shifted the consensus by X%. +5 XP logged under `@anonymous_#####`."
4. Email-only lightweight capture: "Keep your XP and streak? Enter your email." (magic link or one-click Google).
5. First-registered-vote triggers **first achievement**.

The infrastructure for anonymous aliases and converting them to users (`converted_to_user_id`) already exists — it's just not being exposed to the user.

### 4.5 Fix the Conscious Fund "$0" problem

$0 balance is the single loudest credibility killer on the site.

- Commit a **founder/platform seed** (even $5,000–$10,000 MXN) to the fund, publicly, with a timestamped transaction page. The narrative "5 causas apoyadas" currently has no dollars behind it.
- Expose a **thermometer**: `$X raised / $10K goal this quarter`. Progress > zero.
- Every Pulse purchase should display, at checkout, **exact MXN amount** flowing to the fund, and immediately after payment, **which cause the buyer voted for**.

---

## 5. UX / UI improvements — specific and actionable

### 5.1 Information architecture

Consolidate public navigation to **five items, locale-consistent**:

```
Predicciones  ·  Lugares  ·  Pulse  ·  Fondo  ·  Acerca
```
(EN mirror: `Predictions · Places · Pulse · Fund · About`.)

Drop `Markets`, `Leaderboard`, `Sponsor`, `Sponsors`, `Contact` from the top nav. Leaderboard moves into `Predicciones`; Contact moves into footer.

### 5.2 Homepage redesign (single-screen hypothesis)

Current homepage tries to show six sections above the fold. Test a 3-block structure:

1. **Hero** — "Tu opinión financia causas reales. Empieza con un voto." + live Fund thermometer + 55-day Mundial countdown.
2. **Top 3 live markets** (votes ≥5, updated daily). Vote inline without leaving the page.
3. **"Lugares Conscientes cerca de ti"** — 3 location cards, Instagram handles, vote buttons.

Everything else ("Para Marcas", "Pulse", "Fondo", FAQ) moves below the fold or into its own page.

### 5.3 Market card hygiene

- Hide any option showing **0%** unless the market has ≥5 votes.
- Show vote count in **absolute + relative** terms ("18 votes · 95% agree it's Conscious").
- For markets with **1–4 votes**, show a **"Be one of the first voices"** label instead of the probability bars.

### 5.4 Pulse page (`/pulse`)

- Add **sponsor logos** above pricing ("Used by: [3 logos]"). Even seeded/pilot logos is fine if labeled "Pilot partners."
- Add a **"Book a 15-min demo"** button next to "Custom" Enterprise tier.
- Lead with a **case study block** ("Club Reset measured consciousness in Juárez — here's what 18 voters revealed, with 9.2/10 average confidence").
- MXN-first, USD-secondary — your pricing already does this, but tighten on mobile.

### 5.5 Accessibility and trust

- Fix the **disabled `Subscribe` button** on the newsletter form (both instances).
- Replace the double-language-toggle in the footer with a single `ES | EN` pill.
- Add real social proof: "Últimos patrocinios" row of 3–5 logos. Even two real logos is enough.
- Show the **live Fund total** in the global header/footer so it follows the user through the site. A non-zero number is the single biggest trust upgrade you can make.

### 5.6 Locations page (already strong — small polish)

- Add a **map pin view** (Leaflet or Mapbox) — lets visitors browse by proximity. Locations is inherently geographic.
- Add **"Nearest Conscious Location to Estadio Azteca"** module during the Mundial window.

---

## 6. Sales strategy — next 56 days

### 6.1 Segments, sorted by reachability

| Segment | Why now | ICP | Offer |
|---|---|---|---|
| **CDMX local brands / venues** | Already the wedge (Club Reset). Warm via Instagram. | Restaurants, bares, clubs, independent retail. | Conscious Location seal + Pulse Single. |
| **Mundial sponsors / activations** | 56-day fuse, high media spend unlocking now. | FMCG, cerveza, telcos, deportivas. | Mundial Pulse Pack + fund % narrative. |
| **Municipalities & alcaldías** | Mundial creates political pressure to "listen to citizens." | CDMX alcaldías, Edomex, Guadalajara. | Free pilot Pulse → subscription. |
| **Medios / influencers** | Need engagement tools, no budget for enterprise panels. | Mid-tier podcasters, YouTubers, journalists. | Pulse Pack with custom branding. |
| **Afores / fintech / energy** | News monitor surfaced active narratives. | Sector leaders with PR pressure. | Issue-sponsored markets. |

### 6.2 Outreach engine

- **Every Conscious Location contact** becomes a Pulse lead. Build a simple CRM tab (or Notion board) fed by `conscious_locations` rows.
- **Every daily CEO digest** ends with 3 outbound-ready sponsor ideas — route them directly into a Slack/Discord channel or email alias each morning.
- **Case study per week**, narrow scope: "What 18 people said about Club Reset." That is your sales asset; it's also organic content.

### 6.3 Pricing tweaks to explore

- **Pilot Pulse** — $1,500 MXN single-question, 7 days, no fund share. Pure lead-magnet. Move them to Pulse Pack or Subscription.
- **Founding Sponsor** — first 5 brands, 50% off, permanent logo, lifetime recognition. Easy "yes" for brands that want to be first.
- **Impact credit** — Any sponsor who brings ≥3 Conscious Locations onto the platform gets $X MXN in Pulse credit. Turns B2C growth into B2B revenue.

### 6.4 Conversion scoreboard (track weekly)

| Metric | Today | 30-day target | 56-day target |
|---|---|---|---|
| Registered users | 251 | 500 | 1,000 |
| Daily active predictors (reg+anon) | 9 | 50 | 150 |
| Anon → Registered conversion | 0% | 10% | 20% |
| Conscious Locations (public) | 3 | 15 | 25 |
| Active paying Pulse clients | 0 | 2 | 5 |
| Conscious Fund balance | $0 | $25K MXN | $100K MXN |
| Markets with ≥5 votes | ~8/43 | 20/30 | 30/35 |

If these numbers move, the narrative fixes itself. If they don't, you have falsified something important — which is also useful.

---

## 7. Execution plan — the next 14 days

**Week 1 — Remove friction**
1. Make `/predictions` anonymous-viewable; add post-vote email capture.
2. Hide dead markets (<5 votes) from public surfaces.
3. Fix disabled newsletter button + duplicate language toggles.
4. Commit a seed balance to the Conscious Fund; expose live thermometer.
5. Remove or redirect `/communities` links platform-wide.

**Week 2 — Build the wedge**
6. Publish 7 new Conscious Locations (your 3 seed + 4 outreach).
7. Ship "Mundial Pulse Pack" SKU and landing block on `/pulse`.
8. Turn daily CEO digest into a 1-page sponsor outreach doc.
9. Publish **Club Reset case study** on the blog (use the `content-creator` agent with edits).
10. Reach out to 10 Mundial-adjacent brands with the Pulse Pack offer.

Everything after that is measured against the scoreboard in §6.4.

---

## 8. What I recommend deferring (not killing)

- **Corporate / employee learning portal** — functional but not where the next 56 days' returns lie. Revisit post-Mundial.
- **Blog content factory** — keep the agent running, but only publish drafts that reference an active market or Pulse.
- **Live events real-time feature** — beautiful, but requires a large concurrent audience to shine. Schedule around Mexico's first Mundial match, not before.
- **Sponsorship of non-CDMX causes** — focus is leverage right now. Expand after the first 5 Pulse clients are in.

---

## 9. Risks and how to counter them

| Risk | Countermeasure |
|---|---|
| Mundial traffic arrives, predictions feed still looks empty. | Kill dead markets now; pre-stage 10 Mundial-only markets by May 15. |
| First Pulse client needs social proof that doesn't exist. | Pilot with one alcaldía or one Conscious Location *this week*; use that report as the sales asset. |
| Conscious Fund stays at $0 at kickoff. | Founder seed + founding-sponsor program; display the thermometer regardless. |
| Agent content drowns out human edit. | Keep the `draft` status on blog posts; require manual publish until at least 500 users. |
| $0 MXN revenue by Mundial. | Pilot Pulse at $1,500 MXN is the cheapest way to prove the billing loop works end-to-end. |

---

## 10. Summary in one paragraph

The engineering is further along than the product, and the product is further along than the distribution. The data already shows the wedge: **place-based markets and Conscious Locations drive real engagement, while generic aspirational markets die quietly.** In the next 56 days, the win is to remove every friction that explains the 0% anonymous-to-registered conversion (starting with the `/predictions` login gate), prune the dead market catalog, ship a Mundial-specific Pulse SKU, seed the Conscious Fund so the fund stat stops saying "$0," and turn Conscious Locations into both an acquisition engine and a sales pipeline for Pulse. Everything else can wait until after the tournament.
