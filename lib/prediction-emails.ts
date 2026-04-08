/**
 * HTML email templates for prediction flows (Resend).
 * Uses same visual language as lib/resend.ts (Crowd Conscious branding).
 */

import { marked } from 'marked'
import { normalizeBlogMarkdownForDisplay, sanitizeBlogEmailHtmlHrefs } from '@/lib/blog-markdown'

marked.setOptions({ gfm: true, breaks: true })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
const LOGO_URL = `${APP_URL}/images/logo.png`

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailFooter(unsubscribeUrl: string | null): string {
  return `
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      <img src="${LOGO_URL}" alt="Crowd Conscious" width="120" style="margin: 0 auto 12px; display: block;" />
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        Crowd Conscious · Predicciones con impacto
      </p>
      ${
        unsubscribeUrl
          ? `<p style="margin: 16px 0 0; font-size: 12px;">
        <a href="${esc(unsubscribeUrl)}" style="color: #64748b;">Darte de baja de estos correos</a>
      </p>`
          : ''
      }
    </div>
  `
}

/** Blog digest footer only (dark theme; matches newsletter structure spec — no duplicate logo). */
function blogDigestEmailFooter(unsubscribeUrl: string | null): string {
  return `
    <div style="padding: 20px 24px 28px; border-top: 1px solid #2d3748; text-align: center;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        Crowd Conscious · Predicciones con impacto
      </p>
      ${
        unsubscribeUrl
          ? `<p style="margin: 14px 0 0; font-size: 12px;">
        <a href="${esc(unsubscribeUrl)}" style="color: #64748b;">Cancelar suscripción</a>
      </p>`
          : ''
      }
    </div>
  `
}

export type DailyDigestVariant = 'new' | 'trending' | 'unvoted' | 'fallback'

function formatMarketQuestionForSubject(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim()
  return t.endsWith('?') ? t : `${t}?`
}

export function dailyMarketDigestTemplate(opts: {
  marketTitle: string
  /** Plain text, e.g. "67% YES" or "89% a favor de Opción A (líder)" */
  probabilitySummary: string
  marketUrl: string
  unsubscribeUrl: string | null
  /** Controls subject line so emails are not identical every day */
  digestVariant?: DailyDigestVariant
}): { subject: string; html: string } {
  const rawTitle = opts.marketTitle.replace(/\s+/g, ' ').trim()
  const q = formatMarketQuestionForSubject(rawTitle)

  let plainSubject: string
  switch (opts.digestVariant) {
    case 'new':
      plainSubject = `🆕 Nuevo mercado: ${q}`
      break
    case 'trending':
      plainSubject = `📈 La comunidad está prediciendo: ${q}`
      break
    case 'fallback':
      plainSubject = `¿Ya viste esto? — ${q}`
      break
    case 'unvoted':
    default:
      plainSubject = `${q} — La comunidad ya está votando`
      break
  }

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
    <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 8px;">Mercado destacado hoy</p>
      <h1 style="color: #ffffff; font-size: 22px; margin: 0; line-height: 1.35;">${esc(opts.marketTitle)}</h1>
    </div>
    <div style="padding: 28px 24px; background: #ffffff; border-radius: 0 0 12px 12px;">
      <p style="color: #334155; font-size: 18px; margin: 0 0 20px; text-align: center;">
        La comunidad dice <strong style="color: #059669;">${esc(opts.probabilitySummary)}</strong>
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${esc(opts.marketUrl)}" style="background: #059669; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block;">
          Votar ahora
        </a>
      </div>
      <p style="color: #64748b; font-size: 14px; line-height: 1.5; text-align: center;">
        Entra, elige tu pronóstico y suma XP.
      </p>
      ${emailFooter(opts.unsubscribeUrl)}
    </div>
  </div>`

  return { subject: plainSubject, html }
}

export function postVoteConfirmationTemplate(opts: {
  marketTitle: string
  outcomeLabel: string
  confidence: number
  /** e.g. "67% YES" or "Líder: Opción A (45%)" */
  communitySplitLine: string
  xpEarned: number
  predictionsUrl: string
}): { subject: string; html: string } {
  const subject = `Predijiste: ${opts.marketTitle.replace(/\s+/g, ' ').trim().slice(0, 120)}`

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
    <div style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%); padding: 28px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">¡Predicción registrada!</h1>
    </div>
    <div style="padding: 28px 24px; background: #ffffff;">
      <p style="color: #334155; font-size: 16px; margin: 0 0 16px;"><strong>${esc(opts.marketTitle)}</strong></p>
      <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #475569;">
        <tr><td style="padding: 8px 0;">Tu voto</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${esc(opts.outcomeLabel)}</td></tr>
        <tr><td style="padding: 8px 0;">Confianza</td><td style="padding: 8px 0; text-align: right;">${opts.confidence}/10</td></tr>
        <tr><td style="padding: 8px 0;">Comunidad</td><td style="padding: 8px 0; text-align: right;">${esc(opts.communitySplitLine)}</td></tr>
        <tr><td style="padding: 8px 0;">XP ganados</td><td style="padding: 8px 0; text-align: right; color: #059669; font-weight: 700;">+${opts.xpEarned} XP</td></tr>
      </table>
      <div style="text-align: center; margin: 28px 0 0;">
        <a href="${esc(opts.predictionsUrl)}" style="background: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
          Ver más mercados
        </a>
      </div>
      <div style="margin-top: 28px; text-align: center;">
        <img src="${LOGO_URL}" alt="Crowd Conscious" width="100" style="margin: 0 auto; display: block; opacity: 0.9;" />
      </div>
    </div>
  </div>`

  return { subject, html }
}

