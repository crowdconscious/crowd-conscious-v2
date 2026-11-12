import { AccessTryPanel } from './AccessTryPanel'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'

export default async function AccesoPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'acceso', is_demo: true },
  })

  return (
    <div>
      <h1 className="cic-h1">{copy.access.title}</h1>
      <p className="cic-lead">{copy.access.lead}</p>
      <AccessTryPanel />
    </div>
  )
}
