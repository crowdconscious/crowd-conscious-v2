'use client'

import './obs.css'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { OBS_BANNER, OBS_CREDIT } from '@/lib/observatorio-rentas/config'
import { expandCore, type Colonia, type Seed, type SeedCore, type WeeklyDetail } from '@/lib/observatorio-rentas/model'
import { Tour } from './Tour'

import { OBS_BASE } from './base'
export { OBS_BASE }

export type RenewalSubmission = { coloniaId: string; prev: number; next: number; registered: 'si' | 'no' | 'nose'; certainty: number }
export type LandlordSubmission = { coloniaId: string; answers: Record<string, string[]>; certainty: number }

type Ctx = {
  seed: Seed | null
  /** Seed with demo submissions folded in (local state only, never persisted). */
  data: Seed | null
  renewals: RenewalSubmission[]
  addRenewal: (s: RenewalSubmission) => void
  landlords: LandlordSubmission[]
  addLandlord: (s: LandlordSubmission) => void
  tourOpen: boolean
  setTourOpen: (v: boolean) => void
}
const ObsCtx = createContext<Ctx | null>(null)
export function useObs() {
  const c = useContext(ObsCtx)
  if (!c) throw new Error('useObs outside ObsShell')
  return c
}

const weeklyCache = new Map<string, Promise<WeeklyDetail>>()
/** Lazy per-alcaldía weekly series (only fetched when a colonia profile opens). */
export function loadWeekly(cvegeo: string) {
  if (!weeklyCache.has(cvegeo)) weeklyCache.set(cvegeo, fetch(`${OBS_BASE}/data/weekly-${cvegeo}.json`).then((r) => r.json()))
  return weeklyCache.get(cvegeo)!
}

function foldRenewals(seed: Seed, subs: RenewalSubmission[]): Seed {
  if (!subs.length) return seed
  const byCol = new Map<string, RenewalSubmission[]>()
  subs.forEach((s) => byCol.set(s.coloniaId, [...(byCol.get(s.coloniaId) ?? []), s]))
  const colonias: Colonia[] = seed.colonias.map((c) => {
    const mine = byCol.get(c.id)
    if (!mine) return c
    const n = c.renewal_reports_n + mine.length
    const incs = mine.map((s) => ((s.next - s.prev) / s.prev) * 100)
    const above = mine.filter((s) => (s.next - s.prev) / s.prev * 100 > seed.meta.legal_cap_2026).length
    const med = (c.renewal_increase_median * c.renewal_reports_n + incs.reduce((a, b) => a + b, 0)) / n
    const pctAbove = ((c.pct_renewals_above_cap / 100) * c.renewal_reports_n + above) / n * 100
    const hist = c.renewal_hist.map((b) => ({ ...b, count: b.count + incs.filter((x) => x >= b.from && (b.to == null || x < b.to)).length }))
    return { ...c, renewal_reports_n: n, renewal_increase_median: Math.round(med * 100) / 100, pct_renewals_above_cap: Math.round(pctAbove * 10) / 10, renewal_hist: hist }
  })
  return { ...seed, colonias }
}

const NAV = [
  { href: OBS_BASE, label: 'Mapa' },
  { href: `${OBS_BASE}/calculadora`, label: 'Calculadora del tope' },
  { href: `${OBS_BASE}/reporte`, label: 'Reporte de renovación' },
  { href: `${OBS_BASE}/propietarios`, label: 'Pulso de propietarios' },
  { href: `${OBS_BASE}/metodologia`, label: 'Metodología' },
  { href: `${OBS_BASE}/comision`, label: 'Espacio de la Comisión' },
]

