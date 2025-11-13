'use client'

import { useState, useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'
import { uploadSponsorLogo } from '@/lib/storage'

interface SponsorshipCheckoutProps {
  contentId: string
  contentTitle: string
  fundingGoal: number
  currentFunding: number
  communityName: string
  communityId?: string
  userRole?: string | null
  onSuccess?: () => void
  onCancel?: () => void
}

interface SponsorshipFormData {
  support_type: 'financial' | 'volunteer' | 'resources' // NEW: Support type
  amount: number
  sponsor_type: 'individual' | 'business'
  
  // Individual fields
  display_name: string
  
  // Business fields
  brand_name: string
  brand_logo?: File
  brand_logo_url?: string
  brand_website: string
  tax_id: string // RFC for Mexico
  
  // Contact
  email: string
  phone: string
  
  // Options
  message: string
  anonymous: boolean
  tax_receipt: boolean
  
  // Volunteer/Resources fields
  volunteer_skills?: string
  resource_description?: string
}

export default function SponsorshipCheckout({
  contentId,
  contentTitle,
  fundingGoal,
  currentFunding,
  communityName,
  communityId,
  userRole,
  onSuccess,
  onCancel
}: SponsorshipCheckoutProps) {
  const [formData, setFormData] = useState<SponsorshipFormData>({
    support_type: 'financial',
    amount: 1000,
    sponsor_type: 'individual',
    display_name: '',
    brand_name: '',
    brand_website: '',
    tax_id: '',
    email: '',
    phone: '',
    message: '',
    anonymous: false,
    tax_receipt: false,
    volunteer_skills: '',
    resource_description: ''
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pool funding states
  const [usePoolFunds, setUsePoolFunds] = useState(false)
  const [poolBalance, setPoolBalance] = useState<number>(0)
  const [loadingPool, setLoadingPool] = useState(false)
  
  // Platform fee coverage
  const [coverPlatformFee, setCoverPlatformFee] = useState(true) // Default to checked for psychology

  const supabase = createClientAuth()
  const isAdmin = userRole === 'admin' || userRole === 'moderator'
  
  // Fetch pool balance if user is admin
  useEffect(() => {
    if (isAdmin && communityId) {
      fetchPoolBalance()
    }
  }, [isAdmin, communityId])
  
  const fetchPoolBalance = async () => {
    if (!communityId) return
    
    setLoadingPool(true)
    try {
      const response = await fetch(`/api/treasury/stats?communityId=${communityId}`)
      if (response.ok) {
        const responseData = await response.json()
        // ✅ PHASE 4: Handle standardized API response format
        const data = responseData.success !== undefined ? responseData.data : responseData
        setPoolBalance(data?.balance || 0)
      }
    } catch (error) {
      console.error('Error fetching pool balance:', error)
    } finally {
      setLoadingPool(false)
    }
  }

  // Predefined amounts in MXN
  const suggestedAmounts = [500, 1000, 2500, 5000, 10000]

  // Sponsor tier based on amount
  const getSponsorTier = (amount: number): { name: string; color: string; benefits: string[] } => {
    if (amount >= 5000) {
      return {
        name: 'Gold Sponsor',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
        benefits: [
          'Prominent logo placement',
          'Link to your website',
          'Featured in impact reports',
          'Social media recognition',
          'Tax deductible receipt (Mexican businesses)'
        ]
      }
    } else if (amount >= 1000) {
      return {
        name: 'Silver Sponsor',
        color: 'text-slate-600 bg-slate-50 border-slate-200',
        benefits: [
          'Logo display',
          'Listed on sponsor page',
          'Monthly impact updates',
          'Tax deductible receipt (Mexican businesses)'
        ]
      }
    } else {
      return {
        name: 'Bronze Sponsor',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        benefits: [
          'Name recognition',
          'Thank you mention',
          'Impact updates'
        ]
      }
    }
  }

  const tier = getSponsorTier(formData.amount)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be less than 2MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    // Preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setFormData({ ...formData, brand_logo: file })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // ✅ VALIDATION: Minimum sponsorship amount (100 pesos)
      if (formData.support_type === 'financial' && formData.amount < 100) {
        setError('El monto mínimo de patrocinio es 100 pesos MXN')
        setLoading(false)
        return
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to sponsor')
      }

      // Upload logo if business sponsor
      let logoUrl = formData.brand_logo_url
      if (formData.sponsor_type === 'business' && formData.brand_logo) {
        setUploadingLogo(true)
        const uploadResult = await uploadSponsorLogo(formData.brand_logo, user.id)
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload logo')
        }
        logoUrl = uploadResult.url
        setUploadingLogo(false)
      }

      // Create sponsorship record
      const sponsorshipData: any = {
        content_id: contentId,
        sponsor_id: user.id,
        amount: formData.support_type === 'financial' ? formData.amount : 0, // 0 for non-financial support
        status: 'approved', // Changed from 'pending' to 'approved' for direct support
        sponsor_type: formData.sponsor_type,
        support_type: formData.support_type, // NEW: Track support type
        display_name: formData.sponsor_type === 'individual' 
          ? formData.display_name 
          : formData.brand_name,
        sponsor_email: formData.email,
        sponsor_phone: formData.phone,
        message: formData.message,
        // Business fields (for financial support)
        ...(formData.sponsor_type === 'business' && formData.support_type === 'financial' && {
          brand_name: formData.brand_name,
          brand_logo_url: logoUrl,
          brand_website: formData.brand_website,
          tax_id: formData.tax_id
        }),
        // Volunteer/Resources fields
        ...(formData.support_type === 'volunteer' && {
          volunteer_skills: formData.volunteer_skills
        }),
        ...(formData.support_type === 'resources' && {
          resource_description: formData.resource_description
        })
      }

      const { data: sponsorship, error: sponsorError } = await supabase
        .from('sponsorships')
        .insert(sponsorshipData)
        .select()
        .single()

      if (sponsorError) throw sponsorError
      if (!sponsorship) throw new Error('Failed to create sponsorship')

      // ✅ GAMIFICATION: Award XP for non-financial sponsorships immediately
      // (Financial sponsorships get XP via webhook after payment)
      if (formData.support_type !== 'financial' && (sponsorship as any)?.id) {
        try {
          const xpResponse = await fetch('/api/gamification/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action_type: 'sponsor_need',
              action_id: (sponsorship as any).id,
              description: `Sponsored: ${contentTitle} (${formData.support_type})`
            })
          })
          
          if (xpResponse.ok) {
            const xpData = await xpResponse.json()
            console.log('✅ XP awarded for non-financial sponsorship:', xpData)
          }
        } catch (xpError) {
          // Log but don't fail sponsorship creation
          console.error('⚠️ Error awarding XP for non-financial sponsorship (non-fatal):', xpError)
        }
      }

      // Send confirmation email
      try {
        await fetch('/api/support/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            supportType: formData.support_type,
            contentTitle,
            communityName,
            displayName: formData.display_name || formData.brand_name,
            amount: formData.support_type === 'financial' ? formData.amount : undefined,
            skills: formData.volunteer_skills,
            resources: formData.resource_description
          })
        })
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Don't fail the whole process if email fails
      }

      // For financial support, either use pool funds or redirect to Stripe checkout
      if (formData.support_type === 'financial') {
        if (usePoolFunds && communityId) {
          // Use community pool funds
          const poolResponse = await fetch('/api/treasury/spend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              communityId,
              contentId,
              amount: formData.amount,
              sponsorshipId: (sponsorship as any).id,
              description: `Community pool sponsorship for ${contentTitle}`
            })
          })
          
          if (!poolResponse.ok) {
            const poolError = await poolResponse.json()
            throw new Error(poolError.error || 'Failed to use pool funds')
          }
          
          // Success! Show success message and redirect
          if (onSuccess) {
            onSuccess()
          } else {
            if (communityId) {
              window.location.href = `/communities/${communityId}/content/${contentId}?pool_sponsor_success=true`
            } else {
              window.location.href = '/dashboard'
            }
          }
        } else {
          // Normal Stripe checkout
          const response = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sponsorshipId: (sponsorship as any).id,
              amount: formData.amount,
              contentTitle,
              communityName,
              communityId, // ✅ FIX: Include communityId for Stripe checkout
              sponsorType: formData.sponsor_type,
              brandName: formData.brand_name,
              email: formData.email,
              taxReceipt: formData.tax_receipt,
              coverPlatformFee // NEW: Pass fee coverage preference
            })
          })

          const responseData = await response.json()
          
          if (!response.ok) {
            // ✅ PHASE 4: Extract error from standardized format
            const errorMessage = responseData.error?.message || responseData.error || 'Failed to create checkout session'
            throw new Error(errorMessage)
          }
          
          // ✅ PHASE 4: Handle standardized API response format
          const data = responseData.success !== undefined ? responseData.data : responseData
          const url = data?.url
          
          if (!url) {
            throw new Error('No checkout URL returned')
          }
          
          // Redirect to Stripe
          window.location.href = url
        }
      } else {
        // For volunteer/resources, show success and call onSuccess
        if (onSuccess) {
          onSuccess()
        } else {
          // Redirect to content page or dashboard if community ID not available
          if (communityId) {
            window.location.href = `/communities/${communityId}/content/${contentId}`
          } else {
            window.location.href = '/dashboard'
          }
        }
      }

    } catch (err: any) {
      console.error('Sponsorship error:', err)
      setError(err.message || 'Failed to create sponsorship')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Sponsor This Need</h2>
          <p className="text-teal-100">{contentTitle}</p>
          <p className="text-sm text-teal-200 mt-2">
            Community: {communityName}
          </p>
          
          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>${currentFunding.toLocaleString()} MXN raised</span>
              <span>${fundingGoal.toLocaleString()} MXN goal</span>
            </div>
            <div className="w-full bg-teal-800 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all"
                style={{ width: `${Math.min((currentFunding / fundingGoal) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Support Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              How would you like to support this need? *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, support_type: 'financial' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.support_type === 'financial'
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">💰</div>
                  <div>
                    <div className="font-semibold text-slate-900">Financial Support</div>
                    <div className="text-sm text-slate-600">Make a monetary contribution</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, support_type: 'volunteer' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.support_type === 'volunteer'
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">🙋</div>
                  <div>
                    <div className="font-semibold text-slate-900">Volunteer Time</div>
                    <div className="text-sm text-slate-600">Offer your skills & time</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, support_type: 'resources' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.support_type === 'resources'
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-3xl">📦</div>
                  <div>
                    <div className="font-semibold text-slate-900">Provide Resources</div>
                    <div className="text-sm text-slate-600">Donate materials or equipment</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Amount Selection - Only for Financial Support */}
          {formData.support_type === 'financial' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Sponsorship Amount (MXN)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                  {suggestedAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setFormData({ ...formData, amount })}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.amount === amount
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      ${amount.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  min="100"
                  step="100"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Custom amount"
                />
              </div>

              {/* Pool Funding Option - Only for Admins with sufficient balance */}
              {isAdmin && communityId && !loadingPool && (
                <div className={`p-4 rounded-lg border-2 ${
                  poolBalance >= formData.amount 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-amber-300 bg-amber-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="usePoolFunds"
                      checked={usePoolFunds}
                      onChange={(e) => setUsePoolFunds(e.target.checked)}
                      disabled={poolBalance < formData.amount}
                      className="mt-1 w-5 h-5 text-green-600 border-green-300 rounded focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex-1">
                      <label 
                        htmlFor="usePoolFunds" 
                        className={`font-semibold flex items-center gap-2 ${
                          poolBalance >= formData.amount 
                            ? 'text-green-900' 
                            : 'text-amber-900'
                        }`}
                      >
                        <span>💰</span>
                        <span>Use Community Wallet Funds</span>
                      </label>
                      <p className={`text-sm mt-1 ${
                        poolBalance >= formData.amount 
                          ? 'text-green-700' 
                          : 'text-amber-700'
                      }`}>
                        Available balance: <strong>${poolBalance.toLocaleString()} MXN</strong>
                      </p>
                      {poolBalance >= formData.amount ? (
                        <p className="text-xs text-green-600 mt-2">
                          ✅ Sufficient funds available. This sponsorship will be paid from the community wallet - no personal payment required!
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-2">
                          ⚠️ Insufficient wallet balance. Need ${(formData.amount - poolBalance).toLocaleString()} MXN more. Members can donate to the wallet first.
                        </p>
                      )}
                      {usePoolFunds && (
                        <p className="text-xs text-slate-600 mt-2 italic">
                          Note: The community will be credited for this sponsorship. All members will be able to see this in the wallet transactions.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Breakdown & Platform Fee Coverage */}
              {!usePoolFunds && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-6 rounded-xl border-2 border-slate-200 space-y-4">
                  <h3 className="font-semibold text-slate-900 text-lg">💳 Payment Breakdown</h3>
                  
                  {/* Amounts */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-700">Sponsorship amount:</span>
                      <span className="font-semibold text-slate-900">${formData.amount.toLocaleString()} MXN</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                      <span className="text-slate-700">Platform operations (15%):</span>
                      <span className="font-semibold text-slate-900">${Math.round(formData.amount * 0.15).toLocaleString()} MXN</span>
                    </div>
                  </div>

                  {/* Cover Platform Fee Checkbox */}
                  <div className="bg-white p-4 rounded-lg border-2 border-teal-300 hover:border-teal-400 transition-colors">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="coverPlatformFee"
                        checked={coverPlatformFee}
                        onChange={(e) => setCoverPlatformFee(e.target.checked)}
                        className="mt-1 w-5 h-5 text-teal-600 border-teal-300 rounded focus:ring-teal-500"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor="coverPlatformFee" 
                          className="font-semibold text-teal-900 cursor-pointer flex items-center gap-2"
                        >
                          <span>✓</span>
                          <span>Cover platform fee so 100% goes to the community</span>
                        </label>
                        <p className="text-xs text-teal-700 mt-1">
                          Help us keep the platform running while ensuring creators receive the full sponsorship amount
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="pt-4 border-t-2 border-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-slate-900">Your total:</span>
                      <span className="text-2xl font-bold text-teal-600">
                        ${(coverPlatformFee ? Math.round(formData.amount * 1.15) : formData.amount).toLocaleString()} MXN
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                      {coverPlatformFee ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-600">💚</span>
                          <span>Community receives <strong className="text-green-700">${formData.amount.toLocaleString()} MXN</strong> (100% of sponsorship)</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>💙</span>
                          <span>Community receives <strong className="text-slate-700">${Math.round(formData.amount * 0.85).toLocaleString()} MXN</strong> (85% of sponsorship)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sponsor Tier Display */}
              <div className={`p-4 rounded-lg border-2 ${tier.color}`}>
                <h3 className="font-semibold mb-2">{tier.name}</h3>
                <ul className="text-sm space-y-1">
                  {tier.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-teal-600">✓</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Volunteer Skills - Only for Volunteer Support */}
          {formData.support_type === 'volunteer' && (
            <div className="bg-teal-50 p-6 rounded-lg border-2 border-teal-200">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">🙋</span>
                Volunteer Information
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What skills or time can you offer? *
                </label>
                <textarea
                  value={formData.volunteer_skills}
                  onChange={(e) => setFormData({ ...formData, volunteer_skills: e.target.value })}
                  rows={4}
                  required={formData.support_type === 'volunteer'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Describe your skills, availability, and how you'd like to help..."
                />
                <p className="text-xs text-slate-600 mt-2">
                  Example: "I'm a carpenter available weekends" or "I can help with event planning, 5 hours/week"
                </p>
              </div>
            </div>
          )}

          {/* Resources Description - Only for Resources Support */}
          {formData.support_type === 'resources' && (
            <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">📦</span>
                Resource Information
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What resources can you provide? *
                </label>
                <textarea
                  value={formData.resource_description}
                  onChange={(e) => setFormData({ ...formData, resource_description: e.target.value })}
                  rows={4}
                  required={formData.support_type === 'resources'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Describe the materials, equipment, or resources you can donate..."
                />
                <p className="text-xs text-slate-600 mt-2">
                  Example: "10 bags of cement" or "Van for transportation" or "20 shovels and tools"
                </p>
              </div>
            </div>
          )}

          {/* Sponsor Type Selection - Only for Financial Support */}
          {formData.support_type === 'financial' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Sponsor As
              </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sponsor_type: 'individual' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.sponsor_type === 'individual'
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">👤</div>
                  <div>
                    <div className="font-semibold">Individual</div>
                    <div className="text-sm text-slate-600">Personal sponsorship</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, sponsor_type: 'business' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.sponsor_type === 'business'
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🏢</div>
                  <div>
                    <div className="font-semibold">Business</div>
                    <div className="text-sm text-slate-600">Company sponsorship</div>
                  </div>
                </div>
              </button>
            </div>
            </div>

            {/* Individual Fields */}
            {formData.sponsor_type === 'individual' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="How should we recognize you?"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Leave blank to use your profile name
                  </p>
                </div>
              </div>
            )}

            {/* Business Fields */}
            {formData.sponsor_type === 'business' && (
              <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900">Business Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="Your Company Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Logo {formData.amount >= 1000 && <span className="text-teal-600">(Recommended for Silver+)</span>}
                  </label>
                  <div className="flex items-start gap-4">
                    {logoPreview && (
                      <img 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className="w-24 h-24 object-contain border-2 border-slate-200 rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        PNG, JPG or SVG. Max 2MB. Square format recommended.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.brand_website}
                    onChange={(e) => setFormData({ ...formData, brand_website: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    RFC / Tax ID (For CFDI Invoice)
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="XAXX010101000"
                    maxLength={13}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Required for tax deductible receipt (Mexican businesses)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="tax_receipt"
                    checked={formData.tax_receipt}
                    onChange={(e) => setFormData({ ...formData, tax_receipt: e.target.checked })}
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                  />
                  <label htmlFor="tax_receipt" className="text-sm text-slate-700">
                    I need a tax deductible receipt (CFDI)
                  </label>
                </div>
              </div>
            )}
          </>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900">Contact Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                placeholder="+52 55 1234 5678"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message to Community (Optional)
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              placeholder="Share why you're supporting this cause..."
            />
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="anonymous"
              checked={formData.anonymous}
              onChange={(e) => setFormData({ ...formData, anonymous: e.target.checked })}
              className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="anonymous" className="text-sm text-slate-700">
              Make this sponsorship anonymous
            </label>
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3">Preview: How You'll Appear</h3>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              {formData.sponsor_type === 'business' && logoPreview && formData.amount >= 1000 ? (
                <div className="flex items-center gap-3">
                  <img src={logoPreview} alt="Logo" className="w-12 h-12 object-contain" />
                  <div>
                    <div className="font-semibold text-slate-900">{formData.brand_name || 'Your Company'}</div>
                    <div className="text-sm text-slate-600">{tier.name}</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-slate-900">
                    {formData.anonymous 
                      ? 'Anonymous Sponsor' 
                      : formData.sponsor_type === 'business'
                        ? formData.brand_name || 'Your Company'
                        : formData.display_name || 'Your Name'}
                  </div>
                  <div className="text-sm text-slate-600">{tier.name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingLogo || (formData.sponsor_type === 'business' && formData.support_type === 'financial' && !formData.brand_name)}
              className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {uploadingLogo 
                ? 'Uploading Logo...' 
                : loading 
                  ? 'Processing...' 
                  : formData.support_type === 'financial'
                    ? `Sponsor $${formData.amount.toLocaleString()} MXN`
                    : formData.support_type === 'volunteer'
                      ? 'Offer to Volunteer'
                      : 'Offer Resources'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
