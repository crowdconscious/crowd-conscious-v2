# Locale Consistency Report — 2026-04-19

Companion to Step 1.2 of the post-audit cleanup
(`docs/PLATFORM-GENERAL-AUDIT-2026-04-19.md` §15.1).

## Canonical primary nav (5 items)

| Slot | ES            | EN          | Route              |
| ---- | ------------- | ----------- | ------------------ |
| 1    | Predicciones  | Predictions | `/predictions`     |
| 2    | Lugares       | Places      | `/locations`       |
| 3    | Pulse         | Pulse       | `/pulse`           |
| 4    | Fondo         | Fund        | `/predictions/fund`|
| 5    | Acerca        | About       | `/about`           |

`Live` was demoted to a conditional pulsing badge that only renders when
there is at least one public live event. `Markets`, `Leaderboard`,
`Sponsor`, `Sponsors`, and `Contact` were dropped from the primary slot:

- `/markets` still resolves (alias entry point) but is reachable only from
  the footer "Plataforma" column and inbound links.
- `/predictions/leaderboard` is reachable from the `/predictions` shell.
- `/sponsor` 301-redirects to `/pulse` (already wired in
  `app/(public)/sponsor/page.tsx`).
- "Contact" lives in the footer as `mailto:comunidad@crowdconscious.app`.

## Implementation note

The repo has `next-intl` installed but the active i18n surface is the
custom `LanguageContext` (`useLanguage()`) that flips a `language: 'es' |
'en'` value. Both nav components (public + authed) now read labels from a
single `NAV[language]` constant. The same keys were also seeded into
`locales/en.json` and `locales/es.json` under `nav.*` so a future
`next-intl` migration is mechanical, not a rewrite.

## Page-by-page status

| Page                       | Component(s) checked              | Status         | Notes |
| -------------------------- | ---------------------------------- | -------------- | ----- |
| `/`                        | `LandingNav`, `Footer`, hero       | FIX-APPLIED    | Nav now 5 items, locale-aware |
| `/about`                   | `LandingNav`, `AboutContent`       | FIX-APPLIED    | Nav now matches page locale; body content already localized |
| `/pulse`                   | `LandingNav`, `MundialPulseHero`   | FIX-APPLIED    | Nav now 5 items |
| `/locations`               | `LandingNav`, `LocationsClient`    | FIX-APPLIED    | Nav now 5 items |
| `/blog`, `/blog/[slug]`    | `LandingNav`, blog body            | FIX-APPLIED    | Nav now 5 items |
| `/live`                    | `LandingNav`, live page            | FIX-APPLIED    | Nav now 5 items, Live badge still surfaces ongoing events |
| `/predictions` (anon)      | redirects to `/predictions/markets`| PASS           | Confirmed in `app/(predictions)/predictions/page.tsx` |
| `/predictions/markets`     | landing nav variant                | FIX-APPLIED    | Nav now 5 items |
| `/predictions` (authed)    | `HeaderClient`                     | FIX-APPLIED    | Now 5 items + locale-aware (was 6 hardcoded English) |
| `/login`, `/signup`        | `LandingNav`                       | FIX-APPLIED    | Inherited nav fix |
| `/fund`                    | redirects to `/predictions/fund`   | PASS           | Confirmed in `app/fund/page.tsx` |
| Footer (every page)        | `Footer`                           | PASS           | Already locale-aware via `useLanguage()`, single ES/EN toggle, Contact + Para Marcas links present |
| Newsletter form            | `NewsletterForm`                   | PASS           | Already locale-aware (`Suscribirme` / `Subscribe`) and POSTs to `/api/newsletter/subscribe` |

## Known follow-ups (not in scope for Step 1.2)

- `NEEDS-COPY`: a few internal `/predictions/admin/*` pages still mix
  English admin labels with the Spanish chrome. Acceptable for an admin
  surface; revisit post-Mundial.
- `NEEDS-COPY`: corporate and employee dashboards (`/employee-portal`,
  `/corporate/*`) still ship some English-only labels in deeper screens
  that aren't part of the public conversion funnel. Defer.
- `next-intl` migration: keys are seeded but no component imports
  `useTranslations` yet. The `i18n.ts` file at the repo root is
  scaffolded but not active. Convert opportunistically.
- The legacy `app/components/landing/` directory still holds several
  `Landing*` blocks (e.g. `LandingPulseSection`, `LandingLiveSection`)
  that were left intact because `app/page.tsx` references them. They
  follow the same `useLanguage()` convention and pass the locale check.

## Verification

- `npx tsc --noEmit` — passes.
- `npm run build` — passes (Next 15.5.7 build output green; all 71+
  routes compile).
- Manual nav spot-check on every public route: no English label appears
  on a Spanish page; no orphan "Sponsor" or "Sponsors" link points to
  `/pulse`.
