import { notFound } from 'next/navigation'
import LocationFormClient from '@/components/locations/admin/LocationFormClient'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PredictionsAdminEditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  return <LocationFormClient action={id} />
}
