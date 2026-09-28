import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import {
  checkRateLimit,
  rateLimitResponse,
  reconocimientosSubmitRateLimit,
} from '@/lib/rate-limit'
import {
  APP_CAPTION_MAX,
  APP_CAPTION_MIN,
  APP_DEFAULT_HOW_KNOWN,
  APP_DEFAULT_WHO_TYPE,
  MAX_CONTACT_LEN,
  MAX_CREDIT_LEN,
  MAX_WHERE_LEN,
  clampText,
  composeAppWhereText,
  createRecognitionSubmission,
  isNonEmptyString,
  isReconocimientosEnabled,
  sanitizeSrc,
} from '@/lib/reconocimientos'
import { createAdminClient } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/reconocimientos/app
 *
 * Authenticated native-app intake. Contract is locked for the parallel mobile PR
 * — do not change field names, status codes, or response shapes.
 *
 * Headers: Authorization: Bearer <Supabase access token>
 * Body: multipart/form-data
 *   photo (image/jpeg, required, ≤10 MB)
 *   caption (string, required, 8–280)
 *   place_name, colonia, alcaldia (optional strings)
 *   lat, lng (optional numbers — ignored unless columns exist; currently ignored)
 *   consent ("true", required)
 *   src (default "app")
 *
 * 201 { id, status: "pending" }
 * 400 { error, field }
 * 401 missing/invalid token
 * 429 rate limit (same window as web submit, keyed by user id)
 */

function fieldError(error: string, field: string, status = 400) {
  return NextResponse.json({ error, field }, { status })
}

async function requireBearerProfile(request: NextRequest): Promise<{
  id: string
  full_name: string | null
  email: string | null
} | null> {
  const authHeader =
    request.headers.get('authorization') ?? request.headers.get('Authorization')
  const match = authHeader ? /^Bearer\s+(.+)$/i.exec(authHeader.trim()) : null
  const jwt = match?.[1]?.trim()
  if (!jwt) return null

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const supabase = createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(jwt)
  if (error || !user) return null

  let fullName =
    (user.user_metadata?.full_name as string | undefined) ?? null
  let email = user.email ?? null

  try {
    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle()
    if (profile) {
      fullName = (profile.full_name as string | null) ?? fullName
      email = (profile.email as string | null) ?? email
    }
  } catch {
    // Profile hydration is best-effort; JWT identity is enough to proceed.
  }

  return { id: user.id, full_name: fullName, email }
}

export async function POST(request: NextRequest) {
  if (!isReconocimientosEnabled()) {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 })
  }

  try {
    const profile = await requireBearerProfile(request)
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rate = await checkRateLimit(
      reconocimientosSubmitRateLimit,
      `reconocimientos-submit:user:${profile.id}`
    )
    if (rate && !rate.allowed) {
      return rateLimitResponse(rate.limit, rate.remaining, rate.reset)
    }

    const form = await request.formData()

    const consentRaw = form.get('consent')
    if (consentRaw !== 'true') {
      return fieldError('Debes aceptar el consentimiento', 'consent')
    }

    const captionRaw = form.get('caption')
    if (!isNonEmptyString(captionRaw)) {
      return fieldError('La descripción es obligatoria', 'caption')
    }
    const captionTrimmed = captionRaw.trim()
    if (
      captionTrimmed.length < APP_CAPTION_MIN ||
      captionTrimmed.length > APP_CAPTION_MAX
    ) {
      return fieldError(
        `La descripción debe tener entre ${APP_CAPTION_MIN} y ${APP_CAPTION_MAX} caracteres`,
        'caption'
      )
    }
    const what = clampText(captionTrimmed, APP_CAPTION_MAX)

    const placeName = isNonEmptyString(form.get('place_name'))
      ? clampText(String(form.get('place_name')), MAX_WHERE_LEN)
      : null
    const colonia = isNonEmptyString(form.get('colonia'))
      ? clampText(String(form.get('colonia')), MAX_WHERE_LEN)
      : null
    const alcaldia = isNonEmptyString(form.get('alcaldia'))
      ? clampText(String(form.get('alcaldia')), MAX_WHERE_LEN)
      : null

    // lat/lng: table has no columns — ignore (do not migrate for this alone).
    void form.get('lat')
    void form.get('lng')

    const whereText = clampText(
      composeAppWhereText({
        place_name: placeName,
        colonia,
        alcaldia,
      }),
      MAX_WHERE_LEN
    )

    const srcRaw = form.get('src')
    const src =
      typeof srcRaw === 'string' && srcRaw.trim()
        ? sanitizeSrc(srcRaw)
        : 'app'

    const creditHandle = profile.full_name
      ? clampText(profile.full_name.replace(/^@+/, ''), MAX_CREDIT_LEN)
      : null
    const contact = profile.email
      ? clampText(profile.email, MAX_CONTACT_LEN)
      : null

    const photo = form.get('photo')
    if (!(photo instanceof File)) {
      return fieldError('La foto es obligatoria', 'photo')
    }
    if (photo.type !== 'image/jpeg') {
      return fieldError('La foto debe ser image/jpeg', 'photo')
    }

    const result = await createRecognitionSubmission({
      what,
      where_text: whereText,
      who_type: APP_DEFAULT_WHO_TYPE,
      how_known: APP_DEFAULT_HOW_KNOWN,
      credit_handle: creditHandle,
      contact,
      src,
      user_id: profile.id,
      photo: {
        buffer: Buffer.from(await photo.arrayBuffer()),
        contentType: photo.type,
        size: photo.size,
      },
      allowedImageTypes: ['image/jpeg'],
    })

    if (!result.ok) {
      return fieldError(result.error, result.field ?? 'photo')
    }

    // Web intake has no admin email/push notification today — nothing to mirror.

    return NextResponse.json(
      { id: result.id, status: 'pending' as const },
      { status: 201 }
    )
  } catch (err) {
    console.error('[reconocimientos/app]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