/** Up to ~3 sentences for the digest (Spanish punctuation). */
function excerptFirstSentences(text: string, maxSentences: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  const parts = t.split(/(?<=[.!?…])\s+/u).filter((p) => p.length > 0)
  if (parts.length <= maxSentences) return t
  return parts.slice(0, maxSentences).join(' ').trim()
}

export type BlogDigestMarket = {
  id: string
  title: string
  total_votes: number | null
  category: string | null
  /** e.g. "Hospitalidad 31% · Seguridad 28%" or "90% dice Sí" */
  resultsLine?: string | null
  /** Spec: multi-option → Opinar →; binary → Predecir → */
  marketStyle: 'binary' | 'multi'
}

export type BlogPostDigest = {
  slug: string
  title: string
  excerpt: string
  category: string
  /** Full markdown body (newsletter renders full HTML when under word limit) */
  content?: string | null
  cover_image_url?: string | null
  published_at?: string | null
}

function blogMarkdownWordCount(md: string | null | undefined): number {
  if (!md?.trim()) return 0
  return md.trim().split(/\s+/).filter(Boolean).length
}

/** Inline styles for email clients (Gmail/Outlook) — markdown → HTML from `marked`. */
function styleBlogEmailHtml(html: string): string {
  return html
    .replace(/<p>/g, '<p style="color: #d1d5db; font-size: 15px; line-height: 1.7; font-family: Arial, sans-serif; margin: 0 0 16px;">')
    .replace(/<h1>/g, '<h1 style="color: #ffffff; font-size: 22px; font-weight: bold; font-family: Arial, sans-serif; margin: 24px 0 12px;">')
    .replace(/<h2>/g, '<h2 style="color: #ffffff; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif; margin: 28px 0 12px;">')
    .replace(/<h3>/g, '<h3 style="color: #ffffff; font-size: 17px; font-weight: bold; font-family: Arial, sans-serif; margin: 24px 0 10px;">')
    .replace(/<h4>/g, '<h4 style="color: #e5e7eb; font-size: 15px; font-weight: bold; font-family: Arial, sans-serif; margin: 20px 0 8px;">')
    .replace(/<strong>/g, '<strong style="color: #ffffff;">')
    .replace(/<a /g, '<a style="color: #10b981; text-decoration: underline;" ')
    .replace(/<ul>/g, '<ul style="color: #d1d5db; padding-left: 20px; margin: 0 0 16px;">')
    .replace(/<ol>/g, '<ol style="color: #d1d5db; padding-left: 20px; margin: 0 0 16px;">')
    .replace(/<li>/g, '<li style="margin-bottom: 8px; font-size: 15px; line-height: 1.6;">')
    .replace(/<blockquote>/g, '<blockquote style="border-left: 3px solid #10b981; padding-left: 16px; margin: 16px 0; color: #9ca3af; font-style: italic;">')
    .replace(/<hr>/g, '<hr style="border: none; border-top: 1px solid #2d3748; margin: 24px 0;">')
    .replace(/<hr\/>/g, '<hr style="border: none; border-top: 1px solid #2d3748; margin: 24px 0;">')
    .replace(/<pre>/g, '<pre style="background: #1a2029; padding: 14px; border-radius: 8px; overflow: auto; font-size: 13px; color: #e2e8f0;">')
    .replace(/<img /g, '<img style="max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0;" ')
    .replace(/<table>/g, '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; color: #d1d5db;">')
}

