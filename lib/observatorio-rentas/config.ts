/**
 * Observatorio de Rentas CDMX (DEMO) — single source of truth for thresholds,
 * palette and copy constants. Shown verbatim on the Metodología page.
 */
export const OBS_LEGAL_CAP_PCT = 3.69 // Código Civil art. 2448-D, renovaciones 2026
export const OBS_INFLATION_12M_PCT = 3.6 // referencia pública (INEGI)
export const OBS_MIN_N = 25 // regla de densidad: nada se publica con n < 25
export const OBS_DEMO_PASSCODE = 'vivienda2026'
export const OBS_INITIATIVE_DATE = '2026-10-14'

export const OBS_THRESHOLDS = {
  /** Dentro del tope: mediana ≤ 80% del tope Y < 15% de renovaciones por encima. */
  withinMedianShareOfCap: 0.8,
  withinMaxPctAbove: 15,
  /** Cerca del límite: mediana entre 80% y 100% del tope, O 15–30% por encima. */
  nearMaxPctAbove: 30,
  /**
   * A vigilar (estricto): alza 12m mayor a 3× la inflación Y dentro del 10% de
   * colonias con mayor alza (el corte efectivo es el mayor de ambos), O alza > 3% en 4 semanas.
   */
  watchInflationMultiple: 3,
  watchTopShare: 0.1,
  watchChange4wPct: 3,
  /** Alerts: a category change counts only after this many consecutive weekly readings. */
  hysteresisWeeks: 2,
} as const

export const OBS_COLORS = {
  bg: '#07090A',
  panel: '#0E1416',
  panel2: '#141C1F',
  border: '#1F2A2E',
  text: '#E8EEF0',
  muted: '#9AA8AD',
  turquoise: '#2BB3C0',
  mint: '#3DDC97',
  /** Amber is reserved for "datos simulados" labels only. */
  amber: '#F5B83D',
  within: '#3DDC97',
  near: '#E8C547',
  above: '#E5604D',
  nodata: '#4A555A',
} as const

export const OBS_BANNER =
  'DEMOSTRACIÓN · DATOS SIMULADOS — calibrados con medianas públicas, no son mediciones reales'
export const OBS_CREDIT = 'Una herramienta de Crowd Conscious'
export const OBS_WATERMARK = 'SIMULACIÓN · ' + OBS_BANNER + ' · Observatorio de Rentas CDMX · ' + OBS_CREDIT
export const OBS_VOLUNTARY_NOTE = 'Reportes voluntarios; no es una muestra representativa'
export const OBS_INSUFFICIENT = 'Muestra insuficiente (n<25)'

export const OBS_CALIBRATION_REFERENCES = [
  'Renta anunciada promedio CDMX, 2 recámaras ~65 m²: ~$21,900/mes; Cuauhtémoc ~$29,100; Miguel Hidalgo ~$27,800; Tlalpan, Gustavo A. Madero y Venustiano Carranza ~$13,000 (índice Inmuebles24, junio 2026).',
  'Variación anual de la renta anunciada CDMX: +9.6% frente a inflación de 3.6%.',
  'Tope legal para renovaciones 2026: 3.69% (Código Civil, art. 2448-D).',
]
