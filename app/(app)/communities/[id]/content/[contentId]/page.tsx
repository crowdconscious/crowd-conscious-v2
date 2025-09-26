import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import ContentDetailClient from './ContentDetailClient'

interface Content {
  id: string
  type: 'need' | 'event' | 'challenge' | 'poll'
  title: string
  description: string | null
  image_url: string | null
  status: 'draft' | 'voting' | 'approved' | 'active' | 'completed'
  funding_goal: number | null
  current_funding: number
  created_at: string
  created_by: string
  community_id: string
  profiles: {
    full_name: string | null
    email: string | null
  } | null
  communities: {
    name: string
  } | null
}

async function getContent(contentId: string): Promise<Content | null> {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      *,
      profiles (
        full_name,
        email
      ),
      communities (
        name
      )
    `)
    .eq('id', contentId)
    .single()

  if (error) {
    console.error('Error fetching content:', error)
    return null
  }

  return data as Content
}

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string; contentId: string }>
}) {
  const user = await getCurrentUser()
  const { id: communityId, contentId } = await params
  
  const content = await getContent(contentId)

  if (!content) {
    notFound()
  }

  return (
    <ContentDetailClient
      content={content}
      user={user}
      communityId={communityId}
    />
  )
}