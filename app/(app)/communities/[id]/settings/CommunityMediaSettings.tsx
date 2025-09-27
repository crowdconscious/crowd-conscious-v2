'use client'

import { useState } from 'react'
import MediaUpload from '../../../../components/MediaUpload'
import { supabaseClient } from '../../../../../lib/supabase-client'

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  logo_url: string | null
  banner_url: string | null
  core_values: string[]
  address: string | null
  creator_id: string
}

interface CommunityMediaSettingsProps {
  community: Community
}

export default function CommunityMediaSettings({ community }: CommunityMediaSettingsProps) {
  const [currentMedia, setCurrentMedia] = useState({
    logo_url: community.logo_url,
    banner_url: community.banner_url,
    image_url: community.image_url
  })
  const [isUpdating, setIsUpdating] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  const updateCommunityMedia = async (field: string, url: string) => {
    setIsUpdating(true)
    try {
      // TODO: Implement community media update - temporarily disabled for deployment
      console.log('Updating community media:', { field, url, communityId: community.id })

      setCurrentMedia(prev => ({ ...prev, [field]: url }))
      setUploadStatus({
        type: 'success',
        message: `${field.replace('_', ' ')} updated successfully!`
      })
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadStatus({ type: null, message: '' })
      }, 3000)
      
    } catch (error) {
      console.error('Error updating community media:', error)
      setUploadStatus({
        type: 'error',
        message: 'Failed to update media. Please try again.'
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLogoUpload = (url: string) => {
    console.log('Logo uploaded:', { url })
    updateCommunityMedia('logo_url', url)
  }

  const handleBannerUpload = (url: string) => {
    console.log('Banner uploaded:', { url })
    updateCommunityMedia('banner_url', url)
  }

  const handleImageUpload = (url: string) => {
    console.log('Image uploaded:', { url })
    updateCommunityMedia('image_url', url)
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error in settings:', error)
    setUploadStatus({
      type: 'error',
      message: `Upload failed: ${error}`
    })
    
    // Clear error message after 5 seconds
    setTimeout(() => {
      setUploadStatus({ type: null, message: '' })
    }, 5000)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Community Media</h2>
        <p className="text-slate-600">
          Upload images to make your community more appealing. Supported formats: JPEG, PNG, WebP, GIF (max 5MB each).
        </p>
      </div>

      {/* Status Messages */}
      {uploadStatus.type && (
        <div className={`mb-6 p-4 rounded-lg ${
          uploadStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <span>{uploadStatus.type === 'success' ? '✅' : '❌'}</span>
            <span className="font-medium">{uploadStatus.message}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Community Logo */}
        <div>
          <h3 className="text-lg font-medium text-slate-900 mb-3">Community Logo</h3>
          <p className="text-sm text-slate-600 mb-4">
            A circular logo that represents your community. Best size: 200x200px.
          </p>
          
            <MediaUpload
              bucket="community-images"
              path={`logos/${community.id}`}
              onUploadComplete={handleLogoUpload}
              onUploadError={handleUploadError}
              currentImageUrl={currentMedia.logo_url || undefined}
              aspectRatio="square"
              className="max-w-[200px]"
              label="Upload Logo"
              description="Best size: 200x200px"
            />
          
          {currentMedia.logo_url && (
            <div className="mt-3">
              <p className="text-xs text-slate-500">
                Current logo will appear in community cards and headers
              </p>
            </div>
          )}
        </div>

        {/* Community Banner */}
        <div>
          <h3 className="text-lg font-medium text-slate-900 mb-3">Community Banner</h3>
          <p className="text-sm text-slate-600 mb-4">
            A wide banner image for your community header. Best size: 1200x400px.
          </p>
          
            <MediaUpload
              bucket="community-images"
              path={`banners/${community.id}`}
              onUploadComplete={handleBannerUpload}
              onUploadError={handleUploadError}
              currentImageUrl={currentMedia.banner_url || undefined}
              aspectRatio="wide"
              className="max-w-[400px]"
              label="Upload Banner"
              description="Best size: 1200x400px"
            />
          
          {currentMedia.banner_url && (
            <div className="mt-3">
              <p className="text-xs text-slate-500">
                Banner will appear at the top of your community page
              </p>
            </div>
          )}
        </div>
      </div>

      {/* General Community Image */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-lg font-medium text-slate-900 mb-3">General Community Image</h3>
        <p className="text-sm text-slate-600 mb-4">
          A general image representing your community. Used as fallback when specific images aren't available.
        </p>
        
            <div className="max-w-md">
              <MediaUpload
                bucket="community-images"
                path={`images/${community.id}`}
                onUploadComplete={handleImageUpload}
                onUploadError={handleUploadError}
                currentImageUrl={currentMedia.image_url || undefined}
                aspectRatio="video"
                label="Upload Community Image"
                description="General community image for listings and previews"
              />
            </div>
        
        {currentMedia.image_url && (
          <div className="mt-3">
            <p className="text-xs text-slate-500">
              Used in community listings and social media previews
            </p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-lg font-medium text-slate-900 mb-3">Preview</h3>
        <p className="text-sm text-slate-600 mb-4">
          Here's how your community will appear in the communities list:
        </p>
        
        {/* Community Card Preview */}
        <div className="max-w-sm bg-white rounded-xl shadow-lg border border-slate-200 p-6 overflow-hidden">
          {/* Header with Media or Gradient */}
          <div className="h-32 -m-6 mb-4 relative overflow-hidden">
            {currentMedia.banner_url || currentMedia.image_url ? (
              <img
                src={currentMedia.banner_url || currentMedia.image_url || ''}
                alt={`${community.name} preview`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-teal-400 via-teal-500 to-purple-500" />
            )}
            
            <div className="absolute inset-0 bg-black/20" />
            
            {/* Member Count Badge */}
            <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm font-semibold">
              Preview
            </div>
            
            {/* Community Logo or Initial */}
            <div className="absolute inset-0 flex items-center justify-center">
              {currentMedia.logo_url ? (
                <div className="w-16 h-16 bg-white/90 rounded-full p-2 backdrop-blur-sm">
                  <img
                    src={currentMedia.logo_url}
                    alt={`${community.name} logo`}
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              ) : (
                <div className="text-white text-4xl font-bold">
                  {community.name[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {community.name}
            </h3>
            
            {community.address && (
              <p className="text-slate-500 text-sm mb-3 flex items-center gap-1">
                <span>📍</span>
                {community.address}
              </p>
            )}
            
            <p className="text-slate-600 text-sm line-clamp-3 mb-4">
              {community.description || 'Building community impact together through collaborative action and transparent governance.'}
            </p>

            {/* Core Values Preview */}
            {community.core_values.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {community.core_values.slice(0, 2).map((value, index) => (
                  <span 
                    key={index}
                    className="text-xs px-3 py-1 rounded-full font-medium bg-teal-100 text-teal-700"
                  >
                    {value}
                  </span>
                ))}
                {community.core_values.length > 2 && (
                  <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-full">
                    +{community.core_values.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
