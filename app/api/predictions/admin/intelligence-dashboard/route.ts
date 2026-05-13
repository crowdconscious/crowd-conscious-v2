import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { fetchIntelligenceDashboard } from '@/lib/intelligence-data'
import { isAdminUser } from '@/lib/auth/is-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .single()

  if (!isAdminUser(profile)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const includeArchived = request.nextUrl.searchParams.get('includeArchived') === '1'
  const data = await fetchIntelligenceDashboard({ includeArchived })
  return NextResponse.json(data)
}
