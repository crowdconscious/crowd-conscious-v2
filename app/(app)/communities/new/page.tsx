'use client'

import { useState } from 'react'
import { createClientAuth } from '../../../../lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import LocationAutocomplete from '@/components/LocationAutocomplete'
import DashboardNavigation from '@/components/DashboardNavigation'
import CoreValuesSelector from '@/components/CoreValuesSelector'

export default function CreateCommunityPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    coreValues: [] as string[]  // Changed to empty array for dropdown
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const router = useRouter()
  const supabase = createClientAuth()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validation
    if (!formData.name.trim() || !formData.description.trim() || !formData.address.trim()) {
      setMessage('Please fill in all required fields')
      setLoading(false)
      return
    }

    // Core values are already IDs from the selector
    if (formData.coreValues.length < 3) {
      setMessage('Please select at least 3 core values')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setMessage('You must be logged in to create a community')
        setLoading(false)
        return
      }

      const slug = generateSlug(formData.name)
      
      // Create the community via API
      const response = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: slug,
          description: formData.description.trim(),
          address: formData.address.trim(),
          core_values: formData.coreValues // Already array of IDs
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Community creation error:', result.error)
        setMessage(result.error || 'Error creating community. Please try again.')
      } else {
        setMessage('Community created successfully!')
        setTimeout(() => {
          router.push(`/communities/${result.data.id}`)
        }, 1000)
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
      console.error('Community creation exception:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <DashboardNavigation />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Your Community</h1>
        <p className="text-slate-600">
          Start a local initiative to create measurable environmental and social impact.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
        {/* Community Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
            Community Name *
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="e.g., EcoWarriors NYC, Green Austin"
          />
          {formData.name && (
            <p className="text-sm text-slate-500 mt-1">
              URL: /communities/{generateSlug(formData.name)}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="Describe your community's mission and goals..."
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
            Location *
          </label>
          <LocationAutocomplete
            value={formData.address}
            onChange={(location, coordinates) => {
              setFormData({ ...formData, address: location })
              // You can also store coordinates if needed
            }}
            placeholder="e.g., Brooklyn, NY or Austin, TX"
          />
        </div>

        {/* Core Values */}
        <CoreValuesSelector
          selected={formData.coreValues}
          onChange={(values) => setFormData({ ...formData, coreValues: values })}
          minRequired={3}
        />

        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('Error') || message.includes('Please') 
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Creating Community...' : 'Create Community'}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors text-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
