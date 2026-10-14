import OrgShell from '@/components/org/OrgShell'
import { ORG_CONTACT_EMAIL, callHref } from '@/lib/org/config'

/** B2B shell: no civic nav, app prompts or citizen sign-up (rule 6 / Prompt 1A). */
export default function OrganizacionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgShell callHref={callHref()} contactEmail={ORG_CONTACT_EMAIL}>
      {children}
    </OrgShell>
  )
}
