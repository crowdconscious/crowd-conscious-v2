import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

/**
 * Gate API routes to admin users. Mirrors the layout-side check in
 * app/admin/layout.tsx (profiles.user_type === 'admin' OR ADMIN_EMAIL match).
 * Returns the user on success or a NextResponse to short-circuit on failure.
 */
export async function requireAdmin(): Promise<
  { ok: true; user: AdminUser } | { ok: false; response: NextResponse }
> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const em = (user as { email?: string | null }).email?.toLowerCase().trim()
  const isAdmin =
    user.user_type === 'admin' || (!!adminEmail && !!em && em === adminEmail)

  if (!isAdmin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, user }
}
