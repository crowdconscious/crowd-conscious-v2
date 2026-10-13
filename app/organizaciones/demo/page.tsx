import type { Metadata } from 'next'
import { getOrgLocale } from '../locale'
import DemoDashboard from './DemoDashboard'

export async function generateMetadata(): Promise<Metadata> {
  const es = (await getOrgLocale()) === 'es'
  const title = es ? 'Demo · Crowd Conscious para organizaciones' : 'Demo · Crowd Conscious for organizations'
  const description = es
    ? 'Explore el tablero de cliente con datos ficticios: lecturas, certeza 1-10, tasa de respuesta y el Sello verificado.'
    : 'Explore the client dashboard with fictitious data: readings, 1-10 certainty, response rate and the Verified Seal.'
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, url: '/organizaciones/demo' },
  }
}

export default async function OrganizacionesDemoPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams
  return <DemoDashboard locale={await getOrgLocale()} initialView={vista === 'sello' ? 'sello' : 'dashboard'} />
}
