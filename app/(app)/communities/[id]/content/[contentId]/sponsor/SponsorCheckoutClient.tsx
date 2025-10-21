'use client'

import SponsorshipCheckout from '@/app/components/SponsorshipCheckout'

interface SponsorCheckoutClientProps {
  contentId: string
  contentTitle: string
  fundingGoal: number
  currentFunding: number
  communityName: string
  communityId?: string
  userRole?: string | null
}

export default function SponsorCheckoutClient(props: SponsorCheckoutClientProps) {
  return <SponsorshipCheckout {...props} />
}
