import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import CommentsSection from '../../../../../components/CommentsSection'
import ShareButton from '../../../../../components/ShareButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface ContentDetailPageProps {
  params: Promise<{
    id: string
    contentId: string
  }>
}

async function getContentDetail(contentId: string) {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      *,
      communities (
        id,
        name,
        slug
      ),
      profiles (
        full_name,
        email
      )
    `)
    .eq('id', contentId)
    .single()

  if (error) {
    console.error('Error fetching content:', error)
    return null
  }

  return data
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  const user = await getCurrentUser()
  const { id: communityId, contentId } = await params

  const content = await getContentDetail(contentId)

  if (!content) {
    notFound()
  }

  const contentData = content.data || {}
  const creatorName = content.profiles?.full_name || content.profiles?.email || 'Unknown'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link
            href={`/communities/${communityId}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>←</span>
            <span>Back to {(content.communities as any)?.name}</span>
          </Link>
        </div>

        {/* Content Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`
                px-3 py-1 rounded-full text-xs font-medium
                ${content.type === 'event' ? 'bg-purple-100 text-purple-700' : ''}
                ${content.type === 'poll' ? 'bg-green-100 text-green-700' : ''}
                ${content.type === 'need' ? 'bg-blue-100 text-blue-700' : ''}
                ${content.type === 'challenge' ? 'bg-orange-100 text-orange-700' : ''}
              `}>
                {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
              </div>
              <div className={`
                px-2 py-1 rounded text-xs font-medium
                ${content.status === 'active' ? 'bg-green-100 text-green-700' : ''}
                ${content.status === 'completed' ? 'bg-gray-100 text-gray-700' : ''}
                ${content.status === 'cancelled' ? 'bg-red-100 text-red-700' : ''}
              `}>
                {content.status}
              </div>
            </div>
            
            <ShareButton
              contentId={content.id}
              contentType={content.type as any}
              title={content.title}
              description={content.description}
            />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-3">{content.title}</h1>
          
          {content.description && (
            <p className="text-slate-600 mb-4 leading-relaxed">{content.description}</p>
          )}

          {/* Content Type Specific Details */}
          {content.type === 'event' && (
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-purple-900 mb-2">📅 Event Details</h3>
              <div className="space-y-2 text-sm text-purple-800">
                {contentData.date && (
                  <div><strong>Date:</strong> {new Date(contentData.date).toLocaleDateString()}</div>
                )}
                {contentData.time && (
                  <div><strong>Time:</strong> {contentData.time}</div>
                )}
                {contentData.location && (
                  <div><strong>Location:</strong> {contentData.location}</div>
                )}
                {contentData.max_attendees && (
                  <div><strong>Max Attendees:</strong> {contentData.max_attendees}</div>
                )}
              </div>
            </div>
          )}

          {content.type === 'need' && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Need Details</h3>
              <div className="space-y-2 text-sm text-blue-800">
                {content.funding_goal && (
                  <div><strong>Funding Goal:</strong> ${content.funding_goal.toLocaleString()}</div>
                )}
                {content.current_funding && (
                  <div><strong>Current Funding:</strong> ${content.current_funding.toLocaleString()}</div>
                )}
                {content.voting_deadline && (
                  <div><strong>Voting Deadline:</strong> {new Date(content.voting_deadline).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          )}

          {/* Creator Info */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-sm text-slate-500">
            <span>Created by {creatorName}</span>
            <span>{new Date(content.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">💬 Discussion</h2>
          <CommentsSection contentId={content.id} contentType={content.type} />
        </div>
      </div>
    </div>
  )
}