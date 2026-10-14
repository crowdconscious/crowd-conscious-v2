import { notFound } from 'next/navigation'
import OrgShell from '@/components/org/OrgShell'
import { ORG_CONTACT_EMAIL, ORG_PORTAL_V2, callHref } from '@/lib/org/config'

export const metadata = { robots: { index: false, follow: false } }

/** Client portal. Hidden entirely unless NEXT_PUBLIC_ORG_PORTAL_V2=true. */
export default function OrgPortalLayout({ children }: { children: React.ReactNode }) {
  if (!ORG_PORTAL_V2) notFound()
  return (
    <OrgShell callHref={callHref()} contactEmail={ORG_CONTACT_EMAIL}>
      {children}
    </OrgShell>
  )
}
