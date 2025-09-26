'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { getCurrentUser } from '@/lib/auth-server'
import { CommentsSection } from '@/components/DiscussionSystem'
import { AnimatedButton, AnimatedCard, useToast } from '@/components/ui/UIComponents'

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

export default function ContentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [content, setContent] = useState<Content | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  // const { addToast } = useToast() // Enable when ToastProvider is global

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get current user
        const currentUser = await getCurrentUser()
        setUser(currentUser)

        // Fetch content details
        const { data: contentData, error: contentError } = await supabaseClient
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
          .eq('id', params.contentId)
          .single()

        if (contentError) {
          console.error('Error fetching content:', contentError)
          return
        }

        setContent(contentData)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.contentId])

  const handleShare = async () => {
    setSharing(true)
    try {
      // Create a shareable link
      const { data, error } = await supabaseClient
        .from('share_links')
        .insert({
          content_id: params.contentId,
          type: content?.type || 'post',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating share link:', error)
        // addToast('Failed to create share link', 'error')
        return
      }

      const shareUrl = `${window.location.origin}/share/${data.token}`
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl)
      // addToast('Share link copied to clipboard!', 'success')
      
    } catch (error) {
      console.error('Error sharing:', error)
      // addToast('Failed to share content', 'error')
    } finally {
      setSharing(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'need': return '🆘'
      case 'event': return '📅'
      case 'challenge': return '🏆'
      case 'poll': return '📊'
      default: return '📝'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'voting': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <AnimatedCard>
          <div className="space-y-4">
            <div className="h-8 w-3/4 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </AnimatedCard>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <AnimatedCard>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Content Not Found</h1>
            <p className="text-slate-600 mb-6">The content you're looking for doesn't exist or has been removed.</p>
            <AnimatedButton onClick={() => router.back()}>
              Go Back
            </AnimatedButton>
          </div>
        </AnimatedCard>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Content Header */}
      <AnimatedCard>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getTypeIcon(content.type)}</span>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{content.title}</h1>
              <p className="text-slate-600">
                in <span className="font-medium">{content.communities?.name}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(content.status)}`}>
              {content.status}
            </span>
            <AnimatedButton
              onClick={handleShare}
              variant="secondary"
              size="sm"
              loading={sharing}
            >
              📤 Share
            </AnimatedButton>
          </div>
        </div>

        {content.image_url && (
          <img
            src={content.image_url}
            alt={content.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}

        <div className="prose max-w-none">
          <p className="text-slate-700 text-lg leading-relaxed">{content.description}</p>
        </div>

        {/* Type-specific details */}
        {content.type === 'need' && content.funding_goal && (
          <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h3 className="font-semibold text-teal-800 mb-2">Funding Goal</h3>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-teal-700">
                ${content.current_funding} / ${content.funding_goal}
              </span>
              <div className="flex-1 bg-teal-200 rounded-full h-3">
                <div
                  className="bg-teal-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (content.current_funding / content.funding_goal) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>
            Created by {content.profiles?.full_name || content.profiles?.email || 'Unknown'} on{' '}
            {new Date(content.created_at).toLocaleDateString()}
          </span>
          <AnimatedButton variant="ghost" size="sm" onClick={() => router.back()}>
            ← Back to Community
          </AnimatedButton>
        </div>
      </AnimatedCard>

      {/* Comments Section */}
      {user && (
        <CommentsSection
          contentId={content.id}
          userId={user.id}
        />
      )}

      {!user && (
        <AnimatedCard>
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Join the Discussion</h3>
            <p className="text-slate-600 mb-4">Sign in to comment and participate in discussions.</p>
            <AnimatedButton onClick={() => router.push('/login')}>
              Sign In
            </AnimatedButton>
          </div>
        </AnimatedCard>
      )}
    </div>
  )
}
