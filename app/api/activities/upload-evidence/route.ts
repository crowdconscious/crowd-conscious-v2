import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { ApiResponse } from '@/lib/api-responses'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return ApiResponse.unauthorized('Please log in to upload evidence')
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string

    if (!files || files.length === 0) {
      return ApiResponse.badRequest('No se proporcionaron archivos', 'MISSING_FILES')
    }

    if (!moduleId || !lessonId) {
      return ApiResponse.badRequest('moduleId and lessonId are required', 'MISSING_REQUIRED_FIELDS')
    }

    console.log(`📤 Uploading ${files.length} evidence files for user ${user.id}`)

    const uploadedUrls: string[] = []
    const errors: string[] = []

    // Upload each file to Supabase Storage
    for (const file of files) {
      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${moduleId}/${lessonId}/${randomUUID()}.${fileExt}`

        // Convert File to ArrayBuffer then to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage (use EXISTING employee-evidence bucket)
        const { data, error } = await supabase.storage
          .from('employee-evidence')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false
          })

        if (error) {
          console.error(`❌ Error uploading file ${file.name}:`, error)
          errors.push(`${file.name}: ${error.message}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('employee-evidence')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
        console.log(`✅ File uploaded: ${fileName}`)

      } catch (fileError: any) {
        console.error(`❌ Error processing file ${file.name}:`, fileError)
        errors.push(`${file.name}: ${fileError.message}`)
      }
    }

    if (uploadedUrls.length === 0) {
      return ApiResponse.serverError('Error al subir archivos', 'EVIDENCE_UPLOAD_ERROR', { 
        details: 'Ningún archivo se subió correctamente',
        errors
      })
    }

    return ApiResponse.ok({
      urls: uploadedUrls,
      count: uploadedUrls.length,
      message: `${uploadedUrls.length} archivo(s) subido(s) exitosamente`,
      ...(errors.length > 0 && { warnings: errors })
    })

  } catch (error: any) {
    console.error('❌ Critical error uploading evidence:', error)
    return ApiResponse.serverError('Error del servidor', 'EVIDENCE_UPLOAD_SERVER_ERROR', { 
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

