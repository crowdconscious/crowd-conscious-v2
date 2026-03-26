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
