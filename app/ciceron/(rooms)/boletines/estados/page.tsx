import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import {
  FEDERAL_DIRECTORY,
  stateDirectorySorted,
} from '@/lib/ciceron/boletines/state-directory'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'
import { EstadosDirectoryClient } from './EstadosDirectoryClient'

export default async function BoletinesEstadosPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'boletines-estados', is_demo: true },
  })

  const states = stateDirectorySorted()

  return (
    <div>
      <p className="cic-hoy-links" style={{ marginBottom: 8 }}>
        <Link href="/ciceron/boletines">{`← ${copy.boletines.statesBackToBoletines}`}</Link>
      </p>
      <h1 className="cic-h1">{copy.boletines.statesTitle}</h1>
      <p className="cic-lead">{copy.boletines.statesLead}</p>
      <p className="cic-hoy-links">
        <Link href="/ciceron/boletines/coordinador">{copy.boletines.coordinatorLink}</Link>
      </p>

      <EstadosDirectoryClient states={states} federal={FEDERAL_DIRECTORY} />
    </div>
  )
}
