import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserFromRequest } from '@/lib/auth-server'
import {
  checkRateLimit,
  getRateLimitIdentifier,
  rateLimitResponse,
  reconocimientosSubmitRateLimit,
} from '@/lib/rate-limit'
import {
  ALLOWED_IMAGE_TYPES,
  CONSENT_VERSION,
  HOW_KNOWN,
  MAX_CONTACT_LEN,
  MAX_CREDIT_LEN,
  MAX_PHOTO_BYTES,
  MAX_WHAT_LEN,
  MAX_WHERE_LEN,
  WHO_TYPES,
  clampText,
  generateShareSlug,
  insertRecognition,
  isNonEmptyString,
  isReconocimientosEnabled,
  processRecognitionPhoto,
  sanitizeSrc,
  uploadRecognitionPhoto,
  type HowKnown,
  type WhoType,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/reconocimientos/submit
 * Multipart intake. Guests allowed. Service-role writes only.
 * Rate limit: 5/hour/IP. Honeypot field `website` must stay empty.
 *
 * Consent + text fields are validated BEFORE any image processing or storage
 * write so rejected requests never leave bytes in the bucket.
 */
export async function POST(request: NextRequest) {
  if (!isReconocimientosEnabled()) {
    return NextResponse.json({ error: 'No disponible' }, { status: 404 })
  }

  try {
    const user = await getCurrentUserFromRequest(request)
    const identity = await getRateLimitIdentifier(request, user?.id ?? null)
    const rate = await checkRateLimit(
      reconocimientosSubmitRateLimit,
      `reconocimientos-submit:${identity}`
    )
    if (rate && !rate.allowed) {
      return rateLimitResponse(rate.limit, rate.remaining, rate.reset)
    }

    const form = await request.formData()

    // Honeypot — bots fill hidden fields; humans leave it blank.
    if (String(form.get('website') ?? '').trim()) {
      return NextResponse.json({ ok: true })
    }

    // --- Validate consent + fields BEFORE touching the image / storage ---
    const whatRaw = form.get('what')
    const whereRaw = form.get('where_text')
    const whoRaw = form.get('who_type')
    const howRaw = form.get('how_known')
    const creditRaw = form.get('credit_handle')
    const contactRaw = form.get('contact')
    const consentRaw = form.get('consent')
    const srcRaw = form.get('src')

    if (consentRaw !== 'true' && consentRaw !== 'on' && consentRaw !== '1') {
      return NextResponse.json(
        { error: 'Debes aceptar el consentimiento' },
        { status: 400 }
      )
    }
    if (!isNonEmptyString(whatRaw)) {
      return NextResponse.json({ error: 'Cuéntanos qué está pasando' }, { status: 400 })
    }
    if (!isNonEmptyString(whereRaw)) {
      return NextResponse.json({ error: 'Indica dónde' }, { status: 400 })
    }
    if (!isNonEmptyString(whoRaw) || !(WHO_TYPES as readonly string[]).includes(whoRaw)) {
      return NextResponse.json({ error: 'Selecciona quién lo hace' }, { status: 400 })
    }
    if (!isNonEmptyString(howRaw) || !(HOW_KNOWN as readonly string[]).includes(howRaw)) {
      return NextResponse.json({ error: 'Selecciona cómo te enteraste' }, { status: 400 })
    }

    const what = clampText(whatRaw, MAX_WHAT_LEN)
    const whereText = clampText(whereRaw, MAX_WHERE_LEN)
    if (!what || !whereText) {
      return NextResponse.json({ error: 'Completa los campos requeridos' }, { status: 400 })
    }

    const creditHandle = isNonEmptyString(creditRaw)
      ? clampText(creditRaw.replace(/^@+/, ''), MAX_CREDIT_LEN)
      : null
    const contact = isNonEmptyString(contactRaw)
      ? clampText(contactRaw, MAX_CONTACT_LEN)
      : null
    const src = sanitizeSrc(srcRaw)

    // --- Photo checks only after consent/fields pass ---
    const photo = form.get('photo')
    if (!(photo instanceof File)) {
      return NextResponse.json({ error: 'La foto es obligatoria' }, { status: 400 })
    }
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(photo.type)) {
      return NextResponse.json(
        { error: 'Formato no válido (JPG, PNG, WebP o HEIC)' },
        { status: 400 }
      )
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'La foto supera 10 MB' }, { status: 400 })
    }

    let processed
    try {
      processed = await processRecognitionPhoto(
        Buffer.from(await photo.arrayBuffer())
      )
    } catch (err) {
      console.error('[reconocimientos/submit] image', err)
      return NextResponse.json(
        {
          error:
            'No pudimos procesar la imagen. Prueba JPG o PNG (HEIC a veces falla).',
        },
        { status: 400 }
      )
    }

    const shareSlug = generateShareSlug()
    const photoPath = `originals/${shareSlug}-${Date.now()}.jpg`
    await uploadRecognitionPhoto(photoPath, processed.buffer, processed.contentType)

    const row = await insertRecognition({
      user_id: user?.id ?? null,
      photo_path: photoPath,
      what,
      where_text: whereText,
      who_type: whoRaw as WhoType,
      how_known: howRaw as HowKnown,
      credit_handle: creditHandle,
      contact,
      consent_at: new Date().toISOString(),
      consent_version: CONSENT_VERSION,
      src,
      status: 'pending',
      share_slug: shareSlug,
    })

    return NextResponse.json({ ok: true, id: row.id, status: row.status })
  } catch (err) {
    console.error('[reconocimientos/submit]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
