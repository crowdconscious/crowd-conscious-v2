'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react'

type V4Package = {
  topic_summary?: string
  hook_score?: number
  hook_score_reason?: string
  blog_es?: {
    title?: string
    slug?: string
    excerpt?: string
    meta_description?: string
    category?: string
    tags?: string[]
    content?: string
  }
  blog_en?: {
    title?: string
    slug?: string
    excerpt?: string
    meta_description?: string
    content?: string
  }
  carousel_ig?: {
    slides_es?: Array<{ n?: number; headline?: string; body?: string }>
    slides_en?: Array<{ n?: number; headline?: string; body?: string }>
    cta_slide_es?: string
    cta_slide_en?: string
    design_notes?: string
  }
  reel_ig?: {
    duration_seconds?: number
    hook_es?: string
    script_es?: Array<{ t_start?: number; t_end?: number; voice?: string; on_screen?: string }>
    cta_es?: string
    caption_es?: string
    caption_en?: string
  }
  social_posts?: Array<{
    platform?: string
    lang?: string
    text?: string
    hashtags?: string[]
  }>
  pulse_market_proposal?: {
    should_create?: boolean
    reasoning?: string
    proposal?: {
      title?: string
      description_short?: string
      outcomes?: Array<{ label_es?: string; label_en?: string }>
      resolution_window_days?: number
      sponsor_pitch?: string
    }
  }
  image_prompts?: {
    blog_cover?: string
    carousel_template?: string
    social_image?: string
  }
  self_score?: number
  self_score_reason?: string
}

type AgentContentItem = {
  id: string
  agent_type?: string
  content_type?: string
  title: string
  body: string
  metadata?: Record<string, unknown> & {
    type?: string
    package_v4?: V4Package
    blog_post_id?: string
    slug?: string
    seed_topic?: string
    self_score?: number
    hook_score?: number
    input?: { topic?: string; marketId?: string; source?: string }
    tokens_input?: number
    tokens_output?: number
  }
  created_at: string
}

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* noop */
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

