'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedCard } from '@/components/ui/UIComponents'

interface CorporateTrainingCardProps {
  initialCorporateInfo?: {
    role: string
    accountId: string
    companyName?: string
  } | null
}

export default function CorporateTrainingCard({ initialCorporateInfo }: CorporateTrainingCardProps) {
  const [corporateLink, setCorporateLink] = useState('/concientizaciones')
  const [badge, setBadge] = useState('NEW')

  useEffect(() => {
    // Check corporate status client-side for accurate routing
    const checkCorporateStatus = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) return

        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('is_corporate_user, corporate_role')
          .eq('id', user.id)
          .single()

        const profile = profileData as any
        const isCorporate = profile?.is_corporate_user === true || profile?.is_corporate_user === 'true'
        
        if (isCorporate && profile?.corporate_role === 'admin') {
          setCorporateLink('/corporate/dashboard')
          setBadge('✓ Active')
        } else if (isCorporate && profile?.corporate_role === 'employee') {
          setCorporateLink('/employee-portal/dashboard')
          setBadge('✓ Active')
        }
      } catch (error) {
        console.error('Error checking corporate status:', error)
      }
    }

    checkCorporateStatus()
  }, [])

  return (
    <Link href={corporateLink}>
      <AnimatedCard className="h-full p-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white relative overflow-hidden hover:scale-105 transition-all duration-300 cursor-pointer">
        <div className="absolute top-2 right-2 text-3xl opacity-20">
          🎓
        </div>
        <div className="relative z-10">
          <div className="text-2xl mb-2">🎓</div>
          <h3 className="font-semibold text-lg mb-2">Corporate Training</h3>
          <p className="text-white/90 text-sm mb-3">Transform your team with impact</p>
          <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
            {badge}
          </div>
        </div>
      </AnimatedCard>
    </Link>
  )
}

