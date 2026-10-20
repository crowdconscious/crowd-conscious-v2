'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OBS_BASE } from './base'

/**
 * 8-step guided tour. Offline-safe: navigation + DOM spotlight only.
 * Each step navigates, waits for `ready` (or `sel`), scrolls `sel` into the band
 * between the sticky banner and the tour card, and spotlights it.
 */
type Step = { href: string; sel: string; ready?: string; title: string; text: string; unlock?: boolean }
export const TOUR_STEPS: Step[] = [
  { href: OBS_BASE, sel: '[data-tour="intro"]', title: 'El problema',
    text: 'El tope de 3.69% a los aumentos ya aplica a las renovaciones de 2026, pero hoy no hay forma de saber si se cumple. Todo lo que verás usa datos simulados.' },
  { href: OBS_BASE, sel: '[data-tour="map-panel"]', ready: 'svg[aria-label="Mapa de alcaldías de la Ciudad de México"]', title: 'El mapa y su código de color',
    text: 'Cada alcaldía se colorea según los reportes de renovación: verde dentro del tope, amarillo cerca del límite, rojo por encima y gris rayado con menos de 25 reportes. La leyenda está bajo el mapa.' },
  { href: `${OBS_BASE}?alcaldia=09015`, sel: '[data-tour="map-panel"]', ready: 'svg[aria-label="Mapa de colonias"]', title: 'Cuauhtémoc, colonia por colonia',
    text: 'Al tocar una alcaldía, el mapa se acerca y colorea cada colonia con el mismo código. El borde turquesa marca colonias «a vigilar» por alzas fuertes en la renta anunciada.' },
  { href: `${OBS_BASE}/ficha/cuauhtemoc-roma-norte-015-024`, sel: '[data-tour="ficha-head"]', title: 'Ficha de colonia: Roma Norte',
    text: 'Al tocar una colonia se abre su ficha: renta anunciada, variación en 12 meses frente a la inflación y aumento mediano en renovación frente al tope. Más abajo vienen las gráficas con su número de reportes (n); se descarga en PDF.' },
  { href: `${OBS_BASE}/calculadora`, sel: '[data-tour="calc-panel"]', title: 'Calculadora del tope',
    text: 'Un inquilino escribe su renta actual y la nueva, y ve si el aumento rebasa el 3.69%. Es una herramienta informativa, no asesoría legal.' },
  { href: `${OBS_BASE}/reporte`, sel: '[data-tour="reporte"]', title: 'Reporte anónimo y regla de 25',
    text: 'Quien quiera comparte su renovación en 6 pasos, sin nombre, dirección ni datos de quien le renta. Ninguna cifra de colonia se publica con menos de 25 reportes.' },
  { href: `${OBS_BASE}/propietarios`, sel: '[data-tour="pulso"]', title: 'Pulso de propietarios',
    text: 'Los propietarios responden 4 preguntas sobre sus planes, con su nivel de certeza. Se presentan como intención declarada, no como comportamiento observado.' },
  { href: `${OBS_BASE}/comision?tab=alertas`, sel: '[data-tour="comision"]', ready: '[data-tour="tab-alertas"]', title: 'Espacio de la Comisión', unlock: true,
    text: 'Espacio privado con clave. Las alertas dicen qué colonias cambiaron de categoría y por qué; un cambio cuenta si se sostiene 2 semanas. En «Centro de reportes» se descarga el brief para el dictamen, marcado como simulación.' },
]

