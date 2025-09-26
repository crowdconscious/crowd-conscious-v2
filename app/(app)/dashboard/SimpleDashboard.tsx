'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AnimatedCard, AnimatedButton } from '@/components/ui/UIComponents'

interface Community {
  id: string
  name: string
  description: string | null
  member_count: number
  address: string | null
}

interface Content {
  id: string
  title: string
  type: string
  status: string
  community: { name: string }
  created_at: string
}

interface SimpleDashboardProps {
  user: any
  userCommunities: Community[]
}

export default function SimpleDashboard({ user, userCommunities }: SimpleDashboardProps) {
  const [recentContent, setRecentContent] = useState<Content[]>([])
  const [stats, setStats] = useState({
    totalCommunities: userCommunities.length,
    totalContent: 0,
    totalVotes: 0
  })

  const getTimeOfDayMessage = (): string => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl p-8">
        <h1 className="text-4xl font-bold mb-4">
          {getTimeOfDayMessage()}, {user.full_name || user.email?.split('@')[0] || 'Changemaker'}! 👋
        </h1>
        <p className="text-xl text-teal-100">
          Ready to make an impact in your community today?
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Communities Joined</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalCommunities}</p>
            </div>
            <div className="text-4xl">🌍</div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Content Created</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalContent}</p>
            </div>
            <div className="text-4xl">💡</div>
          </div>
        </AnimatedCard>

        <AnimatedCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-600 text-sm">Votes Cast</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalVotes}</p>
            </div>
            <div className="text-4xl">🗳️</div>
          </div>
        </AnimatedCard>
      </div>

      {/* Quick Actions */}
      <AnimatedCard className="p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/communities"
            className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🌍</div>
            <h3 className="font-semibold text-slate-900">Browse Communities</h3>
            <p className="text-sm text-slate-600">Discover local groups</p>
          </Link>

          <Link
            href="/communities/new"
            className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">➕</div>
            <h3 className="font-semibold text-slate-900">Create Community</h3>
            <p className="text-sm text-slate-600">Start something new</p>
          </Link>

          <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center group cursor-pointer">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💡</div>
            <h3 className="font-semibold text-slate-900">Share Idea</h3>
            <p className="text-sm text-slate-600">Post a need or event</p>
          </div>

          <Link
            href="/discover"
            className="p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors text-center group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🔍</div>
            <h3 className="font-semibold text-slate-900">Discover</h3>
            <p className="text-sm text-slate-600">Find trending content</p>
          </Link>
        </div>
      </AnimatedCard>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Your Communities */}
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Your Communities</h2>
          
          {userCommunities.length > 0 ? (
            <div className="space-y-3">
              {userCommunities.slice(0, 5).map((community) => (
                <Link key={community.id} href={`/communities/${community.id}`}>
                  <div className="p-4 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors">
                    <h3 className="font-semibold text-slate-900 mb-1">{community.name}</h3>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {community.description || 'Building community impact together.'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{community.member_count} members</span>
                      {community.address && <span>📍 {community.address}</span>}
                    </div>
                  </div>
                </Link>
              ))}
              
              {userCommunities.length > 5 && (
                <div className="text-center pt-2">
                  <Link href="/communities">
                    <AnimatedButton variant="ghost" size="sm">
                      View All Communities
                    </AnimatedButton>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🌍</div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No communities yet</h3>
              <p className="text-slate-600 mb-4">Join or create a community to get started!</p>
              <Link href="/communities">
                <AnimatedButton>
                  Explore Communities
                </AnimatedButton>
              </Link>
            </div>
          )}
        </AnimatedCard>

        {/* Getting Started */}
        <AnimatedCard className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Getting Started</h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">🌍</div>
              <div>
                <h4 className="font-medium text-slate-900">Join Communities</h4>
                <p className="text-sm text-slate-600">Find local groups working on causes you care about</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">🗳️</div>
              <div>
                <h4 className="font-medium text-slate-900">Participate in Voting</h4>
                <p className="text-sm text-slate-600">Help communities decide on important initiatives</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">💡</div>
              <div>
                <h4 className="font-medium text-slate-900">Share Ideas</h4>
                <p className="text-sm text-slate-600">Propose needs, events, and challenges for your community</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl">📊</div>
              <div>
                <h4 className="font-medium text-slate-900">Track Impact</h4>
                <p className="text-sm text-slate-600">See how your contributions make a difference</p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
