'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { CommentsSection } from '@/components/DiscussionSystem'
import { AnimatedButton, AnimatedCard } from '@/components/ui/UIComponents'
import ShareButton from '@/components/ShareButton'
import DashboardNavigation from '@/components/DashboardNavigation'

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

interface ContentDetailClientProps {
  content: Content
  user: any
  communityId: string
}

export default function ContentDetailClient({ content, user, communityId }: ContentDetailClientProps) {
  const router = useRouter()

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <DashboardNavigation customBackPath={`/communities/${communityId}`} customBackLabel="Back to Community" />
      
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
            <ShareButton
              contentId={content.id}
              contentType={content.type}
              title={content.title}
              description={content.description || undefined}
              variant="secondary"
              size="sm"
            />
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
          currentUserId={(user as any).id}
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
