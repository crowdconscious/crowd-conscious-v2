import { supabaseClient } from './supabase-client'

export type StorageBucket = 'community-images' | 'content-media' | 'profile-pictures' | 'sponsor-logos'

export interface UploadOptions {
  maxSizeMB?: number
  allowedTypes?: string[]
  quality?: number
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSizeMB: 5,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  quality: 0.8
}

/**
 * Centralized image upload utility
 * Following rebuild strategy: simple, single responsibility
 */
export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  path: string,
  options: UploadOptions = {}
): Promise<string> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }
    
    if (!opts.allowedTypes?.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed. Allowed types: ${opts.allowedTypes?.join(', ')}`)
    }
    
    // Validate file size
    if (file.size > (opts.maxSizeMB || 5) * 1024 * 1024) {
      throw new Error(`File must be less than ${opts.maxSizeMB}MB`)
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileName = `${path}/${timestamp}_${randomId}.${ext}`

    console.log('Uploading image:', { bucket, fileName, size: file.size, type: file.type })

    // Upload file to Supabase Storage
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    if (!data?.path) {
      throw new Error('Upload succeeded but no path returned')
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(data.path)

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL')
    }

    console.log('Upload successful:', { url: urlData.publicUrl, path: data.path })
    return urlData.publicUrl

  } catch (error) {
    console.error('Upload error:', error)
    throw error instanceof Error ? error : new Error('Upload failed')
  }
}

/**
 * Delete an image from storage
 */
export async function deleteImage(
  bucket: StorageBucket,
  filePath: string
): Promise<void> {
  try {
    console.log('Deleting image:', { bucket, filePath })
    
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      throw new Error(`Delete failed: ${error.message}`)
    }

    console.log('Delete successful:', { bucket, filePath })
  } catch (error) {
    console.error('Delete error:', error)
    throw error instanceof Error ? error : new Error('Delete failed')
  }
}

/**
 * Extract file path from a Supabase public URL
 */
export function extractFilePathFromUrl(publicUrl: string, bucket: StorageBucket): string | null {
  try {
    const url = new URL(publicUrl)
    const pathParts = url.pathname.split('/')
    
    // Find bucket in path and get everything after it
    const bucketIndex = pathParts.indexOf(bucket)
    if (bucketIndex === -1) return null
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/')
    return filePath || null
  } catch {
    return null
  }
}

/**
 * Validate file before upload (client-side check)
 */
export function validateFile(file: File, options: UploadOptions = {}): { valid: boolean; error?: string } {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' }
  }
  
  if (!opts.allowedTypes?.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` }
  }
  
  if (file.size > (opts.maxSizeMB || 5) * 1024 * 1024) {
    return { valid: false, error: `File must be less than ${opts.maxSizeMB}MB` }
  }
  
  return { valid: true }
}

/**
 * Compress image before upload (optional utility)
 */
export function compressImage(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Maintain aspect ratio while compressing
      const maxWidth = 1920
      const maxHeight = 1080
      
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx?.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })
          
          resolve(compressedFile)
        },
        file.type,
        quality
      )
      
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image for compression'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Get optimized image URL with transformations (if supported by your storage provider)
 */
export function getOptimizedImageUrl(
  publicUrl: string,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  // For now, just return the original URL
  // In the future, you could add image transformation parameters
  // based on your storage provider's capabilities
  return publicUrl
}

/**
 * Upload sponsor logo with specific requirements
 * - Max 2MB
 * - Creates thumbnail version
 * - Returns public URL
 */
export async function uploadSponsorLogo(
  file: File,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    if (file.size > 2 * 1024 * 1024) {
      return { success: false, error: 'Logo must be less than 2MB' }
    }

    // Compress image to create thumbnail
    const compressedFile = await compressImage(file, 0.85)

    // Upload to sponsor-logos bucket
    const path = `${userId}`
    const url = await uploadImage(compressedFile, 'sponsor-logos', path, {
      maxSizeMB: 2,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
      quality: 0.85
    })

    return { success: true, url }
  } catch (error) {
    console.error('Sponsor logo upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload logo'
    }
  }
}
