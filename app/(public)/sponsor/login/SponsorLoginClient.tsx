'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function SponsorLoginClient() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/sponsor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.dashboardUrl) {
        setError(data.error || 'No se pudo iniciar sesión.')
        return
      }
      // Hard redirect so the new httpOnly cookie is included in the next
      // request from the dashboard.
      window.location.href = data.dashboardUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-block">
          <Image
            src="/images/logo-small.png"
            alt="Crowd Conscious"
            width={48}
            height={48}
            className="mx-auto"
          />
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-white">Sponsor login</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ingresa el coupon code que te entregó el equipo de Crowd Conscious.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4 backdrop-blur"
      >
        <label className="block">
          <span className="text-xs font-medium text-slate-300">Coupon code</span>
          <input
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mt-1 w-full px-3 py-3 bg-slate-950 border border-slate-700 rounded-md text-white font-mono tracking-[0.3em] text-center text-lg focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
            placeholder="XXXXXXXX"
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        {error && (
          <div
            role="alert"
            className="text-sm text-red-300 bg-red-950/60 border border-red-900 rounded p-3"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="w-full px-5 py-3 bg-emerald-600 text-white rounded-md font-semibold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Verificando…' : 'Entrar al dashboard'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-500">
        ¿Tu código no funciona?{' '}
        <a
          href="mailto:hello@crowdconscious.app"
          className="text-emerald-400 hover:text-emerald-300"
        >
          hello@crowdconscious.app
        </a>
      </p>
    </div>
  )
}
