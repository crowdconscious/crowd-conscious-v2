-- 333: Per-user morning email preferences (additive only).
-- Does NOT modify existing tables/functions/policies.
-- Real send gated by CICERON_MORNING_EMAIL_ENABLED (app) + CRON_SECRET.

CREATE TABLE IF NOT EXISTS ciceron.morning_email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  email text NOT NULL CHECK (
    char_length(email) BETWEEN 3 AND 254
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  morning_enabled boolean NOT NULL DEFAULT false,
  include_novedades boolean NOT NULL DEFAULT true,
  include_plazos boolean NOT NULL DEFAULT true,
  include_assignments boolean NOT NULL DEFAULT true,
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  last_preview_at timestamptz,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, actor_id)
);

CREATE INDEX IF NOT EXISTS morning_email_preferences_firm_enabled_idx
  ON ciceron.morning_email_preferences (firm_id)
  WHERE morning_enabled = true AND unsubscribed_at IS NULL;

COMMENT ON TABLE ciceron.morning_email_preferences IS
  'Opt-in morning digest preferences. Demo firm: only send to the actor''s own verified work email.';

ALTER TABLE ciceron.morning_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.morning_email_preferences FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.morning_email_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.morning_email_preferences TO authenticated;
GRANT ALL ON ciceron.morning_email_preferences TO service_role;

DROP POLICY IF EXISTS morning_email_preferences_own ON ciceron.morning_email_preferences;
CREATE POLICY morning_email_preferences_own ON ciceron.morning_email_preferences
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND actor_id = ciceron.current_actor_id()
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND actor_id = ciceron.current_actor_id()
  );

DROP TRIGGER IF EXISTS morning_email_preferences_set_updated_at
  ON ciceron.morning_email_preferences;
CREATE TRIGGER morning_email_preferences_set_updated_at
  BEFORE UPDATE ON ciceron.morning_email_preferences
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();
