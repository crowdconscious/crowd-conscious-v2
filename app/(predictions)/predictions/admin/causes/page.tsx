'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Plus,
  Pencil,
  Power,
  PowerOff,
  X,
  Heart,
  BadgeCheck,
  Loader2,
} from 'lucide-react'

type Cause = {
  id: string
  name: string
  slug: string | null
  description: string | null
  short_description: string | null
  organization: string | null
  category: string | null
  website_url: string | null
  instagram_handle: string | null
  image_url: string | null
  logo_url: string | null
  cover_image_url: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  verified: boolean
  verified_at: string | null
  active: boolean
  created_at: string
  vote_count: number
}

const CATEGORIES = [
  { id: 'water', label: 'Water / Agua' },
  { id: 'education', label: 'Education / Educación' },
  { id: 'environment', label: 'Environment / Medio ambiente' },
  { id: 'social_justice', label: 'Social Justice / Justicia social' },
  { id: 'health', label: 'Health / Salud' },
  { id: 'mobility', label: 'Mobility / Movilidad' },
  { id: 'housing', label: 'Housing / Vivienda' },
  { id: 'hunger', label: 'Hunger / Hambre' },
  { id: 'culture', label: 'Culture / Cultura' },
  { id: 'emergency', label: 'Emergency / Emergencia' },
  { id: 'other', label: 'Other / Otro' },
] as const

const CATEGORY_STYLES: Record<string, string> = {
  water: 'bg-blue-500/20 text-blue-400',
  education: 'bg-purple-500/20 text-purple-400',
  environment: 'bg-green-500/20 text-green-400',
  social_justice: 'bg-pink-500/20 text-pink-400',
  health: 'bg-red-500/20 text-red-400',
  mobility: 'bg-cyan-500/20 text-cyan-400',
  housing: 'bg-amber-500/20 text-amber-400',
  hunger: 'bg-orange-500/20 text-orange-400',
  culture: 'bg-fuchsia-500/20 text-fuchsia-400',
  emergency: 'bg-rose-500/20 text-rose-400',
  other: 'bg-slate-500/20 text-slate-400',
}

type CauseForm = {
  name: string
  organization: string
  category: string
  short_description: string
  description: string
  website_url: string
  instagram_handle: string
  logo_url: string
  cover_image_url: string
  city: string
  verified: boolean
}

const emptyForm: CauseForm = {
  name: '',
  organization: '',
  category: 'other',
  short_description: '',
  description: '',
  website_url: '',
  instagram_handle: '',
  logo_url: '',
  cover_image_url: '',
  city: 'Ciudad de México',
  verified: false,
}

const SHORT_DESCRIPTION_MAX = 140
const DESCRIPTION_MAX = 500

