import type { ReactElement } from 'react'
import { Resend } from 'resend'
import { render as renderEmail } from '@react-email/render'
import { calculateFundAllocationRounded, normalizeSponsorTierId } from '@/lib/sponsor-tiers'
import { isPredictionResolutionEmailEnabled } from '@/lib/email-flags'
import {
  PULSE_TIERS,
  calculatePulseFundAllocationRounded,
  type PulseTierId,
} from '@/lib/pulse-tiers'
import {
  getCitizenSignalsCopy,
  type CitizenSignalsLocale,
} from '@/lib/i18n/citizen-signals'
import { FilerReceivedEmail } from '@/lib/emails/signals/FilerReceivedEmail'
import { FilerPublishedEmail } from '@/lib/emails/signals/FilerPublishedEmail'
import { FilerRejectedEmail } from '@/lib/emails/signals/FilerRejectedEmail'
import { FilerNeedsEditEmail } from '@/lib/emails/signals/FilerNeedsEditEmail'
import { TargetNotifiedStage1Email } from '@/lib/emails/signals/TargetNotifiedStage1Email'
import {
  TargetRepliedEmail,
  type TargetReplyStatus,
} from '@/lib/emails/signals/TargetRepliedEmail'
import {
  ModeratorDailyDigestEmail,
  type PendingSignalSummary,
} from '@/lib/emails/signals/ModeratorDailyDigestEmail'

export type { PendingSignalSummary } from '@/lib/emails/signals/ModeratorDailyDigestEmail'
export type { TargetReplyStatus } from '@/lib/emails/signals/TargetRepliedEmail'

