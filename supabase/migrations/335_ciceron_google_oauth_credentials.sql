-- 335: Encrypted Google OAuth credentials (additive; do not apply in this PR).
-- Tokens are ciphertext only. Never grant SELECT of ciphertext to authenticated.
-- Status remains in google_workspace_connections (334).

CREATE TABLE IF NOT EXISTS ciceron.google_oauth_credentials (
  firm_id uuid NOT NULL REFERENCES ciceron.firms(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  google_sub text,
  account_email text,
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text,
  token_iv text NOT NULL,
  token_auth_tag text NOT NULL,
  access_token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (firm_id, actor_id)
);

COMMENT ON TABLE ciceron.google_oauth_credentials IS
  'Server-only encrypted Google OAuth tokens (AES-GCM). Never expose ciphertext to the browser.';

ALTER TABLE ciceron.google_oauth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciceron.google_oauth_credentials FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ciceron.google_oauth_credentials FROM PUBLIC, anon, authenticated;
GRANT ALL ON ciceron.google_oauth_credentials TO service_role;

-- No policies for authenticated — service_role bypasses RLS for vault access.

DROP TRIGGER IF EXISTS google_oauth_credentials_set_updated_at
  ON ciceron.google_oauth_credentials;
CREATE TRIGGER google_oauth_credentials_set_updated_at
  BEFORE UPDATE ON ciceron.google_oauth_credentials
  FOR EACH ROW EXECUTE FUNCTION ciceron.set_updated_at();