const EMAIL_FONT = `Arial, Helvetica, sans-serif`

function buildBlogDigestSection(post: BlogPostDigest, highlightNewBlog: boolean): string {
  const blogUrl = `${APP_URL}/blog/${post.slug}`
  const snippet = excerptFirstSentences(post.excerpt, 3)
  const words = blogMarkdownWordCount(post.content ?? undefined)
  const isLong = words > 1500
  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const badge = highlightNewBlog ? '📝 Nuevo en el blog' : '📝 Blog'
  const coverImg = post.cover_image_url?.trim()
    ? `<img src="${esc(post.cover_image_url.trim())}" alt="" width="552" style="width: 100%; max-height: 250px; object-fit: cover; border-radius: 12px; margin-bottom: 20px; display: block;" />`
    : ''

  if (isLong) {
    const excerptPara = esc(snippet || post.excerpt || '')
    return `
    <div style="padding: 24px 24px 20px;">
      ${coverImg}
      <p style="color: #10b981; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; font-family: ${EMAIL_FONT};">
        ${badge}
      </p>
      <h2 style="color: #ffffff; font-size: 20px; font-family: ${EMAIL_FONT}; margin: 0 0 12px; line-height: 1.3;">
        ${esc(post.title)}
      </h2>
      ${
        dateStr
          ? `<p style="color: #6b7280; font-size: 12px; font-family: ${EMAIL_FONT}; margin: 0 0 16px;">${esc(dateStr)}</p>`
          : ''
      }
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT}; margin: 0 0 12px;">
        ${excerptPara}
      </p>
      <a href="${esc(blogUrl)}"
        style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; font-family: ${EMAIL_FONT};">
        Leer artículo completo →
      </a>
    </div>`
  }

  const raw = post.content?.trim()
  if (!raw) {
    return `
    <div style="padding: 24px 24px 20px;">
      ${coverImg}
      <p style="color: #10b981; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; font-family: ${EMAIL_FONT};">
        ${badge}
      </p>
      <h2 style="color: #ffffff; font-size: 20px; font-family: ${EMAIL_FONT}; margin: 0 0 12px; line-height: 1.3;">
        ${esc(post.title)}
      </h2>
      <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT}; margin: 0 0 12px;">
        ${esc(snippet)}
      </p>
      <a href="${esc(blogUrl)}"
        style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; font-family: ${EMAIL_FONT};">
        Leer artículo →
      </a>
    </div>`
  }

  const parsed = marked(normalizeBlogMarkdownForDisplay(raw), { async: false }) as string
  const styledContent = styleBlogEmailHtml(sanitizeBlogEmailHtmlHrefs(parsed))

  return `
    <div style="padding: 24px 24px 20px;">
      ${coverImg}
      <p style="color: #10b981; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px; font-family: ${EMAIL_FONT};">
        ${badge}
      </p>
      <h1 style="color: #ffffff; font-size: 24px; font-family: ${EMAIL_FONT}; margin: 10px 0 8px; line-height: 1.3;">
        ${esc(post.title)}
      </h1>
      ${
        dateStr
          ? `<p style="color: #6b7280; font-size: 12px; font-family: ${EMAIL_FONT}; margin: 0 0 20px;">${esc(dateStr)}</p>`
          : ''
      }
      <div style="padding: 0;">
        ${styledContent}
      </div>
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #2d3748;">
        <a href="${esc(blogUrl)}"
          style="color: #10b981; font-size: 13px; text-decoration: none; font-family: ${EMAIL_FONT};">
          Ver en el sitio (con comentarios) →
        </a>
      </div>
    </div>`
}

