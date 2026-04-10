'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function CreatePulseForm({ token }: { token: string }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [resolutionCriteria, setResolutionCriteria] = useState('')
  const [resolutionDate, setResolutionDate] = useState('')
  const [o1, setO1] = useState('')
  const [o2, setO2] = useState('')
  const [o3, setO3] = useState('')
  const [o4, setO4] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [marketId, setMarketId] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const outcomes = [o1, o2, o3, o4].map((s) => s.trim()).filter(Boolean)
    try {
      const res = await fetch(`/api/dashboard/sponsor/${encodeURIComponent(token)}/create-pulse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          resolution_criteria: resolutionCriteria.trim(),
          resolution_date: resolutionDate,
          outcomes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setMarketId(data.market_id as string)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (marketId) {
    return (
      <div className="mt-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="font-medium text-white">Pulse creado correctamente.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/predictions/markets/${marketId}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Ver mercado
          </Link>
          <Link
            href={`/dashboard/sponsor/${token}`}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}
      <div>
        <label className="mb-1 block text-sm text-slate-400">Pregunta / título *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-3 text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Contexto (opcional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-3 text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Criterio de resolución (opcional)</label>
        <textarea
          value={resolutionCriteria}
          onChange={(e) => setResolutionCriteria(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-3 text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Fecha de cierre *</label>
        <input
          type="datetime-local"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
          required
          className="w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-3 text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-slate-400">Opciones (mínimo 2) *</label>
        <input
          value={o1}
          onChange={(e) => setO1(e.target.value)}
          placeholder="Opción 1"
          className="mb-2 w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-2 text-white"
        />
        <input
          value={o2}
          onChange={(e) => setO2(e.target.value)}
          placeholder="Opción 2"
          className="mb-2 w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-2 text-white"
        />
        <input
          value={o3}
          onChange={(e) => setO3(e.target.value)}
          placeholder="Opción 3 (opcional)"
          className="mb-2 w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-2 text-white"
        />
        <input
          value={o4}
          onChange={(e) => setO4(e.target.value)}
          placeholder="Opción 4 (opcional)"
          className="w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-4 py-2 text-white"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading ? 'Creando…' : 'Crear Pulse'}
      </button>
    </form>
  )
}
