import { render } from '@react-email/render'
import { WelcomeEmail } from './email-templates/welcome-email'
import { MonthlyImpactReport } from './email-templates/monthly-impact-report'
import { SponsorshipNotification } from './email-templates/sponsorship-notification'

// Email rendering functions
export const renderWelcomeEmail = (props: {
  userName: string
  userType?: 'user' | 'brand'
  initialXP?: number
}) => {
  return render(WelcomeEmail(props))
}

export const renderMonthlyImpactReport = (props: {
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
}) => {
  return render(MonthlyImpactReport(props))
}

export const renderSponsorshipNotification = (props: {
  brandName: string
  needTitle: string
  communityName: string
  fundingGoal: number
  currentFunding: number
  description: string
  deadline?: string
  communityImage?: string
  sponsorshipId: string
  isApproval?: boolean
}) => {
  return render(SponsorshipNotification(props))
}

// Email preview functions for testing
export const previewWelcomeEmail = () => {
  return renderWelcomeEmail({
    userName: 'Alex Johnson',
    userType: 'user',
    initialXP: 25
  })
}

export const previewWelcomeBrandEmail = () => {
  return renderWelcomeEmail({
    userName: 'GreenTech Solutions',
    userType: 'brand'
  })
}

export const previewMonthlyReport = () => {
  return renderMonthlyImpactReport({
    userName: 'Alex Johnson',
    month: 'November',
    year: 2024,
    stats: {
      communitiesJoined: 3,
      xpEarned: 250,
      contentCreated: 5,
      votesCount: 12,
      impactContributed: 1200,
      currentLevel: 3,
      leaderboardPosition: 15,
      achievementsEarned: ['Community Builder', 'Impact Creator', 'Voting Champion']
    },
    upcomingEvents: [
      {
        title: 'Community Clean-up Drive',
        community: 'EcoWarriors SF',
        date: 'December 15, 2024'
      },
      {
        title: 'Sustainability Workshop',
        community: 'Green Valley',
        date: 'December 20, 2024'
      }
    ],
    monthlyProgress: [
      { week: 'Week 1', funding: 500 },
      { week: 'Week 2', funding: 800 },
      { week: 'Week 3', funding: 1200 },
      { week: 'Week 4', funding: 1500 }
    ]
  })
}

export const previewSponsorshipNotification = () => {
  return renderSponsorshipNotification({
    brandName: 'EcoTech Industries',
    needTitle: 'Solar Panel Installation for Community Center',
    communityName: 'Sustainable Downtown',
    fundingGoal: 15000,
    currentFunding: 8500,
    description: 'Help us install solar panels on our community center to reduce carbon footprint and create a sustainable energy source for local programs.',
    deadline: 'December 31, 2024',
    sponsorshipId: 'sp_123456789'
  })
}

export const previewSponsorshipApproval = () => {
  return renderSponsorshipNotification({
    brandName: 'EcoTech Industries',
    needTitle: 'Solar Panel Installation for Community Center',
    communityName: 'Sustainable Downtown',
    fundingGoal: 15000,
    currentFunding: 8500,
    description: 'Help us install solar panels on our community center to reduce carbon footprint and create a sustainable energy source for local programs.',
    sponsorshipId: 'sp_123456789',
    isApproval: true
  })
}
