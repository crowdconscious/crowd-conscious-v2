import { supabase } from './supabase'

// Media upload utility - keeping it simple and lean per rebuild strategy
export const MEDIA_BUCKETS = {
  COMMUNITY_IMAGES: 'community-images',
  CONTENT_MEDIA: 'content-media',
  PROFILE_PICTURES: 'profile-pictures'
} as const

export type MediaBucket = typeof MEDIA_BUCKETS[keyof typeof MEDIA_BUCKETS]

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
  path?: string
}

/**
 * Upload a file to Supabase storage
 * Following rebuild strategy: simple, single responsibility
 */
export async function uploadMedia(
  file: File,
  bucket: MediaBucket,
  path: string
): Promise<UploadResult> {
  try {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 5MB' }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }
    }

    // Generate unique filename with proper extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Ensure proper path format: bucket/{communityId}/filename
    const filePath = path.startsWith('/') ? `${path.substring(1)}/${fileName}` : `${path}/${fileName}`

    console.log('Uploading to:', { bucket, filePath, fileSize: file.size, fileType: file.type })

    // Upload to Supabase Storage with retry logic
    let uploadAttempt = 0
    const maxAttempts = 3
    
    while (uploadAttempt < maxAttempts) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error(`Upload attempt ${uploadAttempt + 1} failed:`, error)
          
          // If it's a duplicate file error, try with a new filename
          if (error.message.includes('duplicate') || error.message.includes('already exists')) {
            const newFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-retry.${fileExt}`
            const newFilePath = path.startsWith('/') ? `${path.substring(1)}/${newFileName}` : `${path}/${newFileName}`
            uploadAttempt++
            
            if (uploadAttempt < maxAttempts) {
              const retryResult = await supabase.storage
                .from(bucket)
                .upload(newFilePath, file, {
                  cacheControl: '3600',
                  upsert: false
                })
              
              if (!retryResult.error) {
                // Get public URL for successful retry
                const { data: urlData } = supabase.storage
                  .from(bucket)
                  .getPublicUrl(newFilePath)

                return {
                  success: true,
                  url: urlData.publicUrl,
                  path: newFilePath
                }
              }
            }
          }
          
          uploadAttempt++
          if (uploadAttempt >= maxAttempts) {
            return { success: false, error: `Upload failed after ${maxAttempts} attempts: ${error.message}` }
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempt))
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath)

        console.log('Upload successful:', { url: urlData.publicUrl, path: filePath })

        return {
          success: true,
          url: urlData.publicUrl,
          path: filePath
        }
      } catch (attemptError) {
        console.error(`Upload attempt ${uploadAttempt + 1} exception:`, attemptError)
        uploadAttempt++
        
        if (uploadAttempt >= maxAttempts) {
          return { success: false, error: 'Upload failed after multiple attempts' }
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * uploadAttempt))
      }
    }

    return { success: false, error: 'Upload failed after all retry attempts' }
  } catch (error) {
    console.error('Upload exception:', error)
    return { success: false, error: 'Upload failed. Please check your connection and try again.' }
  }
}

/**
 * Delete a file from Supabase storage
 */
export async function deleteMedia(bucket: MediaBucket, path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete exception:', error)
    return false
  }
}

/**
 * Get optimized image URL with transformations
 * Supabase supports basic image transformations
 */
export function getOptimizedImageUrl(
  bucket: MediaBucket,
  path: string,
  options: {
    width?: number
    height?: number
    quality?: number
  } = {}
): string {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path, {
      transform: {
        width: options.width,
        height: options.height,
        quality: options.quality || 80
      }
    })

  return data.publicUrl
}

/**
 * Generate shareable public URL for content
 * This will be used for external sharing
 */
export function generateShareableUrl(contentId: string, contentType: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  return `${baseUrl}/share/${contentId}`
}

/**
 * Enhanced file validation with security checks
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Size check (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { 
      valid: false, 
      error: `File size must be less than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(1)}MB` 
    }
  }

  // Strict type check for security - removed GIF for better security
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `File type not allowed. Only JPEG, PNG, and WebP images are supported. Current type: ${file.type}` 
    }
  }

  // Validate file extension matches MIME type
  const fileExt = file.name.split('.').pop()?.toLowerCase()
  const typeExtMap: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/webp': ['webp']
  }
  
  const allowedExts = typeExtMap[file.type] || []
  if (!allowedExts.includes(fileExt || '')) {
    return { 
      valid: false, 
      error: `File extension (${fileExt}) doesn't match file type (${file.type}). This may indicate a security risk.` 
    }
  }

  // Check for suspicious filename patterns
  const suspiciousPatterns = ['.php', '.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '..']
  const lowerName = file.name.toLowerCase()
  for (const pattern of suspiciousPatterns) {
    if (lowerName.includes(pattern)) {
      return { 
        valid: false, 
        error: `Filename contains suspicious content: ${pattern}` 
      }
    }
  }

  // Check filename length
  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'Filename is too long (max 255 characters)'
    }
  }

  return { valid: true }
}

/**
 * Client-side image dimension validation
 */
export function validateImageDimensions(
  file: File, 
  maxWidth = 2000, 
  maxHeight = 2000
): Promise<{ valid: boolean; error?: string; dimensions?: { width: number; height: number } }> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      const dimensions = { width: img.width, height: img.height }
      
      if (img.width > maxWidth || img.height > maxHeight) {
        resolve({
          valid: false,
          error: `Image dimensions must be less than ${maxWidth}x${maxHeight}px. Current: ${img.width}x${img.height}px`,
          dimensions
        })
      } else {
        resolve({ valid: true, dimensions })
      }
      URL.revokeObjectURL(img.src)
    }
    
    img.onerror = () => {
      resolve({ 
        valid: false, 
        error: 'Invalid image file or corrupted data' 
      })
      URL.revokeObjectURL(img.src)
    }
    
    img.src = URL.createObjectURL(file)
  })
}
