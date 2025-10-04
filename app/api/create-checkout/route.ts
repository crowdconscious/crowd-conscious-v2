import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil'
})

export async function POST(request: NextRequest) {
  try {
    const {
      sponsorshipId,
      amount,
      contentTitle,
      communityName,
      sponsorType,
      brandName,
      email,
      taxReceipt
    } = await request.json()

    // Validate required fields
    if (!sponsorshipId || !amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Sponsorship: ${contentTitle}`,
              description: `Support for ${communityName}`,
              images: ['https://crowdconscious.app/images/logo.png'] // Add your logo URL
            },
            unit_amount: amount * 100 // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsorship/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/sponsorship/cancelled`,
      customer_email: email,
      metadata: {
        sponsorshipId,
        sponsorType,
        brandName: brandName || '',
        taxReceipt: taxReceipt ? 'yes' : 'no',
        contentTitle,
        communityName
      },
      // Enable tax ID collection for Mexican businesses
      ...(taxReceipt && {
        tax_id_collection: {
          enabled: true
        }
      })
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
