import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import PromoCodesClient from './PromoCodesClient'

export default async function AdminPromoCodesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user is super admin (you can adjust this check)
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  // TODO: Add proper super admin check
  // For now, allow Francisco's email
  const isSuperAdmin = profile?.email === 'francisco@crowdconscious.app'

  if (!isSuperAdmin) {
    redirect('/dashboard')
  }

  // Use admin client to bypass RLS for promo codes query
  const adminClient = createAdminClient()

  // Fetch existing promo codes
  const { data: promoCodes, error: promoError } = await adminClient
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  // Log any errors for debugging
  if (promoError) {
    console.error('❌ Error fetching promo codes:', promoError)
  } else {
    console.log('✅ Fetched promo codes:', promoCodes?.length || 0)
  }

  // Fetch usage stats
  const { data: usageStats, error: usageError } = await adminClient
    .from('promo_code_uses')
    .select('promo_code_id, discount_amount')

  if (usageError) {
    console.error('❌ Error fetching usage stats:', usageError)
  }

  return (
    <PromoCodesClient 
      initialPromoCodes={promoCodes || []}
      usageStats={usageStats || []}
      currentUserId={user.id}
    />
  )
}

