import { getCurrentUser } from '../../../../../../lib/auth-server'
import { supabase } from '../../../../../../lib/supabase'
import { notFound, redirect } from 'next/navigation'
import ContentCreationForm from './ContentCreationForm'

interface ContentCreationPageProps {
  params: Promise<{
    id: string
  }>
}

interface Community {
  id: string
  name: string
  description: string | null
}

async function getCommunity(id: string): Promise<Community | null> {
  const { data, error } = await supabase
    .from('communities')
    .select('id, name, description')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching community:', error)
    return null
  }

  return data
}

async function checkUserMembership(communityId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()

  if (error) return false
  return true // Any member can create content
}

export default async function ContentCreationPage({ params }: ContentCreationPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  const community = await getCommunity(id)

  if (!community) {
    notFound()
  }

  // Check if user is a member
  const isMember = await checkUserMembership((community as any).id, (user as any).id)
  if (!isMember) {
    redirect(`/communities/${(community as any).id}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Create Content</h1>
            <p className="text-slate-600 mt-2">for {community.name}</p>
          </div>
          
          <Link
            href={`/communities/${community.id}`}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            ← Back to Community
          </Link>
        </div>
        
        <p className="text-slate-600">
          Create needs, events, polls, or challenges for your community. Add images to make your content more engaging.
        </p>
      </div>

      {/* Content Creation Form */}
      <ContentCreationForm community={community} userId={(user as any).id} />
    </div>
  )
}

// Add missing import
import Link from 'next/link'