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

  const tabs = [
    { id: 'content' as const, label: 'Content', icon: '📝', description: 'Community posts and activities' },
    { id: 'pool' as const, label: 'Community Wallet', icon: '💰', description: 'Financial overview and donations' },
    { id: 'impact' as const, label: 'Impact', icon: '📊', description: 'Measurable outcomes and metrics' },
  ]

  return (
    <div>
      {/* Tab Navigation - Modern Design */}
      <div className="border-b border-slate-200 bg-slate-50/50">
        <nav className="flex items-center gap-2 p-4 overflow-x-auto">
          {/* Member Count Badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 mr-2">
            <span className="text-slate-600">👥</span>
            <span className="font-semibold text-slate-900">{memberCount}</span>
            <span className="text-sm text-slate-500">Members</span>
          </div>

          {/* Tab Buttons */}
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-medium'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content with Smooth Transition */}
      <div className="p-6">
        {activeTab === 'content' && (
          <div className="animate-fade-in">
            <ContentList communityId={communityId} userRole={userRole || null} />
          </div>
        )}
        
        {activeTab === 'pool' && (
          <div className="animate-fade-in">
            <CommunityTreasury 
              communityId={communityId}
              communityName={communityName || 'Community'}
              userRole={userRole || undefined}
            />
          </div>
        )}
        
        {activeTab === 'members' && (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-6">
              <span className="text-4xl">👥</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Members Directory</h3>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              View community members, their roles, and contribution history. This feature is coming soon!
            </p>
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-xl text-slate-600">
              <span>🚧</span>
              <span className="font-medium">Under Development</span>
            </div>
          </div>
        )}
        
        {activeTab === 'impact' && (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-100 to-teal-200 rounded-full mb-6">
              <span className="text-4xl">📊</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Community Impact Dashboard</h3>
            <p className="text-slate-600 max-w-md mx-auto mb-6">
              Track this community's measurable impact, funding distribution, and real-world outcomes.
            </p>
            <Link 
              href={`/communities/${communityId}/impact`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-8 py-4 rounded-xl font-medium hover:from-teal-700 hover:to-teal-800 transition-all duration-300 shadow-lg shadow-teal-600/30 hover:shadow-xl hover:scale-105"
            >
              <span>📈</span>
              <span>View Full Impact Report</span>
              <span>→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
