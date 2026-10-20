'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { OBS_BASE } from './base'

/** 8-step guided tour. Offline-safe: navigation + DOM highlighting only. */
const STEPS: { href: string; sel?: string; title: string; text: string; unlock?: boolean }[] = [
  { href: OBS_BASE, title: '1 · El problema', text: 'El tope a los aumentos de renta ya existe para las renovaciones, pero hoy nadie puede medir si se cumple.' },
  { href: OBS_BASE, sel: '[role="radiogroup"]', title: '2 · El mapa y su código de color', text: 'Verde está dentro del tope, amarillo cerca del límite, rojo por encima y gris sin datos suficientes; el borde turquesa marca alzas especulativas.' },
  { href: `${OBS_BASE}?alcaldia=09015`, sel: 'svg[aria-label="Mapa de colonias"]', title: '3 · Cuauhtémoc', text: 'Al tocar una alcaldía, el mapa se acerca y muestra el cumplimiento colonia por colonia.' },
  { href: '__colonia__', sel: '[data-tour="ficha"]', title: '4 · Ficha de colonia', text: 'Cada colonia tiene su ficha: renta anunciada contra inflación, aumentos en renovación con el tope marcado e intenciones de propietarios.' },
  { href: `${OBS_BASE}/calculadora`, sel: '[data-tour="calculadora"]', title: '5 · Calculadora del tope', text: 'Cualquier inquilino verifica en segundos si su aumento rebasa el tope; es la puerta de entrada para que la gente participe.' },
  { href: `${OBS_BASE}/reporte`, sel: '[data-tour="reporte"]', title: '6 · Reporte anónimo y regla de 25', text: 'El inquilino comparte su caso sin datos personales, y ninguna cifra se publica hasta tener al menos 25 reportes en la colonia.' },
  { href: `${OBS_BASE}/comision?tab=alertas`, sel: '[data-tour="tab-alertas"]', title: '7 · Espacio de la Comisión y alertas', text: 'La Comisión tiene un tablero privado con alertas de colonias que cambian de categoría y el motivo de cada cambio.', unlock: true },
  { href: `${OBS_BASE}/comision?tab=reportes`, sel: '[data-tour="brief"]', title: '8 · Brief para el dictamen', text: 'Con un clic, la Comisión descarga el brief de evidencia para el dictamen, con metodología y limitaciones.', unlock: true },
]

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const step = STEPS[i]

  useEffect(() => {
    if (step.unlock) sessionStorage.setItem('obs-comision-ok', '1')
    const href = step.href === '__colonia__' ? `${OBS_BASE}/ficha/cuauhtemoc-roma-norte-015-024` : step.href
    router.push(href, { scroll: false })
    setRect(null)
    if (!step.sel) return
    let tries = 0
    const t = setInterval(() => {
      const el = document.querySelector(step.sel!)
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(() => setRect(el.getBoundingClientRect()), 350); clearInterval(t) }
      if (++tries > 40) clearInterval(t)
    }, 100)
    return () => clearInterval(t)
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI((x) => Math.min(STEPS.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  void pathname

  return (
    <div className="fixed inset-0 z-50 pointer-events-none" role="dialog" aria-modal="false" aria-label="Recorrido guiado">
      {rect && <div className="absolute rounded-xl transition-all" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: '0 0 0 4px #2BB3C0, 0 0 0 9999px rgba(7,9,10,0.55)' }} />}
      <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-4 w-[min(560px,calc(100%-24px))] obs-panel p-4 shadow-2xl" style={{ background: '#0E1416', borderColor: '#2BB3C0' }}>
        <div className="flex items-center gap-2"><span className="obs-label">Recorrido guiado · {i + 1}/8</span><button className="ml-auto text-sm obs-muted underline" onClick={onClose}>Cerrar</button></div>
        <h2 className="obs-h text-lg mt-1">{step.title}</h2>
        <p className="text-sm mt-1">{step.text}</p>
        <div className="flex gap-2 mt-3">
          <button className="obs-btn" disabled={i === 0} style={{ opacity: i === 0 ? 0.4 : 1 }} onClick={() => setI(i - 1)}>Anterior</button>
          {i < STEPS.length - 1 ? <button className="obs-btn obs-btn-primary ml-auto" onClick={() => setI(i + 1)}>Siguiente</button> : <button className="obs-btn obs-btn-primary ml-auto" onClick={onClose}>Terminar</button>}
        </div>
      </div>
    </div>
  )
}
