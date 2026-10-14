import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { SAMPLE_PDF_HREF } from '@/lib/org/config'
import { getOrgLocale } from '../../locale'

export const metadata: Metadata = { title: 'Gracias · Crowd Conscious', robots: { index: false, follow: false } }

export default async function GraciasPage() {
  const locale = await getOrgLocale()
  const es = locale === 'es'
  const steps = es
    ? ['Días 1-2: le escribimos para agendar la llamada de arranque', 'Semana 1: preguntas y población', 'Semanas 2-4: consulta abierta', 'Semana 6: lectura y sesión de resultados']
    : ['Days 1-2: we write to schedule the kickoff call', 'Week 1: questions and population', 'Weeks 2-4: consultation open', 'Week 6: reading and results session']
  return (
    <div className="px-4 py-14">
      <div className="mx-auto max-w-xl rounded-2xl border border-emerald-400/50 bg-[#1a2029] p-6 sm:p-8">
        <CheckCircle2 className="h-10 w-10 text-emerald-300" />
        <h1 className="mt-4 text-2xl font-bold text-white">{es ? 'Gracias por su pago' : 'Thank you for your payment'}</h1>
        <p className="mt-3 text-base text-slate-100">
          {es
            ? 'Le enviamos un recibo por correo. Ese recibo no es un comprobante fiscal (CFDI); su factura le llegará por separado. Si pagó por transferencia SPEI, el recibo llega cuando se acredite.'
            : 'We emailed you a receipt. That receipt is not a tax invoice (CFDI); your invoice will arrive separately. If you paid by SPEI transfer, the receipt arrives once it clears.'}
        </p>
        <h2 className="mt-6 font-semibold text-white">{es ? 'Qué pasa después' : 'What happens next'}</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-100">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-6 text-sm font-semibold text-white">{es ? 'Compártalo internamente:' : 'Share it internally:'}</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Link href="/organizaciones/demo" className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-400 px-5 font-semibold text-[#0f1419]">
            {es ? 'Ver el demo' : 'See the demo'}
          </Link>
          <a href={`${SAMPLE_PDF_HREF}?lang=${locale}`} className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-400 px-5 font-semibold text-slate-100">
            {es ? 'Descargar PDF de muestra' : 'Download sample PDF'}
          </a>
        </div>
      </div>
    </div>
  )
}
