'use client'

import { useState } from 'react'
import { supabaseClient } from '@/lib/supabase-client'
import { AnimatedButton } from './ui/UIComponents'

interface ProfilePictureUploadProps {
  userId: string
  currentImage: string | null
  userType: 'user' | 'brand'
  onUploadComplete: (url: string) => void
  className?: string
}

export default function ProfilePictureUpload({
  userId,
  currentImage,
  userType,
  onUploadComplete,
  className = ''
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const bucketName = userType === 'brand' ? 'brand-logos' : 'profile-pictures'
  const columnName = userType === 'brand' ? 'logo_url' : 'avatar_url'

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    
    if (userType === 'brand') {
      allowedTypes.push('image/svg+xml')
    }

    if (file.size > maxSize) {
      alert('File size must be less than 5MB')
      return
    }

    if (!allowedTypes.includes(file.type)) {
      alert(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from(bucketName)
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // Update user profile in database
      const columnName = userType === 'brand' ? 'logo_url' : 'avatar_url'
      const { error: updateError } = await (supabaseClient as any)
        .from('profiles')
        .update({ [columnName]: publicUrl })
        .eq('id', userId)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      // Delete old image if it exists
      if (currentImage && currentImage.includes(bucketName)) {
        try {
          const oldPath = currentImage.split(`/${bucketName}/`)[1]
          if (oldPath) {
            await supabaseClient.storage
              .from(bucketName)
              .remove([oldPath])
          }
        } catch (error) {
          console.log('Could not delete old image:', error)
        }
      }

      setUploadProgress(100)
      onUploadComplete(publicUrl)

      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      notification.textContent = `✅ ${userType === 'brand' ? 'Logo' : 'Profile picture'} updated successfully!`
      document.body.appendChild(notification)

      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 3000)

    } catch (error) {
      console.error('Upload error:', error)
      
      // Show error notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      notification.textContent = `❌ Failed to upload ${userType === 'brand' ? 'logo' : 'profile picture'}. Please try again.`
      document.body.appendChild(notification)

      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 3000)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveImage = async () => {
    if (!currentImage) return

    if (!confirm(`Are you sure you want to remove your ${userType === 'brand' ? 'logo' : 'profile picture'}?`)) {
      return
    }

    try {
      // Remove from storage if it's stored in our buckets
      if (currentImage.includes(bucketName)) {
        const path = currentImage.split(`/${bucketName}/`)[1]
        if (path) {
          await supabaseClient.storage
            .from(bucketName)
            .remove([path])
        }
      }

      // Update profile
      // TODO: Fix type issues with profiles table
      /* const { error } = await supabaseClient
        .from('profiles')
        .update({ [columnName]: null })
        .eq('id', userId)

      if (error) throw error */

      onUploadComplete('')
      
      // Show success notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50'
      notification.textContent = `✅ ${userType === 'brand' ? 'Logo' : 'Profile picture'} removed successfully!`
      document.body.appendChild(notification)

      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification)
        }
      }, 3000)

    } catch (error) {
      console.error('Remove error:', error)
      alert(`Failed to remove ${userType === 'brand' ? 'logo' : 'profile picture'}. Please try again.`)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Image Display */}
      <div className="flex items-center gap-4">
        {currentImage ? (
          <img 
            src={currentImage} 
            alt={userType === 'brand' ? 'Brand Logo' : 'Profile Picture'}
            className={`object-cover border-2 border-slate-200 dark:border-slate-600 ${
              userType === 'brand' 
                ? 'w-20 h-20 rounded-lg' 
                : 'w-20 h-20 rounded-full'
            }`}
          />
        ) : (
          <div className={`bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 flex items-center justify-center ${
            userType === 'brand' 
              ? 'w-20 h-20 rounded-lg' 
              : 'w-20 h-20 rounded-full'
          }`}>
            <span className="text-slate-400 text-2xl">
              {userType === 'brand' ? '🏢' : '👤'}
            </span>
          </div>
        )}

        <div className="flex-1">
          <h3 className="font-medium text-slate-900 dark:text-white">
            {userType === 'brand' ? 'Brand Logo' : 'Profile Picture'}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {userType === 'brand' 
              ? 'Upload your company logo (JPG, PNG, WebP, SVG up to 5MB)'
              : 'Upload your profile picture (JPG, PNG, WebP up to 5MB)'
            }
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Upload Controls */}
      <div className="flex items-center gap-3">
        <label htmlFor={`${userType}-image-upload`}>
          <AnimatedButton
            disabled={isUploading}
            className="cursor-pointer"
          >
            {isUploading ? 'Uploading...' : 'Upload New'}
          </AnimatedButton>
        </label>
        <input
          id={`${userType}-image-upload`}
          type="file"
          accept={userType === 'brand' ? 'image/*' : 'image/jpeg,image/png,image/webp'}
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
        />

        {currentImage && (
          <AnimatedButton
            onClick={handleRemoveImage}
            variant="ghost"
            disabled={isUploading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Remove
          </AnimatedButton>
        )}
      </div>

      {/* Guidelines */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>• Maximum file size: 5MB</p>
        <p>• Recommended size: {userType === 'brand' ? '400x400px' : '300x300px'}</p>
        <p>• {userType === 'brand' ? 'Square logos work best' : 'Square images work best for circular crop'}</p>
      </div>
    </div>
  )
}
