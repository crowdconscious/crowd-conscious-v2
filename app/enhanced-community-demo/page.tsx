'use client'

import { ToastProvider } from '../components/ui'
import ImmersiveHeader from '../components/community/ImmersiveHeader'
import EnhancedContentGrid from '../components/community/EnhancedContentGrid'
import { useState } from 'react'

// Mock data for demonstration
const mockCommunity = {
  id: 'demo-community-id',
  name: 'Green Valley Sustainability Hub',
  description: 'A vibrant community dedicated to environmental conservation, renewable energy adoption, and sustainable living practices in our local area.',
  image_url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=600&fit=crop',
  address: 'Green Valley, California',
  core_values: ['Clean Energy', 'Zero Waste', 'Community Gardens', 'Water Conservation', 'Local Economy'],
  member_count: 247,
  creator_id: 'creator-id',
  created_at: '2024-01-15T10:00:00Z'
}

const mockMembers = [
  {
    id: 'member-1',
    role: 'founder' as const,
    joined_at: '2024-01-15T10:00:00Z',
    profiles: {
      full_name: 'Sarah Johnson',
      email: 'sarah@greenvalley.org',
      avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b812c32c?w=100&h=100&fit=crop&crop=face'
    }
  },
  {
    id: 'member-2',
    role: 'admin' as const,
    joined_at: '2024-01-16T14:30:00Z',
    profiles: {
      full_name: 'Marcus Chen',
      email: 'marcus@greenvalley.org',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    }
  },
  {
    id: 'member-3',
    role: 'member' as const,
    joined_at: '2024-01-20T09:15:00Z',
    profiles: {
      full_name: 'Elena Rodriguez',
      email: 'elena.r@email.com',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    }
  },
  {
    id: 'member-4',
    role: 'member' as const,
    joined_at: '2024-01-22T16:45:00Z',
    profiles: {
      full_name: 'David Thompson',
      email: 'david.t@email.com',
      avatar_url: null
    }
  },
  {
    id: 'member-5',
    role: 'member' as const,
    joined_at: '2024-01-25T11:20:00Z',
    profiles: {
      full_name: 'Aisha Patel',
      email: 'aisha.p@email.com',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face'
    }
  }
]

const mockContent = [
  {
    id: 'content-1',
    type: 'need' as const,
    title: 'Community Solar Panel Installation',
    description: 'We need funding and volunteers to install solar panels on our community center roof. This will reduce our energy costs and demonstrate renewable energy to the neighborhood.',
    image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&h=400&fit=crop',
    status: 'active' as const,
    funding_goal: 15000,
    current_funding: 8750,
    created_at: '2024-12-01T10:00:00Z',
    created_by_name: 'Sarah Johnson',
    engagement_metrics: {
      votes: 23,
      rsvps: 0,
      completions: 3,
      comments: 12
    }
  },
  {
    id: 'content-2',
    type: 'event' as const,
    title: 'Monthly Community Garden Workday',
    description: 'Join us for our monthly community garden maintenance! We\'ll be planting winter vegetables, composting, and preparing beds for spring.',
    image_url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=400&fit=crop',
    status: 'active' as const,
    funding_goal: null,
    current_funding: 0,
    created_at: '2024-12-02T14:30:00Z',
    created_by_name: 'Marcus Chen',
    engagement_metrics: {
      votes: 0,
      rsvps: 18,
      completions: 0,
      comments: 7
    }
  },
  {
    id: 'content-3',
    type: 'poll' as const,
    title: 'Which Sustainability Workshop Should We Host Next?',
    description: 'Help us decide what topic to focus on for our next educational workshop. Your input shapes our community programming!',
    image_url: null,
    status: 'voting' as const,
    funding_goal: null,
    current_funding: 0,
    created_at: '2024-12-03T09:15:00Z',
    created_by_name: 'Elena Rodriguez',
    engagement_metrics: {
      votes: 47,
      rsvps: 0,
      completions: 0,
      comments: 15
    }
  },
  {
    id: 'content-4',
    type: 'challenge' as const,
    title: '30-Day Plastic-Free Challenge',
    description: 'Can you go 30 days without single-use plastics? Track your progress and share tips with the community!',
    image_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=600&h=400&fit=crop',
    status: 'active' as const,
    funding_goal: null,
    current_funding: 0,
    created_at: '2024-11-28T16:45:00Z',
    created_by_name: 'David Thompson',
    engagement_metrics: {
      votes: 8,
      rsvps: 0,
      completions: 12,
      comments: 34
    }
  },
  {
    id: 'content-5',
    type: 'need' as const,
    title: 'Rainwater Harvesting System',
    description: 'Support our initiative to install rainwater collection systems throughout the community to reduce water waste and promote conservation.',
    image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop',
    status: 'voting' as const,
    funding_goal: 8500,
    current_funding: 2300,
    created_at: '2024-11-30T11:20:00Z',
    created_by_name: 'Aisha Patel',
    engagement_metrics: {
      votes: 31,
      rsvps: 0,
      completions: 1,
      comments: 19
    }
  },
  {
    id: 'content-6',
    type: 'event' as const,
    title: 'Sustainable Cooking Workshop',
    description: 'Learn to cook delicious meals using locally sourced, seasonal ingredients. We\'ll cover meal planning, food preservation, and zero-waste cooking techniques.',
    image_url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
    status: 'approved' as const,
    funding_goal: null,
    current_funding: 0,
    created_at: '2024-11-25T13:00:00Z',
    created_by_name: 'Sarah Johnson',
    engagement_metrics: {
      votes: 5,
      rsvps: 24,
      completions: 0,
      comments: 9
    }
  }
]

