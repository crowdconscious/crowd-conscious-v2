import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { copy } from '@/lib/ciceron/copy/es-MX'
import { getCiceronDemoSession } from '@/lib/ciceron/demo/session'
import { ManualCaptureForm } from './ManualCaptureForm'

export default async function CapturaPage() {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)

  return (
    <div>
      <p style={{ marginBottom: 8 }}>
        <Link href="/ciceron/expedientes" className="cic-muted" style={{ fontSize: '0.9rem' }}>
          ← {copy.rooms.expedientes}
        </Link>
      </p>
      <h1 className="cic-h1">{copy.expedientes.captureManual}</h1>
      <p className="cic-lead">{copy.expedientes.captureLead}</p>
      <p className="cic-demo-inline">{copy.demoLabel}</p>
      <ManualCaptureForm />
    </div>
  )
}
