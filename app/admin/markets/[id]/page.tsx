import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AdminMarketEditClient from './AdminMarketEditClient'

export const dynamic = 'force-dynamic'

export default async function AdminMarketEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', (user as any).id)
    .single()

  if (profile?.user_type !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabaseClient = await createClient()

  const { data: market, error } = await supabaseClient
    .from('prediction_markets')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !market) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/markets"
          className="text-slate-600 hover:text-slate-900 text-sm font-medium"
        >
          ← Back to Markets
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Edit Market: {market.title}</h1>
      <AdminMarketEditClient market={market} />
    </div>
  )
}
