/** Writes the fictitious Hospital Ejemplo full report: npx tsx scripts/org-sample-report.ts <out.pdf> [es|en] */
import { writeFileSync } from 'node:fs'
import { DEMO_DEFAULT_READING_ID, DEMO_ORG, DEMO_READINGS, previousClosed } from '../lib/org/demo-data'
import { toClientReading } from '../lib/org/readings'
import { generateReadingReportPdf } from '../lib/org/report-pdf'

const out = process.argv[2] ?? 'sample-report.pdf'
const locale = process.argv[3] === 'en' ? 'en' : 'es'
const raw = DEMO_READINGS.find((r) => r.id === DEMO_DEFAULT_READING_ID)!
const prev = previousClosed(raw.id)
const pdf = generateReadingReportPdf(toClientReading(raw), { orgName: DEMO_ORG.name, locale, demo: true, earlier: prev ? toClientReading(prev) : null })
writeFileSync(out, pdf)
console.log('wrote', out, pdf.length, 'bytes')
