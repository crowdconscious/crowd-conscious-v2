-- 299_ciceron_security.sql
-- Cicéron RLS helpers, policies, enforcement triggers, hybrid search.
-- Depends on 298_ciceron_foundation.sql. Idempotent where practical.

-- ---------------------------------------------------------------------------
-- Membership helpers (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.firms_of_current_user()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT m.firm_id
  FROM ciceron.memberships m
  WHERE m.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION ciceron.is_ciceron_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ciceron.memberships m WHERE m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION ciceron.is_matter_member(p_matter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ciceron.matters m
    JOIN ciceron.memberships ms
      ON ms.firm_id = m.firm_id AND ms.user_id = auth.uid()
    WHERE m.id = p_matter_id
      AND (
        ms.role IN ('socio', 'asociado', 'admin')
        OR EXISTS (
          SELECT 1
          FROM ciceron.matter_members mm
          WHERE mm.matter_id = m.id AND mm.user_id = auth.uid()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION ciceron.matter_role(p_matter_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT ms.role
  FROM ciceron.matters m
  JOIN ciceron.memberships ms
    ON ms.firm_id = m.firm_id AND ms.user_id = auth.uid()
  WHERE m.id = p_matter_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION ciceron.can_review_matter(p_matter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ciceron.matters m
    JOIN ciceron.memberships ms
      ON ms.firm_id = m.firm_id AND ms.user_id = auth.uid()
    WHERE m.id = p_matter_id
      AND ms.role IN ('socio', 'asociado', 'admin')
  )
  AND ciceron.is_matter_member(p_matter_id);
$$;

COMMENT ON FUNCTION ciceron.firms_of_current_user() IS 'Firm ids for the current auth user.';
COMMENT ON FUNCTION ciceron.is_ciceron_member() IS 'True when auth.uid() has any firm membership.';
COMMENT ON FUNCTION ciceron.is_matter_member(uuid) IS 'Firm role or explicit matter row; pasantes denied outside matter_members.';
COMMENT ON FUNCTION ciceron.can_review_matter(uuid) IS 'Socio, asociado, or admin on the matter firm, and matter-visible.';

-- Firm-scoped write helper (excludes pasante for firm-wide mutations)
CREATE OR REPLACE FUNCTION ciceron.can_manage_firm(p_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM ciceron.memberships ms
    WHERE ms.firm_id = p_firm_id
      AND ms.user_id = auth.uid()
      AND ms.role IN ('socio', 'asociado', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Immutability and business-rule triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.audit_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'ciceron.audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_immutable ON ciceron.audit_events;
CREATE TRIGGER audit_events_immutable
  BEFORE UPDATE OR DELETE ON ciceron.audit_events
  FOR EACH ROW EXECUTE FUNCTION ciceron.audit_events_immutable();

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

CREATE OR REPLACE FUNCTION ciceron.deadlines_confirm_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ciceron, public
AS $$
BEGIN
  IF NEW.status = 'confirmado' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.confirmed_by IS NULL THEN
      RAISE EXCEPTION 'confirmed_by is required when status is confirmado';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM ciceron.matters m
      JOIN ciceron.memberships ms
        ON ms.firm_id = m.firm_id
       AND ms.user_id = NEW.confirmed_by
       AND ms.role IN ('socio', 'asociado', 'admin')
      WHERE m.id = NEW.matter_id
    ) THEN
      RAISE EXCEPTION 'only socio, asociado, or admin may confirm deadlines';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deadlines_confirm_authority ON ciceron.deadlines;
CREATE TRIGGER deadlines_confirm_authority
  BEFORE INSERT OR UPDATE ON ciceron.deadlines
  FOR EACH ROW EXECUTE FUNCTION ciceron.deadlines_confirm_authority();

-- ---------------------------------------------------------------------------
-- Hybrid retrieval (tenant filters before ranking)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ciceron.search_chunks(
  query_text text,
  query_embedding extensions.vector(1536),
  p_firm_id uuid,
  p_matter_id uuid DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  fused_score double precision,
  fts_rank double precision,
  vector_distance double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ciceron, public, extensions
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
  v_tsquery tsquery;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF NOT ciceron.is_ciceron_member() THEN
    RAISE EXCEPTION 'not a ciceron member';
  END IF;

  IF p_firm_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM ciceron.firms_of_current_user() f
       WHERE f = p_firm_id
     ) THEN
    RAISE EXCEPTION 'invalid or inaccessible firm_id';
  END IF;

  IF p_matter_id IS NOT NULL AND NOT ciceron.is_matter_member(p_matter_id) THEN
    RAISE EXCEPTION 'not a member of matter';
  END IF;

  IF p_matter_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM ciceron.matters m
      WHERE m.id = p_matter_id AND m.firm_id = p_firm_id
    ) THEN
      RAISE EXCEPTION 'matter does not belong to firm';
    END IF;
  END IF;

  IF query_text IS NOT NULL AND btrim(query_text) <> '' THEN
    v_tsquery := websearch_to_tsquery('spanish', query_text);
  ELSE
    v_tsquery := NULL;
  END IF;

  RETURN QUERY
  WITH accessible AS (
    SELECT
      ch.id AS cid,
      ch.text AS ctxt,
      d.id AS did,
      CASE
        WHEN v_tsquery IS NULL THEN 0::real
        ELSE ts_rank_cd(ch.search_tsv, v_tsquery)
      END AS fts_r,
      CASE
        WHEN query_embedding IS NULL OR ch.embedding IS NULL THEN NULL::double precision
        ELSE (ch.embedding <=> query_embedding)
      END AS vec_d
    FROM ciceron.chunks ch
    JOIN ciceron.document_versions dv ON dv.id = ch.version_id
    JOIN ciceron.documents d ON d.id = dv.document_id
    WHERE (d.firm_id IS NULL OR d.firm_id = p_firm_id)
  ),
  scored AS (
    SELECT
      a.cid,
      a.ctxt,
      a.did,
      a.fts_r,
      a.vec_d,
      (
        COALESCE(a.fts_r, 0)::double precision * 0.5
        + COALESCE((1.0 / (1.0 + a.vec_d))::double precision, 0) * 0.5
      ) AS fused
    FROM accessible a
    WHERE
      (v_tsquery IS NOT NULL AND a.fts_r > 0)
      OR (query_embedding IS NOT NULL AND a.vec_d IS NOT NULL)
  )
  SELECT
    s.cid,
    s.did,
    s.ctxt,
    s.fused,
    s.fts_r::double precision,
    s.vec_d
  FROM scored s
  ORDER BY s.fused DESC NULLS LAST
  LIMIT v_limit;
END;
$$;

COMMENT ON FUNCTION ciceron.search_chunks IS 'Membership-checked hybrid FTS + vector search; filters by firm (and optional matter) before fusion.';

-- ---------------------------------------------------------------------------
-- Enable and force RLS on all Cicéron tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'firms', 'memberships', 'matter_members', 'clients', 'matters', 'parties',
    'watch_profiles', 'sources', 'documents', 'document_versions', 'chunks',
    'legal_entities', 'legal_edges', 'dof_notes', 'classifications', 'matches',
    'alerts', 'digests', 'case_files', 'case_events', 'deadlines',
    'connector_runs', 'non_working_days', 'prompt_versions', 'ai_runs',
    'ai_outputs', 'output_citations', 'review_tasks', 'review_decisions',
    'deliveries', 'audit_events', 'drafts', 'draft_versions', 'comments',
    'assignments', 'events'
  ] LOOP
    EXECUTE format('ALTER TABLE ciceron.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE ciceron.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Policies: tenancy
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS firms_select ON ciceron.firms;
CREATE POLICY firms_select ON ciceron.firms
  FOR SELECT TO authenticated
  USING (id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS firms_update ON ciceron.firms;
CREATE POLICY firms_update ON ciceron.firms
  FOR UPDATE TO authenticated
  USING (id IN (SELECT ciceron.firms_of_current_user()))
  WITH CHECK (id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS memberships_select ON ciceron.memberships;
CREATE POLICY memberships_select ON ciceron.memberships
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS memberships_insert ON ciceron.memberships;
CREATE POLICY memberships_insert ON ciceron.memberships
  FOR INSERT TO authenticated
  WITH CHECK (ciceron.can_manage_firm(firm_id));

DROP POLICY IF EXISTS memberships_update ON ciceron.memberships;
CREATE POLICY memberships_update ON ciceron.memberships
  FOR UPDATE TO authenticated
  USING (ciceron.can_manage_firm(firm_id))
  WITH CHECK (ciceron.can_manage_firm(firm_id));

DROP POLICY IF EXISTS memberships_delete ON ciceron.memberships;
CREATE POLICY memberships_delete ON ciceron.memberships
  FOR DELETE TO authenticated
  USING (ciceron.can_manage_firm(firm_id));

DROP POLICY IF EXISTS matter_members_select ON ciceron.matter_members;
CREATE POLICY matter_members_select ON ciceron.matter_members
  FOR SELECT TO authenticated
  USING (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS matter_members_write ON ciceron.matter_members;
CREATE POLICY matter_members_write ON ciceron.matter_members
  FOR ALL TO authenticated
  USING (ciceron.can_review_matter(matter_id))
  WITH CHECK (ciceron.can_review_matter(matter_id));

-- ---------------------------------------------------------------------------
-- Policies: practice
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS clients_select ON ciceron.clients;
CREATE POLICY clients_select ON ciceron.clients
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS clients_write ON ciceron.clients;
CREATE POLICY clients_write ON ciceron.clients
  FOR ALL TO authenticated
  USING (ciceron.can_manage_firm(firm_id))
  WITH CHECK (ciceron.can_manage_firm(firm_id));

DROP POLICY IF EXISTS matters_select ON ciceron.matters;
CREATE POLICY matters_select ON ciceron.matters
  FOR SELECT TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND ciceron.is_matter_member(id)
  );

DROP POLICY IF EXISTS matters_write ON ciceron.matters;
CREATE POLICY matters_write ON ciceron.matters
  FOR ALL TO authenticated
  USING (ciceron.can_manage_firm(firm_id))
  WITH CHECK (ciceron.can_manage_firm(firm_id));

DROP POLICY IF EXISTS parties_all ON ciceron.parties;
CREATE POLICY parties_all ON ciceron.parties
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS watch_profiles_select ON ciceron.watch_profiles;
CREATE POLICY watch_profiles_select ON ciceron.watch_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.clients c
      WHERE c.id = client_id
        AND c.firm_id IN (SELECT ciceron.firms_of_current_user())
    )
  );

DROP POLICY IF EXISTS watch_profiles_write ON ciceron.watch_profiles;
CREATE POLICY watch_profiles_write ON ciceron.watch_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.clients c
      WHERE c.id = client_id
        AND ciceron.can_manage_firm(c.firm_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ciceron.clients c
      WHERE c.id = client_id
        AND ciceron.can_manage_firm(c.firm_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Policies: shared corpus (read members; write service_role only)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sources_select ON ciceron.sources;
CREATE POLICY sources_select ON ciceron.sources
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP POLICY IF EXISTS legal_entities_select ON ciceron.legal_entities;
CREATE POLICY legal_entities_select ON ciceron.legal_entities
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP POLICY IF EXISTS legal_edges_select ON ciceron.legal_edges;
CREATE POLICY legal_edges_select ON ciceron.legal_edges
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP POLICY IF EXISTS dof_notes_select ON ciceron.dof_notes;
CREATE POLICY dof_notes_select ON ciceron.dof_notes
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP POLICY IF EXISTS classifications_select ON ciceron.classifications;
CREATE POLICY classifications_select ON ciceron.classifications
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP POLICY IF EXISTS non_working_days_select ON ciceron.non_working_days;
CREATE POLICY non_working_days_select ON ciceron.non_working_days
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP POLICY IF EXISTS prompt_versions_select ON ciceron.prompt_versions;
CREATE POLICY prompt_versions_select ON ciceron.prompt_versions
  FOR SELECT TO authenticated
  USING (ciceron.is_ciceron_member());

DROP POLICY IF EXISTS documents_select ON ciceron.documents;
CREATE POLICY documents_select ON ciceron.documents
  FOR SELECT TO authenticated
  USING (
    (firm_id IS NULL AND ciceron.is_ciceron_member())
    OR (firm_id IN (SELECT ciceron.firms_of_current_user()))
  );

DROP POLICY IF EXISTS documents_firm_write ON ciceron.documents;
CREATE POLICY documents_firm_write ON ciceron.documents
  FOR ALL TO authenticated
  USING (firm_id IS NOT NULL AND ciceron.can_manage_firm(firm_id))
  WITH CHECK (firm_id IS NOT NULL AND ciceron.can_manage_firm(firm_id));

DROP POLICY IF EXISTS document_versions_select ON ciceron.document_versions;
CREATE POLICY document_versions_select ON ciceron.document_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.documents d
      WHERE d.id = document_id
        AND (
          (d.firm_id IS NULL AND ciceron.is_ciceron_member())
          OR d.firm_id IN (SELECT ciceron.firms_of_current_user())
        )
    )
  );

DROP POLICY IF EXISTS document_versions_firm_write ON ciceron.document_versions;
CREATE POLICY document_versions_firm_write ON ciceron.document_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.documents d
      WHERE d.id = document_id
        AND d.firm_id IS NOT NULL
        AND ciceron.can_manage_firm(d.firm_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ciceron.documents d
      WHERE d.id = document_id
        AND d.firm_id IS NOT NULL
        AND ciceron.can_manage_firm(d.firm_id)
    )
  );

DROP POLICY IF EXISTS chunks_select ON ciceron.chunks;
CREATE POLICY chunks_select ON ciceron.chunks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM ciceron.document_versions dv
      JOIN ciceron.documents d ON d.id = dv.document_id
      WHERE dv.id = version_id
        AND (
          (d.firm_id IS NULL AND ciceron.is_ciceron_member())
          OR d.firm_id IN (SELECT ciceron.firms_of_current_user())
        )
    )
  );

DROP POLICY IF EXISTS chunks_firm_write ON ciceron.chunks;
CREATE POLICY chunks_firm_write ON ciceron.chunks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM ciceron.document_versions dv
      JOIN ciceron.documents d ON d.id = dv.document_id
      WHERE dv.id = version_id
        AND d.firm_id IS NOT NULL
        AND ciceron.can_manage_firm(d.firm_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM ciceron.document_versions dv
      JOIN ciceron.documents d ON d.id = dv.document_id
      WHERE dv.id = version_id
        AND d.firm_id IS NOT NULL
        AND ciceron.can_manage_firm(d.firm_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Policies: monitoring (firm-scoped matches)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS matches_select ON ciceron.matches;
CREATE POLICY matches_select ON ciceron.matches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM ciceron.watch_profiles wp
      JOIN ciceron.clients c ON c.id = wp.client_id
      WHERE wp.id = watch_profile_id
        AND c.firm_id IN (SELECT ciceron.firms_of_current_user())
    )
  );

DROP POLICY IF EXISTS alerts_all ON ciceron.alerts;
CREATE POLICY alerts_all ON ciceron.alerts
  FOR ALL TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()))
  WITH CHECK (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS digests_select ON ciceron.digests;
CREATE POLICY digests_select ON ciceron.digests
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- Policies: court / deadlines
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS case_files_all ON ciceron.case_files;
CREATE POLICY case_files_all ON ciceron.case_files
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS case_events_all ON ciceron.case_events;
CREATE POLICY case_events_all ON ciceron.case_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.case_files cf
      WHERE cf.id = case_file_id
        AND ciceron.is_matter_member(cf.matter_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ciceron.case_files cf
      WHERE cf.id = case_file_id
        AND ciceron.is_matter_member(cf.matter_id)
    )
  );

