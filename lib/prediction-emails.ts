/**
 * HTML email templates for prediction flows (Resend).
 * Uses same visual language as lib/resend.ts (Crowd Conscious branding).
 */

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
}

/** Weekly-style newsletter: featured blog post + trending markets (replaces random daily market). */
export function blogDigestNewsletterTemplate(opts: {
  post: BlogPostDigest
  markets: BlogDigestMarket[]
  fundTotalMxn: number
  unsubscribeUrl: string | null
}): { subject: string; html: string } {
  const subject = 'Lo que CDMX piensa esta semana | Crowd Conscious'

  const snippet = excerptFirstSentences(opts.post.excerpt, 3)
  const fundFormatted = Math.round(opts.fundTotalMxn).toLocaleString('es-MX', {
    maximumFractionDigits: 0,
  })

  const divider =
    '<div style="height: 0; margin: 0 20px; border: 0; border-top: 1px solid #2d3748;" role="separator" aria-hidden="true"></div>'

  const marketRows = opts.markets
    .map((m) => {
      const marketUrl = `${APP_URL}/predictions/markets/${m.id}`
      const ctaLabel = m.marketStyle === 'binary' ? 'Predecir →' : 'Opinar →'
      const question = esc(formatMarketQuestionForSubject(m.title))

      if (m.resultsLine) {
        return `
    <div style="background: #1a2029; border-radius: 8px; padding: 16px; margin-bottom: 8px;">
      <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0 0 8px; line-height: 1.35;">
        ${question}
      </p>
      <p style="color: #e2e8f0; font-size: 13px; margin: 0; line-height: 1.5;">
        ${esc(m.resultsLine)} · <a href="${esc(marketUrl)}" style="color: #10b981; font-size: 13px; text-decoration: none; font-weight: bold;">${ctaLabel}</a>
      </p>
    </div>`
      }

      return `
    <div style="background: #1a2029; border-radius: 8px; padding: 16px; margin-bottom: 8px;">
      <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0 0 8px; line-height: 1.35;">
        ${question}
      </p>
      <p style="color: #9ca3af; font-size: 13px; margin: 0; line-height: 1.5;">
        ${m.total_votes ?? 0} opiniones · ${esc(String(m.category ?? '—'))} · <a href="${esc(marketUrl)}" style="color: #10b981; font-size: 13px; text-decoration: none; font-weight: bold;">Predecir →</a>
      </p>
    </div>`
    })
    .join('')

  const fundUrl = `${APP_URL}/predictions/fund`

  const html = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1419; color: #f9fafb;">
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2d3748;">
      <img src="${LOGO_URL}" alt="Crowd Conscious" width="120" style="height: auto; margin: 0 auto;" />
    </div>
    <div style="padding: 28px 24px 20px;">
      <p style="color: #10b981; font-size: 13px; font-weight: 600; margin: 0 0 10px;">
        📊 Esta semana en Crowd Conscious
      </p>
      <p style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 12px;">
        Fragmento destacado — máx. 3 frases
      </p>
      <p style="color: #cbd5e1; font-size: 15px; line-height: 1.65; margin: 0 0 22px;">
        <span style="color: #94a3b8;">&#8220;</span>${esc(snippet)}<span style="color: #94a3b8;">&#8221;</span>
      </p>
      <a href="${esc(`${APP_URL}/blog/${opts.post.slug}`)}"
        style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Leer análisis completo →
      </a>
    </div>
    ${divider}
    <div style="padding: 22px 24px 8px;">
      <h2 style="color: #ffffff; font-size: 16px; margin: 0 0 14px; font-weight: 700;">
        🔥 Mercados activos esta semana
      </h2>
      ${marketRows || '<p style="color:#64748b;font-size:14px;">Pronto más mercados.</p>'}
    </div>
    ${divider}
    <div style="padding: 20px 24px 8px; text-align: center;">
      <p style="color: #10b981; font-size: 14px; margin: 0 0 6px; font-weight: 600;">
        💚 Fondo Consciente: $${esc(fundFormatted)} MXN para causas sociales
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 12px; line-height: 1.5;">
        Cada opinión y predicción impulsa el fondo.
      </p>
      <a href="${esc(fundUrl)}" style="color: #10b981; font-size: 13px; font-weight: 600; text-decoration: none;">
        Ver causas activas →
      </a>
    </div>
    ${blogDigestEmailFooter(opts.unsubscribeUrl)}
  </div>`

  return { subject, html }
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
