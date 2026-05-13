import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createSignalsAdminClient } from '@/lib/signals/supabase'
import { isAdminUser } from '@/lib/auth/is-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin: update a citizen_target row. MVP scope: notification_email + any
 * metadata tweak the admin needs to land before issuing a magic-link.
 */

async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' as const, status: 401 }
  const admin = createSignalsAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .single()
  if (!isAdminUser(profile)) return { error: 'Admin only' as const, status: 403 }
  return { user, admin }
}

const patchSchema = z.object({
  notification_email: z
    .string()
    .trim()
    .email()
    .max(320)
    .nullable()
    .optional(),
  display_name: z.string().trim().min(2).max(200).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { admin } = auth
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  }
  const { data, error } = await admin
    .from('citizen_targets')
    .select('id, slug, display_name, target_kind, notification_email, metadata, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const { admin } = auth
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  }
  const json = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.notification_email !== undefined) {
    updates.notification_email = parsed.data.notification_email
  }
  if (parsed.data.display_name !== undefined) {
    updates.display_name = parsed.data.display_name
  }

  const { error } = await admin
    .from('citizen_targets')
    .update(updates)
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
