'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { OBS_INFLATION_12M_PCT, OBS_LEGAL_CAP_PCT, OBS_MIN_N } from '@/lib/observatorio-rentas/config'
import { aggregate, alcaldiaAggregates, expandWeekly, type WeeklyPoint, coloniaRisk, fmtInt, fmtMoney, fmtPct, isWatch, watchReason } from '@/lib/observatorio-rentas/model'
import { OBS_BASE, loadWeekly, useObs } from './ObsShell'
import { HBars, Kpi, NGuard, NNote, Panel, RenewalHistogram, RentVsInflation, RiskChip, SimTag, WatchBadge } from './ui'

export function Ficha({ id }: { id: string }) {
  const { data } = useObs()
  const seed = data!
  const [busy, setBusy] = useState(false)
  const col = seed.colonias.find((c) => c.id === id)
  const [colWeekly, setColWeekly] = useState<WeeklyPoint[]>([])
  useEffect(() => { if (col) void loadWeekly(col.cvegeo).then((d) => setColWeekly(expandWeekly(d, col.id, seed.meta.weeks))) }, [col?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const alc = col ? null : alcaldiaAggregates(seed).find((a) => a.key === id)
  if (!col && !alc) return <p>No encontramos esa ficha. <Link className="underline" href={OBS_BASE}>Volver al mapa</Link></p>
  const a = col ? aggregate(col.id, col.nombre, [col], colWeekly) : alc!
  const watch = col ? isWatch(col.asking_change_12m, col.asking_change_4w) : false
  const download = async () => { setBusy(true); try { const r = await import('./reports'); await r.downloadFicha(seed, id) } finally { setBusy(false) } }
  const landlordOk = a.landlord_reports_n >= OBS_MIN_N
  return (
    <div className="space-y-4" data-tour="ficha">
      <nav aria-label="Ruta" className="text-sm obs-muted"><Link href={OBS_BASE} className="underline">Mapa</Link>{col && <> / <Link className="underline" href={`${OBS_BASE}?alcaldia=${col.cvegeo}`}>{col.alcaldia}</Link></>}</nav>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="obs-label">{col ? 'Ficha de colonia' : 'Ficha de alcaldía'}</p>
          <h1 className="obs-h text-2xl sm:text-3xl">{a.nombre}</h1>
        </div>
        <RiskChip risk={col ? coloniaRisk(col) : a.risk} />{watch && <WatchBadge />}<SimTag />
        <button className="obs-btn obs-btn-primary ml-auto" onClick={download} disabled={busy}>{busy ? 'Generando…' : 'Descargar ficha (PDF)'}</button>
      </div>
      {watch && <p className="text-sm" style={{ color: '#2BB3C0' }}>Señal de especulación: {watchReason(col!.asking_change_12m, col!.asking_change_4w)}.</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Kpi label="Renta mediana anunciada" value={fmtMoney(a.asking_rent_median)} sub={col ? `${fmtMoney(col.asking_rent_m2)} por m²` : `${a.colonias} colonias`} />
        <Kpi label="Variación 12 meses" value={fmtPct(a.asking_change_12m)} sub={`4 semanas: ${fmtPct(a.asking_change_4w)} · inflación ${fmtPct(OBS_INFLATION_12M_PCT)}`} />
        <Kpi label="Mediana de aumento en renovación" value={<NGuard n={a.renewal_reports_n}>{fmtPct(a.renewal_increase_median, 2)}</NGuard>} sub={`Tope: ${fmtPct(OBS_LEGAL_CAP_PCT, 2)}`} />
        <Kpi label="Contratos registrados" value={<NGuard n={a.renewal_reports_n}>{fmtPct(a.pct_contracts_registered)}</NGuard>} sub="según los propios reportes" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Renta anunciada semanal vs inflación">{a.weekly.length ? <RentVsInflation weekly={a.weekly} inflation={OBS_INFLATION_12M_PCT} title={`Renta anunciada semanal en ${a.nombre} frente a la inflación`} /> : <div className="h-[200px] grid place-items-center obs-muted text-sm" role="status">Cargando serie semanal…</div>}<p className="text-xs obs-muted mt-2">Fuente simulada: anuncios de renta, {fmtInt(col ? col.listings_last : a.weekly[a.weekly.length - 1]?.listings ?? 0)} anuncios en la última semana.</p></Panel>
        <Panel title="Aumentos en renovación">
          {a.renewal_reports_n >= OBS_MIN_N ? <RenewalHistogram hist={a.renewal_hist} title={`Distribución de aumentos en renovación en ${a.nombre}`} /> : <p className="obs-muted py-10 text-center">Muestra insuficiente (n&lt;25). Tu reporte se sumará cuando haya al menos 25.</p>}
          <NNote n={a.renewal_reports_n} />
          <p className="text-xs mt-1"><NGuard n={a.renewal_reports_n}>{fmtPct(a.pct_renewals_above_cap)} de las renovaciones reportadas supera el tope.</NGuard></p>
        </Panel>
        <Panel title="Intenciones de propietarios">
          {landlordOk ? <HBars title="Intenciones de propietarios" rows={[
            { label: 'Subir el precio de entrada', value: a.pct_plan_raise_start_price, color: '#2BB3C0' },
            { label: 'Retirar la vivienda del mercado', value: a.pct_plan_withdraw, color: '#2BB3C0' },
            { label: 'Pasar a renta de corto plazo', value: a.pct_plan_short_term, color: '#2BB3C0' },
          ]} /> : <p className="obs-muted py-6 text-center">Muestra insuficiente (n&lt;25)</p>}
          <NNote n={a.landlord_reports_n} kind="respuestas de propietarios" />
        </Panel>
        <Panel title="Calidad de datos">
          <ul className="text-sm space-y-1.5 list-disc pl-5">
            <li>Unidad mínima: colonia. No hay datos de viviendas, direcciones ni arrendadores.</li>
            <li>Cifras de reportes con n &lt; {OBS_MIN_N} se ocultan («Muestra insuficiente»).</li>
            <li>Rentas anunciadas ≠ rentas pactadas: miden presión de precios de entrada.</li>
            <li>Anuncios de corto plazo en la zona: {fmtInt(a.short_term_listings)}{col?.near_invi_housing ? ' · colonia cercana a vivienda INVI' : ''}.</li>
            <li>Todas las cifras de esta ficha son <strong>simuladas</strong>.</li>
          </ul>
          <Link href={`${OBS_BASE}/calculadora`} className="obs-btn mt-3">Calcula tu tope →</Link>
        </Panel>
      </div>
    </div>
  )
}
