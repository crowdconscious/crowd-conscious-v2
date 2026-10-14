import type { Metadata } from 'next'
import { bookingUrl } from '@/lib/org/config'
import { getOrgLocale } from '../locale'
import ContratarForm, { type Mode, type Plan } from './ContratarForm'

export async function generateMetadata(): Promise<Metadata> {
  const es = (await getOrgLocale()) === 'es'
  const title = es ? 'Contratar · Crowd Conscious para organizaciones' : 'Get started · Crowd Conscious for organizations'
  const description = es
    ? 'Agende una llamada de 20 minutos, solicite una propuesta u orden de compra, o pague el piloto con tarjeta. $39,000 MXN + IVA.'
    : 'Book a 20-minute call, request a proposal or purchase order, or pay for the pilot by card. $39,000 MXN + VAT.'
  return { title, description, robots: { index: false, follow: true }, openGraph: { title, description, url: '/organizaciones/contratar' } }
}

type SP = Promise<{ modo?: string; plan?: string; cancelado?: string; source?: string }>

const MODES: Record<string, Mode> = { llamada: 'call', propuesta: 'proposal', tarjeta: 'pilot' }

export default async function ContratarPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams
  const plan: Plan = ['anual', 'continua', 'sello'].includes(sp.plan ?? '') ? (sp.plan as Plan) : 'pilot'
  const cancelled = sp.cancelado === '1'
  return (
    <ContratarForm
      locale={await getOrgLocale()}
      initialMode={cancelled ? 'pilot' : MODES[sp.modo ?? ''] ?? 'call'}
      initialPlan={plan}
      cancelled={cancelled}
      source={sp.source?.slice(0, 64) ?? null}
      speiEnabled={process.env.ORG_PILOT_ENABLE_SPEI === 'true'}
      bookingUrl={bookingUrl()}
    />
  )
}
