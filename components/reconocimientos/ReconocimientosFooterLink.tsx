'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { withReconocimientosSrc } from '@/lib/reconocimientos/config'

type ConfigResponse = {
  enabled: boolean
  intakeUrl: string | null
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
 * Quiet footer entry for Reconocimientos.
 * Fetches the public config endpoint so `RECONOCIMIENTOS_ENABLED` can stay
 * server-only. Renders nothing while loading or when disabled.
 * Links internally to intake (same tab, no target=_blank).
 */
export default function ReconocimientosFooterLink() {
  const { language } = useLanguage()
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/reconocimientos/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ConfigResponse | null) => {
        if (cancelled || !data?.enabled || !data.intakeUrl) return
        const withSrc = withReconocimientosSrc(data.intakeUrl, 'web')
        try {
          const u = new URL(withSrc)
          setHref(`${u.pathname}${u.search}`)
        } catch {
          setHref(withSrc)
        }
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
      <Link
        href={href}
        className="text-slate-300 transition-colors hover:text-teal-400"
        title={t.helper}
      >
        {t.label}
      </Link>
      <p className="mt-0.5 text-xs text-slate-500">{t.helper}</p>
    </li>
  )
}
