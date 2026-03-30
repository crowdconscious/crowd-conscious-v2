import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { InsightsClient } from './InsightsClient'

export default async function InsightsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: agentContent, count } = await supabase
    .from('agent_content')
    .select('*', { count: 'exact' })
    .eq('published', true)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .range(0, 19)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/predictions"
          className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white">Insights</h1>
      <p className="text-slate-400">Market intelligence and analysis.</p>

      <InsightsClient initialItems={agentContent ?? []} totalCount={count ?? 0} />
    </div>
  )
}
