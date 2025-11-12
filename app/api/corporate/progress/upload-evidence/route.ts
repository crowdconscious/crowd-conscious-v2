import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'

// Upload evidence images to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return ApiResponse.unauthorized('Please log in to upload evidence')
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const courseId = formData.get('courseId') as string
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string

    if (!files || files.length === 0) {
      return ApiResponse.badRequest('No files provided', 'MISSING_FILES')
    }

    if (!courseId || !moduleId || !lessonId) {
      return ApiResponse.badRequest('Missing course/module/lesson IDs', 'MISSING_REQUIRED_FIELDS')
    }

    console.log(`📸 Uploading ${files.length} evidence image(s) for user ${user.id}`)

    const uploadedUrls: string[] = []
    const errors: string[] = []

    // Upload each file
    for (const file of files) {
      try {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name}: Not a valid image`)
          continue
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
          errors.push(`${file.name}: File too large (max 5MB)`)
          continue
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 8)
        const fileExtension = file.name.split('.').pop()
        const fileName = `${timestamp}-${randomString}.${fileExtension}`

        // Storage path: user-id/course-id/module-id/lesson-id/filename
        const filePath = `${user.id}/${courseId}/${moduleId}/${lessonId}/${fileName}`

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('employee-evidence')
          .upload(filePath, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error(`❌ Error uploading ${file.name}:`, error)
          errors.push(`${file.name}: ${error.message}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('employee-evidence')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
        console.log(`✅ Uploaded: ${publicUrl}`)
      } catch (fileError) {
        console.error(`❌ Error processing ${file.name}:`, fileError)
        errors.push(`${file.name}: Upload failed`)
      }
    }

    // Save URLs to lesson_responses
    if (uploadedUrls.length > 0) {
      try {
        // ✅ Get enrollment_id for this user and module
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('module_id', moduleId)
          .single()

        if (!enrollment) {
          // Return uploaded URLs even if enrollment not found
          return ApiResponse.ok({ 
            uploadedUrls,
            count: uploadedUrls.length,
            warning: 'Evidence uploaded but not saved to lesson (enrollment not found)',
            errors: errors.length > 0 ? errors : undefined
          })
        }

        // Check if lesson response exists
        const { data: existing } = await supabase
          .from('lesson_responses')
          .select('evidence_urls')
          .eq('enrollment_id', enrollment.id)
          .eq('lesson_id', lessonId)
          .single()

        if (existing) {
          // Merge with existing URLs
          const allUrls = [...(existing.evidence_urls || []), ...uploadedUrls]
          await supabase
            .from('lesson_responses')
            .update({ 
              evidence_urls: allUrls,
              updated_at: new Date().toISOString()
            })
            .eq('enrollment_id', enrollment.id)
            .eq('lesson_id', lessonId)
        } else {
          // Create new record with minimal data + evidence
          await supabase
            .from('lesson_responses')
            .insert({
              enrollment_id: enrollment.id,
              lesson_id: lessonId,
              module_id: moduleId,
              evidence_urls: uploadedUrls,
              completed: false, // Not completed yet, just saving evidence
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
        }

        console.log(`✅ Saved ${uploadedUrls.length} URL(s) to lesson_responses`)
      } catch (dbError) {
        console.error('❌ Error saving to database:', dbError)
        // Don't fail the request, images are already uploaded
      }
    }

    return ApiResponse.ok({
      uploadedUrls,
      count: uploadedUrls.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('❌ Error in upload-evidence:', error)
    return ApiResponse.serverError('Internal server error', 'EVIDENCE_UPLOAD_SERVER_ERROR', { message: error.message })
  }
}

// Delete evidence image from Storage
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return ApiResponse.unauthorized('Please log in to delete evidence')
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return ApiResponse.badRequest('No URL provided', 'MISSING_URL')
    }

    // Extract file path from URL
    // Format: https://[project].supabase.co/storage/v1/object/public/employee-evidence/[path]
    const urlParts = url.split('/employee-evidence/')
    if (urlParts.length < 2) {
      return ApiResponse.badRequest('Invalid URL format', 'INVALID_URL_FORMAT')
    }

    const filePath = urlParts[1]

    // Verify the file belongs to the user
    if (!filePath.startsWith(user.id)) {
      return ApiResponse.forbidden('Cannot delete another user\'s file', 'FILE_ACCESS_DENIED')
    }

    // Delete from Storage
    const { error } = await supabase.storage
      .from('employee-evidence')
      .remove([filePath])

    if (error) {
      console.error('❌ Error deleting file:', error)
      return ApiResponse.serverError('Failed to delete file', 'FILE_DELETE_ERROR', { message: error.message })
    }

    console.log(`✅ Deleted: ${filePath}`)
    return ApiResponse.ok({ message: 'File deleted successfully' })
  } catch (error: any) {
    console.error('❌ Error in delete evidence:', error)
    return ApiResponse.serverError('Internal server error', 'EVIDENCE_DELETE_SERVER_ERROR', { message: error.message })
  }
}

