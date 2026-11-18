import { redirect } from 'next/navigation'
import { loadJurisdictionCoverageFromRegistry } from '@/lib/ciceron/boletines/jurisdictions'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import {
  CICERON_CORPUS_DOF_DATES,
  corpusCoverageLineFromStats,
  loadCorpusCoverageStats,
} from '@/lib/ciceron/research/coverage'

export default async function FuentesCoberturaPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'fuentes-cobertura', is_demo: true },
  })

  const live = await loadCorpusCoverageStats()
  const stats = live ?? {
    dates: [...CICERON_CORPUS_DOF_DATES],
    lastUpdatedAt: null as string | null,
  }
  const sorted = [...stats.dates].sort()
  const since = sorted[0] ?? CICERON_CORPUS_DOF_DATES[0]
  const until = sorted[sorted.length - 1] ?? CICERON_CORPUS_DOF_DATES[CICERON_CORPUS_DOF_DATES.length - 1]
  const coverage = corpusCoverageLineFromStats(stats, 'es')
  const lastUpdate = stats.lastUpdatedAt
    ? stats.lastUpdatedAt
    : sorted.length
      ? `${until}`
      : null
  const jurisdictions = loadJurisdictionCoverageFromRegistry()

  return (
    <div>
      <h1 className="cic-h1">{copy.fuentesCobertura.title}</h1>
      <p className="cic-lead">{copy.fuentesCobertura.lead}</p>

      <section className="cic-section" aria-labelledby="jurisdictions">
        <h2 id="jurisdictions" className="cic-h2">
          {copy.fuentesCobertura.jurisdictionsTitle}
        </h2>
        <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
          {copy.fuentesCobertura.jurisdictionsLead}
        </p>
        <div className="cic-table-wrap">
          <table className="cic-table">
            <thead>
              <tr>
                <th scope="col">{copy.fuentesCobertura.colJurisdiction}</th>
                <th scope="col">{copy.fuentesCobertura.colMatters}</th>
                <th scope="col">{copy.fuentesCobertura.colModality}</th>
                <th scope="col">{copy.fuentesCobertura.colCoverageSince}</th>
              </tr>
            </thead>
            <tbody>
              {jurisdictions.map((j) => (
                <tr key={j.stateName}>
                  <td>{j.stateName}</td>
                  <td>{j.matterCount}</td>
                  <td>{j.modality}</td>
                  <td>
                    {j.coverageSince
                      ? formatDateLongEs(j.coverageSince)
                      : copy.fuentesCobertura.coveragePending}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
          {formatDateLongEs(since)} — {formatDateLongEs(until)} ({sorted.length} ediciones)
        </p>
        <p>{coverage}</p>
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
