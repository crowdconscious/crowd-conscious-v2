import { redirect } from 'next/navigation'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function OldAdminLocationIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    redirect('/predictions/admin/locations')
  }
  redirect(`/predictions/admin/locations/${id}/edit`)
}
