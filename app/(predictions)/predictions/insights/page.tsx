import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bot, ArrowLeft } from 'lucide-react'

export default async function InsightsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: agentContent } = await supabase
    .from('agent_content')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(50)

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

      <h1 className="text-2xl font-bold text-white">AI Insights</h1>
      <p className="text-slate-400">Latest analysis and market intelligence from our AI agents.</p>

      {!agentContent || agentContent.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center">
          <Bot className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">AI insights coming soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentContent.map((ac) => (
            <div
              key={ac.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{ac.title}</p>
                  <p className="text-slate-400 text-sm mt-2 line-clamp-4">{ac.body}</p>
                  <p className="text-slate-500 text-xs mt-3">
                    {new Date(ac.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
