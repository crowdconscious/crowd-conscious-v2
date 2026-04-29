/**
 * Sponsor Pulse transactional email templates — bilingual.
 *
 * Pattern mirrors `lib/live-event-emails.ts`: locale is passed explicitly
 * as a function argument, subject and HTML are duplicated per branch, no
 * client-side rendering.
 *
 * Two emails currently supported:
 *   - Pulse launch: sent right after a sponsor publishes a new Pulse.
 *   - Pulse closure: sent when that Pulse resolves (auto-resolve cron OR
 *     admin resolve — both flow through lib/market-resolution-notifications).
 *
 * Every email includes a "manage notifications" CTA that lands on the
 * sponsor dashboard section, AND a one-click unsubscribe link specific
 * to the email type (so a pulse_launch unsub can't silence pulse_closure).
 */

type Locale = 'es' | 'en'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'

const BRAND = {
  accent: '#10b981',
  bg: '#0f1419',
  card: '#11161c',
  text: '#e2e8f0',
  muted: '#94a3b8',
  border: '#2d3748',
}

function fmtDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function shell(opts: {
  title: string
  previewText: string
  body: string
  locale: Locale
  unsubscribeUrl: string
  manageUrl: string
}): string {
  const c = opts.locale === 'en'
    ? { powered: 'Powered by Crowd Conscious', manage: 'Manage email preferences', unsub: 'Unsubscribe from these emails' }
    : { powered: 'Crowd Conscious', manage: 'Administrar mis preferencias', unsub: 'Dejar de recibir estos correos' }

  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};color:${BRAND.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.previewText)}</div>
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;padding:28px;">
      ${opts.body}
    </div>
    <div style="margin-top:24px;text-align:center;color:${BRAND.muted};font-size:12px;line-height:1.6;">
      <div><a href="${opts.manageUrl}" style="color:${BRAND.muted};text-decoration:underline;">${c.manage}</a> &middot; <a href="${opts.unsubscribeUrl}" style="color:${BRAND.muted};text-decoration:underline;">${c.unsub}</a></div>
      <div style="margin-top:8px;">${c.powered} &middot; <a href="${APP_URL}" style="color:${BRAND.muted};text-decoration:underline;">crowdconscious.app</a></div>
    </div>
  </div>