DROP POLICY IF EXISTS deadlines_all ON ciceron.deadlines;
CREATE POLICY deadlines_all ON ciceron.deadlines
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS connector_runs_select ON ciceron.connector_runs;
CREATE POLICY connector_runs_select ON ciceron.connector_runs
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

-- ---------------------------------------------------------------------------
-- Policies: AI + oversight
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS ai_runs_select ON ciceron.ai_runs;
CREATE POLICY ai_runs_select ON ciceron.ai_runs
  FOR SELECT TO authenticated
  USING (
    (matter_id IS NOT NULL AND ciceron.is_matter_member(matter_id))
    OR (
      matter_id IS NULL
      AND firm_id IS NOT NULL
      AND firm_id IN (SELECT ciceron.firms_of_current_user())
    )
  );

DROP POLICY IF EXISTS ai_runs_insert ON ciceron.ai_runs;
CREATE POLICY ai_runs_insert ON ciceron.ai_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    (matter_id IS NOT NULL AND ciceron.is_matter_member(matter_id))
    OR (
      matter_id IS NULL
      AND firm_id IS NOT NULL
      AND firm_id IN (SELECT ciceron.firms_of_current_user())
    )
  );

DROP POLICY IF EXISTS ai_outputs_all ON ciceron.ai_outputs;
CREATE POLICY ai_outputs_all ON ciceron.ai_outputs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.ai_runs r
      WHERE r.id = ai_run_id
        AND (
          (r.matter_id IS NOT NULL AND ciceron.is_matter_member(r.matter_id))
          OR (
            r.matter_id IS NULL
            AND r.firm_id IN (SELECT ciceron.firms_of_current_user())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ciceron.ai_runs r
      WHERE r.id = ai_run_id
        AND (
          (r.matter_id IS NOT NULL AND ciceron.is_matter_member(r.matter_id))
          OR (
            r.matter_id IS NULL
            AND r.firm_id IN (SELECT ciceron.firms_of_current_user())
          )
        )
    )
  );

