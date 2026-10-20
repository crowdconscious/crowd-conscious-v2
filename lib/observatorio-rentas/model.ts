import {
  OBS_INFLATION_12M_PCT,
  OBS_LEGAL_CAP_PCT,
  OBS_MIN_N,
  OBS_THRESHOLDS as T,
} from './config.ts'

export type WeeklyPoint = { w: string; rent: number; listings?: number }
export type HistBin = { from: number; to: number | null; count: number }
export type Colonia = {
  id: string
  cve_col: string
  nombre: string
  alcaldia: string
  cvegeo: string
  has_polygon: boolean
  asking_rent_median: number
  asking_rent_m2: number
  asking_change_12m: number
  asking_change_4w: number
  weekly: WeeklyPoint[]
  renewal_reports_n: number
  renewal_increase_median: number
  pct_renewals_above_cap: number
  renewal_hist: HistBin[]
  pct_contracts_registered: number
  landlord_reports_n: number
  pct_plan_raise_start_price: number
  pct_plan_withdraw: number
  pct_plan_short_term: number
  short_term_listings: number
  near_invi_housing: boolean
  prev_renewal_increase_median: number
  prev_pct_renewals_above_cap: number
  prev_asking_change_4w: number
}
export type Seed = {
  meta: { seed: number; last_week: string; weeks: string[]; inflation_12m: number; legal_cap_2026: number }
  alcaldias: { cvegeo: string; nombre: string }[]
  colonias: Colonia[]
  city_weekly: WeeklyPoint[]
}

export type RiskCategory = 'within' | 'near' | 'above' | 'nodata'
export const RISK_LABEL: Record<RiskCategory, string> = {
  within: 'Dentro del tope',
  near: 'Cerca del límite',
  above: 'Por encima del tope',
  nodata: 'Sin datos suficientes',
}

export function classifyRisk(n: number, median: number, pctAbove: number, cap = OBS_LEGAL_CAP_PCT): RiskCategory {
  if (n < OBS_MIN_N) return 'nodata'
  if (median > cap || pctAbove > T.nearMaxPctAbove) return 'above'
  if (median > cap * T.withinMedianShareOfCap || pctAbove >= T.withinMaxPctAbove) return 'near'
  return 'within'
}

export function isWatch(ch12: number, ch4: number, infl = OBS_INFLATION_12M_PCT): boolean {
  return ch12 > T.watchInflationMultiple * infl || ch4 > T.watchChange4wPct
}

export function watchReason(ch12: number, ch4: number, infl = OBS_INFLATION_12M_PCT): string {
  const r: string[] = []
  if (ch12 > T.watchInflationMultiple * infl) r.push(`alza 12m de ${fmtPct(ch12)} (> ${T.watchInflationMultiple}× inflación)`)
  if (ch4 > T.watchChange4wPct) r.push(`alza de ${fmtPct(ch4)} en 4 semanas (> ${T.watchChange4wPct}%)`)
  return r.join(' y ')
}

export type Aggregate = {
  key: string
  nombre: string
  colonias: number
  asking_rent_median: number
  asking_change_12m: number
  asking_change_4w: number
  renewal_reports_n: number
  renewal_increase_median: number
  pct_renewals_above_cap: number
  pct_contracts_registered: number
  landlord_reports_n: number
  pct_plan_raise_start_price: number
  pct_plan_withdraw: number
  pct_plan_short_term: number
  short_term_listings: number
  watch_count: number
  risk: RiskCategory
  weekly: WeeklyPoint[]
  renewal_hist: HistBin[]
}

function wavg(cs: Colonia[], f: (c: Colonia) => number, w: (c: Colonia) => number) {
  let s = 0, n = 0
  for (const c of cs) { const k = w(c); s += f(c) * k; n += k }
  return n ? s / n : 0
}
const r1 = (x: number) => Math.round(x * 10) / 10
const r2 = (x: number) => Math.round(x * 100) / 100

