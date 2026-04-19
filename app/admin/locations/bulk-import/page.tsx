import { redirect } from 'next/navigation'

export default function OldAdminLocationsBulkImportRedirect() {
  redirect('/predictions/admin/locations/bulk-import')
}
