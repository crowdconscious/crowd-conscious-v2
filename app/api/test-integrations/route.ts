import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { resend } from '@/lib/resend'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    stripe: {
      configured: !!stripe,
      status: 'unknown'
    },
    resend: {
      configured: !!resend,
      status: 'unknown'
    },
    environment: {
      stripe_key_present: !!process.env.STRIPE_SECRET_KEY,
      stripe_public_key_present: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      resend_key_present: !!process.env.RESEND_API_KEY,
      webhook_secret_present: !!process.env.STRIPE_WEBHOOK_SECRET
    }
  }

  // Test Stripe connection
  if (stripe) {
    try {
      // Try to retrieve account info (lightweight test)
      const account = await stripe.accounts.retrieve()
      results.stripe.status = 'connected'
      results.stripe.account_id = account.id
      results.stripe.country = account.country
    } catch (error: any) {
      results.stripe.status = 'error'
      results.stripe.error = error.message
    }
  }

  // Test Resend connection
  if (resend) {
    try {
      // Try to get domains (lightweight test)
      const domains = await resend.domains.list()
      results.resend.status = 'connected'
      results.resend.domains_count = Array.isArray(domains.data) ? domains.data.length : 0
    } catch (error: any) {
      results.resend.status = 'error'
      results.resend.error = error.message
    }
  }

  return NextResponse.json(results, { status: 200 })
}
