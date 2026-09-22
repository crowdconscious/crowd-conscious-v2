'use client'

import Link from 'next/link'
import { ArrowLeft, Activity } from 'lucide-react'
import { trackUxEvent } from '@/lib/ux-overhaul-analytics'

type Item = {
  id: string
  trigger: string
  objectType: string
  objectId: string
  title: string
  href: string
  channel: string
  sentAt: string
  label: string
}

type Props = {
  locale: 'es' | 'en'
  items: Item[]
}

function formatWhen(iso: string, locale: 'es' | 'en'): string {
  return new Date(iso).toLocaleString(locale === 'es' ? 'es-MX' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function ActividadClient({ locale, items }: Props) {
  const isEs = locale === 'es'

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/predictions"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          aria-label={isEs ? 'Volver' : 'Back'}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Activity className="h-7 w-7 shrink-0 text-emerald-400" />
            {isEs ? 'Tu actividad' : 'Your activity'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {isEs
              ? 'Cosas que tocaste y se movieron. Sin puntos ni rachas — solo memoria.'
              : 'Things you touched that moved. No points or streaks — just memory.'}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">
            {isEs
              ? 'Aún no hay movimientos en cosas que respaldaste o votaste. Cuando una señal cruce un umbral, llegue una respuesta, o un Pulse cierre, aparecerá aquí.'
              : 'Nothing you backed or voted on has moved yet. When a signal crosses a threshold, gets a reply, or a Pulse closes, it will show up here.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/predictions/pulse"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              {isEs ? 'Votar' : 'Vote'}
            </Link>
            <Link
              href="/signals"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-500/40"
            >
              {isEs ? 'Reportar' : 'Report'}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                onClick={() => {
                  trackUxEvent('resolution_push_opened', {
                    surface: 'web',
                    trigger: item.trigger,
                    object_id: item.objectId,
                  })
                }}
                className="block rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-colors hover:border-emerald-500/30 hover:bg-slate-800/50"
              >
                <p className="text-sm font-medium text-emerald-300/90">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-white">{item.title}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {formatWhen(item.sentAt, locale)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
