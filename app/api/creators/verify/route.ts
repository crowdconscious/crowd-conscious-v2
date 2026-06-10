import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'
import { creatorTier, type CreatorTier } from '@/lib/creators/types'
import { normalizeHandle } from '@/lib/i18n/creator'

export type CreatorVerifyResult = {
  handle: string
  full_name: string | null
  avatar_url: string | null
  tier: CreatorTier
  conscious_score: number | null
  total_votes: number
  certified_at: string | null
  next_review_date: string | null
  craft: string | null
  craft_en: string | null
  city: string | null
}

/**
 * Public badge lookup, mirroring GET /api/locations/verify. Only active
 * certifications resolve (same visibility rule as the RLS policy) and only
 * public-safe columns leave the server. Like the locations route — and the
 * creator OG route — this uses the admin client because the handle lives on
 * `profiles`, which is not anon-readable; the active-status gate is applied
 * explicitly.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('handle')?.trim()
    if (!raw) {
      return NextResponse.json({ error: 'Provide handle' }, { status: 400 })
    }
    const handle = normalizeHandle(raw.replace(/^@/, ''))
    if (!handle) {
      return NextResponse.json({ creator: null })
    }

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id, handle, full_name, avatar_url')
      .ilike('handle', handle)
      .eq('user_type', 'influencer')
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
    if (!profile?.handle) {
      return NextResponse.json({ creator: null })
    }

    const { data: cert, error: certError } = await admin
      .from('creator_certifications')
      .select(
        'conscious_score, total_votes, certified_at, next_review_date, craft, craft_en, city'
      )
      .eq('profile_id', profile.id)
      .eq('status', 'active')
      .maybeSingle()

    if (certError) {
      return NextResponse.json({ error: certError.message }, { status: 500 })
    }
    if (!cert) {
      return NextResponse.json({ creator: null })
    }

    const score = cert.conscious_score == null ? null : Number(cert.conscious_score)
    const votes = Number(cert.total_votes ?? 0)
    const result: CreatorVerifyResult = {
      handle: profile.handle as string,
      full_name: (profile.full_name as string | null) ?? null,
      avatar_url: (profile.avatar_url as string | null) ?? null,
      tier: creatorTier({
        certified_at: cert.certified_at,
        conscious_score: score,
        total_votes: votes,
      }),
      conscious_score: score,
      total_votes: votes,
      certified_at: cert.certified_at,
      next_review_date: cert.next_review_date,
      craft: cert.craft,
      craft_en: cert.craft_en,
      city: cert.city,
    }

    return NextResponse.json({ creator: result })
  } catch (err) {
    console.error('[GET /api/creators/verify]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
