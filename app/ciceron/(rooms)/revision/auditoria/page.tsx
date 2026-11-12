import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { loadAuditEvents } from '@/lib/ciceron/review/data'
import { AuditViewer } from './AuditViewer'

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ matter?: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const sp = await searchParams
  const { rows, canView, source } = await loadAuditEvents(persona, {
    matterId: sp.matter ?? null,
  })

  return (
    <div>
      <p className="cic-muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        <Link href={`${CICERON_BASE}/revision`}>{copy.revision.title}</Link>
        {' / '}
        {copy.audit.title}
      </p>
      <h1 className="cic-h1">{copy.audit.title}</h1>
      <p className="cic-lead">{copy.audit.lead}</p>
      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {source === 'fixture' ? copy.revision.demoSource : copy.demoLabel}
      </p>

      {!canView ? (
        <p className="cic-flash cic-flash-err" role="alert">
          {copy.audit.forbidden}
        </p>
      ) : (
        <AuditViewer rows={rows} />
      )}
    </div>
  )
}