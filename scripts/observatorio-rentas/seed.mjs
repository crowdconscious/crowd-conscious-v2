#!/usr/bin/env node
/**
 * Observatorio de Rentas CDMX — DEMO seed generator.
 *
 * Writes public/observatorio-rentas/data/{core,weekly-<cvegeo>}.json with SIMULATED colonia-level
 * aggregates, calibrated to public medians (see Metodología). Deterministic:
 * fixed seed => identical output on every run.
 *
 *   node scripts/observatorio-rentas/seed.mjs
 *
 * Geography:
 *  - Cuauhtémoc, Miguel Hidalgo, La Magdalena Contreras: real colonia catalogue + polygons
 *    (public/observatorio-rentas/colonias.geojson, CDMX "Catálogo de Colonias").
 *  - Other 13 alcaldías: partial list of real colonia names, no polygons
 *    yet (see README "Pendiente: catálogo completo de colonias").
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeColoniaName } from './colonia-names.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SEED = 20261014

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(SEED)
const between = (a, b) => a + (b - a) * rnd()
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
const r1 = (x) => Math.round(x * 10) / 10
const r2 = (x) => Math.round(x * 100) / 100
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// cvegeo, nombre, median asking rent (2 rec., ~65 m²), pressure 0..1
// Cuauhtémoc / Miguel Hidalgo / Tlalpan / GAM / V. Carranza calibrated to the
// Inmuebles24 June-2026 reference points; the rest are simulated estimates.
const ALCALDIAS = [
  ['09002', 'Azcapotzalco', 15500, 0.45],
  ['09003', 'Coyoacán', 22500, 0.72],
  ['09004', 'Cuajimalpa de Morelos', 24000, 0.5],
  ['09005', 'Gustavo A. Madero', 13000, 0.38],
  ['09006', 'Iztacalco', 14000, 0.42],
  ['09007', 'Iztapalapa', 10500, 0.3],
  ['09008', 'La Magdalena Contreras', 14000, 0.3],
  ['09009', 'Milpa Alta', 7500, 0.12],
  ['09010', 'Álvaro Obregón', 21000, 0.55],
  ['09011', 'Tláhuac', 9000, 0.18],
  ['09012', 'Tlalpan', 13000, 0.35],
  ['09013', 'Xochimilco', 10000, 0.22],
  ['09014', 'Benito Juárez', 26000, 0.82],
  ['09015', 'Cuauhtémoc', 29100, 0.92],
  ['09016', 'Miguel Hidalgo', 27800, 0.8],
  ['09017', 'Venustiano Carranza', 13000, 0.4],
]

// Real colonia names (partial catalogue) for alcaldías without polygons yet.
const PARTIAL = {
  '09002': ['Clavería', 'San Álvaro', 'Nueva Santa María', 'Azcapotzalco Centro', 'El Recreo', 'Santa Bárbara'],
  '09003': ['Del Carmen', 'Santa Catarina', 'Villa Coyoacán', 'Copilco Universidad', 'Ciudad Jardín', 'Campestre Churubusco', 'Pedregal de Santo Domingo', 'Ajusco', 'Romero de Terreros', 'Educación'],
  '09004': ['Cuajimalpa', 'Lomas de Vista Hermosa', 'Contadero', 'Navidad', 'San Mateo Tlaltenango'],
  '09005': ['Lindavista', 'Industrial', 'Guadalupe Tepeyac', 'Estrella', 'Vallejo', 'San Juan de Aragón', 'Martín Carrera', 'Tepeyac Insurgentes'],
  '09006': ['Agrícola Oriental', 'Granjas México', 'Viaducto Piedad', 'Militar Marte', 'Pantitlán', 'Juventino Rosas'],
  '09007': ['San Lorenzo Tezonco', 'Santa Cruz Meyehualco', 'El Sifón', 'Escuadrón 201', 'Santa María Aztahuacán', 'Paraje San Juan', 'Leyes de Reforma'],
  '09009': ['Villa Milpa Alta', 'San Antonio Tecómitl', 'San Pedro Atocpan', 'San Salvador Cuauhtenco'],
  '09010': ['San Ángel', 'Guadalupe Inn', 'Florida', 'Tlacopac', 'Olivar de los Padres', 'Santa Fe', 'Las Águilas', 'Merced Gómez'],
  '09011': ['San Francisco Tlaltenco', 'Santa Catarina Yecahuizotl', 'Del Mar', 'Los Olivos', 'Zapotitla'],
  '09012': ['Tlalpan Centro', 'Toriello Guerra', 'Isidro Fabela', 'Pedregal de San Nicolás', 'Héroes de Padierna', 'Fuentes del Pedregal', 'San Pedro Mártir'],
  '09013': ['Barrio 18', 'Santa Cruz Xochitepec', 'Huichapan', 'Ampliación Tepepan', 'La Noria', 'Santiago Tulyehualco'],
  '09014': ['Del Valle Centro', 'Del Valle Norte', 'Del Valle Sur', 'Narvarte Poniente', 'Narvarte Oriente', 'Portales Norte', 'Portales Sur', 'Nápoles', 'Álamos', 'Mixcoac', 'San Pedro de los Pinos', 'Letrán Valle'],
  '09017': ['Moctezuma 2a Sección', 'Jardín Balbuena', 'Romero Rubio', 'Morelos', 'Pensador Mexicano', 'Aquiles Serdán', 'Federal'],
}
// Extra pressure for well-known high-demand colonias.
const HOT = /roma|condesa|juárez|juarez|escandón|escandon|del valle|narvarte|santa maría la ribera|santa maria la ribera|hipódromo|hipodromo|polanco|anzures|cuauhtémoc$|san rafael|del carmen|nápoles/i
// Storytelling surprises: peripheral colonias rising fast.
const SURPRISE = new Set(['Clavería', 'Agrícola Oriental', 'Tlalpan Centro', 'Lindavista'])

const CAP = 3.69
const INFL = 3.6
const WEEKS = 26
const LAST_WEEK = '2026-10-12' // Monday of the latest simulated week
const weekDates = Array.from({ length: WEEKS }, (_, i) => {
  const d = new Date(LAST_WEEK + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 7 * (WEEKS - 1 - i))
  return d.toISOString().slice(0, 10)
})

// Combined, simplified colonia polygons used by the demo map (see README for sources).
const geo = JSON.parse(readFileSync(join(ROOT, 'public/observatorio-rentas/colonias.geojson'), 'utf8'))
const POLY_ALC = new Set(geo.features.map((f) => '09' + f.properties.cve_alc))
const colonias = []
for (const [cvegeo, nombre, base, pressure] of ALCALDIAS) {
  let names
  if (POLY_ALC.has(cvegeo)) {
    names = geo.features.filter((f) => '09' + f.properties.cve_alc === cvegeo).map((f) => ({ name: normalizeColoniaName(f.properties.colonia), cve_col: f.properties.cve_col, poly: true }))
  } else {
    names = PARTIAL[cvegeo].map((n, i) => ({ name: n, cve_col: `${cvegeo.slice(2)}-p${String(i + 1).padStart(2, '0')}`, poly: false }))
  }
  for (const c of names) {
    const hot = HOT.test(c.name)
    const surprise = SURPRISE.has(c.name)
    const p = Math.min(1, Math.max(0, pressure + (hot ? 0.15 : 0) + gauss() * 0.12))
    const rent = Math.round((base * (0.78 + 0.44 * rnd()) * (hot ? 1.12 : 1)) / 50) * 50
    const m2 = between(58, 72)
    const ch12 = r1(surprise ? between(15, 19) : 2 + 11 * p + gauss() * 2.4)
    const ch4 = r1(surprise ? between(3.2, 4.4) : ch12 / 13 + gauss() * 0.7)
    // weekly listings + median series ending at `rent`
    const startRent = rent / (1 + ch12 / 100 * 0.5)
    const series = weekDates.map((w, i) => {
      const t = i / (WEEKS - 1)
      const late = i >= WEEKS - 4 ? (ch4 / 100) * ((i - (WEEKS - 5)) / 4) : 0
      const v = startRent * (1 + (ch12 / 100 - ch4 / 100) * 0.5 * t) * (1 + late) * (1 + gauss() * 0.006)
      return { w, rent: Math.round(v / 10) * 10, listings: Math.max(3, Math.round((20 + 120 * p) * (c.poly ? 0.3 : 1) * (0.85 + 0.3 * rnd()))) }
    })
    series[WEEKS - 1].rent = rent
    // renewal reports: ~20% below n=25
    // Phase-1 scale: ~2–3k renewal reports city-wide; most colonias stay below n=25.
    const thin = rnd() < 0.9 - 0.3 * p
    const renewal_n = thin ? Math.floor(between(0, 9)) : Math.floor(between(25, 26 + 12 * p))
    const incMed = r2(Math.max(0, CAP * (0.4 + 0.72 * p + gauss() * 0.16)))
    const above = r1(Math.min(85, Math.max(1, 3 + 34 * p + gauss() * 7 + (incMed > CAP ? 6 : 0))))
    const landlord_n = thin ? Math.floor(between(0, 6)) : Math.floor(between(rnd() < 0.5 ? 25 : 6, 30))
    colonias.push({
      id: slug(`${nombre}-${c.name}-${c.cve_col}`),
      cve_col: c.cve_col,
      nombre: c.name,
      alcaldia: nombre,
      cvegeo,
      has_polygon: c.poly,
      asking_rent_median: rent,
      asking_rent_m2: Math.round(rent / m2),
      asking_change_12m: ch12,
      asking_change_4w: ch4,
      weekly: series,
      renewal_reports_n: renewal_n,
      renewal_increase_median: incMed,
      pct_renewals_above_cap: above,
      // histogram of renewal increases (bins in %, counts sum to n)
      renewal_hist: (() => {
        const bins = [0, 1, 2, 3, 3.69, 5, 7, 10, 15]
        const counts = new Array(bins.length).fill(0)
        for (let k = 0; k < renewal_n; k++) {
          const x = Math.max(0, incMed + gauss() * (1.2 + 2 * p))
          let b = 0; for (let j = 0; j < bins.length; j++) if (x >= bins[j]) b = j
          counts[b]++
        }
        return bins.map((from, j) => ({ from, to: bins[j + 1] ?? null, count: counts[j] }))
      })(),
      pct_contracts_registered: r1(Math.min(90, Math.max(5, 38 - 18 * p + gauss() * 8))),
      landlord_reports_n: landlord_n,
      pct_plan_raise_start_price: r1(Math.min(90, Math.max(5, 25 + 45 * p + gauss() * 7))),
      pct_plan_withdraw: r1(Math.min(60, Math.max(1, 6 + 14 * p + gauss() * 4))),
      pct_plan_short_term: r1(Math.min(60, Math.max(1, 4 + 22 * p + gauss() * 5))),
      short_term_listings: Math.max(0, Math.round((hot ? 260 : 30) * p * (0.6 + rnd()) + (cvegeo === '09015' ? 120 : 0))),
      near_invi_housing: false,
      // category 4 weeks ago (for alerts): simulated slightly lower pressure
      // Last 6 weekly readings (oldest → latest) of [median renewal %, % above cap, asking 4w %], for alert hysteresis.
      recent: (() => {
        const m0 = Math.max(0, incMed - Math.abs(gauss()) * 0.5), a0 = Math.max(0, above - Math.abs(gauss()) * 6), c0 = ch4 - Math.abs(gauss()) * 1.2
        return Array.from({ length: 6 }, (_, i) => i === 5 ? [incMed, above, ch4] : [
          r2(Math.max(0, m0 + (incMed - m0) * (i / 5) + gauss() * 0.08)),
          r1(Math.max(0, a0 + (above - a0) * (i / 5) + gauss() * 1.2)),
          r1(c0 + (ch4 - c0) * (i / 5) + gauss() * 0.25),
        ])
      })(),
    })
  }
}
// ~40 INVI flags, deterministic pick
const idx = colonias.map((_, i) => i).sort((a, b) => rnd() - 0.5 + (a - b) * 0)
const shuffled = colonias.map((c) => ({ c, k: rnd() })).sort((a, b) => a.k - b.k)
shuffled.slice(0, 40).forEach(({ c }) => { c.near_invi_housing = true })
void idx

// Weekly series (listing-weighted) for the city and each alcaldía, precomputed.
const wseries = (cs) => weekDates.map((w, i) => {
  let s = 0, n = 0
  for (const c of cs) { s += c.weekly[i].rent * c.weekly[i].listings; n += c.weekly[i].listings }
  return [Math.round(s / n / 10) * 10, n]
})
const city_weekly = wseries(colonias)
const alcaldia_weekly = Object.fromEntries(ALCALDIAS.map(([cve]) => [cve, wseries(colonias.filter((c) => c.cvegeo === cve))]))
// Speculation signal count per week (4-week change on the weekly series, or 12m > 2× inflation).
// Same strict rule as lib/observatorio-rentas/config.ts: 12m cutoff = max(3× inflation, top-10% boundary).
const sorted12 = colonias.map((c) => c.asking_change_12m).sort((a, b) => b - a)
const CUT12 = Math.max(3 * INFL, sorted12[Math.ceil(colonias.length * 0.1) - 1])
const spec_per_week = weekDates.map((_, i) => (i < 4 ? null : colonias.filter((c) =>
  ((c.weekly[i].rent - c.weekly[i - 4].rent) / c.weekly[i - 4].rent) * 100 > 3 || c.asking_change_12m > CUT12).length))

// Compact columnar core (first paint) + per-alcaldía detail files (lazy).
const SCALARS = Object.keys(colonias[0]).filter((k) => !['weekly', 'renewal_hist'].includes(k))
const core = {
  meta: { simulated: true, seed: SEED, generated_by: 'scripts/observatorio-rentas/seed.mjs', last_week: LAST_WEEK, weeks: weekDates, inflation_12m: INFL, legal_cap_2026: CAP, hist_bins: colonias[0].renewal_hist.map((b) => b.from) },
  alcaldias: ALCALDIAS.map(([cvegeo, nombre]) => ({ cvegeo, nombre })),
  cols: [...SCALARS, 'listings_last', 'hist'],
  rows: colonias.map((c) => [...SCALARS.map((k) => c[k]), c.weekly[WEEKS - 1].listings, c.renewal_hist.map((b) => b.count)]),
  city_weekly, alcaldia_weekly, spec_per_week,
}
const OUT = join(ROOT, 'public/observatorio-rentas/data')
mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, 'core.json'), JSON.stringify(core))
for (const [cve] of ALCALDIAS) {
  const detail = Object.fromEntries(colonias.filter((c) => c.cvegeo === cve).map((c) => [c.id, [c.weekly.map((p) => p.rent), c.weekly.map((p) => p.listings)]]))
  writeFileSync(join(OUT, `weekly-${cve}.json`), JSON.stringify(detail))
}
console.log(`wrote ${colonias.length} colonias, thin=${colonias.filter((c) => c.renewal_reports_n < 25).length}, poly=${colonias.filter((c) => c.has_polygon).length}`)
