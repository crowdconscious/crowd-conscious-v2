import { permanentRedirect } from 'next/navigation'

/** Legacy URL — market sponsorship flows now live under Conscious Pulse (301). */
export default function SponsorRedirectPage() {
  permanentRedirect('/pulse')
}
