'use client'

import { useState, useEffect } from 'react'
import { createClientAuth } from '@/lib/auth'
import Link from 'next/link'
import PollVoting from './content/components/PollVoting'
import EventRSVP from './content/components/EventRSVP'
import NeedActivities from './content/components/NeedActivities'
import ShareButton from '@/app/components/ShareButton'

interface Content {
  id: string
  type: 'need' | 'event' | 'challenge' | 'poll'
  title: string
  description: string | null
  image_url: string | null
  data: any
  status: 'draft' | 'voting' | 'approved' | 'active' | 'completed'
  funding_goal: number | null
  current_funding: number
  voting_deadline: string | null
  max_participants: number | null
  location: string | null
  event_date: string | null
  event_time: string | null
  completion_deadline: string | null
  created_at: string
  created_by: string
  profiles: {
    full_name: string | null
    email: string | null
  } | null
  // Related data
  need_activities?: Array<{
    id: string
    title: string
    is_completed: boolean
    completed_by: string | null
  }>
  poll_options?: Array<{
    id: string
    option_text: string
    vote_count: number
  }>
  event_registrations?: Array<{
    id: string
    user_id: string
    status: string
  }>
  user_poll_vote?: Array<{
    poll_option_id: string
  }>
  user_event_registration?: Array<{
    id: string
    status: string
  }>
}

interface ContentListProps {
  communityId: string
  userRole: string | null
}

