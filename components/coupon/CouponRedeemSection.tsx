'use client'

import { useState } from 'react'
import Link from 'next/link'

type Props = {
  locale: string
}

export function CouponRedeemSection({ locale }: Props) {
  const es = locale === 'es'
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    dashboardUrl: string
    message: string
  } | null>(null)

  const redeem = async () => {
    setError('')
    setSuccess(null)
    if (!code.trim() || !email.trim()) {
      setError(es ? 'Código y email son obligatorios' : 'Code and email are required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          email: email.trim(),
          name: name.trim(),
          company_name: name.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : es ? 'Error al canjear' : 'Could not redeem')
        return
      }
      setSuccess({
        dashboardUrl: typeof data.dashboardUrl === 'string' ? data.dashboardUrl : '/pulse',
        message: typeof data.message === 'string' ? data.message : '',
      })
    } catch {
      setError(es ? 'Error de red' : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setError('')
            setSuccess(null)
          }}
          className="text-sm text-emerald-400 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-300"
        >
          {es ? '¿Tienes un código de acceso?' : 'Have an access code?'}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#2d3748] bg-[#1a2029] p-6 shadow-xl"
          >
            <h3 className="mb-4 text-lg font-bold text-white">
              {es ? 'Canjear código de acceso' : 'Redeem access code'}
            </h3>

            <input
              type="text"
              autoComplete="off"
              placeholder={es ? 'Código' : 'Code'}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 uppercase text-white placeholder:text-slate-500"
            />
            <input
              type="email"
              autoComplete="email"
              placeholder={es ? 'Tu email' : 'Your email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-white placeholder:text-slate-500"
            />
            <input
              type="text"
              placeholder={es ? 'Nombre / empresa' : 'Name / company'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-4 py-3 text-white placeholder:text-slate-500"
            />

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
            {success && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">
                <p>{success.message}</p>
                <Link
                  href={success.dashboardUrl}
                  className="mt-2 inline-block font-semibold text-emerald-400 underline hover:text-emerald-300"
                >
                  {es ? 'Ir al panel de patrocinador' : 'Go to sponsor dashboard'}
                </Link>
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={redeem}
              className="w-full rounded-lg bg-emerald-500 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {loading ? (es ? 'Canjeando…' : 'Redeeming…') : es ? 'Canjear' : 'Redeem'}
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-sm text-slate-500 hover:text-slate-400"
            >
              {es ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
