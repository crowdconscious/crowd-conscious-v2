import { redirect } from 'next/navigation'

/** /escribe — bilingual alias for the creator landing page (/creators). */
export default function EscribeAliasPage() {
  redirect('/creators')
}
