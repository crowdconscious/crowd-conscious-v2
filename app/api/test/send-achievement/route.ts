import { NextRequest, NextResponse } from 'next/server'
import { sendAchievementNotification } from '@/lib/email-sender'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    // Sample data for testing achievement notification
    const testData = {
      userName: 'Alex Johnson',
      achievementTitle: 'Community Builder',
      achievementDescription: 'Created your first community need and gathered support from fellow members. You\'re making a real difference!',
      achievementIcon: '🏗️',
      xpGained: 100,
      currentLevel: 2,
      nextAchievement: {
        title: 'Impact Leader',
        description: 'Reach Level 5 and help 3 needs get fully funded',
        requiredXP: 500,
        currentProgress: 350
      }
    }

    const result = await sendAchievementNotification(email, testData)

    if (result.success) {
      return NextResponse.json({ 
        message: 'Achievement notification sent successfully!',
        details: 'Email includes confetti animation, badge design, and next achievement preview'
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to send achievement notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Achievement test error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
