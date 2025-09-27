import { 
  renderWelcomeEmail, 
  renderMonthlyImpactReport, 
  renderSponsorshipNotification, 
  renderAchievementUnlocked 
} from './email-renderer'

// Enhanced email sending with React Email templates
export async function sendEmailWithTemplate(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured - email not sent')
      return { success: false, error: 'Email service not configured' }
    }

    // Use custom domain or fallback to default
    const fromEmail = process.env.FROM_EMAIL || 'Crowd Conscious <noreply@your-domain.com>'

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, error: errorData.message || 'Failed to send email' }
    }

    const data = await response.json()
    console.log('Email sent successfully:', data.id)
    return { success: true }
  } catch (error: any) {
    console.error('Email send error:', error)
    return { success: false, error: error.message }
  }
}

// Welcome email for new users
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  userType: 'user' | 'brand' = 'user'
) {
  const html = await renderWelcomeEmail({
    userName,
    userType,
    initialXP: userType === 'user' ? 25 : undefined
  })

  const subject = userType === 'brand' 
    ? `Welcome to Crowd Conscious, ${userName}! 🏢`
    : `Welcome to Crowd Conscious, ${userName}! 🌱`

  return sendEmailWithTemplate(userEmail, subject, html)
}

// Monthly impact report
export async function sendMonthlyImpactReport(
  userEmail: string,
  data: {
    userName: string
    month: string
    year: number
    stats: {
      communitiesJoined: number
      xpEarned: number
      contentCreated: number
      votesCount: number
      impactContributed: number
      currentLevel: number
      leaderboardPosition: number
      achievementsEarned: string[]
    }
    upcomingEvents: Array<{
      title: string
      community: string
      date: string
    }>
    monthlyProgress: Array<{
      week: string
      funding: number
    }>
  }
) {
  const html = await renderMonthlyImpactReport(data)
  const subject = `📊 Your ${data.month} ${data.year} Impact Report - ${data.stats.xpEarned} XP Earned!`

  return sendEmailWithTemplate(userEmail, subject, html)
}

// Sponsorship opportunity notification
export async function sendSponsorshipNotification(
  brandEmail: string,
  data: {
    brandName: string
    needTitle: string
    communityName: string
    fundingGoal: number
    currentFunding: number
    description: string
    deadline?: string
    sponsorshipId: string
  }
) {
  const html = await renderSponsorshipNotification(data)
  const subject = `🎯 New Sponsorship Opportunity: ${data.needTitle}`

  return sendEmailWithTemplate(brandEmail, subject, html)
}

// Sponsorship approval notification
export async function sendSponsorshipApproval(
  brandEmail: string,
  data: {
    brandName: string
    needTitle: string
    communityName: string
    fundingGoal: number
    currentFunding: number
    description: string
    sponsorshipId: string
  }
) {
  const html = await renderSponsorshipNotification({
    ...data,
    isApproval: true
  })
  const subject = `🎉 Sponsorship Approved - Payment Required: ${data.needTitle}`

  return sendEmailWithTemplate(brandEmail, subject, html)
}

// Achievement unlocked notification
export async function sendAchievementNotification(
  userEmail: string,
  data: {
    userName: string
    achievementTitle: string
    achievementDescription: string
    achievementIcon: string
    xpGained: number
    currentLevel: number
    nextAchievement?: {
      title: string
      description: string
      requiredXP: number
      currentProgress: number
    }
    badgeImageUrl?: string
  }
) {
  const html = await renderAchievementUnlocked(data)
  const subject = `🎉 Achievement Unlocked: ${data.achievementTitle}! (+${data.xpGained} XP)`

  return sendEmailWithTemplate(userEmail, subject, html)
}

// Batch email sending for notifications
export async function sendBatchEmails(
  emails: Array<{
    to: string
    subject: string
    html: string
  }>
) {
  const results = await Promise.allSettled(
    emails.map(email => sendEmailWithTemplate(email.to, email.subject, email.html))
  )

  const successes = results.filter(result => result.status === 'fulfilled' && result.value.success).length
  const failures = results.length - successes

  return {
    total: emails.length,
    successes,
    failures,
    results
  }
}
