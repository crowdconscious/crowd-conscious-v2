# Multi-select Pulses (`vote_mode = multi`)

Per-option certainty voting: voters pick 2–N options and set certainty (1–10 or “No lo sé” = 0) on each pick.

**Owner applies SQL after review.** Do not auto-apply migration 262 to live Supabase. Do not change Vercel env from this PR — flip the flag when ready.

## Feature flag (default OFF)

| Env | Where | Effect |
|-----|--------|--------|
| `MULTI_SELECT_PULSES_ENABLED=true` | Server (Vercel) | Allows create APIs to accept `vote_mode: multi` |
| `NEXT_PUBLIC_MULTI_SELECT_PULSES_ENABLED=true` | Client + server | Shows multi toggle on create forms; also enables create if server flag unset |

Both default unset/false → no user-facing change. Existing Pulses stay `single`. Casting a vote on an already-`multi` Pulse still works (DB is source of truth).

Rollout:

1. Apply `supabase/migrations/262_multi_select_pulses.sql` in the Supabase SQL editor (or CLI) on the target project.
2. Deploy this web PR.
3. Set both env vars to `true` in Vercel (preview first, then production).
4. Create a TEST multi Pulse; run the manual plan below.
5. Mobile: ship guest votes via `POST /api/votes/anonymous` (not direct RPC). Separate mobile PR.

## Schema (migration 262)

- `prediction_markets.vote_mode` CHECK includes `'multi'` (alongside `single`, `ranked`).
- `prediction_markets.max_selections` int NOT NULL DEFAULT 3, CHECK 2–5.
- Trigger: `vote_mode` / `max_selections` locked after the first `market_votes` row.
- Child table `market_vote_selections` (`vote_id`, `market_id`, `outcome_id`, `confidence` 0–10, UNIQUE(vote_id, outcome_id)).
- Backfill: every existing `market_votes` row → one selection.
- `market_votes.outcome_id` + `confidence` = highest-certainty pick (tie: first in submitted selections array) so single-option consumers keep working.

## Aggregation math

Per option (multi):

- `vote_count` = number of **people** who picked it (not exclusive).
- `total_confidence` = sum of certainty across those picks (0 adds nothing).
- `probability` = `total_confidence / Σ total_confidence` (sums to 1) — internal / resolution.
- Display headline = **% of people who chose it** = `vote_count / total_votes` (does **not** sum to 100). Label: “eligieron” / “chose”.
- Average certainty among pickers excludes confidence 0.
- Reveal threshold (`PARTICIPATION_REVEAL_THRESHOLD = 25`) counts **people**.
- Density honesty: never show 0-picker bars next to a results promise.
- Winner (unchanged spirit): max total certainty across options (`resolve_pulse_market_by_plurality`).

## RPC contract (mobile / web)

### Shape of `selections`

```json
[
  { "outcome_id": "<uuid>", "confidence": 8 },
  { "outcome_id": "<uuid>", "confidence": 0 }
]
```

- `confidence`: integer 0–10 (`0` = No lo sé, zero weight).
- 1 … `max_selections` picks; no duplicate outcomes; outcomes must belong to the market.
- Top-level `outcome_id` + `confidence` must match the highest-certainty pick (tie → first in array). Web/API derive this if you only send `selections`.

### Postgres (service_role for anonymous; authenticated for signed-in)

```
execute_market_vote(
  p_user_id, p_market_id, p_outcome_id, p_confidence,
  p_rankings DEFAULT NULL, p_other_text DEFAULT NULL,
  p_selections DEFAULT NULL   -- jsonb array above
)

execute_anonymous_market_vote( ... same + p_guest_id ... )     -- service_role ONLY
execute_alias_anonymous_market_vote( ... + p_participant_id ) -- service_role ONLY
```

**Do not GRANT anonymous RPCs to `anon`.** Mobile must use the HTTP endpoints below.

Old clients that omit `p_selections` keep working (single pick from `p_outcome_id` + `p_confidence`).

### HTTP: guest vote (native app + browser)

`POST /api/votes/anonymous`  
`Content-Type: application/json`  
No cookies required.

**Request**

```json
{
  "market_id": "<uuid>",
  "guest_id": "<uuid>",
  "outcome_id": "<uuid>",
  "confidence": 8,
  "selections": [
    { "outcome_id": "<uuid>", "confidence": 8 },
    { "outcome_id": "<uuid>", "confidence": 3 }
  ],
  "reasoning": "optional",
  "other_text": "optional if Other picked",
  "rankings": null
}
```

If `selections` is present and non-empty, the server derives `outcome_id` / `confidence` from the primary (highest certainty). Legacy single-option bodies without `selections` still work.

**Success (200)**

```json
{
  "success": true,
  "message": "Tu participación fue registrada",
  "outcomes": [{ "id", "label", "probability", "vote_count" }],
  "total_votes": 12,
  "engagement_count": 12,
  "registered_vote_count": 5,
  "xp_earned": 0,
  "outcome_label": "...",
  "new_probability": 0.42,
  "vote_id": "<uuid>",
  "confidence": 8
}
```

**Already voted (200)** — `success: false`, `already_voted: true`, plus current outcomes/counts.

**Errors**

- `400` — validation / RPC error (`{ "error": "..." }`)
- `404` — market not found / not active
- `429` — rate limit (`standardRateLimit`, 20 req/min/IP). Body shape matches `/api/predictions/vote`:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Maximum 20 requests per minute. Try again after ...",
    "timestamp": "..."
  }
}
```

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

### HTTP: signed-in / alias path

`POST /api/predictions/vote` — same `selections` field. Alias anonymous path (cookie `cc_session`) also forwards `p_selections`. Rate limit: same 20/min/IP.

## Simulation / divergence

Multi Pulses are excluded: `startRun` refuses `vote_mode=multi`; `computeAndStoreDivergence` returns `{ stored: false, reason: 'multi_select_unsupported' }`.

## Unchanged

- Ranked mode (not extended).
- `fund_votes`, `simulation_votes` schema.
- Opinion votes never earn reputation/XP; anonymous votes still work.
- No nudging toward an option or certainty value (slider defaults unchanged).
