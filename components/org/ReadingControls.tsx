'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type ControlsModel = {
  apiBase: string
  canEdit: boolean
  status: 'design' | 'field' | 'closed'
  visibility: 'private' | 'public'
  responded: number
  maxExtensionDays: number
  extendedDays: number
  allowEarlyClose: boolean
  minResponses: number
}

const T = {
  es: {
    title: 'Controles', vis: 'Visibilidad de resultados', pub: 'Pública', priv: 'Privada',
    visLocked: 'Se decidió antes de abrir la consulta y ya no puede cambiar.',
    visDesign: 'Puede cambiarla hasta que abra la consulta; después queda fija.',
    extend: (n: number) => `Extender ${n} ${n === 1 ? 'día' : 'días'}`, noExtend: 'Su plan no incluye extender el periodo.',
    close: 'Cerrar ahora', closeWarn: (n: number) => `Con menos de ${n} respuestas, la lectura quedará como «preliminar».`,
    confirmClose: '¿Cerrar la consulta ahora? No se puede reabrir.', viewer: 'Solo las personas administradoras pueden cambiar esto.', err: 'No se pudo aplicar el cambio.',
  },
  en: {
    title: 'Controls', vis: 'Results visibility', pub: 'Public', priv: 'Private',
    visLocked: 'Decided before the survey opened; it can no longer change.',
    visDesign: 'You can change it until the survey opens; then it locks.',
    extend: (n: number) => `Extend ${n} ${n === 1 ? 'day' : 'days'}`, noExtend: 'Your plan does not include extending the period.',
    close: 'Close now', closeWarn: (n: number) => `With fewer than ${n} responses, the reading will be marked "preliminary".`,
    confirmClose: 'Close the survey now? It cannot be reopened.', viewer: 'Only owners can change this.', err: 'Could not apply the change.',
  },
}

export default function ReadingControls({ m, locale }: { m: ControlsModel; locale: 'es' | 'en' }) {
  const t = T[locale]
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const left = Math.max(0, m.maxExtensionDays - m.extendedDays)
  const btn = 'min-h-[44px] rounded-lg border px-4 text-sm font-semibold disabled:opacity-50'

  async function act(body: object) {
    setBusy(true)
    setErr(null)
    const res = await fetch(`${m.apiBase}/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setBusy(false)
    if (!res.ok) return setErr(t.err)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-[#2d3748] bg-[#1a2029] p-5">
      <p className="font-semibold text-white">{t.title}</p>
      {!m.canEdit ? <p className="mt-1 text-sm text-slate-300">{t.viewer}</p> : null}
      <div className="mt-4">
        <p className="text-sm text-slate-200">{t.vis}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['private', 'public'] as const).map((v) => (
            <button key={v} type="button" disabled={!m.canEdit || busy || m.status !== 'design'} aria-pressed={m.visibility === v}
              onClick={() => act({ action: 'visibility', value: v })}
              className={`${btn} ${m.visibility === v ? 'border-emerald-300 bg-emerald-400 text-[#0f1419]' : 'border-slate-500 text-slate-100'}`}>
              {v === 'public' ? t.pub : t.priv}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-300">{m.status === 'design' ? t.visDesign : t.visLocked}</p>
      </div>
      {m.status === 'field' ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {left > 0 ? (
            <button type="button" disabled={!m.canEdit || busy} onClick={() => act({ action: 'extend', days: Math.min(7, left) })} className={`${btn} border-slate-500 text-slate-100`}>
              {t.extend(Math.min(7, left))}
            </button>
          ) : (
            <p className="text-xs text-slate-300">{t.noExtend}</p>
          )}
          {m.allowEarlyClose ? (
            <div>
              <button type="button" disabled={!m.canEdit || busy} onClick={() => confirm(t.confirmClose) && act({ action: 'close' })} className={`${btn} border-amber-300 text-amber-100`}>
                {t.close}
              </button>
              {m.responded < m.minResponses ? <p className="mt-1 text-xs text-amber-200">{t.closeWarn(m.minResponses)}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {err ? <p className="mt-3 text-sm text-amber-200" role="alert">{err}</p> : null}
    </div>
  )
}
