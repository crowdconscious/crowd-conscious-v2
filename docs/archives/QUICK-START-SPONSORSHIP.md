# 🚀 Quick Start: Sponsorship System

## ⚡ 3-Step Setup (15 minutes)

### 1️⃣ Run SQL Migrations (5 min)

Open Supabase SQL Editor and run:

**Migration 1**: `sql-migrations/simplify-remove-brand-type.sql`

- Adds sponsor fields to sponsorships table
- Creates trusted_brands view

**Migration 2**: `sql-migrations/create-sponsor-logos-bucket.sql`

- Creates sponsor-logos storage bucket
- Sets up RLS policies

### 2️⃣ Configure Stripe (5 min)

Add to Vercel Environment Variables:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Webhook URL**: `https://crowdconscious.app/api/webhooks/stripe`
**Events**: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`

### 3️⃣ Test (5 min)

1. Go to any community content
2. Click "Sponsor This Need"
3. Choose Individual or Business
4. Use test card: `4242 4242 4242 4242`
5. Verify success page and dashboard

---

## 📊 Sponsor Tiers

| Tier      | Amount           | Benefits                      |
| --------- | ---------------- | ----------------------------- |
| 🥉 Bronze | $1-999 MXN       | Name recognition              |
| 🥈 Silver | $1,000-4,999 MXN | Logo display + impact reports |
| 🥇 Gold   | $5,000+ MXN      | Prominent logo + website link |

---

## 🎯 What's Live

✅ Individual & Business sponsorship options
✅ Logo upload for businesses (2MB max)
✅ Stripe checkout integration
✅ Success/cancel pages
✅ Sponsor display on content
✅ My Sponsorships dashboard
✅ Trusted Brands landing section
✅ Tax receipt option (CFDI)
✅ Sponsor tier system
✅ Mobile-responsive UI

---

## 🔗 Key Files

- **Checkout**: `app/components/SponsorshipCheckout.tsx`
- **Display**: `app/components/SponsorDisplay.tsx`
- **Dashboard**: `app/components/MySponsorships.tsx`
- **API**: `app/api/create-checkout/route.ts`
- **Webhook**: `app/api/webhooks/stripe/route.ts`

---

## 📞 Quick Troubleshooting

**Logo not uploading?**
→ Check storage bucket exists in Supabase

**Webhook not working?**
→ Verify webhook secret in Vercel env vars

**Brands not showing?**
→ Run: `REFRESH MATERIALIZED VIEW trusted_brands`

---

**Full guide**: `SPONSORSHIP-SYSTEM-COMPLETE.md`
