import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns current anonymous participant when cc_session cookie is valid. */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('cc_session')?.value
    if (!sessionId || !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ participant: null })
    }

    const supabase = await createClient()
    const { data: participant } = await supabase
      .from('anonymous_participants')
      .select('id, session_id, alias, avatar_emoji, total_xp, total_votes')
      .eq('session_id', sessionId)
      .is('converted_to_user_id', null)
      .maybeSingle()

    return NextResponse.json({ participant })
  } catch (e) {
    console.error('[anonymous-session]', e)
    return NextResponse.json({ participant: null })
  }
}
