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
  /** Listings in the latest week (weight for asking-rent aggregates). */
  listings_last: number
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
  /** Last 6 weekly readings (oldest → latest): [median renewal %, % above cap, asking 4w %]. */
  recent: [number, number, number][]
}
export type SeedMeta = { seed: number; last_week: string; weeks: string[]; inflation_12m: number; legal_cap_2026: number; hist_bins: number[] }
export type Seed = {
  meta: SeedMeta
  alcaldias: { cvegeo: string; nombre: string }[]
  colonias: Colonia[]
  city_weekly: WeeklyPoint[]
  alcaldia_weekly: Record<string, WeeklyPoint[]>
  spec_per_week: (number | null)[]
}
/** Compact columnar file written by scripts/observatorio-rentas/seed.mjs. */
export type SeedCore = {
  meta: SeedMeta
  alcaldias: { cvegeo: string; nombre: string }[]
  cols: string[]
  rows: unknown[][]
  city_weekly: [number, number][]
  alcaldia_weekly: Record<string, [number, number][]>
  spec_per_week: (number | null)[]
}
/** Per-alcaldía lazy file: colonia id → [weekly rents, weekly listings]. */
export type WeeklyDetail = Record<string, [number[], number[]]>

export function expandCore(core: SeedCore): Seed {
  const { weeks, hist_bins } = core.meta
  const toWeekly = (s: [number, number][]) => s.map(([rent, listings], i) => ({ w: weeks[i], rent, listings }))
  const colonias = core.rows.map((r) => {
    const o: Record<string, unknown> = {}
    core.cols.forEach((k, i) => { o[k] = r[i] })
    const counts = o.hist as number[]
    delete o.hist
    o.renewal_hist = hist_bins.map((from, j) => ({ from, to: hist_bins[j + 1] ?? null, count: counts[j] }))
    return o as unknown as Colonia
  })
  setWatchCutoff(computeWatchCutoff(colonias.map((c) => c.asking_change_12m)))
  return {
    meta: core.meta, alcaldias: core.alcaldias, colonias,
    city_weekly: toWeekly(core.city_weekly),
    alcaldia_weekly: Object.fromEntries(Object.entries(core.alcaldia_weekly).map(([k, v]) => [k, toWeekly(v)])),
    spec_per_week: core.spec_per_week,
  }
}
export function expandWeekly(detail: WeeklyDetail, id: string, weeks: string[]): WeeklyPoint[] {
  const d = detail[id]
  return d ? d[0].map((rent, i) => ({ w: weeks[i], rent, listings: d[1][i] })) : []
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

let watchCutoff12m = T.watchInflationMultiple * OBS_INFLATION_12M_PCT
/** Effective 12-month cutoff: max(3× inflation, value at the top-10% boundary). Set from the seed in expandCore. */
export function computeWatchCutoff(ch12s: number[], infl = OBS_INFLATION_12M_PCT): number {
  const v = [...ch12s].sort((a, b) => b - a)
  const k = Math.max(1, Math.ceil(v.length * T.watchTopShare))
  return Math.max(T.watchInflationMultiple * infl, v[k - 1] ?? 0)
}
export function getWatchCutoff() { return watchCutoff12m }
export function setWatchCutoff(v: number) { watchCutoff12m = v }

export function isWatch(ch12: number, ch4: number, cutoff = watchCutoff12m): boolean {
  return ch12 > cutoff || ch4 > T.watchChange4wPct
}

/** Plain-language rule, shared by Metodología, legend and reports. */
export function watchRuleText(cutoff = watchCutoff12m): string {
  return `alza de la renta anunciada en 12 meses dentro del ${Math.round(T.watchTopShare * 100)}% de colonias con mayor alza y mayor a ${T.watchInflationMultiple}× la inflación (corte actual: más de ${fmtPct(cutoff)}), o alza mayor a ${T.watchChange4wPct}% en 4 semanas`
}

export function watchReason(ch12: number, ch4: number, cutoff = watchCutoff12m): string {
  const r: string[] = []
  if (ch12 > cutoff) r.push(`alza 12m de ${fmtPct(ch12)} (10% de mayor alza y > ${T.watchInflationMultiple}× inflación)`)
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
  /** Colonias with n ≥ 25 whose category is «Por encima del tope». */
  above_count: number
  /** Colonias with n ≥ 25 (enough data to classify). */
  data_count: number
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
export function aggregate(key: string, nombre: string, cs: Colonia[], weekly: WeeklyPoint[] = []): Aggregate {
  const lw = (c: Colonia) => c.listings_last || 1
  const rn = cs.reduce((a, c) => a + c.renewal_reports_n, 0)
  const ln = cs.reduce((a, c) => a + c.landlord_reports_n, 0)
  const med = r2(wavg(cs, (c) => c.renewal_increase_median, (c) => c.renewal_reports_n))
  const above = r1(wavg(cs, (c) => c.pct_renewals_above_cap, (c) => c.renewal_reports_n))
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
    above_count: cs.filter((c) => coloniaRisk(c) === 'above').length,
    data_count: cs.filter((c) => c.renewal_reports_n >= OBS_MIN_N).length,
    risk: classifyRisk(rn, med, above),
    weekly,
    renewal_hist,
  }
}

export function coloniaRisk(c: Colonia): RiskCategory {
  return classifyRisk(c.renewal_reports_n, c.renewal_increase_median, c.pct_renewals_above_cap)
}
/**
 * Hysteresis: a colonia only changes state after the raw reading has been in the
 * new state for OBS_THRESHOLDS.hysteresisWeeks consecutive weeks. Returns the
 * stable state after each reading.
 */
export function stableStates<S>(raw: S[], weeks = T.hysteresisWeeks): S[] {
  const out: S[] = []
  let state = raw[0]
  let streak = 0
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === state) streak = 0
    else if (i > 0 && raw[i] === raw[i - 1]) { streak++; if (streak + 1 >= weeks) { state = raw[i]; streak = 0 } }
    else streak = 0
    out.push(state)
  }
  return out
}

