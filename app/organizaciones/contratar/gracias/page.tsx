import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { getOrgLocale } from '../../locale'

export const metadata: Metadata = { title: 'Gracias · Crowd Conscious', robots: { index: false, follow: false } }

export default async function GraciasPage() {
  const es = (await getOrgLocale()) === 'es'
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#0f1419] px-4 py-16 text-slate-100">
      <div className="max-w-lg rounded-2xl border border-emerald-500/40 bg-[#1a2029] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h1 className="mt-4 text-2xl font-bold text-white">{es ? 'Gracias por su pago' : 'Thank you for your payment'}</h1>
        <p className="mt-3 text-sm text-slate-300">
          {es
            ? 'Le enviamos un recibo por correo. Ese recibo no es un comprobante fiscal (CFDI); su factura le llegará por separado. Si pagó por transferencia SPEI, el recibo llega cuando se acredite.'
            : 'We emailed you a receipt. That receipt is not a tax invoice (CFDI); your invoice will arrive separately. If you paid by SPEI transfer, the receipt arrives once it clears.'}
        </p>
        <p className="mt-3 text-sm text-slate-400">
          {es ? 'En 2 días hábiles le escribimos para agendar el diseño de las preguntas.' : 'Within 2 business days we will reach out to schedule the question design.'}
        </p>
        <Link href="/organizaciones" className="mt-6 inline-block text-sm font-semibold text-emerald-400 hover:underline">
          {es ? 'Volver a organizaciones' : 'Back to organizations'}
        </Link>
      </div>
    </div>
  )
}
