'use client'

import { useState } from 'react'
import Link from 'next/link'
import ContentList from './ContentList'
import CommunityTreasury from './CommunityTreasury'

interface CommunityTabsProps {
  communityId: string
  communityName?: string
  memberCount: number
  userRole?: string | null
}

export default function CommunityTabs({ communityId, communityName, memberCount, userRole }: CommunityTabsProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'pool' | 'members' | 'impact'>('content')

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          <div className="py-4 text-slate-500 cursor-not-allowed">
            {memberCount} Members
          </div>
          <button
            onClick={() => setActiveTab('content')}
            className={`py-4 transition-colors ${
              activeTab === 'content'
                ? 'text-teal-600 border-b-2 border-teal-600 font-medium'
                : 'text-slate-600 hover:text-teal-600'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={`py-4 transition-colors flex items-center gap-2 ${
              activeTab === 'pool'
                ? 'text-teal-600 border-b-2 border-teal-600 font-medium'
                : 'text-slate-600 hover:text-teal-600'
            }`}
          >
            <span>💰</span>
            <span>Community Wallet</span>
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`py-4 transition-colors ${
              activeTab === 'impact'
                ? 'text-teal-600 border-b-2 border-teal-600 font-medium'
                : 'text-slate-600 hover:text-teal-600'
            }`}
          >
            Impact
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'content' && (
          <ContentList communityId={communityId} userRole={userRole || null} />
        )}
        
        {activeTab === 'pool' && (
          <CommunityTreasury 
            communityId={communityId}
            communityName={communityName || 'Community'}
            userRole={userRole || undefined}
          />
        )}
        
        {activeTab === 'members' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Members Coming Soon</h3>
            <p className="text-slate-600">
              Member directory and management features will be available soon.
            </p>
          </div>
        )}
        
        {activeTab === 'impact' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">View Detailed Impact</h3>
            <p className="text-slate-600 mb-6">
              See how this community's funding is distributed among members and track measurable impact.
            </p>
            <Link 
              href={`/communities/${communityId}/impact`}
              className="inline-flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              <span>📈</span>
              <span>View Impact Dashboard</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
