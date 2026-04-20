'use client'

import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'
import { useSponsorT } from '@/lib/i18n/sponsor-dashboard'

type Props = {
  companyName: string
  isPulseClient: boolean
  token: string
  /** When true, the banner stays open and skips the server dismiss POST —
   * used by the dashboard header "?" button to re-show the welcome copy
   * without mutating `last_dashboard_visit`. */
  forceOpen?: boolean
  /** When provided together with `forceOpen`, the close button becomes a
   * pure client close (no server call). */
  onClose?: () => void
}

const HANDBOOK_URL = process.env.NEXT_PUBLIC_SPONSOR_HANDBOOK_URL?.trim() || ''

export function SponsorOnboardingBanner({
  companyName,
  isPulseClient,
  token,
  forceOpen,
  onClose,
}: Props) {
  const { t } = useSponsorT()
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  if (!forceOpen && dismissed) return null

  const close = async () => {
    if (forceOpen) {
      onClose?.()
      return
    }
    setBusy(true)
    try {
      await fetch(`/api/dashboard/sponsor/${encodeURIComponent(token)}/onboarding`, {
        method: 'POST',
      })
    } catch {
      /* still hide locally on transient network failure */
    } finally {
      setBusy(false)
      setDismissed(true)
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
      <div className="flex justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            {t('welcome.greeting', { name: companyName })} 👋
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{t('welcome.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => void close()}
          disabled={busy}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white/5 hover:text-slate-200 disabled:opacity-50 sm:h-8 sm:w-8"
          aria-label={t('welcome.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Step
          n={1}
          title={isPulseClient ? t('welcome.step_1_pulse') : t('welcome.step_1_market')}
          desc={
            isPulseClient ? t('welcome.step_1_pulse_desc') : t('welcome.step_1_market_desc')
          }
        />
        <Step n={2} title={t('welcome.step_2')} desc={t('welcome.step_2_desc')} />
        <Step n={3} title={t('welcome.step_3')} desc={t('welcome.step_3_desc')} />
      </div>

      {HANDBOOK_URL ? (
        <div className="mt-5">
          <a
            href={HANDBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20"
          >
            <BookOpen className="h-4 w-4" /> {t('welcome.handbook_cta')} →
          </a>
        </div>
      ) : null}
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-4">
      <span className="text-lg font-bold text-emerald-400">{n}</span>
      <h3 className="mt-1 text-sm font-medium text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">{desc}</p>
    </div>
  )
}
