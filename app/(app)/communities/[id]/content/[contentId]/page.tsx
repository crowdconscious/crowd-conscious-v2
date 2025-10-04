import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import CommentsSection from '../../../../../components/CommentsSection'
import ShareButton from '../../../../../components/ShareButton'
import ContentModerationButtons from './ContentModerationButtons'
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

async function checkUserMembership(communityId: string, userId: string) {
  const { data, error } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

export default async function ContentDetailPage({ params }: ContentDetailPageProps) {
  const user = await getCurrentUser()
  const { id: communityId, contentId } = await params

  const [content, userMembership] = await Promise.all([
    getContentDetail(contentId),
    user ? checkUserMembership(communityId, (user as any).id) : null
  ])

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
            
            <div className="flex items-center gap-2">
              <ShareButton
                contentId={content.id}
                contentType={content.type as any}
                title={content.title}
                description={content.description}
              />
              <ContentModerationButtons
                contentId={content.id}
                contentTitle={content.title}
                communityId={communityId}
                userType={user?.user_type || 'user'}
                userRole={userMembership?.role || null}
              />
            </div>
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

        {/* SPONSORSHIP SECTION - Only for needs with funding goals */}
        {content.type === 'need' && content.funding_goal && (
          <div className="bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 rounded-xl shadow-lg border-2 border-teal-200 p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                  💝 Support This Need
                </h2>
                <p className="text-slate-600">
                  Help make this happen through sponsorship - Individual or Business
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-teal-600">
                  ${(content.current_funding || 0).toLocaleString()} MXN
                </div>
                <div className="text-sm text-slate-600">
                  of ${content.funding_goal.toLocaleString()} MXN goal
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {Math.round((content.current_funding || 0) / content.funding_goal * 100)}% funded
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-4 mb-6 shadow-inner">
              <div 
                className="bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 shadow-md"
                style={{ 
                  width: `${Math.min((content.current_funding || 0) / content.funding_goal * 100, 100)}%` 
                }}
              />
            </div>

            {/* Sponsor Tiers Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-orange-200">
                <div className="text-orange-600 font-semibold mb-1">🥉 Bronze ($1-999)</div>
                <div className="text-xs text-slate-600">Name recognition</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-slate-300">
                <div className="text-slate-600 font-semibold mb-1">🥈 Silver ($1,000-4,999)</div>
                <div className="text-xs text-slate-600">Logo display + reports</div>
              </div>
              <div className="bg-white/80 backdrop-blur rounded-lg p-4 border border-yellow-300">
                <div className="text-yellow-600 font-semibold mb-1">🥇 Gold ($5,000+)</div>
                <div className="text-xs text-slate-600">Prominent logo + website link</div>
              </div>
            </div>

            {/* CTA Button */}
            <Link href={`/communities/${communityId}/content/${content.id}/sponsor`}>
              <button className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white font-bold text-lg py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                💳 Sponsor This Need Now
              </button>
            </Link>

            <p className="text-xs text-center text-slate-500 mt-4">
              Secure payment via Stripe • Tax receipts available for businesses
            </p>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">💬 Discussion</h2>
          <CommentsSection 
            contentId={content.id} 
            contentType={content.type}
            initialUser={user}
          />
        </div>
      </div>
    </div>
  )
}