'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2, MapPin, XCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { offerTitle } from '@/lib/perks/offer-status'
import type { RedemptionVerifyPayload } from '@/lib/perks/types'

export default function VerifyRedemptionClient({
  initial,
  code,
}: {
  initial: RedemptionVerifyPayload
  code: string
}) {
  const { language } = useLanguage()
  const locale = language
  const [data, setData] = useState(initial)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = offerTitle(
    { title: data.offer.title, title_en: data.offer.title_en },
    locale
  )

  const expired = new Date(data.redemption.expires_at).getTime() < Date.now()
  const isPending = data.redemption.status === 'pending' && !expired

  const confirm = async () => {
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch(`/api/perks/verify/${encodeURIComponent(code)}/confirm`, {
        method: 'POST',
      })
      const json = (await res.json()) as { error?: string; success?: boolean }
      if (!res.ok) {
        setError(json.error ?? (locale === 'es' ? 'No se pudo confirmar' : 'Confirm failed'))
        return
      }
      setData((d) => ({
        ...d,
        redemption: { ...d.redemption, status: 'confirmed', confirmed_at: new Date().toISOString() },
        can_confirm: false,
      }))
    } finally {
      setConfirming(false)
    }
  }

  const statusColors = {
    pending: 'text-amber-400',
    confirmed: 'text-emerald-400',
    expired: 'text-slate-500',
    cancelled: 'text-red-400',
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 text-slate-100">
        <p className="text-sm uppercase tracking-wide text-slate-500">
          {locale === 'es' ? 'Verificación Conscious Perk' : 'Conscious Perk verification'}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>

        <p className="mt-3 flex items-center gap-2 text-slate-400">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
          {data.location.name}
          {data.location.neighborhood ? `, ${data.location.neighborhood}` : ''} · {data.location.city}
        </p>

        <p className="mt-4 font-mono text-lg tracking-widest text-emerald-400">{data.redemption.code}</p>

        <p className={`mt-4 flex items-center gap-2 font-semibold ${statusColors[data.redemption.status]}`}>
          {data.redemption.status === 'confirmed' ? (
            <CheckCircle className="h-5 w-5" />
          ) : data.redemption.status === 'pending' && !expired ? (
            <Loader2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
          {data.redemption.status}
          {expired && data.redemption.status === 'pending'
            ? ` (${locale === 'es' ? 'expirado' : 'expired'})`
            : ''}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {data.redemption.xp_spent} XP ·{' '}
          {locale === 'es' ? 'Expira' : 'Expires'}{' '}
          {new Date(data.redemption.expires_at).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')}
        </p>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {data.can_confirm && isPending ? (
          <button
            type="button"
            disabled={confirming}
            onClick={() => void confirm()}
            className="mt-6 w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {confirming ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : locale === 'es' ? (
              'Confirmar canje (personal autorizado)'
            ) : (
              'Confirm redemption (authorized staff)'
            )}
          </button>
        ) : null}

        {!data.can_confirm && isPending ? (
          <p className="mt-6 text-sm text-slate-500">
            {locale === 'es'
              ? 'El personal del lugar debe iniciar sesión como dueño para confirmar.'
              : 'Venue staff must sign in as the location owner to confirm.'}
          </p>
        ) : null}

        <Link href="/locations" className="mt-8 inline-block text-sm text-emerald-400 hover:text-emerald-300">
          {locale === 'es' ? 'Explorar lugares' : 'Browse locations'}
        </Link>
      </div>
    </div>
  )
}