DROP POLICY IF EXISTS output_citations_all ON ciceron.output_citations;
CREATE POLICY output_citations_all ON ciceron.output_citations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM ciceron.ai_outputs o
      JOIN ciceron.ai_runs r ON r.id = o.ai_run_id
      WHERE o.id = ai_output_id
        AND (
          (r.matter_id IS NOT NULL AND ciceron.is_matter_member(r.matter_id))
          OR (
            r.matter_id IS NULL
            AND r.firm_id IN (SELECT ciceron.firms_of_current_user())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM ciceron.ai_outputs o
      JOIN ciceron.ai_runs r ON r.id = o.ai_run_id
      WHERE o.id = ai_output_id
        AND (
          (r.matter_id IS NOT NULL AND ciceron.is_matter_member(r.matter_id))
          OR (
            r.matter_id IS NULL
            AND r.firm_id IN (SELECT ciceron.firms_of_current_user())
          )
        )
    )
  );

DROP POLICY IF EXISTS review_tasks_all ON ciceron.review_tasks;
CREATE POLICY review_tasks_all ON ciceron.review_tasks
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS review_decisions_all ON ciceron.review_decisions;
CREATE POLICY review_decisions_all ON ciceron.review_decisions
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS deliveries_all ON ciceron.deliveries;
CREATE POLICY deliveries_all ON ciceron.deliveries
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS audit_events_insert ON ciceron.audit_events;
CREATE POLICY audit_events_insert ON ciceron.audit_events
  FOR INSERT TO authenticated
  WITH CHECK (
    ciceron.is_ciceron_member()
    AND firm_id IN (SELECT ciceron.firms_of_current_user())
  );

