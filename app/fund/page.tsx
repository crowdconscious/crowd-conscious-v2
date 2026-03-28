import { redirect } from 'next/navigation'

/** Public alias → main Conscious Fund page */
export default function FundAliasPage() {
  redirect('/predictions/fund')
}