function marketRowHtml(m: BlogDigestMarket): string {
  const marketUrl = `${APP_URL}/predictions/markets/${m.id}`
  const ctaLabel = m.marketStyle === 'binary' ? 'Predecir →' : 'Opinar →'
  const question = esc(formatMarketQuestionForSubject(m.title))

  if (m.resultsLine) {
    return `
    <div style="background: #1a2029; border-radius: 8px; padding: 16px; margin-bottom: 8px;">
      <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0 0 8px; line-height: 1.35; font-family: ${EMAIL_FONT};">
        ${question}
      </p>
      <p style="color: #e2e8f0; font-size: 13px; margin: 0; line-height: 1.5; font-family: ${EMAIL_FONT};">
        ${esc(m.resultsLine)} · <a href="${esc(marketUrl)}" style="color: #10b981; font-size: 13px; text-decoration: none; font-weight: bold;">${ctaLabel}</a>
      </p>
    </div>`
  }

  return `
    <div style="background: #1a2029; border-radius: 8px; padding: 16px; margin-bottom: 8px;">
      <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0 0 8px; line-height: 1.35; font-family: ${EMAIL_FONT};">
        ${question}
      </p>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5; font-family: ${EMAIL_FONT};">
        ${m.total_votes ?? 0} opiniones · ${esc(String(m.category ?? '—'))} · <a href="${esc(marketUrl)}" style="color: #10b981; font-size: 13px; text-decoration: none; font-weight: bold;">Predecir →</a>
      </p>
    </div>`
}

/** Blog + optional Pulse + trending markets; dark theme (#0f1419), Arial-safe. */
export function crowdNewsletterEmailTemplate(opts: {
  post: BlogPostDigest | null
  /** Use post title in subject when this edition newly features the latest post */
  highlightNewBlog: boolean
  pulseMarket: BlogDigestMarket | null
  markets: BlogDigestMarket[]
  fundTotalMxn: number
  unsubscribeUrl: string | null
  daysUntilWorldCup?: number
}): { subject: string; html: string } {
  const subject =
    opts.post && opts.highlightNewBlog
      ? `${opts.post.title.replace(/\s+/g, ' ').trim().slice(0, 90)} | Crowd Conscious`
      : 'Lo que CDMX piensa esta semana | Crowd Conscious'

  const fundFormatted = Math.round(opts.fundTotalMxn).toLocaleString('es-MX', {
    maximumFractionDigits: 0,
  })

  const divider =
    '<div style="height: 0; margin: 0 20px; border: 0; border-top: 1px solid #2d3748;" role="separator" aria-hidden="true"></div>'

  const blogBlock = opts.post
    ? buildBlogDigestSection(opts.post, opts.highlightNewBlog)
    : `
    <div style="padding: 24px 24px 12px;">
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; font-family: ${EMAIL_FONT}; margin: 0;">
        Análisis e historias en <a href="${esc(`${APP_URL}/blog`)}" style="color: #10b981; font-weight: bold;"><span style="font-family: ${EMAIL_FONT};">crowdconscious.app/blog</span></a>
      </p>
    </div>`

  const pulseBlock = opts.pulseMarket
    ? `
    <div style="padding: 0 24px 16px;">
      <div style="padding: 20px; background: #1a2029; border: 1px solid rgba(16,185,129,0.35); border-radius: 12px;">
        <span style="color: #f59e0b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-family: ${EMAIL_FONT};">📊 Pulse activo</span>
        <h3 style="color: #ffffff; font-size: 16px; font-family: ${EMAIL_FONT}; margin: 8px 0 12px; line-height: 1.35;">
          ${esc(formatMarketQuestionForSubject(opts.pulseMarket.title))}
        </h3>
        <p style="color: #9ca3af; font-size: 13px; font-family: ${EMAIL_FONT}; margin: 0 0 12px;">
          ${opts.pulseMarket.total_votes ?? 0} opiniones · ¿Ya diste la tuya?
        </p>
        <a href="${esc(`${APP_URL}/predictions/markets/${opts.pulseMarket.id}`)}"
          style="display: inline-block; background: transparent; color: #10b981; border: 1px solid #10b981; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px; font-family: ${EMAIL_FONT};">
          Opinar →
        </a>
      </div>
    </div>`
    : ''

  const marketRows = opts.markets.map((m) => marketRowHtml(m)).join('')
  const fundUrl = `${APP_URL}/predictions/fund`
  const wc =
    typeof opts.daysUntilWorldCup === 'number' && opts.daysUntilWorldCup > 0
      ? `<p style="color: #6b7280; font-size: 12px; text-align: center; font-family: ${EMAIL_FONT}; margin: 0 0 8px;">⚽ Mundial 2026: ~${opts.daysUntilWorldCup} días</p>`
      : ''

  const html = `
  <div style="font-family: ${EMAIL_FONT}; max-width: 600px; margin: 0 auto; background: #0f1419; color: #f9fafb;">
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2d3748;">
      <img src="${LOGO_URL}" alt="Crowd Conscious" width="120" style="height: auto; margin: 0 auto;" />
    </div>
    ${blogBlock}
    ${pulseBlock}
    ${divider}
    <div style="padding: 22px 24px 8px;">
      <h2 style="color: #ffffff; font-size: 15px; margin: 0 0 14px; font-weight: 700; font-family: ${EMAIL_FONT};">
        🔥 Mercados activos
      </h2>
      ${marketRows || '<p style="color:#64748b;font-size:14px;font-family: Arial, sans-serif;">Pronto más mercados.</p>'}
    </div>
    ${divider}
    <div style="padding: 20px 24px 8px; text-align: center;">
      <p style="color: #10b981; font-size: 14px; margin: 0 0 6px; font-weight: 600; font-family: ${EMAIL_FONT};">
        💚 Fondo Consciente: $${esc(fundFormatted)} MXN para causas sociales
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 12px; line-height: 1.5; font-family: ${EMAIL_FONT};">
        Cada opinión y predicción impulsa el fondo.
      </p>
      ${wc}
      <a href="${esc(fundUrl)}" style="color: #10b981; font-size: 13px; font-weight: 600; text-decoration: none; font-family: ${EMAIL_FONT};">
        Ver causas activas →
      </a>
    </div>
    ${blogDigestEmailFooter(opts.unsubscribeUrl)}
  </div>`

  return { subject, html }
}

