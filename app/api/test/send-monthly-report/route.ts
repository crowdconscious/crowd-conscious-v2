import { NextRequest, NextResponse } from 'next/server'
import { sendMonthlyImpactReport } from '@/lib/email-sender'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Sample data for testing
    const testData = {
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
    }

    const result = await sendMonthlyImpactReport(email, testData)

    if (result.success) {
      return NextResponse.json({ 
        message: 'Monthly impact report sent successfully!',
        details: 'Check your inbox for the comprehensive report with charts and progress bars'
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send monthly report' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Monthly report test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
