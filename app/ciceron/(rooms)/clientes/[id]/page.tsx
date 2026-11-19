import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ClientTag } from '../../../_components/ClientTag'
import { PrintReportButton } from '../../../_components/PrintReportButton'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadBulletinBoard } from '@/lib/ciceron/boletines/demo-data'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { formatDateLongEs } from '@/lib/ciceron/copy/format-date'
import { buildClientTimeline } from '@/lib/ciceron/demo/client-timeline-pure'
import { loadClientsRoom, loadDeadlines } from '@/lib/ciceron/demo/data'
import { fixtureDofNotes } from '@/lib/ciceron/demo/fixtures'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'

const KIND_LABEL: Record<string, string> = {
  bulletin: copy.clientes.timelineKinds.bulletin,
  dof: copy.clientes.timelineKinds.dof,
  deadline: copy.clientes.timelineKinds.deadline,
  review: copy.clientes.timelineKinds.review,
}

export default async function ClienteTimelinePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { id } = await params
  const [{ clients }, bulletins, { deadlines }] = await Promise.all([
    loadClientsRoom(persona),
    loadBulletinBoard(persona),
    loadDeadlines(persona),
  ])

  const client = clients.find((c) => c.id === id)
  if (!client) notFound()

  const nameNeedle = client.name.toLowerCase()
  const hits = bulletins.hits.filter((h) =>
    (h.clientName ?? '').toLowerCase().includes(nameNeedle.split(',')[0] ?? nameNeedle)
  )
  const dof = fixtureDofNotes.filter((n) => n.clientId === client.id)
  const clientDeadlines = deadlines.filter((d) =>
    d.clientName.toLowerCase().includes(nameNeedle.split(',')[0] ?? nameNeedle)
  )

  const events = buildClientTimeline({
    bulletinHits: hits.map((h) => ({
      id: h.id,
      summary: h.summary,
      courtName: h.courtName,
      publicationDate: h.publicationDate,
      expedienteNumber: h.expedienteNumber,
    })),
    dofNotes: dof.map((n) => ({
      id: n.id,
      title: n.title,
      date: n.date,
      reason: n.reason,
      sortIso: '2026-11-10',
    })),
    deadlines: clientDeadlines.map((d) => ({
      id: d.id,
      label: d.label,
      due: d.due,
      dueAt: d.dueAt ?? null,
    })),
  })

  return (
    <div className="cic-client-timeline-page cic-print-report">
      <p className="cic-hoy-links no-print">
        <Link href="/ciceron/clientes">{copy.clientes.backToList}</Link>
      </p>
      <header className="cic-client-timeline-head">
        <div>
          <p className="cic-demo-inline">{copy.demoLabel}</p>
          <h1 className="cic-h1">
            <ClientTag name={client.name} />
          </h1>
          <p className="cic-lead">{copy.clientes.timelineLead}</p>
          <p className="cic-muted" style={{ fontSize: '0.9rem' }}>
            {client.industry} · {formatDateLongEs(new Date().toISOString())}
          </p>
        </div>
        <div className="no-print">
          <PrintReportButton />
        </div>
      </header>

      <div className="cic-print-letterhead" aria-hidden="true">
        <strong>{copy.brand}</strong>
        <span>{copy.demoLabel}</span>
      </div>

      {events.length === 0 ? (
        <p className="cic-muted" role="status">
          {copy.clientes.timelineEmpty}
        </p>
      ) : (
        <ol className="cic-client-timeline">
          {events.map((e) => (
            <li key={e.id} className={`cic-client-timeline-item is-${e.kind}`}>
              <div className="cic-client-timeline-margin" aria-label={copy.clientes.timelineDeadlineMargin}>
                {e.deadlineLabel ? (
                  <span className="cic-client-timeline-deadline">{e.deadlineLabel}</span>
                ) : (
                  <span className="cic-muted">{e.dateLabel}</span>
                )}
              </div>
              <div className="cic-client-timeline-body">
                <span className="cic-client-timeline-kind">{KIND_LABEL[e.kind] ?? e.kind}</span>
                <h2 className="cic-client-timeline-title">{e.title}</h2>
                <p className="cic-muted">{e.detail}</p>
                {e.href ? (
                  <p className="no-print" style={{ marginTop: 8 }}>
                    <Link href={e.href} className="cic-linkish">
                      {copy.clientes.timelineOpen}
                    </Link>
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