function Section({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white text-lg font-semibold">{title}</h2>
        {badge && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

export default function V4PackageViewerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [item, setItem] = useState<AgentContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch(`/api/predictions/admin/agent-content/${id}`)
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(j.error ?? `Failed to load (${res.status})`)
        }
        const json = (await res.json()) as { item: AgentContentItem }
        if (alive) setItem(json.item)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Load failed')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-slate-400">Cargando paquete v4…</div>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-3">
        <Link
          href="/predictions/admin/agents"
          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error ?? 'No se encontró el paquete.'}
        </div>
      </div>
    )
  }

  const meta = item.metadata ?? {}
  const pkg: V4Package = (meta.package_v4 as V4Package) ?? {}
  const isV4 = meta.type === 'package_v4' && pkg && Object.keys(pkg).length > 0

  if (!isV4) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-3">
        <Link
          href="/predictions/admin/agents"
          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Link>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-amber-300">
          Este registro no es un paquete v4. Tipo: {String(meta.type ?? 'desconocido')}.
        </div>
        <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-300 whitespace-pre-wrap max-h-96 overflow-auto">
          {JSON.stringify(meta, null, 2)}
        </pre>
      </div>
    )
  }

  const blogEs = pkg.blog_es ?? {}
  const blogEn = pkg.blog_en ?? {}
  const carousel = pkg.carousel_ig ?? {}
  const reel = pkg.reel_ig ?? {}
  const social = pkg.social_posts ?? []
  const proposal = pkg.pulse_market_proposal ?? {}
  const images = pkg.image_prompts ?? {}

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href="/predictions/admin/agents"
          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Link>
        {meta.blog_post_id && (
          <Link
            href={`/predictions/admin/blog/edit/${String(meta.blog_post_id)}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
          >
            Editar blog post →
          </Link>
        )}
      </div>

      <div className="bg-gradient-to-br from-emerald-500/10 via-slate-800/40 to-slate-800/40 border border-emerald-500/20 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-emerald-400 text-xs uppercase tracking-wider font-bold">
            Content Package v4
          </span>
          <span className="text-slate-500 text-xs">
            {new Date(item.created_at).toLocaleString('es-MX')}
          </span>
          {typeof pkg.hook_score === 'number' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Hook score: {pkg.hook_score}/10
            </span>
          )}
          {typeof pkg.self_score === 'number' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Self-score: {pkg.self_score}/10
            </span>
          )}
        </div>
        {pkg.topic_summary && (
          <p className="text-slate-300 text-sm leading-relaxed">{pkg.topic_summary}</p>
        )}
        {pkg.hook_score_reason && (
          <p className="text-slate-400 text-xs italic">Hook: {pkg.hook_score_reason}</p>
        )}
        {meta.seed_topic && (
          <p className="text-slate-500 text-xs">
            <span className="text-slate-400 font-medium">Tópico semilla:</span>{' '}
            {String(meta.seed_topic)}
          </p>
        )}
        {(meta.tokens_input || meta.tokens_output) && (
          <p className="text-slate-500 text-[10px]">
            Tokens: {Number(meta.tokens_input ?? 0).toLocaleString()} in /{' '}
            {Number(meta.tokens_output ?? 0).toLocaleString()} out
          </p>
        )}
      </div>

      {/* BLOG ES */}
      <Section title="Blog post — Español" badge="bilingüe">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-white text-base font-semibold flex-1">{blogEs.title}</h3>
            {blogEs.content && <CopyButton text={blogEs.content} label="Copiar markdown" />}
          </div>
          {blogEs.excerpt && (
            <p className="text-slate-300 text-sm italic border-l-2 border-emerald-500/40 pl-3">
              {blogEs.excerpt}
            </p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            {blogEs.category && (
              <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
                {blogEs.category}
              </span>
            )}
            {(blogEs.tags ?? []).map((t) => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-slate-700/30 text-slate-400">
                #{t}
              </span>
            ))}
          </div>
          {blogEs.meta_description && (
            <p className="text-slate-500 text-xs">
              <span className="text-slate-400 font-medium">Meta:</span> {blogEs.meta_description}
            </p>
          )}
          {blogEs.content && (
            <details className="bg-slate-900 rounded-lg border border-slate-700">
              <summary className="cursor-pointer px-3 py-2 text-slate-300 text-sm hover:text-white">
                Ver markdown completo
              </summary>
              <pre className="px-3 py-2 text-slate-200 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[600px] overflow-auto">
                {blogEs.content}
              </pre>
            </details>
          )}
        </div>
      </Section>

      {/* BLOG EN */}
      {blogEn.content && (
        <Section title="Blog post — English">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-white text-base font-semibold flex-1">{blogEn.title}</h3>
              <CopyButton text={blogEn.content} label="Copy markdown" />
            </div>
            {blogEn.excerpt && (
              <p className="text-slate-300 text-sm italic border-l-2 border-emerald-500/40 pl-3">
                {blogEn.excerpt}
              </p>
            )}
            {blogEn.meta_description && (
              <p className="text-slate-500 text-xs">
                <span className="text-slate-400 font-medium">Meta:</span> {blogEn.meta_description}
              </p>
            )}
            <details className="bg-slate-900 rounded-lg border border-slate-700">
              <summary className="cursor-pointer px-3 py-2 text-slate-300 text-sm hover:text-white">
                View full markdown
              </summary>
              <pre className="px-3 py-2 text-slate-200 text-xs whitespace-pre-wrap font-mono leading-relaxed max-h-[600px] overflow-auto">
                {blogEn.content}
              </pre>
            </details>
          </div>
        </Section>
      )}

      {/* CAROUSEL */}
      {(carousel.slides_es?.length ?? 0) > 0 && (
        <Section title="Carrusel Instagram" badge={`${carousel.slides_es?.length ?? 0} slides`}>
          <div className="space-y-3">
            {carousel.design_notes && (
              <p className="text-slate-400 text-xs italic">
                Diseño: {carousel.design_notes}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(carousel.slides_es ?? []).map((slide, i) => {
                const enSlide = (carousel.slides_en ?? [])[i]
                return (
                  <div
                    key={i}
                    className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                        Slide {slide.n ?? i + 1}
                      </span>
                      {slide.body && (
                        <CopyButton
                          text={`${slide.headline ?? ''}\n${slide.body ?? ''}`}
                          label="Copiar"
                        />
                      )}
                    </div>
                    {slide.headline && (
                      <p className="text-white text-sm font-semibold">{slide.headline}</p>
                    )}
                    {slide.body && (
                      <p className="text-slate-300 text-xs leading-relaxed">{slide.body}</p>
                    )}
                    {enSlide && (enSlide.headline || enSlide.body) && (
                      <div className="pt-2 border-t border-slate-700/50 space-y-1">
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider">
                          English
                        </p>
                        {enSlide.headline && (
                          <p className="text-slate-200 text-sm font-medium">{enSlide.headline}</p>
                        )}
                        {enSlide.body && (
                          <p className="text-slate-400 text-xs">{enSlide.body}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {(carousel.cta_slide_es || carousel.cta_slide_en) && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 space-y-1">
                <p className="text-emerald-400 text-[10px] uppercase tracking-wider font-bold">
                  CTA final
                </p>
                {carousel.cta_slide_es && (
                  <p className="text-white text-sm">{carousel.cta_slide_es}</p>
                )}
                {carousel.cta_slide_en && (
                  <p className="text-slate-300 text-xs">EN: {carousel.cta_slide_en}</p>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* REEL */}
      {reel.script_es && reel.script_es.length > 0 && (
        <Section title="Reel / Short Instagram" badge={`${reel.duration_seconds ?? '?'}s`}>
          <div className="space-y-3">
            {reel.hook_es && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-400 text-[10px] uppercase tracking-wider font-bold mb-1">
                  Hook (0-3s)
                </p>
                <p className="text-white text-sm font-medium">{reel.hook_es}</p>
              </div>
            )}
            <div className="space-y-2">
              {(reel.script_es ?? []).map((beat, i) => (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase">
                    <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 font-mono">
                      {beat.t_start ?? 0}s–{beat.t_end ?? 0}s
                    </span>
                  </div>
                  {beat.voice && (
                    <p className="text-slate-200 text-sm">
                      <span className="text-slate-500 text-xs">🎙</span> {beat.voice}
                    </p>
                  )}
                  {beat.on_screen && (
                    <p className="text-emerald-300 text-xs font-bold uppercase tracking-wide">
                      📺 {beat.on_screen}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {reel.cta_es && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                <p className="text-emerald-400 text-[10px] uppercase tracking-wider font-bold mb-1">
                  CTA
                </p>
                <p className="text-white text-sm">{reel.cta_es}</p>
              </div>
            )}
            {reel.caption_es && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Caption ES</p>
                  <CopyButton text={reel.caption_es} />
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap">{reel.caption_es}</p>
              </div>
            )}
            {reel.caption_en && (
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">Caption EN</p>
                  <CopyButton text={reel.caption_en} />
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap">{reel.caption_en}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* SOCIAL POSTS */}
      {social.length > 0 && (
        <Section title="Social posts" badge={`${social.length} posts`}>
          <div className="space-y-3">
            {social.map((post, i) => {
              const fullText = `${post.text ?? ''}${
                post.hashtags && post.hashtags.length > 0
                  ? '\n\n' + post.hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')
                  : ''
              }`
              return (
                <div
                  key={i}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 uppercase tracking-wide font-medium">
                        {post.platform ?? '?'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
                        {post.lang ?? '?'}
                      </span>
                    </div>
                    <CopyButton text={fullText} />
                  </div>
                  <p className="text-slate-200 text-sm whitespace-pre-wrap">{post.text}</p>
                  {post.hashtags && post.hashtags.length > 0 && (
                    <p className="text-slate-500 text-xs">
                      {post.hashtags
                        .map((h) => `#${h.replace(/^#/, '')}`)
                        .join(' ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* PULSE PROPOSAL */}
      {proposal.should_create && proposal.proposal && (
        <Section title="Pulse market propuesto" badge="recomendado">
          <div className="space-y-3">
            {proposal.reasoning && (
              <p className="text-slate-300 text-sm">{proposal.reasoning}</p>
            )}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-lg p-4 space-y-3">
              <h3 className="text-white text-base font-semibold">{proposal.proposal.title}</h3>
              {proposal.proposal.description_short && (
                <p className="text-slate-400 text-sm italic">
                  {proposal.proposal.description_short}
                </p>
              )}
              <div className="space-y-1">
                <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  Opciones
                </p>
                {(proposal.proposal.outcomes ?? []).map((o, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-emerald-400">•</span>
                    <span className="text-white">{o.label_es}</span>
                    {o.label_en && (
                      <span className="text-slate-500 text-xs">/ {o.label_en}</span>
                    )}
                  </div>
                ))}
              </div>
              {proposal.proposal.resolution_window_days && (
                <p className="text-slate-400 text-xs">
                  Ventana de resolución sugerida:{' '}
                  <span className="text-white">{proposal.proposal.resolution_window_days} días</span>
                </p>
              )}
              {proposal.proposal.sponsor_pitch && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                  <p className="text-emerald-400 text-[10px] uppercase tracking-wider font-bold mb-1">
                    Sponsor pitch
                  </p>
                  <p className="text-emerald-100 text-xs leading-relaxed">
                    {proposal.proposal.sponsor_pitch}
                  </p>
                </div>
              )}
              <div className="pt-2">
                <Link
                  href={`/predictions/admin/create-market?${new URLSearchParams({
                    title: proposal.proposal.title ?? '',
                    description: proposal.proposal.description_short ?? '',
                    is_pulse: '1',
                  }).toString()}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Crear este Pulse
                </Link>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* IMAGE PROMPTS */}
      {(images.blog_cover || images.carousel_template || images.social_image) && (
        <Section title="Image prompts">
          <div className="space-y-3">
            {([
              { label: 'Blog cover', text: images.blog_cover },
              { label: 'Carousel template', text: images.carousel_template },
              { label: 'Social image', text: images.social_image },
            ] as const)
              .filter((x) => x.text)
              .map((entry) => (
                <div
                  key={entry.label}
                  className="bg-slate-900 border border-slate-700 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      {entry.label}
                    </p>
                    <CopyButton text={entry.text ?? ''} />
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">{entry.text}</p>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* SELF-SCORE FOOTER */}
      {pkg.self_score_reason && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3">
          <p className="text-slate-400 text-xs">
            <span className="font-medium text-slate-300">Self-score reason:</span>{' '}
            {pkg.self_score_reason}
          </p>
        </div>
      )}
    </div>
  )
}
