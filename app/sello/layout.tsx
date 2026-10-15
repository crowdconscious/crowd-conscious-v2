import { notFound } from 'next/navigation'
import OrgShell from '@/components/org/OrgShell'
import { ORG_CONTACT_EMAIL, ORG_PORTAL_V2, callHref } from '@/lib/org/config'

/** Public Sello pages (listing + verify). Behind the same flag as the portal. */
export default function SelloLayout({ children }: { children: React.ReactNode }) {
  if (!ORG_PORTAL_V2) notFound()
  return (
    <OrgShell callHref={callHref()} contactEmail={ORG_CONTACT_EMAIL}>
      {children}
    </OrgShell>
  )
}
