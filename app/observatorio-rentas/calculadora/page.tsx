'use client'

import Link from 'next/link'
import { useState } from 'react'
import { OBS_LEGAL_CAP_PCT } from '@/lib/observatorio-rentas/config'
import { allowedMax, fmtMoney, fmtPct } from '@/lib/observatorio-rentas/model'
import { OBS_BASE } from '../_components/ObsShell'
import { Panel } from '../_components/ui'

export default function Calculadora() {
  const [cur, setCur] = useState('15000')
  const [next, setNext] = useState('16200')
  const [start, setStart] = useState('2025-11-01')
  const c = Number(cur), n = Number(next)
  const valid = c > 0 && n > 0
  const max = allowedMax(c)
  const diff = n - max
  const pct = valid ? ((n - c) / c) * 100 : 0
  return (
    <div className="max-w-3xl mx-auto space-y-4" data-tour="calculadora">
      <div>
        <p className="obs-label">Calculadora del tope</p>
        <h1 className="obs-h text-2xl sm:text-3xl">¿Tu aumento de renta respeta el tope?</h1>
        <p className="obs-muted text-sm mt-1">Para renovaciones de 2026 el aumento máximo es {fmtPct(OBS_LEGAL_CAP_PCT, 2)} (Código Civil, art. 2448-D).</p>
      </div>
      <Panel>
        <form className="grid sm:grid-cols-3 gap-3" onSubmit={(e) => e.preventDefault()}>
          <label className="text-sm">Renta actual (MXN/mes)<input className="obs-input mt-1" inputMode="numeric" type="number" min="0" value={cur} onChange={(e) => setCur(e.target.value)} /></label>
          <label className="text-sm">Nueva renta ofrecida<input className="obs-input mt-1" inputMode="numeric" type="number" min="0" value={next} onChange={(e) => setNext(e.target.value)} /></label>
          <label className="text-sm">Inicio del contrato<input className="obs-input mt-1" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        </form>
        {valid && (
          <div className="mt-4 grid sm:grid-cols-3 gap-3" aria-live="polite">
            <div className="obs-panel p-3"><div className="obs-label !text-[10px]">Máximo permitido</div><div className="obs-h text-2xl">{fmtMoney(max)}</div><div className="text-xs obs-muted">{fmtMoney(c)} × {(1 + OBS_LEGAL_CAP_PCT / 100).toFixed(4)}</div></div>
            <div className="obs-panel p-3"><div className="obs-label !text-[10px]">Aumento ofrecido</div><div className="obs-h text-2xl">{fmtPct(pct)}</div><div className="text-xs obs-muted">{fmtMoney(n - c)} al mes</div></div>
            <div className="obs-panel p-3" style={{ borderColor: diff > 0 ? '#E5604D' : '#3DDC97' }}>
              <div className="obs-label !text-[10px]">Resultado</div>
              <div className="obs-h text-lg" style={{ color: diff > 0 ? '#E5604D' : '#3DDC97' }}>{diff > 0 ? `Tu aumento supera el tope por ${fmtMoney(diff)}` : 'Tu aumento está dentro del tope'}</div>
            </div>
          </div>
        )}
        <p className="text-xs obs-muted mt-4">Herramienta informativa, no es asesoría legal. El tope aplica a renovaciones; consulta tu contrato y, en su caso, a una persona asesora en derecho.{start && ` Contrato iniciado el ${start}.`}</p>
      </Panel>
      <Panel className="border-dashed">
        <h2 className="obs-h text-lg">¿Nos compartes tu caso de forma anónima?</h2>
        <p className="text-sm obs-muted mt-1">Es opcional. No pedimos nombre, dirección, teléfono, correo ni datos de quien te renta. Tu reporte sólo se suma a la cifra de tu colonia.</p>
        <Link className="obs-btn obs-btn-primary mt-3" href={`${OBS_BASE}/reporte?prev=${c || ''}&next=${n || ''}`}>Compartir mi caso anónimo →</Link>
      </Panel>
    </div>
  )
}
