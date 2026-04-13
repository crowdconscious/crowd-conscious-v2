import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const slug = searchParams.get('slug')?.trim().toLowerCase()

    if (!q && !slug) {
      return NextResponse.json({ error: 'Provide q or slug' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (slug) {
      const { data: row, error } = await admin
        .from('conscious_locations')
        .select(
          'name, slug, category, city, neighborhood, status, conscious_score, total_votes, certified_at, next_review_date, cover_image_url, logo_url'
        )
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!row) {
        return NextResponse.json({ location: null })
      }
      return NextResponse.json({ location: row })
    }

    const pattern = `%${q!.replace(/%/g, '\\%')}%`
    const { data: rows, error } = await admin
      .from('conscious_locations')
      .select(
        'name, slug, category, city, neighborhood, status, conscious_score, total_votes, certified_at, next_review_date, cover_image_url, logo_url'
      )
      .ilike('name', pattern)
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const list = rows ?? []
    if (list.length === 0) {
      return NextResponse.json({ location: null })
    }
    if (list.length === 1) {
      return NextResponse.json({ location: list[0] })
    }

    return NextResponse.json({ locations: list })
  } catch (err) {
    console.error('[GET /api/locations/verify]', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
