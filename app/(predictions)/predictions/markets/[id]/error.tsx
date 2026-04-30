'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

/**
 * Route-level error boundary for `/predictions/markets/[id]`. Catches any
 * runtime exception from the server loader or the client market detail
 * view so anonymous visitors don't see Next.js's generic
 * "Application error: a client-side exception has occurred" dead end.
 */
export default function MarketDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[market detail error]', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <AlertTriangle className="mb-4 h-12 w-12 text-amber-400" aria-hidden />
      <h1 className="text-2xl font-semibold text-white">
        No pudimos cargar este mercado
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Tuvimos un problema al mostrar la información del mercado. Ya lo estamos
        registrando. Puedes intentar de nuevo o volver a la lista de mercados.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-slate-600">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </button>
        <Link
          href="/pulse"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-white/25"
        >
          <ArrowLeft className="h-4 w-4" />
          Ver todos los Pulses
        </Link>
      </div>
    </div>
  )
}
