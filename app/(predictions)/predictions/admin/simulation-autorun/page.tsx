import type { Metadata } from 'next'
import SimulationAutorunAdminClient from './SimulationAutorunAdminClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Simulación auto-run',
  robots: { index: false, follow: false },
}

export default function SimulationAutorunAdminPage() {
  return <SimulationAutorunAdminClient />
}
