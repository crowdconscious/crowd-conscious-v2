'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import MediaUpload from '../../../../../components/MediaUpload'
import { AnimatedButton, SuccessAnimation } from '@/components/ui/UIComponents'

// Simple UI components since we don't have a full design system yet
const Button = ({ children, onClick, disabled, type = "button", className = "" }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
  className?: string
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      disabled 
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
        : 'bg-teal-600 hover:bg-teal-700 text-white'
    } ${className}`}
  >
    {children}
  </button>
)

const Input = ({ value, onChange, placeholder, type = "text", required = false, className = "" }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: string
  required?: boolean
  className?: string
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none ${className}`}
  />
)

const Textarea = ({ value, onChange, placeholder, rows = 3, className = "" }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  className?: string
}) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    rows={rows}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none ${className}`}
  />
)

const Select = ({ value, onChange, children, className = "" }: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
  className?: string
}) => (
  <select
    value={value}
    onChange={onChange}
    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none ${className}`}
  >
    {children}
  </select>
)

const Label = ({ children, className = "" }: {
  children: React.ReactNode
  className?: string
}) => (
  <label className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
)

interface Community {
  id: string
  name: string
  description: string | null
}

interface ContentCreationFormProps {
  community: Community
  userId: string
}

type ContentType = 'need' | 'event' | 'poll' | 'challenge'

