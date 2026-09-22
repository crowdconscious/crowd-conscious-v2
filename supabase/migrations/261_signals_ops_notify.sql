-- Señal ops email hardening (Stage 50 / Stage 200)
--
-- 1. author_contact_routing + author_suggested_contacts on citizen_signals
--    Named author_contact_routing (NOT routing_mode) because routing_mode
--    already means geography routed|observation. Matches mobile PR #8.
-- 2. citizen_signal_ops_notify_log — durable send ledger per (signal, stage)
--    so cron can retry when Resend fails (fixes stamp-without-ok bug).
-- 3. Public view stays PII-free: do NOT append contacts / contact routing.
--
-- Service role writes the log. No anon/authenticated SELECT on contacts
-- or the notify log.

-- =============================================================================
-- 1. Author contact routing (ops packet, not auto Resend To:)
-- =============================================================================

-- If an earlier draft of this migration added ops_routing_mode, rename it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'citizen_signals'
      AND column_name = 'ops_routing_mode'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'citizen_signals'
      AND column_name = 'author_contact_routing'
  ) THEN
    ALTER TABLE public.citizen_signals
      RENAME COLUMN ops_routing_mode TO author_contact_routing;
  END IF;
END $$;

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS author_contact_routing text
    NOT NULL DEFAULT 'crowd_conscious';

ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_ops_routing_mode_check;
ALTER TABLE public.citizen_signals
  DROP CONSTRAINT IF EXISTS citizen_signals_author_contact_routing_check;

ALTER TABLE public.citizen_signals
  ADD CONSTRAINT citizen_signals_author_contact_routing_check
  CHECK (author_contact_routing IN ('crowd_conscious', 'author_provided'));

COMMENT ON COLUMN public.citizen_signals.author_contact_routing IS
  'Who should manage Stage 50/200 outreach: crowd_conscious (ops forwards) or author_provided (author listed suggested contacts for Francisco to use manually). Never auto-To author-supplied institution emails. Distinct from routing_mode (routed|observation geography).';

ALTER TABLE public.citizen_signals
  ADD COLUMN IF NOT EXISTS author_suggested_contacts jsonb
    NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.citizen_signals.author_suggested_contacts IS
  'Optional author-suggested contacts for ops forwarding / social pressure. Shape: [{ "kind": "email"|"phone"|"whatsapp"|"instagram"|"x", "value": "...", "label": "optional" }]. Max 5. PII — never expose via citizen_signals_public.';

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
-- 3. Public view — explicitly do NOT leak contacts / contact routing
-- =============================================================================
--
-- CREATE OR REPLACE VIEW only allows appending columns (42P16). We leave
-- the view unchanged so author_suggested_contacts and author_contact_routing
-- remain table-only (moderator / service role). Comment documents the
-- contract.

COMMENT ON VIEW public.citizen_signals_public IS
  'Anon-safe projection of published Citizen Signals. Migration 261: author_contact_routing and author_suggested_contacts stay off this view (PII / ops-only).';
