import { NextRequest } from 'next/server'
import { getSupabase } from '@/app/api/webhooks/stripe/lib/stripe-webhook-utils'
import { ApiResponse } from '@/lib/api-responses'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_MB = 2

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('logo') as File | null

    if (!file || !(file instanceof File)) {
      return ApiResponse.badRequest('No logo file provided', 'MISSING_FILE')
    }

    if (!file.type.startsWith('image/') || !ALLOWED_TYPES.includes(file.type)) {
      return ApiResponse.badRequest(
        `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        'INVALID_TYPE'
      )
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return ApiResponse.badRequest(
        `Logo must be less than ${MAX_SIZE_MB}MB`,
        'FILE_TOO_LARGE'
      )
    }

    const supabase = getSupabase()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const folderRaw = formData.get('folder')
    const allowed = ['blog', 'pulse', 'live', 'sponsors'] as const
    const folder =
      typeof folderRaw === 'string' && (allowed as readonly string[]).includes(folderRaw)
        ? folderRaw
        : 'sponsors'
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await (supabase as any).storage
      .from('sponsor-logos')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Sponsor logo upload error:', error)
      return ApiResponse.serverError('Failed to upload logo', 'UPLOAD_ERROR')
    }

    const {
      data: { publicUrl },
    } = (supabase as any).storage.from('sponsor-logos').getPublicUrl(path)

    return ApiResponse.ok({ url: publicUrl })
  } catch (err: any) {
    console.error('Sponsor logo upload error:', err)
    return ApiResponse.serverError(
      err.message || 'Failed to upload logo',
      'UPLOAD_ERROR'
    )
  }
}