</body>
</html>`
}

export type SponsorPulseLaunchEmailInput = {
  sponsorName: string
  marketTitle: string
  marketQuestion?: string | null
  marketId: string
  endsAtIso: string
  publicPulseUrl: string
  dashboardReportUrl: string
  coverImageUrl?: string | null
  locale: Locale
  unsubscribeUrl: string
  manageUrl: string
}

export function sponsorPulseLaunchTemplate(
  input: SponsorPulseLaunchEmailInput
): { subject: string; html: string } {
  const isEn = input.locale === 'en'
  const dateLabel = fmtDate(input.endsAtIso, input.locale)

  const subject = isEn
    ? `[Crowd Conscious] Your Pulse is live: "${input.marketTitle}"`
    : `[Crowd Conscious] Tu Pulse ya está en vivo: "${input.marketTitle}"`

  const previewText = isEn
    ? `Share the link to start collecting answers. Closes ${dateLabel}.`
    : `Comparte el enlace para empezar a recolectar respuestas. Cierra ${dateLabel}.`

  const heading = isEn ? 'Your Pulse is live 🚀' : 'Tu Pulse ya está en vivo 🚀'
  const intro = isEn
    ? `Hi ${escapeHtml(input.sponsorName)} — your sponsored Pulse just went live on Crowd Conscious.`
    : `Hola ${escapeHtml(input.sponsorName)} — tu Pulse patrocinado ya está en vivo en Crowd Conscious.`

  const endsLine = isEn
    ? `<strong style="color:${BRAND.text};">Closes:</strong> ${escapeHtml(dateLabel)}`
    : `<strong style="color:${BRAND.text};">Cierra:</strong> ${escapeHtml(dateLabel)}`

  const questionBlock = input.marketQuestion
    ? `<p style="margin:0 0 12px 0;color:${BRAND.muted};font-size:14px;line-height:1.6;">${escapeHtml(input.marketQuestion)}</p>`
    : ''

  const coverBlock = input.coverImageUrl
    ? `<img src="${escapeHtml(input.coverImageUrl)}" alt="" style="width:100%;max-height:220px;object-fit:cover;border-radius:12px;margin:0 0 20px 0;display:block;">`
    : ''

  const ctaShare = isEn ? 'View & share the Pulse' : 'Ver y compartir el Pulse'
  const ctaDashboard = isEn ? 'Open sponsor dashboard' : 'Abrir panel de patrocinador'

  const nextStepsHead = isEn ? 'Next steps' : 'Próximos pasos'
  const nextSteps = isEn
    ? `
        <li style="margin:4px 0;">Share the public Pulse link on LinkedIn, WhatsApp, newsletter.</li>
        <li style="margin:4px 0;">Monitor responses anytime from your dashboard — no login needed; the link is in this email.</li>
        <li style="margin:4px 0;">When it closes, we'll email you again with the outcome + sharable results card.</li>
      `
    : `
        <li style="margin:4px 0;">Comparte el enlace público del Pulse en LinkedIn, WhatsApp, newsletter.</li>
        <li style="margin:4px 0;">Revisa las respuestas cuando quieras desde tu dashboard — sin login; el enlace está en este correo.</li>
        <li style="margin:4px 0;">Al cierre te avisamos con el resultado y una tarjeta compartible.</li>
      `

  const body = `
    <h1 style="margin:0 0 16px 0;color:${BRAND.text};font-size:22px;line-height:1.3;">${heading}</h1>
    <p style="margin:0 0 16px 0;color:${BRAND.muted};font-size:14px;line-height:1.6;">${intro}</p>
    ${coverBlock}
    <h2 style="margin:0 0 8px 0;color:${BRAND.text};font-size:17px;line-height:1.3;">${escapeHtml(input.marketTitle)}</h2>
    ${questionBlock}
    <p style="margin:0 0 20px 0;color:${BRAND.muted};font-size:13px;">${endsLine}</p>
    <div style="margin:24px 0;text-align:center;">
      <a href="${input.publicPulseUrl}" style="display:inline-block;background:${BRAND.accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${ctaShare}</a>
    </div>
    <div style="margin:12px 0 24px 0;text-align:center;">
      <a href="${input.dashboardReportUrl}" style="display:inline-block;color:${BRAND.accent};text-decoration:none;font-size:13px;">${ctaDashboard} →</a>
    </div>
    <div style="border-top:1px solid ${BRAND.border};padding-top:16px;margin-top:20px;">
      <h3 style="margin:0 0 8px 0;color:${BRAND.text};font-size:14px;">${nextStepsHead}</h3>
      <ul style="margin:0;padding:0 0 0 18px;color:${BRAND.muted};font-size:13px;line-height:1.6;">
        ${nextSteps}
      </ul>
    </div>
  `

  return {
    subject,
    html: shell({
      title: subject,
      previewText,
      body,
      locale: input.locale,
      unsubscribeUrl: input.unsubscribeUrl,
      manageUrl: input.manageUrl,
    }),
  }
}

export type SponsorPulseClosureEmailInput = {
  sponsorName: string
  marketTitle: string
  marketId: string
  winningLabel: string | null
  totalVoters?: number | null
  publicPulseUrl: string
  dashboardReportUrl: string
  locale: Locale
  unsubscribeUrl: string
  manageUrl: string
}

export function sponsorPulseClosureTemplate(
  input: SponsorPulseClosureEmailInput
): { subject: string; html: string } {
  const isEn = input.locale === 'en'

  const subject = isEn
    ? `[Crowd Conscious] Your Pulse closed: "${input.marketTitle}"`
    : `[Crowd Conscious] Tu Pulse cerró: "${input.marketTitle}"`

  const previewText = isEn
    ? `The results are ready. Open the report inside your dashboard.`
    : `Los resultados están listos. Abre el reporte en tu dashboard.`

  const heading = isEn ? 'Your Pulse closed 🎯' : 'Tu Pulse cerró 🎯'

  const intro = isEn
    ? `Hi ${escapeHtml(input.sponsorName)} — voting ended on your sponsored Pulse. Here's the quick read.`
    : `Hola ${escapeHtml(input.sponsorName)} — la votación terminó en tu Pulse patrocinado. Este es el resumen rápido.`

  const outcomeLabel = input.winningLabel
    ? isEn
      ? `<strong style="color:${BRAND.text};">Leading answer:</strong> ${escapeHtml(input.winningLabel)}`
      : `<strong style="color:${BRAND.text};">Respuesta líder:</strong> ${escapeHtml(input.winningLabel)}`
    : isEn
      ? `<strong style="color:${BRAND.text};">Leading answer:</strong> —`
      : `<strong style="color:${BRAND.text};">Respuesta líder:</strong> —`

  const votersLabel = typeof input.totalVoters === 'number' && input.totalVoters >= 0
    ? isEn
      ? `<strong style="color:${BRAND.text};">Total voters:</strong> ${input.totalVoters.toLocaleString('en-US')}`
      : `<strong style="color:${BRAND.text};">Votantes totales:</strong> ${input.totalVoters.toLocaleString('es-MX')}`
    : ''

  const ctaReport = isEn ? 'Open the full report' : 'Abrir el reporte completo'
  const ctaShareCard = isEn ? 'Share public results' : 'Compartir resultados'

  const whatsNextHead = isEn ? 'What you can do now' : 'Qué puedes hacer ahora'
  const whatsNext = isEn
    ? `
        <li style="margin:4px 0;">Download the report PDF + CSV for your internal deck.</li>
        <li style="margin:4px 0;">Share the public results card on LinkedIn — cites your brand as the sponsor.</li>
        <li style="margin:4px 0;">Plan your next Pulse — your current plan may still have capacity.</li>
      `
    : `
        <li style="margin:4px 0;">Descarga el reporte PDF + CSV para tu deck interno.</li>
        <li style="margin:4px 0;">Comparte la tarjeta pública de resultados en LinkedIn — cita tu marca como patrocinador.</li>
        <li style="margin:4px 0;">Planea tu siguiente Pulse — tu plan actual puede seguir teniendo cupo.</li>
      `

  const body = `
    <h1 style="margin:0 0 16px 0;color:${BRAND.text};font-size:22px;line-height:1.3;">${heading}</h1>
    <p style="margin:0 0 16px 0;color:${BRAND.muted};font-size:14px;line-height:1.6;">${intro}</p>
    <h2 style="margin:0 0 12px 0;color:${BRAND.text};font-size:17px;line-height:1.3;">${escapeHtml(input.marketTitle)}</h2>
    <div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:10px;padding:16px;margin:0 0 20px 0;">
      <p style="margin:0 0 6px 0;color:${BRAND.muted};font-size:13px;line-height:1.6;">${outcomeLabel}</p>
      ${votersLabel ? `<p style="margin:0;color:${BRAND.muted};font-size:13px;line-height:1.6;">${votersLabel}</p>` : ''}
    </div>
    <div style="margin:20px 0;text-align:center;">
      <a href="${input.dashboardReportUrl}" style="display:inline-block;background:${BRAND.accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${ctaReport}</a>
    </div>
    <div style="margin:12px 0 24px 0;text-align:center;">
      <a href="${input.publicPulseUrl}" style="display:inline-block;color:${BRAND.accent};text-decoration:none;font-size:13px;">${ctaShareCard} →</a>
    </div>
    <div style="border-top:1px solid ${BRAND.border};padding-top:16px;margin-top:20px;">
      <h3 style="margin:0 0 8px 0;color:${BRAND.text};font-size:14px;">${whatsNextHead}</h3>
      <ul style="margin:0;padding:0 0 0 18px;color:${BRAND.muted};font-size:13px;line-height:1.6;">
        ${whatsNext}
      </ul>
    </div>
  `

  return {
    subject,
    html: shell({
      title: subject,
      previewText,
      body,
      locale: input.locale,
      unsubscribeUrl: input.unsubscribeUrl,
      manageUrl: input.manageUrl,
    }),
  }
}

