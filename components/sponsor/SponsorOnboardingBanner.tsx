'use client'

import { useState } from 'react'

type Props = {
  companyName: string
  isPulseClient: boolean
  token: string
}

export function SponsorOnboardingBanner({ companyName, isPulseClient, token }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [busy, setBusy] = useState(false)

  if (dismissed) return null

  const dismiss = async () => {
    setBusy(true)
    try {
      await fetch(`/api/dashboard/sponsor/${encodeURIComponent(token)}/onboarding`, {
        method: 'POST',
      })
    } catch {
      // still hide locally
    } finally {
      setBusy(false)
      setDismissed(true)
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
      <div className="flex justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">¡Bienvenido, {companyName}! 👋</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Este es tu panel de patrocinador. Aquí ves el rendimiento de tus mercados y Pulses, compartes
            enlaces, y descargas reportes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void dismiss()}
          disabled={busy}
          className="shrink-0 text-slate-500 hover:text-slate-300 disabled:opacity-50"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white/5 p-4">
          <span className="text-lg font-bold text-emerald-400">1</span>
          <h3 className="mt-1 text-sm font-medium text-white">
            {isPulseClient ? 'Crea tu primer Pulse' : 'Revisa tu mercado'}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {isPulseClient
              ? 'Formula una pregunta con opciones y métricas de certeza.'
              : 'Abre el mercado patrocinado y sigue los resultados en vivo.'}
          </p>
        </div>
        <div className="rounded-lg bg-white/5 p-4">
          <span className="text-lg font-bold text-emerald-400">2</span>
          <h3 className="mt-1 text-sm font-medium text-white">Comparte el enlace</h3>
          <p className="mt-1 text-xs text-slate-400">
            Usa la sección Compartir para links y códigos QR con tu audiencia.
          </p>
        </div>
        <div className="rounded-lg bg-white/5 p-4">
          <span className="text-lg font-bold text-emerald-400">3</span>
          <h3 className="mt-1 text-sm font-medium text-white">Descarga reportes</h3>
          <p className="mt-1 text-xs text-slate-400">
            PDF imprimible y datos por mercado desde cada tarjeta o Reportes.
          </p>
        </div>
      </div>
    </div>
  )
}
