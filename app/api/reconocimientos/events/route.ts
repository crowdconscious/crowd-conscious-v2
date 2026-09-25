import { NextRequest, NextResponse } from 'next/server'
import {
  checkRateLimit,
  getRateLimitIdentifier,
  lenientRateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit'
import {
  RECOGNITION_EVENT_TYPES,
  insertRecognitionEvent,
  sanitizeSrc,
  type RecognitionEventType,
} from '@/lib/reconocimientos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Body = {
  recognition_id?: string
  event_type?: string
  src?: string
}

/**
 * POST /api/reconocimientos/events
 * Public beacon for share clicks. No PII / no IP stored.
 * Rate-limited. Invalid payloads are ignored (204) so beacons stay fire-and-forget.
 */
export async function POST(request: NextRequest) {
  try {
    const identity = await getRateLimitIdentifier(request, null)
    const rate = await checkRateLimit(
      lenientRateLimit,
      `reconocimientos-events:${identity}`
    )
    if (rate && !rate.allowed) {
      return rateLimitResponse(rate.limit, rate.remaining, rate.reset)
    }

    const body = (await request.json().catch(() => null)) as Body | null
    const recognitionId =
      typeof body?.recognition_id === 'string' ? body.recognition_id.trim() : ''
    const eventType = body?.event_type
    if (
      !recognitionId ||
      recognitionId.length > 64 ||
      typeof eventType !== 'string' ||
      !(RECOGNITION_EVENT_TYPES as readonly string[]).includes(eventType)
    ) {
      return new NextResponse(null, { status: 204 })
    }

    // Only client share events via this beacon (card downloads counted on card route).
    if (
      eventType !== 'share_whatsapp' &&
      eventType !== 'share_native' &&
      eventType !== 'share_copy'
    ) {
      return new NextResponse(null, { status: 204 })
    }

    await insertRecognitionEvent({
      recognition_id: recognitionId,
      event_type: eventType as RecognitionEventType,
      src: sanitizeSrc(body?.src ?? 'web'),
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[api/reconocimientos/events]', err)
    // Still 204 — beacons must not surface errors to the client.
    return new NextResponse(null, { status: 204 })
  }
}