export default function ContentCreationForm({ community, userId }: ContentCreationFormProps) {
  const router = useRouter()
  const [contentType, setContentType] = useState<ContentType>('need')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('')
  const [showSuccess, setShowSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    funding_goal: '',
    max_participants: '',
    location: '',
    event_date: '',
    event_time: '',
    completion_deadline: '',
    poll_options: ['', ''],
    impact_expected: '',
    activities: ['']
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.poll_options]
    newOptions[index] = value
    setFormData(prev => ({ ...prev, poll_options: newOptions }))
  }

  const addPollOption = () => {
    setFormData(prev => ({ 
      ...prev, 
      poll_options: [...prev.poll_options, ''] 
    }))
  }

  const removePollOption = (index: number) => {
    if (formData.poll_options.length > 2) {
      const newOptions = formData.poll_options.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, poll_options: newOptions }))
    }
  }

  const handleActivityChange = (index: number, value: string) => {
    const newActivities = [...formData.activities]
    newActivities[index] = value
    setFormData(prev => ({ ...prev, activities: newActivities }))
  }

  const addActivity = () => {
    setFormData(prev => ({ 
      ...prev, 
      activities: [...prev.activities, ''] 
    }))
  }

  const removeActivity = (index: number) => {
    if (formData.activities.length > 1) {
      const newActivities = formData.activities.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, activities: newActivities }))
    }
  }

  const handleImageUpload = (url: string) => {
    console.log('Content image uploaded:', url)
    setUploadedImageUrl(url)
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
    alert(`Upload failed: ${error}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Prepare type-specific data
      let typeSpecificData: any = {}
      
      if (contentType === 'need') {
        typeSpecificData = {
          impact_expected: formData.impact_expected,
          activities: formData.activities.filter(a => a.trim() !== '')
        }
      } else if (contentType === 'event') {
        typeSpecificData = {
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          location: formData.location,
          event_date: formData.event_date,
          event_time: formData.event_time
        }
      } else if (contentType === 'poll') {
        typeSpecificData = {
          poll_options: formData.poll_options.filter(option => option.trim() !== '')
        }
      }

      // Create content
          const { data, error } = await supabaseClient
        .from('community_content')
        .insert({
          community_id: community.id,
          type: contentType,
          title: formData.title,
          description: formData.description || null,
          image_url: uploadedImageUrl || null,
          data: typeSpecificData,
          status: 'voting', // Content starts in voting phase
          created_by: userId,
          funding_goal: contentType === 'need' && formData.funding_goal ? parseFloat(formData.funding_goal) : null,
          completion_deadline: contentType === 'need' && formData.completion_deadline ? formData.completion_deadline : null,
          max_participants: contentType === 'event' && formData.max_participants ? parseInt(formData.max_participants) : null,
          location: contentType === 'event' ? formData.location : null,
          event_date: contentType === 'event' ? formData.event_date : null,
          event_time: contentType === 'event' ? formData.event_time : null
        } as any) // Type assertion to bypass TypeScript issues
        .select()
        .single()

      if (error) {
        throw error
      }

      // If it's a poll, create poll options
      if (contentType === 'poll' && data) {
        const pollOptions = formData.poll_options
          .filter(option => option.trim() !== '')
          .map((option, index) => ({
            content_id: (data as any).id,
            option_text: option.trim(),
            vote_count: 0,
            order_index: index
          }))

            const { error: optionsError } = await supabaseClient
          .from('poll_options')
          .insert(pollOptions as any)

        if (optionsError) {
          console.error('Error creating poll options:', optionsError)
        }
      }

      // If it's a need with activities, create activities
      if (contentType === 'need' && data && formData.activities.some(a => a.trim() !== '')) {
        const activities = formData.activities
          .filter(activity => activity.trim() !== '')
          .map((activity, index) => ({
            content_id: (data as any).id,
            title: activity.trim(),
            description: null,
            is_completed: false,
            order_index: index
          }))

            const { error: activitiesError } = await supabaseClient
          .from('need_activities')
          .insert(activities as any)

        if (activitiesError) {
          console.error('Error creating activities:', activitiesError)
        }
      }

      // Show success animation then redirect
      setShowSuccess(true)
      setTimeout(() => {
        router.push(`/communities/${community.id}`)
      }, 2000)
    } catch (error) {
      console.error('Error creating content:', error)
      console.error('Full error details:', JSON.stringify(error, null, 2))
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Failed to create content: ${errorMessage}\n\nCheck console for details.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <SuccessAnimation 
        show={showSuccess}
        onComplete={() => setShowSuccess(false)}
      />
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Content Type *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { type: 'need', icon: '💡', label: 'Community Need' },
              { type: 'event', icon: '📅', label: 'Event' },
              { type: 'poll', icon: '🗳️', label: 'Poll' },
              { type: 'challenge', icon: '🏆', label: 'Challenge' }
            ].map(({ type, icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => setContentType(type as ContentType)}
                className={`p-4 rounded-lg border-2 transition-all text-center ${
                  contentType === type
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-sm font-medium">{label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              placeholder={`Enter ${contentType} title`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
              placeholder={`Describe your ${contentType} in detail...`}
            />
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <MediaUpload
            bucket="content-media"
            path={`${contentType}s/${community.id}`}
            onUploadComplete={handleImageUpload}
            onUploadError={handleUploadError}
            currentImageUrl={uploadedImageUrl || undefined}
            aspectRatio="video"
            label="Content Image (Optional)"
            description={`Upload an image to make your ${contentType} more engaging`}
            className="max-w-md"
          />
        </div>

        {/* Type-specific fields */}
        {contentType === 'need' && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-medium text-slate-900">Need Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Funding Goal ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.funding_goal}
                  onChange={(e) => handleInputChange('funding_goal', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  placeholder="5000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Completion Deadline
                </label>
                <input
                  type="date"
                  value={formData.completion_deadline}
                  onChange={(e) => handleInputChange('completion_deadline', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expected Impact
              </label>
              <textarea
                rows={3}
                value={formData.impact_expected}
                onChange={(e) => handleInputChange('impact_expected', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                placeholder="Describe the expected impact of this need..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trackable Activities
              </label>
              {formData.activities.map((activity, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={activity}
                    onChange={(e) => handleActivityChange(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    placeholder={`Activity ${index + 1}`}
                  />
                  {formData.activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addActivity}
                className="text-teal-600 hover:text-teal-700 text-sm font-medium"
              >
                + Add Activity
              </button>
            </div>
          </div>
        )}

        {contentType === 'event' && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-medium text-slate-900">Event Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Max Participants
                </label>
                <input
                  type="number"
                  value={formData.max_participants}
                  onChange={(e) => handleInputChange('max_participants', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  placeholder="50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Event Date
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Event Time
                </label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => handleInputChange('event_time', e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="Event location or address"
              />
            </div>
          </div>
        )}

        {contentType === 'poll' && (
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-lg font-medium text-slate-900">Poll Options</h3>
            
            {formData.poll_options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handlePollOptionChange(index, e.target.value)}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  placeholder={`Option ${index + 1}`}
                  required
                />
                {formData.poll_options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePollOption(index)}
                    className="px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addPollOption}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium"
            >
              + Add Option
            </button>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={isSubmitting || !formData.title.trim()}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </div>
            ) : (
              `Create ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}`
            )}
          </button>
        </div>
      </form>
      </div>
    </>
  )
}