/** @deprecated Use crowdNewsletterEmailTemplate — kept for tests */
export function blogDigestNewsletterTemplate(opts: {
  post: BlogPostDigest
  markets: BlogDigestMarket[]
  fundTotalMxn: number
  unsubscribeUrl: string | null
}): { subject: string; html: string } {
  return crowdNewsletterEmailTemplate({
    post: opts.post,
    highlightNewBlog: true,
    pulseMarket: null,
    markets: opts.markets,
    fundTotalMxn: opts.fundTotalMxn,
    unsubscribeUrl: opts.unsubscribeUrl,
  })
}

export type ReengagementMarket = { title: string; yesPercent: number; url: string }

export function reengagementInactiveTemplate(opts: {
  markets: ReengagementMarket[]
  unsubscribeUrl: string | null
}): { subject: string; html: string } {
  const subject = 'Han pasado 7 días — la comunidad sigue prediciendo sin ti'

  const rows = opts.markets
    .map(
      (m) => `
    <div style="border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin-bottom: 14px; background: #f8fafc;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #0f172a; font-size: 15px;">${esc(m.title)}</p>
      <p style="margin: 0 0 12px; color: #64748b; font-size: 14px;">La comunidad: <strong>${Math.round(m.yesPercent)}% YES</strong></p>
      <a href="${esc(m.url)}" style="display: inline-block; background: #059669; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Votar</a>
    </div>
  `
    )
    .join('')

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
    <div style="background: linear-gradient(135deg, #0f766e 0%, #6366f1 100%); padding: 28px 24px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #ffffff; font-size: 20px; margin: 0;">Te extrañamos en Crowd Conscious</h1>
    </div>
    <div style="padding: 24px; background: #ffffff; border-radius: 0 0 12px 12px;">
      <p style="color: #334155; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
        Han pasado 7 días desde tu última predicción. Aquí tienes tres mercados donde la comunidad está activa — y tú aún no has votado:
      </p>
      ${rows}
      ${emailFooter(opts.unsubscribeUrl)}
    </div>
  </div>`

  return { subject, html }
}