DROP POLICY IF EXISTS audit_events_select ON ciceron.audit_events;
CREATE POLICY audit_events_select ON ciceron.audit_events
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

REVOKE UPDATE, DELETE ON ciceron.audit_events FROM authenticated;

-- ---------------------------------------------------------------------------
-- Policies: drafting + analytics
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS drafts_all ON ciceron.drafts;
CREATE POLICY drafts_all ON ciceron.drafts
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS draft_versions_all ON ciceron.draft_versions;
CREATE POLICY draft_versions_all ON ciceron.draft_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.drafts d
      WHERE d.id = draft_id
        AND ciceron.is_matter_member(d.matter_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ciceron.drafts d
      WHERE d.id = draft_id
        AND ciceron.is_matter_member(d.matter_id)
    )
  );

DROP POLICY IF EXISTS comments_all ON ciceron.comments;
CREATE POLICY comments_all ON ciceron.comments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ciceron.drafts d
      WHERE d.id = draft_id
        AND ciceron.is_matter_member(d.matter_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ciceron.drafts d
      WHERE d.id = draft_id
        AND ciceron.is_matter_member(d.matter_id)
    )
  );

DROP POLICY IF EXISTS assignments_all ON ciceron.assignments;
CREATE POLICY assignments_all ON ciceron.assignments
  FOR ALL TO authenticated
  USING (ciceron.is_matter_member(matter_id))
  WITH CHECK (ciceron.is_matter_member(matter_id));

