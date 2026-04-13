import LocationFormClient from '../LocationFormClient'

export const dynamic = 'force-dynamic'

export default async function AdminLocationActionPage({
  params,
}: {
  params: Promise<{ action: string }>
}) {
  const { action } = await params
  const isNew = action === 'new'
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isNew && !uuidRe.test(action)) {
    return (
      <div className="max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Invalid location id
      </div>
    )
  }

  return <LocationFormClient action={action} />
}
