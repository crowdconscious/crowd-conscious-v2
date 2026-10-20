'use client'

import { useState } from 'react'
import { OBS_MIN_N } from '@/lib/observatorio-rentas/config'
import { aggregate, fmtPct } from '@/lib/observatorio-rentas/model'
import { useObs } from '../_components/ObsShell'
import { AlcColPicker, Certainty, Steps } from '../_components/ReporteForm'
import { HBars, NNote, Panel, SimTag } from '../_components/ui'

/** Pulse rules: multi-select, always includes «Otro», aggregate shown only after submitting. */
const QUESTIONS: { id: string; q: string; options: string[] }[] = [
  { id: 'renewal', q: 'En tu próxima renovación, ¿qué planeas hacer?', options: ['Mantener la renta', 'Subir dentro del tope', 'Subir por encima del tope', 'No renovar', 'Aún no lo decido', 'Otro'] },
  { id: 'start', q: 'Para un nuevo inquilino, ¿cómo fijarías el precio de entrada?', options: ['Igual que hoy', 'Un poco más alto', 'Mucho más alto, por la nueva ley', 'Según el mercado', 'Otro'] },
  { id: 'withdraw', q: '¿Consideras retirar tu vivienda del mercado de renta?', options: ['No', 'Sí, venderla', 'Sí, usarla yo o mi familia', 'Sí, dejarla vacía', 'Otro'] },
  { id: 'short', q: '¿Consideras pasarla a renta de corto plazo?', options: ['No', 'Sí, en parte del año', 'Sí, de forma permanente', 'Ya está en corto plazo', 'Otro'] },
]

export default function Propietarios() {
  const { data, addLandlord } = useObs()
  const [step, setStep] = useState(0)
  const [alc, setAlc] = useState('')
  const [col, setCol] = useState('')
  const [ans, setAns] = useState<Record<string, string[]>>({})
  const [other, setOther] = useState<Record<string, string>>({})
  const [cert, setCert] = useState(7)
  const [done, setDone] = useState(false)
  const TOTAL = 2 + QUESTIONS.length + 1
  const qi = step - 2
  const toggle = (id: string, o: string) => setAns((s) => ({ ...s, [id]: s[id]?.includes(o) ? s[id].filter((x) => x !== o) : [...(s[id] ?? []), o] }))
  const canNext = step === 0 ? !!alc : step === 1 ? !!col : qi < QUESTIONS.length ? (ans[QUESTIONS[qi].id]?.length ?? 0) > 0 : true
  const c = data!.colonias.find((x) => x.id === col)

  if (done && c) {
    const a = aggregate(c.id, c.nombre, [c])
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <p className="obs-label">Gracias</p>
        <h1 className="obs-h text-2xl">Así responden los propietarios en {c.nombre}</h1>
        <Panel>
          <SimTag>Resultados simulados · tu envío sólo vive en esta pantalla</SimTag>
          <div className="mt-3">{a.landlord_reports_n >= OBS_MIN_N ? <HBars title="Intenciones" rows={[
            { label: 'Subir el precio de entrada', value: a.pct_plan_raise_start_price },
            { label: 'Retirar la vivienda', value: a.pct_plan_withdraw },
            { label: 'Pasar a corto plazo', value: a.pct_plan_short_term },
          ]} /> : <p className="obs-muted">Muestra insuficiente (n&lt;25). Tu respuesta se sumará cuando haya al menos 25.</p>}</div>
          <NNote n={a.landlord_reports_n} kind="respuestas de propietarios" />
          <p className="text-xs obs-muted mt-1">Tus respuestas: {QUESTIONS.map((q) => (ans[q.id] ?? []).map((o) => (o === 'Otro' && other[q.id] ? `Otro: ${other[q.id]}` : o)).join(', ')).join(' · ')} · certeza {cert}/10</p>
        </Panel>
      </div>
    )
  }
  return (
    <div className="max-w-2xl mx-auto space-y-4" data-tour="pulso">
      <div>
        <p className="obs-label">Pulso de propietarios</p>
        <h1 className="obs-h text-2xl">¿Qué planeas hacer con tu vivienda en renta?</h1>
        <p className="text-sm obs-muted mt-1">4 preguntas con nivel de certeza. Puedes elegir varias respuestas. No pedimos nombre, dirección ni datos de contacto; la unidad mínima es la colonia. Verás cómo responden otros propietarios después de enviar.</p>
      </div>
      <Panel>
        <Steps step={step} total={TOTAL} />
        <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); if (!canNext) return; if (step < TOTAL - 1) setStep(step + 1); else { addLandlord({ coloniaId: col, answers: ans, certainty: cert }); setDone(true) } }}>
          {step <= 1 && <AlcColPicker alc={alc} setAlc={setAlc} col={col} setCol={setCol} step={step} />}
          {qi >= 0 && qi < QUESTIONS.length && (
            <fieldset>
              <legend className="text-sm font-semibold">{QUESTIONS[qi].q} <span className="obs-muted font-normal">(elige una o varias)</span></legend>
              <div className="grid gap-2 mt-2">
                {QUESTIONS[qi].options.map((o) => {
                  const on = ans[QUESTIONS[qi].id]?.includes(o)
                  return <label key={o} className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer text-sm" style={{ background: on ? '#12302A' : '#141C1F', border: `1px solid ${on ? '#3DDC97' : '#1F2A2E'}` }}><input type="checkbox" checked={!!on} onChange={() => toggle(QUESTIONS[qi].id, o)} />{o}</label>
                })}
                {ans[QUESTIONS[qi].id]?.includes('Otro') && <input aria-label="Describe tu respuesta" className="obs-input" placeholder="Describe brevemente (sin datos personales)" maxLength={120} value={other[QUESTIONS[qi].id] ?? ''} onChange={(e) => setOther({ ...other, [QUESTIONS[qi].id]: e.target.value })} />}
              </div>
            </fieldset>
          )}
          {step === TOTAL - 1 && <Certainty value={cert} onChange={setCert} label="¿Qué tan seguro estás de estas intenciones? (0–10)" />}
          <div className="flex gap-2 pt-2">
            {step > 0 && <button type="button" className="obs-btn" onClick={() => setStep(step - 1)}>Atrás</button>}
            <button type="submit" className="obs-btn obs-btn-primary ml-auto" disabled={!canNext} style={{ opacity: canNext ? 1 : 0.5 }}>{step < TOTAL - 1 ? 'Siguiente' : 'Enviar respuestas'}</button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
