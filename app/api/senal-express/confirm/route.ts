import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUserFromRequest } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { getAlcaldiaMeta } from '@/lib/geo/cdmx'
import { mapExpressCategory } from '@/lib/senal-express/category-map'
import {
  generateOficioPDF,
  formatOficioDate,
} from '@/lib/senal-express/oficio-pdf'
import {
  createExpressAdminClient,
  getExpressOficio,
  updateExpressOficio,
  uploadOficioPdf,
  signedOficioUrl,
} from '@/lib/senal-express/db'
import type { ConfirmResponseBody } from '@/lib/senal-express/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/senal-express/confirm (§7.1)
 *
 * Kill switch: SENAL_EXPRESS_ENABLED !== 'true' ⇒ 503.
 *
 * Renders the (edited) oficio to a PDF, uploads it to the private
 * citizen-signals-evidence bucket, then branches on identity:
 *   - anonymous ⇒ status='confirmed', return { pdfUrl, signalCreated:false }.
 *     The register CTA fires on the client at this moment of max motivation.
 *   - logged-in AND SIGNALS_ENABLED==='true' ⇒ resolve the alcaldía FKs by slug
 *     (citizen_targets + conscious_locations), map the category, and publish a
 *     routed `municipality` señal via POST /api/signals (never a direct insert).
 *     Store signal_id; return { pdfUrl, signalCreated:true, signalSlug }.
 *   - logged-in but SIGNALS off / target unresolved ⇒ PDF only +
 *     { publishUnavailable:true }.
 */

function flagOn() {
  return process.env.SENAL_EXPRESS_ENABLED === 'true'
}

const confirmBodySchema = z.object({
  oficioId: z.string().uuid(),
  deviceId: z.string().trim().max(128).optional().default(''),
  senderName: z.string().trim().max(120).nullable().optional(),
  asunto: z.string().trim().min(1).max(300),
  cuerpo: z.string().trim().min(1).max(8000),
  peticion: z.string().trim().max(2000).optional().default(''),
  colonia: z.string().trim().max(120).nullable().optional(),
  streetReference: z.string().trim().max(160).nullable().optional(),
  photoStoragePath: z.string().trim().max(1024).nullable().optional(),
  locale: z.enum(['es', 'en']).optional().default('es'),
})

/** Split an edited body textarea into paragraphs (blank-line separated). */
function splitParagraphs(cuerpo: string): string[] {
  return cuerpo
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

/** Resolve the signature name: typed name, else "Vecina/o de {colonia|alcaldía}". */
function resolveSenderName(
  locale: 'es' | 'en',
  senderName: string | null | undefined,
  colonia: string | null | undefined,
  alcaldia: string,
  fullName: string | null
): string {
  const typed = (senderName ?? '').trim() || (fullName ?? '').trim()
  if (typed) return typed
  const place = (colonia ?? '').trim() || alcaldia
  return locale === 'es' ? `Vecina/o de ${place}` : `Neighbour of ${place}`
}

/** Location line under the signature (colonia · street), or null. */
function buildUbicacion(
  colonia: string | null | undefined,
  street: string | null | undefined
): string | null {
  const parts = [colonia, street]
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length > 0)
  return parts.length > 0 ? parts.join(' · ') : null
}

