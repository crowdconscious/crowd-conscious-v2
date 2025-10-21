'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'

interface PublicNeedSupportProps {
  contentId: string
  fundingGoal: number | null
  currentFunding: number
}

export default function PublicNeedSupport({ 
  contentId, 
  fundingGoal, 
  currentFunding 
}: PublicNeedSupportProps) {
  const [supportType, setSupportType] = useState<'financial' | 'volunteer' | 'resources'>('volunteer')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !email || !description) {
      setMessage('Please fill in all required fields')
      return
    }

    if (supportType === 'financial' && (!amount || parseFloat(amount) <= 0)) {
      setMessage('Please enter a valid financial contribution amount')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      // Create support offer record
      const { error } = await supabase
        .from('external_responses')
        .insert({
          content_id: contentId,
          response_type: 'need_support',
          response_data: {
            support_type: supportType,
            amount: supportType === 'financial' ? parseFloat(amount) : null,
            description: description
          },
          respondent_email: email,
          respondent_name: name,
          respondent_phone: phone
        })

      if (error) {
        console.error('Error submitting support offer:', error)
        setMessage('Failed to submit your support offer. Please try again.')
        return
      }

      // Send confirmation email
      try {
        await fetch('/api/external-response/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            responseType: 'need_support',
            contentTitle: title,
            contentType: 'need',
            supportType: supportType
          })
        })
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError)
        // Don't fail the submission if email fails
      }

      setSubmitted(true)
      setMessage('Thank you for your support offer! The community organizers will contact you soon. Check your email for confirmation.')
    } catch (error) {
      console.error('Support submission error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <span className="text-4xl mb-4 block">🤝</span>
          <h3 className="text-lg font-semibold text-green-800 mb-2">Support Offer Submitted!</h3>
          <p className="text-green-700 mb-4">{message}</p>
          
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <h4 className="font-medium text-slate-700 mb-3">Your Support Offer:</h4>
            <div className="space-y-2 text-sm text-slate-600 text-left">
              <div><strong>Type:</strong> {supportType}</div>
              {supportType === 'financial' && amount && (
                <div><strong>Amount:</strong> ${amount}</div>
              )}
              <div><strong>Description:</strong> {description}</div>
            </div>
          </div>
          
          <p className="text-sm text-green-600 mt-4">
            A community organizer will reach out to you within 48 hours to coordinate your contribution.
          </p>
        </div>
      </div>
    )
  }

  const progressPercentage = fundingGoal ? (currentFunding / fundingGoal) * 100 : 0

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <span>🆘</span>
        Support this Need
      </h3>
      
      {/* Funding Progress */}
      {fundingGoal && (
        <div className="bg-white rounded-lg p-4 mb-6 border border-slate-200">
          <h4 className="font-medium text-slate-700 mb-3">Funding Progress:</h4>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-2xl font-bold text-teal-700">
              ${currentFunding.toLocaleString()} / ${fundingGoal.toLocaleString()}
            </span>
            <span className="text-sm text-slate-600">
              ({progressPercentage.toFixed(1)}% funded)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-teal-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            ></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Support Type */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            How would you like to support this need? *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="flex items-center space-x-3 cursor-pointer p-3 border border-slate-300 rounded-lg hover:bg-slate-50">
              <input
                type="radio"
                name="supportType"
                value="volunteer"
                checked={supportType === 'volunteer'}
                onChange={(e) => setSupportType(e.target.value as any)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
              />
              <div>
                <div className="font-medium text-slate-700">🙋 Volunteer Time</div>
                <div className="text-xs text-slate-500">Offer your skills & time</div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer p-3 border border-slate-300 rounded-lg hover:bg-slate-50">
              <input
                type="radio"
                name="supportType"
                value="resources"
                checked={supportType === 'resources'}
                onChange={(e) => setSupportType(e.target.value as any)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
              />
              <div>
                <div className="font-medium text-slate-700">📦 Provide Resources</div>
                <div className="text-xs text-slate-500">Donate materials or equipment</div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer p-3 border border-slate-300 rounded-lg hover:bg-slate-50">
              <input
                type="radio"
                name="supportType"
                value="financial"
                checked={supportType === 'financial'}
                onChange={(e) => setSupportType(e.target.value as any)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300"
              />
              <div>
                <div className="font-medium text-slate-700">💰 Financial Support</div>
                <div className="text-xs text-slate-500">Make a monetary contribution</div>
              </div>
            </label>
          </div>
        </div>

        {/* Financial Amount */}
        {supportType === 'financial' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Contribution Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                required={supportType === 'financial'}
              />
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Details of Your Support *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              supportType === 'volunteer' 
                ? "Describe your skills, availability, and how you'd like to help..."
                : supportType === 'resources'
                ? "Describe what resources you can provide..."
                : "Any additional details about your financial contribution..."
            }
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
            required
          />
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('Thank you') 
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name || !email || !description}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Submitting Support Offer...' : 'Offer Support'}
        </button>
      </form>

      <div className="mt-4 text-xs text-slate-500">
        Your information will only be used to coordinate your support and provide community updates if you choose to join.
        {supportType === 'financial' && (
          <span className="block mt-1 font-medium">
            Note: This is an offer to contribute. Actual payment will be processed through secure channels after coordination with organizers.
          </span>
        )}
      </div>
    </div>
  )
}
