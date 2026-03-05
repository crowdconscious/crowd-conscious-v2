import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import PredictionsShell from './PredictionsShell'

export default async function PredictionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // All predictions pages: require auth
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.user_type === 'admin'

  return <PredictionsShell isAdmin={isAdmin}>{children}</PredictionsShell>
}
