'use client'

import { useState } from 'react'

interface Community {
  id: string
  name: string
  description: string | null
  core_values: string[]
  address: string | null
}

interface CommunityBasicSettingsProps {
  community: Community
}

export default function CommunityBasicSettings({ community }: CommunityBasicSettingsProps) {
  const [formData, setFormData] = useState({
    name: community.name,
    description: community.description || '',
    address: community.address || ''
  })
  const [coreValues, setCoreValues] = useState(community.core_values)
  const [newValue, setNewValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddCoreValue = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newValue.trim()) {
      e.preventDefault()
      if (coreValues.length < 10 && !coreValues.includes(newValue.trim())) {
        setCoreValues(prev => [...prev, newValue.trim()])
        setNewValue('')
      }
    }
  }

  const removeCoreValue = (index: number) => {
    setCoreValues(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    if (coreValues.length < 3) {
      setMessage('Please add at least 3 core values')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/communities/${community.id}/basic-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          address: formData.address.trim(),
          core_values: coreValues
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update community')
      }

      setMessage('✅ Community updated successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage('')
      }, 3000)

    } catch (error) {
      console.error('Error updating community:', error)
      setMessage('❌ Failed to update community. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Basic Information</h2>
        
        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Community Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                placeholder="Describe what your community is about..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Address/Location
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="e.g., Downtown Portland, OR"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Core Values ({coreValues.length}/10)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {coreValues.map((value, index) => (
                  <span 
                    key={index}
                    className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => removeCoreValue(index)}
                      className="text-teal-600 hover:text-teal-800 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={handleAddCoreValue}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="Add a new core value and press Enter"
              />
              <p className="text-xs text-slate-500 mt-1">
                Minimum 3 values required. Click × to remove values.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button 
              type="submit"
              disabled={isLoading}
              className="bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isLoading ? 'Saving...' : 'Save Basic Info'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
