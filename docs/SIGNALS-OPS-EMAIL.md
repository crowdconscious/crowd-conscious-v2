# Señal ops email (Stage 50 / Stage 200)

Internal ops packets for Francisco / Comunidad when a citizen signal crosses
cosign thresholds. Complements (does not replace) verified-authority Stage-1
mail.

Francisco locked the **ops email copy** (ES). Templates live in
`lib/emails/signals/OpsPacketStage1Email.tsx`.

## Env flags

| Variable | Default | Meaning |
|----------|---------|---------|
| `SIGNALS_OPS_EMAIL_ENABLED` | on (unless `'false'`) | Kill-switch for ops packets only |
| `RESEND_ENABLED` | on (unless `'false'`) | Disables all Signal lifecycle mail including ops |
| `SIGNALS_OPS_EMAIL_TO` | _(none)_ | Optional **extra** shadow inboxes; locked ops addresses always stay |
| `NEXT_PUBLIC_SIGNALS_STAGE1` | `50` | Stage 1 cosign threshold |
| `NEXT_PUBLIC_SIGNALS_STAGE2` | `200` | Stage 2 cosign threshold |

## Recipients (always)

Ops packet **To:** always includes:

- `francisco@crowdconscious.app`
- `comunidad@crowdconscious.app`

`SIGNALS_OPS_EMAIL_TO` may add extra addresses for shadow testing; it never
removes the two locked ops inboxes.

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

## Locked subjects (ES)

| Stage | Subject |
|-------|---------|
| 50 | `Señal lista para enviar · 50 respaldos · {shortTitle}` |
| 200 | `Prioridad pública · 200 respaldos · {shortTitle} · presión social` |

(`shortTitle` truncates the signal title for inbox scannability.)

## Body sections (both stages)

1. **Señal** — title, place, category, cosign_count, public_url, admin_url, signal_id
2. **Destino** — routing_mode, target_name, official_email or `ninguno`
3. **Autor sugeridos** — email / phone / whatsapp / instagram / x (or “Crowd Conscious gestiona” if empty)
4. **Checklist Stage 50** — forward/write, find contact if missing, verify deep link, optional author ping + forwardable mail stub

### Stage 200 EXTRA

5. **Checklist presión social** — reel IG/TikTok, IG+FB tag, X tag, tag author handles if any, re-send formal mail, save post links
6. **Copy sugerido (hook)** — short hook + reel / IG+FB / X stubs

Social posting automation is out of scope.

## Stage 50 vs Stage 200

| Stage | Threshold | What gets sent |
|-------|-----------|----------------|
| 1 | 50 (default) | Verified authority mail (if any) + ops packet Stage 1 |
| 2 | 200 (default) | Ops packet Stage 2 only (no mass blast in MVP) |

Create flow: composer radio “Crowd Conscious gestiona” vs “Sé a quién
contactar” (up to 5 contact rows). Fields persist on `citizen_signals` but
stay off `citizen_signals_public`.

## Code map

- Migration: `supabase/migrations/261_signals_ops_notify.sql`
- Contacts / env helpers: `lib/signals/ops-contacts.ts`
- Send + ledger: `lib/signals/ops-notify.ts`
- Templates: `lib/emails/signals/OpsPacketStage1Email.tsx`
- Cron: `app/api/cron/signal-threshold-check/route.ts`
