import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { FuentePageViewer } from './FuentePageViewer'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import {
  findLocalFuente,
  formatLocalFuenteHeader,
} from '@/lib/ciceron/boletines/local-sources'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'

export default async function BoletinFuentePage({
  params,
}: {
  params: Promise<{ hitId: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { hitId } = await params
  const data = await loadBulletinBoard(persona)
  const hit = data.hits.find((h) => h.id === hitId)
  if (!hit) notFound()

  const match = findLocalFuente({
    sourceKey: 'cdmx_boletin_pj',
    expediente: hit.expedienteNumber,
    courtName: hit.courtName,
  })

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'boletines', is_demo: true },
  })

  const externalUrl = hit.sourceUrl?.trim() || null

  if (!match) {
    return (
      <div>
        <p className="cic-hoy-links" style={{ marginBottom: 16 }}>
          <Link href="/ciceron/boletines">{copy.boletines.fuenteBack}</Link>
        </p>
        <h1 className="cic-h1">{copy.boletines.fuenteTitle}</h1>
        <p className="cic-lead">{copy.boletines.fuenteNoLocal}</p>
        <dl className="cic-fuente-meta">
          {hit.courtName ? (
            <>
              <dt>{copy.boletines.fuenteCourt}</dt>
              <dd>{hit.courtName}</dd>
            </>
          ) : null}
          {hit.expedienteNumber ? (
            <>
              <dt>{copy.boletines.fuenteExp}</dt>
              <dd>{hit.expedienteNumber}</dd>
            </>
          ) : null}
          {hit.partyNames ? (
            <>
              <dt>{copy.boletines.fuenteParties}</dt>
              <dd>{hit.partyNames}</dd>
            </>
          ) : null}
        </dl>
        {externalUrl ? (
          <p style={{ marginTop: 20 }}>
            <a
              className="cic-btn"
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.boletines.fuenteOpenOfficial}
            </a>
          </p>
        ) : (
          <p className="cic-muted">{copy.boletines.fuenteNoExternal}</p>
        )}
      </div>
    )
  }

  const { bulletin, entry } = match
  const header = formatLocalFuenteHeader(match)
  const imageAlt = `${bulletin.title} No. ${bulletin.bulletinNumber}, página ${entry.printedPage}`

  return (
    <div className="cic-fuente-view">
      <p className="cic-hoy-links" style={{ marginBottom: 12 }}>
        <Link href="/ciceron/boletines">{copy.boletines.fuenteBack}</Link>
      </p>

      <p className="cic-fuente-header" role="status">
        {header}
      </p>

      <h1 className="cic-h1" style={{ fontSize: '1.35rem', marginTop: 8 }}>
        {copy.boletines.fuenteTitle}
      </h1>

      <dl className="cic-fuente-meta">
        {hit.courtName ? (
          <>
            <dt>{copy.boletines.fuenteCourt}</dt>
            <dd>{hit.courtName}</dd>
          </>
        ) : null}
        {hit.expedienteNumber ? (
          <>
            <dt>{copy.boletines.fuenteExp}</dt>
            <dd>{hit.expedienteNumber}</dd>
          </>
        ) : null}
        {hit.partyNames ? (
          <>
            <dt>{copy.boletines.fuenteParties}</dt>
            <dd>{hit.partyNames}</dd>
          </>
        ) : null}
      </dl>

      <blockquote className="cic-fuente-excerpt">
        <p>{entry.excerpt || hit.summary}</p>
      </blockquote>

      <FuentePageViewer
        imagePath={entry.imagePath}
        imageAlt={imageAlt}
        highlight={entry.highlight}
        downloadLabel={copy.boletines.fuenteDownloadPage}
      />

      <div className="cic-fuente-actions">
        <a
          className="cic-btn cic-btn-compact"
          href={entry.imagePath}
          download
        >
          {copy.boletines.fuenteDownloadPage}
        </a>
        <a
          className="cic-btn cic-btn-secondary cic-btn-compact"
          href={bulletin.officialVisorUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.boletines.fuenteOpenOfficial}
        </a>
      </div>

      <p className="cic-bol-notice" role="note" style={{ marginTop: 20 }}>
        {copy.boletines.informative}
      </p>
    </div>
  )
}
