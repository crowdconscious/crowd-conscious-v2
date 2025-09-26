import { supabase } from '../../../../lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

interface SharePageProps {
  params: Promise<{
    type: 'poll' | 'event' | 'need' | 'challenge'
    id: string
  }>
}

interface SharedContent {
  id: string
  type: 'poll' | 'event' | 'need' | 'challenge'
  title: string
  description: string | null
  image_url: string | null
  status: string
  created_at: string
  community: {
    name: string
    id: string
    logo_url?: string | null
  }
  creator: {
    full_name: string | null
  }
}

async function getSharedContent(type: string, id: string): Promise<SharedContent | null> {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      id,
      type,
      title,
      description,
      image_url,
      status,
      created_at,
      communities!inner (
        id,
        name,
        logo_url
      ),
      profiles!community_content_created_by_fkey (
        full_name
      )
    `)
    .eq('id', id)
    .eq('type', type)
    .single()

  if (error || !data) {
    console.error('Error fetching shared content:', error)
    return null
  }

  return {
    id: data.id,
    type: data.type as any,
    title: data.title,
    description: data.description,
    image_url: data.image_url,
    status: data.status,
    created_at: data.created_at,
    community: {
      name: (data.communities as any).name,
      id: (data.communities as any).id,
      logo_url: (data.communities as any).logo_url
    },
    creator: {
      full_name: (data.profiles as any)?.full_name
    }
  }
}

function getContentTypeIcon(type: string) {
  switch (type) {
    case 'poll': return '🗳️'
    case 'event': return '📅'
    case 'need': return '💡'
    case 'challenge': return '🏆'
    default: return '📋'
  }
}

function getContentTypeLabel(type: string) {
  switch (type) {
    case 'poll': return 'Poll'
    case 'event': return 'Event'
    case 'need': return 'Community Need'
    case 'challenge': return 'Challenge'
    default: return 'Content'
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { type, id } = await params
  const content = await getSharedContent(type, id)

  if (!content) {
    notFound()
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${type}/${id}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
            <span className="font-bold text-slate-900">Crowd Conscious</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
            <span className="text-2xl">{getContentTypeIcon(content.type)}</span>
            <span className="text-sm font-medium text-neutral-600">
              {getContentTypeLabel(content.type)} shared from {content.community.name}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            {content.title}
          </h1>
          
          {content.description && (
            <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
              {content.description}
            </p>
          )}
        </div>

        {/* Content Image */}
        {content.image_url && (
          <div className="mb-12">
            <img
              src={content.image_url}
              alt={content.title}
              className="w-full max-w-2xl mx-auto rounded-xl shadow-lg"
            />
          </div>
        )}

        {/* Community Info */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20 mb-12">
          <div className="flex items-center gap-4 mb-6">
            {content.community.logo_url ? (
              <img
                src={content.community.logo_url}
                alt={`${content.community.name} logo`}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {content.community.name[0].toUpperCase()}
              </div>
            )}
            
            <div>
              <h3 className="text-xl font-bold text-slate-900">{content.community.name}</h3>
              <p className="text-slate-600">
                Created by {content.creator.full_name || 'Community Member'} • {format(new Date(content.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <p className="text-slate-600 mb-6">
              {content.type === 'poll' && 'Want to vote on this poll?'}
              {content.type === 'event' && 'Interested in attending this event?'}
              {content.type === 'need' && 'Want to support this community need?'}
              {content.type === 'challenge' && 'Ready to join this challenge?'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/communities/${content.community.id}`}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
              >
                <span className="text-lg">{getContentTypeIcon(content.type)}</span>
                Join {content.community.name}
              </Link>
              
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 border-2 border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
              >
                <span>✨</span>
                Create Account
              </Link>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Share this {content.type}</h3>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="flex items-center gap-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 px-4 py-2 rounded-lg transition-colors"
            >
              <span>🔗</span>
              Copy Link
            </button>
            
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this ${content.type} from ${content.community.name}: ${content.title}`)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <span>🐦</span>
              Share on Twitter
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Generate metadata for better social sharing
export async function generateMetadata({ params }: SharePageProps) {
  const { type, id } = await params
  const content = await getSharedContent(type, id)

  if (!content) {
    return {
      title: 'Content Not Found | Crowd Conscious',
    }
  }

  return {
    title: `${content.title} | ${content.community.name} | Crowd Conscious`,
    description: content.description || `Join the conversation about this ${content.type} in ${content.community.name}`,
    openGraph: {
      title: content.title,
      description: content.description || `A ${content.type} from ${content.community.name}`,
      images: content.image_url ? [content.image_url] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description || `A ${content.type} from ${content.community.name}`,
      images: content.image_url ? [content.image_url] : [],
    },
  }
}
