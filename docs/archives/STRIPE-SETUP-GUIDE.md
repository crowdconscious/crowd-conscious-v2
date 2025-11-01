# Stripe Payment Setup Guide

## 🔧 Environment Variables Required

Add these to your `.env.local` file:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Admin Configuration (your email)
ADMIN_EMAIL=your_email@example.com
```

## 🏗️ Stripe Setup Steps

### 1. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete business verification (can start with test mode)

### 2. Get API Keys

1. In Stripe Dashboard → Developers → API Keys
2. Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Copy **Secret key** → `STRIPE_SECRET_KEY`

### 3. Set Up Webhook

1. In Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 4. Database Migration

Run the SQL migration to add payment tracking:

```sql
-- Run this in your Supabase SQL editor
-- File: sql-migrations/stripe-payment-functions.sql
```

## 💳 How the Payment Flow Works

### 1. Brand applies to sponsor a need

- Creates entry in `sponsorship_applications` table
- Community approves the application
- Status changes to `approved`

### 2. Brand makes payment

- Clicks "Pay Now" button
- Creates Stripe Payment Intent with 15% platform fee
- Enters card details and confirms payment

### 3. Payment processing

- Stripe webhook confirms payment success
- Updates sponsorship status to `paid`
- Increments community content funding
- Triggers email notifications (when Resend is set up)

### 4. Community receives funds

- 85% goes to community (after 15% platform fee)
- Funds are available in community's Stripe account
- Need status updates to `completed` when goal is reached

## 🔐 Security Features

- All payments use Stripe's secure infrastructure
- Webhook signature verification prevents fraud
- Row Level Security (RLS) protects payment data
- Platform fee automatically calculated and collected

## 🧪 Testing

Use Stripe test cards:

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future date for expiry
- Any 3-digit CVC

## 📊 Platform Fee Structure

- **15% platform fee** on all sponsorships
- Automatically calculated and deducted
- Transparent breakdown shown to brands
- Community receives 85% of sponsorship amount

## 🚀 Going Live

1. Switch to live API keys in production
2. Update webhook URL to production domain
3. Complete Stripe account verification
4. Set up business bank account for payouts
