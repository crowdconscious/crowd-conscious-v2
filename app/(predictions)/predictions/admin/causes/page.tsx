'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Power,
  PowerOff,
  X,
  Heart,
} from 'lucide-react'

type Cause = {
  id: string
  name: string
  description: string | null
  organization: string | null
  category: string | null
  website_url: string | null
  image_url: string | null
  active: boolean
  created_at: string
  vote_count: number
}

const CATEGORIES = [
  { id: 'water', label: 'Water' },
  { id: 'education', label: 'Education' },
  { id: 'environment', label: 'Environment' },
  { id: 'social_justice', label: 'Social Justice' },
  { id: 'health', label: 'Health' },
  { id: 'other', label: 'Other' },
] as const

const CATEGORY_STYLES: Record<string, string> = {
  water: 'bg-blue-500/20 text-blue-400',
  education: 'bg-purple-500/20 text-purple-400',
  environment: 'bg-green-500/20 text-green-400',
  social_justice: 'bg-pink-500/20 text-pink-400',
  health: 'bg-red-500/20 text-red-400',
  other: 'bg-slate-500/20 text-slate-400',
}

type CauseForm = {
  name: string
  organization: string
  category: string
  description: string
  website_url: string
  image_url: string
}

const emptyForm: CauseForm = {
  name: '',
  organization: '',
  category: 'other',
  description: '',
  website_url: '',
  image_url: '',
}

export default function AdminCausesPage() {
  const [causes, setCauses] = useState<Cause[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingCause, setEditingCause] = useState<Cause | null>(null)
  const [form, setForm] = useState<CauseForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchCauses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/predictions/admin/causes')
      const data = await res.json()
      if (res.status === 403) {
        window.location.href = '/predictions'
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setCauses(data.causes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCauses()
  }, [fetchCauses])

  const openAdd = () => {
    setForm(emptyForm)
    setEditingCause(null)
    setModal('add')
  }

  const openEdit = (cause: Cause) => {
    setForm({
      name: cause.name,
      organization: cause.organization || '',
      category: cause.category || 'other',
      description: cause.description || '',
      website_url: cause.website_url || '',
      image_url: cause.image_url || '',
    })
    setEditingCause(cause)
    setModal('edit')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (modal === 'add') {
        const res = await fetch('/api/predictions/admin/causes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            organization: form.organization.trim(),
            category: form.category,
            description: form.description.trim(),
            website_url: form.website_url.trim() || undefined,
            image_url: form.image_url.trim() || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Create failed')
        setCauses((prev) => [data.cause, ...prev])
      } else if (modal === 'edit' && editingCause) {
        const res = await fetch('/api/predictions/admin/causes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCause.id,
            name: form.name.trim(),
            organization: form.organization.trim(),
            category: form.category,
            description: form.description.trim(),
            website_url: form.website_url.trim() || null,
            image_url: form.image_url.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Update failed')
        setCauses((prev) =>
          prev.map((c) =>
            c.id === editingCause.id ? { ...data.cause, vote_count: c.vote_count } : c
          )
        )
      }
      setModal(null)
      setEditingCause(null)
      setForm(emptyForm)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async (cause: Cause) => {
    if (!confirm(`Deactivate "${cause.name}"? It will no longer appear on the fund page.`)) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/admin/causes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cause.id, active: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setCauses((prev) =>
        prev.map((c) => (c.id === cause.id ? { ...c, active: false } : c))
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleActivate = async (cause: Cause) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions/admin/causes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cause.id, active: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setCauses((prev) =>
        prev.map((c) => (c.id === cause.id ? { ...c, active: true } : c))
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Manage Causes</h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Add New Cause
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-slate-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : causes.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No causes yet</p>
          <p className="text-sm mt-2">Add your first cause to get started</p>
          <button
            onClick={openAdd}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            Add New Cause
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {causes.map((cause) => (
            <div
              key={cause.id}
              className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white">{cause.name}</h3>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    cause.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                  }`}
                >
                  {cause.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {cause.organization && (
                <p className="text-slate-400 text-sm">{cause.organization}</p>
              )}
              {cause.category && (
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    CATEGORY_STYLES[cause.category] ?? CATEGORY_STYLES.other
                  }`}
                >
                  {CATEGORIES.find((c) => c.id === cause.category)?.label ?? cause.category}
                </span>
              )}
              {cause.description && (
                <p className="text-slate-500 text-sm line-clamp-2">{cause.description}</p>
              )}
              <p className="text-slate-500 text-xs">
                {cause.vote_count} vote{cause.vote_count !== 1 ? 's' : ''} this cycle
              </p>
              <div className="flex gap-2 pt-2 border-t border-[rgba(255,255,255,0.07)]">
                <button
                  onClick={() => openEdit(cause)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                {cause.active ? (
                  <button
                    onClick={() => handleDeactivate(cause)}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500/80 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <PowerOff className="w-3.5 h-3.5" />
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(cause)}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500/80 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Activate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => !submitting && setModal(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-[#0a0e14] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 w-full max-w-md shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {modal === 'add' ? 'Add New Cause' : 'Edit Cause'}
                </h3>
                <button
                  onClick={() => !submitting && setModal(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Cause name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Organization *</label>
                  <input
                    type="text"
                    value={form.organization}
                    onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    required
                    maxLength={500}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="Describe the cause (max 500 chars)"
                  />
                  <p className="text-slate-500 text-xs mt-1">{form.description.length}/500</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Website URL</label>
                  <input
                    type="url"
                    value={form.website_url}
                    onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Image URL</label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : modal === 'add' ? 'Create' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
