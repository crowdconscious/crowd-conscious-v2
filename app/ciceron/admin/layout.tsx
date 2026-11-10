import { redirect } from 'next/navigation'
import { CiceronShell } from '../_components/CiceronShell'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { getCiceronDemoSession, sessionMeta } from '@/lib/ciceron/demo/session'

export default async function CiceronAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) redirect(CICERON_BASE)
  if (persona.role !== 'admin') redirect(`${CICERON_BASE}/hoy`)

  return <CiceronShell meta={sessionMeta(persona)}>{children}</CiceronShell>
}
