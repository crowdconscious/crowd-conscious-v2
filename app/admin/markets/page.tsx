import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminMarketsPage() {
  const supabase = await createClient()
  const { data: markets, error } = await supabase
    .from('prediction_markets')
    .select('id, title, category, status, sponsor_name, sponsor_logo_url, sponsor_url, sponsor_type, sponsor_contribution')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Error loading markets: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Prediction Markets</h1>
        <Link
          href="/predictions/admin/resolve"
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
        >
          Resolve Markets
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Title</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Category</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Sponsor</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(markets || []).map((m) => (
              <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">{m.title}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{m.category}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.status === 'resolved'
                        ? 'bg-slate-200 text-slate-700'
                        : m.status === 'active' || m.status === 'trading'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {m.sponsor_name || '—'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/markets/${m.id}`}
                    className="text-emerald-600 hover:text-emerald-500 text-sm font-medium"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