DROP POLICY IF EXISTS events_select ON ciceron.events;
CREATE POLICY events_select ON ciceron.events
  FOR SELECT TO authenticated
  USING (
    (firm_id IS NULL AND user_id = auth.uid())
    OR (firm_id IN (SELECT ciceron.firms_of_current_user()))
  );

DROP POLICY IF EXISTS events_insert ON ciceron.events;
CREATE POLICY events_insert ON ciceron.events
  FOR INSERT TO authenticated
  WITH CHECK (
    (firm_id IS NULL AND user_id = auth.uid())
    OR (
      firm_id IN (SELECT ciceron.firms_of_current_user())
      AND ciceron.is_ciceron_member()
    )
  );

-- ---------------------------------------------------------------------------
-- Function grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION ciceron.firms_of_current_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ciceron.is_ciceron_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ciceron.is_matter_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ciceron.matter_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ciceron.can_review_matter(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ciceron.can_manage_firm(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION ciceron.search_chunks(text, extensions.vector, uuid, uuid, int) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION ciceron.firms_of_current_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.is_ciceron_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.is_matter_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.matter_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.can_review_matter(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.can_manage_firm(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION ciceron.search_chunks(text, extensions.vector, uuid, uuid, int) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION ciceron.set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION ciceron.audit_events_immutable() TO service_role;
GRANT EXECUTE ON FUNCTION ciceron.deliveries_tier2_gate() TO service_role;
GRANT EXECUTE ON FUNCTION ciceron.deadlines_confirm_authority() TO service_role;
