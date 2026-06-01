import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isBlogEditorUser } from '@/lib/auth/is-blog-editor'

type BlogEditorUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

/**
 * Gate blog CRUD API routes to admins and influencers (`user_type =
 * 'influencer'`). Returns the user on success or a NextResponse to
 * short-circuit on failure.
 */
export async function requireBlogEditor(): Promise<
  { ok: true; user: BlogEditorUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!isBlogEditorUser(user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, user }
}
