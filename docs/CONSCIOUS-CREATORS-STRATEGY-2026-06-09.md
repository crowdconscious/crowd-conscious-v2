# Conscious Creators — Feature Strategy

**Date:** 2026-06-09
**Status:** Proposal (no code written)
**Scope:** Web (`crowd-conscious-v2`) + Mobile (`crowd-conscious-mobile`), shared Supabase backend

---

## 1. The idea in one paragraph

Conscious Locations proved the loop: a public card, a community vote ("¿Es consciente?"),
a derived score, an admin certification, and a shareable link that owners spread on
WhatsApp themselves. **Conscious Creators applies the exact same loop to people** —
chefs, artists, activists, founders, influencers — giving each a public card at
`/creators/[handle]`, a community-verified Conscious Score, a "Verified Conscious
Creator" badge, and a branded share card they post to Instagram/TikTok/WhatsApp.
The creators become the distribution channel: every verified creator who shares their
badge card brings their audience to the platform.

---

## 2. What already exists (audit summary)

### Web

| Asset | State | Reuse for Creators |
|-------|-------|--------------------|
| `conscious_locations` table | Full schema: slug, score, status, `certified_at/by`, `current_market_id`, `metadata.values`, `*_en` columns | Template for the creator entity |
| `/locations` + `LocationCard` + `LocationsPage` | Grid/map/swipe, filters, inline voting, WhatsApp share | Template for creator directory |
| `/api/og/location/[slug]` | `next/og` ImageResponse 1200×630 | Template for `/api/og/creator/[handle]` |
| `/api/og/market/[id]?format=story` | 9:16 story PNG | Pattern for badge story card |
| Voting market loop | `create_multi_market` RPC, `recalculate-score.ts`, score reveal at ≥10 votes | Identical mechanic for people |
| Verify tool | `GET /api/locations/verify` + UI on `/locations` | Pattern for public badge lookup |
| `share_events` + `trackShare` | Share analytics | Extend with `creator` type |
| **Blog creator system** | `profiles.user_type='influencer'`, `handle`, `creator_trust_level`, `/creators/[handle]`, `/creators/signup`, sponsorship tiers, `/app?ref={handle}` referrals | **The identity layer — already half the feature** |
| `conscious_inbox` + inbox-curator agent | Handles `location_nomination` | Add `creator_nomination` type |
| `lib/resend.ts` | Transactional email | "You're verified" email |

### Mobile (Expo, v1.1.1 on App Store)

| Asset | State | Reuse for Creators |
|-------|-------|--------------------|
| Locations tab | Full list + detail + vote + comments (no map) | Template for creator screens |
| Share card pipeline | `*ShareCard.tsx` (360×640 → 1080×1920) via `react-native-view-shot`, QR, brand gradients — exists for Pulse/Signal/Blog | Add `CreatorShareCard` |
| Deep links | `+native-intent.ts` maps `/signals`, `/pulse`, `/blog` (not `/creators`) | Add `/creators/{handle}` mapping + Android intent filter |
| Push | `push_tokens` registered; web backend sends | "You got verified" push |
| `get_profiles_public` RPC | id, full_name, avatar_url only | Extend or add creator-specific public RPC |
| i18n | Full ES/EN dictionaries | Add `creators` copy block |

### Collisions to resolve (important)

1. **"Creators" already means blog influencers.** `/creators/[handle]` exists as a blog
   author page. Conscious Creators must *extend* this identity, not fork it.
2. **`conscious_locations.category = 'influencer'`** allows influencer *place* cards
   today, disconnected from `profiles`. Once Conscious Creators ships, stop using this
   category for people and migrate any existing rows.
3. **Mobile generated types are stale** — missing `handle`, `creator_trust_level`,
   `social_links` (web migration 232). Regenerate before mobile work.

---

## 3. Recommended data model

**Decision: extend `profiles` + add a thin certification table.** Do NOT create a
parallel `conscious_creators` entity table — a creator without a platform account is
just a lead, and the blog creator system already gives us handle, avatar, bio, socials,
trust level, and a public page. Duplicating identity would create two sources of truth.

