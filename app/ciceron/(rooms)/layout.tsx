import { redirect } from 'next/navigation'
import { CiceronShell } from '../_components/CiceronShell'
import { CICERON_BASE } from '@/lib/ciceron/config'
import { loadM365Status } from '@/lib/ciceron/case-files/data'
import { getCiceronDemoSession, sessionMeta } from '@/lib/ciceron/demo/session'
import { loadReviewBadgeCount } from '@/lib/ciceron/review/data'

export default async function CiceronRoomsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const persona = await getCiceronDemoSession()
  if (!persona) {
    redirect(CICERON_BASE)
  }

  const [m365, reviewBadge] = await Promise.all([
    loadM365Status(persona),
    loadReviewBadgeCount(persona),
  ])
  return (
    <CiceronShell
      meta={{
        ...sessionMeta(persona),
        m365Status: m365.status,
        reviewBadge,
      }}
    >
      {children}
    </CiceronShell>
  )
}
