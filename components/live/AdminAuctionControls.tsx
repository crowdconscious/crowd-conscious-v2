'use client'

import { useCallback, useEffect, useState } from 'react'
import { Gavel, Loader2, Plus } from 'lucide-react'
import { ImageUpload } from '@/components/ui/ImageUpload'
import type { LiveAuctionItemWithBids } from '@/lib/live/auction-types'

export interface AdminAuctionControlsProps {
  eventId: string
  locale?: 'es' | 'en'
  onUpdated?: () => void
}

export function AdminAuctionControls({
  eventId,
  locale = 'es',
  onUpdated,
}: AdminAuctionControlsProps) {
  const [items, setItems] = useState<LiveAuctionItemWithBids[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [originalPrice, setOriginalPrice] = useState('')

  const t =
    locale === 'es'
      ? {
          heading: 'Subasta — piezas',
          add: 'Agregar pieza',
          open: 'Abrir puja',
          sold: 'Marcar vendida',
          end: 'Cerrar',
          reset: 'Próxima',
          title: 'Título',
          desc: 'Descripción',
          image: 'Imagen de la pieza',
          imageHint: 'PNG, JPG, WebP · máx. 2MB',
          uploadImage: 'Sube imagen de la pieza',
          price: 'Valor referencia (opc.)',
          empty: 'Sin piezas. Agrega la primera lot.',
          high: 'Puja alta',
        }
      : {
          heading: 'Auction — lots',
          add: 'Add lot',
          open: 'Open bidding',
          sold: 'Mark sold',
          end: 'Close',
          reset: 'Upcoming',
          title: 'Title',
          desc: 'Description',
          image: 'Lot image',
          imageHint: 'PNG, JPG, WebP · max 2MB',
          uploadImage: 'Upload lot image',
          price: 'Reference value (opt.)',
          empty: 'No lots yet. Add the first piece.',
          high: 'High bid',
        }

  const loadItems = useCallback(async () => {
    const res = await fetch(`/api/live/auction/items?eventId=${encodeURIComponent(eventId)}`, {
      cache: 'no-store',
    })
    const json = (await res.json()) as { items?: LiveAuctionItemWithBids[] }
    setItems(json.items ?? [])
  }, [eventId])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const patchItem = async (id: string, payload: Record<string, unknown>, key: string) => {
    setBusy(key)
    try {
      const res = await fetch(`/api/live/auction/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Update failed')
      await loadItems()
      onUpdated?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }

  const createItem = async () => {
    if (!title.trim()) {
      alert(locale === 'es' ? 'Título requerido' : 'Title required')
      return
    }
    setBusy('create')
    try {
      const res = await fetch('/api/live/auction/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          live_event_id: eventId,
          title: title.trim(),
          description: description.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          original_price: originalPrice ? parseFloat(originalPrice) : undefined,
          category: 'art',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Create failed')
      setTitle('')
      setDescription('')
      setImageUrl('')
      setOriginalPrice('')
      await loadItems()
      onUpdated?.()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mt-4 border-t border-white/10 pt-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-teal-300">
        <Gavel className="h-4 w-4" />
        {t.heading}
      </h3>

      <div className="mb-4 space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.title}
          className="min-h-[40px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t.desc}
          className="min-h-[40px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"
        />
        <div>
          <span className="mb-1 block text-sm text-slate-400">{t.image}</span>
          <ImageUpload
            currentUrl={imageUrl.trim() || null}
            onUpload={(url) => setImageUrl(url)}
            onClear={() => setImageUrl('')}
            storagePath="auction"
            label={t.uploadImage}
            hint={t.imageHint}
          />
        </div>
        <input
          value={originalPrice}
          onChange={(e) => setOriginalPrice(e.target.value)}
          placeholder={t.price}
          type="number"
          className="min-h-[40px] w-full rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"
        />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void createItem()}
          className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy === 'create' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t.add}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-slate-500">{t.empty}</p>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-slate-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-white">{item.title}</span>
              <span className="text-xs uppercase text-slate-500">{item.status}</span>
            </div>
            {item.highest_bid != null && (
              <p className="mt-1 text-xs text-emerald-400">
                {t.high}: {item.highest_bid} {item.currency}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {item.status === 'upcoming' && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void patchItem(item.id, { status: 'bidding' }, item.id)}
                  className="rounded-md bg-emerald-800/80 px-2 py-1 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {t.open}
                </button>
              )}
              {item.status === 'bidding' && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void patchItem(item.id, { status: 'sold' }, item.id)}
                  className="rounded-md bg-amber-800/80 px-2 py-1 text-xs font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  {t.sold}
                </button>
              )}
              {(item.status === 'sold' || item.status === 'bidding') && (
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void patchItem(item.id, { status: 'ended' }, `${item.id}-end`)}
                  className="rounded-md bg-slate-700/80 px-2 py-1 text-xs font-semibold hover:bg-slate-600 disabled:opacity-50"
                >
                  {t.end}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
