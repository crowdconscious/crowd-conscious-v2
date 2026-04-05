import { Resend } from 'resend'
import { calculateFundAllocationRounded, normalizeSponsorTierId } from '@/lib/sponsor-tiers'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - email functionality will be disabled')
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = 'Crowd Conscious <comunidad@crowdconscious.app>' // Using verified domain
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
            Hola ${userName} — ahora formas parte de una comunidad que usa inteligencia colectiva para predecir lo que importa en CDMX y México, y para impulsar causas reales.
          </p>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
            Cada predicción suma al Fondo Consciente para proyectos comunitarios. Mientras más participas, más impacto generas.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${APP_URL}/predictions" style="display: inline-block; background: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Explorar mercados →
            </a>
          </div>
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            ⚽ ~${daysWc} días para el Mundial 2026
          </p>
        </div>
        <div style="padding: 16px 24px; text-align: center; border-top: 1px solid #2d3748;">
          <p style="color: #6b7280; font-size: 11px; margin: 0;">Crowd Conscious · Predicciones con impacto · CDMX</p>
        </div>
      </div>
    `,
    }
  },

  eventRegistration: (userName: string, eventTitle: string, eventDate: string, eventLocation: string, communityName: string, eventUrl: string) => ({
    subject: `You're registered for ${eventTitle}! 📅`,
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
    const tierId = normalizeSponsorTierId(tier)
    const alloc = calculateFundAllocationRounded(amountMXN, tierId)
    const fundAmount = alloc.fundAmountRounded
    const fundPct = Math.round(alloc.fundPercent * 100)
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
            Thank you for sponsoring ${sponsoredLabel}. Your brand will appear on the market card, detail page, and share images.
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
    subject: `🎉 New sponsorship: ${data.sponsorName} — $${data.amountMXN.toLocaleString()} MXN`,
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
          ${data.marketTitle ? `<p style="color: #475569; margin: 5px 0;">Market: ${data.marketTitle}</p>` : ''}
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
    subject: wasCorrect ? `You were right! 🎯 "${marketTitle}" resolved` : `Market resolved: "${marketTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, ${wasCorrect ? '#10b981' : '#64748b'}, ${wasCorrect ? '#14b8a6' : '#94a3b8'}); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">${wasCorrect ? 'You were right! 🎯' : 'Market resolved'}</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">Hi ${userName},</p>
          <p style="color: #475569; line-height: 1.6;">
            The market <strong>"${marketTitle}"</strong> has been resolved as <strong>${winningOutcome}</strong>.
          </p>
          ${wasCorrect ? `<p style="color: #10b981; font-weight: bold;">${bonusXp ? `+${bonusXp} bonus XP earned!` : 'Your prediction was correct!'}</p>` : '<p style="color: #64748b;">Better luck next time — keep predicting!</p>'}
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/predictions/markets" style="background: #14b8a6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Browse Markets</a>
          </div>
        </div>
      </div>
    `
  }),

  sponsorshipApproved: (brandName: string, needTitle: string, amount: number, communityName: string, paymentUrl: string) => ({
    subject: `Your sponsorship application has been approved! 🎉`,
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
    subject: `Your Monthly Impact Report - ${stats.month || 'This Month'} 📊`,
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
      subject: `${companyName} - Tu Propuesta Personalizada de Concientizaciones 🌱`,
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

/** Newsletter sends one HTML per recipient (unsubscribe URL differs). Bounded concurrency to avoid Vercel timeouts. */
export async function sendEmailsWithConcurrency(
  messages: Array<{ to: string; subject: string; html: string }>,
  concurrency: number = 8
): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0
  for (let i = 0; i < messages.length; i += concurrency) {
    const slice = messages.slice(i, i + concurrency)
    const results = await Promise.all(
      slice.map((m) => sendEmail(m.to, { subject: m.subject, html: m.html }))
    )
    for (const r of results) {
      if (r.success) sent++
      else failed++
    }
  }
  return { sent, failed }
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

// Send employee invitation email
export async function sendEmployeeInvitationEmail(
  email: string,
  companyName: string,
  invitedByName: string,
  invitationToken: string
): Promise<boolean> {
  const invitationUrl = `${APP_URL}/employee-portal-public/accept-invitation?token=${invitationToken}`
  
  const template = {
    subject: `${companyName} te invita a Concientizaciones 🌱`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%); padding: 40px 20px; text-align: center;">
          <div style="font-size: 32px; font-weight: bold; color: #ffffff; margin-bottom: 10px;">Crowd Conscious</div>
          <div style="color: rgba(255, 255, 255, 0.9); font-size: 18px;">Concientizaciones</div>
        </div>

        <div style="padding: 40px 30px; background: #ffffff;">
          <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 20px;">¡Te han invitado! 🎉</h1>

          <p style="font-size: 16px; line-height: 1.8; color: #475569;">
            <strong>${invitedByName}</strong> de <strong>${companyName}</strong> te ha invitado a unirte a su programa de capacitación Concientizaciones.
          </p>

          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 100%); border-left: 4px solid #0f766e; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 18px;">¿Qué es Concientizaciones?</h3>
            <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 0;">
              Un programa de capacitación story-driven que te convierte en agente de cambio. Aprende sobre:
            </p>
            <ul style="color: #475569; font-size: 14px; line-height: 1.8;">
              <li>🌬️ <strong>Aire Limpio:</strong> Calidad del aire y emisiones</li>
              <li>💧 <strong>Agua Limpia:</strong> Conservación y filtración</li>
              <li>🏙️ <strong>Ciudades Seguras:</strong> Espacios públicos</li>
              <li>♻️ <strong>Cero Residuos:</strong> Economía circular</li>
              <li>🤝 <strong>Comercio Justo:</strong> Compras locales</li>
            </ul>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
            <h3 style="margin-top: 0; color: #92400e; font-size: 18px;">🎁 ¿Qué obtendrás?</h3>
            <ul style="color: #78350f; font-size: 14px; line-height: 1.8; margin-bottom: 0;">
              <li>✅ Acceso a módulos interactivos de capacitación</li>
              <li>✅ Certificación al completar el programa</li>
              <li>✅ Acceso a la comunidad principal al graduarte</li>
              <li>✅ Oportunidad de crear impacto real en tu comunidad</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${invitationUrl}" style="display: inline-block; background: linear-gradient(135deg, #0f766e 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 14px rgba(15, 118, 110, 0.4);">
              Aceptar Invitación →
            </a>
          </div>

          <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; margin-top: 30px;">
            <p style="color: #64748b; font-size: 13px; margin: 0; text-align: center;">
              Esta invitación expira en 7 días. Si no solicitaste este acceso, puedes ignorar este email.
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
  
  const result = await sendEmail(email, template)
  return result.success
}
