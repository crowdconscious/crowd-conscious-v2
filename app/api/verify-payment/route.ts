import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      )
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { success: false, error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // Get sponsorship details
    const sponsorshipId = session.metadata?.sponsorshipId

    if (!sponsorshipId) {
      return NextResponse.json(
        { success: false, error: 'Sponsorship not found' },
        { status: 404 }
      )
    }

    const { data: sponsorship, error } = await supabase
      .from('sponsorships')
      .select('*')
      .eq('id', sponsorshipId)
      .single()

    if (error || !sponsorship) {
      return NextResponse.json(
        { success: false, error: 'Sponsorship not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      sponsorship
    })
  } catch (error: any) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
