'use client'

import { useState, useEffect, useRef } from 'react'
import { Badge, FundingProgress } from '../ui'
import { cn } from '@/lib/design-system'
import { useConfetti } from '../ui/Confetti'
import { useToast } from '../ui/Toast'

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
  engagement_metrics?: {
    votes: number
    rsvps: number
    completions: number
    comments: number
  }
  created_by_name?: string
}

interface EnhancedContentGridProps {
  content: ContentItem[]
  userRole: string | null
  onContentAction?: (actionType: string, contentId: string) => void
  onCreateContent?: () => void
}

export default function EnhancedContentGrid({
  content,
  userRole,
  onContentAction,
  onCreateContent
}: EnhancedContentGridProps) {
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'progress'>('newest')
  const [columns, setColumns] = useState(3)
  const gridRef = useRef<HTMLDivElement>(null)
  const { fire: fireConfetti } = useConfetti()
  const { addToast } = useToast()

  // Responsive columns
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width < 768) setColumns(1)
      else if (width < 1024) setColumns(2)
      else setColumns(3)
    }

    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  // Filter and sort content
  const filteredContent = content
    .filter(item => filter === 'all' || item.type === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popular':
          const aPopularity = (a.engagement_metrics?.votes || 0) + (a.engagement_metrics?.rsvps || 0)
          const bPopularity = (b.engagement_metrics?.votes || 0) + (b.engagement_metrics?.rsvps || 0)
          return bPopularity - aPopularity
        case 'progress':
          const aProgress = a.funding_goal ? (a.current_funding / a.funding_goal) : 0
          const bProgress = b.funding_goal ? (b.current_funding / b.funding_goal) : 0
          return bProgress - aProgress
        default:
          return 0
      }
    })

  // Organize content into columns for masonry layout
  const organizeIntoColumns = (items: ContentItem[]) => {
    const cols: ContentItem[][] = Array.from({ length: columns }, () => [])
    
    items.forEach((item, index) => {
      const columnIndex = index % columns
      cols[columnIndex].push(item)
    })
    
    return cols
  }

  const contentColumns = organizeIntoColumns(filteredContent)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'need': return '💡'
      case 'event': return '📅'
      case 'challenge': return '🏆'
      case 'poll': return '🗳️'
      default: return '📄'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'need': return 'from-blue-500 to-blue-600'
      case 'event': return 'from-purple-500 to-purple-600'
      case 'challenge': return 'from-orange-500 to-orange-600'
      case 'poll': return 'from-green-500 to-green-600'
      default: return 'from-gray-500 to-gray-600'
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

  const handleQuickAction = (actionType: string, contentId: string) => {
    // Show success feedback
    fireConfetti()
    addToast({
      type: 'success',
      title: `${actionType} successful!`,
      description: `Your ${actionType.toLowerCase()} has been recorded.`,
    })
    
    onContentAction?.(actionType, contentId)
  }

  return (
    <div className="space-y-6">
      {/* Filter and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: content.length },
            { key: 'need', label: 'Needs', count: content.filter(c => c.type === 'need').length },
            { key: 'event', label: 'Events', count: content.filter(c => c.type === 'event').length },
            { key: 'challenge', label: 'Challenges', count: content.filter(c => c.type === 'challenge').length },
            { key: 'poll', label: 'Polls', count: content.filter(c => c.type === 'poll').length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                'flex items-center gap-2',
                filter === key
                  ? 'bg-primary-600 text-white shadow-md scale-105'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50 border border-neutral-200'
              )}
            >
              <span>{label}</span>
              <Badge variant="secondary" size="sm">{count}</Badge>
            </button>
          ))}
        </div>

        {/* Sort Control */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="newest">Newest First</option>
          <option value="popular">Most Popular</option>
          <option value="progress">By Progress</option>
        </select>
      </div>

      {/* Masonry Grid */}
      <div ref={gridRef} className="grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {contentColumns.map((column, columnIndex) => (
          <div key={columnIndex} className="space-y-6">
            {column.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onQuickAction={handleQuickAction}
                getTypeIcon={getTypeIcon}
                getTypeColor={getTypeColor}
                getStatusColor={getStatusColor}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredContent.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">
            No {filter === 'all' ? 'content' : filter} found
          </h3>
          <p className="text-neutral-600 mb-6 max-w-md mx-auto">
            {filter === 'all'
              ? 'This community is just getting started. Be the first to create content!'
              : `No ${filter}s have been created yet. Start the conversation!`
            }
          </p>
          {userRole && (
            <button
              onClick={onCreateContent}
              className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Create First {filter === 'all' ? 'Content' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          )}
        </div>
      )}

      {/* Create Content FAB for Mobile */}
      {userRole && filteredContent.length > 0 && (
        <button
          onClick={onCreateContent}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-110 z-40 md:hidden flex items-center justify-center"
        >
          <span className="text-2xl">+</span>
        </button>
      )}
    </div>
  )
}

