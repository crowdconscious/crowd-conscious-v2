'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, Store } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { OFFER_STATUS_LABELS, offerTitle } from '@/lib/perks/offer-status'
import type { LocationOfferRow, LocationOfferStatus } from '@/lib/perks/types'

type LocationMeta = {
  slug: string
  name: string
  status: string
}

const EMPTY_FORM = {
  title: '',
  title_en: '',
  description: '',
  description_en: '',
  xp_cost: '100',
  min_tier: '',
  stock_limit: '',
  max_redemptions_per_user: '1',
  status: 'draft' as LocationOfferStatus,
}

export default function LocationOwnerDashboardClient({
  slug,
  initialLocation,
}: {
  slug: string
  initialLocation: LocationMeta | null
}) {
  const { language } = useLanguage()
  const locale = language
  const [location, setLocation] = useState<LocationMeta | null>(initialLocation)
  const [offers, setOffers] = useState<LocationOfferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard/location/${encodeURIComponent(slug)}/offers`)
    if (res.status === 403) {
      setError(locale === 'es' ? 'No autorizado' : 'Not authorized')
      setLoading(false)
      return
    }
    const json = (await res.json()) as {
      location?: LocationMeta
      offers?: LocationOfferRow[]
      error?: string
    }
    if (json.location) setLocation(json.location)
    setOffers(json.offers ?? [])
    if (json.error) setError(json.error)
    setLoading(false)
  }, [slug, locale])

  useEffect(() => {
    void load()
  }, [load])

  const createOffer = async (status: LocationOfferStatus) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/location/${encodeURIComponent(slug)}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          title_en: form.title_en || null,
          description: form.description || null,
          description_en: form.description_en || null,
          xp_cost: Number(form.xp_cost),
          min_tier: form.min_tier ? Number(form.min_tier) : null,
          stock_limit: form.stock_limit ? Number(form.stock_limit) : null,
          max_redemptions_per_user: Number(form.max_redemptions_per_user) || 1,
          status,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(json.error ?? 'Failed')
        return
      }
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const setOfferStatus = async (offerId: string, status: LocationOfferStatus) => {
    const res = await fetch(
      `/api/dashboard/location/${encodeURIComponent(slug)}/offers/${offerId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }
    )
    if (res.ok) await load()
  }

  const t = {
    title: locale === 'es' ? 'Panel de Conscious Perks' : 'Conscious Perks dashboard',
    newOffer: locale === 'es' ? 'Nueva oferta' : 'New offer',
    publish: locale === 'es' ? 'Publicar' : 'Publish',
    pause: locale === 'es' ? 'Pausar' : 'Pause',
    claim: locale === 'es' ? 'Reclamar lugar' : 'Claim location',
    view: locale === 'es' ? 'Ver página pública' : 'View public page',
    empty: locale === 'es' ? 'Aún no hay ofertas.' : 'No offers yet.',
    save: locale === 'es' ? 'Guardar' : 'Save',
    draft: locale === 'es' ? 'Guardar borrador' : 'Save draft',
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {locale === 'es' ? 'Cargando…' : 'Loading…'}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Store className="mt-1 h-7 w-7 text-emerald-400" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold text-white">{location?.name ?? slug}</h1>
            <p className="text-sm text-slate-400">{t.title}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/locations/${encodeURIComponent(slug)}`}
            className="rounded-lg border border-[#2d3748] px-3 py-2 text-sm text-emerald-400 hover:bg-[#1a2029]"
          >
            {t.view}
          </Link>
          <Link
            href={`/locations/${encodeURIComponent(slug)}/claim`}
            className="rounded-lg border border-[#2d3748] px-3 py-2 text-sm text-slate-300 hover:bg-[#1a2029]"
          >
            {t.claim}
          </Link>
        </div>
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="mb-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        <Plus className="h-4 w-4" />
        {t.newOffer}
      </button>

      {showForm ? (
        <div className="mb-8 rounded-xl border border-[#2d3748] bg-[#1a2029] p-6 space-y-3">
          <input
            className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-white"
            placeholder={locale === 'es' ? 'Título (ES)' : 'Title (ES)'}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-white"
            placeholder={locale === 'es' ? 'Título (EN)' : 'Title (EN)'}
            value={form.title_en}
            onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-white"
            placeholder={locale === 'es' ? 'Descripción (ES)' : 'Description (ES)'}
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              className="rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-white"
              placeholder="XP cost"
              value={form.xp_cost}
              onChange={(e) => setForm((f) => ({ ...f, xp_cost: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              max={5}
              className="rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-white"
              placeholder={locale === 'es' ? 'Nivel mín. (opc.)' : 'Min tier (opt.)'}
              value={form.min_tier}
              onChange={(e) => setForm((f) => ({ ...f, min_tier: e.target.value }))}
            />
            <input
              type="number"
              min={1}
              className="rounded-lg border border-[#2d3748] bg-[#0f1419] px-3 py-2 text-white"
              placeholder={locale === 'es' ? 'Stock (opc.)' : 'Stock (opt.)'}
              value={form.stock_limit}
              onChange={(e) => setForm((f) => ({ ...f, stock_limit: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !form.title.trim()}
              onClick={() => void createOffer('draft')}
              className="rounded-lg border border-[#2d3748] px-4 py-2 text-sm text-white hover:bg-[#0f1419]"
            >
              {t.draft}
            </button>
            <button
              type="button"
              disabled={saving || !form.title.trim()}
              onClick={() => void createOffer('active')}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.publish}
            </button>
          </div>
        </div>
      ) : null}

      {offers.length === 0 ? (
        <p className="text-slate-500">{t.empty}</p>
      ) : (
        <ul className="space-y-3">
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#2d3748] bg-[#1a2029] p-4"
            >
              <div>
                <p className="font-semibold text-white">{offerTitle(offer, locale)}</p>
                <p className="text-sm text-slate-400">
                  {offer.xp_cost} XP · {OFFER_STATUS_LABELS[offer.status][locale]} ·{' '}
                  {offer.redeemed_count}
                  {offer.stock_limit != null ? ` / ${offer.stock_limit}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {offer.status !== 'active' ? (
                  <button
                    type="button"
                    onClick={() => void setOfferStatus(offer.id, 'active')}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white"
                  >
                    {t.publish}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void setOfferStatus(offer.id, 'paused')}
                    className="rounded-lg border border-[#2d3748] px-3 py-1.5 text-sm text-slate-300"
                  >
                    {t.pause}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
