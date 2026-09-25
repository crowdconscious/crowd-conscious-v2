'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { withReconocimientosSrc } from '@/lib/reconocimientos'

type ConfigResponse = {
  enabled: boolean
  url: string | null
}

const COPY = {
  es: {
    label: 'Reconoce algo bueno',
    helper: '¿Viste algo que funciona? Cuéntanos.',
  },
  en: {
    label: 'Share something good',
    helper: 'Saw something that works? Tell us.',
  },
} as const

/**
 * Quiet footer entry for Reconocimientos Phase 0.
 * Fetches the public config endpoint so `RECONOCIMIENTOS_FORM_URL` can stay
 * server-only (one Vercel env change, no NEXT_PUBLIC / no mobile OTA).
 * Renders nothing while loading or when disabled.
 */
export default function ReconocimientosFooterLink() {
  const { language } = useLanguage()
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/reconocimientos/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ConfigResponse | null) => {
        if (cancelled || !data?.enabled || !data.url) return
        setHref(withReconocimientosSrc(data.url, 'web'))
      })
      .catch(() => {
        // Feature stays invisible on fetch failure.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!href) return null

  const t = COPY[language === 'en' ? 'en' : 'es']

  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-300 transition-colors hover:text-teal-400"
        title={t.helper}
      >
        {t.label}
      </a>
      <p className="mt-0.5 text-xs text-slate-500">{t.helper}</p>
    </li>
  )
}
