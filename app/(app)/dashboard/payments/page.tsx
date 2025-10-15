import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import PaymentsDashboard from './PaymentsDashboard'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <PaymentsDashboard user={user} />
}

