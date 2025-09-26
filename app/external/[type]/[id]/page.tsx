import { supabase } from '../../../../lib/supabase'
import { notFound } from 'next/navigation'
import ExternalInteractionForm from './ExternalInteractionForm'

interface ExternalPageProps {
  params: Promise<{
    type: 'poll' | 'event' | 'need'
    id: string
  }>
}

interface ContentData {
  id: string
  type: 'poll' | 'event' | 'need'
  title: string
  description: string | null
  image_url: string | null
  status: string
  community: {
    name: string
    id: string
    logo_url?: string | null
  }
  data?: any // Type-specific data like poll options
}

async function getContentForExternal(type: string, id: string): Promise<ContentData | null> {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      id,
      type,
      title,
      description,
      image_url,
      status,
      data,
      communities!inner (
        id,
        name,
        logo_url
      )
    `)
    .eq('id', id)
    .eq('type', type)
    .single()

  if (error || !data) {
    console.error('Error fetching content:', error)
    return null
  }

  return {
    id: data.id,
    type: data.type as any,
    title: data.title,
    description: data.description,
    image_url: data.image_url,
    status: data.status,
    data: data.data,
    community: {
      name: (data.communities as any).name,
      id: (data.communities as any).id,
      logo_url: (data.communities as any).logo_url
    }
  }
}

export default async function ExternalInteractionPage({ params }: ExternalPageProps) {
  const { type, id } = await params
  const content = await getContentForExternal(type, id)

  if (!content) {
    notFound()
  }

  // Only allow interaction with active content
  if (content.status !== 'active' && content.status !== 'voting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            This {content.type} is no longer active
          </h2>
          <p className="text-slate-600 mb-6">
            The interaction period for this content has ended.
          </p>
          <a
            href={`/share/${content.type}/${content.id}`}
            className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            View Content
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
            <span className="font-bold text-slate-900">Crowd Conscious</span>
            <span className="text-neutral-400">•</span>
            <span className="text-sm text-neutral-600">{content.community.name}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <ExternalInteractionForm content={content} />
      </div>
    </div>
  )
}
