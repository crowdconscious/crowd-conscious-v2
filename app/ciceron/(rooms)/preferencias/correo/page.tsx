import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { loadMorningEmailPrefs } from '@/lib/ciceron/engagement/morning-email-data'
import {
  saveMorningEmailPrefsAction,
  sendDemoMorningTestAction,
  sendMorningPreviewAction,
} from '@/lib/ciceron/engagement/morning-email-actions'
import { isMorningEmailEnabled } from '@/lib/ciceron/engagement/morning-email-gate'
import {
  canSendDemoLiveTest,
  readDemoRecipientEmail,
} from '@/lib/ciceron/engagement/demo-recipient'
import { CICERON_SEED } from '@/lib/ciceron/db/seed-ids'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

export default async function MorningEmailPrefsPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const prefs = await loadMorningEmailPrefs(persona)
  const cronOn = isMorningEmailEnabled()
  const showDemoTest =
    persona.firmId === CICERON_SEED.firmDemo && canSendDemoLiveTest(persona.role)
  const demoRecipientConfigured = Boolean(readDemoRecipientEmail())

  return (
    <div>
      <h1 className="cic-h1">{copy.morningEmail.title}</h1>
      <p className="cic-lead">{copy.morningEmail.lead}</p>
      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {cronOn
          ? copy.morningEmail.cronEnabled
          : copy.morningEmail.cronDisabled}
      </p>
      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {copy.morningEmail.demoSafety}
      </p>

      <form action={saveMorningEmailPrefsAction} className="cic-stack" style={{ marginTop: 24, maxWidth: 480 }}>
        <label>
          <span className="cic-muted" style={{ fontSize: '0.75rem' }}>
            {copy.morningEmail.email}
          </span>
          <input
            type="email"
            name="email"
            className="cic-input"
            required
            defaultValue={prefs?.email ?? ''}
            placeholder="nombre@despacho.mx"
            style={{ marginTop: 4, width: '100%' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            name="morningEnabled"
            defaultChecked={prefs?.morningEnabled ?? false}
          />
          <span>{copy.morningEmail.enable}</span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            name="includeNovedades"
            defaultChecked={prefs?.includeNovedades ?? true}
          />
          <span>{copy.morningEmail.includeNovedades}</span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            name="includePlazos"
            defaultChecked={prefs?.includePlazos ?? true}
          />
          <span>{copy.morningEmail.includePlazos}</span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            name="includeAssignments"
            defaultChecked={prefs?.includeAssignments ?? true}
          />
          <span>{copy.morningEmail.includeAssignments}</span>
        </label>

        <button type="submit" className="cic-btn">
          {copy.morningEmail.save}
        </button>
      </form>

      <form action={sendMorningPreviewAction} style={{ marginTop: 16 }}>
        <button type="submit" className="cic-btn cic-btn-secondary">
          {copy.morningEmail.sendPreview}
        </button>
        <p className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
          {copy.morningEmail.sendPreviewNote}
        </p>
      </form>

      {showDemoTest ? (
        <form action={sendDemoMorningTestAction} style={{ marginTop: 24 }}>
          <button
            type="submit"
            className="cic-btn"
            disabled={!cronOn || !demoRecipientConfigured}
          >
            {copy.morningEmail.sendDemoTest}
          </button>
          <p className="cic-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>
            {copy.morningEmail.sendDemoTestNote}
          </p>
        </form>
      ) : null}
    </div>
  )
}
