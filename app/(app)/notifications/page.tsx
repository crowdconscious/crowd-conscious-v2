import { redirect } from 'next/navigation'

/** Canonical notifications UI lives under the predictions shell. */
export default function NotificationsRedirectPage() {
  redirect('/predictions/notifications')
}
