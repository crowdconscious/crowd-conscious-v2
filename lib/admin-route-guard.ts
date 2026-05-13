import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdminUser } from '@/lib/auth/is-admin'

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

/**
 * Gate API routes to admin users using the shared `isAdminUser` policy
 * (`profiles.user_type === 'admin'` OR `ADMIN_EMAIL` match). Returns the
 * user on success or a NextResponse to short-circuit on failure.
 *
 * See lib/auth/is-admin.ts for the canonical policy definition.
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

  if (!isAdminUser(user)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, user }
}
