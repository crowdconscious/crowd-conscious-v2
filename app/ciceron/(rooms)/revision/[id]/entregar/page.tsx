import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { loadDeliveryPreview } from '@/lib/ciceron/review/data'
import { DeliveryConfirm } from './DeliveryConfirm'

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  const { id } = await params
  const preview = await loadDeliveryPreview(persona, id)
  if (!preview) notFound()

  return (
    <div>
      <p className="cic-muted" style={{ fontSize: '0.85rem', marginBottom: 8 }}>
        <Link href={`${CICERON_BASE}/revision`}>{copy.revision.title}</Link>
        {' / '}
        <Link href={`${CICERON_BASE}/revision/${id}`}>{preview.subject}</Link>
      </p>
      <h1 className="cic-h1">{copy.delivery.title}</h1>
      <p className="cic-lead">{copy.delivery.lead}</p>
      <DeliveryConfirm preview={preview} />
    </div>
  )
}
