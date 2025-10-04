'use client'

import { useState } from 'react'
import { createClientAuth } from '@/lib/auth'
import { uploadSponsorLogo } from '@/lib/storage'

interface SponsorshipCheckoutProps {
  contentId: string
  contentTitle: string
  fundingGoal: number
  currentFunding: number
  communityName: string
  onSuccess?: () => void
  onCancel?: () => void
}

interface SponsorshipFormData {
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
}

export default function SponsorshipCheckout({
  contentId,
  contentTitle,
  fundingGoal,
  currentFunding,
  communityName,
  onSuccess,
  onCancel
}: SponsorshipCheckoutProps) {
  const [formData, setFormData] = useState<SponsorshipFormData>({
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
    tax_receipt: false
  })

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientAuth()

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
        amount: formData.amount,
        status: 'pending',
        sponsor_type: formData.sponsor_type,
        display_name: formData.sponsor_type === 'individual' 
          ? formData.display_name 
          : formData.brand_name,
        sponsor_email: formData.email,
        sponsor_phone: formData.phone,
        message: formData.message,
        // Business fields
        ...(formData.sponsor_type === 'business' && {
          brand_name: formData.brand_name,
          brand_logo_url: logoUrl,
          brand_website: formData.brand_website,
          tax_id: formData.tax_id
        })
      }

      const { data: sponsorship, error: sponsorError } = await supabase
        .from('sponsorships')
        .insert(sponsorshipData)
        .select()
        .single()

      if (sponsorError) throw sponsorError

      // Redirect to Stripe checkout
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorshipId: sponsorship.id,
          amount: formData.amount,
          contentTitle,
          communityName,
          sponsorType: formData.sponsor_type,
          brandName: formData.brand_name,
          email: formData.email,
          taxReceipt: formData.tax_receipt
        })
      })

      const { url, error: checkoutError } = await response.json()
      
      if (checkoutError) throw new Error(checkoutError)
      
      // Redirect to Stripe
      window.location.href = url

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
          {/* Amount Selection */}
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

          {/* Sponsor Type Selection */}
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
              disabled={loading || uploadingLogo || (formData.sponsor_type === 'business' && !formData.brand_name)}
              className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition-colors"
            >
              {uploadingLogo ? 'Uploading Logo...' : loading ? 'Processing...' : `Sponsor $${formData.amount.toLocaleString()} MXN`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