export type SponsorPulseReportReadyEmailInput = {
  sponsorName: string
  marketTitle: string
  marketId: string
  /** 1-2 sentence preview of the executive summary (truncated). */
  previewSummary: string | null
  /** /dashboard/sponsor/[token]/report/[marketId] absolute URL. */
  dashboardReportUrl: string
  /** Absolute URL to the PDF (server route, not signed storage URL). */
  pdfDownloadUrl: string
  locale: Locale
  unsubscribeUrl: string
  manageUrl: string
}

/**
 * Sent when a Pulse executive report has been generated and is ready for
 * the sponsor to review. Body links to the dashboard report and the PDF
 * download. The cron sends this only when SPONSOR_PULSE_REPORT_AUTO_EMAIL=1
 * (off by default during the MH pilot — see app/api/cron/pulse-auto-resolve).
 */
export function sponsorPulseReportReadyTemplate(
  input: SponsorPulseReportReadyEmailInput
): { subject: string; html: string } {
  const isEn = input.locale === 'en'

  const subject = isEn
    ? `[Crowd Conscious] Executive report ready: "${input.marketTitle}"`
    : `[Crowd Conscious] Reporte ejecutivo listo: "${input.marketTitle}"`

  const previewText = isEn
    ? 'Your sponsor report is ready. Open the dashboard or download the PDF.'
    : 'Tu reporte ejecutivo está listo. Ábrelo en el dashboard o descarga el PDF.'

  const heading = isEn
    ? 'Your executive report is ready 📑'
    : 'Tu reporte ejecutivo está listo 📑'

  const intro = isEn
    ? `Hi ${escapeHtml(input.sponsorName)} — Crowd Conscious has generated the executive report for your sponsored Pulse. It includes the agent-written summary, conviction analysis, anonymised voter reasoning, and recommended next steps.`
    : `Hola ${escapeHtml(input.sponsorName)} — Crowd Conscious generó el reporte ejecutivo de tu Pulse patrocinado. Incluye el resumen ejecutivo escrito por el agente, análisis de convicción, razones anonimizadas de los votantes y recomendaciones de siguientes pasos.`

  const previewBlock = input.previewSummary
    ? `<div style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-left:3px solid ${BRAND.accent};padding:14px 16px;margin:20px 0;border-radius:8px;">
        <p style="margin:0;color:${BRAND.muted};font-size:13px;line-height:1.6;font-style:italic;">${escapeHtml(input.previewSummary)}</p>
      </div>`
    : ''

  const ctaReport = isEn ? 'Open report in dashboard' : 'Abrir reporte en el dashboard'
  const ctaPdf = isEn ? 'Download PDF' : 'Descargar PDF'

  const insideHead = isEn ? "What's inside" : 'Qué incluye'
  const insideList = isEn
    ? `
        <li style="margin:4px 0;">~150-word executive summary in Spanish</li>
        <li style="margin:4px 0;">Vote breakdown with per-option average confidence</li>
        <li style="margin:4px 0;">Conviction analysis — votes vs. confidence divergence</li>
        <li style="margin:4px 0;">Anonymised voter reasoning, sortable</li>
        <li style="margin:4px 0;">Daily participation timeline</li>
        <li style="margin:4px 0;">3–5 recommended next steps tied to your data</li>
      `
    : `
        <li style="margin:4px 0;">Resumen ejecutivo de ~150 palabras en español</li>
        <li style="margin:4px 0;">Distribución de votos con confianza promedio por opción</li>
        <li style="margin:4px 0;">Análisis de convicción — divergencia entre votos y confianza</li>
        <li style="margin:4px 0;">Razones de los votantes (anonimizadas, ordenables)</li>
        <li style="margin:4px 0;">Línea de tiempo diaria de participación</li>
        <li style="margin:4px 0;">3–5 recomendaciones siguientes basadas en tus datos</li>
      `

  const body = `
    <h1 style="margin:0 0 16px 0;color:${BRAND.text};font-size:22px;line-height:1.3;">${heading}</h1>
    <p style="margin:0 0 12px 0;color:${BRAND.muted};font-size:14px;line-height:1.6;">${intro}</p>
    <h2 style="margin:18px 0 6px 0;color:${BRAND.text};font-size:17px;line-height:1.3;">${escapeHtml(input.marketTitle)}</h2>
    ${previewBlock}
    <div style="margin:24px 0 12px 0;text-align:center;">
      <a href="${input.dashboardReportUrl}" style="display:inline-block;background:${BRAND.accent};color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px;">${ctaReport}</a>
    </div>
    <div style="margin:0 0 24px 0;text-align:center;">
      <a href="${input.pdfDownloadUrl}" style="display:inline-block;color:${BRAND.accent};text-decoration:none;font-size:13px;">${ctaPdf} →</a>
    </div>
    <div style="border-top:1px solid ${BRAND.border};padding-top:16px;margin-top:20px;">
      <h3 style="margin:0 0 8px 0;color:${BRAND.text};font-size:14px;">${insideHead}</h3>
      <ul style="margin:0;padding:0 0 0 18px;color:${BRAND.muted};font-size:13px;line-height:1.6;">
        ${insideList}
      </ul>
    </div>
  `

  return {
    subject,
    html: shell({
      title: subject,
      previewText,
      body,
      locale: input.locale,
      unsubscribeUrl: input.unsubscribeUrl,
      manageUrl: input.manageUrl,
    }),
  }
}
