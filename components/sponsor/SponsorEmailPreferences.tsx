'use client'

import { useEffect, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useSponsorT } from '@/lib/i18n/sponsor-dashboard'
import { useLanguage } from '@/contexts/LanguageContext'

type Preferences = {
  pulse_launch: boolean
  pulse_closure: boolean
}

type Props = {
  token: string
  contactEmail: string | null
  initialPreferences: Preferences
  initialLocale: 'es' | 'en'
}

/**
 * In-dashboard email notification preferences for sponsor accounts.
 *
 * Renders two per-channel toggles (Pulse launched / Pulse closed) and a
 * "Save" action that POSTs to /api/dashboard/sponsor/[token]/email-
 * preferences. We also pass along the current dashboard language on save
 * so the DB `locale` column stays in sync with what the sponsor sees
 * (the email copy uses that column at send time).
 *
 * Pitfall avoided: we read the initial state from SSR-rendered props,
 * NOT from a client-side GET on mount. That avoids the flash-of-default
 * (both toggles briefly showing ON) while the fetch is in flight — an
 * awful UX for someone returning specifically to *turn them off*.
 */
export function SponsorEmailPreferences({
  token,
  contactEmail,
  initialPreferences,
  initialLocale,
}: Props) {
  const { t } = useSponsorT()
  const { language } = useLanguage()
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Clear the "saved" pill after a short window so successive edits are
  // clearly represented.
  useEffect(() => {
    if (saved !== 'ok') return
    const t = setTimeout(() => setSaved('idle'), 2500)
    return () => clearTimeout(t)
  }, [saved])

  const dirty =
    prefs.pulse_launch !== initialPreferences.pulse_launch ||
    prefs.pulse_closure !== initialPreferences.pulse_closure ||
    language !== initialLocale

  async function save() {
    setSaved('saving')
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/dashboard/sponsor/${token}/email-preferences`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pulse_launch: prefs.pulse_launch,
          pulse_closure: prefs.pulse_closure,
          locale: language,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'unknown' }))
        setSaved('error')
        setErrorMsg(body?.error || 'Save failed')
        return
      }
      setSaved('ok')
    } catch (err) {
      setSaved('error')
      setErrorMsg(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <section id="notifications" className="scroll-mt-24">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-400">
        <Bell className="h-4 w-4 text-emerald-400" />
        {t('notifications.title')}
      </h2>
      <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-6">
        <p className="text-sm text-slate-300">
          {t('notifications.description')}
          {contactEmail ? (
            <>
              {' '}
              <span className="text-slate-400">
                {t('notifications.sending_to')}{' '}
                <span className="font-medium text-slate-200">{contactEmail}</span>
              </span>
            </>
          ) : null}
        </p>

        <div className="mt-5 space-y-3">
          <Toggle
            label={t('notifications.pulse_launch_label')}
            hint={t('notifications.pulse_launch_hint')}
            checked={prefs.pulse_launch}
            onChange={(v) => setPrefs((p) => ({ ...p, pulse_launch: v }))}
          />
          <Toggle
            label={t('notifications.pulse_closure_label')}
            hint={t('notifications.pulse_closure_hint')}
            checked={prefs.pulse_closure}
            onChange={(v) => setPrefs((p) => ({ ...p, pulse_closure: v }))}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saved === 'saving'}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-[#0b1018] transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved === 'saving'
              ? t('notifications.saving')
              : t('notifications.save_button')}
          </button>
          {saved === 'ok' ? (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-400">
              <Check className="h-4 w-4" />
              {t('notifications.saved_confirmation')}
            </span>
          ) : null}
          {saved === 'error' && errorMsg ? (
            <span className="text-sm text-rose-400">{errorMsg}</span>
          ) : null}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {t('notifications.fine_print')}
        </p>
      </div>
    </section>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-[#2d3748] bg-[#0f1419] p-4 transition hover:border-emerald-500/40">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      </div>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={`relative mt-1 inline-flex h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-emerald-500' : 'bg-[#2d3748]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? 'left-5' : 'left-0.5'
          }`}
        />
      </span>
    </label>
  )
}