interface ContentCardProps {
  item: ContentItem
  onQuickAction: (actionType: string, contentId: string) => void
  getTypeIcon: (type: string) => string
  getTypeColor: (type: string) => string
  getStatusColor: (status: string) => string
}

function ContentCard({ 
  item, 
  onQuickAction, 
  getTypeIcon, 
  getTypeColor, 
  getStatusColor 
}: ContentCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const progressPercentage = item.funding_goal 
    ? Math.min((item.current_funding / item.funding_goal) * 100, 100)
    : 0

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-md border border-neutral-200',
        'transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
        'group cursor-pointer overflow-hidden'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Type Header */}
      <div className={cn(
        'bg-gradient-to-r p-4 text-white',
        getTypeColor(item.type)
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getTypeIcon(item.type)}</span>
            <span className="font-semibold capitalize">{item.type}</span>
          </div>
          <Badge 
            className={cn('text-xs', getStatusColor(item.status))}
          >
            {item.status}
          </Badge>
        </div>
      </div>

      {/* Image */}
      {item.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={item.image_url}
            alt={item.title}
            className={cn(
              'w-full h-full object-cover transition-all duration-500',
              'group-hover:scale-110',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
          />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-neutral-200 animate-pulse" />
          )}
          
          {/* Overlay on hover */}
          <div className={cn(
            'absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300',
            isHovered && 'opacity-100'
          )}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-semibold">View Details</span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg text-neutral-900 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {item.title}
        </h3>

        <p className="text-neutral-600 text-sm line-clamp-3">
          {item.description}
        </p>

        {/* Funding Progress for Needs */}
        {item.type === 'need' && item.funding_goal && (
          <div className="pt-2">
            <FundingProgress
              currentFunding={item.current_funding}
              goalFunding={item.funding_goal}
              variant="primary"
              animated
            />
          </div>
        )}

        {/* Engagement Metrics */}
        {item.engagement_metrics && (
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            {item.engagement_metrics.votes > 0 && (
              <span className="flex items-center gap-1">
                <span>👍</span>
                {item.engagement_metrics.votes}
              </span>
            )}
            {item.engagement_metrics.rsvps > 0 && (
              <span className="flex items-center gap-1">
                <span>✋</span>
                {item.engagement_metrics.rsvps}
              </span>
            )}
            {item.engagement_metrics.completions > 0 && (
              <span className="flex items-center gap-1">
                <span>✅</span>
                {item.engagement_metrics.completions}
              </span>
            )}
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="flex gap-2 pt-2">
          {item.type === 'poll' && item.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onQuickAction('Vote', item.id)
              }}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              🗳️ Vote
            </button>
          )}
          
          {item.type === 'event' && item.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onQuickAction('RSVP', item.id)
              }}
              className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              ✋ RSVP
            </button>
          )}
          
          {item.type === 'need' && item.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onQuickAction('Support', item.id)
              }}
              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              💝 Support
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs text-neutral-500">
          <span>By {item.created_by_name || 'Community'}</span>
          <span>{new Date(item.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
