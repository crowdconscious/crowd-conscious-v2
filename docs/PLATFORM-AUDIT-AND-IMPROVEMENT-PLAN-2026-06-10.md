# Platform Audit & Improvement Plan

**Date:** 2026-06-10
**Scope:** Web (`crowd-conscious-v2`) + Mobile (`crowd-conscious-mobile`)
**Inputs:** full read-only audits of both repos (push pipeline, terminology, UX, XP/gamification infrastructure)
**Companion docs:** `CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md`, `SHARE-CARDS-STRATEGY-2026-06-09.md`

---

## 1. Push notifications — root cause and fix plan

### What the audit found

The hypothesis "nothing ever sends" was wrong. A sender exists (`lib/expo-push.ts`, web)
and is wired into six publish routes (pulse publish, blog publish, signal cosign invite).
The failure is layered:

1. **CONFIRMED — every send was silently dropped until Jun 8.** Publish routes used
   fire-and-forget (`void notify().catch()`); Vercel froze the lambda before the Expo
   HTTP call completed. Fixed in commit `b8cb7a4` (all six call sites now awaited),
   deployed with `924f847` on Jun 9. Any "push doesn't work" observation before then
   is fully explained by this bug.
2. **LIKELY ONGOING — the founder's device may have no token.** The OS permission
   prompt fires cold at app start; if denied once, it returns `false` forever (no
   re-ask, no Settings deep-link). The profile push toggle only writes
   `user_settings.push_notifications` — it never requests OS permission nor registers
   a token. Toggling it on can be a complete no-op.
3. **UNVERIFIED — check dashboards (5 minutes):**
   - `select platform, count(*) from push_tokens group by 1` in Supabase
   - `eas credentials -p ios` — confirm an APNs push key is uploaded
   - Vercel logs for `[expo-push]` warnings
   - Send one manual test push via Expo's push tool to a token from the table
4. **CONFIRMED — Android cannot get tokens at all.** No `android.googleServicesFile`
   in `app.json`, no FCM config. Silent failure. Needs a new binary (low urgency,
   Android is in closed testing).
5. **CONFIRMED — zero delivery visibility.** Tickets are checked (with good
   stale-token pruning) but push *receipts* are never fetched, so APNs credential
   errors are invisible.

### Fix sequence

| # | Action | Repo | Ship via |
|---|--------|------|----------|
| P1 | Run the four verifications above | — | manual, today |
| P2 | Profile push toggle: actually request OS permission + register token; `Linking.openSettings()` when denied | mobile | OTA |
| P3 | Contextual permission priming — ask after first vote ("¿Quieres saber cómo termina este Pulse?") instead of cold at startup | mobile | OTA |
| P4 | Push receipt checking (~15 min post-send, `push_log` table + cron) so credential failures surface | web | deploy |
| P5 | Restore pulse-results push to voters in `pulse-auto-resolve` (existed at `dfdff0d`, was removed); add cosign-milestone push to `signal-threshold-check` | web | deploy |
| P6 | Future triggers: verified-creator moment (Creators Phase 2), weekly digest | web | deploy |
| P7 | Android FCM (`googleServicesFile` + FCM V1 key) | mobile | new binary |

Business mapping of triggers: results-for-voters is the retention hook (close the loop
on every vote); publish pushes are acquisition; verified-creator is the celebration
moment that drives share-card posting.

---

## 2. Pulse-first terminology sweep (web)

**Rule (new, supersedes CLAUDE.md line "Predictions header is acceptable"):**
prediction/predicción/mercado language survives ONLY in the live-events context
(live match outcomes, brand launches, auction bids). Everywhere else: Pulse language.

Audit found **~90 user-facing strings in ~35 files**. Highest leverage first:

| Priority | Surface | File(s) | Why first |
|----------|---------|---------|-----------|
| 1 | Homepage OG card still says "Predicciones Gratis…" | `app/opengraph-image.tsx` | Every shared homepage link |
| 1 | Post-vote WhatsApp share copy | `components/gamification/CelebrationModal.tsx` | The most-sent message in the funnel |
| 1 | /pulse listing copy sends users to "mercados" | `lib/i18n/pulse-listing.ts` | Core consumer surface |
| 2 | Sponsor/B2B copy | `lib/sponsor-page-copy.ts` | Brand-facing credibility |
| 2 | About / terms pages | `app/about/`, terms | Trust surface |
| 3 | Authed shell labels, emails, remaining i18n strings | ~30 files | Bulk sweep |
| 3 | `CLAUDE.md` + `README.md` rule updates | repo root | Keeps future agents honest |

**URL space:** keep `/predictions/*` routes for now (redirect/SEO cost outweighs
benefit) but rename all visible nav labels; revisit a `/panel` rename later.
Never touch `prediction_markets` (table) or `/pulse/[id]`.

**Dashboard metric fix (same pass):** "Prediction Score" vs "Prediction XP" is a
genuine double metric (all-time `user_xp.total_xp` vs vote-only transaction sum).
Show ONE XP number ("XP Consciente"), rename "Accuracy" to "Coincidencia con la
mayoría" (that's what it actually measures), and localize the hardcoded English
headers ("Welcome back", "Biggest Movers", "Needs your attention") — `useLocale()`
is already available in that component.

---

## 3. Critical web fixes (non-terminology)

1. **`/pulse/[id]` ships every voter's `user_id` in the public page payload**, and
   the payload grows unbounded with votes. Privacy + Core Web Vitals risk on the one
   URL the business depends on. Fix: aggregate vote data server-side; send counts and
   the current user's own vote only. Handle with care — protected surface.
