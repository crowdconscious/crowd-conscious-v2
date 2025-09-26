'use client'

import { useState, useRef } from 'react'
import { uploadImage, validateFile, type StorageBucket } from '../../lib/storage'
import { debugUploadImage } from '../../lib/storage-debug'

interface MediaUploadProps {
  bucket: StorageBucket
  path: string // Upload path (e.g., community ID, user ID, etc.)
  onUploadComplete?: (url: string) => void
  onUploadError?: (error: string) => void
  currentImageUrl?: string
  className?: string
  accept?: string
  maxSizeMB?: number
  label?: string
  description?: string
  aspectRatio?: 'square' | 'video' | 'wide' | 'auto'
}

export default function MediaUpload({
  bucket,
  path,
  onUploadComplete,
  onUploadError,
  currentImageUrl,
  className = '',
  accept = 'image/*',
  maxSizeMB = 5,
  label,
  description,
  aspectRatio = 'auto'
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File) => {
    // Client-side validation
    const validation = validateFile(file, { maxSizeMB })
    if (!validation.valid) {
      onUploadError?.(validation.error || 'Invalid file')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Create preview URL immediately
      const localPreview = URL.createObjectURL(file)
      setPreviewUrl(localPreview)
      setUploadProgress(20)
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval)
            return 80
          }
          return prev + 15
        })
      }, 300)

      // Upload using debug utility for troubleshooting
      console.log('🔧 MediaUpload: Using debug upload...')
      const publicUrl = await debugUploadImage(file, bucket, path)

      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Clean up local preview
      URL.revokeObjectURL(localPreview)
      setPreviewUrl(null)
      
      // Notify parent component
      onUploadComplete?.(publicUrl)
      
    } catch (error) {
      console.error('Upload error:', error)
      
      // Clean up local preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.'
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)
    
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setDragActive(false)
  }

  // Aspect ratio classes
  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video', 
    wide: 'aspect-[3/1]',
    auto: ''
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      
      {description && (
        <p className="text-sm text-slate-600">{description}</p>
      )}

      <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
          ${aspectRatioClasses[aspectRatio]}
          ${dragActive 
            ? 'border-teal-500 bg-teal-50' 
            : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {currentImageUrl || previewUrl ? (
          // Show current image or preview with overlay
          <div className="relative group">
            <img
              src={previewUrl || currentImageUrl || ''}
              alt={previewUrl ? 'Preview' : 'Current image'}
              className="w-full h-48 object-cover rounded-xl"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-2xl mb-2">📷</div>
                <div className="text-sm font-medium">
                  {isUploading ? 'Uploading...' : 'Change Image'}
                </div>
              </div>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-white/90 rounded-xl flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-sm text-neutral-700 font-medium mb-2">Uploading...</div>
                {/* Progress bar */}
                <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-neutral-500 mt-1">{uploadProgress}%</div>
              </div>
            )}
          </div>
        ) : (
          // Show upload area
          <div className="p-8 text-center">
            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm text-neutral-600">Uploading image...</div>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-4">📷</div>
                <div className="text-lg font-medium text-neutral-700 mb-2">
                  Upload Image
                </div>
                <div className="text-sm text-neutral-500 mb-4">
                  Drag & drop or click to select
                </div>
                <div className="text-xs text-neutral-400">
                  JPEG, PNG, WebP, GIF • Max {maxSizeMB}MB
                </div>
              </>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
