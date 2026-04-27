'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Eye, EyeOff, Pencil, RefreshCw } from 'lucide-react'
import { maskSponsorCouponCode } from '@/lib/sponsor-coupon-code'

type SponsorRow = {
  id: string
  company_name: string
  contact_email: string
  contact_name: string | null
  logo_url: string | null
  status: 'active' | 'paused' | 'cancelled' | null
  coupon_code: string | null
  notes: string | null
  created_at: string
  last_login_at: string | null
  pulse_count: number
}

type CreateForm = {
  company_name: string
  contact_email: string
  contact_name: string
  logo_url: string
  coupon_code: string
  notes: string
}

const EMPTY_FORM: CreateForm = {
  company_name: '',
  contact_email: '',
  contact_name: '',
  logo_url: '',
  coupon_code: '',
  notes: '',
}

export default function AdminSponsorsClient() {
  const [sponsors, setSponsors] = useState<SponsorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sponsor-accounts', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to load sponsors')
        setSponsors([])
        return
      }
      setSponsors(data.accounts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load sponsors')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const generateCode = useCallback(async () => {
    // Generate client-side; the server still de-dupes on insert.
    setGeneratingCode(true)
    try {
      const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      const arr = new Uint32Array(8)
      crypto.getRandomValues(arr)
      for (let i = 0; i < 8; i++) {
        code += ALPHA[arr[i] % ALPHA.length]
      }
      setCreateForm((f) => ({ ...f, coupon_code: code }))
    } finally {
      setGeneratingCode(false)
    }
  }, [])

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (creating) return
      setCreating(true)
      setCreateError(null)
      try {
        const res = await fetch('/api/admin/sponsor-accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: createForm.company_name.trim(),
            contact_email: createForm.contact_email.trim(),
            contact_name: createForm.contact_name.trim() || null,
            logo_url: createForm.logo_url.trim() || null,
            coupon_code: createForm.coupon_code.trim() || null,
            notes: createForm.notes.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setCreateError(data.error || 'Failed to create sponsor')
          return
        }
        setShowCreate(false)
        setCreateForm(EMPTY_FORM)
        await load()
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : 'Failed to create sponsor')
      } finally {
        setCreating(false)
      }
    },
    [creating, createForm, load]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sponsors</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cuentas de sponsor con código de acceso y Pulses asignados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowCreate(true)
            setCreateError(null)
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo sponsor
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Nuevo sponsor</h2>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setCreateForm(EMPTY_FORM)
                setCreateError(null)
              }}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nombre *">
              <input
                required
                value={createForm.company_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, company_name: e.target.value })
                }
                className="input"
                placeholder="Alcaldía Miguel Hidalgo"
              />
            </Field>
            <Field label="Email de contacto *">
              <input
                required
                type="email"
                value={createForm.contact_email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, contact_email: e.target.value })
                }
                className="input"
                placeholder="contacto@alcaldia.cdmx.gob.mx"
              />
            </Field>
            <Field label="Nombre de contacto">
              <input
                value={createForm.contact_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, contact_name: e.target.value })
                }
                className="input"
              />
            </Field>
            <Field label="Logo URL">
              <input
                type="url"
                value={createForm.logo_url}
                onChange={(e) =>
                  setCreateForm({ ...createForm, logo_url: e.target.value })
                }
                className="input"
                placeholder="https://..."
              />
            </Field>
            <Field label="Coupon code">
              <div className="flex gap-2">
                <input
                  value={createForm.coupon_code}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      coupon_code: e.target.value.toUpperCase(),
                    })
                  }
                  className="input flex-1 font-mono tracking-wider"
                  placeholder="(auto-generado al guardar)"
                  maxLength={32}
                />
                <button
                  type="button"
                  onClick={generateCode}
                  disabled={generatingCode}
                  className="px-3 py-2 border border-emerald-500 text-emerald-700 rounded-md text-sm hover:bg-emerald-50 disabled:opacity-50"
                >
                  Generar
                </button>
              </div>
            </Field>
            <Field label="Notas (internas)" full>
              <textarea
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
                className="input min-h-[80px]"
              />
            </Field>
          </div>

          {createError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {createError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setCreateForm(EMPTY_FORM)
                setCreateError(null)
              }}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? 'Creando…' : 'Crear sponsor'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Cargando sponsors…</div>
        ) : error ? (
          <div className="p-8">
            <div className="text-red-700 bg-red-50 border border-red-200 rounded p-3">
              {error}
            </div>
            <button
              type="button"
              onClick={load}
              className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No hay sponsors. Crea el primero con el botón de arriba.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3">Sponsor</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Coupon code</th>
                <th className="text-left px-4 py-3">Pulses</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((s) => {
                const isRevealed = revealed[s.id]
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{s.company_name}</div>
                      {s.contact_name && (
                        <div className="text-xs text-slate-500">{s.contact_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.contact_email}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealed((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                        }
                        className="inline-flex items-center gap-2 font-mono tracking-wider text-slate-800 hover:text-emerald-700"
                        title={isRevealed ? 'Ocultar' : 'Mostrar'}
                      >
                        {isRevealed ? s.coupon_code ?? '—' : maskSponsorCouponCode(s.coupon_code)}
                        {isRevealed ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                        {s.pulse_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status ?? 'active'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-sm">
                        <Link
                          href={`/admin/sponsors/${s.id}`}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </Link>
                        <Link
                          href={`/admin/sponsors/${s.id}#pulses`}
                          className="text-slate-600 hover:text-slate-900"
                        >
                          Ver Pulses
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* shared field/input styles */}
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

function StatusBadge({ status }: { status: 'active' | 'paused' | 'cancelled' }) {
  const map = {
    active: 'bg-emerald-100 text-emerald-800',
    paused: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-slate-200 text-slate-600',
  } as const
  const labels = {
    active: 'Activo',
    paused: 'Pausado',
    cancelled: 'Cancelado',
  } as const
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}
    >
      {labels[status]}
    </span>
  )
}
