import { getCurrentUser } from '../../../lib/auth-server'
import { redirect } from 'next/navigation'
import AchievementsClient from './AchievementsClient'

export const dynamic = 'force-dynamic'

export default async function AchievementsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <AchievementsClient user={user} />
}

