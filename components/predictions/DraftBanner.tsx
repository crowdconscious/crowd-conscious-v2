'use client'

import { useState, useEffect } from 'react'
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

  useEffect(() => {
    // Parse `?draft=created` from window.location instead of useSearchParams
    // to avoid the surrounding page needing a Suspense boundary at build time.
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
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

  const handlePublish = async () => {
    if (publishing) return
    setPublishing(true)
    try {
      const res = await fetch(
        `/api/predictions/admin/markets/${marketId}/publish`,
        { method: 'POST' }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setToast(data?.error || 'No se pudo publicar el mercado.')
        setPublishing(false)
        return
      }
      setToast('Mercado publicado.')
      router.refresh()
    } catch {
      setToast('No se pudo publicar el mercado.')
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
            onClick={handlePublish}
            disabled={publishing}
            className="self-start sm:self-auto px-4 py-2 bg-slate-900 text-amber-400 rounded font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? 'Publicando...' : 'Publicar ahora'}
          </button>
        )}
      </div>
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
