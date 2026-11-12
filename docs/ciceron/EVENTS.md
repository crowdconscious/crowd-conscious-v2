# Cicerón product events

Typed analytics for engagement loops and growth indicators (Prompt 8).  
**One helper:** `lib/ciceron/events.ts` → `recordCiceronEvent`.  
Insert path: service-role admin client, or `ciceron.record_product_event` (SECURITY DEFINER, `EXECUTE` to `service_role` only).

## Privacy

Never put **client names**, **document text**, or **question text** in `properties`.  
Enforced by:

1. Type-level allow-lists per event name (`CiceronEventPayload`)
2. Runtime Zod parse + global **allow-list** of keys (`ALLOWED_EVENT_PROPERTY_KEYS`)
3. SQL RPC `record_product_event` allow-list (same keys); string values `^[A-Za-z0-9_:.-]{1,120}$`
4. Migration `316`: authenticated cannot INSERT/UPDATE/DELETE `ciceron.events` (service_role / RPC only)

Allowed property keys: `room`, `surface`, `kind`, `verdict`, `reason_code`, `output_type`, `decision`, `simulated`, `invite_role`, `source_kind`, `source_id`, `match_id`, `matter_id`, `client_id`, `watch_profile_id`, `is_demo`. Prefer `is_demo: true` on seed/demo rows.

## Event catalog

| Name | When | Allowed properties |
|---|---|---|
| `session_started` | Invite cookie session resolves / Hoy load | `surface?` (`hoy` \| `invite` \| `admin`), `is_demo?` |
| `room_opened` | User opens a room | `room` (hoy \| monitor-dof \| expedientes \| investigacion \| revision \| clientes \| admin-metricas \| admin-fuentes), `is_demo?` |
| `briefing_opened` | Morning or weekly briefing preview opened | `kind` (`morning` \| `weekly_socio`), `is_demo?` |
| `alert_opened` | Matched alert / Monitor card opened | `match_id?`, `is_demo?` |
| `alert_feedback` | Relevant / not relevant on a match | `verdict` (`relevant` \| `not_relevant`), `match_id?`, `reason_code?`, `is_demo?` |
| `source_opened` | Official source chip opened | `source_kind` (`dof` \| `case_file` \| `other`), `source_id?`, `is_demo?` |
| `research_asked` | Research question submitted | `matter_id?`, `is_demo?` |
| `research_feedback` | Useful / incorrect / incomplete | `verdict` (`useful` \| `incorrect` \| `incomplete`), `is_demo?` |
| `draft_created` | Draft / client alert prepared | `output_type`, `matter_id?`, `is_demo?` |
| `review_decided` | Approve / reject / approve-with-edits | `decision`, `output_type?`, `is_demo?` |
| `delivery_confirmed` | Delivery registered (usually simulated) | `output_type`, `simulated`, `is_demo?` |
| `deadline_confirmed` | Deadline confirmed (tier 2) | `matter_id?`, `is_demo?` |
| `watch_profile_created` | New watch profile | `client_id`, `watch_profile_id?`, `is_demo?` |
| `watch_profile_edited` | Watch profile changed | `watch_profile_id`, `reason_code?`, `is_demo?` |
| `saved_view_created` | Saved view created | `room`, `is_demo?` |
| `invite_redeemed` | Invite code accepted | `invite_role?`, `is_demo?` |

Legacy inserts (`match_feedback_relevant`, `prepare_client_alert`, …) may still exist in older rows; new code emits only the names above.

## Indicators (SQL views)

Defined in `314_ciceron_engagement.sql` with comments on each view. Rates are `NULL` (UI shows «—») when the denominator is under threshold.

| View | Definition |
|---|---|
| `metric_activation` | ≥3 watch profiles and `alert_opened` within 48h of first profile |
| `metric_habit_weekly` | Share of seats with Hoy opens on ≥4 business days / week |
| `metric_alert_precision_weekly` | Relevant feedback / feedback sample (dash if n &lt; 5) |
| `metric_review_turnaround_weekly` | Median seconds task → decision (dash if n &lt; 3) |
| `metric_value_moments_weekly` | Client-alert deliveries + confirmed deadlines / week |
| `metric_expansion` | Clients, matters, seats per firm |
| `metric_cost_weekly` | Sum of `ai_runs.cost_estimate_usd` / firm / week |

## No gamification

No points, streaks, badges, or leaderboards.