const PULSE_TIER_IDS = Object.keys(PULSE_TIERS) as PulseTierId[]
function isPulseTier(raw: string | null | undefined): raw is PulseTierId {
  return typeof raw === 'string' && (PULSE_TIER_IDS as string[]).includes(raw)
}

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - email functionality will be disabled')
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  'Crowd Conscious <comunidad@crowdconscious.app>' // Using verified domain
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Email templates
export const emailTemplates = {
  welcomeUser: (userName: string) => {
    const daysWc = Math.ceil((new Date('2026-06-11T12:00:00Z').getTime() - Date.now()) / 86400000)
    return {
      subject: '¡Bienvenido a Crowd Conscious!',
      html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1419; color: #e5e7eb;">
        <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2d3748;">
          <img src="${APP_URL}/images/logo.png" alt="Crowd Conscious" width="120" style="height: auto;" />
        </div>
        <div style="padding: 32px 24px;">
          <h1 style="color: #10b981; font-size: 24px; margin: 0 0 16px;">¡Bienvenido a Crowd Conscious!</h1>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin: 0 0 14px;">
            Hola ${userName} — ahora formas parte de una comunidad que usa inteligencia colectiva para votar sobre lo que importa en CDMX y México, y para impulsar causas reales.
          </p>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            Cada voto suma al Fondo Consciente para proyectos comunitarios. Mientras más participas, más impacto generas.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/predictions" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Explorar Pulses →
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            ⚽ ~${daysWc} días para el Mundial 2026
          </p>
        </div>
        <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #2d3748;">
          <p style="color: #6b7280; font-size: 11px; margin: 0;">Crowd Conscious · Sentimiento público con impacto · CDMX</p>
        </div>
      </div>
    `,
    }
  },

  eventRegistration: (userName: string, eventTitle: string, eventDate: string, eventLocation: string, communityName: string, eventUrl: string) => ({
    subject: `[Crowd Conscious] You're registered for ${eventTitle}! 📅`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">You're All Set! 🎉</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">Hi ${userName}!</p>
          <p style="color: #475569; line-height: 1.6;">
            Great news! You're registered for <strong>${eventTitle}</strong> hosted by ${communityName}.
          </p>
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #1e293b;">📅 Event Details:</h3>
            <p style="margin: 10px 0; color: #475569;"><strong>Event:</strong> ${eventTitle}</p>
            <p style="margin: 10px 0; color: #475569;"><strong>Date:</strong> ${eventDate}</p>
            <p style="margin: 10px 0; color: #475569;"><strong>Location:</strong> ${eventLocation}</p>
            <p style="margin: 10px 0; color: #475569;"><strong>Community:</strong> ${communityName}</p>
          </div>
          <p style="color: #475569; line-height: 1.6;">
            We're excited to see you there! This event is a great opportunity to connect with your community and create real impact together.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">View Event Details</a>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>💡 Tip:</strong> Add this event to your calendar and invite friends to join you!
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 20px;">
            Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
          </p>
        </div>
      </div>
    `
  }),

  sponsorConfirmation: (
    sponsorName: string,
    tier: string,
    amountMXN: number,
    marketTitle?: string,
    category?: string,
    marketId?: string,
    sponsorshipId?: string,
    reportToken?: string,
    dashboardAccessToken?: string
  ) => {
    // Pulse tier strings (`pulse_unico`, `pulse_pack`, `suscripcion`,
    // `mundial_pack`, `mundial_pack_founding`, `pilot`) are not in the
    // market-tier map — falling through to `starter` (20%) is wrong for
    // every Pulse SKU. Branch first, market tiers fall back to the
    // existing sponsor-tier allocation.
    const fundAmount = isPulseTier(tier)
      ? calculatePulseFundAllocationRounded(amountMXN, tier).fundAmountRounded
      : calculateFundAllocationRounded(amountMXN, normalizeSponsorTierId(tier)).fundAmountRounded
    const fundPct = isPulseTier(tier)
      ? Math.round(calculatePulseFundAllocationRounded(amountMXN, tier).fundPercent * 100)
      : Math.round(calculateFundAllocationRounded(amountMXN, normalizeSponsorTierId(tier)).fundPercent * 100)
    const sponsoredLabel = marketTitle
      ? `"${marketTitle}"`
      : category
        ? `${category} category`
        : 'Crowd Conscious'
    const reportLink =
      sponsorshipId && reportToken
        ? `${APP_URL}/sponsor/report/${sponsorshipId}?token=${encodeURIComponent(reportToken)}`
        : null
    const sponsorDashboardLink = dashboardAccessToken
      ? `${APP_URL}/dashboard/sponsor/${dashboardAccessToken}`
      : null
    return {
      subject: 'Your Crowd Conscious sponsorship is live! 🎉',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Your sponsorship is live! 🎉</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">Hi ${sponsorName},</p>
          <p style="color: #475569; line-height: 1.6;">
            Thank you for sponsoring ${sponsoredLabel}. Your brand will appear on the Pulse card, detail page, and share images.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 10px 0; color: #1e293b;"><strong>💰 Your impact</strong></p>
            <p style="margin: 0; color: #475569;">${fundPct}% of estimated net proceeds (${fundAmount.toLocaleString()} MXN) goes to the Conscious Fund for community causes chosen by our users.</p>
          </div>
          ${marketId ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/predictions/markets/${marketId}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View your sponsored market →</a>
          </div>
          ` : `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/sponsor" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View Sponsor Page</a>
          </div>
          `}
          ${sponsorDashboardLink ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${sponsorDashboardLink}" style="background: #0f766e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Your sponsor dashboard (private link) →</a>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 10px;">
            Save this URL — it is your private hub for live stats, fund impact, and PDF reports.
          </p>
          ` : ''}
          ${reportLink ? `
          <div style="text-align: center; margin: 20px 0;">
            <a href="${reportLink}" style="background: #334155; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block; font-size: 14px;">Legacy analytics report →</a>
          </div>
          <p style="color: #64748b; font-size: 12px; margin-top: 10px;">
            You can also use this classic analytics link. Quarterly impact reports arrive by email.
          </p>
          ` : ''}
          ${!reportLink && !sponsorDashboardLink ? `
          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
            You'll receive a quarterly impact report showing how your sponsorship is making a difference.
          </p>
          ` : ''}
        </div>
      </div>
    `
    }
  },

  sponsorshipAdminNotification: (data: {
    sponsorName: string
    sponsorEmail: string
    sponsorUrl?: string
    tier: string
    amountMXN: number
    fundAmount: number
    platformAmount: number
    fundPercent: number
    marketTitle?: string
    marketId?: string
    category?: string
  }) => ({
    subject: `[Crowd Conscious] 🎉 New sponsorship: ${data.sponsorName} — $${data.amountMXN.toLocaleString()} MXN`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 30px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Sponsorship</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #1e293b; font-weight: bold;">${data.sponsorName}</p>
          <p style="color: #475569; margin: 5px 0;">Email: ${data.sponsorEmail}</p>
          ${data.sponsorUrl ? `<p style="color: #475569; margin: 5px 0;">Website: <a href="${data.sponsorUrl}">${data.sponsorUrl}</a></p>` : ''}
          <p style="color: #475569; margin: 5px 0;">Tier: ${data.tier}</p>
          ${data.marketTitle ? `<p style="color: #475569; margin: 5px 0;">Pulse: ${data.marketTitle}</p>` : ''}
          ${data.category ? `<p style="color: #475569; margin: 5px 0;">Category: ${data.category}</p>` : ''}
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 0 0 8px 0; color: #1e293b;"><strong>Amounts</strong></p>
            <p style="margin: 0; color: #475569;">Total: $${data.amountMXN.toLocaleString()} MXN</p>
            <p style="margin: 0; color: #10b981;">Fund (${Math.round(data.fundPercent * 100)}% of net est.): $${data.fundAmount.toLocaleString()} MXN</p>
            <p style="margin: 0; color: #64748b;">Platform (${Math.round((1 - data.fundPercent) * 100)}% of net est.): $${data.platformAmount.toLocaleString()} MXN</p>
          </div>
          <div style="text-align: center;">
            <a href="${APP_URL}/admin" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Admin Dashboard</a>
          </div>
        </div>
      </div>
    `
  }),

  marketResolution: (userName: string, marketTitle: string, winningOutcome: string, wasCorrect: boolean, bonusXp?: number) => ({
    subject: wasCorrect
      ? `[Crowd Conscious] Pulse closed — your vote matched: "${marketTitle}"`
      : `[Crowd Conscious] Pulse closed: "${marketTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${wasCorrect ? '#10b981' : '#64748b'}, ${wasCorrect ? '#14b8a6' : '#94a3b8'}); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${wasCorrect ? 'Your vote matched the community' : 'Pulse closed'}</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">Hi ${userName},</p>
          <p style="color: #475569; line-height: 1.6;">
            The Pulse <strong>"${marketTitle}"</strong> has closed. Community outcome: <strong>${winningOutcome}</strong>.
          </p>
          ${wasCorrect ? `<p style="color: #10b981; font-weight: bold;">${bonusXp ? `+${bonusXp} bonus XP earned!` : 'Thanks for participating — your vote was recorded.'}</p>` : '<p style="color: #64748b;">Your vote was recorded. Thanks for sharing your perspective.</p>'}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/pulse" style="background: #14b8a6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Browse Pulse</a>
          </div>
        </div>
      </div>
    `
  }),

  sponsorshipApproved: (brandName: string, needTitle: string, amount: number, communityName: string, paymentUrl: string) => ({
    subject: `[Crowd Conscious] Your sponsorship application has been approved! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Sponsorship Approved! 🎉</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">
            Great news! The <strong>${communityName}</strong> community has approved your sponsorship application.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="margin-top: 0; color: #1e293b;">Sponsorship Details:</h3>
            <p style="margin: 8px 0; color: #475569;"><strong>Need:</strong> ${needTitle}</p>
            <p style="margin: 8px 0; color: #475569;"><strong>Community:</strong> ${communityName}</p>
            <p style="margin: 8px 0; color: #475569;"><strong>Amount:</strong> $${amount.toLocaleString()}</p>
            <p style="margin: 8px 0; color: #475569;"><strong>Platform Fee (15%):</strong> $${(amount * 0.15).toFixed(2)}</p>
            <p style="margin: 8px 0; color: #10b981; font-weight: bold;"><strong>Community Receives:</strong> $${(amount * 0.85).toFixed(2)}</p>
          </div>
          <p style="color: #475569; line-height: 1.6;">
            To complete your sponsorship, please process the payment using the secure link below.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentUrl}" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Payment</a>
          </div>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            Payment is secured by Stripe. You will receive a receipt upon completion.
          </p>
        </div>
      </div>
    `
  }),

  monthlyImpactReport: (userName: string, stats: any) => ({
    subject: `[Crowd Conscious] Your Monthly Impact Report - ${stats.month || 'This Month'} 📊`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Your Monthly Impact 📊</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0;">${stats.month || 'This Month'}</p>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">Hi ${userName}! 👋</p>
          <p style="color: #475569; line-height: 1.6;">
            Here's your monthly impact summary. Together, we're creating real change in our communities!
          </p>
          
          <!-- Gamification Stats -->
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <div style="color: white; font-size: 18px; margin-bottom: 10px;">🎮 Your Level & XP</div>
            <div style="display: flex; justify-content: center; gap: 30px;">
              <div>
                <div style="font-size: 32px; font-weight: bold; color: white;">${stats.level || 1}</div>
                <div style="color: #e0e7ff; font-size: 14px;">Level</div>
              </div>
              <div>
                <div style="font-size: 32px; font-weight: bold; color: white;">${stats.totalXP || 0}</div>
                <div style="color: #e0e7ff; font-size: 14px;">Total XP</div>
              </div>
              <div>
                <div style="font-size: 32px; font-weight: bold; color: white;">${stats.currentStreak || 0}</div>
                <div style="color: #e0e7ff; font-size: 14px;">Day Streak 🔥</div>
              </div>
            </div>
          </div>

          <!-- Activity Stats -->
          <h3 style="color: #1e293b; margin-top: 25px;">Your Activity This Month:</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${stats.communitiesJoined || 0}</div>
              <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Communities Joined</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: bold; color: #10b981;">${stats.contentCreated || 0}</div>
              <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Content Created</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${stats.votesCount || 0}</div>
              <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Votes Cast</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: bold; color: #ec4899;">${stats.eventsAttended || 0}</div>
              <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Events Attended</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: bold; color: #14b8a6;">${stats.commentsPosted || 0}</div>
              <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Comments Posted</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; border: 2px solid #e2e8f0;">
              <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">$${stats.impactContributed || 0}</div>
              <div style="color: #6b7280; font-size: 14px; margin-top: 5px;">Impact Value</div>
            </div>
          </div>

          <!-- Achievements -->
          ${stats.newAchievements && stats.newAchievements.length > 0 ? `
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #92400e;">🏆 New Achievements Unlocked!</h3>
            <ul style="margin: 10px 0; padding-left: 20px; color: #78350f;">
              ${stats.newAchievements.map((achievement: string) => `<li style="margin: 5px 0;">${achievement}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          <!-- Impact Metrics -->
          ${stats.impactMetrics ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border: 2px solid #14b8a6;">
            <h3 style="margin-top: 0; color: #1e293b;">🌱 Environmental Impact</h3>
            <div style="color: #475569; line-height: 1.8;">
              <p style="margin: 8px 0;">♻️ <strong>Zero Waste:</strong> ${stats.impactMetrics.zeroWaste || 0} units</p>
              <p style="margin: 8px 0;">🌬️ <strong>Clean Air:</strong> ${stats.impactMetrics.cleanAir || 0} units</p>
              <p style="margin: 8px 0;">💧 <strong>Clean Water:</strong> ${stats.impactMetrics.cleanWater || 0} units</p>
              <p style="margin: 8px 0;">🏙️ <strong>Safe Cities:</strong> ${stats.impactMetrics.safeCities || 0} units</p>
            </div>
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/dashboard" style="background: linear-gradient(135deg, #8b5cf6, #14b8a6); color: white; padding: 15px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);">View Full Dashboard</a>
          </div>

          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <p style="margin: 0; color: #475569; font-size: 14px;">
              <strong>Keep up the amazing work!</strong> Every action you take creates real impact in your community. 💚
            </p>
          </div>

          <p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 20px;">
            Questions? Contact us at <a href="mailto:comunidad@crowdconscious.app" style="color: #14b8a6;">comunidad@crowdconscious.app</a>
          </p>
        </div>
      </div>
    `
  }),

  passwordReset: (userName: string, resetUrl: string) => ({
    subject: 'Reset Your Password - Crowd Conscious',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ef4444, #f97316); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset 🔐</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">Hi ${userName}!</p>
          <p style="color: #475569; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            This link will expire in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `
  }),

  assessmentQuote: (params: {
    companyName: string
    contactName: string
    contactEmail: string
    roi: {
      totalSavings: number
      breakdown: {
        energy: number
        water: number
        waste: number
        productivity: number
      }
    }
    modules: string[]
    pricing: {
      tier: string
      basePrice: number
      employeeLimit: number
    }
    proposalUrl: string
  }) => {
    const { companyName, contactName, roi, modules, pricing, proposalUrl } = params
    
    const moduleNames: Record<string, string> = {
      clean_air: '🌬️ Aire Limpio',
      clean_water: '💧 Agua Limpia',
      safe_cities: '🏙️ Ciudades Seguras',
      zero_waste: '♻️ Cero Residuos',
      fair_trade: '🤝 Comercio Justo',
      integration: '🎉 Integración & Impacto',
    }

    const formatMoney = (amount: number) => {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
      }).format(amount)
    }

    return {
      subject: `[Crowd Conscious] ${companyName} - Tu Propuesta Personalizada de Concientizaciones 🌱`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <div style="background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #ffffff; margin-bottom: 10px;">Crowd Conscious</div>
            <div style="color: rgba(255, 255, 255, 0.9); font-size: 18px;">Concientizaciones</div>
          </div>

          <div style="padding: 40px 30px; background: #ffffff;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 20px;">¡Hola ${contactName}! 👋</h1>

            <p style="font-size: 16px; line-height: 1.8; color: #475569;">
              Gracias por completar la evaluación para <strong>${companyName}</strong>.
            </p>

            <p style="font-size: 16px; line-height: 1.8; color: #475569;">
              Basado en tus respuestas, hemos creado un programa personalizado que puede generar un impacto significativo en tu empresa:
            </p>

            <div style="background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%); border-radius: 16px; padding: 30px; margin: 30px 0; text-align: center;">
              <div style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin-bottom: 10px;">Ahorro Anual Proyectado</div>
              <div style="color: #ffffff; font-size: 48px; font-weight: bold; margin: 10px 0;">${formatMoney(roi.totalSavings)}</div>
              <div style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin-top: 10px;">+ Beneficios intangibles en reputación y ESG</div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 30px 0;">
              ${roi.breakdown.energy > 0 ? `
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">⚡ Energía</div>
                <div style="color: #0f766e; font-size: 24px; font-weight: bold;">${formatMoney(roi.breakdown.energy)}</div>
              </div>
              ` : ''}
              ${roi.breakdown.water > 0 ? `
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">💧 Agua</div>
                <div style="color: #0f766e; font-size: 24px; font-weight: bold;">${formatMoney(roi.breakdown.water)}</div>
              </div>
              ` : ''}
              ${roi.breakdown.waste > 0 ? `
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">🗑️ Residuos</div>
                <div style="color: #0f766e; font-size: 24px; font-weight: bold;">${formatMoney(roi.breakdown.waste)}</div>
              </div>
              ` : ''}
              ${roi.breakdown.productivity > 0 ? `
              <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; text-align: center;">
                <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">😊 Productividad</div>
                <div style="color: #0f766e; font-size: 24px; font-weight: bold;">${formatMoney(roi.breakdown.productivity)}</div>
              </div>
              ` : ''}
            </div>

            <h2 style="color: #0f172a; font-size: 22px; margin-top: 40px;">📚 Módulos Recomendados</h2>

            <div style="margin: 20px 0;">
              ${modules.map(moduleId => `
                <div style="background-color: #f0fdfa; border: 2px solid #99f6e4; border-radius: 12px; padding: 15px; margin-bottom: 10px;">
                  <strong>${moduleNames[moduleId]}</strong>
                </div>
              `).join('')}
            </div>

            <div style="background-color: #faf5ff; border: 2px solid #e9d5ff; border-radius: 16px; padding: 25px; margin: 30px 0;">
              <div style="color: #7c3aed; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 10px;">Programa ${pricing.tier}</div>
              <div style="color: #581c87; font-size: 36px; font-weight: bold; margin: 10px 0;">${formatMoney(pricing.basePrice)}</div>
              <div style="color: #64748b; font-size: 14px; line-height: 1.8;">
                ✓ Hasta ${pricing.employeeLimit} empleados<br />
                ✓ ${modules.length} módulos incluidos<br />
                ✓ Dashboard de impacto en tiempo real<br />
                ✓ Certificación para empleados<br />
                ✓ Acceso a comunidad principal
              </div>
            </div>

            <div style="text-align: center; margin: 40px 0;">
              <a href="${proposalUrl}" style="display: inline-block; background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: bold; font-size: 18px;">
                Ver Mi Propuesta Completa
              </a>
            </div>

            <div style="background-color: #ecfdf5; border: 2px solid #6ee7b7; border-radius: 12px; padding: 20px; margin-top: 30px;">
              <div style="font-size: 18px; font-weight: bold; color: #047857; margin-bottom: 10px;">🎁 ¡Prueba Gratis!</div>
              <p style="color: #065f46; font-size: 14px; margin: 0;">
                Accede al <strong>Módulo 1 completo sin costo</strong>. Sin tarjeta de crédito, sin compromiso.
              </p>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 30px; text-align: center; color: #64748b; font-size: 14px;">
            <p><strong>¿Tienes preguntas?</strong></p>
            <p>
              Responde a este email o contáctanos:<br />
              <a href="mailto:comunidad@crowdconscious.app" style="color: #0f766e;">comunidad@crowdconscious.app</a>
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
              © 2025 Crowd Conscious. Transformando empresas en fuerzas comunitarias.
            </p>
          </div>
        </div>
      `
    }
  }
}

/**
 * Conscious Creator certification email (Creators Phase 2 — the
 * "verification moment"). Sent by the admin Certificar action; congratulates
 * the creator, links their public page, and hands them ready-to-paste share
 * artifacts: both card URLs (landscape + story) plus the IG caption and
 * WhatsApp message from the share-cards copy matrix (§6).
 *
 * Locale: ES default. Profiles carry no language column today, so callers
 * pass 'en' only when a locale signal exists elsewhere.
 */
export function creatorVerifiedEmail(params: {
  name: string
  handle: string
  locale?: 'es' | 'en'
}): { subject: string; html: string } {
  const { name, handle } = params
  const es = (params.locale ?? 'es') !== 'en'
  const pageUrl = `${APP_URL}/creators/${encodeURIComponent(handle)}`
  const cardLandscapeUrl = `${APP_URL}/api/og/creator/${encodeURIComponent(handle)}`
  const cardStoryUrl = `${cardLandscapeUrl}?format=story`
  // Share-cards copy matrix: "Creator verified moment" row.
  const whatsappMessage = es
    ? `Ya soy Creador Consciente verificado. La comunidad votó: ${pageUrl}`
    : `I'm now a verified Conscious Creator. The community voted: ${pageUrl}`
  // IG can't carry tappable links from a caption — the URL is the recall
  // mechanism and "link en bio" is the guidance (share-cards doc §4).
  const igCaption = es
    ? `Ya soy Creador Consciente verificado en Crowd Conscious. La comunidad votó. Encuéntrame en crowdconscious.app/creators/${handle} (link en bio)`
    : `I'm now a verified Conscious Creator on Crowd Conscious. The community voted. Find me at crowdconscious.app/creators/${handle} (link in bio)`

  const t = es
    ? {
        subject: 'Ya eres Creador Consciente Certificado',
        title: 'Ya eres Creador Consciente Certificado',
        intro: `Hola ${name} — la comunidad votó y el equipo confirmó tu certificación. Tu sello dorado ya está activo en tu página pública.`,
        cta: 'Ver mi página de creador →',
        cardsTitle: 'Tus tarjetas listas para compartir',
        cardLandscape: 'Tarjeta para WhatsApp / enlaces (1200×630)',
        cardStory: 'Tarjeta para historias de Instagram / TikTok (1080×1920)',
        copyTitle: 'Copia y pega',
        whatsappLabel: 'Mensaje para WhatsApp',
        igLabel: 'Caption para Instagram',
        outro: 'Tu certificación se revisa cada 90 días. Sigue compartiendo tu tarjeta: cada voto la mantiene viva.',
        footer: 'Crowd Conscious · Sentimiento público con impacto · CDMX',
      }
    : {
        subject: 'You are now a Certified Conscious Creator',
        title: 'You are now a Certified Conscious Creator',
        intro: `Hi ${name} — the community voted and the team confirmed your certification. Your gold seal is now live on your public page.`,
        cta: 'View my creator page →',
        cardsTitle: 'Your share-ready cards',
        cardLandscape: 'Card for WhatsApp / links (1200×630)',
        cardStory: 'Card for Instagram / TikTok stories (1080×1920)',
        copyTitle: 'Copy and paste',
        whatsappLabel: 'WhatsApp message',
        igLabel: 'Instagram caption',
        outro: 'Your certification is reviewed every 90 days. Keep sharing your card — every vote keeps it alive.',
        footer: 'Crowd Conscious · Public sentiment with impact · CDMX',
      }

  return {
    subject: t.subject,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1419; color: #e5e7eb;">
        <div style="padding: 24px; text-align: center; border-bottom: 1px solid #2d3748;">
          <img src="${APP_URL}/images/logo.png" alt="Crowd Conscious" width="120" style="height: auto;" />
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #fbbf24; font-size: 12px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin: 0 0 8px;">Conscious Creator</p>
          <h1 style="color: #10b981; font-size: 24px; margin: 0 0 16px;">${t.title}</h1>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">${t.intro}</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${pageUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">${t.cta}</a>
          </div>
          <div style="margin: 28px 0 0; padding: 18px; background: #1a2029; border: 1px solid #2d3748; border-radius: 10px;">
            <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0 0 12px;">${t.cardsTitle}</p>
            <p style="margin: 0 0 8px;">
              <a href="${cardLandscapeUrl}" style="color: #34d399; font-size: 13px;">${t.cardLandscape}</a>
            </p>
            <p style="margin: 0;">
              <a href="${cardStoryUrl}" style="color: #34d399; font-size: 13px;">${t.cardStory}</a>
            </p>
          </div>
          <div style="margin: 16px 0 0; padding: 18px; background: #1a2029; border: 1px solid #2d3748; border-radius: 10px;">
            <p style="color: #ffffff; font-size: 14px; font-weight: bold; margin: 0 0 12px;">${t.copyTitle}</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px;">${t.whatsappLabel}</p>
            <p style="color: #d1d5db; font-size: 13px; line-height: 1.5; background: #0f1419; border: 1px solid #2d3748; border-radius: 8px; padding: 10px 12px; margin: 0 0 14px;">${whatsappMessage}</p>
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px;">${t.igLabel}</p>
            <p style="color: #d1d5db; font-size: 13px; line-height: 1.5; background: #0f1419; border: 1px solid #2d3748; border-radius: 8px; padding: 10px 12px; margin: 0;">${igCaption}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 20px 0 0;">${t.outro}</p>
        </div>
        <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #2d3748;">
          <p style="color: #6b7280; font-size: 11px; margin: 0;">${t.footer}</p>
        </div>
      </div>
    `,
  }
}

/** Verification-moment email. Returns success=false instead of throwing — callers must stay fail-soft. */
export async function sendCreatorVerifiedEmail(
  email: string,
  params: { name: string; handle: string; locale?: 'es' | 'en' }
): Promise<{ success: boolean; error?: string }> {
  return sendEmail(email, creatorVerifiedEmail(params))
}

// Resend Pro allows 5 requests/second on /emails. Newsletter fan-out must stay
// under that or most recipients get 429 "Too many requests".
const RESEND_MAX_REQUESTS_PER_SECOND = 4

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isResendRateLimitError(message?: string): boolean {
  if (!message) return false
  const m = message.toLowerCase()
  return (
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('429')
  )
}

async function sendEmailWithRetry(
  to: string,
  template: { subject: string; html: string },
  from: string = FROM_EMAIL
): Promise<{ success: boolean; error?: string }> {
  const maxAttempts = 4
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await sendEmail(to, template, from)
    if (result.success) return result
    if (!isResendRateLimitError(result.error) || attempt === maxAttempts - 1) {
      return result
    }
    await sleep(1000 * (attempt + 1))
  }
  return { success: false, error: 'rate limit retries exhausted' }
}

// Send email function with error handling
export async function sendEmail(
  to: string,
  template: { subject: string; html: string },
  from: string = FROM_EMAIL
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!resend) {
      console.error('Resend not configured - email not sent')
      return { success: false, error: 'Email service not configured' }
    }

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject: template.subject,
      html: template.html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data?.id)
    return { success: true }
  } catch (error: any) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

/** Newsletter sends one HTML per recipient (unsubscribe URL differs). Rate-limited for Resend (5 req/s). */
export async function sendEmailsWithConcurrency(
  messages: Array<{ to: string; subject: string; html: string }>,
  concurrency: number = RESEND_MAX_REQUESTS_PER_SECOND
): Promise<{ sent: number; failed: number; firstError?: string }> {
  let sent = 0
  let failed = 0
  let firstError: string | undefined
  const batchSize = Math.max(1, Math.min(concurrency, RESEND_MAX_REQUESTS_PER_SECOND))

  for (let i = 0; i < messages.length; i += batchSize) {
    const slice = messages.slice(i, i + batchSize)
    const results = await Promise.all(
      slice.map((m) => sendEmailWithRetry(m.to, { subject: m.subject, html: m.html }))
    )
    for (const r of results) {
      if (r.success) sent++
      else {
        failed++
        if (!firstError && r.error) firstError = r.error
      }
    }
    // Pace batches so we never exceed Resend's 5 req/s ceiling.
    if (i + batchSize < messages.length) {
      await sleep(1000)
    }
  }
  return { sent, failed, firstError }
}

// Send welcome email
export async function sendWelcomeEmail(
  email: string, 
  name: string
): Promise<boolean> {
  const template = emailTemplates.welcomeUser(name)
  const result = await sendEmail(email, template)
  return result.success
}

// Send sponsor confirmation (market sponsorship)
export async function sendSponsorConfirmationEmail(
  email: string,
  sponsorName: string,
  tier: string,
  amountMXN: number,
  marketTitle?: string,
  category?: string,
  marketId?: string,
  sponsorshipId?: string,
  reportToken?: string,
  dashboardAccessToken?: string
): Promise<boolean> {
  const template = emailTemplates.sponsorConfirmation(
    sponsorName,
    tier,
    amountMXN,
    marketTitle,
    category,
    marketId,
    sponsorshipId,
    reportToken,
    dashboardAccessToken
  )
  const result = await sendEmail(email, template)
  return result.success
}

// Send admin notification when sponsorship is activated
export async function sendSponsorshipAdminNotification(data: {
  sponsorName: string
  sponsorEmail: string
  sponsorUrl?: string
  tier: string
  amountMXN: number
  fundAmount: number
  platformAmount: number
  fundPercent: number
  marketTitle?: string
  marketId?: string
  category?: string
}): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || 'comunidad@crowdconscious.app'
  const template = emailTemplates.sponsorshipAdminNotification(data)
  const result = await sendEmail(adminEmail, template)
  return result.success
}

// Send market resolution notification
export async function sendMarketResolutionEmail(
  email: string,
  userName: string,
  marketTitle: string,
  winningOutcome: string,
  wasCorrect: boolean,
  bonusXp?: number
): Promise<boolean> {
  if (!isPredictionResolutionEmailEnabled()) {
    console.info('[resend] market resolution email skipped (PREDICTION_RESOLUTION_EMAIL_ENABLED)')
    return false
  }
  const template = emailTemplates.marketResolution(userName, marketTitle, winningOutcome, wasCorrect, bonusXp)
  const result = await sendEmail(email, template)
  return result.success
}

// Send event registration confirmation
export async function sendEventRegistrationEmail(
  email: string,
  userName: string,
  eventTitle: string,
  eventDate: string,
  eventLocation: string,
  communityName: string,
  eventId: string
): Promise<boolean> {
  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/communities/${eventId}`
  const template = emailTemplates.eventRegistration(
    userName,
    eventTitle,
    eventDate,
    eventLocation,
    communityName,
    eventUrl
  )
  const result = await sendEmail(email, template)
  return result.success
}

// Send sponsorship approval notification
export async function sendSponsorshipApprovalEmail(
  brandEmail: string,
  brandName: string,
  needTitle: string,
  amount: number,
  communityName: string,
  sponsorshipId: string
): Promise<boolean> {
  const paymentUrl = `${APP_URL}/brand/payment/${sponsorshipId}`
  const template = emailTemplates.sponsorshipApproved(
    brandName, 
    needTitle, 
    amount, 
    communityName, 
    paymentUrl
  )
  
  const result = await sendEmail(brandEmail, template)
  return result.success
}

// Send monthly impact report
export async function sendMonthlyReport(
  email: string,
  userName: string,
  stats: any
): Promise<boolean> {
  const template = emailTemplates.monthlyImpactReport(userName, stats)
  const result = await sendEmail(email, template)
  return result.success
}

// Send assessment quote email
export async function sendAssessmentQuoteEmail(
  email: string,
  companyName: string,
  contactName: string,
  roi: any,
  modules: string[],
  pricing: any,
  assessmentId: string
): Promise<boolean> {
  const proposalUrl = `${APP_URL}/proposal/${assessmentId}`
  
  const template = emailTemplates.assessmentQuote({
    companyName,
    contactName,
    contactEmail: email,
    roi,
    modules,
    pricing,
    proposalUrl,
  })
  
  const result = await sendEmail(email, template)
  return result.success
}

/**
 * Mundial Pack — buyer confirmation. Reassures the brand that we'll reach
 * out personally within 24h to scope their 5 Pulses. Kept short on purpose:
 * the Stripe receipt already covers the financial side.
 */
export async function sendMundialPackBuyerConfirmation(params: {
  email: string
  companyName: string
  contactName?: string | null
  isFounding: boolean
  amountMXN: number
}): Promise<boolean> {
  const { email, companyName, contactName, isFounding, amountMXN } = params
  const greeting = contactName ? `Hola ${contactName},` : `Hola ${companyName},`
  const tierLabel = isFounding
    ? 'Mundial Pulse Pack — Founding'
    : 'Mundial Pulse Pack'
  const template = {
    subject: `[Crowd Conscious] 🏆 ${tierLabel} confirmado — te contactamos en 24h`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f1419; color: #e5e7eb;">
        <div style="background: linear-gradient(135deg, #d97706, #10b981); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🏆 ${tierLabel}</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 6px 0 0;">${companyName}</p>
        </div>
        <div style="padding: 28px 24px;">
          <p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6;">${greeting}</p>
          <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
            Recibimos tu pago de <strong>$${amountMXN.toLocaleString()} MXN</strong>. Eres parte de la edición Mundial 2026 de Crowd Conscious.
          </p>
          <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
            <strong>Dentro de 24h te contactamos</strong> para definir tus 5 Pulses, calendarizarlos en torno al torneo y recibir tus assets de marca.
          </p>
          <p style="margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #d1d5db;">
            Mientras tanto, te enviaremos por separado el enlace de acceso a tu dashboard de sponsor.
          </p>
          <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
            Cualquier duda, responde a este correo.
          </p>
        </div>
        <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #2d3748;">
          <p style="color: #6b7280; font-size: 11px; margin: 0;">Crowd Conscious · CDMX</p>
        </div>
      </div>
    `,
  }
  const result = await sendEmail(email, template)
  return result.success
}

/**
 * Mundial Pack — admin alert. Loud subject + a fully drafted Spanish reply
 * so the founder can answer the brand in <2 minutes. The reply is delivered
 * as a `mailto:` link so a single tap pre-fills the email client.
 */
export async function sendMundialPackFounderAlert(params: {
  companyName: string
  contactName: string | null
  contactEmail: string
  brandPitch: string | null
  website: string | null
  amountMXN: number
  isFounding: boolean
  fundAmount: number
  sponsorshipId: string | null
  spotsRemainingAfter: number | null
  dashboardUrl: string | null
}): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL || 'comunidad@crowdconscious.app'
  const {
    companyName,
    contactName,
    contactEmail,
    brandPitch,
    website,
    amountMXN,
    isFounding,
    fundAmount,
    sponsorshipId,
    spotsRemainingAfter,
    dashboardUrl,
  } = params

  const tierLabel = isFounding
    ? 'Mundial Pulse Pack — Founding ($25,000 MXN)'
    : 'Mundial Pulse Pack ($50,000 MXN)'

  const replyName = contactName || companyName
  const draftReply = `Hola ${replyName},

¡Bienvenido al ${tierLabel}! Soy [TU NOMBRE], fundador de Crowd Conscious.

Para arrancar tus 5 Pulses, necesito 15 minutos contigo esta semana. Te paso un calendario: [LINK CAL]. La idea es que las primeras 2 preguntas salgan antes del primer partido del Mundial.

Cualquier cosa, responde aquí.

Saludos,
[TU NOMBRE]`

  const mailto = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(
    `Re: ${tierLabel} — ${companyName}`
  )}&body=${encodeURIComponent(draftReply)}`

  const subject = `🚨 Nuevo Mundial Pack: ${companyName}`
  const template = {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #0f172a;">
        <div style="background: linear-gradient(135deg, #b91c1c, #d97706); padding: 22px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🚨 Nuevo Mundial Pack</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Responder en &lt; 2 min con el draft de abajo</p>
        </div>
        <div style="padding: 22px; background: #f8fafc; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; font-size: 13px; line-height: 1.6;">
            <tr><td style="padding: 4px 0; color: #475569; width: 38%;"><strong>Empresa:</strong></td><td style="padding: 4px 0;">${companyName}</td></tr>
            <tr><td style="padding: 4px 0; color: #475569;"><strong>Contacto:</strong></td><td style="padding: 4px 0;">${contactName || '—'}</td></tr>
            <tr><td style="padding: 4px 0; color: #475569;"><strong>Email:</strong></td><td style="padding: 4px 0;"><a href="mailto:${contactEmail}" style="color: #0f766e;">${contactEmail}</a></td></tr>
            ${website ? `<tr><td style="padding: 4px 0; color: #475569;"><strong>Sitio:</strong></td><td style="padding: 4px 0;"><a href="${website}" style="color: #0f766e;">${website}</a></td></tr>` : ''}
            <tr><td style="padding: 4px 0; color: #475569;"><strong>Tier:</strong></td><td style="padding: 4px 0;">${tierLabel}</td></tr>
            <tr><td style="padding: 4px 0; color: #475569;"><strong>Pago:</strong></td><td style="padding: 4px 0;">$${amountMXN.toLocaleString()} MXN</td></tr>
            <tr><td style="padding: 4px 0; color: #475569;"><strong>→ Fondo Consciente:</strong></td><td style="padding: 4px 0;">$${fundAmount.toLocaleString()} MXN (estimado neto)</td></tr>
            ${
              isFounding && spotsRemainingAfter != null
                ? `<tr><td style="padding: 4px 0; color: #475569;"><strong>Espacios Founding restantes:</strong></td><td style="padding: 4px 0;">${spotsRemainingAfter} / 5</td></tr>`
                : ''
            }
            ${sponsorshipId ? `<tr><td style="padding: 4px 0; color: #475569;"><strong>Sponsorship ID:</strong></td><td style="padding: 4px 0; font-family: monospace; font-size: 12px;">${sponsorshipId}</td></tr>` : ''}
          </table>

          ${
            brandPitch
              ? `<div style="margin-top: 18px; padding: 12px 14px; background: #ecfdf5; border-left: 3px solid #10b981; border-radius: 4px;">
                  <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #065f46;">Pitch de la marca:</p>
                  <p style="margin: 0; font-size: 13px; line-height: 1.55; color: #064e3b;">${brandPitch}</p>
                </div>`
              : ''
          }

          <div style="margin-top: 20px; padding: 14px; background: #fff7ed; border-left: 3px solid #f59e0b; border-radius: 4px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #92400e;">Draft listo para enviar:</p>
            <pre style="margin: 0; font-family: 'SFMono-Regular', Consolas, monospace; font-size: 12px; line-height: 1.55; color: #422006; white-space: pre-wrap;">${draftReply}</pre>
            <div style="margin-top: 12px; text-align: center;">
              <a href="${mailto}" style="display: inline-block; background: #f59e0b; color: #1f2937; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">Abrir en mi cliente de email →</a>
            </div>
          </div>

          ${
            dashboardUrl
              ? `<p style="margin-top: 18px; font-size: 12px; color: #64748b; text-align: center;">Dashboard sponsor: <a href="${dashboardUrl}" style="color: #0f766e;">${dashboardUrl}</a></p>`
              : ''
          }
        </div>
      </div>
    `,
  }

  const result = await sendEmail(adminEmail, template)
  return result.success
}

// =============================================================================
// Citizen Signals — F13 transactional helpers
// =============================================================================
//
// All helpers:
//   - Return { ok, id?, error? } and NEVER throw.
//   - Short-circuit (ok=false, error='disabled') when RESEND_ENABLED === 'false'.
//   - Short-circuit (ok=false, error='no_api_key') when RESEND_API_KEY is missing.
//   - Render React Email components to HTML before delegating to Resend.
//
// They are designed to be called fire-and-forget by API routes:
//   void sendSignalFilerReceived({...}).catch(console.error)
//
// so a Resend outage never 500s the user-facing request.

export type SignalEmailResult = { ok: boolean; id?: string; error?: string }

function signalEmailEnabled(): boolean {
  return process.env.RESEND_ENABLED !== 'false'
}

async function sendSignalEmail(args: {
  to: string
  subject: string
  react: ReactElement
  replyTo?: string
  context: string
}): Promise<SignalEmailResult> {
  const { to, subject, react, replyTo, context } = args

  if (!signalEmailEnabled()) {
    return { ok: false, error: 'disabled' }
  }
  if (!resend) {
    console.warn(
      `[resend:${context}] RESEND_API_KEY not set — email skipped (to=${to})`
    )
    return { ok: false, error: 'no_api_key' }
  }
  if (!to || !to.includes('@')) {
    console.warn(`[resend:${context}] invalid recipient — skipped (to=${to})`)
    return { ok: false, error: 'invalid_recipient' }
  }

  try {
    const html = await renderEmail(react)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    })
    if (error) {
      console.error(`[resend:${context}] send error`, error)
      return { ok: false, error: error.message }
    }
    return { ok: true, id: data?.id }
  } catch (err) {
    console.error(`[resend:${context}] fatal`, err)
    const message = err instanceof Error ? err.message : 'unknown_error'
    return { ok: false, error: message }
  }
}

export interface SendSignalFilerReceivedArgs {
  to: string
  locale: CitizenSignalsLocale
  signalSlug: string
  signalTitle: string
  filerName?: string | null
}

export async function sendSignalFilerReceived(
  args: SendSignalFilerReceivedArgs
): Promise<SignalEmailResult> {
  const t = getCitizenSignalsCopy(args.locale)
  return sendSignalEmail({
    to: args.to,
    subject: t.emails.filerReceived.subject(args.signalTitle),
    context: 'signals/filer-received',
    react: FilerReceivedEmail({
      locale: args.locale,
      signalTitle: args.signalTitle,
      signalSlug: args.signalSlug,
      filerName: args.filerName ?? null,
    }),
  })
}

export type SendSignalFilerPublishedArgs = SendSignalFilerReceivedArgs

export async function sendSignalFilerPublished(
  args: SendSignalFilerPublishedArgs
): Promise<SignalEmailResult> {
  const t = getCitizenSignalsCopy(args.locale)
  return sendSignalEmail({
    to: args.to,
    subject: t.emails.filerPublished.subject(args.signalTitle),
    context: 'signals/filer-published',
    react: FilerPublishedEmail({
      locale: args.locale,
      signalTitle: args.signalTitle,
      signalSlug: args.signalSlug,
      filerName: args.filerName ?? null,
    }),
  })
}

export interface SendSignalFilerRejectedArgs
  extends SendSignalFilerReceivedArgs {
  /**
   * Free-form reason from the moderation event detail (admin's `reason`
   * field). When omitted, the body says only "your signal was not
   * published" without quoting a specific reason.
   */
  reason?: string | null
}

export async function sendSignalFilerRejected(
  args: SendSignalFilerRejectedArgs
): Promise<SignalEmailResult> {
  const t = getCitizenSignalsCopy(args.locale)
  return sendSignalEmail({
    to: args.to,
    subject: t.emails.filerRejected.subject(args.signalTitle),
    context: 'signals/filer-rejected',
    react: FilerRejectedEmail({
      locale: args.locale,
      signalTitle: args.signalTitle,
      signalSlug: args.signalSlug,
      filerName: args.filerName ?? null,
      reason: args.reason ?? null,
    }),
  })
}

export interface SendSignalFilerNeedsEditArgs
  extends SendSignalFilerReceivedArgs {
  /** The moderator note from `needs_edit_message` (REQUIRED — without a
   * note this email has no value, so the helper returns ok=false). */
  moderatorNote: string
}

export async function sendSignalFilerNeedsEdit(
  args: SendSignalFilerNeedsEditArgs
): Promise<SignalEmailResult> {
  if (!args.moderatorNote || !args.moderatorNote.trim()) {
    return { ok: false, error: 'missing_moderator_note' }
  }
  const t = getCitizenSignalsCopy(args.locale)
  return sendSignalEmail({
    to: args.to,
    subject: t.emails.filerNeedsEdit.subject(args.signalTitle),
    context: 'signals/filer-needs-edit',
    react: FilerNeedsEditEmail({
      locale: args.locale,
      signalTitle: args.signalTitle,
      signalSlug: args.signalSlug,
      filerName: args.filerName ?? null,
      moderatorNote: args.moderatorNote,
    }),
  })
}

export interface SendSignalTargetNotifiedStage1Args {
  to: string
  locale: CitizenSignalsLocale
  /** The citizen_target.display_name — used in the greeting + subject. */
  targetDisplayName: string
  signalSlug: string
  signalTitle: string
  /** Optional short summary of the signal body (preview only — long body
   * is omitted to keep the email scannable). */
  signalSummary?: string | null
  cosignCount: number
  magicLinkUrl: string
  expiryDays?: number
}

export async function sendSignalTargetNotifiedStage1(
  args: SendSignalTargetNotifiedStage1Args
): Promise<SignalEmailResult> {
  const t = getCitizenSignalsCopy(args.locale)
  return sendSignalEmail({
    to: args.to,
    subject: t.emails.targetNotifiedStage1.subject(args.targetDisplayName),
    context: 'signals/target-notified-stage1',
    react: TargetNotifiedStage1Email({
      locale: args.locale,
      targetDisplayName: args.targetDisplayName,
      signalTitle: args.signalTitle,
      signalSummary: args.signalSummary ?? null,
      cosignCount: args.cosignCount,
      magicLinkUrl: args.magicLinkUrl,
      expiryDays: args.expiryDays ?? 7,
    }),
  })
}

export interface SendSignalTargetRepliedArgs {
  to: string
  locale: CitizenSignalsLocale
  signalSlug: string
  signalTitle: string
  filerName?: string | null
  authorLabel: string
  officialStatus: TargetReplyStatus
  responseBody: string
}

export async function sendSignalTargetReplied(
  args: SendSignalTargetRepliedArgs
): Promise<SignalEmailResult> {
  const t = getCitizenSignalsCopy(args.locale)
  return sendSignalEmail({
    to: args.to,
    subject: t.emails.targetReplied.subject(args.signalTitle),
    context: 'signals/target-replied',
    react: TargetRepliedEmail({
      locale: args.locale,
      signalTitle: args.signalTitle,
      signalSlug: args.signalSlug,
      filerName: args.filerName ?? null,
      authorLabel: args.authorLabel,
      officialStatus: args.officialStatus,
      responseBody: args.responseBody,
    }),
  })
}

export interface SendSignalModeratorDailyDigestArgs {
  signals: PendingSignalSummary[]
  /** Defaults to ADMIN_EMAIL env var; falls back to comunidad@. */
  to?: string
  generatedAt?: Date
}

export async function sendSignalModeratorDailyDigest(
  args: SendSignalModeratorDailyDigestArgs
): Promise<SignalEmailResult> {
  const to =
    args.to || process.env.ADMIN_EMAIL || 'comunidad@crowdconscious.app'
  // Subject + preview are always Spanish per founder decision.
  const t = getCitizenSignalsCopy('es')
  return sendSignalEmail({
    to,
    subject: t.emails.moderatorDigest.subject(args.signals.length),
    context: 'signals/moderator-digest',
    react: ModeratorDailyDigestEmail({
      signals: args.signals,
      generatedAt: args.generatedAt,
    }),
  })
}
