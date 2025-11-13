import { getCurrentUser } from '../../../lib/auth-server'
import { redirect } from 'next/navigation'
import LeaderboardClient from './LeaderboardClient'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <LeaderboardClient user={user} />
}

