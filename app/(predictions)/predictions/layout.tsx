import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import PredictionsShell from './PredictionsShell'

const PUBLIC_PATHS = ['/predictions/leaderboard', '/predictions/fund']

export default async function PredictionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const user = await getCurrentUser()

  if (!isPublicPath && !user) {
    redirect('/login')
  }

  let isAdmin = false
  if (user) {
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.user_type === 'admin'
  }

  return (
    <PredictionsShell isAdmin={isAdmin} isAuthenticated={!!user}>
      {children}
    </PredictionsShell>
  )
}