export default function AdminCausesPage() {
  const [causes, setCauses] = useState<Cause[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editingCause, setEditingCause] = useState<Cause | null>(null)
  const [form, setForm] = useState<CauseForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [urlCheck, setUrlCheck] = useState<{
    status: 'idle' | 'checking' | 'ok' | 'bad'
    message?: string
  }>({ status: 'idle' })

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
    setUrlCheck({ status: 'idle' })
    setModal('add')
  }

  const openEdit = (cause: Cause) => {
    setForm({
      name: cause.name,
      organization: cause.organization || '',
      category: cause.category || 'other',
      short_description: cause.short_description || '',
      description: cause.description || '',
      website_url: cause.website_url || '',
      instagram_handle: cause.instagram_handle || '',
      logo_url: cause.logo_url || '',
      cover_image_url: cause.cover_image_url || cause.image_url || '',
      city: cause.city || 'Ciudad de México',
      verified: cause.verified,
    })
    setEditingCause(cause)
    setUrlCheck({ status: 'idle' })
    setModal('edit')
  }

  const handleVerifyUrl = async () => {
    const url = form.website_url.trim()
    if (!url) {
      setUrlCheck({ status: 'bad', message: 'Empty URL' })
      return
    }
    setUrlCheck({ status: 'checking' })
    try {
      const res = await fetch('/api/predictions/admin/causes/verify-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (data.ok) {
        setUrlCheck({ status: 'ok', message: `Reachable (${data.status ?? 'OK'})` })
      } else {
        setUrlCheck({ status: 'bad', message: data.reason || 'Unreachable' })
      }
    } catch {
      setUrlCheck({ status: 'bad', message: 'Network error' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        organization: form.organization.trim(),
        category: form.category,
        short_description: form.short_description.trim() || undefined,
        description: form.description.trim(),
        website_url: form.website_url.trim() || undefined,
        instagram_handle: form.instagram_handle.trim() || undefined,
        logo_url: form.logo_url.trim() || undefined,
        cover_image_url: form.cover_image_url.trim() || undefined,
        city: form.city.trim() || undefined,
        verified: form.verified,
      }
      if (modal === 'add') {
        const res = await fetch('/api/predictions/admin/causes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Create failed')
        setCauses((prev) => [{ ...data.cause, vote_count: 0 }, ...prev])
      } else if (modal === 'edit' && editingCause) {
        const res = await fetch('/api/predictions/admin/causes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCause.id, ...payload }),
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
      setCauses((prev) => prev.map((c) => (c.id === cause.id ? { ...c, active: false } : c)))
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
      setCauses((prev) => prev.map((c) => (c.id === cause.id ? { ...c, active: true } : c)))
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
        <div>
          <h1 className="text-2xl font-bold text-white">Manage Causes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Every row with <span className="text-emerald-400">verified = true</span> renders the
            BadgeCheck on the public grid. Unverified rows still appear if active — but add the
            checkmark only after the org signs off.
          </p>
        </div>
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
                <div className="flex items-start gap-3 min-w-0">
                  {cause.logo_url ? (
                    <Image
                      src={cause.logo_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-md object-cover border border-white/5"
                      unoptimized
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-bold text-white truncate">{cause.name}</h3>
                      {cause.verified && (
                        <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Verified" />
                      )}
                    </div>
                    {cause.slug && (
                      <p className="text-xs text-slate-500 mt-0.5">/{cause.slug}</p>
                    )}
                  </div>
                </div>
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
              {cause.short_description && (
                <p className="text-slate-400 text-sm line-clamp-2">{cause.short_description}</p>
              )}
              <p className="text-slate-500 text-xs">
                {cause.vote_count} vote{cause.vote_count !== 1 ? 's' : ''} this cycle
              </p>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[rgba(255,255,255,0.07)]">
                <button
                  onClick={() => openEdit(cause)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                {cause.slug && (
                  <Link
                    href={`/fund/causes/${cause.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-sm font-medium"
                  >
                    View public page
                  </Link>
                )}
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

      {modal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => !submitting && setModal(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div
              className="bg-[#0a0e14] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 w-full max-w-2xl shadow-xl my-8"
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      required
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Aquí Nadie Se Rinde"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Organization *
                    </label>
                    <input
                      type="text"
                      value={form.organization}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, organization: e.target.value }))
                      }
                      required
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Aquí Nadie Se Rinde A.C."
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Category *
                    </label>
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
                    <label className="block text-sm font-medium text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ciudad de México"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Short description (card copy)
                  </label>
                  <input
                    type="text"
                    value={form.short_description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        short_description: e.target.value.slice(0, SHORT_DESCRIPTION_MAX),
                      }))
                    }
                    maxLength={SHORT_DESCRIPTION_MAX}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="One line for grid cards"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    {form.short_description.length}/{SHORT_DESCRIPTION_MAX}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        description: e.target.value.slice(0, DESCRIPTION_MAX),
                      }))
                    }
                    required
                    maxLength={DESCRIPTION_MAX}
                    rows={4}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="Full description for the cause detail page"
                  />
                  <p className="text-slate-500 text-xs mt-1">
                    {form.description.length}/{DESCRIPTION_MAX}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Website URL (https only)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={form.website_url}
                      onChange={(e) => {
                        setForm((f) => ({ ...f, website_url: e.target.value }))
                        setUrlCheck({ status: 'idle' })
                      }}
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://aquinadieserinde.org.mx/"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyUrl}
                      disabled={!form.website_url.trim() || urlCheck.status === 'checking'}
                      className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {urlCheck.status === 'checking' && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Verify
                    </button>
                  </div>
                  {urlCheck.status === 'ok' && (
                    <p className="text-emerald-400 text-xs mt-1">✓ {urlCheck.message}</p>
                  )}
                  {urlCheck.status === 'bad' && (
                    <p className="text-red-400 text-xs mt-1">✗ {urlCheck.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Instagram handle
                    </label>
                    <input
                      type="text"
                      value={form.instagram_handle}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, instagram_handle: e.target.value }))
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="@handle"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={form.verified}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, verified: e.target.checked }))
                        }
                        className="accent-emerald-500"
                      />
                      Verified — shows the BadgeCheck on public surfaces
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={form.logo_url}
                      onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://..."
                    />
                    {form.logo_url && (
                      <Image
                        src={form.logo_url}
                        alt=""
                        width={64}
                        height={64}
                        className="mt-2 h-16 w-16 object-cover rounded-md border border-white/10"
                        unoptimized
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Cover image URL
                    </label>
                    <input
                      type="url"
                      value={form.cover_image_url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cover_image_url: e.target.value }))
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://..."
                    />
                    {form.cover_image_url && (
                      <Image
                        src={form.cover_image_url}
                        alt=""
                        width={200}
                        height={80}
                        className="mt-2 h-20 w-full object-cover rounded-md border border-white/10"
                        unoptimized
                      />
                    )}
                  </div>
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
