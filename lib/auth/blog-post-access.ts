import { isAdminUser, type AdminCheckSubject } from '@/lib/auth/is-admin'

export type BlogPostOwnerRow = {
  author_id?: string | null
}

/**
 * Whether this profile may create/update/delete the given post.
 * Admins: all posts. Influencers: only posts they authored.
 * Legacy posts with null author_id are admin-only.
 */
export function canManageBlogPost(
  profile: AdminCheckSubject,
  userId: string,
  post: BlogPostOwnerRow
): boolean {
  if (isAdminUser(profile)) return true
  if (profile?.user_type === 'influencer') {
    return !!post.author_id && post.author_id === userId
  }
  return false
}

/** Influencer blog editor without full admin privileges. */
export function isInfluencerOnlyBlogEditor(profile: AdminCheckSubject): boolean {
  if (!profile || isAdminUser(profile)) return false
  return profile.user_type === 'influencer'
}
