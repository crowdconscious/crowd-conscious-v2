'use client'

import Link from 'next/link'
import { CheckCircle, Clock, Copy } from 'lucide-react'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { offerTitle } from '@/lib/perks/offer-status'
import type { RedemptionVerifyPayload } from '@/lib/perks/types'
import PerkRedemptionQR from '@/components/perks/PerkRedemptionQR'

export default function RedemptionDetailClient({ data }: { data: RedemptionVerifyPayload }) {
  const { language } = useLanguage()
  const locale = language
  const [copied, setCopied] = useState(false)

  const title = offerTitle(
    { title: data.offer.title, title_en: data.offer.title_en },
    locale
  )

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(data.redemption.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const statusLabel = {
    pending: { es: 'Pendiente — muestra este código en el lugar', en: 'Pending — show this code at the venue' },
    confirmed: { es: 'Confirmado', en: 'Confirmed' },
    expired: { es: 'Expirado', en: 'Expired' },
    cancelled: { es: 'Cancelado', en: 'Cancelled' },
  }[data.redemption.status]

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-8 text-center text-slate-100">
        <h1 className="text-xl font-bold text-white">
          {locale === 'es' ? 'Tu canje Conscious Perk' : 'Your Conscious Perk redemption'}
        </h1>
        <p className="mt-2 text-slate-400">{title}</p>
        <p className="mt-1 text-sm text-slate-500">
          {data.location.name} · {data.location.city}
        </p>

        <div className="my-6 flex justify-center">
          <PerkRedemptionQR code={data.redemption.code} size={220} />
        </div>

        <button
          type="button"
          onClick={() => void copyCode()}
          className="mx-auto flex items-center gap-2 rounded-lg bg-[#0f1419] px-4 py-3 font-mono text-2xl font-bold tracking-widest text-emerald-400"
        >
          {data.redemption.code}
          <Copy className="h-5 w-5 opacity-70" />
        </button>
        {copied ? (
          <p className="mt-2 text-xs text-emerald-400">
            {locale === 'es' ? 'Copiado' : 'Copied'}
          </p>
        ) : null}

        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
          {data.redemption.status === 'confirmed' ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          {statusLabel[locale]}
        </p>

        <p className="mt-2 text-xs text-slate-500">
          {locale === 'es' ? 'Válido hasta' : 'Valid until'}{' '}
          {new Date(data.redemption.expires_at).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US')}
        </p>

        <Link
          href={`/perks/verify/${encodeURIComponent(data.redemption.code)}`}
          className="mt-6 inline-block text-sm text-emerald-400 hover:text-emerald-300"
        >
          {locale === 'es' ? 'Página de verificación (personal del lugar)' : 'Verify page (venue staff)'}
        </Link>

        <Link
          href={`/locations/${encodeURIComponent(data.location.slug)}`}
          className="mt-4 block text-sm text-slate-500 hover:text-slate-300"
        >
          {locale === 'es' ? 'Volver al lugar' : 'Back to location'}
        </Link>
      </div>
    </div>
  )
}
