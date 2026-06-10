import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'
import { Globe, Instagram, Newspaper } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase-admin'
import { getCurrentUser } from '@/lib/auth-server'
import LandingNav from '@/app/components/landing/LandingNav'
import { getCreatorCopy, normalizeHandle, type CreatorLocale } from '@/lib/i18n/creator'
import { SITE_URL } from '@/lib/seo/site'
import { parseMetadataValues } from '@/lib/locations/conscious-values'
import { creatorCraftLabel } from '@/lib/creators/crafts'
import type { CreatorCertificationRow } from '@/lib/creators/types'
import CreatorCertificationPanel, {
  CreatorTierBadge,
} from '@/components/creators/CreatorCertificationPanel'
import CreatorVerifiedCelebration from '@/components/creators/CreatorVerifiedCelebration'

const Footer = nextDynamic(() => import('@/components/Footer'))

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ handle: string }> }

type SocialLinks = {
  website?: string | null
  instagram?: string | null
  tiktok?: string | null
  x?: string | null
}

type CreatorProfile = {
  id: string
  handle: string | null
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  social_links: SocialLinks | null
}

type CreatorPost = {
  id: string
  slug: string | null
  title: string
  title_en: string | null
  excerpt: string | null
  excerpt_en: string | null
  cover_image_url: string | null
  published_at: string | null
}

/**
 * Loads a public creator by handle (case-insensitive) — only `influencer`
 * accounts resolve. Returns null for anything else so callers can 404. Uses
 * the admin client purely to avoid profiles-RLS nuances on cross-user reads,
 * but selects ONLY public-safe columns (no email/role/money fields).
 */
async function loadCreator(handleParam: string): Promise<CreatorProfile | null> {
  const handle = normalizeHandle(handleParam)
  if (!handle) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, handle, full_name, bio, avatar_url, social_links')
    .ilike('handle', handle)
    .eq('user_type', 'influencer')
    .maybeSingle()
  return (data as CreatorProfile | null) ?? null
}

/** Active certification only — same visibility rule as the public RLS policy. */
async function loadActiveCertification(
  profileId: string
): Promise<CreatorCertificationRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('creator_certifications')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .maybeSingle()
  return (data as CreatorCertificationRow | null) ?? null
}

type OutcomeRow = { id: string; label: string; sort_order: number | null }

async function loadMarketOutcomes(marketId: string | null): Promise<OutcomeRow[]> {
  if (!marketId) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('market_outcomes')
    .select('id, label, sort_order')
    .eq('market_id', marketId)
    .order('sort_order', { ascending: true })
  return (data as OutcomeRow[] | null) ?? []
}

