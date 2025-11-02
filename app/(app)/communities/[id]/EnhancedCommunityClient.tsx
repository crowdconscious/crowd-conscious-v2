'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ImmersiveHeader from '../../../components/community/ImmersiveHeader'
import EnhancedContentGrid from '../../../components/community/EnhancedContentGrid'
import { ToastProvider, useToast } from '../../../components/ui/Toast'
//import { Confetti, useConfetti } from '../../../components/ui/Confetti'
//import { BottomSheet, useBottomSheet } from '../../../components/ui/BottomSheet'
import { SwipeableTabs } from '../../../components/ui/SwipeableTabs'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { createClientAuth } from '@/lib/auth'
import { cn } from '@/lib/design-system'

interface Community {
  id: string
  name: string
  description: string | null
  image_url: string | null
  address: string | null
  core_values: string[]
  member_count: number
  creator_id: string
  created_at: string
}

interface Member {
  id: string
  role: 'founder' | 'admin' | 'member'
  joined_at: string
  profiles: {
    full_name: string | null
    email: string | null
    avatar_url?: string | null
  } | null
}

interface ContentItem {
  id: string
  type: 'need' | 'event' | 'challenge' | 'poll'
  title: string
  description: string | null
  image_url: string | null
  status: 'draft' | 'voting' | 'approved' | 'active' | 'completed'
  funding_goal: number | null
  current_funding: number
  created_at: string
  created_by_name: string
  engagement_metrics: {
    votes: number
    rsvps: number
    completions: number
    comments: number
  }
}

interface EnhancedCommunityClientProps {
  community: Community
  members: Member[]
  content: ContentItem[]
  userMembership: { role: string } | null
  stats: {
    total_content: number
    needs: number
    events: number
    polls: number
    challenges: number
  }
  currentUser: any
}