export function ObsShell({ children, core }: { children: React.ReactNode; core: SeedCore }) {
  const [seed] = useState<Seed | null>(() => expandCore(core))
  const [renewals, setRenewals] = useState<RenewalSubmission[]>([])
  const [landlords, setLandlords] = useState<LandlordSubmission[]>([])
  const [tourOpen, setTourOpen] = useState(false)
  const pathname = usePathname()
  const navRef = useRef<HTMLUListElement | null>(null)
  const [navMore, setNavMore] = useState(false)
  const checkNav = useCallback(() => { const el = navRef.current; if (el) setNavMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4) }, [])
  useEffect(() => { checkNav(); window.addEventListener('resize', checkNav); return () => window.removeEventListener('resize', checkNav) }, [checkNav])
  const addRenewal = useCallback((s: RenewalSubmission) => setRenewals((r) => [...r, s]), [])
  const addLandlord = useCallback((s: LandlordSubmission) => setLandlords((r) => [...r, s]), [])
  const data = useMemo(() => (seed ? foldRenewals(seed, renewals) : null), [seed, renewals])
  const value = useMemo(() => ({ seed, data, renewals, addRenewal, landlords, addLandlord, tourOpen, setTourOpen }), [seed, data, renewals, addRenewal, landlords, addLandlord, tourOpen])

  return (
    <ObsCtx.Provider value={value}>
      <div className="min-h-screen flex flex-col" style={{ background: '#07090A' }}>
        <div role="note" className="obs-sim sticky top-0 z-40 text-center text-[11px] sm:text-xs font-bold tracking-wide px-3 py-1.5" style={{ background: '#2A1F08', border: 0, borderBottom: '1px solid #F5B83D66' }}>
          {OBS_BANNER}
        </div>
        <header className="border-b" style={{ borderColor: '#1F2A2E' }}>
          <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
            <Link href={OBS_BASE} className="flex items-center gap-3 min-w-0" aria-label="Observatorio de Rentas CDMX, inicio">
              <Image src={`${OBS_BASE}/logo-full.png`} alt="Crowd Conscious" width={44} height={45} priority />
              <span className="min-w-0">
                <span className="obs-h block text-sm sm:text-lg leading-tight">Observatorio de Rentas CDMX</span>
                <span className="block text-[11px] sm:text-xs obs-muted tracking-wide">{OBS_CREDIT}</span>
              </span>
            </Link>
            <button type="button" className="obs-btn ml-auto shrink-0" onClick={() => setTourOpen(true)} data-tour="tour-button">
              <span aria-hidden>▶</span> <span className="hidden sm:inline">Recorrido guiado</span><span className="sm:hidden">Recorrido</span>
            </button>
          </div>
          <nav aria-label="Secciones" className="mx-auto max-w-[1400px] px-2 sm:px-4 relative">
            <ul ref={navRef} onScroll={checkNav} className="flex gap-1 text-sm whitespace-nowrap pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {NAV.map((n) => {
                const active = n.href === OBS_BASE ? pathname === OBS_BASE : pathname?.startsWith(n.href)
                return (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={active ? 'page' : undefined} className="block rounded-lg px-3 py-1.5 font-semibold" style={{ color: active ? '#07090A' : '#C9D4D7', background: active ? '#2BB3C0' : 'transparent' }}>
                      {n.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            {navMore && (<>
              <div className="obs-tabfade" aria-hidden />
              <button type="button" aria-label="Ver más secciones" onClick={() => navRef.current?.scrollBy({ left: 160, behavior: 'smooth' })} className="absolute right-1 top-0.5 w-8 h-8 rounded-full grid place-items-center font-bold" style={{ background: '#141C1F', color: '#2BB3C0', border: '1px solid #2BB3C0' }}>›</button>
            </>)}
          </nav>
        </header>
        <main className="flex-1 mx-auto w-full max-w-[1400px] px-3 sm:px-4 py-4">
          {data ? children : <p className="obs-muted p-8" role="status">Cargando datos simulados…</p>}
        </main>
        <footer className="border-t text-xs obs-muted" style={{ borderColor: '#1F2A2E' }}>
          <div className="mx-auto max-w-[1400px] px-4 py-4 flex flex-wrap gap-x-6 gap-y-1">
            <span>Observatorio de Rentas CDMX · {OBS_CREDIT}</span>
            <span>Datos agregados por colonia · sin nombres ni direcciones · metodología pública</span>
          </div>
        </footer>
        {tourOpen && <Tour onClose={() => setTourOpen(false)} />}
      </div>
    </ObsCtx.Provider>
  )
}