const PAD = 8
type Box = { left: number; top: number; width: number; height: number }

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [cardH, setCardH] = useState(180)
  const cardRef = useRef<HTMLDivElement>(null)
  const elRef = useRef<Element | null>(null)
  const router = useRouter()
  const step = TOUR_STEPS[i]
  const n = TOUR_STEPS.length

  useLayoutEffect(() => {
    const c = cardRef.current; if (!c) return
    const ro = new ResizeObserver(() => setCardH(c.getBoundingClientRect().height)); ro.observe(c)
    return () => ro.disconnect()
  }, [])

  /** Visible band: below the sticky simulation banner, above the tour card. */
  const band = useCallback(() => {
    const banner = document.querySelector('.obs-sim[role="note"]')
    const top = (banner?.getBoundingClientRect().bottom ?? 0) + PAD
    const bottom = window.innerHeight - cardH - 16 - PAD
    return { top, bottom }
  }, [cardH])

  const measure = useCallback(() => {
    const el = elRef.current
    if (!el || !el.isConnected) { setBox(null); return }
    const r = el.getBoundingClientRect(), b = band()
    const top = Math.max(r.top, b.top), bottom = Math.min(r.bottom, b.bottom)
    setBox(bottom - top > 20 ? { left: r.left, top, width: r.width, height: bottom - top } : null)
  }, [band])

  const place = useCallback(() => {
    const el = elRef.current; if (!el) return
    const r = el.getBoundingClientRect(), b = band(), avail = b.bottom - b.top
    const delta = r.height <= avail ? r.top - (b.top + (avail - r.height) / 2) : r.top - b.top
    window.scrollTo({ top: Math.max(0, window.scrollY + delta), behavior: 'auto' })
    measure()
  }, [band, measure])

  useEffect(() => {
    if (step.unlock) sessionStorage.setItem('obs-comision-ok', '1')
    router.push(step.href, { scroll: false })
    elRef.current = null; setBox(null)
    let tries = 0
    const t = setInterval(() => {
      const ready = document.querySelector(step.ready ?? step.sel)
      const el = document.querySelector(step.sel)
      const onPage = typeof window !== 'undefined' && (window.location.pathname + window.location.search).startsWith(step.href)
      if (ready && el && onPage) { clearInterval(t); elRef.current = el; setTimeout(place, 250); setTimeout(place, 700) }
      if (++tries > 80) clearInterval(t)
    }, 100)
    return () => clearInterval(t)
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { place() }, [cardH]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = () => measure()
    window.addEventListener('scroll', f, { passive: true }); window.addEventListener('resize', place)
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('resize', place) }
  }, [measure, place])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI((x) => Math.min(n - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)) }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose, n])

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Recorrido guiado">
      {/* Transparent click shield: taps during the tour don't navigate the page underneath. */}
      <div className="absolute inset-0" style={{ background: box ? 'transparent' : 'rgba(7,9,10,0.35)' }} />
      {box && <div className="absolute rounded-xl pointer-events-none transition-all duration-200" data-tour-spotlight style={{ left: box.left - 4, top: box.top - 4, width: box.width + 8, height: box.height + 8, boxShadow: '0 0 0 3px #2BB3C0, 0 0 0 9999px rgba(7,9,10,0.6)' }} />}
      <div ref={cardRef} className="absolute left-1/2 -translate-x-1/2 bottom-2 sm:bottom-4 w-[min(560px,calc(100%-16px))] obs-panel p-3 sm:p-4 shadow-2xl" style={{ background: '#0E1416', borderColor: '#2BB3C0' }}>
        <div className="flex items-center gap-2">
          <span className="obs-label !text-[10px]">Recorrido · {i + 1}/{n}</span>
          <span className="flex gap-1" aria-hidden>{TOUR_STEPS.map((_, k) => <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ background: k === i ? '#2BB3C0' : '#2A3236' }} />)}</span>
          <button className="ml-auto text-xs obs-muted underline" onClick={onClose}>Cerrar</button>
        </div>
        <h2 className="obs-h text-base sm:text-lg mt-1 leading-tight">{step.title}</h2>
        <p className="text-[13px] sm:text-sm mt-1 leading-snug">{step.text}</p>
        <div className="flex gap-2 mt-2 sm:mt-3">
          <button className="obs-btn !py-1.5" disabled={i === 0} style={{ opacity: i === 0 ? 0.4 : 1 }} onClick={() => setI(i - 1)}>Anterior</button>
          {i < n - 1 ? <button className="obs-btn obs-btn-primary !py-1.5 ml-auto" onClick={() => setI(i + 1)}>Siguiente</button> : <button className="obs-btn obs-btn-primary !py-1.5 ml-auto" onClick={onClose}>Terminar</button>}
        </div>
      </div>
    </div>
  )
}
