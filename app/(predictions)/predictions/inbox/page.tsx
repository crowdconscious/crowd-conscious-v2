import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { InboxClient } from './InboxClient'
import { SITE_URL } from '@/lib/seo/site'

export const metadata: Metadata = {
  title: { absolute: 'Buzón Consciente | Crowd Conscious' },
  alternates: {
    canonical: `${SITE_URL}/predictions/inbox`,
  },
}

export type InboxItem = {
  id: string
  user_id: string | null
  type:
    | 'market_idea'
    | 'cause_proposal'
    | 'ngo_suggestion'
    | 'general'
    | 'location_nomination'
    /**
     * Posted by the sponsor dashboard via /api/inbox/nominate. Same admin /
     * promote flow as consumer-side rows; the type just controls the badge.
     */
    | 'cause_suggestion_municipal'
  title: string
  description: string | null
  category: string | null
  links: { url: string; label: string }[]
  status: 'pending' | 'reviewed' | 'approved' | 'rejected' | 'published' | 'promoted_to_cause'
  upvotes: number
  created_at: string
  submitter_name: string
  archived_at: string | null
}

async function getInboxItems(includeArchived: boolean): Promise<InboxItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from('conscious_inbox')
    .select(
      'id, user_id, type, title, description, category, links, status, upvotes, created_at, archived_at'
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (!includeArchived) {
    query = query.is('archived_at', null)
  }

  const { data, error } = await query

  if (error) {
    console.error('Inbox fetch error:', error)
    return []
  }

  const items = (data || []) as Array<{ user_id: string; [k: string]: unknown }>
  const userIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))] as string[]
  const names: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    for (const p of profiles || []) {
      const profile = p as { id: string; full_name: string | null }
      names[profile.id] = profile.full_name || profile.id.slice(0, 8) + '...'
    }
  }

  return items.map((i) => ({
    ...i,
    links: Array.isArray(i.links) ? i.links : [],
    submitter_name:
      i.user_id && names[i.user_id as string] ? names[i.user_id as string] : 'Anonymous',
  })) as InboxItem[]
}

async function detectAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type, email')
    .eq('id', user.id)
    .maybeSingle()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const profileEmail = (profile?.email as string | null)?.toLowerCase().trim() ?? null
  return (
    profile?.user_type === 'admin' ||
    (!!adminEmail && !!profileEmail && profileEmail === adminEmail)
  )
}

export default async function InboxPage() {
  const isAdmin = await detectAdmin()
  // Non-admins never see archived rows. Admins get the live queue by default
  // and can flip the in-page toggle (which re-fetches via the API) to inspect
  // archived history without leaving this view.
  const items = await getInboxItems(false)
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-cc-border bg-cc-card/80 p-8 text-center text-cc-text-secondary">
          Loading…
        </div>
      }
    >
      <InboxClient initialItems={items} isAdmin={isAdmin} />
    </Suspense>
  )
}
