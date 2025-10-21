import { supabase } from '../../../../../lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import PublicPollForm from '../../[token]/PublicPollForm'
import PublicEventRSVP from '../../[token]/PublicEventRSVP'
import PublicNeedSupport from '../../[token]/PublicNeedSupport'

// Revalidate every 60 seconds to show updated data
export const revalidate = 60

interface ContentDetail {
  id: string
  type: 'need' | 'event' | 'challenge' | 'poll'
  title: string
  description: string | null
  image_url: string | null
  status: string
  funding_goal: number | null
  current_funding: number
  community_id: string
  event_date: string | null
  event_time: string | null
  location: string | null
  max_participants: number | null
  data: any
  communities: {
    name: string
    description: string | null
    image_url: string | null
  } | null
  profiles: {
    full_name: string | null
    email: string | null
  } | null
}

async function getPublicContent(contentId: string): Promise<ContentDetail | null> {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      *,
      communities (
        name,
        description,
        image_url
      ),
      profiles (
        full_name,
        email
      )
    `)
    .eq('id', contentId)
    .single()

  if (error) {
    console.error('Error fetching public content:', error)
    return null
  }

  return data as ContentDetail
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ contentId: string }> 
}): Promise<Metadata> {
  const { contentId } = await params
  const content = await getPublicContent(contentId)
  
  if (!content) {
    return {
      title: 'Content Not Found',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
  const shareUrl = `${baseUrl}/share/content/${contentId}`

  return {
    title: `${content.title} - ${content.communities?.name || 'Crowd Conscious'}`,
    description: content.description || `Join this ${content.type} on Crowd Conscious`,
    openGraph: {
      title: content.title,
      description: content.description || `Join this ${content.type} on Crowd Conscious`,
      type: content.type === 'event' ? 'website' : 'article',
      url: shareUrl,
      images: content.image_url ? [
        {
          url: content.image_url,
          width: 1200,
          height: 630,
          alt: content.title,
        }
      ] : [],
      siteName: 'Crowd Conscious',
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.description || `Join this ${content.type} on Crowd Conscious`,
      images: content.image_url ? [content.image_url] : [],
    },
  }
}

export default async function PublicContentPage({
  params,
}: {
  params: Promise<{ contentId: string }>
}) {
  const { contentId } = await params
  const content = await getPublicContent(contentId)

  if (!content) {
    notFound()
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'need': return 'bg-red-100 text-red-800 border-red-200'
      case 'event': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'challenge': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'poll': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with CTA */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Crowd Conscious</h1>
                <p className="text-xs text-slate-600">Community-driven impact</p>
              </div>
            </Link>
            <div className="flex gap-3">
              <Link
                href="/login"
                className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href={`/signup?redirect=/communities/${content.community_id}`}
                className="bg-gradient-to-r from-teal-600 to-purple-600 hover:from-teal-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
              >
                Join Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Community Context Banner */}
        <div className="bg-gradient-to-r from-teal-50 to-purple-50 rounded-lg p-6 mb-6 border border-teal-200">
          <div className="flex items-start gap-4">
            {content.communities?.image_url && (
              <img 
                src={content.communities.image_url} 
                alt={content.communities.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌍</span>
                <h2 className="text-xl font-bold text-slate-900">
                  {content.communities?.name}
                </h2>
              </div>
              <p className="text-slate-700 mb-3">
                {content.communities?.description || 'A community creating positive impact'}
              </p>
              <Link
                href={`/signup?redirect=/communities/${content.community_id}`}
                className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-800 font-medium text-sm"
              >
                Join this community →
              </Link>
            </div>
          </div>
        </div>

        {/* Shared Content Card */}
        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden mb-8">
          {/* Content Image */}
          {content.image_url && (
            <div className="relative w-full h-64 md:h-96 bg-slate-100">
              <img
                src={content.image_url}
                alt={content.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4">
                <span className={`px-4 py-2 rounded-full text-sm font-medium border backdrop-blur-sm bg-white/90 ${getTypeColor(content.type)}`}>
                  {getTypeIcon(content.type)} {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                </span>
              </div>
            </div>
          )}

          {/* Content Details */}
          <div className="p-6 md:p-8">
            <div className="mb-6">
              {!content.image_url && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{getTypeIcon(content.type)}</span>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getTypeColor(content.type)}`}>
                    {content.type.charAt(0).toUpperCase() + content.type.slice(1)}
                  </span>
                </div>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                {content.title}
              </h1>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Created by</span>
                <span className="font-medium text-slate-900">
                  {content.profiles?.full_name || content.profiles?.email || 'Community Member'}
                </span>
              </div>
            </div>

            {content.description && (
              <div className="prose prose-slate max-w-none mb-8">
                <p className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {content.description}
                </p>
              </div>
            )}

            {/* Event-specific details */}
            {content.type === 'event' && (content.event_date || content.location) && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-2">
                {content.event_date && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <span className="text-xl">📅</span>
                    <div>
                      <span className="font-medium">When:</span>{' '}
                      {new Date(content.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {content.event_time && ` at ${content.event_time}`}
                    </div>
                  </div>
                )}
                {content.location && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <span className="text-xl">📍</span>
                    <div>
                      <span className="font-medium">Where:</span> {content.location}
                    </div>
                  </div>
                )}
                {content.max_participants && (
                  <div className="flex items-center gap-3 text-slate-700">
                    <span className="text-xl">👥</span>
                    <div>
                      <span className="font-medium">Capacity:</span> {content.max_participants} participants
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Type-specific interaction forms */}
            <div className="mt-8">
              {content.type === 'poll' && (
                <PublicPollForm contentId={content.id} />
              )}

              {content.type === 'event' && (
                <PublicEventRSVP contentId={content.id} />
              )}

              {content.type === 'need' && (
                <PublicNeedSupport 
                  contentId={content.id}
                  fundingGoal={content.funding_goal}
                  currentFunding={content.current_funding}
                />
              )}

              {content.type === 'challenge' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">
                    🏆 Join this Challenge
                  </h3>
                  <p className="text-purple-700 mb-4">
                    Sign up to participate in this community challenge and track your progress!
                  </p>
                  <Link
                    href={`/signup?redirect=/communities/${content.community_id}/content/${content.id}`}
                    className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Join Challenge
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-purple-700 rounded-lg p-8 text-center text-white shadow-xl">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Make an Impact?
          </h3>
          <p className="text-teal-100 mb-6 max-w-2xl mx-auto text-lg">
            Join {content.communities?.name} and hundreds of other communities creating 
            measurable change in their neighborhoods. Your voice matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/signup?redirect=/communities/${content.community_id}`}
              className="bg-white text-teal-700 px-8 py-3 rounded-lg font-bold transition-all hover:scale-105 hover:shadow-2xl inline-flex items-center justify-center gap-2"
            >
              🚀 Join This Community
            </Link>
            <Link
              href="/"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-bold transition-all hover:bg-white hover:text-teal-700 hover:scale-105"
            >
              Explore All Communities
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-slate-600 mb-4">
              Crowd Conscious - Communities creating measurable impact
            </p>
            <div className="flex justify-center gap-6 text-sm text-slate-500">
              <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
              <Link href="/terms" className="hover:text-slate-700">Terms</Link>
              <Link href="/cookies" className="hover:text-slate-700">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

