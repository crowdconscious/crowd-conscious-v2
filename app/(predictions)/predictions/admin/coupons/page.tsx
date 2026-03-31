'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, Ticket } from 'lucide-react'

type CouponRow = {
  id: string
  code: string
  type: string
  discount_percent: number
  max_uses: number
  current_uses: number
  max_pulse_markets: number
  max_live_events: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
  created_at: string
  redemption_count?: number
}

type RedemptionRow = {
  id: string
  redeemed_by_email: string
  redeemed_by_name: string | null
  sponsor_account_id: string | null
  redeemed_at: string
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [redemptionsByCoupon, setRedemptionsByCoupon] = useState<Record<string, RedemptionRow[]>>({})
  const [loadingRedemptions, setLoadingRedemptions] = useState<string | null>(null)

  const [newCode, setNewCode] = useState('')
  const [newType, setNewType] = useState('pulse_trial')
  const [newDiscount, setNewDiscount] = useState(100)
  const [newMaxUses, setNewMaxUses] = useState(10)
  const [newMaxPulse, setNewMaxPulse] = useState(3)
  const [newMaxLive, setNewMaxLive] = useState(0)
  const [newValidUntil, setNewValidUntil] = useState('')
  const [createBusy, setCreateBusy] = useState(false)
  const [createError, setCreateError] = useState('')

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/predictions/admin/coupons')
      const data = await res.json()
      if (res.status === 403) {
        window.location.href = '/predictions'
        return
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch')
      setCoupons(data.coupons ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  const loadRedemptions = async (couponId: string) => {
    if (redemptionsByCoupon[couponId]) {
      setExpandedId((prev) => (prev === couponId ? null : couponId))
      return
    }
    setLoadingRedemptions(couponId)
    try {
      const res = await fetch(`/api/predictions/admin/coupons/${couponId}/redemptions`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setRedemptionsByCoupon((prev) => ({
        ...prev,
        [couponId]: data.redemptions ?? [],
      }))
      setExpandedId(couponId)
    } catch {
      setRedemptionsByCoupon((prev) => ({ ...prev, [couponId]: [] }))
    } finally {
      setLoadingRedemptions(null)
    }
  }

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreateBusy(true)
    try {
      const res = await fetch('/api/predictions/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          type: newType,
          discount_percent: newDiscount,
          max_uses: newMaxUses,
          max_pulse_markets: newMaxPulse,
          max_live_events: newMaxLive,
          valid_until: newValidUntil ? new Date(newValidUntil).toISOString() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      setNewCode('')
      await fetchCoupons()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="flex items-center gap-3">
        <Ticket className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Coupon codes</h1>
          <p className="text-sm text-slate-400">Create codes and view redemptions</p>
        </div>
      </div>

      <form
        onSubmit={createCoupon}
        className="rounded-xl border border-white/10 bg-[#1a2029] p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-white">Create coupon</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-slate-500">Code</span>
            <input
              required
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1419] px-3 py-2 text-white uppercase"
              placeholder="MY-PROMO"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Type</span>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1419] px-3 py-2 text-white"
            >
              <option value="pulse_trial">pulse_trial</option>
              <option value="sponsor_trial">sponsor_trial</option>
              <option value="full_access">full_access</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Discount %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={newDiscount}
              onChange={(e) => setNewDiscount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1419] px-3 py-2 text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Max uses</span>
            <input
              type="number"
              min={1}
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1419] px-3 py-2 text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Max Pulse markets</span>
            <input
              type="number"
              min={0}
              value={newMaxPulse}
              onChange={(e) => setNewMaxPulse(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1419] px-3 py-2 text-white"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">Max live events</span>
            <input
              type="number"
              min={0}
              value={newMaxLive}
              onChange={(e) => setNewMaxLive(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1419] px-3 py-2 text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-slate-500">Valid until (optional, ISO)</span>
            <input
              type="datetime-local"
              value={newValidUntil}
              onChange={(e) => setNewValidUntil(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1419] px-3 py-2 text-white"
            />
          </label>
        </div>
        {createError && <p className="text-sm text-red-400">{createError}</p>}
        <button
          type="submit"
          disabled={createBusy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {createBusy ? 'Creating…' : 'Create coupon'}
        </button>
      </form>

      {loading && <p className="text-slate-400">Loading…</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Redemptions</th>
                <th className="px-4 py-3">Until</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <Fragment key={c.id}>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3 font-mono text-emerald-400">{c.code}</td>
                    <td className="px-4 py-3">{c.type}</td>
                    <td className="px-4 py-3">{c.discount_percent}</td>
                    <td className="px-4 py-3">
                      {c.current_uses} / {c.max_uses}
                    </td>
                    <td className="px-4 py-3">{c.redemption_count ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          expandedId === c.id
                            ? setExpandedId(null)
                            : loadRedemptions(c.id)
                        }
                        className="text-slate-400 hover:text-white"
                        aria-label="Toggle redemptions"
                      >
                        {expandedId === c.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedId === c.id && (
                    <tr className="bg-black/20">
                      <td colSpan={7} className="px-4 py-3">
                        {loadingRedemptions === c.id ? (
                          <p className="text-slate-500">Loading…</p>
                        ) : (
                          <ul className="space-y-1 text-xs">
                            {(redemptionsByCoupon[c.id] ?? []).length === 0 ? (
                              <li className="text-slate-500">No redemptions yet</li>
                            ) : (
                              redemptionsByCoupon[c.id]!.map((r) => (
                                <li key={r.id}>
                                  {r.redeemed_by_email}
                                  {r.redeemed_by_name ? ` · ${r.redeemed_by_name}` : ''}
                                  {' · '}
                                  {new Date(r.redeemed_at).toLocaleString()}
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
