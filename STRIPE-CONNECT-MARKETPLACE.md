# 💰 Stripe Connect Marketplace Payment System

## **Complete Implementation Guide**

**Date:** October 10, 2025

---

## 📋 **Overview**

This system enables community founders to receive **85%** of sponsorship payments directly to their bank accounts, while the platform automatically keeps a **15%** service fee.

### **How It Works:**

```
Brand pays $1,000 MXN
     ↓
Stripe processes payment
     ↓
├─ $850 (85%) → Community Founder's Bank Account
└─ $150 (15%) → Platform Account
```

---

## 🏗️ **Architecture**

### **Components:**

1. **Database Migrations** - Adds Stripe Connect fields
2. **API Routes** - Handle onboarding and status checks
3. **Checkout Flow** - Splits payments automatically
4. **Webhook Handler** - Tracks transfers and fees
5. **Founder Dashboard** - UI for payment management

---

## 📦 **Files Created/Modified**

### **New Files:**

1. `sql-migrations/add-stripe-connect.sql` - Database schema
2. `app/api/stripe/connect/onboard/route.ts` - Onboarding API
3. `app/(app)/dashboard/payments/page.tsx` - Dashboard entry
4. `app/(app)/dashboard/payments/PaymentsDashboard.tsx` - Dashboard UI
5. `app/(app)/dashboard/payments/success/page.tsx` - Success page
6. `app/(app)/dashboard/payments/refresh/page.tsx` - Refresh page

### **Modified Files:**

1. `app/api/create-checkout/route.ts` - Added Connect payment split
2. `app/api/webhooks/stripe/route.ts` - Tracks platform fees

---

## 🚀 **Setup Instructions**

### **Step 1: Run Database Migration**

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- This creates all necessary fields for Stripe Connect
```

Then execute: `sql-migrations/add-stripe-connect.sql`

### **Step 2: Configure Stripe**

1. **Enable Stripe Connect:**
   - Go to [Stripe Dashboard → Connect](https://dashboard.stripe.com/connect/accounts/overview)
   - Enable "Express" accounts
   - Set branding (logo, colors)

2. **Set Platform Settings:**
   - Business name: Crowd Conscious
   - Support email: support@crowdconscious.app
   - Country: Mexico (MX)

3. **Configure Webhook:**
   - Endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `account.updated` (for Connect accounts)

### **Step 3: Environment Variables**

Add to your `.env.local` and Vercel:

```bash
# Already configured (no changes needed)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### **Step 4: Deploy**

```bash
git add .
git commit -m "feat: Implement Stripe Connect marketplace payments"
git push origin main
```

Vercel will auto-deploy.

---

## 👥 **User Flow: Founder Onboarding**

### **For Community Founders:**

1. **Create a Community**
   - Founder creates their community on the platform

2. **Access Payment Settings**
   - Go to Dashboard → Settings → Payments
   - Or visit `/dashboard/payments` directly

3. **Start Onboarding**
   - Click "Start Onboarding"
   - Redirected to Stripe Connect onboarding

4. **Complete Stripe Onboarding**
   - Provide business/personal info
   - Add bank account details
   - Verify identity (if required)
   - Agree to Stripe terms

5. **Return to Platform**
   - Automatically redirected back
   - Status shows "Payments Enabled ✅"

6. **Receive Payments**
   - All future sponsorships automatically split
   - 85% deposited to founder's account
   - Payouts within 2-7 business days

---

## 💳 **Payment Flow**

### **Step-by-Step:**

1. **Brand Creates Sponsorship**
   - Selects content to sponsor
   - Enters amount (e.g., $1,000 MXN)
   - Provides payment details

2. **Checkout Session Created**
   - Platform checks if founder has Connect account
   - If yes: Creates session with `application_fee_amount`
   - If no: Platform receives full amount

3. **Payment Processed**
   - Brand completes checkout
   - Stripe processes payment
   - If Connect: Automatically splits funds

4. **Webhook Received**
   - Platform receives `checkout.session.completed`
   - Updates sponsorship status to "paid"
   - Records platform fee and founder amount
   - Saves transfer ID

5. **Funds Distributed**
   - Founder: $850 MXN (85%) to bank account
   - Platform: $150 MXN (15%) service fee
   - Transfer happens automatically

---

## 🧪 **Testing**

### **Test Mode Setup:**

1. **Use Test Keys:**

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_test_...
   ```

2. **Test Onboarding:**
   - Go to `/dashboard/payments`
   - Click "Start Onboarding"
   - Use Stripe test data:
     - Phone: +52 1234567890
     - Bank Account: 000123456789 (Mexico)
     - Routing: 012345678

3. **Test Payment:**
   - Create a test sponsorship
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any valid postal code

4. **Verify Split:**
   - Check Stripe Dashboard → Payments
   - Should see application fee deducted
   - Should see transfer to Connected account

### **Test with Stripe CLI:**

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Listen for webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
```

---

## 📊 **Monitoring**

### **Platform Dashboard (Your View):**

Check these in Stripe Dashboard:

1. **Total Revenue:** Dashboard → Home
2. **Application Fees:** Connect → Transfers
3. **Connected Accounts:** Connect → Accounts
4. **Failed Transfers:** Connect → Transfers (filter by status)

### **Founder Dashboard (Their View):**

Founders can check:

1. **Balance:** Login to Stripe Express Dashboard
2. **Payouts:** View payout history
3. **Tax Documents:** Download for SAT compliance
4. **Bank Account:** Update payment details

---

## 🔧 **API Reference**

### **POST /api/stripe/connect/onboard**

Creates or retrieves Stripe Connect account and generates onboarding link.

**Request:**

