# Señal ops email (Stage 50 / Stage 200)

Internal ops packets for Francisco / Comunidad when a citizen signal crosses
cosign thresholds. Complements (does not replace) verified-authority Stage-1
mail.

## Env flags

| Variable | Default | Meaning |
|----------|---------|---------|
| `SIGNALS_OPS_EMAIL_ENABLED` | on (unless `'false'`) | Kill-switch for ops packets only |
| `RESEND_ENABLED` | on (unless `'false'`) | Disables all Signal lifecycle mail including ops |
| `SIGNALS_OPS_EMAIL_TO` | `francisco@crowdconscious.app,comunidad@crowdconscious.app` | Comma-separated To: for ops packets |
| `NEXT_PUBLIC_SIGNALS_STAGE1` | `50` | Stage 1 cosign threshold |
| `NEXT_PUBLIC_SIGNALS_STAGE2` | `200` | Stage 2 cosign threshold |

## Recipients model (shadow / ops)

- **Ops packet To:** always `SIGNALS_OPS_EMAIL_TO` (defaults above). Never
  author-suggested institution emails. Never company `target_contact_email`.
- **Authority Stage-1 To:** only verified
  `citizen_targets.notification_email` or
  `conscious_locations.contact_email`. Ops recipients go in BCC.
- **Author-suggested contacts** (`ops_routing_mode=author_provided`) appear
  in the ops email body for manual forward / social pressure. They are
  **never** Resend To:.
- `private_target_notify_at` is stamped **only** when Resend returns
  `result.ok === true`.

Ledger: `citizen_signal_ops_notify_log` unique on `(signal_id, stage)` with
status `sent` | `failed` | `skipped`. Cron retries missing/failed rows.

## Stage 50 vs Stage 200

| Stage | Threshold | What gets sent |
|-------|-----------|----------------|
| 1 | 50 (default) | Verified authority mail (if any) + ops packet Stage 1 |
| 2 | 200 (default) | Ops packet Stage 2 only (no mass blast in MVP) |

Create flow: composer radio “Crowd Conscious gestiona” vs “Sé a quién
contactar” (up to 5 contact rows). Fields persist on `citizen_signals` but
stay off `citizen_signals_public`.

## Social checklist (Stage 200)

The Stage 2 template includes a **manual** checklist (reel / IG / FB / X /
forward) plus copy stubs. Social posting automation is out of scope.

## Code map

- Migration: `supabase/migrations/261_signals_ops_notify.sql`
- Contacts / env helpers: `lib/signals/ops-contacts.ts`
- Send + ledger: `lib/signals/ops-notify.ts`
- Templates: `lib/emails/signals/OpsPacketStage1Email.tsx`
- Cron: `app/api/cron/signal-threshold-check/route.ts`
