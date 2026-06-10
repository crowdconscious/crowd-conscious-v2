import { notFound } from 'next/navigation'
import CreatorFormClient from '@/components/creators/admin/CreatorFormClient'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PredictionsAdminEditCreatorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  return <CreatorFormClient action={id} />
}
