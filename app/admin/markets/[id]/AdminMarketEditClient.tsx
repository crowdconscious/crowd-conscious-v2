'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogoUpload } from '@/components/ui/LogoUpload'

interface Market {
  id: string
  title: string
  sponsor_name?: string | null
  sponsor_logo_url?: string | null
  sponsor_url?: string | null
  sponsor_type?: string | null
  sponsor_contribution?: number | null
}

export default function AdminMarketEditClient({ market }: { market: Market }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    sponsor_name: market.sponsor_name || '',
    sponsor_logo_url: market.sponsor_logo_url || '',
    sponsor_url: market.sponsor_url || '',
    sponsor_type: market.sponsor_type || 'business',
    sponsor_contribution: market.sponsor_contribution ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsor_name: form.sponsor_name || null,
          sponsor_logo_url: form.sponsor_logo_url || null,
          sponsor_url: form.sponsor_url || null,
          sponsor_type: form.sponsor_type || null,
          sponsor_contribution: form.sponsor_contribution
            ? parseFloat(String(form.sponsor_contribution))
            : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      router.refresh()
      alert('Sponsor info saved successfully')
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Sponsor Name</label>
        <input
          type="text"
          value={form.sponsor_name}
          onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })}
          placeholder="e.g. Acme Corp"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <LogoUpload
          currentLogoUrl={form.sponsor_logo_url || null}
          onUpload={(url) => setForm({ ...form, sponsor_logo_url: url })}
          onClear={() => setForm({ ...form, sponsor_logo_url: '' })}
          label="Sponsor logo"
          hint="Upload image, or paste a public URL below."
        />
        <label className="mt-4 block text-sm font-medium text-slate-700 mb-2">Or paste logo URL</label>
        <input
          type="url"
          value={form.sponsor_logo_url}
          onChange={(e) => setForm({ ...form, sponsor_logo_url: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Sponsor URL (website/social)</label>
        <input
          type="url"
          value={form.sponsor_url}
          onChange={(e) => setForm({ ...form, sponsor_url: e.target.value })}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Sponsor Type</label>
        <select
          value={form.sponsor_type}
          onChange={(e) => setForm({ ...form, sponsor_type: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="business">Business</option>
          <option value="individual">Individual</option>
          <option value="influencer">Influencer</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Sponsor Contribution (MXN)</label>
        <input
          type="number"
          value={form.sponsor_contribution}
          onChange={(e) => setForm({ ...form, sponsor_contribution: e.target.value })}
          placeholder="e.g. 2000"
          min="0"
          step="1"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Sponsor Info'}
        </button>
        <a
          href={`/predictions/markets/${market.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
        >
          View Market
        </a>
      </div>
    </form>
  )
}
