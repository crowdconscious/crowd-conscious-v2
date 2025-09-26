import { NextResponse } from 'next/server'
import { previewAchievementUnlocked } from '@/lib/email-renderer'

export async function GET() {
  try {
    const html = previewAchievementUnlocked()
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error rendering achievement email preview:', error)
    return NextResponse.json(
      { error: 'Failed to render email preview' },
      { status: 500 }
    )
  }
}
