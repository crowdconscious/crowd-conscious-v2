import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import {
  CICERON_CORPUS_DOF_DATES,
  corpusCoverageLine,
} from '@/lib/ciceron/research/coverage'
import { tryCreateCiceronAdminClient } from '@/lib/ciceron/db/client'

async function loadLastDofUpdate(): Promise<string | null> {
  const db = tryCreateCiceronAdminClient()
  if (!db) return null
  try {
    const { data } = await db
      .from('dof_notes')
      .select('note_date, updated_at, created_at')
      .order('note_date', { ascending: false })
      .limit(1)
    const row = Array.isArray(data) ? data[0] : null
    if (!row) return null
    const r = row as Record<string, unknown>
    const pub = r.note_date ? String(r.note_date) : null
    const updated = r.updated_at
      ? String(r.updated_at)
      : r.created_at
        ? String(r.created_at)
        : null
    if (pub && updated) return `${pub} · registro ${updated}`
    return pub ?? updated
  } catch {
    return null
  }
}

export default async function FuentesCoberturaPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'fuentes-cobertura', is_demo: true },
  })

  const lastUpdate = await loadLastDofUpdate()
  const since = CICERON_CORPUS_DOF_DATES[0]
  const until = CICERON_CORPUS_DOF_DATES[CICERON_CORPUS_DOF_DATES.length - 1]

  return (
    <div>
      <h1 className="cic-h1">{copy.fuentesCobertura.title}</h1>
      <p className="cic-lead">{copy.fuentesCobertura.lead}</p>

      <section className="cic-section" aria-labelledby="src">
        <h2 id="src" className="cic-h2">
          {copy.fuentesCobertura.sourcesTitle}
        </h2>
        <p>{copy.fuentesCobertura.sourcesBody}</p>
      </section>

      <section className="cic-section" aria-labelledby="since">
        <h2 id="since" className="cic-h2">
          {copy.fuentesCobertura.sinceTitle}
        </h2>
        <p>{copy.fuentesCobertura.sinceBody}</p>
        <p className="cic-muted">
          {since} — {until} ({CICERON_CORPUS_DOF_DATES.length} ediciones)
        </p>
        <p>{corpusCoverageLine('es')}</p>
      </section>

      <section className="cic-section" aria-labelledby="last">
        <h2 id="last" className="cic-h2">
          {copy.fuentesCobertura.lastUpdateTitle}
        </h2>
        <p>
          {lastUpdate ?? copy.fuentesCobertura.lastUpdateFallback}
        </p>
        <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
          {copy.fuentesCobertura.honesty}
        </p>
      </section>
    </div>
  )
}
