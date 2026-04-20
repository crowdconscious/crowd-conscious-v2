import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Admin list of sponsor_accounts for the "Brands on landing" toggle in
 * /predictions/admin/sponsors. Returns the columns the toggle UI needs;
 * everything else lives on the existing sponsorships endpoint.
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if (profile?.user_type !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sponsor_accounts')
    .select(
      'id, company_name, contact_email, logo_url, tier, status, total_spent, case_study_featured'
    )
    .order('case_study_featured', { ascending: false })
    .order('total_spent', { ascending: false, nullsFirst: false })
    .limit(200)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ accounts: data ?? [] })
}

/**
 * Toggle case_study_featured for a sponsor_account. Audit §3.2 — never
 * auto-feature on tier; the founder must opt-in per brand to avoid
 * publishing a logo without consent.
 */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()
  if (profile?.user_type !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 })
  }

  let body: { id?: string; case_study_featured?: boolean }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })
  if (typeof body.case_study_featured !== 'boolean') {
    return Response.json(
      { error: 'case_study_featured (boolean) is required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sponsor_accounts')
    .update({ case_study_featured: body.case_study_featured })
    .eq('id', id)
    .select('id, case_study_featured')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ account: data })
}
