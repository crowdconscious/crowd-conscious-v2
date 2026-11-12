import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { recordCiceronEvent } from '@/lib/ciceron/events'

export default async function ProteccionPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  await recordCiceronEvent({
    name: 'room_opened',
    firmId: persona.firmId,
    userId: persona.id,
    properties: { room: 'proteccion', is_demo: true },
  })

  return (
    <div>
      <h1 className="cic-h1">{copy.proteccion.title}</h1>
      <p className="cic-lead">{copy.proteccion.lead}</p>

      <section className="cic-section" aria-labelledby="iso">
        <h2 id="iso" className="cic-h2">
          {copy.proteccion.isolationTitle}
        </h2>
        <p>{copy.proteccion.isolationBody}</p>
      </section>
      <section className="cic-section" aria-labelledby="train">
        <h2 id="train" className="cic-h2">
          {copy.proteccion.noTrainingTitle}
        </h2>
        <p>{copy.proteccion.noTrainingBody}</p>
      </section>
      <section className="cic-section" aria-labelledby="human">
        <h2 id="human" className="cic-h2">
          {copy.proteccion.humanTitle}
        </h2>
        <p>{copy.proteccion.humanBody}</p>
      </section>
      <section className="cic-section" aria-labelledby="audit">
        <h2 id="audit" className="cic-h2">
          {copy.proteccion.auditTitle}
        </h2>
        <p>{copy.proteccion.auditBody}</p>
      </section>
      <section className="cic-section" aria-labelledby="export">
        <h2 id="export" className="cic-h2">
          {copy.proteccion.exportTitle}
        </h2>
        <p>{copy.proteccion.exportBody}</p>
      </section>
    </div>
  )
}
