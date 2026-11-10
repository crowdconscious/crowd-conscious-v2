import { redirect } from 'next/navigation'
import { CiceronShell } from '../_components/CiceronShell'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { getCiceronDemoSession, sessionMeta } from '@/lib/ciceron/demo/session'

export default async function CiceronRoomsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) {
    redirect(CICERON_BASE)
  }

  return <CiceronShell meta={sessionMeta(persona)}>{children}</CiceronShell>
}
