import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
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
  user_id: string
  type: 'market_idea' | 'cause_proposal' | 'ngo_suggestion' | 'general'
  title: string
  description: string | null
  category: string | null
  links: { url: string; label: string }[]
  status: 'pending' | 'reviewed' | 'approved' | 'rejected' | 'published' | 'promoted_to_cause'
  upvotes: number
  created_at: string
  submitter_name: string
}

async function getInboxItems(): Promise<InboxItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('conscious_inbox')
    .select('id, user_id, type, title, description, category, links, status, upvotes, created_at')
    .order('upvotes', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Inbox fetch error:', error)
    return []
  }

  const items = (data || []) as Array<{ user_id: string; [k: string]: unknown }>
  const userIds = [...new Set(items.map((i) => i.user_id))]
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
    submitter_name: names[i.user_id] || 'Anonymous',
  })) as InboxItem[]
}

export default async function InboxPage() {
  const items = await getInboxItems()
  return <InboxClient initialItems={items} />
}
