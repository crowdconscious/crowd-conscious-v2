-- 319_ciceron_demo_ops.rollback.sql
-- Drops only Prompt 9 ops objects. Restores record_product_event to 314 allow-list.
-- Does not delete from audit_events.

DROP FUNCTION IF EXISTS ciceron.touch_session_freshness(text);
DROP FUNCTION IF EXISTS ciceron.update_guided_story(text, int, boolean);
DROP FUNCTION IF EXISTS ciceron.reset_demo_firm(uuid, uuid);
DROP FUNCTION IF EXISTS ciceron.refresh_demo_dates(uuid, boolean);

DROP VIEW IF EXISTS ciceron.sales_invite_progress;
DROP TABLE IF EXISTS ciceron.demo_freshness_runs;

-- Restore Prompt 8 record_product_event body (314 allow-list only)
CREATE OR REPLACE FUNCTION ciceron.record_product_event(
  p_name text,
  p_firm_id uuid,
  p_user_id uuid,
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_occurred_at timestamptz DEFAULT now(),
  p_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron
AS $$
DECLARE
  v_id uuid;
  prop_key text;
  prop_val jsonb;
  prop_str text;
BEGIN
  IF p_name IS NULL OR char_length(p_name) < 1 OR char_length(p_name) > 120 THEN
    RAISE EXCEPTION 'invalid event name';
  END IF;

  FOR prop_key, prop_val IN
    SELECT * FROM jsonb_each(COALESCE(p_properties, '{}'::jsonb))
  LOOP
    IF prop_key NOT IN (
      'room', 'surface', 'kind', 'verdict', 'reason_code', 'output_type',
      'decision', 'simulated', 'invite_role', 'source_kind', 'source_id',
      'match_id', 'matter_id', 'client_id', 'watch_profile_id', 'is_demo'
    ) THEN
      RAISE EXCEPTION 'forbidden event property: %', prop_key;
    END IF;

    IF jsonb_typeof(prop_val) = 'string' THEN
      prop_str := prop_val #>> '{}';
      IF prop_str IS NULL OR prop_str !~ '^[A-Za-z0-9_:.-]{1,120}$' THEN
        RAISE EXCEPTION 'invalid event property value for %', prop_key;
      END IF;
    ELSIF jsonb_typeof(prop_val) = 'boolean' THEN
      IF prop_key NOT IN ('simulated', 'is_demo') THEN
        RAISE EXCEPTION 'boolean not allowed for event property: %', prop_key;
      END IF;
    ELSIF jsonb_typeof(prop_val) = 'null' THEN
      CONTINUE;
    ELSE
      RAISE EXCEPTION 'invalid event property type for %', prop_key;
    END IF;
  END LOOP;

  INSERT INTO ciceron.events (id, name, firm_id, user_id, properties, occurred_at)
  VALUES (
    COALESCE(p_id, gen_random_uuid()),
    p_name,
    p_firm_id,
    p_user_id,
    COALESCE(p_properties, '{}'::jsonb),
    COALESCE(p_occurred_at, now())
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION ciceron.record_product_event(text, uuid, uuid, jsonb, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ciceron.record_product_event(text, uuid, uuid, jsonb, timestamptz, uuid)
  TO service_role;
