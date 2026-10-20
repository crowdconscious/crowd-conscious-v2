'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { OBS_INFLATION_12M_PCT, OBS_LEGAL_CAP_PCT } from '@/lib/observatorio-rentas/config'
import { aggregate, alcaldiaAggregates, coloniaRisk, fmtMoney, fmtPct, isWatch, watchReason } from '@/lib/observatorio-rentas/model'
import { OBS_BASE, useObs } from './ObsShell'
import { LAYERS, Legend, ObsMap, type MapLayer } from './ObsMap'
import { Kpi, NGuard, NNote, Panel, RiskChip, SimTag, WatchBadge } from './ui'

export function MapHome({ commission = false }: { commission?: boolean }) {
  const { data } = useObs()
  const seed = data!
  const router = useRouter()
  const sp = useSearchParams()
  const [layer, setLayer] = useState<MapLayer>('compliance')
  const selected = sp.get('alcaldia')
  const setSelected = (cve: string | null) => {
    const q = new URLSearchParams(sp.toString()); if (cve) q.set('alcaldia', cve); else q.delete('alcaldia')
    router.replace(`?${q.toString()}`, { scroll: false })
  }
  const aggs = useMemo(() => alcaldiaAggregates(seed), [seed])
  const scope = useMemo(() => {
    const cs = selected ? seed.colonias.filter((c) => c.cvegeo === selected) : seed.colonias
    return { agg: aggregate(selected ?? 'cdmx', selected ? aggs.find((a) => a.key === selected)!.nombre : 'Ciudad de México', cs), cs }
  }, [seed, selected, aggs])
  const rankedAlc = [...aggs].sort((a, b) => b.watch_count / b.colonias - a.watch_count / a.colonias || b.pct_renewals_above_cap - a.pct_renewals_above_cap).slice(0, 6)
  const rankedCol = scope.cs.filter((c) => isWatch(c.asking_change_12m, c.asking_change_4w)).sort((a, b) => b.asking_change_4w - a.asking_change_4w).slice(0, 8)
  const selAgg = selected ? aggs.find((a) => a.key === selected) : null
  const noPolys = selected && !scope.cs.some((c) => c.has_polygon)
  const a = scope.agg

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3 min-w-0">
        {!commission && (
          <div>
            <p className="obs-label">Índice semanal · semana del {seed.meta.last_week}</p>
            <h1 className="obs-h text-2xl sm:text-3xl mt-1">¿Se cumple el tope a la renta en tu colonia?</h1>
            <p className="obs-muted text-sm mt-1 max-w-3xl">El tope de {fmtPct(OBS_LEGAL_CAP_PCT, 2)} ya aplica a las renovaciones de 2026, pero nadie mide si se respeta. Este mapa lo mide con rentas anunciadas y reportes anónimos de renovación. <SimTag /></p>
          </div>
        )}
        <Panel className="!p-3">
          <div role="radiogroup" aria-label="Capa del mapa" className="flex flex-wrap gap-1.5 mb-2">
            {LAYERS.map((l) => (
              <button key={l.id} role="radio" aria-checked={layer === l.id} onClick={() => setLayer(l.id)} className="rounded-lg px-2.5 py-1 text-xs sm:text-sm font-semibold"
                style={{ background: layer === l.id ? '#2BB3C0' : '#141C1F', color: layer === l.id ? '#07090A' : '#C9D4D7' }}>{l.label}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-2 min-h-[28px]">
            {selAgg ? (<><button className="obs-btn !py-1 !px-2 text-xs" onClick={() => setSelected(null)}>← Toda la ciudad</button><span className="obs-h text-lg">{selAgg.nombre}</span><RiskChip risk={selAgg.risk} /><Link className="obs-btn !py-1 !px-2 text-xs ml-auto" href={`${OBS_BASE}/ficha/${selAgg.key}`}>Ficha de la alcaldía →</Link></>) : <span className="text-sm obs-muted">16 alcaldías · {seed.colonias.length} colonias en el catálogo de la demostración</span>}
          </div>
          <ObsMap layer={layer} alcaldias={aggs} colonias={seed.colonias} selected={selected} onSelectAlcaldia={setSelected} onSelectColonia={(id) => router.push(`${OBS_BASE}/ficha/${id}`)} height={commission ? 460 : 560} />
          <div className="sticky bottom-0 pt-2 border-t mt-2" style={{ borderColor: '#1F2A2E', background: '#0E1416' }}><Legend layer={layer} /></div>
          {noPolys && (
            <div className="mt-3">
              <p className="text-xs obs-muted mb-2">Polígonos de colonia pendientes para esta alcaldía en la demostración; colonias disponibles:</p>
              <ul className="grid sm:grid-cols-2 gap-1.5">
                {scope.cs.map((c) => (
                  <li key={c.id}><Link href={`${OBS_BASE}/ficha/${c.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm" style={{ background: '#141C1F' }}><span className="truncate">{c.nombre}</span><span className="ml-auto"><RiskChip risk={coloniaRisk(c)} /></span></Link></li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>
      <aside className="space-y-3">
        <div className="grid grid-cols-2 gap-2" data-tour="kpis">
          <Kpi label="Renta mediana anunciada" value={fmtMoney(a.asking_rent_median)} sub="2 recámaras · ~65 m²" />
          <Kpi label="Variación 12m vs inflación" value={fmtPct(a.asking_change_12m)} sub={`Inflación: ${fmtPct(OBS_INFLATION_12M_PCT)}`} />
          <Kpi label="% renovaciones sobre el tope" value={<NGuard n={a.renewal_reports_n}>{fmtPct(a.pct_renewals_above_cap)}</NGuard>} sub={`n = ${a.renewal_reports_n.toLocaleString('es-MX')}`} />
          <Kpi label="Colonias a vigilar" value={a.watch_count} sub={`de ${a.colonias}`} />
        </div>
        <p className="text-xs obs-muted">{a.nombre} · <SimTag /> · Reportes voluntarios; no es una muestra representativa</p>
        {!selected && (
          <Panel title="Alcaldías a vigilar">
            <ol className="space-y-1.5">
              {rankedAlc.map((x, i) => (
                <li key={x.key}><button onClick={() => setSelected(x.key)} className="w-full flex items-center gap-2 text-left text-sm rounded-lg px-2 py-1.5 hover:bg-[#141C1F]"><span className="obs-muted w-4">{i + 1}</span><span className="flex-1">{x.nombre}</span><span className="text-xs obs-muted">{x.watch_count}/{x.colonias}</span><RiskChip risk={x.risk} /></button></li>
              ))}
            </ol>
          </Panel>
        )}
        <Panel title="Colonias a vigilar">
          {rankedCol.length ? (
            <ol className="space-y-1.5">
              {rankedCol.map((c) => (
                <li key={c.id}><Link href={`${OBS_BASE}/ficha/${c.id}`} className="block rounded-lg px-2 py-1.5 hover:bg-[#141C1F]">
                  <div className="flex items-center gap-2 text-sm"><span className="flex-1 font-semibold">{c.nombre}</span><WatchBadge /></div>
                  <div className="text-xs obs-muted">{c.alcaldia} · {watchReason(c.asking_change_12m, c.asking_change_4w)}</div>
                </Link></li>
              ))}
            </ol>
          ) : <p className="text-sm obs-muted">Sin colonias con señal de especulación.</p>}
          <NNote n={a.renewal_reports_n} />
        </Panel>
      </aside>
    </div>
  )
}