2. **Creator dashboard polish** (`/creator`):
   - Grey "disabled-looking" price inputs ARE disabled — all tiers default unchecked.
     Default the recommended tier on, or restyle unchecked state so it doesn't read
     as broken.
   - Integrate the new certification panel (Creators Phase 1) — dashboard should show
     certification status, tier, and the "vota por mí" share action.
   - Post views are fetched but never rendered — show them.
   - Empty states ("No earnings recorded yet") need next-step CTAs, not dead ends.
3. **Pending migrations:** apply 228, 229, 240, 241 in Supabase; commit creators
   Phase 1 work.

---

## 4. Mobile UX quick wins (all OTA-shippable)

Ranked by impact x effort from the audit:

1. **Pull-to-refresh on Pulses/Signals/Locations/Fund lists** (only Blog has it;
   60s staleTime means stale vote counts with no recovery gesture). Trivial.
2. **Push toggle + contextual priming** (P2/P3 above).
3. **Haptics** — `expo-haptics` is installed with zero imports. Add to vote, cosign,
   share success. Native module already in the binary.
4. **Vote celebration** — replace `Alert.alert("+N XP")` with an in-app toast/confetti
   moment + haptic. This is the core action of the app; it deserves better than a
   system alert.
5. **Share bottom sheet** — replace the 5-button `Alert.alert` (gesture-handler +
   reanimated already in binary). Do in the same pass as #4.
6. **Skeletons** instead of bare spinners on feeds.
7. **Dynamic Type hardening** — add `maxFontSizeMultiplier` caps; XXL text currently
   breaks fixed-height cards.
8. **A11y labels** on content cards and the confidence slider.

**New-binary items (batch into the live-events build):** Android FCM, `expo-image`
(disk caching), `/locations` + `/creators` Android intent filters, `RECORD_AUDIO`
permission cleanup. Note: adding `/locations/*` and `/creators/*` to the AASA file
(`public/.well-known/apple-app-site-association`) is a WEB deploy — iOS universal
links work without a new binary.

**Ops check:** verify `EXPO_PUBLIC_SENTRY_DSN` and PostHog keys are set as EAS build
env vars — `eas.json` only sets `EXPO_PUBLIC_API_URL`, so production crash reporting
may be silently off.

---

## 5. XP Rewards + Location Profiles ("Conscious Perks")

The strategic centerpiece: close the gamification loop so XP means something.

```
vote/participate → earn XP → redeem perks at certified Conscious Locations
→ locations get foot traffic from verified conscious consumers
→ more locations want certification → more places to vote on → repeat
```

This makes XP the currency of the conscious economy and gives locations a concrete
ROI for certification — strengthening the B2B funnel (certification → perks →
insights → Pulse pilot).

### Facts from the audit (what exists)

- XP is **earn-only**: 5–25 XP per vote, 5–50 resolution bonus. Tiers at
  501 / 1,501 / 3,501 / 7,501.
- **`xp_transactions` is already a usable ledger** — extend with negative
  (spend) entries rather than building a wallet from scratch.
- **No redemption mechanism exists**, and **terms §5 explicitly forbids
  redemption** — legal text must be updated before launch.
- **Location ownership exists only indirectly** via `sponsor_accounts`
  (migration 209's claim-by-email pattern is the foundation to reuse).

### Proposed design (Phase D, to be specced fully before build)

1. **Location owner accounts:** reuse the sponsor_accounts claim-by-email pattern —
   a location's `contact_email` claims its profile; owners get a self-serve dashboard
   (mirror of the creator dashboard: edit card, view insights, manage perks).
2. **`location_offers` table:** title/description (ES/EN), `xp_cost`, optional
   `min_tier`, stock limit, validity window, status. RLS: owners manage their own,
   public reads active offers.
3. **Redemption flow:** user taps "Canjear" → `xp_transactions` spend entry +
   single-use redemption code (short alphanumeric + QR) → venue staff validates via a
   public lookup page (same pattern as certificate verify). No POS integration needed.
4. **Tier perks:** offers can require Tier 3+ — gives tiers aspirational value beyond
   leaderboard rank.
5. **Guardrails:** spend doesn't reduce leaderboard rank (track `total_xp_earned`
   separately from spendable balance); per-user redemption caps per offer; offers
   from `active` certified locations only.
6. **Sequencing:** spec → terms update → migration + owner dashboard (web) →
   redemption flow (web) → mobile wallet/perks surface (after the read-only creators
   phase ships in mobile).

This also extends naturally to Conscious Creators later (creators offering
XP-gated content/experiences), but locations-first is right: physical perks are
tangible and the certification funnel already exists.

---

## 6. Recommended execution order

| Phase | Contents | Effort | Ship via |
|-------|----------|--------|----------|
| **A — This week** | Push verifications + P2–P5; `/pulse/[id]` payload fix; mobile OTA quick-wins bundle (#1–5); apply migrations; commit creators Phase 1 | 2–3 days | OTA + deploy |
| **B — Pulse-language sweep** | ~90 strings, dashboard metrics, EN headers, CLAUDE.md/README | 1–2 days | deploy |
| **C — Creator surface polish** | Creator dashboard fixes + Creators Phase 2 (verified moment, story card, verify API, founding 15) | ~1 sprint | deploy |
| **D — Conscious Perks** | Spec + terms update + owner accounts + offers + redemption (web first) | ~1.5 sprints | deploy |
| **E — Next binary** | Android FCM, expo-image, intent filters, live events, notification center | batch | App Store review |

Phases A and B are independent and can run in parallel. C and D both touch the
web app but different surfaces; D needs its own short spec round before code.
