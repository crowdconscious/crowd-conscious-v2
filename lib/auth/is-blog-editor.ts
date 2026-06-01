import { isAdminUser, type AdminCheckSubject } from '@/lib/auth/is-admin'

/**
 * Blog editor policy — narrower than full admin.
 *
 * Grants create/read/update access to blog posts (and the supporting
 * upload / pulse-picker / TL;DR APIs) without exposing markets,
 * sponsors, agents, signals triage, etc.
 *
 *   1. Admins (`isAdminUser`) — unchanged, full platform admin.
 *   2. `profiles.user_type === 'influencer'` — blog CRUD on own posts
 *      (`blog_posts.author_id = auth.uid()` via RLS + API guards).
 *
 * Set `user_type` to `influencer` in Supabase Dashboard (Table Editor
 * → profiles) after the RLS migration in
 * `supabase/migrations/223_influencer_blog_editor.sql` is applied.
 */
export type BlogEditorCheckSubject = AdminCheckSubject

export function isBlogEditorUser(subject: BlogEditorCheckSubject): boolean {
  if (!subject) return false
  if (isAdminUser(subject)) return true
  return subject.user_type === 'influencer'
}
