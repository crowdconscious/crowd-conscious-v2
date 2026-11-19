-- 334: Workspace provider preferences + Google connection state (additive).
-- Does NOT alter firm_integrations CHECK (still microsoft365_sim only).
-- Google lives in new tables; Microsoft keeps existing sim path.

CREATE TABLE IF NOT EXISTS ciceron.workspace_provider_settings (
  firm_id uuid PRIMARY KEY REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  preferred_provider text NOT NULL DEFAULT 'microsoft365'
    CHECK (preferred_provider IN ('microsoft365', 'google_workspace')),
  updated_by_actor uuid,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ciceron.workspace_provider_settings IS
  'Firm preference: Microsoft 365 vs Google Workspace. Does not store OAuth secrets.';

ALTER TABLE ciceron.workspace_provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.workspace_provider_settings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.workspace_provider_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.workspace_provider_settings TO authenticated;
GRANT ALL ON ciceron.workspace_provider_settings TO service_role;

DROP POLICY IF EXISTS workspace_provider_settings_select ON ciceron.workspace_provider_settings;
CREATE POLICY workspace_provider_settings_select ON ciceron.workspace_provider_settings
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS workspace_provider_settings_write ON ciceron.workspace_provider_settings;
CREATE POLICY workspace_provider_settings_write ON ciceron.workspace_provider_settings
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = workspace_provider_settings.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = workspace_provider_settings.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  );

DROP TRIGGER IF EXISTS workspace_provider_settings_set_updated_at
  ON ciceron.workspace_provider_settings;
CREATE TRIGGER workspace_provider_settings_set_updated_at
  BEFORE UPDATE ON ciceron.workspace_provider_settings
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();

CREATE TABLE IF NOT EXISTS ciceron.google_workspace_connections (
  firm_id uuid PRIMARY KEY REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connected')),
  connected_at timestamptz,
  connected_by_actor uuid,
  disconnected_at timestamptz,
  -- Never store refresh tokens in demo; metadata is non-secret only.
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ciceron.google_workspace_connections IS
  'Google Workspace connection state. OAuth tokens must live in a vault outside demo; this table holds status only.';

ALTER TABLE ciceron.google_workspace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.google_workspace_connections FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.google_workspace_connections FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON ciceron.google_workspace_connections TO authenticated;
GRANT ALL ON ciceron.google_workspace_connections TO service_role;

DROP POLICY IF EXISTS google_workspace_connections_select ON ciceron.google_workspace_connections;
CREATE POLICY google_workspace_connections_select ON ciceron.google_workspace_connections
  FOR SELECT TO authenticated
  USING (firm_id IN (SELECT ciceron.firms_of_current_user()));

DROP POLICY IF EXISTS google_workspace_connections_write ON ciceron.google_workspace_connections;
CREATE POLICY google_workspace_connections_write ON ciceron.google_workspace_connections
  FOR ALL TO authenticated
  USING (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = google_workspace_connections.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  )
  WITH CHECK (
    firm_id IN (SELECT ciceron.firms_of_current_user())
    AND EXISTS (
      SELECT 1 FROM ciceron.memberships m
      WHERE m.firm_id = google_workspace_connections.firm_id
        AND m.user_id = ciceron.current_actor_id()
        AND m.role IN ('socio', 'admin', 'asociado')
    )
  );

DROP TRIGGER IF EXISTS google_workspace_connections_set_updated_at
  ON ciceron.google_workspace_connections;
CREATE TRIGGER google_workspace_connections_set_updated_at
  BEFORE UPDATE ON ciceron.google_workspace_connections
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();
