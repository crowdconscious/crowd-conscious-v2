import { NextRequest, NextResponse } from 'next/server'
import { previewWelcomeEmail, previewWelcomeBrandEmail } from '@/lib/email-renderer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'user'
    
    const html = type === 'brand' 
      ? previewWelcomeBrandEmail()
      : previewWelcomeEmail()
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error rendering welcome email preview:', error)
    return NextResponse.json(
      { error: 'Failed to render email preview' },
      { status: 500 }
    )
  }
}
