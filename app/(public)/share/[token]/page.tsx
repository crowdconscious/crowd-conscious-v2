import { supabase } from '../../../../lib/supabase'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import PublicPollForm from './PublicPollForm'
import PublicEventRSVP from './PublicEventRSVP'
import PublicNeedSupport from './PublicNeedSupport'

// Revalidate every 60 seconds
export const revalidate = 60

interface ShareLink {
  id: string
  token: string
  content_id: string
  type: 'poll' | 'event' | 'post' | 'need'
  expires_at: string
  created_at: string
  community_content: {
    id: string
    type: 'need' | 'event' | 'challenge' | 'poll'
    title: string
    description: string | null
    image_url: string | null
    status: string
    funding_goal: number | null
    current_funding: number
    community_id: string
    communities: {
      name: string
      description: string | null
    } | null
    profiles: {
      full_name: string | null
      email: string | null
    } | null
  } | null
}

async function getSharedContent(token: string): Promise<ShareLink | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select(`
      *,
      community_content (
        *,
        communities (
          name,
          description
        ),
        profiles (
          full_name,
          email
        )
      )
    `)
    .eq('token', token)
    .single()

  if (error) {
    console.error('Error fetching shared content:', error)
    return null
  }

  // Check if link has expired
  if (new Date((data as any)?.expires_at) < new Date()) {
    return null
  }

  return data as ShareLink
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}): Promise<Metadata> {
  const { token } = await params
  const sharedLink = await getSharedContent(token)
  
  if (!sharedLink || !sharedLink.community_content) {
    return {
      title: 'Shared Content - Crowd Conscious',
    }
  }

  const content = sharedLink.community_content
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
  const shareUrl = `${baseUrl}/share/${token}`

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

export default async function SharedContentPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const sharedLink = await getSharedContent(token)

  if (!sharedLink || !sharedLink.community_content) {
    notFound()
  }

  const content = sharedLink.community_content

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
      {/* Header with Sticky CTA */}
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
        {/* Community Context */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌍</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {content.communities?.name}
              </h2>
              <p className="text-slate-600">
                {content.communities?.description}
              </p>
            </div>
          </div>
          <div className="text-sm text-slate-500">
            <Link
              href="/communities"
              className="text-teal-600 hover:text-teal-700 font-medium"
            >
              Explore more communities →
            </Link>
          </div>
        </div>

        {/* Shared Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getTypeIcon(content.type)}</span>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {content.title}
                </h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getTypeColor(content.type)}`}>
                    {content.type}
                  </span>
                  <span className="text-sm text-slate-500">
                    by {content.profiles?.full_name || content.profiles?.email || 'Community Member'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {content.image_url && (
            <img
              src={content.image_url}
              alt={content.title}
              className="w-full h-64 object-cover rounded-lg mb-6"
            />
          )}

          <div className="prose max-w-none mb-8">
            <p className="text-slate-700 text-lg leading-relaxed">
              {content.description}
            </p>
          </div>

          {/* Type-specific interaction forms */}
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
        </div>

        {/* Call to Action */}
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
          <div className="text-center text-slate-500">
            <p>&copy; 2024 Crowd Conscious. Building communities, measuring impact.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