async function loadPublishedPosts(authorId: string): Promise<CreatorPost[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('blog_posts')
    .select('id, slug, title, title_en, excerpt, excerpt_en, cover_image_url, published_at')
    .eq('author_id', authorId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100)
  return (data as CreatorPost[] | null) ?? []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { handle } = await props.params
  const creator = await loadCreator(handle)
  if (!creator) {
    return { title: 'Crowd Conscious' }
  }
  const name = creator.full_name || `@${creator.handle}`
  const certification = await loadActiveCertification(creator.id)

  if (certification) {
    const title = `${name} — Conscious Creator | Crowd Conscious`
    const votes = certification.total_votes ?? 0
    const score = certification.conscious_score
    const description =
      score != null && votes >= 10
        ? `Conscious Score ${Number(score).toFixed(1)}/10 · ${votes} votos. ¿Tú qué opinas?`
        : votes > 0
          ? `${votes} ${votes === 1 ? 'voto' : 'votos'}. ¿Es un Creador Consciente? Vota tú también.`
          : certification.why_conscious || creator.bio || undefined
    const ogImage = `${SITE_URL}/api/og/creator/${encodeURIComponent(creator.handle ?? handle)}`
    const canonical = `${SITE_URL}/creators/${creator.handle}`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'Crowd Conscious',
        images: [{ url: ogImage, width: 1200, height: 630, alt: name }],
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    }
  }

  const title = `${name} | Crowd Conscious`
  const description = creator.bio || undefined
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/creators/${creator.handle}` },
    openGraph: {
      title,
      description,
      images: creator.avatar_url ? [{ url: creator.avatar_url }] : undefined,
    },
  }
}

function formatDate(iso: string | null, locale: CreatorLocale) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function CreatorPublicProfilePage(props: Props) {
  const { handle } = await props.params
  const cookieStore = await cookies()
  const locale: CreatorLocale =
    cookieStore.get('preferred-language')?.value === 'en' ? 'en' : 'es'
  const t = getCreatorCopy(locale)

  const creator = await loadCreator(handle)
  if (!creator) {
    notFound()
  }

  const [posts, certification, viewer] = await Promise.all([
    loadPublishedPosts(creator.id),
    loadActiveCertification(creator.id),
    getCurrentUser().catch(() => null),
  ])
  const isOwner = viewer?.id === creator.id
  const outcomes = certification
    ? await loadMarketOutcomes(certification.current_market_id)
    : []
  const craftLabel = certification
    ? creatorCraftLabel(certification.craft, certification.craft_en, locale)
    : ''
  const displayName = creator.full_name || `@${creator.handle}`
  const social = creator.social_links ?? {}

  const socialItems: { key: string; href: string; label: string; icon: typeof Globe }[] = []
  if (social.website) {
    socialItems.push({ key: 'website', href: social.website, label: 'Web', icon: Globe })
  }
  if (social.instagram) {
    const ig = social.instagram.replace(/^@/, '')
    socialItems.push({
      key: 'instagram',
      href: ig.startsWith('http') ? ig : `https://instagram.com/${ig}`,
      label: 'Instagram',
      icon: Instagram,
    })
  }
  if (social.x) {
    const x = social.x.replace(/^@/, '')
    socialItems.push({
      key: 'x',
      href: x.startsWith('http') ? x : `https://x.com/${x}`,
      label: 'X',
      icon: Globe,
    })
  }
  if (social.tiktok) {
    const tk = social.tiktok.replace(/^@/, '')
    socialItems.push({
      key: 'tiktok',
      href: tk.startsWith('http') ? tk : `https://tiktok.com/@${tk}`,
      label: 'TikTok',
      icon: Globe,
    })
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-slate-100">
      <LandingNav />

      <section className="px-4 pb-10 pt-28">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2d3748] bg-[#1a2029]">
              {creator.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-emerald-300">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                {t.profileRoleBadge}
              </p>
              <h1 className="mt-1 text-3xl font-bold text-white">{displayName}</h1>
              {creator.handle && (
                <p className="mt-1 text-sm text-slate-400">
                  @{creator.handle}
                  {craftLabel ? ` · ${craftLabel}` : ''}
                </p>
              )}
              {certification && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <CreatorTierBadge
                    cert={{
                      conscious_score:
                        certification.conscious_score == null
                          ? null
                          : Number(certification.conscious_score),
                      total_votes: certification.total_votes ?? 0,
                      certified_at: certification.certified_at,
                    }}
                    locale={locale}
                  />
                </div>
              )}
              {creator.bio && (
                <p className="mt-4 max-w-2xl text-slate-300">{creator.bio}</p>
              )}
              {socialItems.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  {socialItems.map(({ key, href, label, icon: Icon }) => (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3748] bg-[#1a2029] px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-emerald-500/40 hover:text-white"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {certification && (
            <CreatorCertificationPanel
              cert={{
                conscious_score:
                  certification.conscious_score == null
                    ? null
                    : Number(certification.conscious_score),
                total_votes: certification.total_votes ?? 0,
                certified_at: certification.certified_at,
                next_review_date: certification.next_review_date,
                why_conscious: certification.why_conscious,
                why_conscious_en: certification.why_conscious_en,
                craft: certification.craft,
                craft_en: certification.craft_en,
                city: certification.city,
                values: parseMetadataValues(certification.metadata),
                current_market_id: certification.current_market_id,
              }}
              outcomes={outcomes}
              locale={locale}
              ownerShare={
                isOwner && creator.handle
                  ? { profileId: creator.id, handle: creator.handle }
                  : null
              }
            />
          )}

          {isOwner && creator.handle && certification?.certified_at && (
            <CreatorVerifiedCelebration
              profileId={creator.id}
              handle={creator.handle}
              certifiedAt={certification.certified_at}
              locale={locale}
              surface="creator_profile"
            />
          )}
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Newspaper className="h-5 w-5 text-emerald-400" />
            {t.profilePostsTitle}
          </h2>

          {posts.length === 0 ? (
            <p className="mt-6 text-slate-400">{t.profileNoPosts}</p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {posts.map((post) => {
                const title = locale === 'en' && post.title_en?.trim() ? post.title_en : post.title
                const excerpt =
                  locale === 'en' && post.excerpt_en?.trim() ? post.excerpt_en : post.excerpt
                const href = post.slug ? `/blog/${post.slug}` : '#'
                return (
                  <Link
                    key={post.id}
                    href={href}
                    className="group flex flex-col overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029] transition-colors hover:border-emerald-500/40"
                  >
                    {post.cover_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.cover_image_url}
                        alt={title}
                        className="h-40 w-full object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-semibold text-white transition-colors group-hover:text-emerald-300">
                        {title}
                      </h3>
                      {excerpt && (
                        <p className="mt-2 line-clamp-3 text-sm text-slate-400">{excerpt}</p>
                      )}
                      {post.published_at && (
                        <p className="mt-3 text-xs text-slate-500">
                          {formatDate(post.published_at, locale)}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
