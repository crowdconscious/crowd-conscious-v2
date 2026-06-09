'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, Check, PenSquare, Link2, MousePointerClick, Share2 } from 'lucide-react'
import { inputBaseClass } from '@/components/ui/input'
import {
  getCreatorCopy,
  isValidHandle,
  normalizeHandle,
  type CreatorLocale,
} from '@/lib/i18n/creator'
import CreatorTierPricing, { type TierPricingItem } from './CreatorTierPricing'

export type DashboardPost = {
  id: string
  title: string
  slug: string | null
  status: string
  updatedAt: string | null
  views: number
}

export type DashboardPayout = {
  period: string
  totalEarned: number
  amountPaid: number
  currency: string
  status: string
}

type Props = {
  locale: CreatorLocale
  handle: string | null
  creatorId: string
  trust: number
  posts: DashboardPost[]
  payouts: DashboardPayout[]
  referredClicks: number
  baseUrl: string
  tierPricing: TierPricingItem[]
}

export default function CreatorDashboardClient({
  locale,
  handle,
  creatorId,
  trust,
  posts,
  payouts,
  referredClicks,
  baseUrl,
  tierPricing,
}: Props) {
  const t = getCreatorCopy(locale)
  const router = useRouter()

  const [currentHandle, setCurrentHandle] = useState(handle)
  const [handleInput, setHandleInput] = useState('')
  const [handleError, setHandleError] = useState('')
  const [savingHandle, setSavingHandle] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const refToken = currentHandle || creatorId
  const referralLink = currentHandle ? `${baseUrl}/app?ref=${currentHandle}` : null
  // Public creator profile (articles), distinct from the /app?ref install link.
  const publicPageLink = currentHandle ? `${baseUrl}/creators/${currentHandle}` : null

  const statusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return t.statusDraft
      case 'pending_review':
        return t.statusPendingReview
      case 'published':
        return t.statusPublished
      case 'archived':
        return t.statusArchived
      default:
        return status
    }
  }

  const payoutLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t.payoutPending
      case 'held':
        return t.payoutHeld
      case 'released':
        return t.payoutReleased
      case 'paid':
        return t.payoutPaid
      default:
        return status
    }
  }

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const claimHandle = async () => {
    setHandleError('')
    const normalized = normalizeHandle(handleInput)
    if (!isValidHandle(normalized)) {
      setHandleError(t.handleInvalid)
      return
    }
    setSavingHandle(true)
    try {
      const res = await fetch('/api/creator/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: normalized }),
      })
      const json = (await res.json().catch(() => ({}))) as { handle?: string; error?: string }
      if (!res.ok) {
        setHandleError(json.error === 'handle_taken' ? t.handleTaken : t.handleInvalid)
        return
      }
      setCurrentHandle(json.handle ?? normalized)
      setHandleInput('')
      router.refresh()
    } catch {
      setHandleError(t.handleInvalid)
    } finally {
      setSavingHandle(false)
    }
  }

  const fmtMoney = (n: number, currency: string) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">{t.dashTitle}</h1>
        <Link
          href="/creator/posts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          <PenSquare className="h-4 w-4" /> {t.dashNewPost}
        </Link>
      </div>

      {/* Handle / referral link */}
      <section className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
        <h2 className="text-sm font-semibold text-white">{t.dashYourHandle}</h2>
        {currentHandle ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-emerald-300">@{currentHandle}</p>
            {publicPageLink && (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                  <Share2 className="h-3.5 w-3.5" /> {t.dashSharePage}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-xs text-slate-300">
                    {publicPageLink}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copy('page', publicPageLink)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    {copiedKey === 'page' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === 'page' ? t.dashCopied : t.dashCopyLink}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">{t.dashSharePageHint}</p>
              </div>
            )}
            {referralLink && (
              <div>
                <p className="mb-1 text-xs text-slate-400">{t.dashReferralLink}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-xs text-slate-300">
                    {referralLink}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copy('ref', referralLink)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    {copiedKey === 'ref' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === 'ref' ? t.dashCopied : t.dashCopyLink}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="mb-2 text-xs text-slate-400">{t.dashHandleNeeded}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">@</span>
              <input
                className={inputBaseClass}
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value.toLowerCase())}
                placeholder="tu_handle"
                maxLength={30}
              />
              <button
                type="button"
                disabled={savingHandle}
                onClick={() => void claimHandle()}
                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {t.dashSetHandle}
              </button>
            </div>
            {handleError && <p className="mt-2 text-xs text-red-400">{handleError}</p>}
          </div>
        )}
      </section>

      {/* Stats: referred clicks */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
          <div className="flex items-center gap-2 text-slate-400">
            <MousePointerClick className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">{t.dashReferredClicks}</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{referredClicks.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">{t.dashReferredClicksHint}</p>
        </div>
      </section>

      {/* Earnings / payouts */}
      <section className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
        <h2 className="text-sm font-semibold text-white">{t.dashEarnings}</h2>
        {payouts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t.dashNoEarnings}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">{t.dashPeriod}</th>
                  <th className="py-2 pr-4">{t.dashEarned}</th>
                  <th className="py-2 pr-4">{t.dashPaid}</th>
                  <th className="py-2">{t.dashPayoutStatus}</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.period} className="border-t border-[#2d3748]">
                    <td className="py-2 pr-4 text-slate-300">{p.period}</td>
                    <td className="py-2 pr-4 text-white">{fmtMoney(p.totalEarned, p.currency)}</td>
                    <td className="py-2 pr-4 text-slate-300">{fmtMoney(p.amountPaid, p.currency)}</td>
                    <td className="py-2">
                      <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs text-slate-300">
                        {payoutLabel(p.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sponsorship tier pricing */}
      <CreatorTierPricing locale={locale} items={tierPricing} />

      {/* Posts + sponsorship links */}
      <section className="rounded-xl border border-[#2d3748] bg-[#1a2029] p-5">
        <h2 className="text-sm font-semibold text-white">{t.dashYourPosts}</h2>
        {posts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{t.dashNoPosts}</p>
        ) : (
          <div className="mt-3 space-y-3">
            {posts.map((p) => {
              const sponsorLink =
                p.status === 'published'
                  ? `${baseUrl}/sponsor/blog/${p.id}?ref=${refToken}`
                  : null
              return (
                <div key={p.id} className="rounded-lg border border-[#2d3748] bg-[#0f1419]/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium text-white">{p.title}</p>
                    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                      {statusLabel(p.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <Link href={`/creator/posts/${p.id}/edit`} className="text-emerald-400 hover:text-emerald-300">
                      {t.dashEdit}
                    </Link>
                    {p.slug && p.status === 'published' && (
                      <Link href={`/blog/${p.slug}`} className="text-slate-400 hover:text-white">
                        {t.dashView}
                      </Link>
                    )}
                  </div>
                  {sponsorLink && (
                    <div className="mt-3">
                      <p className="mb-1 flex items-center gap-1 text-xs text-slate-400">
                        <Link2 className="h-3.5 w-3.5" /> {t.dashSponsorLink}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-xs text-slate-300">
                          {sponsorLink}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copy(p.id, sponsorLink)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                        >
                          {copiedKey === p.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === p.id ? t.dashCopied : t.dashCopyLink}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {trust < 2 && (
        <p className="text-center text-xs text-slate-500">{t.editorPublishLocked}</p>
      )}
    </div>
  )
}