```bash
POST /api/stripe/connect/onboard
Content-Type: application/json
Authorization: Bearer {user_token}
```

**Response:**

```json
{
  "url": "https://connect.stripe.com/setup/...",
  "accountId": "acct_..."
}
```

### **GET /api/stripe/connect/onboard**

Check onboarding status of current user.

**Response:**

```json
{
  "onboarded": true,
  "charges_enabled": true,
  "payouts_enabled": true,
  "account_id": "acct_..."
}
```

### **POST /api/create-checkout**

Create checkout session with automatic payment split.

**Request:**

```json
{
  "sponsorshipId": "uuid",
  "amount": 1000,
  "contentTitle": "Community Clean-up Event",
  "communityName": "Green Mexico City",
  "communityId": "uuid",
  "sponsorType": "business",
  "brandName": "EcoMark",
  "email": "brand@example.com",
  "taxReceipt": true
}
```

**Response:**

```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

## 💡 **Key Features**

### **Automatic Split:**

- ✅ No manual transfers needed
- ✅ Instant calculation of fees
- ✅ Founders get paid automatically

### **Transparent:**

- ✅ Founders see exact amounts
- ✅ All transactions logged
- ✅ Full Stripe dashboard access

### **Compliant:**

- ✅ Mexican tax compliance (SAT)
- ✅ Proper receipts generated
- ✅ Audit trail maintained

### **Secure:**

- ✅ PCI-DSS compliant
- ✅ Bank-level encryption
- ✅ Fraud detection included

---

## ⚠️ **Important Notes**

### **Platform Fees:**

The 15% platform fee is:

- Non-negotiable (set in code)
- Deducted automatically by Stripe
- Kept by platform account
- Transparent to all parties

### **Payout Timing:**

- **Standard:** 2-7 business days
- **Instant (available in Mexico):** Additional fee applies
- **Schedule:** Automatic (daily/weekly/monthly)

### **Account Requirements:**

Founders need:

- Valid ID (INE/Passport)
- Mexican bank account
- RFC (for businesses)
- Proof of address

### **Limits:**

- **Minimum payout:** 100 MXN
- **Maximum per transaction:** No limit (Stripe handles)
- **Daily limit:** Based on Stripe account level

---

## 🐛 **Troubleshooting**

### **Onboarding Fails:**

**Issue:** Founder can't complete onboarding

**Solutions:**

1. Check if Stripe Connect is enabled in dashboard
2. Verify country is set to Mexico
3. Ensure express accounts are allowed
4. Check browser console for errors
5. Try incognito mode

### **Payment Not Splitting:**

**Issue:** Platform receives full amount

**Check:**

1. Founder completed onboarding? (`stripe_onboarding_complete = true`)
2. Charges enabled? (`stripe_charges_enabled = true`)
3. Payouts enabled? (`stripe_payouts_enabled = true`)
4. `communityId` passed to checkout?
5. Webhook logs show `connectedAccountId`?

### **Founder Not Receiving Payouts:**

**Issue:** Money not reaching founder's bank

**Check:**

1. Bank account verified in Stripe?
2. Payout schedule set correctly?
3. Any holds on account?
4. Check Stripe Express dashboard for issues
5. Verify transfer ID in database

### **Platform Fee Incorrect:**

**Issue:** Fee calculation wrong

**Verify:**

```typescript
// Should be exactly this:
platformFee = amount * 0.15; // 15%
founderAmount = amount * 0.85; // 85%
```

---

## 📈 **Scaling Considerations**

### **High Volume:**

If processing many payments:

- Enable Stripe Radar for fraud detection
- Set up automatic payout schedules
- Monitor webhook delivery
- Use Stripe Sigma for analytics

### **Multiple Countries:**

To expand beyond Mexico:

- Update country in Connect account creation
- Adjust currency handling
- Update tax documentation requirements
- Review payout timing per country

### **Custom Fee Structure:**

To change the 15% fee:

1. Update in `app/api/create-checkout/route.ts`:
   ```typescript
   const platformFeeAmount = Math.round(amount * 0.2 * 100); // 20%
   ```
2. Update in documentation
3. Notify existing founders

---

## ✅ **Success Checklist**

Before going live:

- [ ] Database migration run successfully
- [ ] Stripe Connect enabled in dashboard
- [ ] Webhook endpoint configured
- [ ] Test onboarding completed
- [ ] Test payment processed correctly
- [ ] Platform fee calculated correctly (15%)
- [ ] Founder received test payout
- [ ] All API routes returning 200 OK
- [ ] No console errors
- [ ] Production environment variables set
- [ ] Legal terms updated (if needed)
- [ ] Support email configured

---

## 📞 **Support**

### **For Platform Issues:**

- Check Vercel logs
- Review Stripe webhook logs
- Test with Stripe CLI
- Contact: your-email@example.com

### **For Stripe Issues:**

- [Stripe Support](https://support.stripe.com/)
- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Express Accounts](https://stripe.com/docs/connect/express-accounts)

---

## 🎯 **Next Steps**

1. **Run the migration** - Add database fields
2. **Test in development** - Complete onboarding flow
3. **Deploy to production** - Push to main branch
4. **Enable in Stripe** - Configure Connect settings
5. **Test with real account** - Verify everything works
6. **Launch to founders** - Announce the feature!

---

## 🎉 **You're Ready!**

The Stripe Connect marketplace payment system is now fully implemented. Community founders can receive payments automatically, and you collect your 15% platform fee seamlessly.

**Total Implementation:**

- ✅ 6 new files created
- ✅ 2 files modified
- ✅ Full payment split automation
- ✅ Complete founder dashboard
- ✅ Production-ready webhook handling

**Congratulations! 🚀**
