# Metrics Catalog — 2026-04-19

One row per **public-facing numeric count** on the platform. The goal is that
every number answers three questions without the reader having to dig:

1. **What does it count?** (scope)
2. **Over what time window?** (horizon)
3. **Is this an operational metric or a public story metric?** (audience)

We deliberately do **not** unify `268` (landing ticker) with `409` (Intelligence
Hub "Predictions cast"). They measure different things. The fix is explicit
relabel + tooltips driven by a single vocabulary (`lib/i18n/metrics.ts`).

## Canonical classifications

| Classification          | Definition                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `total_all_time_votes`  | Every `market_votes` row since launch. Lifetime volume.                                                       |
| `cycle_opinions`        | `market_votes` created within the current calendar month (matches `fund_votes.cycle = YYYY-MM`). Public copy. |
| `thirtyd_votes`         | `market_votes` rows in the trailing 30 days. Operational / admin only.                                        |
| `market_votes`          | Votes on a single market.                                                                                     |
| `market_engagement`     | `prediction_markets.total_votes + engagement_count`. Cached per-market roll-up.                               |
| `crowd_accuracy`        | Share of resolved votes with `is_correct = true` over `is_correct is not null` (registered only).             |
| `fund_cycle_votes`      | `fund_votes` in the current cycle, per cause or in total.                                                     |
| `fund_balance_mxn`      | Current `conscious_fund.balance` in MXN.                                                                      |
| `pulse_market_stats`    | Vote count / avg confidence / "strong opinions" on a single Pulse market.                                     |
| `sponsor_market_votes`  | Sum of votes across a sponsor's markets (only shown to the sponsor).                                          |

## Surface audit

Each row lists what the surface renders today, how it's computed, the label we
show today, and the new label wired through `METRIC_LABELS`.

### Landing — `app/page.tsx` + `app/components/landing/ImpactTicker.tsx`

| Location                  | Value shown                  | Classification        | Label used today     | Label proposed                                                           |
| ------------------------- | ---------------------------- | --------------------- | -------------------- | ------------------------------------------------------------------------ |
| ImpactTicker main number  | e.g. `268`                   | `cycle_opinions` *    | `opiniones`          | `Opiniones este ciclo` + inline "→ $X para [cause]"                      |
| ImpactTicker fund amount  | `$10,000 MXN`                | `fund_balance_mxn`    | — (no label)         | unchanged (currency tells the story)                                     |
| Live banner vote count    | per-event votes              | `market_votes`        | `votos`              | unchanged (single market, scope is obvious)                              |
| Fund block per-cause      | e.g. `42 votos`              | `fund_cycle_votes`    | `votos`              | `votos este ciclo`                                                       |

\* The ticker previously summed `prediction_markets.total_votes + engagement_count` (= `market_engagement` all-time). That's inconsistent with the narrative "→ $X for [cause]" which is a cycle-scoped story. We now compute a true cycle-scoped count of `market_votes` created this calendar month and surface it alongside the existing cause-name lookup.

### Intelligence Hub — `app/(predictions)/predictions/intelligence/IntelligenceClient.tsx`

| Location              | Value shown | Classification        | Label used today    | Label proposed                                                         |
| --------------------- | ----------- | --------------------- | ------------------- | ---------------------------------------------------------------------- |
| "Predictions cast"    | `409`       | `total_all_time_votes` (body) + `thirtyd_votes` (subline) | `Predictions cast`  | `Total opinions` with `+X% vs prev 30d` subline kept; tooltip explains |
| "Crowd accuracy"      | `56.9%`     | `crowd_accuracy`      | `Crowd accuracy`    | `Crowd accuracy` (unchanged) + tooltip from `METRIC_LABELS`            |
| "Unique participants" | N           | — (users, not votes)  | `Unique participants` | unchanged                                                            |
| Markets resolved      | N           | — (markets, not votes) | `Markets resolved` | unchanged                                                              |

### Fund page — `app/(predictions)/predictions/fund/FundClient.tsx`

| Location          | Value shown  | Classification      | Label used today  | Label proposed            |
| ----------------- | ------------ | ------------------- | ----------------- | ------------------------- |
| Causes Supported  | N            | — (count of causes) | `Causes Supported` | unchanged                |
| Per-cause bar     | e.g. `42`    | `fund_cycle_votes`  | `votos`           | `votos este ciclo`        |
| Your impact XP    | N            | — (user-specific)   | `XP`              | unchanged                 |
| Total Fund (MXN)  | `$X,XXX`     | `fund_balance_mxn`  | no label needed   | unchanged                 |

### Pulse — `app/pulse/page.tsx` + `components/pulse/PulseLandingExplainer.tsx`

| Location              | Value shown | Classification       | Label today                   | Label proposed             |
| --------------------- | ----------- | -------------------- | ----------------------------- | -------------------------- |
| Featured Pulse votes  | N           | `pulse_market_stats` | `votos` / `votes`             | unchanged                  |
| Avg confidence        | `X.Y/10`    | `pulse_market_stats` | `confianza promedio`          | unchanged                  |
| Strong opinions (≥8)  | N           | `pulse_market_stats` | `opiniones fuertes (8–10)`    | unchanged                  |

### Sponsor dashboard (token-authed) — `components/sponsor/SponsorDashboardClient.tsx`

These are private per-sponsor metrics. They do not conflict with public counts
and need no relabel.

## Why 268 ≠ 409

- **`268`** on the landing is now `cycle_opinions` — market votes created in the
  current calendar month. It pairs with a cycle-scoped narrative ("→ $X for
  [cause]") so the horizon is consistent with the story.
- **`409`** on the Intelligence Hub is `total_all_time_votes` — every
  `market_votes` row ever cast. The sub-tile below it shows the 30-day delta,
  which is why the number looks close to a trailing activity figure.

Both are correct. They differ because one scopes to the current cycle and the
other is lifetime.

## Tooltip UX

A lightweight `components/ui/MetricTooltip.tsx` renders an info icon with a
44px touch target and a popover pulled from `METRIC_LABELS[*].tooltip_[locale]`.
It's used anywhere a public number needs a parenthetical definition without
expanding the copy into a paragraph.

## Cron health — why `live-auto-end` and `pulse-auto-resolve` show `never_run`

Both cron routes execute on schedule but never call `cronHealthCheck /
cronHealthComplete`, so no rows are written to `cron_job_runs`. The
`/api/admin/cron-health` handler falls back to the literal string `'never_run'`
when the table is empty for a given `job_name` — which is why the
`CronHealthTile` banner shows them as red.

Fix in this PR: add a wrapping `cronHealthCheck` at the top of each route and a
matching `cronHealthComplete(...'success' | 'error')` at the end. From the next
scheduled tick onward, both show green on `/admin`.
