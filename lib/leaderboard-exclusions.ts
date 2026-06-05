import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Admin/staff exclusion policy for public XP leaderboards.
 *
 * Mirrors the mobile app (`src/lib/leaderboardFilter.ts`). The founder /
 * super-admin profile has `user_type === 'user'` (NOT 'admin') and instead
 * carries `admin_level === 'super'`, so the `isAdminUser` (user_type / email)
 * signal alone does NOT hide them. We additionally exclude explicit staff
 * `admin_level` tiers.
 *
 * This is a read/display filter only — it never mutates roles or XP.
 */

export type ProfileRoleRow = {
  id: string
  user_type: string | null
  admin_level: string | null
}

/**
 * `admin_level` values that hide a profile from public leaderboards.
 * `super` is the real DB value for the founder; `super_admin` is kept as a
 * synonym for safety. `standard` is intentionally NOT staff.
 */
const LEADERBOARD_STAFF_ADMIN_LEVELS = new Set(['moderator', 'super', 'super_admin'])

/**
 * Returns true if a profile should be hidden from public leaderboards.
 * Excludes if `user_type === 'admin'` (matches web `isAdminUser`) OR the
 * `admin_level` is an explicit staff tier (catches the super-admin founder).
 */
export function isLeaderboardExcludedRole(role: {
  user_type: string | null
  admin_level: string | null
}): boolean {
  if (role.user_type === 'admin') return true
  const level = role.admin_level?.trim()
  if (!level) return false
  return LEADERBOARD_STAFF_ADMIN_LEVELS.has(level)
}

/**
 * Fetch `id, user_type, admin_level` for the given user ids and index them by
 * id. The `leaderboard_view` does not expose roles, so callers fetch them
 * separately to apply {@link isLeaderboardExcludedRole}.
 */
export async function fetchProfileRolesByUserIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileRoleRow>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_type, admin_level')
    .in('id', uniqueIds)

  if (error) throw new Error(error.message)

  const map = new Map<string, ProfileRoleRow>()
  for (const row of (data ?? []) as ProfileRoleRow[]) {
    map.set(row.id, {
      id: row.id,
      user_type: row.user_type,
      admin_level: row.admin_level,
    })
  }
  return map
}

/**
 * Drop entries whose profile role is excluded. Entries without a fetched role
 * are kept (fail-open: a missing role should never hide a real member).
 */
export function filterLeaderboardExcluded<T extends { user_id: string }>(
  entries: T[],
  rolesByUserId: Map<string, ProfileRoleRow>
): T[] {
  return entries.filter((entry) => {
    const role = rolesByUserId.get(entry.user_id)
    if (!role) return true
    return !isLeaderboardExcludedRole(role)
  })
}