function EnhancedCommunityContent({
  community,
  members,
  content,
  userMembership,
  stats,
  currentUser
}: EnhancedCommunityClientProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientAuth()
  const { addToast } = useToast()
  // const { trigger: confettiTrigger, fire: fireConfetti } = useConfetti()
  // const contentSheet = useBottomSheet()
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Pull to refresh functionality
  const handlePullToRefresh = async () => {
    if (isRefreshing) return
    
    setIsRefreshing(true)
    addToast({
      type: 'info',
      title: 'Refreshing community data...',
      duration: 2000
    })
    
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Refresh the page data
    router.refresh()
    
    setIsRefreshing(false)
    addToast({
      type: 'success',
      title: 'Community data refreshed!',
      duration: 2000
    })
  }

  // Join community function
  const handleJoinCommunity = async () => {
    if (!currentUser || joinLoading) return

    setJoinLoading(true)
    
    try {
      // Insert membership into community_members table
      const { data, error } = await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: currentUser.id,
          role: 'member',  // Default role
          voting_power: 1  // Default voting power for members
        })
        .select()
        .single()

      if (error) {
        // Check if already a member
        if (error.code === '23505') { // Unique constraint violation
          addToast({
            type: 'info',
            title: 'Already a member',
            description: 'You are already part of this community.',
          })
        } else {
          console.error('Error joining community:', error)
          addToast({
            type: 'error',
            title: 'Failed to join community',
            description: error.message || 'Please try again later.',
          })
        }
        setJoinLoading(false)
        return
      }

      // fireConfetti()
      addToast({
        type: 'success',
        title: 'Welcome to the community!',
        description: 'You are now a member and can participate in activities.',
        duration: 5000
      })

      // Refresh after short delay to show success message
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (error) {
      console.error('Error joining community:', error)
      addToast({
        type: 'error',
        title: 'Failed to join community',
        description: 'Please try again later.',
      })
      setJoinLoading(false)
    }
  }

  // Handle content actions (vote, RSVP, support)
  const handleContentAction = async (actionType: string, contentId: string) => {
    if (!currentUser || !userMembership) {
      addToast({
        type: 'warning',
        title: 'Join required',
        description: 'You need to join this community to participate.',
      })
      return
    }

    // Simulate action with optimistic UI
    addToast({
      type: 'success',
      title: `${actionType} recorded!`,
      description: `Your ${actionType.toLowerCase()} has been saved.`,
    })

    // fireConfetti()
  }

  // Handle content creation
  const handleCreateContent = () => {
    if (!userMembership) {
      addToast({
        type: 'warning',
        title: 'Join required',
        description: 'You need to join this community to create content.',
      })
      return
    }

    // On mobile, open bottom sheet; on desktop, navigate
    if (window.innerWidth < 768) {
      // contentSheet.open()
      router.push(`/communities/${community.id}/content/new`)
    } else {
      router.push(`/communities/${community.id}/content/new`)
    }
  }

  // Touch handlers for pull-to-refresh
  const touchStartY = useRef<number>(0)
  const touchCurrentY = useRef<number>(0)
  const isDragging = useRef<boolean>(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isDragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return
    touchCurrentY.current = e.touches[0].clientY
  }

  const handleTouchEnd = () => {
    if (!isDragging.current) return
    
    const deltaY = touchCurrentY.current - touchStartY.current
    const threshold = 100 // Minimum pull distance

    if (deltaY > threshold && window.scrollY === 0) {
      handlePullToRefresh()
    }

    isDragging.current = false
  }

  // Prepare tabs for mobile view
  const mobileTabs = [
    {
      id: 'content',
      label: 'Content',
      icon: '📄',
      badge: stats.total_content,
      content: (
        <div className="p-4">
          <EnhancedContentGrid
            content={content}
            userRole={userMembership?.role || null}
            onContentAction={handleContentAction}
            onCreateContent={handleCreateContent}
          />
        </div>
      )
    },
    {
      id: 'members',
      label: 'Members',
      icon: '👥',
      badge: members.length,
      content: (
        <div className="p-4 space-y-4">
          <h3 className="text-lg font-semibold text-neutral-900">
            Community Members ({members.length})
          </h3>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-neutral-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {member.profiles?.avatar_url ? (
                    <img
                      src={member.profiles.avatar_url}
                      alt={member.profiles.full_name || 'Member'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    (member.profiles?.full_name || member.profiles?.email || '?')[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">
                    {member.profiles?.full_name || member.profiles?.email || 'Unknown Member'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {member.role}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'impact',
      label: 'Impact',
      icon: '📊',
      content: (
        <div className="p-4 space-y-6">
          <h3 className="text-lg font-semibold text-neutral-900">Impact Dashboard</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">{stats.needs}</div>
              <div className="text-sm text-blue-700">Needs</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">{stats.events}</div>
              <div className="text-sm text-purple-700">Events</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
              <div className="text-2xl font-bold text-green-600">{stats.polls}</div>
              <div className="text-sm text-green-700">Polls</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">{stats.challenges}</div>
              <div className="text-sm text-orange-700">Challenges</div>
            </div>
          </div>
          <div className="text-center py-8 text-neutral-500">
            <div className="text-4xl mb-2">🚧</div>
            <p>Detailed impact metrics coming soon!</p>
          </div>
        </div>
      )
    }
  ]

  return (
    <div 
      className="min-h-screen bg-neutral-50 dark:bg-neutral-900"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-full p-3 shadow-lg border">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      )}

     
      {/* Confetti - Temporarily disabled for deployment */}
      {/* <Confetti trigger={confettiTrigger} /> */}

      {/* Immersive Header */}
      <ImmersiveHeader
        community={community}
        members={members}
        userMembership={userMembership}
        onJoinCommunity={handleJoinCommunity}
      >
        {userMembership && (
          <Button
            variant="ghost"
            size="lg"
            onClick={handleCreateContent}
            className="bg-white/20 border border-white/30 text-white hover:bg-white/30"
            leftIcon="✨"
          >
            Create Content
          </Button>
        )}
      </ImmersiveHeader>

      {/* Desktop Content */}
      <div className="hidden md:block max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Community Activity
            </h2>
            <div className="flex items-center gap-4">
              {userMembership && (
                <Button
                  onClick={handleCreateContent}
                  leftIcon="+"
                  variant="primary"
                >
                  Create Content
                </Button>
              )}
              <Button
                onClick={handlePullToRefresh}
                variant="ghost"
                size="sm"
                loading={isRefreshing}
                leftIcon="🔄"
              >
                Refresh
              </Button>
            </div>
          </div>
          
          <EnhancedContentGrid
            content={content}
            userRole={userMembership?.role || null}
            onContentAction={handleContentAction}
            onCreateContent={handleCreateContent}
          />
        </div>
      </div>

      {/* Mobile Swipeable Tabs */}
      <div className="md:hidden pb-6">
        <SwipeableTabs
          tabs={mobileTabs}
          defaultTab="content"
          className="mt-6"
        />
      </div>

       {/* Mobile Content Creation Bottom Sheet - Temporarily disabled for deployment */}
      {/* 
      <BottomSheet
        isOpen={contentSheet.isOpen}
        onClose={contentSheet.close}
        title="Create New Content"
        snapPoints={[90]}
      >
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Link
              href={`/communities/${community.id}/content/new?type=need`}
              className="p-4 bg-blue-50 rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors"
              onClick={contentSheet.close}
            >
              <div className="text-2xl mb-2">💡</div>
              <div className="font-semibold text-blue-900">Need</div>
              <div className="text-sm text-blue-700">Request community support</div>
            </Link>
            
            <Link
              href={`/communities/${community.id}/content/new?type=event`}
              className="p-4 bg-purple-50 rounded-xl border border-purple-200 hover:bg-purple-100 transition-colors"
              onClick={contentSheet.close}
            >
              <div className="text-2xl mb-2">📅</div>
              <div className="font-semibold text-purple-900">Event</div>
              <div className="text-sm text-purple-700">Organize an activity</div>
            </Link>
            
            <Link
              href={`/communities/${community.id}/content/new?type=poll`}
              className="p-4 bg-green-50 rounded-xl border border-green-200 hover:bg-green-100 transition-colors"
              onClick={contentSheet.close}
            >
              <div className="text-2xl mb-2">🗳️</div>
              <div className="font-semibold text-green-900">Poll</div>
              <div className="text-sm text-green-700">Get community input</div>
            </Link>
            
            <Link
              href={`/communities/${community.id}/content/new?type=challenge`}
              className="p-4 bg-orange-50 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors"
              onClick={contentSheet.close}
            >
              <div className="text-2xl mb-2">🏆</div>
              <div className="font-semibold text-orange-900">Challenge</div>
              <div className="text-sm text-orange-700">Start a competition</div>
            </Link>
          </div>
          
          <div className="pt-4 border-t border-neutral-200">
            <Button
              variant="outline"
              fullWidth
              onClick={contentSheet.close}
            >
              Cancel
            </Button>
          </div>
        </div>
      </BottomSheet>
      */}

      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <Link
            href="/communities"
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 font-medium flex items-center gap-2"
          >
            ← Back to Communities
          </Link>
          <Link
            href="/dashboard"
            className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 font-medium"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function EnhancedCommunityClient(props: EnhancedCommunityClientProps) {
  return (
    <ToastProvider>
      <EnhancedCommunityContent {...props} />
    </ToastProvider>
  )
}
