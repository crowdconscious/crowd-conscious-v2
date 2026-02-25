import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import PredictionsShell from './PredictionsShell'

export default async function PredictionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

  // Gate page: no auth required
  if (pathname === '/predictions/gate') {
    return <PredictionsShell>{children}</PredictionsShell>
  }

  // All other predictions pages: require auth
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  return <PredictionsShell>{children}</PredictionsShell>
}
