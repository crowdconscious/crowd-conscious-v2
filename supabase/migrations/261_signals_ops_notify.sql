-- Señal ops email hardening (Stage 50 / Stage 200)
--
-- 1. ops_routing_mode + author_suggested_contacts on citizen_signals
--    (named ops_* because routing_mode already means geography
--    routed|observation from the mobile geography migration).
-- 2. citizen_signal_ops_notify_log — durable send ledger per (signal, stage)
--    so cron can retry when Resend fails (fixes stamp-without-ok bug).
-- 3. Public view stays PII-free: do NOT append contacts / ops mode.
--
-- Service role writes the log. No anon/authenticated SELECT on contacts
-- or the notify log.

-- =============================================================================
-- 1. Author contact routing (ops packet, not auto Resend To:)
-- =============================================================================

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS ops_routing_mode text
    NOT NULL DEFAULT 'crowd_conscious';

ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_ops_routing_mode_check;

ALTER TABLE public.citizen_signals
  ADD CONSTRAINT citizen_signals_ops_routing_mode_check
  CHECK (ops_routing_mode IN ('crowd_conscious', 'author_provided'));

COMMENT ON COLUMN public.citizen_signals.ops_routing_mode IS
  'Who should manage Stage 50/200 outreach: crowd_conscious (ops forwards) or author_provided (author listed suggested contacts for Francisco to use manually). Never auto-To author-supplied institution emails.';

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS author_suggested_contacts jsonb
    NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.citizen_signals.author_suggested_contacts IS
  'Optional author-suggested contacts for ops forwarding / social pressure. Shape: [{ "kind": "email"|"phone"|"whatsapp"|"instagram"|"x", "value": "...", "label": "optional" }]. PII — never expose via citizen_signals_public.';

-- =============================================================================
-- 2. Ops notify ledger (idempotent + retry)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.citizen_signal_ops_notify_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.citizen_signals(id) ON DELETE CASCADE,
  stage smallint NOT NULL CHECK (stage IN (1, 2)),
  status text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  resend_id text,
  error text,
  recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT citizen_signal_ops_notify_log_signal_stage_unique
    UNIQUE (signal_id, stage)
);

COMMENT ON TABLE public.citizen_signal_ops_notify_log IS
  'Durable ledger for Stage 1/2 ops packet emails (francisco@ + comunidad@). Unique (signal_id, stage). Cron retries when status is missing or failed. Service role only.';

CREATE INDEX IF NOT EXISTS idx_citizen_signal_ops_notify_log_retry
  ON public.citizen_signal_ops_notify_log (status, stage)
  WHERE status = 'failed';

ALTER TABLE public.citizen_signal_ops_notify_log ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — intentional. Cron + service-role
-- API paths bypass RLS. Admins may use service role for debugging.

-- =============================================================================
-- 3. Public view — explicitly do NOT leak contacts / ops mode
-- =============================================================================
--
-- CREATE OR REPLACE VIEW only allows appending columns (42P16). We leave
-- the view unchanged so author_suggested_contacts and ops_routing_mode
-- remain table-only (moderator / service role). Comment documents the
-- contract.

COMMENT ON VIEW public.citizen_signals_public IS
  'Anon-safe projection of published Citizen Signals. Migration 261: ops_routing_mode and author_suggested_contacts stay off this view (PII / ops-only).';
