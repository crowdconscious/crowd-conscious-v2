import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const moduleId = formData.get('moduleId') as string
    const lessonId = formData.get('lessonId') as string

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron archivos' }, { status: 400 })
    }

    console.log(`📤 Uploading ${files.length} evidence files for user ${user.id}`)

    const uploadedUrls: string[] = []

    // Upload each file to Supabase Storage
    for (const file of files) {
      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${moduleId}/${lessonId}/${uuidv4()}.${fileExt}`

        // Convert File to ArrayBuffer then to Buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('activity-evidence')
          .upload(fileName, buffer, {
            contentType: file.type,
            upsert: false
          })

        if (error) {
          console.error(`❌ Error uploading file ${file.name}:`, error)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('activity-evidence')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
        console.log(`✅ File uploaded: ${fileName}`)

      } catch (fileError) {
        console.error(`❌ Error processing file ${file.name}:`, fileError)
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json({ 
        error: 'Error al subir archivos',
        details: 'Ningún archivo se subió correctamente'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      count: uploadedUrls.length,
      message: `${uploadedUrls.length} archivo(s) subido(s) exitosamente`
    })

  } catch (error) {
    console.error('❌ Critical error uploading evidence:', error)
    return NextResponse.json({ 
      error: 'Error del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