/** Weighted aggregate of colonias (weights: listings for asking, n for reports). */
export function aggregate(key: string, nombre: string, cs: Colonia[]): Aggregate {
  const lw = (c: Colonia) => c.weekly[c.weekly.length - 1]?.listings ?? 1
  const rn = cs.reduce((a, c) => a + c.renewal_reports_n, 0)
  const ln = cs.reduce((a, c) => a + c.landlord_reports_n, 0)
  const med = r2(wavg(cs, (c) => c.renewal_increase_median, (c) => c.renewal_reports_n))
  const above = r1(wavg(cs, (c) => c.pct_renewals_above_cap, (c) => c.renewal_reports_n))
  const weeks = cs[0]?.weekly.length ?? 0
  const weekly = Array.from({ length: weeks }, (_, i) => ({
    w: cs[0].weekly[i].w,
    rent: Math.round(wavg(cs, (c) => c.weekly[i].rent, (c) => c.weekly[i].listings ?? 1) / 10) * 10,
    listings: cs.reduce((a, c) => a + (c.weekly[i].listings ?? 0), 0),
  }))
  const renewal_hist = (cs[0]?.renewal_hist ?? []).map((b, j) => ({ ...b, count: cs.reduce((a, c) => a + c.renewal_hist[j].count, 0) }))
  return {
    key,
    nombre,
    colonias: cs.length,
    asking_rent_median: Math.round(wavg(cs, (c) => c.asking_rent_median, lw) / 50) * 50,
    asking_change_12m: r1(wavg(cs, (c) => c.asking_change_12m, lw)),
    asking_change_4w: r1(wavg(cs, (c) => c.asking_change_4w, lw)),
    renewal_reports_n: rn,
    renewal_increase_median: med,
    pct_renewals_above_cap: above,
    pct_contracts_registered: r1(wavg(cs, (c) => c.pct_contracts_registered, (c) => c.renewal_reports_n)),
    landlord_reports_n: ln,
    pct_plan_raise_start_price: r1(wavg(cs, (c) => c.pct_plan_raise_start_price, (c) => c.landlord_reports_n)),
    pct_plan_withdraw: r1(wavg(cs, (c) => c.pct_plan_withdraw, (c) => c.landlord_reports_n)),
    pct_plan_short_term: r1(wavg(cs, (c) => c.pct_plan_short_term, (c) => c.landlord_reports_n)),
    short_term_listings: cs.reduce((a, c) => a + c.short_term_listings, 0),
    watch_count: cs.filter((c) => isWatch(c.asking_change_12m, c.asking_change_4w)).length,
    risk: classifyRisk(rn, med, above),
    weekly,
    renewal_hist,
  }
}

export function coloniaRisk(c: Colonia): RiskCategory {
  return classifyRisk(c.renewal_reports_n, c.renewal_increase_median, c.pct_renewals_above_cap)
}
export function coloniaPrevRisk(c: Colonia): RiskCategory {
  return classifyRisk(c.renewal_reports_n, c.prev_renewal_increase_median, c.prev_pct_renewals_above_cap)
}

export function alcaldiaAggregates(seed: Seed): Aggregate[] {
  return seed.alcaldias.map((a) => aggregate(a.cvegeo, a.nombre, seed.colonias.filter((c) => c.cvegeo === a.cvegeo)))
}

export type Alert = { colonia: Colonia; from: RiskCategory | 'watch-off'; to: RiskCategory | 'watch'; why: string }
export function alerts(seed: Seed): Alert[] {
  const out: Alert[] = []
  for (const c of seed.colonias) {
    const now = coloniaRisk(c), prev = coloniaPrevRisk(c)
    if (now !== prev && now !== 'nodata') {
      const why = now === 'above'
        ? (c.renewal_increase_median > OBS_LEGAL_CAP_PCT
            ? `la mediana de aumento en renovación pasó a ${fmtPct(c.renewal_increase_median)} (> tope de ${fmtPct(OBS_LEGAL_CAP_PCT)})`
            : `el ${fmtPct(c.pct_renewals_above_cap)} de las renovaciones supera el tope (> ${T.nearMaxPctAbove}%)`)
        : `la mediana de aumento en renovación es ${fmtPct(c.renewal_increase_median)} (entre ${Math.round(T.withinMedianShareOfCap * 100)}% y 100% del tope) o ${fmtPct(c.pct_renewals_above_cap)} supera el tope`
      out.push({ colonia: c, from: prev, to: now, why })
    }
    const wasWatch = isWatch(c.asking_change_12m, c.prev_asking_change_4w)
    const nowWatch = isWatch(c.asking_change_12m, c.asking_change_4w)
    if (nowWatch && !wasWatch) out.push({ colonia: c, from: 'watch-off', to: 'watch', why: watchReason(c.asking_change_12m, c.asking_change_4w) })
  }
  const rank = (a: Alert) => (a.to === 'above' ? 0 : a.to === 'watch' ? 1 : 2)
  return out.sort((a, b) => rank(a) - rank(b) || a.colonia.nombre.localeCompare(b.colonia.nombre, 'es'))
}

export function allowedMax(rent: number, cap = OBS_LEGAL_CAP_PCT): number {
  return Math.round(rent * (1 + cap / 100) * 100) / 100
}

export const fmtMoney = (x: number) => '$' + Math.round(x).toLocaleString('es-MX')
export const fmtPct = (x: number, d = 1) => `${x.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })}%`
export const fmtInt = (x: number) => Math.round(x).toLocaleString('es-MX')
export const fmtWeek = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
