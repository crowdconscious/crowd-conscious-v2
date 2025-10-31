import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

// Upload evidence images to Supabase Storage
export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const courseId = formData.get('courseId') as string
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (!courseId || !moduleId || !lessonId) {
      return NextResponse.json({ error: 'Missing course/module/lesson IDs' }, { status: 400 })
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
        // Get employee's corporate account
        const { data: profile } = await supabase
          .from('profiles')
          .select('corporate_account_id')
          .eq('id', user.id)
          .single()

        if (!profile?.corporate_account_id) {
          return NextResponse.json({ 
            error: 'Not a corporate user',
            uploadedUrls, // Return URLs anyway
            errors
          }, { status: 403 })
        }

        // Check if lesson response exists
        const { data: existing } = await supabase
          .from('lesson_responses')
          .select('evidence_urls')
          .eq('employee_id', user.id)
          .eq('course_id', courseId)
          .eq('module_id', moduleId)
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
            .eq('employee_id', user.id)
            .eq('course_id', courseId)
            .eq('module_id', moduleId)
            .eq('lesson_id', lessonId)
        } else {
          // Create new record
          await supabase
            .from('lesson_responses')
            .insert({
              employee_id: user.id,
              corporate_account_id: profile.corporate_account_id,
              course_id: courseId,
              module_id: moduleId,
              lesson_id: lessonId,
              evidence_urls: uploadedUrls,
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

    return NextResponse.json({
      success: true,
      uploadedUrls,
      count: uploadedUrls.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error('❌ Error in upload-evidence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Delete evidence image from Storage
export async function DELETE(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    // Extract file path from URL
    // Format: https://[project].supabase.co/storage/v1/object/public/employee-evidence/[path]
    const urlParts = url.split('/employee-evidence/')
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const filePath = urlParts[1]

    // Verify the file belongs to the user
    if (!filePath.startsWith(user.id)) {
      return NextResponse.json({ error: 'Cannot delete another user\'s file' }, { status: 403 })
    }

    // Delete from Storage
    const { error } = await supabase.storage
      .from('employee-evidence')
      .remove([filePath])

    if (error) {
      console.error('❌ Error deleting file:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Deleted: ${filePath}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error in delete evidence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

