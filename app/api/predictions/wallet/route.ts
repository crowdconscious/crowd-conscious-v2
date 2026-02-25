import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth-server'
import { stripe } from '@/lib/stripe'
import { depositSchema } from '@/lib/prediction-schemas'
import { validateRequest } from '@/lib/validation-schemas'
import {
  moderateRateLimit,
  getRateLimitIdentifier,
  checkRateLimit,
  rateLimitResponse,
} from '@/lib/rate-limit'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_or_create_prediction_wallet', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Wallet fetch error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    return NextResponse.json({ wallet: data })
  } catch (err) {
    console.error('Wallet route error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const identifier = await getRateLimitIdentifier(request, user.id)
    const limitResult = await checkRateLimit(moderateRateLimit, identifier)
    if (limitResult && !limitResult.allowed) {
      return rateLimitResponse(
        limitResult.limit,
        limitResult.remaining,
        limitResult.reset
      )
    }

    let validatedData
    try {
      validatedData = await validateRequest(request, depositSchema)
    } catch (error: unknown) {
      const err = error as { status?: number; error?: unknown }
      if (err.status === 422) {
        return NextResponse.json(err.error, { status: 422 })
      }
      throw error
    }

    const { amount, payment_method } = validatedData

    if (payment_method === 'mercadopago') {
      return NextResponse.json(
        { error: 'Mercado Pago deposits coming soon. Use Stripe for now.' },
        { status: 501 }
      )
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { data: wallet, error: walletError } = await supabase.rpc(
      'get_or_create_prediction_wallet',
      { p_user_id: user.id }
    )

    if (walletError || !wallet) {
      console.error('Wallet fetch error:', walletError)
      return NextResponse.json(
        { error: 'Failed to get wallet' },
        { status: 500 }
      )
    }

    const amountCents = Math.round(amount * 100)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'prediction_deposit',
        user_id: user.id,
        wallet_id: wallet.id,
        amount_mxn: amount.toString(),
      },
      description: `Prediction wallet deposit - ${amount} MXN`,
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount,
      currency: 'MXN',
    })
  } catch (err) {
    console.error('Wallet deposit error:', err)
    return NextResponse.json(
      { error: 'Failed to create deposit' },
      { status: 500 }
    )
  }
}
