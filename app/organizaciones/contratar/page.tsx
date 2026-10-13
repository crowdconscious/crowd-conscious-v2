import type { Metadata } from 'next'
import { getOrgLocale } from '../locale'
import ContratarForm from './ContratarForm'

export async function generateMetadata(): Promise<Metadata> {
  const es = (await getOrgLocale()) === 'es'
  const title = es ? 'Contratar piloto · Crowd Conscious para organizaciones' : 'Buy the pilot · Crowd Conscious for organizations'
  const description = es
    ? 'Lectura piloto privada: $39,000 MXN + IVA. Datos fiscales para su CFDI y pago seguro con Stripe.'
    : 'Private pilot reading: $39,000 MXN + VAT. Tax data for your CFDI and secure payment with Stripe.'
  return { title, description, robots: { index: false, follow: true }, openGraph: { title, description, url: '/organizaciones/contratar' } }
}

type SP = Promise<{ modo?: string; plan?: string; cancelado?: string; source?: string }>

export default async function ContratarPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const plan = ['anual', 'continua', 'sello'].includes(sp.plan ?? '') ? (sp.plan as 'anual' | 'continua' | 'sello') : 'pilot'
  return (
    <ContratarForm
      locale={await getOrgLocale()}
      initialMode={sp.modo === 'propuesta' ? 'proposal' : 'pilot'}
      initialPlan={plan}
      cancelled={sp.cancelado === '1'}
      source={sp.source?.slice(0, 64) ?? null}
      speiEnabled={process.env.ORG_PILOT_ENABLE_SPEI === 'true'}
    />
  )
}
