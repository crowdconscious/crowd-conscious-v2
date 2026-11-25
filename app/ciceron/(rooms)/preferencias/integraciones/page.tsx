import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ClientNeedNotesCard } from '@/app/ciceron/_components/ClientNeedNotesCard'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { GoogleLiveActions } from '@/app/ciceron/_components/GoogleLiveActions'
import {
  connectGoogleSimAction,
  disconnectGoogleAction,
  setWorkspaceProviderAction,
  startGoogleOAuthAction,
} from '@/lib/ciceron/integrations/actions'
import {
  isGoogleWorkspaceEnabled,
  readGoogleOAuthEnv,
} from '@/lib/ciceron/integrations/google-gate'
import { readTokenEncryptionKey } from '@/lib/ciceron/integrations/token-crypto'
import { hasStoredGoogleOAuth } from '@/lib/ciceron/integrations/google-oauth'
import {
  getWorkspaceProvider,
  loadPreferredWorkspaceProvider,
} from '@/lib/ciceron/integrations/registry'
import { WORKSPACE_PROVIDER_LABELS } from '@/lib/ciceron/integrations/types'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { loadM365Status } from '@/lib/ciceron/case-files/data'

export default async function IntegracionesPrefsPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const preferred = await loadPreferredWorkspaceProvider(persona)
  const googleOn = isGoogleWorkspaceEnabled()
  const oauthEnv = readGoogleOAuthEnv()
  const encKey = readTokenEncryptionKey()
  const oauthReady = Boolean(
    oauthEnv.clientId &&
      oauthEnv.clientSecret &&
      oauthEnv.redirectUri &&
      encKey
  )
  const m365 = await loadM365Status(persona)
  const google = getWorkspaceProvider('google_workspace')
  const oauthConnected = await hasStoredGoogleOAuth({
    firmId: persona.firmId,
    actorId: persona.id,
  })
  const googleStatus = oauthConnected
    ? 'connected'
    : await google.getStatus()

  return (
    <div>
      <p style={{ marginBottom: 8 }}>
        <Link href="/ciceron/expedientes/outlook" className="cic-muted" style={{ fontSize: '0.9rem' }}>
          ← {copy.m365.consentTitle}
        </Link>
      </p>
      <h1 className="cic-h1">{copy.integrations.title}</h1>
      <p className="cic-lead">{copy.integrations.lead}</p>
      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {copy.integrations.draftsOnly}
      </p>

      <form action={setWorkspaceProviderAction} className="cic-stack" style={{ marginTop: 24, maxWidth: 420 }}>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="cic-muted" style={{ fontSize: '0.75rem', marginBottom: 8 }}>
            {copy.integrations.picker}
          </legend>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="radio"
              name="provider"
              value="microsoft365"
              defaultChecked={preferred === 'microsoft365'}
            />
            <span>{WORKSPACE_PROVIDER_LABELS.microsoft365}</span>
            <span className="cic-muted" style={{ fontSize: '0.8rem' }}>
              ({m365.status === 'connected' ? copy.integrations.connected : copy.integrations.disconnected})
            </span>
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="radio"
              name="provider"
              value="google_workspace"
              defaultChecked={preferred === 'google_workspace'}
              disabled={!googleOn}
            />
            <span>{WORKSPACE_PROVIDER_LABELS.google_workspace}</span>
            <span className="cic-muted" style={{ fontSize: '0.8rem' }}>
              ({googleOn
                ? googleStatus === 'connected'
                  ? copy.integrations.connected
                  : copy.integrations.disconnected
                : copy.integrations.googleDisabled})
            </span>
          </label>
        </fieldset>
        <button type="submit" className="cic-btn">
          {copy.integrations.saveProvider}
        </button>
      </form>

      <section className="cic-section" style={{ marginTop: 28 }}>
        <h2 className="cic-h2" style={{ fontSize: '1rem' }}>
          {WORKSPACE_PROVIDER_LABELS.microsoft365}
        </h2>
        <p>
          <Link href="/ciceron/expedientes/outlook">{copy.integrations.openM365}</Link>
        </p>
      </section>

      <section className="cic-section" style={{ marginTop: 20 }}>
        <h2 className="cic-h2" style={{ fontSize: '1rem' }}>
          {WORKSPACE_PROVIDER_LABELS.google_workspace}
        </h2>
        <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
          {copy.integrations.googleScopes}
        </p>
        {googleOn ? (
          <>
            <p className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
              {oauthReady
                ? copy.integrations.oauthReadyHint
                : copy.integrations.oauthMissingHint}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {googleStatus !== 'connected' ? (
                <>
                  {oauthReady ? (
                    <form action={startGoogleOAuthAction}>
                      <button type="submit" className="cic-btn">
                        {copy.integrations.connectGoogle}
                      </button>
                    </form>
                  ) : null}
                  <form action={connectGoogleSimAction}>
                    <button type="submit" className="cic-btn cic-btn-secondary">
                      {copy.integrations.connectGoogleSim}
                    </button>
                  </form>
                </>
              ) : (
                <form action={disconnectGoogleAction}>
                  <button type="submit" className="cic-btn cic-btn-secondary">
                    {copy.integrations.disconnectGoogle}
                  </button>
                </form>
              )}
            </div>
            {oauthConnected ? <GoogleLiveActions /> : null}
          </>
        ) : (
          <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
            {copy.integrations.googleDisabledHint}
          </p>
        )}
      </section>

      <ClientNeedNotesCard context="preferencias" />
    </div>
  )
}
