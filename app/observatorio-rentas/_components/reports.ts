'use client'

/**
 * Client-side report generation for the demo (no server, no external calls).
 * Every PDF page and every XLSX/CSV sheet carries the simulation watermark.
 * Reports use a light theme (white background) so they print well.
 */
import type { GeoPermissibleObjects } from 'd3-geo'
import { geoMercator, geoPath } from 'd3-geo'
import { CDMX_ALCALDIAS_GEOJSON_PUBLIC_PATH, type CdmxAlcaldiaFeatureCollection } from '@/lib/sim-viewer/cdmx-alcaldias'
import {
  OBS_BANNER, OBS_CALIBRATION_REFERENCES, OBS_COLORS as C, OBS_INFLATION_12M_PCT, OBS_INITIATIVE_DATE,
  OBS_LEGAL_CAP_PCT, OBS_MIN_N, OBS_THRESHOLDS as T, OBS_VOLUNTARY_NOTE, OBS_WATERMARK,
} from '@/lib/observatorio-rentas/config'
import {
  RISK_LABEL, aggregate, alcaldiaAggregates, coloniaRisk, fmtInt, fmtMoney, fmtPct, isWatch, watchReason,
  type Aggregate, type Colonia, type Seed,
} from '@/lib/observatorio-rentas/model'
import { makeZip } from './zip'

type JsPDF = import('jspdf').jsPDF
const TEAL: [number, number, number] = [31, 133, 145]
const DARK: [number, number, number] = [20, 28, 31]
const RISK_RGB = { within: [61, 220, 151], near: [232, 197, 71], above: [229, 96, 77], nodata: [150, 160, 164] } as const

async function newDoc() {
  const { jsPDF } = await import('jspdf')
  const auto = (await import('jspdf-autotable')).default
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  return { doc, auto }
}

function watermarkAll(doc: JsPDF, title: string) {
  const n = doc.getNumberOfPages()
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.saveGraphicsState()
    // @ts-expect-error GState exists at runtime
    doc.setGState(new doc.GState({ opacity: 0.08 }))
    doc.setFont('helvetica', 'bold'); doc.setFontSize(96); doc.setTextColor(200, 120, 0)
    doc.text('SIMULACIÓN', W / 2, H / 2 + 30, { align: 'center', angle: 35 })
    doc.restoreGraphicsState()
    doc.setFillColor(255, 244, 214); doc.rect(0, 0, W, 22, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(140, 90, 0)
    doc.text(OBS_BANNER, W / 2, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(110, 120, 125)
    doc.text(`Observatorio de Rentas CDMX · powered by Crowd Conscious · ${title}`, 40, H - 20)
    doc.text(`SIMULACIÓN · pág. ${i} de ${n}`, W - 40, H - 20, { align: 'right' })
  }
}

function heading(doc: JsPDF, y: number, label: string, title: string) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...TEAL)
  doc.text(label.toUpperCase().split('').join(' '), 40, y)
  doc.setFontSize(18); doc.setTextColor(...DARK)
  doc.text(title, 40, y + 22)
  return y + 40
}
function para(doc: JsPDF, y: number, text: string, size = 10) {
  doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(40, 48, 52)
  const lines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - 80)
  doc.text(lines, 40, y)
  return y + lines.length * size * 1.35 + 6
}
function sub(doc: JsPDF, y: number, text: string) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...DARK)
  doc.text(text, 40, y)
  return y + 16
}
function kpis(doc: JsPDF, y: number, items: [string, string][]) {
  const W = doc.internal.pageSize.getWidth() - 80, w = W / items.length
  items.forEach(([l, v], i) => {
    const x = 40 + i * w
    doc.setDrawColor(220, 228, 230); doc.setFillColor(246, 250, 250); doc.roundedRect(x, y, w - 8, 54, 4, 4, 'FD')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...TEAL); doc.text(doc.splitTextToSize(l.toUpperCase(), w - 20), x + 8, y + 14)
    doc.setFontSize(15); doc.setTextColor(...DARK); doc.text(v, x + 8, y + 44)
  })
  return y + 66
}
const nOr = (n: number, v: string) => (n < OBS_MIN_N ? 'Muestra insuficiente (n<25)' : v)

