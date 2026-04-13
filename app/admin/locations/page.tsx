import { redirect } from 'next/navigation'

export default function OldAdminLocationsRedirect() {
  redirect('/predictions/admin/locations')
}