```sql
-- 23X_conscious_creator_certification.sql

-- Certification state machine, mirrors conscious_locations lifecycle
create table public.creator_certifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'under_review', 'suspended', 'revoked')),
  -- community verification loop (same mechanic as locations)
  current_market_id uuid references public.prediction_markets(id),
  conscious_score numeric,        -- null until >= 10 votes
  approval_rate numeric,
  avg_confidence numeric,
  total_votes int not null default 0,
  -- admin certification
  certified_at timestamptz,
  certified_by uuid references public.profiles(id),
  next_review_date timestamptz,   -- +90 days, same as locations
  -- card content (i18n column pairs, same pattern as locations)
  why_conscious text,
  why_conscious_en text,
  craft text,                     -- what they do: "Chef", "Muralista", ...
  craft_en text,
  city text default 'CDMX',
  cover_image_url text,
  metadata jsonb not null default '{}',  -- { "values": ["zero_waste", ...] }
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: public SELECT where status = 'active'; admin ALL (same as locations)
```

Why this shape:

- **`profiles` keeps identity** (handle, name, avatar, bio, socials) — one row per human.
- **`creator_certifications` keeps the certification lifecycle** — same columns and
  semantics as `conscious_locations`, so `recalculate-score.ts`,
  `create-voting-market.ts`, and the admin certify flow port with minimal changes.
- A blog creator without certification keeps working exactly as today. Certification is
  an *upgrade*, not a replacement.
- The conscious values system (`CONSCIOUS_VALUE_KEYS` + `ValueBadgeRow`) reuses as-is
  via `metadata.values`.
- `prediction_markets` is untouched (per CLAUDE.md) — creator votes are just another
  `is_pulse = false` market, outcomes `['Sí, es Consciente', 'No estoy convencido']`.

Also extend `share_events` with a nullable `creator_profile_id` column (mirrors
`location_id`) for share analytics.

---

## 4. The verification system: three tiers

Make verification a *ladder*, each rung shareable. This is the engagement engine.

| Tier | Name (ES / EN) | How earned | Visual |
|------|----------------|------------|--------|
| 1 | **Nominado / Nominated** | Anyone nominates via form (→ `conscious_inbox`, type `creator_nomination`) or creator self-applies | Grey outline badge on card |
| 2 | **Verificado por la comunidad / Community-Verified** | ≥10 votes on their market AND `conscious_score ≥ 7.0` | Emerald check badge + score visible |
| 3 | **Certificado / Certified Conscious Creator** | Admin review (`certified_at`/`certified_by` set), 90-day re-review | Gold/emerald seal + "Certificado desde {date}" |

Design principles:

- **Community votes, admin certifies.** The score is social proof the badge can't fake;
  the admin step protects the brand from bad actors gaming votes. Same trust
  architecture as locations, where it already works.
- **Score reveal threshold (10 votes)** creates a built-in campaign for the creator:
  "Help me get verified — vote on my card." They recruit the first 10+ voters
  themselves. That's the acquisition loop.
- **90-day `next_review_date`** keeps the badge meaningful — it's a living
  certification, not a one-time sticker.
- **Public verification lookup:** `GET /api/creators/verify?handle=` mirroring the
  locations verify tool, so anyone (including brands) can check a badge claim.
- Keep `creator_trust_level` (blog self-publish gate) **separate** — editorial trust
  and conscious certification are different axes. Document this in the migration.

### Anti-gaming guardrails (phase 2+, keep simple at launch)

- Votes from accounts created <48h ago count toward `total_votes` but flag the
  certification `under_review` if they exceed ~60% of votes.
- Admin dashboard surfaces vote-velocity anomalies before certifying.
- Revocation path exists day one (`status = 'revoked'`), with the badge card link
  rendering a fallback OG image (the locations OG route already behaves this way for
  inactive slugs — reuse that behavior).

---

## 5. The share card system (the growth engine)

> Card anatomy, channel strategy (WhatsApp link vs story PNG), QR treatment, and
> the creator copy matrix are defined in
> [`SHARE-CARDS-STRATEGY-2026-06-09.md`](SHARE-CARDS-STRATEGY-2026-06-09.md) —
> creator cards must follow that scaffold.

Three share moments, each with its own artifact:

### 5.1 The creator card (always available)

- **Web:** `/api/og/creator/[handle]` — `next/og`, 1200×630. Avatar-forward layout:
  circular avatar, name, `@handle`, craft, conscious values pills, score (if revealed),
  badge tier seal. `?lang=en` and `?format=story` (1080×1920) variants — the story
  format already exists for markets; port it.
- **Mobile:** `CreatorShareCard.tsx` + `CreatorShareCapture.tsx` using the existing
  view-shot pipeline (`BrandShareBackground`, QR to `crowdconscious.app/creators/{handle}`,
  wordmark). Add `ShareKind = "creator"` to `src/lib/share.ts`.

