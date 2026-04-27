import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase-admin'
import SponsorEditClient from './SponsorEditClient'

export const metadata: Metadata = {
  title: 'Editar sponsor | Admin',
  robots: { index: false, follow: false },
}

export default async function SponsorEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Read the account server-side so the URL 404s for invalid ids before any
  // client component mounts. The admin layout already gates non-admins.
  const admin = createAdminClient()
  const { data: account, error } = await admin
    .from('sponsor_accounts')
    .select(
      'id, company_name, contact_email, contact_name, logo_url, status, coupon_code, notes, access_token, created_at, last_login_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !account) {
    notFound()
  }

  return <SponsorEditClient account={account} />
}
