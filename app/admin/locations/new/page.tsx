import { redirect } from 'next/navigation'

export default function OldAdminNewLocationRedirect() {
  redirect('/predictions/admin/locations/new')
}
