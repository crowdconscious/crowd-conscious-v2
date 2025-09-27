import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import PaymentClient from './PaymentClient'

interface PaymentPageProps {
  params: {
    sponsorshipId: string
  }
}

async function getSponsorshipForPayment(sponsorshipId: string, userId: string) {
  const { data: sponsorship, error } = await supabase
    .from('sponsorships')
    .select(`
      id,
      amount,
      status,
      created_at,
      platform_fee,
      community_content (
        id,
        title,
        description,
        image_url,
        funding_goal,
        current_funding,
        communities (
          id,
          name,
          image_url
        )
      )
    `)
    .eq('id', sponsorshipId)
    .eq('sponsor_id', userId)
    .single()

  if (error || !sponsorship) {
    console.error('Error fetching sponsorship:', error)
    return null
  }

  return sponsorship
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const sponsorship = await getSponsorshipForPayment(params.sponsorshipId, (user as any).id)

  if (!sponsorship) {
    notFound()
  }

  // Check if sponsorship is in correct state for payment
  if ((sponsorship as any)?.status === 'paid') {
    redirect('/brand/dashboard?message=already-paid')
  }

  if ((sponsorship as any)?.status !== 'approved') {
    redirect('/brand/dashboard?message=not-approved')
  }

  return (
    <PaymentClient 
      user={user}
      sponsorship={sponsorship}
    />
  )
}
