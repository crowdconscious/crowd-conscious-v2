import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase-admin'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(200),
  location: z.string().trim().min(1).max(500),
  why: z.string().trim().min(1).max(8000),
  instagram: z.string().trim().max(200).optional(),
  submitter_email: z.string().trim().max(320).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid nomination payload' }, { status: 400 })
    }
    const { name, location, why, instagram, submitter_email } = parsed.data

    const descParts = [
      `📍 ${location}`,
      '',
      why,
      instagram ? `\n\nInstagram: ${instagram}` : '',
      submitter_email ? `\n\nEmail: ${submitter_email}` : '',
    ]
    const description = descParts.join('').trim()

    const admin = createAdminClient()
    const { error } = await admin.from('conscious_inbox').insert({
      user_id: null,
      type: 'location_nomination',
      title: name,
      description,
      category: 'community',
      links: [],
      status: 'pending',
    })

    if (error) {
      console.error('[locations/nominate]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[locations/nominate]', e)
    return NextResponse.json({ error: 'Nomination failed' }, { status: 500 })
  }
}
