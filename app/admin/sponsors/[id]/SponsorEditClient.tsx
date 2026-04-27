'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  RotateCw,
  Plus,
  X,
  ExternalLink,
  Save,
} from 'lucide-react'
import { maskSponsorCouponCode } from '@/lib/sponsor-coupon-code'

type Account = {
  id: string
  company_name: string
  contact_email: string
  contact_name: string | null
  logo_url: string | null
  status: 'active' | 'paused' | 'cancelled' | null
  coupon_code: string | null
  notes: string | null
  access_token: string
  created_at: string
  last_login_at: string | null
}

type PulseRow = {
  id: string
  title: string
  status: string | null
  is_pulse: boolean | null
  is_draft: boolean | null
  total_votes: number | null
  sponsor_account_id: string | null
  created_at: string
}

export default function SponsorEditClient({ account }: { account: Account }) {
  const router = useRouter()
  const [form, setForm] = useState({
    company_name: account.company_name,
    contact_email: account.contact_email,
    contact_name: account.contact_name ?? '',
    logo_url: account.logo_url ?? '',
    notes: account.notes ?? '',
    status: (account.status ?? 'active') as 'active' | 'paused' | 'cancelled',
  })
  const [couponCode, setCouponCode] = useState(account.coupon_code ?? '')
  const [revealCode, setRevealCode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)

  const [assigned, setAssigned] = useState<PulseRow[] | null>(null)
  const [assignedLoading, setAssignedLoading] = useState(true)
  const [assignedError, setAssignedError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const dashboardUrl = useMemo(
    () => `/dashboard/sponsor/${account.access_token}`,
    [account.access_token]
  )

  const loadMarkets = useCallback(async () => {
    setAssignedLoading(true)
    setAssignedError(null)
    try {
      const res = await fetch(
        `/api/admin/sponsor-accounts/${account.id}/markets`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (!res.ok) {
        setAssignedError(data.error || 'Failed to load assigned Pulses')
        setAssigned([])
        return
      }
      setAssigned(data.markets ?? [])
    } catch (e) {
      setAssignedError(e instanceof Error ? e.message : 'Failed to load assigned Pulses')
    } finally {
      setAssignedLoading(false)
    }
  }, [account.id])

  useEffect(() => {
    loadMarkets()
  }, [loadMarkets])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (saving) return
      setSaving(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/sponsor-accounts/${account.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: form.company_name.trim(),
            contact_email: form.contact_email.trim(),
            contact_name: form.contact_name.trim() || null,
            logo_url: form.logo_url.trim() || null,
            notes: form.notes ?? null,
            status: form.status,
            coupon_code: couponCode.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to save sponsor')
          return
        }
        if (data.account?.coupon_code) {
          setCouponCode(data.account.coupon_code)
        }
        setSavedAt(Date.now())
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save sponsor')
      } finally {
        setSaving(false)
      }
    },
    [saving, form, couponCode, account.id, router]
  )

  const rotateCode = useCallback(async () => {
    if (rotating) return
    if (!confirm('¿Rotar el coupon code? El sponsor tendrá que usar el nuevo.')) {
      return
    }
    setRotating(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/sponsor-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotate_coupon_code: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to rotate coupon code')
        return
      }
      setCouponCode(data.account?.coupon_code ?? '')
      setRevealCode(true)
      setSavedAt(Date.now())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate coupon code')
    } finally {
      setRotating(false)
    }
  }, [rotating, account.id])

  const unassignPulse = useCallback(
    async (marketId: string) => {
      if (!confirm('¿Quitar este Pulse del sponsor?')) return
      try {
        const res = await fetch(
          `/api/admin/sponsor-accounts/${account.id}/markets/${marketId}`,
          { method: 'DELETE' }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          alert(data.error || 'No se pudo desasignar el Pulse')
          return
        }
        await loadMarkets()
      } catch (err) {
        alert(err instanceof Error ? err.message : 'No se pudo desasignar el Pulse')
      }
    },
    [account.id, loadMarkets]
  )

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/sponsors"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a sponsors
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {account.company_name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Dashboard del sponsor:{' '}
          <a
            href={dashboardUrl}
            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900"
            target="_blank"
            rel="noreferrer"
          >
            {dashboardUrl}
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-slate-900">Datos del sponsor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre *">
            <input
              required
              value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Email de contacto *">
            <input
              required
              type="email"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Nombre de contacto">
            <input
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Logo URL">
            <input
              type="url"
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Estado">
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as 'active' | 'paused' | 'cancelled',
                })
              }
              className="input"
            >
              <option value="active">Activo</option>
              <option value="paused">Pausado (no permite login)</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </Field>
          <Field label="Coupon code">
            <div className="flex gap-2">
              <input
                value={
                  revealCode || !couponCode
                    ? couponCode
                    : maskSponsorCouponCode(couponCode)
                }
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase())
                  setRevealCode(true)
                }}
                className="input flex-1 font-mono tracking-wider"
                placeholder="(sin código)"
                maxLength={32}
              />
              <button
                type="button"
                onClick={() => setRevealCode((v) => !v)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 hover:bg-slate-50"
                title={revealCode ? 'Ocultar' : 'Mostrar'}
              >
                {revealCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={rotateCode}
                disabled={rotating}
                className="inline-flex items-center gap-1 px-3 py-2 border border-emerald-500 text-emerald-700 rounded-md text-sm hover:bg-emerald-50 disabled:opacity-50"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Rotar
              </button>
            </div>
          </Field>
          <Field label="Notas (internas)" full>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input min-h-[100px]"
            />
          </Field>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {savedAt && (
              <span className="text-emerald-700">
                Guardado · {new Date(savedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      <section
        id="pulses"
        className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-sm scroll-mt-24"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pulses asignados</h2>
            <p className="text-sm text-slate-500">
              Pulses que aparecen en el dashboard de este sponsor.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
          >
            <Plus className="w-4 h-4" />
            {pickerOpen ? 'Cerrar' : 'Asignar Pulse'}
          </button>
        </div>

        {pickerOpen && (
          <PulsePicker
            sponsorId={account.id}
            onAssigned={async () => {
              setPickerOpen(false)
              await loadMarkets()
            }}
          />
        )}

        {assignedLoading ? (
          <div className="text-sm text-slate-500">Cargando Pulses…</div>
        ) : assignedError ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {assignedError}
          </div>
        ) : !assigned || assigned.length === 0 ? (
          <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded p-4">
            Este sponsor todavía no tiene Pulses asignados.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
            {assigned.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/60"
              >
                <div className="min-w-0 flex-1 pr-4">
                  <Link
                    href={`/pulse/${m.id}`}
                    className="font-medium text-slate-900 hover:text-emerald-700 truncate block"
                  >
                    {m.title}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    {m.is_draft ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        Borrador
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Publicado
                      </span>
                    )}
                    <span>·</span>
                    <span>{m.total_votes ?? 0} votos</span>
                    <span>·</span>
                    <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => unassignPulse(m.id)}
                  className="inline-flex items-center gap-1 text-sm text-red-700 hover:text-red-900"
                >
                  <X className="w-3.5 h-3.5" />
                  Desasignar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid #cbd5e1;
          background: white;
          color: #0f172a;
          font-size: 0.875rem;
        }
        :global(.input:focus) {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? 'md:col-span-2' : ''}`}>
      <span className="text-xs font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function PulsePicker({
  sponsorId,
  onAssigned,
}: {
  sponsorId: string
  onAssigned: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PulseRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const search = useCallback(
    async (term: string) => {
      setLoading(true)
      setError(null)
      try {
        const url = new URL(
          `/api/admin/sponsor-accounts/${sponsorId}/available-pulses`,
          window.location.origin
        )
        if (term) url.searchParams.set('q', term)
        const res = await fetch(url.pathname + url.search, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to search Pulses')
          setResults([])
          return
        }
        setResults(data.markets ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to search Pulses')
      } finally {
        setLoading(false)
      }
    },
    [sponsorId]
  )

  // Initial fetch + debounced search.
  useEffect(() => {
    const t = setTimeout(() => search(q), q ? 250 : 0)
    return () => clearTimeout(t)
  }, [q, search])

  const assign = useCallback(
    async (marketId: string) => {
      setAssigningId(marketId)
      setError(null)
      try {
        const res = await fetch(
          `/api/admin/sponsor-accounts/${sponsorId}/markets`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ market_id: marketId }),
          }
        )
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'No se pudo asignar el Pulse')
          return
        }
        onAssigned()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo asignar el Pulse')
      } finally {
        setAssigningId(null)
      }
    },
    [sponsorId, onAssigned]
  )

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
      <input
        autoFocus
        placeholder="Buscar Pulse por título…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}
      <div className="max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-md">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Buscando…</div>
        ) : results.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            No hay Pulses disponibles que coincidan con tu búsqueda.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {results.map((m) => {
              const alreadyMine = m.sponsor_account_id === sponsorId
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-medium text-slate-900 truncate">{m.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      {m.is_draft ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          Borrador
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Publicado
                        </span>
                      )}
                      <span>·</span>
                      <span>{m.total_votes ?? 0} votos</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => assign(m.id)}
                    disabled={assigningId === m.id || alreadyMine}
                    className="px-3 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {alreadyMine
                      ? 'Asignado'
                      : assigningId === m.id
                        ? 'Asignando…'
                        : 'Asignar'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