let alcGeo: CdmxAlcaldiaFeatureCollection | null = null
async function mapPng(aggs: Aggregate[], highlight?: string): Promise<string> {
  alcGeo ??= await fetch(CDMX_ALCALDIAS_GEOJSON_PUBLIC_PATH).then((r) => r.json())
  const S = 900
  const proj = geoMercator().fitExtent([[20, 20], [S - 20, S - 20]], alcGeo as unknown as GeoPermissibleObjects)
  const path = geoPath(proj)
  const by = new Map(aggs.map((a) => [a.key, a]))
  const color = { within: C.within, near: C.near, above: C.above, nodata: '#C9CFD1' }
  const paths = alcGeo!.features.map((f) => {
    const a = by.get(f.properties.cvegeo)
    const fill = a ? color[a.risk] : '#ddd'
    const op = highlight && highlight !== f.properties.cvegeo ? 0.25 : 1
    return `<path d="${path(f as unknown as GeoPermissibleObjects)}" fill="${fill}" fill-opacity="${op}" stroke="#fff" stroke-width="2"/>`
  }).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="100%" height="100%" fill="#fff"/>${paths}</svg>`
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const cv = document.createElement('canvas'); cv.width = S; cv.height = S
  cv.getContext('2d')!.drawImage(img, 0, 0)
  return cv.toDataURL('image/jpeg', 0.88)
}
function mapLegend(doc: JsPDF, x: number, y: number) {
  ;(['within', 'near', 'above', 'nodata'] as const).forEach((k, i) => {
    doc.setFillColor(...(RISK_RGB[k] as unknown as [number, number, number])); doc.rect(x, y + i * 14, 9, 9, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(40, 48, 52); doc.text(RISK_LABEL[k], x + 14, y + i * 14 + 8)
  })
}

function save(doc: JsPDF | Blob, name: string) {
  const blob = doc instanceof Blob ? doc : (doc as JsPDF).output('blob')
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

function coloniaTableRows(cs: Colonia[]) {
  return cs.map((c) => [c.nombre, c.alcaldia, fmtMoney(c.asking_rent_median), fmtPct(c.asking_change_12m), fmtPct(c.asking_change_4w),
    nOr(c.renewal_reports_n, fmtPct(c.pct_renewals_above_cap)), String(c.renewal_reports_n)])
}
export function topWatch(seed: Seed, k = 10) {
  return seed.colonias.filter((c) => isWatch(c.asking_change_12m, c.asking_change_4w)).sort((a, b) => b.asking_change_4w - a.asking_change_4w || b.asking_change_12m - a.asking_change_12m).slice(0, k)
}

async function fichaDoc(seed: Seed, a: Aggregate, cs: Colonia[], isColonia: boolean) {
  const { doc, auto } = await newDoc()
  let y = heading(doc, 52, isColonia ? 'Ficha de colonia' : 'Ficha de alcaldía', a.nombre)
  y = kpis(doc, y, [
    ['Renta mediana anunciada', fmtMoney(a.asking_rent_median)],
    ['Variación 12 meses', fmtPct(a.asking_change_12m)],
    ['Renovaciones sobre el tope', nOr(a.renewal_reports_n, fmtPct(a.pct_renewals_above_cap))],
    ['Categoría', RISK_LABEL[a.risk]],
  ])
  y = para(doc, y, `Mediana de aumento en renovación: ${nOr(a.renewal_reports_n, fmtPct(a.renewal_increase_median, 2))} (tope ${fmtPct(OBS_LEGAL_CAP_PCT, 2)}). Contratos registrados: ${nOr(a.renewal_reports_n, fmtPct(a.pct_contracts_registered))}. Variación en 4 semanas: ${fmtPct(a.asking_change_4w)}. Inflación de referencia: ${fmtPct(OBS_INFLATION_12M_PCT)}.`, 9.5)
  y = para(doc, y, `Intenciones de propietarios (n = ${fmtInt(a.landlord_reports_n)}): subir precio de entrada ${nOr(a.landlord_reports_n, fmtPct(a.pct_plan_raise_start_price))}; retirar vivienda ${nOr(a.landlord_reports_n, fmtPct(a.pct_plan_withdraw))}; pasar a corto plazo ${nOr(a.landlord_reports_n, fmtPct(a.pct_plan_short_term))}.`, 9.5)
  y = para(doc, y, `n = ${fmtInt(a.renewal_reports_n)} reportes de renovación. ${OBS_VOLUNTARY_NOTE}.`, 8.5)
  if (!isColonia) {
    const img = await mapPng(alcaldiaAggregates(seed), a.key)
    doc.addImage(img, 'JPEG', 40, y, 190, 190); mapLegend(doc, 240, y + 10)
    y += 200
    auto(doc, { startY: y, head: [['Colonia', 'Alcaldía', 'Renta', '12m', '4 sem', '% sobre tope', 'n']], body: coloniaTableRows(cs), styles: { fontSize: 7.5, cellPadding: 2.5 }, headStyles: { fillColor: TEAL }, margin: { top: 34, bottom: 34 } })
  }
  watermarkAll(doc, isColonia ? 'Ficha de colonia' : 'Ficha de alcaldía')
  return doc
}

export async function downloadFicha(seed: Seed, id: string) {
  const col = seed.colonias.find((c) => c.id === id)
  if (col) { const a = aggregate(col.id, `${col.nombre} (${col.alcaldia})`, [col]); return save(await fichaDoc(seed, a, [col], true), `ficha-colonia-${col.id}-SIMULACION.pdf`) }
  const a = alcaldiaAggregates(seed).find((x) => x.key === id)!
  save(await fichaDoc(seed, a, seed.colonias.filter((c) => c.cvegeo === id), false), `ficha-alcaldia-${id}-SIMULACION.pdf`)
}

export async function downloadAllFichasZip(seed: Seed) {
  const files: { name: string; data: Uint8Array }[] = []
  for (const a of alcaldiaAggregates(seed)) {
    const doc = await fichaDoc(seed, a, seed.colonias.filter((c) => c.cvegeo === a.key), false)
    files.push({ name: `ficha-${a.key}-${a.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '-')}-SIMULACION.pdf`, data: new Uint8Array(doc.output('arraybuffer')) })
  }
  files.push({ name: 'LEEME-SIMULACION.txt', data: new TextEncoder().encode(`${OBS_WATERMARK}\r\nFichas por alcaldía generadas por la demostración del Observatorio de Rentas CDMX.\r\n`) })
  save(makeZip(files), 'fichas-16-alcaldias-SIMULACION.zip')
}

export async function downloadBoletin(seed: Seed) {
  const { doc, auto } = await newDoc()
  const city = aggregate('cdmx', 'CDMX', seed.colonias)
  const aggs = alcaldiaAggregates(seed)
  let y = heading(doc, 52, `Boletín semanal · semana del ${seed.meta.last_week}`, 'Rentas en la Ciudad de México')
  y = kpis(doc, y, [
    ['Renta mediana anunciada', fmtMoney(city.asking_rent_median)],
    ['Variación 12m vs inflación', `${fmtPct(city.asking_change_12m)} / ${fmtPct(OBS_INFLATION_12M_PCT)}`],
    ['Renovaciones sobre el tope', fmtPct(city.pct_renewals_above_cap)],
    ['Colonias a vigilar', String(city.watch_count)],
  ])
  const img = await mapPng(aggs)
  doc.addImage(img, 'JPEG', 40, y, 300, 300); mapLegend(doc, 360, y + 20)
  doc.setFontSize(8.5); doc.setTextColor(90, 100, 104)
  doc.text(doc.splitTextToSize('Cumplimiento del tope por alcaldía, a partir de reportes de renovación.', 180), 360, y + 90)
  y += 316
  para(doc, y, `n = ${fmtInt(city.renewal_reports_n)} reportes de renovación y ${fmtInt(city.landlord_reports_n)} de propietarios. ${OBS_VOLUNTARY_NOTE}.`, 8.5)
  doc.addPage()
  y = heading(doc, 52, 'Top 10', 'Colonias a vigilar')
  auto(doc, { startY: y, head: [['Colonia', 'Alcaldía', 'Renta', '12m', '4 sem', '% sobre tope', 'n']], body: coloniaTableRows(topWatch(seed)), styles: { fontSize: 8.5 }, headStyles: { fillColor: TEAL }, margin: { top: 34 } })
  // @ts-expect-error lastAutoTable added by plugin
  y = (doc.lastAutoTable?.finalY ?? y + 200) + 24
  y = sub(doc, y, 'Nota metodológica')
  y = para(doc, y, `Las categorías se calculan con reportes voluntarios de renovación: «Dentro del tope» si la mediana de aumento es <= ${Math.round(T.withinMedianShareOfCap * 100)}% del tope y menos del ${T.withinMaxPctAbove}% de renovaciones lo rebasa; «Por encima del tope» si la mediana supera el tope o más del ${T.nearMaxPctAbove}% lo rebasa; «Cerca del límite» en medio. «A vigilar» marca alzas de renta anunciada mayores a ${T.watchInflationMultiple} veces la inflación en 12 meses o a ${T.watchChange4wPct}% en 4 semanas. Ninguna cifra se publica con menos de ${OBS_MIN_N} reportes. ${OBS_VOLUNTARY_NOTE}.`, 9)
  para(doc, y, 'Este boletín es una demostración: todas las cifras son simuladas.', 9)
  watermarkAll(doc, 'Boletín semanal')
  save(doc, `boletin-semanal-${seed.meta.last_week}-SIMULACION.pdf`)
}

export async function downloadBrief(seed: Seed) {
  const { doc, auto } = await newDoc()
  const city = aggregate('cdmx', 'CDMX', seed.colonias)
  const aggs = alcaldiaAggregates(seed).sort((a, b) => b.pct_renewals_above_cap - a.pct_renewals_above_cap)
  const watch = seed.colonias.filter((c) => isWatch(c.asking_change_12m, c.asking_change_4w))
  let y = heading(doc, 52, 'Brief para el dictamen', 'Evidencia sobre rentas y cumplimiento del tope')
  y = sub(doc, y, '1. Contexto')
  y = para(doc, y, `El ${OBS_INITIATIVE_DATE.split('-').reverse().join('/')} se remitió al Congreso de la Ciudad de México la iniciativa de Ley de Relaciones Inquilinarias y Rentas Justas, Razonables y Asequibles, que propone limitar los aumentos anuales a la inflación del año previo (INEGI) aun con cambio de inquilino, un registro digital obligatorio de contratos, una Defensoría inquilinaria y multas. Hoy el tope ya existe para renovaciones (Código Civil, art. 2448-D; ${fmtPct(OBS_LEGAL_CAP_PCT, 2)} para 2026), pero no existe una medición de su cumplimiento. Este documento resume la evidencia que produciría el Observatorio.`)
  y = kpis(doc, y, [
    ['Renta mediana anunciada', fmtMoney(city.asking_rent_median)],
    ['Variación 12m', fmtPct(city.asking_change_12m)],
    ['Renovaciones sobre el tope', fmtPct(city.pct_renewals_above_cap)],
    ['Contratos registrados', fmtPct(city.pct_contracts_registered)],
  ])
  y = sub(doc, y, '2. Brecha de cumplimiento')
  y = para(doc, y, `Con ${fmtInt(city.renewal_reports_n)} reportes de renovación, la mediana del aumento es ${fmtPct(city.renewal_increase_median, 2)} frente a un tope de ${fmtPct(OBS_LEGAL_CAP_PCT, 2)}, y el ${fmtPct(city.pct_renewals_above_cap)} de las renovaciones reportadas lo rebasa. La brecha se concentra en las alcaldías centrales.`)
  auto(doc, { startY: y, head: [['Alcaldía', 'Mediana aumento', '% sobre tope', 'Categoría', 'n']], body: aggs.map((a) => [a.nombre, nOr(a.renewal_reports_n, fmtPct(a.renewal_increase_median, 2)), nOr(a.renewal_reports_n, fmtPct(a.pct_renewals_above_cap)), RISK_LABEL[a.risk], fmtInt(a.renewal_reports_n)]), styles: { fontSize: 8.5 }, headStyles: { fillColor: TEAL }, margin: { top: 34, bottom: 40 } })
  doc.addPage(); y = 52
  y = sub(doc, y, '3. Señal de especulación')
  y = para(doc, y, `${watch.length} de ${seed.colonias.length} colonias muestran alzas de renta anunciada mayores a ${T.watchInflationMultiple} veces la inflación en 12 meses o a ${T.watchChange4wPct}% en 4 semanas. Las alzas de precio de entrada anteceden a la entrada en vigor de cualquier regla nueva y por eso se miden por separado del cumplimiento.`)
  auto(doc, { startY: y, head: [['Colonia', 'Alcaldía', 'Renta', '12m', '4 sem', '% sobre tope', 'n']], body: coloniaTableRows(topWatch(seed, 12)), styles: { fontSize: 8 }, headStyles: { fillColor: TEAL }, margin: { top: 34, bottom: 40 } })
  // @ts-expect-error plugin
  y = doc.lastAutoTable.finalY + 22
  y = sub(doc, y, '4. Intenciones de oferta de propietarios')
  y = para(doc, y, `Con ${fmtInt(city.landlord_reports_n)} respuestas de propietarios, el ${fmtPct(city.pct_plan_raise_start_price)} planea subir el precio de entrada para nuevos inquilinos, el ${fmtPct(city.pct_plan_withdraw)} considera retirar su vivienda del mercado y el ${fmtPct(city.pct_plan_short_term)} considera pasarla a renta de corto plazo. Estas respuestas incluyen el nivel de certeza declarado y se presentan como intención, no como comportamiento observado.`)
  doc.addPage(); y = 52
  y = sub(doc, y, '5. Limitaciones')
  y = para(doc, y, `Los reportes de inquilinos y propietarios son voluntarios: no constituyen una muestra representativa y no se les asigna margen de error. Se publica siempre el número de reportes (n) y ninguna cifra con menos de ${OBS_MIN_N}. Las rentas anunciadas no son rentas pactadas: miden presión de precios de entrada, no cumplimiento. La unidad mínima es la colonia; no se recaban nombres, direcciones ni datos de arrendadores. Este documento no contiene recomendaciones sobre el sentido del dictamen.`)
  y = sub(doc, y, '6. Anexo metodológico')
  y = para(doc, y, `Fuentes previstas: anuncios de renta (convenio o licencia), reportes anónimos de renovación, pulso de propietarios, anuncios de corto plazo e inflación INEGI. Limpieza: deduplicación de anuncios repetidos, exclusión de valores atípicos, límites de envío y revisión de patrones por canal. Umbrales: ver nota del boletín. Referencias públicas usadas para calibrar la simulación:`, 9.5)
  for (const r of OBS_CALIBRATION_REFERENCES) y = para(doc, y, '• ' + r, 9)
  y = para(doc, y, 'Todas las cifras de este documento son simuladas con fines de demostración y no son mediciones reales.', 9.5)
  doc.addPage(); y = heading(doc, 52, 'Anexo', 'Mapa de cumplimiento por alcaldía')
  const img = await mapPng(alcaldiaAggregates(seed))
  doc.addImage(img, 'JPEG', 40, y, 360, 360); mapLegend(doc, 420, y + 20)
  watermarkAll(doc, 'Brief para el dictamen')
  save(doc, 'brief-dictamen-SIMULACION.pdf')
}

const DICT: [string, string][] = [
  ['cve_col', 'Clave de colonia (catálogo CDMX) o clave provisional p## para catálogo parcial'],
  ['colonia', 'Nombre de la colonia'], ['alcaldia', 'Alcaldía'],
  ['asking_rent_median', 'Renta mediana anunciada (MXN/mes, 2 recámaras ~65 m²)'], ['asking_rent_m2', 'Renta anunciada por m² (MXN)'],
  ['asking_change_12m', 'Variación de la renta anunciada en 12 meses (%)'], ['asking_change_4w', 'Variación en 4 semanas (%)'],
  ['listings_count', 'Anuncios en la última semana'],
  ['renewal_reports_n', 'Número de reportes de renovación'], ['renewal_increase_median', 'Mediana de aumento en renovación (%), vacío si n<25'],
  ['pct_renewals_above_cap', '% de renovaciones por encima del tope, vacío si n<25'], ['pct_contracts_registered', '% de contratos registrados, vacío si n<25'],
  ['landlord_reports_n', 'Número de respuestas de propietarios'], ['pct_plan_raise_start_price', '% que planea subir el precio de entrada, vacío si n<25'],
  ['pct_plan_withdraw', '% que considera retirar la vivienda, vacío si n<25'], ['pct_plan_short_term', '% que considera renta de corto plazo, vacío si n<25'],
  ['short_term_listings', 'Anuncios de renta de corto plazo (agregado por colonia)'], ['near_invi_housing', 'Colonia cercana a vivienda INVI (sí/no)'],
  ['categoria', 'Categoría de cumplimiento'], ['a_vigilar', 'Señal de especulación (sí/no)'],
]
function openRows(seed: Seed) {
  return seed.colonias.map((c) => {
    const g = (n: number, v: number) => (n < OBS_MIN_N ? '' : v)
    return [c.cve_col, c.nombre, c.alcaldia, c.asking_rent_median, c.asking_rent_m2, c.asking_change_12m, c.asking_change_4w, c.listings_last,
      c.renewal_reports_n, g(c.renewal_reports_n, c.renewal_increase_median), g(c.renewal_reports_n, c.pct_renewals_above_cap), g(c.renewal_reports_n, c.pct_contracts_registered),
      c.landlord_reports_n, g(c.landlord_reports_n, c.pct_plan_raise_start_price), g(c.landlord_reports_n, c.pct_plan_withdraw), g(c.landlord_reports_n, c.pct_plan_short_term),
      c.short_term_listings, c.near_invi_housing ? 'sí' : 'no', RISK_LABEL[coloniaRisk(c)], isWatch(c.asking_change_12m, c.asking_change_4w) ? 'sí' : 'no']
  })
}

export function downloadCsv(seed: Seed) {
  const esc = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const lines = [`# ${OBS_WATERMARK}`, DICT.map((d) => d[0]).join(','), ...openRows(seed).map((r) => r.map(esc).join(','))]
  save(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), 'datos-abiertos-colonias-SIMULACION.csv')
}

