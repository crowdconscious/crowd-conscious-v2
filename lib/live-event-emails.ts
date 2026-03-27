import { sendEmail } from '@/lib/resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
const FROM = 'Crowd Conscious <comunidad@crowdconscious.app>'

export function liveMatchStartingSoonTemplate(opts: {
  eventTitle: string
  matchDateLocal: string
  liveUrl: string
  locale: 'en' | 'es'
}) {
  const { eventTitle, matchDateLocal, liveUrl, locale } = opts
  if (locale === 'es') {
    return {
      subject: `En 1 hora: ${eventTitle} — Conscious Live`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0f766e, #0e7490); padding: 28px 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">Tu partido empieza en 1 hora</h1>
          </div>
          <div style="padding: 24px 20px; background: #0f172a; color: #e2e8f0; border-radius: 0 0 12px 12px;">
            <p style="margin: 0 0 12px;"><strong>${eventTitle}</strong></p>
            <p style="margin: 0 0 20px; color: #94a3b8;">${matchDateLocal}</p>
            <p style="line-height: 1.6;">Entra a Conscious Live para votar en micro-mercados durante el partido y sumar XP en el leaderboard.</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${liveUrl}" style="background: #14b8a6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600;">Ir a Conscious Live</a>
            </div>
          </div>
        </div>`,
    }
  }
  return {
    subject: `In 1 hour: ${eventTitle} — Conscious Live`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0f766e, #0e7490); padding: 28px 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Your match starts in 1 hour</h1>
        </div>
        <div style="padding: 24px 20px; background: #0f172a; color: #e2e8f0; border-radius: 0 0 12px 12px;">
          <p style="margin: 0 0 12px;"><strong>${eventTitle}</strong></p>
          <p style="margin: 0 0 20px; color: #94a3b8;">${matchDateLocal}</p>
          <p style="line-height: 1.6;">Join Conscious Live to vote on in-match micro-markets and climb the leaderboard.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${liveUrl}" style="background: #14b8a6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600;">Open Conscious Live</a>
          </div>
        </div>
      </div>`,
  }
}

export function liveMatchResultsTemplate(opts: {
  eventTitle: string
  rank: number
  totalXp: number
  correctCount: number
  voteCount: number
  resultsUrl: string
  locale: 'en' | 'es'
}) {
  const { eventTitle, rank, totalXp, correctCount, voteCount, resultsUrl, locale } = opts
  if (locale === 'es') {
    return {
      subject: `Tus resultados — ${eventTitle}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f172a; padding: 24px; border-radius: 12px; color: #e2e8f0;">
            <h2 style="margin: 0 0 16px; color: #5eead4;">Resultados del partido</h2>
            <p style="margin: 0 0 8px;"><strong>${eventTitle}</strong></p>
            <p style="margin: 0 0 16px;">Tu posición: <strong>#${rank}</strong> · +${totalXp} XP · ${correctCount}/${voteCount} aciertos</p>
            <a href="${resultsUrl}" style="color: #2dd4bf;">Ver resumen en la app</a>
          </div>
        </div>`,
    }
  }
  return {
    subject: `Your results — ${eventTitle}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 24px; border-radius: 12px; color: #e2e8f0;">
          <h2 style="margin: 0 0 16px; color: #5eead4;">Match results</h2>
          <p style="margin: 0 0 8px;"><strong>${eventTitle}</strong></p>
          <p style="margin: 0 0 16px;">Your rank: <strong>#${rank}</strong> · +${totalXp} XP · ${correctCount}/${voteCount} correct</p>
          <a href="${resultsUrl}" style="color: #2dd4bf;">View summary in the app</a>
        </div>
      </div>`,
  }
}

/** Optional: call after signup to nudge new users toward live predictions (feature-flag or manual). */
export async function sendLivePredictionInviteEmail(to: string, locale: 'en' | 'es' = 'en') {
  const tpl =
    locale === 'es'
      ? {
          subject: '¡Te invitamos a predecir en vivo!',
          html: `<p>Prueba <a href="${APP_URL}/live">Conscious Live</a>: micro-mercados durante partidos, XP y causa consciente.</p>`,
        }
      : {
          subject: "You're invited to predict live!",
          html: `<p>Try <a href="${APP_URL}/live">Conscious Live</a>: in-match micro-markets, XP, and fund impact.</p>`,
        }
  return sendEmail(to, tpl, FROM)
}

export async function sendLiveMatchStartingSoonEmail(
  to: string,
  opts: Parameters<typeof liveMatchStartingSoonTemplate>[0]
) {
  return sendEmail(to, liveMatchStartingSoonTemplate(opts), FROM)
}

export async function sendLiveMatchResultsEmail(
  to: string,
  opts: Parameters<typeof liveMatchResultsTemplate>[0]
) {
  return sendEmail(to, liveMatchResultsTemplate(opts), FROM)
}