export async function POST(request: NextRequest) {
  if (!flagOn()) {
    return NextResponse.json({ error: 'Not available' }, { status: 503 })
  }

  try {
    const json = await request.json().catch(() => null)
    const parsed = confirmBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const body = parsed.data

    const admin = createExpressAdminClient()
    const oficio = await getExpressOficio(admin, body.oficioId)
    if (!oficio) {
      return NextResponse.json({ error: 'Oficio not found' }, { status: 404 })
    }

    const meta = getAlcaldiaMeta(oficio.alcaldia)
    if (!meta) {
      return NextResponse.json(
        { error: 'Unsupported alcaldía' },
        { status: 400 }
      )
    }

    // Identity (optional — anonymous is a supported funnel).
    let userId: string | null = null
    let fullName: string | null = null
    try {
      const user = await getCurrentUserFromRequest(request)
      userId = user?.id ?? null
      fullName = (user?.full_name as string | null) ?? null
    } catch {
      userId = null
    }

    // Render the PDF from the edited fields.
    const cuerpoParrafos = splitParagraphs(body.cuerpo)
    const senderName = resolveSenderName(
      body.locale,
      body.senderName,
      body.colonia,
      oficio.alcaldia,
      fullName
    )
    const pdf = generateOficioPDF({
      locale: body.locale,
      fechaLinea: formatOficioDate(body.locale),
      destinatario: {
        titulo: meta.destinatarioTitulo,
        dependencia: meta.dependencia,
        direccion: meta.direccion,
      },
      asunto: body.asunto,
      cuerpoParrafos:
        cuerpoParrafos.length > 0
          ? cuerpoParrafos
          : oficio.draft.cuerpo_parrafos,
      peticion: body.peticion || oficio.draft.peticion,
      senderName,
      ubicacion: buildUbicacion(body.colonia, body.streetReference),
    })

    const pdfPath = `senal-express/${oficio.id}.pdf`
    const { error: uploadErr } = await uploadOficioPdf(admin, pdfPath, pdf)
    if (uploadErr) {
      console.error('[senal-express/confirm] pdf upload', uploadErr)
      return NextResponse.json(
        { error: 'PDF upload failed' },
        { status: 500 }
      )
    }
    const pdfUrl = await signedOficioUrl(admin, pdfPath)
    if (!pdfUrl) {
      return NextResponse.json(
        { error: 'Could not sign PDF URL' },
        { status: 500 }
      )
    }

    // Anonymous ⇒ PDF only. No publish path (POST /api/signals is auth-gated).
    if (!userId) {
      await updateExpressOficio(admin, oficio.id, {
        status: 'confirmed',
        pdf_path: pdfPath,
      })
      const res: ConfirmResponseBody = { pdfUrl, signalCreated: false }
      return NextResponse.json(res)
    }

    // Logged-in but Signals surface is off ⇒ PDF only + clear flag.
    if (process.env.SIGNALS_ENABLED !== 'true') {
      await updateExpressOficio(admin, oficio.id, {
        status: 'confirmed',
        pdf_path: pdfPath,
      })
      const res: ConfirmResponseBody = {
        pdfUrl,
        signalCreated: false,
        publishUnavailable: true,
      }
      return NextResponse.json(res)
    }

    // Resolve the routed municipality FKs by slug (§7.1 owner decision).
    const signalsAdmin = createSignalsAdminClient()
    const [{ data: target }, { data: location }] = await Promise.all([
      signalsAdmin
        .from('citizen_targets')
        .select('id, target_kind')
        .eq('slug', meta.citizenTargetSlug)
        .maybeSingle(),
      signalsAdmin
        .from('conscious_locations')
        .select('id, status')
        .eq('slug', meta.consciousLocationSlug)
        .maybeSingle(),
    ])

    if (!target || target.target_kind !== 'municipality' || !location) {
      // Seed rows missing (owner action) — return the PDF, flag publish off.
      await updateExpressOficio(admin, oficio.id, {
        status: 'confirmed',
        pdf_path: pdfPath,
      })
      console.warn('[senal-express/confirm] routed FKs unresolved', {
        citizenTargetSlug: meta.citizenTargetSlug,
        consciousLocationSlug: meta.consciousLocationSlug,
        hasTarget: Boolean(target),
        hasLocation: Boolean(location),
      })
      const res: ConfirmResponseBody = {
        pdfUrl,
        signalCreated: false,
        publishUnavailable: true,
      }
      return NextResponse.json(res)
    }

    // Publish through POST /api/signals (never a direct citizen_signals insert),
    // forwarding the caller's auth so the route sees the same user.
    const signalBody = {
      routing_mode: 'routed' as const,
      country_code: 'MX',
      city_slug: 'cdmx',
      post_type: 'complaint',
      category: mapExpressCategory(oficio.category),
      severity: 'medium',
      target_kind: 'municipality',
      citizen_target_id: target.id,
      conscious_location_id: location.id,
      title: body.asunto.slice(0, 160),
      body:
        (cuerpoParrafos.length > 0
          ? cuerpoParrafos
          : oficio.draft.cuerpo_parrafos
        ).join('\n\n') +
        (body.peticion || oficio.draft.peticion
          ? `\n\n${body.peticion || oficio.draft.peticion}`
          : ''),
      language: body.locale,
      street_reference: body.streetReference?.trim()
        ? body.streetReference.trim()
        : undefined,
      evidence: body.photoStoragePath
        ? [{ kind: 'image', storage_path: body.photoStoragePath }]
        : [],
    }

    let signalCreated = false
    let signalSlug: string | null = null
    let publishUnavailable = false
    try {
      const origin = request.nextUrl.origin
      const forwardHeaders: Record<string, string> = {
        'content-type': 'application/json',
      }
      const cookie = request.headers.get('cookie')
      const authz = request.headers.get('authorization')
      if (cookie) forwardHeaders.cookie = cookie
      if (authz) forwardHeaders.authorization = authz

      const signalRes = await fetch(`${origin}/api/signals`, {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify(signalBody),
      })
      if (signalRes.ok) {
        const created = (await signalRes.json()) as {
          slug?: string
          id?: string
        }
        signalCreated = true
        signalSlug = created.slug ?? null
        await updateExpressOficio(admin, oficio.id, {
          status: 'confirmed',
          pdf_path: pdfPath,
          signal_id: created.id ?? null,
        })
      } else {
        publishUnavailable = true
        console.warn(
          '[senal-express/confirm] POST /api/signals failed',
          signalRes.status
        )
        await updateExpressOficio(admin, oficio.id, {
          status: 'confirmed',
          pdf_path: pdfPath,
        })
      }
    } catch (e) {
      publishUnavailable = true
      console.error('[senal-express/confirm] publish error', e)
      await updateExpressOficio(admin, oficio.id, {
        status: 'confirmed',
        pdf_path: pdfPath,
      })
    }

    const res: ConfirmResponseBody = {
      pdfUrl,
      signalCreated,
      signalSlug,
      publishUnavailable: publishUnavailable || undefined,
    }
    return NextResponse.json(res)
  } catch (err) {
    console.error('[senal-express/confirm] fatal', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
