import { NextRequest, NextResponse } from 'next/server'
import { previewSponsorshipNotification, previewSponsorshipApproval } from '@/lib/email-renderer'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'notification'
    
    const html = type === 'approval' 
      ? previewSponsorshipApproval()
      : previewSponsorshipNotification()
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error rendering sponsorship email preview:', error)
    return NextResponse.json(
      { error: 'Failed to render email preview' },
      { status: 500 }
    )
  }
}