export async function downloadXlsx(seed: Seed) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const mark = (ws: import('exceljs').Worksheet, cols: number) => {
    ws.spliceRows(1, 0, [OBS_WATERMARK])
    ws.mergeCells(1, 1, 1, Math.max(2, cols))
    const c = ws.getCell(1, 1); c.font = { bold: true, color: { argb: 'FF8C5A00' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } }
    ws.headerFooter.oddHeader = '&C&"Arial,Bold"SIMULACIÓN · DATOS SIMULADOS'
    ws.headerFooter.oddFooter = '&CSIMULACIÓN · Observatorio de Rentas CDMX'
  }
  const ws = wb.addWorksheet('colonias')
  ws.addRow(DICT.map((d) => d[0])).font = { bold: true }
  openRows(seed).forEach((r) => ws.addRow(r))
  ws.columns.forEach((c) => { c.width = 16 })
  mark(ws, DICT.length)
  const wd = wb.addWorksheet('diccionario')
  wd.addRow(['campo', 'descripción']).font = { bold: true }
  DICT.forEach((d) => wd.addRow(d))
  wd.addRow([]); wd.addRow(['nota', `${OBS_VOLUNTARY_NOTE}. Cifras con n<${OBS_MIN_N} se dejan vacías.`])
  wd.getColumn(1).width = 28; wd.getColumn(2).width = 90
  mark(wd, 2)
  const buf = await wb.xlsx.writeBuffer()
  save(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'datos-abiertos-colonias-SIMULACION.xlsx')
}

export { watchReason }
