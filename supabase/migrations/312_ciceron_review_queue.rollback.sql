-- 312_ciceron_review_queue.rollback.sql
-- Drops ONLY objects created by 312. Restores deliveries_tier2_gate to 299 body.
-- Does NOT rewrite decided_by from persona (would violate auth.users FK).

DROP FUNCTION IF EXISTS ciceron.create_delivery(uuid, uuid, uuid, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS ciceron.reassign_review(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS ciceron.save_review_edit(uuid, uuid, text);
DROP FUNCTION IF EXISTS ciceron.decide_review(uuid, uuid, text, text, text);
DROP FUNCTION IF EXISTS ciceron.write_audit_event(uuid, uuid, text, text, uuid, jsonb, text, text, text, jsonb);

DROP TRIGGER IF EXISTS review_decisions_authority ON ciceron.review_decisions;
DROP FUNCTION IF EXISTS ciceron.review_decisions_authority();

-- Restore pre-312 deliveries_tier2_gate (299 shape; INSERT only)
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

DROP TRIGGER IF EXISTS deliveries_tier2_gate ON ciceron.deliveries;
CREATE TRIGGER deliveries_tier2_gate
  BEFORE INSERT ON ciceron.deliveries
  FOR EACH ROW EXECUTE FUNCTION ciceron.deliveries_tier2_gate();

-- Restore authenticated write grants + ALL policies (299 shape)
DROP POLICY IF EXISTS review_decisions_select ON ciceron.review_decisions;
CREATE POLICY review_decisions_all ON ciceron.review_decisions
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON ciceron.review_decisions TO authenticated;

DROP POLICY IF EXISTS deliveries_select ON ciceron.deliveries;
CREATE POLICY deliveries_all ON ciceron.deliveries
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON ciceron.deliveries TO authenticated;

DROP POLICY IF EXISTS in_app_notifications_update ON ciceron.in_app_notifications;
DROP POLICY IF EXISTS in_app_notifications_select ON ciceron.in_app_notifications;
DROP TABLE IF EXISTS ciceron.in_app_notifications;

DROP POLICY IF EXISTS evaluation_candidates_select ON ciceron.evaluation_candidates;
DROP TABLE IF EXISTS ciceron.evaluation_candidates;

DROP INDEX IF EXISTS ciceron.audit_events_firm_action_idx;
DROP INDEX IF EXISTS ciceron.audit_events_firm_outcome_idx;

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
  DROP CONSTRAINT IF EXISTS review_decisions_decider_present;

ALTER TABLE ciceron.review_decisions
  DROP COLUMN IF EXISTS approved_draft_version_id,
  DROP COLUMN IF EXISTS model_draft_version_id;

-- Restore NOT NULL only when no null decided_by rows remain (no persona→auth rewrite)
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
