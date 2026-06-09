'use client'

import { useState } from 'react'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'

const MIN_AMOUNT_MXN = 500

type Props = {
  locale: CitizenSignalsLocale
  signalId: string
  defaultBadgeMessage: string
}

/**
 * Sponsor checkout form for a Citizen Signal. POSTs to /api/sponsor/signal and
 * redirects to Stripe Checkout. Display + intent only — it carries the shared
 * sponsorship metadata contract and never writes the signal itself.
 */
export default function SponsorSignalForm({
  locale,
  signalId,
  defaultBadgeMessage,
}: Props) {
  const t = getCitizenSignalsCopy(locale)
  const c = t.sponsor.checkout

  const [sponsorName, setSponsorName] = useState('')
  const [sponsorEmail, setSponsorEmail] = useState('')
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('')
  const [badgeMessage, setBadgeMessage] = useState(defaultBadgeMessage)
  const [amount, setAmount] = useState<string>(String(MIN_AMOUNT_MXN))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const amountNum = Math.floor(Number(amount))
      const res = await fetch('/api/sponsor/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_id: signalId,
          sponsor_name: sponsorName.trim(),
          sponsor_email: sponsorEmail.trim(),
          sponsor_logo_url: sponsorLogoUrl.trim() || undefined,
          badge_message: badgeMessage.trim() || undefined,
          amount_mxn: amountNum,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        data?: { url?: string }
        error?: { message?: string }
      }
      if (!res.ok || !json.data?.url) {
        throw new Error(json.error?.message ?? c.error)
      }
      window.location.href = json.data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : c.error)
      setPending(false)
    }
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/60 focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-semibold text-slate-300">
          {c.sponsorName}
        </span>
        <input
          type="text"
          required
          value={sponsorName}
          onChange={(e) => setSponsorName(e.target.value)}
          placeholder={c.sponsorNamePlaceholder}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-300">
          {c.sponsorEmail}
        </span>
        <input
          type="email"
          required
          value={sponsorEmail}
          onChange={(e) => setSponsorEmail(e.target.value)}
          placeholder="contacto@marca.com"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-300">
          {c.sponsorLogo}
        </span>
        <input
          type="url"
          value={sponsorLogoUrl}
          onChange={(e) => setSponsorLogoUrl(e.target.value)}
          placeholder="https://…"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-300">
          {c.badgeMessage}
        </span>
        <input
          type="text"
          maxLength={160}
          value={badgeMessage}
          onChange={(e) => setBadgeMessage(e.target.value)}
          placeholder={c.badgeMessagePlaceholder}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-slate-300">{c.amount}</span>
        <input
          type="number"
          required
          min={MIN_AMOUNT_MXN}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />
        <span className="mt-1 block text-xs text-slate-500">{c.amountHelp}</span>
      </label>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? c.submitting : c.submit}
      </button>
    </form>
  )
}
