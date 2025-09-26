import { NextResponse } from 'next/server'
import { previewMonthlyReport } from '@/lib/email-renderer'

export async function GET() {
  try {
    const html = previewMonthlyReport()
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error rendering monthly report preview:', error)
    return NextResponse.json(
      { error: 'Failed to render email preview' },
      { status: 500 }
    )
  }
}