export function alcaldiaAggregates(seed: Seed): Aggregate[] {
  return seed.alcaldias.map((a) => aggregate(a.cvegeo, a.nombre, seed.colonias.filter((c) => c.cvegeo === a.cvegeo), seed.alcaldia_weekly[a.cvegeo]))
}

export type Alert = { colonia: Colonia; from: RiskCategory | 'watch-off'; to: RiskCategory | 'watch'; why: string }
/** Category changes over the last 4 weeks, after hysteresis (2 consecutive weeks past the threshold). */
export function alerts(seed: Seed): Alert[] {
  const out: Alert[] = []
  for (const c of seed.colonias) {
    if (c.renewal_reports_n >= OBS_MIN_N) {
      const st = stableStates(c.recent.map(([m, a]) => classifyRisk(c.renewal_reports_n, m, a)))
      const prev = st[st.length - 5], now = st[st.length - 1]
      if (now !== prev) {
        const [m, a] = c.recent[c.recent.length - 1]
        const why = now === 'above'
          ? (m > OBS_LEGAL_CAP_PCT
              ? `la mediana de aumento en renovación lleva ${T.hysteresisWeeks} semanas por encima del tope (${fmtPct(m, 2)} > ${fmtPct(OBS_LEGAL_CAP_PCT, 2)})`
              : `${fmtPct(a)} de las renovaciones supera el tope (> ${T.nearMaxPctAbove}%) por ${T.hysteresisWeeks} semanas seguidas`)
          : now === 'near'
            ? `mediana de aumento de ${fmtPct(m, 2)} o ${fmtPct(a)} sobre el tope: zona «cerca del límite» por ${T.hysteresisWeeks} semanas seguidas`
            : `mediana de aumento de ${fmtPct(m, 2)} y ${fmtPct(a)} sobre el tope: de vuelta «dentro del tope» por ${T.hysteresisWeeks} semanas seguidas`
        out.push({ colonia: c, from: prev, to: now, why })
      }
    }
    const ws = stableStates(c.recent.map(([, , ch4]) => isWatch(c.asking_change_12m, ch4)))
    if (ws[ws.length - 1] && !ws[ws.length - 5]) out.push({ colonia: c, from: 'watch-off', to: 'watch', why: watchReason(c.asking_change_12m, c.asking_change_4w) })
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
export const fmtDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/\./g, '')
export const fmtWeek = fmtDate
