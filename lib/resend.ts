import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - email functionality will be disabled')
}

export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

const FROM_EMAIL = 'Crowd Conscious <noreply@your-domain.com>' // Update with your domain
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Email templates
export const emailTemplates = {
  welcomeUser: (userName: string) => ({
    subject: 'Welcome to Crowd Conscious! 🌱',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #14b8a6, #3b82f6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Crowd Conscious! 🌱</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <h2 style="color: #1e293b; margin-top: 0;">Hi ${userName}!</h2>
          <p style="color: #475569; line-height: 1.6;">
            Welcome to the community-driven platform where local groups organize around environmental and social impact. We're excited to have you join our movement!
          </p>
          <h3 style="color: #1e293b;">What you can do:</h3>
          <ul style="color: #475569; line-height: 1.8;">
            <li>🏘️ Join communities in your area</li>
            <li>🎯 Create and vote on community needs</li>
            <li>🤝 Connect with like-minded changemakers</li>
            <li>📊 Track measurable impact</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/communities" style="background: #14b8a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Discover Communities</a>
          </div>
        </div>
      </div>
    `
  }),

  welcomeBrand: (companyName: string) => ({
    subject: 'Welcome to Crowd Conscious - Brand Partnership! 🏢',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome ${companyName}! 🏢</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">
            Thank you for joining Crowd Conscious as a brand partner. You're now ready to discover meaningful community needs to sponsor and create measurable social impact.
          </p>
          <h3 style="color: #1e293b;">Brand Features:</h3>
          <ul style="color: #475569; line-height: 1.8;">
            <li>🎯 Discover curated sponsorship opportunities</li>
            <li>📊 Track real impact metrics</li>
            <li>🤝 Build authentic community relationships</li>
            <li>⭐ Gain verified brand recognition</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/brand/discover" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Discover Opportunities</a>
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
    subject: `Your Monthly Impact Report 📊`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #14b8a6); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Your Monthly Impact 📊</h1>
        </div>
        <div style="padding: 30px 20px; background: #f8fafc; border-radius: 0 0 10px 10px;">
          <p style="color: #475569; line-height: 1.6;">Hi ${userName}!</p>
          <p style="color: #475569; line-height: 1.6;">
            Here's a summary of your impact this month through the Crowd Conscious platform.
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${stats.communitiesJoined || 0}</div>
              <div style="color: #6b7280; font-size: 14px;">Communities Joined</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.contentCreated || 0}</div>
              <div style="color: #6b7280; font-size: 14px;">Needs Created</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${stats.votesCount || 0}</div>
              <div style="color: #6b7280; font-size: 14px;">Votes Cast</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">$${stats.impactContributed || 0}</div>
              <div style="color: #6b7280; font-size: 14px;">Impact Value</div>
            </div>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/dashboard" style="background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Full Dashboard</a>
          </div>
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
  })
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

// Send welcome email based on user type
export async function sendWelcomeEmail(
  email: string, 
  name: string, 
  userType: 'user' | 'brand' = 'user'
): Promise<boolean> {
  const template = userType === 'brand' 
    ? emailTemplates.welcomeBrand(name)
    : emailTemplates.welcomeUser(name)
  
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