### 5.2 The verification moment card (the viral artifact)

When a creator hits Tier 2 or 3, generate a celebratory variant:
"**Verificado como Creador Consciente**" with the seal, date, and score. This is the
card people *want* to post — it's an achievement announcement, like a blue check
unboxing. Deliver it via:

- **Email** (`lib/resend.ts` template) with the story + landscape PNGs attached/linked
  and pre-written ES caption copy they can paste into Instagram.
- **Push** (mobile): new payload `type: "creator_verified"` routing to their profile,
  where the share sheet is one tap away.
- **In-app modal** on web (pattern: `LocationCreatedShareCard` admin modal, but
  user-facing) with WhatsApp/IG/download buttons and `trackShare` wired.

### 5.3 The voting ask card (pre-verification)

For Tier 1 creators: a "Vota por mí" card — "¿Soy un negocio/creador consciente?
Vota aquí" with QR to their card. This activates the creator's audience *before*
they're verified, which is exactly when they're most motivated to share.

Every share goes through `withShareUtm` + `share_events` so we can measure which
creators actually drive traffic — that data feeds the featuring algorithm and, later,
the brand-matching pitch.

---

## 6. Surfaces

### Web

| Surface | What |
|---------|------|
| `/creators/[handle]` | Extend existing page: certification badge, score, values, vote panel (when market active), "Verificar" lookup. Blog posts grid stays. Add proper OG via the new route (today it's just `avatar_url`). |
| `/creators` directory | Today it's a recruitment landing. Add a "Creadores Conscientes" grid section (mirroring `LocationsPage`: filters by craft/values/city, certified-first sort). Keep the recruitment CTA. |
| Landing | `LandingCreatorsSection` next to `LandingLocationsSection` — 3 featured certified creators. |
| Sitemap | Add `/creators/[handle]` for active certifications (and fix: `/locations` is missing too). |
| Admin | `/predictions/admin/creators` — list, certify, suspend, feature. Clone of locations admin. Certify action fires the verification-moment pipeline (email + push + modal flag). |
| Nomination | Public "Nomina a un creador" form → `conscious_inbox` (`creator_nomination`) → inbox-curator agent triages (extend its prompt). |

### Mobile

| Phase | What |
|-------|------|
| 1 (read) | `app/creators/[handle].tsx` detail screen (avatar, badge, bio, values, vote panel, share). Deep link mapping in `+native-intent.ts` + Android intent filter for `/creators`. Blog bylines become tappable (requires selecting `author_id` in `useBlogPost`, currently not selected). |
| 2 (discover) | "Creadores" horizontal rail in the Blog tab header or a drawer entry — don't add a 6th tab; the tab bar is full at 5. |
| 3 (moment) | `creator_verified` push + `CreatorShareCard` + verified pill on own profile screen. |

Mobile needs: regenerate Supabase types, a public-read path for certified creators
(either RLS policy `status='active'` joins, or a `get_conscious_creators_public` RPC
mirroring `get_profiles_public` — RPC recommended since mobile uses anon key), and
`creators` i18n blocks in `es.ts`/`en.ts`.

---

## 7. How we make the best of it (business strategy)

### 7.1 Acquisition flywheel

```
Creator nominated → shares "vota por mí" card → audience votes (signs up / alias-votes)
→ creator hits 10 votes → score revealed → verified → shares badge card
→ new audiences discover platform → some nominate more creators → repeat
```

Each creator is a micro-campaign with built-in incentive to promote us. Locations
proved owners share their links; creators are *professionally* incentivized to share —
their card is portfolio material.

### 7.2 Monetization paths (sequence, don't ship all at once)

1. **Free forever for the badge.** Charging for verification kills credibility — the
   community vote is the moat, don't sell it.
2. **Creator insights** (`/creators/[handle]/insights`, noindex) — clone of location
   insights: vote demographics, confidence, share-driven traffic. Free at first; the
   page carries the upsell CTA.
3. **Brand ↔ creator matching.** Certified creators + `creator_sponsorship_tiers`
   (already in schema, migration 237) = a marketplace where brands sponsor *certified*
   conscious creators. The certification is the differentiator no other influencer
   platform has: community-validated values alignment. Pitch on `/para-marcas`.
4. **Pulse tie-in.** Verified creators get a discounted/co-branded Pulse to consult
   their own audience ("¿Qué quieren que cree?"). Mirrors `LocationInsightsCta` → pilot
   funnel ($1,500 MXN pilot, `source=creator_insights`).
5. **Creators × Locations cross-pollination:** "Creadores en {location}" — a certified
   chef tagged at a certified restaurant strengthens both cards and doubles the
   share surface.

### 7.3 Launch playbook (CDMX-first, matching locations)

1. Hand-pick 10–15 founding creators with aligned audiences (chefs from certified
   restaurants, muralistas, sustainability voices). Certify them directly (Tier 3) so
   day one has gold seals.
2. Coordinated launch: all 15 post their badge card the same week. ES copy provided.
3. Open nominations publicly after the seeded wall exists — the empty-directory
   problem is solved before anyone arrives.
4. CEO digest agent: add "hot creators" section (mirrors hot locations).

### 7.4 Metrics that matter

| Metric | Source | Target signal |
|--------|--------|---------------|
| Badge-card shares per verified creator | `share_events` (creator type) | Virality of the moment |
| Signups attributed to creator shares | `utm` + `app_referral_clicks` (`ref={handle}`) | Acquisition value |
| Votes per creator market | `market_votes` | Audience activation |
| Nominations/week | `conscious_inbox` | Organic demand |
| Creator → brand pilot conversions | pilot funnel `source` param | Monetization |

---

## 8. Phased rollout

### Phase 0 — Decisions & prep (this doc)
- Confirm data model (§3) and tier semantics (§4).
- Apply pending migration 229 (leaderboard exclusions) before launch metrics.
- Regenerate `types/database.ts` (web — already missing `handle` etc.) and mobile types.
- Stop creating `conscious_locations.category='influencer'` rows; audit existing ones.

### Phase 1 — Web MVP (~1 sprint)
- Migration: `creator_certifications` + RLS + `share_events.creator_profile_id`.
- Port `create-voting-market` + `recalculate-score` for creators (small refactor to
  accept either entity, or parallel `lib/creators/` module — prefer parallel module,
  honoring "edit existing files" only where shared logic is truly identical).
- `/creators/[handle]`: badge, score, values, vote panel, OG route.
- Directory grid on `/creators`; admin CRUD + certify at `/predictions/admin/creators`.
- Nomination form → `conscious_inbox` + inbox-curator prompt update.
- i18n: ES/EN for every string (column pairs + `lib/i18n/creator.ts` additions).

### Phase 2 — Verification moment & share system (~1 sprint)
- `?format=story` for creator OG; "vota por mí" card variant.
- Verified email (resend template) + user-facing celebration modal + `trackShare`.
- Public verify lookup API + UI.
- Seed founding 15, coordinated launch.

### Phase 3 — Mobile (~1 sprint, after web stabilizes)
- Types regen, public RPC, deep links, detail screen, blog byline tap-through.
- `CreatorShareCard` via view-shot pipeline; `creator_verified` push.
- Discovery rail; `creators` i18n blocks.

### Phase 4 — Monetization
- Creator insights page + Pulse pilot CTA.
- Brand-matching pitch on `/para-marcas`; wire `creator_sponsorship_tiers`.
- Creators × Locations tagging.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Concept collision with blog creators | One identity (`profiles`), certification as additive layer; never fork `/creators/[handle]` |
| Vote gaming inflates badges | Admin certify gate, velocity flags, 90-day review, revocation renders fallback OG |
| Empty directory at launch | Seed 15 certified creators before opening nominations |
| Badge devaluation (too many, too fast) | Tier 3 is admin-gated and rate-limited by review capacity — scarcity is a feature |
| Mobile/web schema drift | Single migration source (web repo), regen types in both repos same PR cycle |
| `prediction_markets` shape pressure | None needed — creator markets are standard `is_pulse=false` multi-markets |
| Reputational: certifying a person who misbehaves | `under_review`/`suspended` statuses + public lookup always reflects current state, not the shared PNG |

---

## 10. Open questions for product owner

1. **Score threshold for Tier 2** — proposed 7.0/10 at ≥10 votes; same reveal threshold
   as locations. Calibrate?
2. **Self-application vs nomination-only** at launch? (Recommendation: both; self-apps
   land in the same inbox queue.)
3. Should certified creators be **excluded from the leaderboard** like admins, or is
   their visible XP part of the appeal? (Recommendation: keep them in — it humanizes
   the leaderboard.)
4. **Craft taxonomy** — free text vs. fixed list like `LOCATION_CATEGORY_DEFS`?
   (Recommendation: fixed list with ES/EN labels, ~12 crafts, `other` escape hatch.)
5. Does the **founding 15** list exist already? That's the longest-lead-time item.