const mockUserMembership = {
  role: 'member'
}

const mockStats = {
  total_content: 6,
  needs: 2,
  events: 2,
  polls: 1,
  challenges: 1
}

const mockCurrentUser = {
  id: 'current-user-id',
  email: 'demo@user.com',
  full_name: 'Demo User'
}

export default function EnhancedCommunityDemoPage() {
  const [showDemo, setShowDemo] = useState(false)

  const handleJoinCommunity = () => {
    console.log('Join community clicked')
  }

  const handleContentAction = (actionType: string, contentId: string) => {
    console.log(`${actionType} action for content ${contentId}`)
  }

  const handleCreateContent = () => {
    console.log('Create content clicked')
  }

  return (
    <ToastProvider>
      <div className="min-h-screen">
        {/* Demo Banner */}
        <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white p-4 text-center">
          <h1 className="text-xl font-bold mb-2">🎨 Enhanced Community Page Demo</h1>
          <p className="text-teal-100 mb-4">
            Experience the immersive header, masonry content grid, mobile-first design, and interactive features!
          </p>
          <button
            onClick={() => setShowDemo(true)}
            className="bg-white/20 hover:bg-white/30 px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            View Enhanced Demo
          </button>
        </div>

        {showDemo && (
          <>
            {/* Immersive Header */}
            <ImmersiveHeader
              community={mockCommunity}
              members={mockMembers}
              userMembership={mockUserMembership}
              onJoinCommunity={handleJoinCommunity}
            />

            {/* Content Grid */}
            <div className="max-w-6xl mx-auto px-6 py-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">
                  Community Activity
                </h2>
                
                <EnhancedContentGrid
                  content={mockContent}
                  userRole={mockUserMembership?.role || null}
                  onContentAction={handleContentAction}
                  onCreateContent={handleCreateContent}
                />
              </div>
            </div>
          </>
        )}

        {!showDemo && (
          <div className="max-w-4xl mx-auto px-6 py-12 text-center">
            <h2 className="text-3xl font-bold text-neutral-900 mb-6">
              Enhanced Community Features
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-neutral-200">
                <div className="text-4xl mb-4">🏔️</div>
                <h3 className="text-xl font-bold mb-3">Immersive Header</h3>
                <p className="text-neutral-600">
                  Parallax hero with floating member avatars, animated core value badges, and live activity indicators
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg border border-neutral-200">
                <div className="text-4xl mb-4">🧱</div>
                <h3 className="text-xl font-bold mb-3">Masonry Layout</h3>
                <p className="text-neutral-600">
                  Smart content grid with color-coded types, engagement metrics, and quick action buttons
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg border border-neutral-200">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-xl font-bold mb-3">Mobile-First</h3>
                <p className="text-neutral-600">
                  Bottom sheets, swipeable tabs, pull-to-refresh, and floating action buttons
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-lg border border-neutral-200">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="text-xl font-bold mb-3">Visual Feedback</h3>
                <p className="text-neutral-600">
                  Confetti animations, toast notifications, progress ripples, and smooth transitions
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  )
}
