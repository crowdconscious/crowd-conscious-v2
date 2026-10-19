'use client'

import { useState, useEffect } from 'react'
import { CONTRASTE_OVERRIDE_LABEL_ES } from '@/lib/contraste-ia/publish-gate'
import { useRouter } from 'next/navigation'

type Props = {
  marketId: string
  /**
   * When true, renders the inline "Publicar ahora" button. Set to false for
   * users that are creators but not admins if you want a view-only banner.
   * Defaults to true — both admins and creators can publish their own draft.
   */
  canPublish?: boolean
}

/**
 * Amber banner shown at the very top of a draft market's public URL. Only
 * admins and the market creator ever see this; everyone else gets a 404 from
 * the page-level access guard.
 */
export function DraftBanner({ marketId, canPublish = true }: Props) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  /** Contraste IA lock failed: error shown + explicit override offered. */
  const [lockError, setLockError] = useState<string | null>(null)

  useEffect(() => {
    // Parse `?draft=created` from window.location instead of useSearchParams
    // to avoid the surrounding page needing a Suspense boundary at build time.
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('draft') === 'lock_failed') {
      setLockError(
        'No se pudo bloquear la predicción de Contraste IA, así que el Pulse sigue como borrador. Vuelve a intentar o publica de todos modos.'
      )
      params.delete('draft')
      const qs = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
      return
    }
    if (params.get('draft') === 'created') {
      setToast('Borrador creado. Solo tú puedes verlo.')
      // Strip the query so a manual refresh doesn't re-trigger the toast.
      params.delete('draft')
      const qs = params.toString()
      const newUrl = window.location.pathname + (qs ? `?${qs}` : '')
      window.history.replaceState({}, '', newUrl)
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [])

  const handlePublish = async (force = false) => {
    if (publishing) return
    if (
      force &&
      !window.confirm(
        'Se publicará SIN predicción bloqueada. La predicción de IA se generará después, quedará marcada como "tardía" y no se usará en afirmaciones públicas. ¿Continuar?'
      )
    ) {
      return
    }
    setPublishing(true)
    setToast(null)
    try {
      const res = await fetch(
        `/api/predictions/admin/markets/${marketId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force }),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data?.code === 'contraste_lock_failed') {
          setLockError(data.error || 'No se pudo bloquear la predicción de Contraste IA.')
        } else {
          setToast(data?.error || 'No se pudo publicar el Pulse.')
        }
        setPublishing(false)
        return
      }
      setLockError(null)
      setToast(data?.warning ? `Pulse publicado. ${data.warning}` : 'Pulse publicado.')
      router.refresh()
    } catch {
      setToast('No se pudo publicar el Pulse.')
      setPublishing(false)
    }
  }

  return (
    <>
      <div
        role="status"
        className="bg-amber-500 text-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="text-sm sm:text-base">
          <strong className="block sm:inline">BORRADOR · No publicado</strong>
          <span className="block sm:inline sm:ml-1">
            · Solo administradores y creador pueden ver esta página.
          </span>
        </div>
        {canPublish && (
          <button
            type="button"
            onClick={() => handlePublish(false)}
            disabled={publishing}
            className="self-start sm:self-auto px-4 py-2 bg-slate-900 text-amber-400 rounded font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? 'Publicando...' : 'Publicar ahora'}
          </button>
        )}
      </div>
      {lockError && (
        <div role="alert" className="bg-red-700 text-white px-6 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span>{lockError}</span>
          {canPublish && (
            <span className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePublish(false)}
                disabled={publishing}
                className="px-3 py-1.5 rounded bg-white text-red-800 font-semibold disabled:opacity-50"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => handlePublish(true)}
                disabled={publishing}
                className="px-3 py-1.5 rounded border border-white/70 font-semibold disabled:opacity-50"
              >
                {CONTRASTE_OVERRIDE_LABEL_ES}
              </button>
            </span>
          )}
        </div>
      )}
      {toast && (
        <div
          role="alert"
          className="bg-emerald-600 text-white px-6 py-3 text-sm text-center"
        >
          {toast}
        </div>
      )}
    </>
  )
}
