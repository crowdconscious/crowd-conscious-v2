'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { OBS_LEGAL_CAP_PCT, OBS_MIN_N } from '@/lib/observatorio-rentas/config'
import { aggregate, fmtPct } from '@/lib/observatorio-rentas/model'
import { OBS_BASE, useObs } from './ObsShell'
import { NNote, Panel, RiskChip, SimTag } from './ui'

export function Steps({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1" aria-label={`Paso ${step + 1} de ${total}`}>
      {Array.from({ length: total }, (_, i) => <span key={i} className="h-1.5 flex-1 rounded" style={{ background: i <= step ? '#3DDC97' : '#1F2A2E' }} />)}
    </div>
  )
}

export function AlcColPicker({ alc, setAlc, col, setCol, step }: { alc: string; setAlc: (v: string) => void; col: string; setCol: (v: string) => void; step: number }) {
  const { data } = useObs()
  const seed = data!
  const cols = seed.colonias.filter((c) => c.cvegeo === alc).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  if (step === 0) return (
    <label className="block text-sm">¿En qué alcaldía rentas?
      <select className="obs-input mt-1" value={alc} onChange={(e) => { setAlc(e.target.value); setCol('') }}>
        <option value="">Elige una alcaldía</option>
        {seed.alcaldias.map((a) => <option key={a.cvegeo} value={a.cvegeo}>{a.nombre}</option>)}
      </select>
    </label>
  )
  return (
    <label className="block text-sm">¿En qué colonia?
      <select className="obs-input mt-1" value={col} onChange={(e) => setCol(e.target.value)}>
        <option value="">Elige una colonia</option>
        {cols.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
    </label>
  )
}

export function Certainty({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <fieldset>
      <legend className="text-sm">{label}</legend>
      <div className="flex flex-wrap gap-1 mt-2">
        {Array.from({ length: 11 }, (_, i) => (
          <button type="button" key={i} aria-pressed={value === i} onClick={() => onChange(i)} className="w-9 h-9 rounded-lg text-sm font-bold" style={{ background: value === i ? '#3DDC97' : '#141C1F', color: value === i ? '#07090A' : '#E8EEF0' }}>{i}</button>
        ))}
      </div>
      <p className="text-xs obs-muted mt-1">0 = nada seguro · 10 = totalmente seguro</p>
    </fieldset>
  )
}

export function ReporteForm() {
  const { data, seed: rawSeed, addRenewal } = useObs()
  const sp = useSearchParams()
  const [step, setStep] = useState(0)
  const [alc, setAlc] = useState('')
  const [col, setCol] = useState('')
  const [m2, setM2] = useState('65')
  const [rooms, setRooms] = useState('2')
  const [prev, setPrev] = useState(sp.get('prev') ?? '')
  const [next, setNext] = useState(sp.get('next') ?? '')
  const [reg, setReg] = useState<'si' | 'no' | 'nose' | ''>('')
  const [cert, setCert] = useState(7)
  const [done, setDone] = useState(false)
  const before = useMemo(() => rawSeed?.colonias.find((c) => c.id === col), [rawSeed, col])
  const after = data!.colonias.find((c) => c.id === col)
  const TOTAL = 7
  const canNext = [alc, col, Number(m2) > 0 && rooms, Number(prev) > 0, Number(next) > 0, reg, true][step]
  const submit = () => { addRenewal({ coloniaId: col, prev: Number(prev), next: Number(next), registered: reg as 'si', certainty: cert }); setDone(true) }

  if (done && after) {
    const a = aggregate(after.id, after.nombre, [after])
    const enough = a.renewal_reports_n >= OBS_MIN_N
    return (
      <div className="max-w-2xl mx-auto space-y-4" data-tour="reporte">
        <p className="obs-label">Gracias</p>
        <h1 className="obs-h text-2xl">Tu reporte quedó sumado a {after.nombre}</h1>
        <Panel>
          <div className="flex items-center gap-2"><RiskChip risk={a.risk} /><SimTag>Envío de demostración · sólo en esta pantalla</SimTag></div>
          {enough ? (
            <p className="mt-3 text-sm">Ahora {fmtPct(a.pct_renewals_above_cap)} de las renovaciones reportadas en la colonia supera el tope; mediana de aumento {fmtPct(a.renewal_increase_median, 2)} (antes {before ? fmtPct(before.renewal_increase_median, 2) : '—'}).</p>
          ) : (
            <p className="mt-3 text-sm">Esta colonia tiene {a.renewal_reports_n} reportes. Tu reporte se sumará cuando haya al menos {OBS_MIN_N}; mientras tanto mostramos «Muestra insuficiente (n&lt;25)».</p>
          )}
          <p className="text-sm mt-2">Reportes en la colonia: <strong>{before?.renewal_reports_n ?? 0} → {a.renewal_reports_n}</strong></p>
          <NNote n={a.renewal_reports_n} />
        </Panel>
        <div className="flex gap-2"><Link className="obs-btn" href={`${OBS_BASE}/ficha/${after.id}`}>Ver ficha de la colonia</Link><Link className="obs-btn" href={OBS_BASE}>Volver al mapa</Link></div>
      </div>
    )
  }
  const inc = Number(prev) > 0 && Number(next) > 0 ? ((Number(next) - Number(prev)) / Number(prev)) * 100 : null
  return (
    <div className="max-w-2xl mx-auto space-y-4" data-tour="reporte">
      <div>
        <p className="obs-label">Reporte anónimo de renovación</p>
        <h1 className="obs-h text-2xl">Cuéntanos tu renovación en 6 pasos cortos</h1>
        <p className="text-sm obs-muted mt-1">Nunca pedimos dirección, nombre, datos de quien te renta, teléfono ni correo. Unidad mínima: colonia. Ninguna cifra se publica con menos de {OBS_MIN_N} reportes.</p>
      </div>
      <Panel>
        <Steps step={step} total={TOTAL} />
        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); if (!canNext) return; if (step < TOTAL - 1) setStep(step + 1); else submit() }}>
          {step <= 1 && <AlcColPicker alc={alc} setAlc={setAlc} col={col} setCol={setCol} step={step} />}
          {step === 2 && <div className="grid grid-cols-2 gap-3"><label className="text-sm">Superficie aproximada (m²)<input className="obs-input mt-1" type="number" min="10" value={m2} onChange={(e) => setM2(e.target.value)} /></label><label className="text-sm">Recámaras<select className="obs-input mt-1" value={rooms} onChange={(e) => setRooms(e.target.value)}>{['1', '2', '3', '4 o más'].map((r) => <option key={r}>{r}</option>)}</select></label></div>}
          {step === 3 && <label className="block text-sm">Renta anterior (MXN/mes)<input className="obs-input mt-1" type="number" min="0" value={prev} onChange={(e) => setPrev(e.target.value)} /></label>}
          {step === 4 && <label className="block text-sm">Nueva renta (MXN/mes)<input className="obs-input mt-1" type="number" min="0" value={next} onChange={(e) => setNext(e.target.value)} />{inc != null && <span className="block text-xs mt-1" style={{ color: inc > OBS_LEGAL_CAP_PCT ? '#E5604D' : '#3DDC97' }}>Aumento de {fmtPct(inc)} (tope {fmtPct(OBS_LEGAL_CAP_PCT, 2)})</span>}</label>}
          {step === 5 && (
            <fieldset><legend className="text-sm">¿Tu contrato está registrado?</legend>
              <div className="flex gap-2 mt-2">{([['si', 'Sí'], ['no', 'No'], ['nose', 'No sé']] as const).map(([v, l]) => <button type="button" key={v} aria-pressed={reg === v} onClick={() => setReg(v)} className="obs-btn" style={{ background: reg === v ? '#2BB3C0' : undefined, color: reg === v ? '#07090A' : undefined }}>{l}</button>)}</div>
            </fieldset>
          )}
          {step === 6 && <Certainty value={cert} onChange={setCert} label="¿Qué tan seguro estás de las cifras que reportaste? (0–10)" />}
          <div className="flex gap-2 pt-2">
            {step > 0 && <button type="button" className="obs-btn" onClick={() => setStep(step - 1)}>Atrás</button>}
            <button type="submit" className="obs-btn obs-btn-primary ml-auto" disabled={!canNext} style={{ opacity: canNext ? 1 : 0.5 }}>{step < TOTAL - 1 ? 'Siguiente' : 'Enviar reporte anónimo'}</button>
          </div>
        </form>
      </Panel>
      <p className="text-xs obs-muted">Demostración: tu envío sólo actualiza la cifra en esta pantalla; no se guarda ni se mezcla con consultas reales.</p>
    </div>
  )
}