export default function ContentList({ communityId, userRole }: ContentListProps) {
  const [content, setContent] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  
  const supabase = createClientAuth()

  useEffect(() => {
    fetchContent()

    // Set up real-time subscription for content changes
    const contentChannel = supabase
      .channel(`community_content_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'community_content',
          filter: `community_id=eq.${communityId}`
        },
        (payload) => {
          console.log('🔄 Real-time content update:', payload)
          // Refresh content when any change occurs
          fetchContent()
        }
      )
      .subscribe((status) => {
        console.log('📡 Content subscription status:', status)
      })

    // Also subscribe to external_responses to show external votes in real-time
    const externalChannel = supabase
      .channel(`external_responses_${communityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'external_responses'
        },
        (payload) => {
          console.log('🗳️ External response received:', payload)
          // Refresh content to show updated vote counts
          fetchContent()
        }
      )
      .subscribe((status) => {
        console.log('📡 External responses subscription status:', status)
      })

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔌 Unsubscribing from real-time updates')
      supabase.removeChannel(contentChannel)
      supabase.removeChannel(externalChannel)
    }
  }, [communityId, filter])

  const fetchContent = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      let query = supabase
        .from('community_content')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('type', filter)
      }

      const { data: contentData, error } = await query

      if (error) {
        console.error('Error fetching content:', error)
        setContent([])
      } else if (contentData) {
        // ✅ FIXED: Batch fetch all related data in single queries
        const contentIds = contentData.map((item: any) => item.id)
        const needIds = contentData.filter((item: any) => item.type === 'need').map((item: any) => item.id)
        const pollIds = contentData.filter((item: any) => item.type === 'poll').map((item: any) => item.id)
        const eventIds = contentData.filter((item: any) => item.type === 'event').map((item: any) => item.id)

        // Batch fetch all need activities
        const { data: allNeedActivities } = await (supabase as any)
          .from('need_activities')
          .select('id, content_id, title, is_completed, completed_by, order_index')
          .in('content_id', needIds)
          .order('order_index')

        // Batch fetch all poll options (using RPC for each poll, but we'll optimize this)
        // Note: RPC doesn't support batch, so we'll use direct query as fallback for now
        const { data: allPollOptions } = await (supabase as any)
          .from('poll_options')
          .select('id, content_id, option_text, vote_count, created_at')
          .in('content_id', pollIds)
          .order('created_at')

        // Batch fetch all event registrations
        const { data: allEventRegistrations } = await (supabase as any)
          .from('event_registrations')
          .select('id, content_id, user_id, status')
          .in('content_id', eventIds)

        // Batch fetch user votes for all polls
        let allUserVotes: any[] = []
        if (user && pollIds.length > 0) {
          const { data: votes } = await (supabase as any)
            .from('poll_votes')
            .select('content_id, poll_option_id')
            .in('content_id', pollIds)
            .eq('user_id', user.id)
          allUserVotes = votes || []
        }

        // Batch fetch user event registrations
        let allUserEventRegs: any[] = []
        if (user && eventIds.length > 0) {
          const { data: regs } = await (supabase as any)
            .from('event_registrations')
            .select('id, content_id, status')
            .in('content_id', eventIds)
            .eq('user_id', user.id)
          allUserEventRegs = regs || []
        }

        // Group data by content_id
        const activitiesByContent = new Map<string, any[]>()
        allNeedActivities?.forEach((activity: any) => {
          const contentId = activity.content_id
          if (!activitiesByContent.has(contentId)) {
            activitiesByContent.set(contentId, [])
          }
          activitiesByContent.get(contentId)!.push(activity)
        })

        const pollOptionsByContent = new Map<string, any[]>()
        allPollOptions?.forEach((option: any) => {
          const contentId = option.content_id
          if (!pollOptionsByContent.has(contentId)) {
            pollOptionsByContent.set(contentId, [])
          }
          pollOptionsByContent.get(contentId)!.push({
            id: option.id,
            option_text: option.option_text,
            vote_count: option.vote_count || 0
          })
        })

        const registrationsByContent = new Map<string, any[]>()
        allEventRegistrations?.forEach((reg: any) => {
          const contentId = reg.content_id
          if (!registrationsByContent.has(contentId)) {
            registrationsByContent.set(contentId, [])
          }
          registrationsByContent.get(contentId)!.push(reg)
        })

        const userVotesByContent = new Map<string, any[]>()
        allUserVotes.forEach((vote: any) => {
          const contentId = vote.content_id
          if (!userVotesByContent.has(contentId)) {
            userVotesByContent.set(contentId, [])
          }
          userVotesByContent.get(contentId)!.push(vote)
        })

        const userRegsByContent = new Map<string, any[]>()
        allUserEventRegs.forEach((reg: any) => {
          const contentId = reg.content_id
          userRegsByContent.set(contentId, reg)
        })

        // Map content with related data (no N+1 queries!)
        const enhancedContent = contentData.map((item: any) => {
          let enhancedItem: any = { ...item }
          
          if (item.type === 'need') {
            enhancedItem.need_activities = activitiesByContent.get(item.id) || []
          }
          
          if (item.type === 'poll') {
            enhancedItem.poll_options = pollOptionsByContent.get(item.id) || []
            enhancedItem.user_poll_vote = userVotesByContent.get(item.id) || []
          }
          
          if (item.type === 'event') {
            enhancedItem.event_registrations = registrationsByContent.get(item.id) || []
            enhancedItem.user_event_registration = userRegsByContent.get(item.id) || []
          }
          
          return enhancedItem
        })
        
        setContent(enhancedContent as Content[])
      }
    } catch (error) {
      console.error('Content fetch exception:', error)
      setContent([])
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'need': return '💡'
      case 'event': return '📅'
      case 'challenge': return '🏆'
      case 'poll': return '🗳️'
      default: return '📄'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700'
      case 'voting': return 'bg-blue-100 text-blue-700'
      case 'approved': return 'bg-green-100 text-green-700'
      case 'active': return 'bg-purple-100 text-purple-700'
      case 'completed': return 'bg-slate-100 text-slate-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isVotingDeadlinePassed = (deadline: string | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  // Filter content based on selected filter
  const filteredContent = content.filter(item => {
    if (filter === 'all') return true
    if (filter === 'sponsorable') {
      return item.type === 'need' && item.funding_goal && (item.current_funding || 0) < item.funding_goal
    }
    return item.type === filter
  })

  if (loading) {
    return <div className="text-center py-8">Loading content...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 bg-slate-100 p-2 rounded-lg">
        {[
          { key: 'all', label: 'All', icon: '📋' },
          { key: 'need', label: 'Needs', icon: '💡' },
          { key: 'sponsorable', label: '💝 Needs Sponsorship', icon: '💰' },
          { key: 'event', label: 'Events', icon: '📅' },
          { key: 'challenge', label: 'Challenges', icon: '🏆' },
          { key: 'poll', label: 'Polls', icon: '🗳️' }
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? key === 'sponsorable'
                  ? 'bg-gradient-to-r from-teal-600 to-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create Button */}
      {userRole && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-900">
            Community Content ({filteredContent.length} {filter !== 'all' ? `of ${content.length}` : ''})
          </h3>
          <Link
            href={`/communities/${communityId}/content/new`}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Create Content
          </Link>
        </div>
      )}

      {/* Content Grid */}
      {filteredContent.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContent.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getTypeIcon(item.type)}</span>
                  <span className="text-sm font-medium capitalize text-slate-700">
                    {item.type}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>

              <h4 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                {item.title}
              </h4>

              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {item.description}
              </p>

              {/* Funding Progress for Needs - SPONSOR BUTTON */}
              {item.type === 'need' && item.funding_goal && (
                <div className="mb-4 p-3 bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                  <div className="flex justify-between text-xs text-slate-700 font-medium mb-2">
                    <span>💰 ${(item.current_funding || 0).toLocaleString()} raised</span>
                    <span>Goal: ${item.funding_goal.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${Math.min((item.current_funding || 0) / item.funding_goal * 100, 100)}%` 
                      }}
                    />
                  </div>
                  <Link 
                    href={`/communities/${communityId}/content/${item.id}`}
                    className="block w-full text-center bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    💝 Sponsor This Need
                  </Link>
                </div>
              )}

              {/* Enhanced Type-Specific Content */}
              {item.type === 'need' && (
                <NeedActivities
                  contentId={item.id}
                  activities={item.need_activities || []}
                  fundingGoal={item.funding_goal}
                  currentFunding={item.current_funding}
                  onUpdate={fetchContent}
                />
              )}

              {item.type === 'event' && (
                <EventRSVP
                  contentId={item.id}
                  maxParticipants={item.max_participants}
                  eventRegistrations={item.event_registrations || []}
                  userRegistration={item.user_event_registration || null}
                  eventDate={item.event_date}
                  location={item.location}
                  onUpdate={fetchContent}
                />
              )}

              {item.type === 'poll' && item.poll_options && (
                <PollVoting
                  contentId={item.id}
                  pollOptions={item.poll_options}
                  userVote={item.user_poll_vote || null}
                  pollType={item.data?.poll_type || 'multiple_choice'}
                  onVoteUpdate={fetchContent}
                />
              )}

              {item.type === 'challenge' && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <h4 className="font-medium text-slate-900 mb-2">Challenge Details</h4>
                  <p className="text-sm text-slate-600">
                    Challenge participation features coming soon!
                  </p>
                </div>
              )}

              {/* Voting Deadline */}
              {item.voting_deadline && (
                <div className={`text-xs mt-3 mb-3 ${
                  isVotingDeadlinePassed(item.voting_deadline) 
                    ? 'text-red-600' 
                    : 'text-slate-500'
                }`}>
                  Voting deadline: {formatDate(item.voting_deadline)}
                  {isVotingDeadlinePassed(item.voting_deadline) && ' (Expired)'}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/communities/${communityId}/content/${item.id}`}
                    className="flex items-center gap-1 text-teal-600 hover:text-teal-700 text-sm font-medium transition-colors"
                  >
                    <span>💬</span>
                    <span>Discussion</span>
                  </Link>
                  <ShareButton
                    contentId={item.id}
                    contentType={item.type}
                    title={item.title}
                    description={item.description || undefined}
                  />
                </div>
                <div className="text-xs text-slate-500">
                  <div>By {item.profiles?.full_name || item.profiles?.email || 'Unknown'}</div>
                  <div>{formatDate(item.created_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📝</div>
          <h4 className="text-lg font-semibold text-slate-900 mb-2">No content yet</h4>
          <p className="text-slate-600 mb-4">
            {filter === 'all' 
              ? 'Be the first to create content for this community!'
              : `No ${filter}s have been created yet.`
            }
          </p>
          {userRole && (
            <Link
              href={`/communities/${communityId}/content/new`}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Create First Content
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
