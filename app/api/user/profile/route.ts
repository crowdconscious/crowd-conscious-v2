import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

const MAX_NAME = 200
const MAX_BIO = 4000
const MAX_SHORT = 500

function strOrNull(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (t.length === 0) return null
  return t.slice(0, max)
}

function strField(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

/**
 * GET /api/user/profile
 *
 * Fetches the current user's profile information
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return ApiResponse.unauthorized('Please log in to view your profile')
    }

    // Get user's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return ApiResponse.notFound('Profile', 'PROFILE_NOT_FOUND')
    }

    return ApiResponse.ok(profile)
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    return ApiResponse.serverError('Server error', 'PROFILE_FETCH_ERROR', { message: error.message })
  }
}

const BRAND_SIZES = new Set(['startup', 'small', 'medium', 'large', 'enterprise'])

export type ProfilePatchBody = {
  full_name?: string
  bio?: string | null
  location?: string | null
  website?: string | null
  twitter?: string | null
  linkedin?: string | null
  instagram?: string | null
  is_public?: boolean
  /** Brand accounts only (validated server-side) */
  company_name?: string | null
  company_description?: string | null
  company_website?: string | null
  industry?: string | null
  company_size?: string | null
}

/**
 * PATCH /api/user/profile
 *
 * Updates the signed-in user's profile (name, bio, social, visibility).
 * Uses the server Supabase client (session cookies) so RLS applies as auth.uid().
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return ApiResponse.unauthorized('Please log in to update your profile')
    }

    let body: ProfilePatchBody
    try {
      body = (await request.json()) as ProfilePatchBody
    } catch {
      return ApiResponse.badRequest('Invalid JSON body', 'INVALID_JSON')
    }

    const { data: existingProfile, error: loadErr } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (loadErr || !existingProfile) {
      return ApiResponse.notFound('Profile', 'PROFILE_NOT_FOUND')
    }

    const isBrand = existingProfile.user_type === 'brand'

    const update: Record<string, string | boolean | null> = {}

    if (body.full_name !== undefined && !isBrand) {
      update.full_name = strField(body.full_name, MAX_NAME)
    }
    if (body.bio !== undefined) {
      if (isBrand) {
        const b = strOrNull(body.bio, MAX_BIO)
        update.bio = b
        update.company_description = b
      } else {
        update.bio = strOrNull(body.bio, MAX_BIO)
      }
    }
    if (body.location !== undefined) {
      update.location = strOrNull(body.location, MAX_SHORT)
    }
    if (body.website !== undefined && !isBrand) {
      update.website = strOrNull(body.website, MAX_SHORT)
    }
    if (body.twitter !== undefined && !isBrand) {
      update.twitter = strOrNull(body.twitter, 100)
    }
    if (body.linkedin !== undefined && !isBrand) {
      update.linkedin = strOrNull(body.linkedin, MAX_SHORT)
    }
    if (body.instagram !== undefined && !isBrand) {
      update.instagram = strOrNull(body.instagram, 100)
    }
    if (body.is_public !== undefined) {
      if (typeof body.is_public !== 'boolean') {
        return ApiResponse.badRequest('is_public must be a boolean', 'INVALID_IS_PUBLIC')
      }
      update.is_public = body.is_public
    }

    if (isBrand) {
      if (body.company_name !== undefined) {
        update.company_name = strOrNull(body.company_name, MAX_NAME)
      }
      if (body.company_description !== undefined && body.bio === undefined) {
        update.company_description = strOrNull(body.company_description, MAX_BIO)
      }
      if (body.company_website !== undefined) {
        update.company_website = strOrNull(body.company_website, MAX_SHORT)
      }
      if (body.industry !== undefined) {
        update.industry = strOrNull(body.industry, 120)
      }
      if (body.company_size !== undefined) {
        const raw =
          body.company_size == null || body.company_size === ''
            ? ''
            : String(body.company_size).trim().toLowerCase()
        if (!raw) {
          update.company_size = null
        } else if (!BRAND_SIZES.has(raw)) {
          return ApiResponse.badRequest('Invalid company_size', 'INVALID_COMPANY_SIZE')
        } else {
          update.company_size = raw
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return ApiResponse.badRequest('No valid fields to update', 'EMPTY_UPDATE')
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(update as Record<string, unknown>)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[PATCH /api/user/profile]', updateError)
      return ApiResponse.serverError(
        'Could not update profile',
        'PROFILE_UPDATE_FAILED',
        { message: updateError.message }
      )
    }

    // Keep Auth user_metadata.full_name in sync for templates / OAuth display (best-effort).
    if (typeof update.full_name === 'string') {
      try {
        const admin = createAdminClient()
        const { data: authUser } = await admin.auth.admin.getUserById(user.id)
        const meta = (authUser?.user?.user_metadata ?? {}) as Record<string, unknown>
        await admin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...meta,
            full_name: update.full_name,
          },
        })
      } catch (e) {
        console.warn('[PATCH /api/user/profile] auth metadata sync skipped:', e)
      }
    }

    return ApiResponse.ok(profile)
  } catch (error: unknown) {
    const err = error as { message?: string }
    console.error('Error updating profile:', error)
    return ApiResponse.serverError(
      'Server error',
      'PROFILE_UPDATE_ERROR',
      { message: err.message ?? 'Unknown error' }
    )
  }
}
