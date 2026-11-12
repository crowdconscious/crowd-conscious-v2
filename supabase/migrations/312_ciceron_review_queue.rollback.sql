-- 312_ciceron_review_queue.rollback.sql
-- Drops ONLY objects created by 312. Restores deliveries_tier2_gate to 299 body
-- (auth decided_by only) — intentional rollback of the stricter Prompt 7 gate.

DROP FUNCTION IF EXISTS ciceron.create_delivery(uuid, uuid, uuid, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS ciceron.reassign_review(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS ciceron.save_review_edit(uuid, uuid, text);
DROP FUNCTION IF EXISTS ciceron.decide_review(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS ciceron.write_audit_event(uuid, uuid, text, text, uuid, jsonb, text, text, text, jsonb);

-- Restore pre-312 deliveries_tier2_gate (299 shape; no persona / four-eyes)
CREATE OR REPLACE FUNCTION ciceron.deliveries_tier2_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
DECLARE
  v_tier int;
BEGIN
  SELECT o.tier INTO v_tier
  FROM ciceron.ai_outputs o
  WHERE o.id = NEW.ai_output_id;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'ai_output not found';
  END IF;

  IF v_tier = 2 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM ciceron.review_decisions rd
      JOIN ciceron.matters m ON m.id = rd.matter_id
      JOIN ciceron.memberships ms
        ON ms.firm_id = m.firm_id
       AND ms.user_id = rd.decided_by
       AND ms.role IN ('socio', 'asociado', 'admin')
      WHERE rd.ai_output_id = NEW.ai_output_id
        AND rd.matter_id = NEW.matter_id
        AND rd.decision IN ('approved', 'corrected')
    ) THEN
      RAISE EXCEPTION 'tier 2 delivery requires approved or corrected review by an authorised reviewer';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS in_app_notifications_update ON ciceron.in_app_notifications;
DROP POLICY IF EXISTS in_app_notifications_select ON ciceron.in_app_notifications;
DROP TABLE IF EXISTS ciceron.in_app_notifications;

DROP POLICY IF EXISTS evaluation_candidates_select ON ciceron.evaluation_candidates;
DROP TABLE IF EXISTS ciceron.evaluation_candidates;

ALTER TABLE ciceron.audit_events
  DROP COLUMN IF EXISTS snapshot_ref,
  DROP COLUMN IF EXISTS policy_reason,
  DROP COLUMN IF EXISTS policy_id,
  DROP COLUMN IF EXISTS outcome;

ALTER TABLE ciceron.deliveries
  DROP COLUMN IF EXISTS is_simulated,
  DROP COLUMN IF EXISTS body_snapshot,
  DROP COLUMN IF EXISTS subject,
  DROP COLUMN IF EXISTS recipient,
  DROP COLUMN IF EXISTS review_decision_id,
  DROP COLUMN IF EXISTS delivered_by_persona;

ALTER TABLE ciceron.draft_versions
  DROP COLUMN IF EXISTS author_persona;

ALTER TABLE ciceron.review_decisions
  DROP COLUMN IF EXISTS approved_draft_version_id,
  DROP COLUMN IF EXISTS model_draft_version_id;

-- decided_by NOT NULL restoration: only safe if no NULL rows remain
UPDATE ciceron.review_decisions
SET decided_by = decided_by_persona
WHERE decided_by IS NULL AND decided_by_persona IS NOT NULL;

-- Leave decided_by nullable if orphan nulls would block; prefer set NOT NULL when clean
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM ciceron.review_decisions WHERE decided_by IS NULL
  ) THEN
    ALTER TABLE ciceron.review_decisions
      ALTER COLUMN decided_by SET NOT NULL;
  END IF;
END $$;

ALTER TABLE ciceron.review_tasks
  DROP COLUMN IF EXISTS is_demo,
  DROP COLUMN IF EXISTS draft_id,
  DROP COLUMN IF EXISTS output_type,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS due_at;

DROP POLICY IF EXISTS firm_settings_write ON ciceron.firm_settings;
DROP POLICY IF EXISTS firm_settings_select ON ciceron.firm_settings;
DROP TRIGGER IF EXISTS firm_settings_set_updated_at ON ciceron.firm_settings;
DROP TABLE IF EXISTS ciceron.firm_settings;
