import { NextResponse } from 'next/server'

// TEST ENDPOINT: Simple cart API that doesn't query database
// This will help us identify if the issue is with Supabase queries or something else

export async function GET() {
  try {
    console.log('🧪 TEST: Cart API called')
    
    // Return a simple successful response
    return NextResponse.json({
      items: [],
      summary: {
        item_count: 0,
        total_price: 0,
        total_employees: 0
      },
      test: true,
      message: 'This is a test endpoint that bypasses all database queries'
    })
  } catch (error) {
    console.error('💥 TEST: Error in cart test endpoint:', error)
    return NextResponse.json(
      { error: 'Test endpoint failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

