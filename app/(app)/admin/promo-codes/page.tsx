import { createClient } from '@/lib/supabase-server'
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

  // Fetch existing promo codes
  const { data: promoCodes } = await supabase
    .from('promo_codes')
    .select(`
      *,
      creator:created_by(full_name, email)
    `)
    .order('created_at', { ascending: false })

  // Fetch usage stats
  const { data: usageStats } = await supabase
    .from('promo_code_uses')
    .select('promo_code_id, discount_amount')

  return (
    <PromoCodesClient 
      initialPromoCodes={promoCodes || []}
      usageStats={usageStats || []}
      currentUserId={user.id}
    />
  )
}

