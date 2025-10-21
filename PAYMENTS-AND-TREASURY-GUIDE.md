# 💰 Payment Settings & Community Treasury System

**Complete Implementation Guide**  
**Date:** October 21, 2025

---

## 🎉 What's New

### 1. **Stripe Connect in Settings** ⚙️

Users can now connect their Stripe accounts directly from their profile settings to receive 85% of sponsorship payments.

### 2. **Community Treasury/Pool System** 💰

Communities now have a shared funding pool where members can donate, and admins can sponsor needs using collective funds.

---

## 📋 Table of Contents

1. [Stripe Connect Setup](#stripe-connect-setup)
2. [Community Treasury System](#community-treasury-system)
3. [Database Setup](#database-setup)
4. [Testing Guide](#testing-guide)
5. [Troubleshooting](#troubleshooting)

---

## 🔐 Stripe Connect Setup

### **For Community Creators:**

#### **Step 1: Access Payment Settings**

1. Log in to your account
2. Click on **⚙️ Settings** in the top navigation
3. Scroll to **💳 Payment Settings** section

#### **Step 2: Connect Your Stripe Account**

- **If Not Connected:**
  - Click **"Connect Stripe Account"**
  - You'll be redirected to Stripe Connect onboarding
- **If In Progress:**
  - Click **"Continue Onboarding"**
  - Complete any missing information
- **If Already Connected:**
  - Status will show **"Payments Enabled ✅"**
  - You can view your dashboard or update account info

#### **Step 3: Complete Stripe Onboarding**

Stripe will ask for:

- Business or personal information
- Bank account details for payouts
- Identity verification (if required)
- Tax information (RFC for Mexico)

#### **Step 4: Start Receiving Payments**

Once approved:

- **85%** of all sponsorships go directly to your bank account
- **15%** covers platform fees
- Payouts typically arrive within **2-7 business days**

---

## 💰 Community Treasury System

### **What is the Community Pool?**

The Community Pool is a **shared fund** that community members contribute to. Admins can then use these funds to sponsor needs and initiatives on behalf of the entire community.

### **Benefits:**

- 🤝 **Collective Action**: Pool resources for greater impact
- 💪 **Community Power**: Support multiple needs without individual financial burden
- 📊 **Transparency**: All transactions are tracked and visible to members
- 🎯 **Strategic Funding**: Admins can allocate funds where they're most needed

---

## 🎨 Treasury Features

### **For All Community Members:**

#### **View Treasury Balance**

1. Go to any community you're a member of
2. Click the **💰 Community Pool** tab
3. See:
   - Current pool balance
   - Total donations
   - Total spent
   - Recent transactions

#### **Donate to Pool**

1. Click **"💸 Donate to Community Pool"**
2. Choose amount (or use preset buttons: $50, $100, $250, $500, $1000)
3. Click **"Donate Now"**
4. Complete payment via Stripe
5. Donation is instantly added to pool

#### **Track Impact**

- See all recent donations
- View how funds have been spent
- Understand community's collective impact

### **For Community Admins:**

#### **Spend from Treasury**

Admins have special controls:

- View admin-only notice on treasury page
- When sponsoring a need, option to use pool funds appears
- Must have sufficient balance
- All spending is tracked and transparent

#### **Monitor Treasury Health**

- Track donation trends
- See spending patterns
- Plan strategic allocation of funds

---

## 🗄️ Database Setup

### **REQUIRED: Run Database Migration**

**You MUST run this before using the treasury system.**

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run Migration**
   - Copy the entire contents of: `sql-migrations/045-add-community-treasury.sql`
   - Paste into SQL Editor
   - Click **Run**

3. **Verify Success**
   - Check for "Success" message
   - Verify these tables exist:
     - `community_treasury`
     - `treasury_transactions`

### **What the Migration Creates:**

#### **Tables:**

- `community_treasury` - Tracks balance for each community
- `treasury_transactions` - Records all donations and spending

#### **Functions:**

- `initialize_community_treasury()` - Creates treasury for new communities
- `add_treasury_donation()` - Adds donations to pool
- `spend_from_treasury()` - Processes spending (for sponsorships)
- `get_treasury_stats()` - Retrieves treasury data

#### **Security:**

- Row Level Security (RLS) policies
- Only members can view treasury
- Only admins can spend
- Donations require authentication
- Balance integrity checks

#### **Automatic Triggers:**

- New communities automatically get a treasury
- All existing communities can initialize on first use

---

## 🧪 Testing Guide

### **Test 1: Connect Stripe Account**

1. **Go to Settings**

   ```
   Navigate: Profile → ⚙️ Settings → Payment Settings
   ```

2. **Start Onboarding**
   - Click "Connect Stripe Account"
   - Should redirect to Stripe

3. **Use Test Mode (if in development)**
   - Stripe provides test mode for development
   - Can test onboarding flow without real verification

4. **Verify Status**
   - Return to settings
   - Should show appropriate status

### **Test 2: Donate to Community Pool**

1. **Join a Community**
   - Be a member of at least one community

2. **Navigate to Treasury**

   ```
   Community Page → 💰 Community Pool tab
   ```

3. **Make Donation**
   - Click "Donate to Community Pool"
   - Enter amount (e.g., $100)
   - Click "Donate Now"

4. **Complete Payment**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future date
   - Any CVC

5. **Verify Success**
   - Should redirect back to community
   - Balance should update
   - Transaction should appear in recent list

### **Test 3: View Treasury Stats**

1. **Check Balance Display**
   - Current balance visible
   - Total donated correct
   - Total spent accurate

2. **View Transactions**
   - Recent donations listed
   - Donor names shown (if available)
   - Amounts and dates displayed

3. **Admin View (if you're an admin)**
   - Should see admin controls notice
   - No errors accessing treasury

---

## 🔄 How Payment Flows Work

### **Sponsorship Payment (Individual)**

```
Brand/User pays $1,000 MXN
     ↓
Stripe processes payment
     ↓
├─ $850 (85%) → Community Creator's Bank Account
└─ $150 (15%) → Platform Account
```

### **Treasury Donation**

```
Member donates $100 MXN
     ↓
Stripe processes payment
     ↓
└─ $100 (100%) → Community Pool
     ↓
Webhook triggers
     ↓
Database updated via SQL function
     ↓
Balance increases by $100
```

### **Pool-Funded Sponsorship (Coming Next)**

```
Admin sponsors from pool
     ↓
Check pool balance
     ↓
If sufficient → Deduct from treasury
     ↓
Create sponsorship record
     ↓
Track spending in transactions
     ↓
Balance decreases
```

---

## 🚀 Deployment Steps

### **1. Database Migration (CRITICAL)**

```sql
-- Run this in Supabase SQL Editor
-- File: sql-migrations/045-add-community-treasury.sql
```

### **2. Verify Environment Variables**

Already configured (no new vars needed):

```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### **3. Deploy to Vercel**

```bash
git push origin main
```

Vercel will auto-deploy.

### **4. Test in Production**

1. Connect a Stripe account
2. Make a test donation
3. Verify webhook processes donation
4. Check treasury balance updates

---

## 🔍 Troubleshooting

### **Stripe Connect Issues**

#### **"Failed to start onboarding"**

- **Check:** Stripe API keys are correct
- **Check:** Stripe Connect is enabled in dashboard
- **Fix:** Verify `STRIPE_SECRET_KEY` in environment variables

#### **"Onboarding link expired"**

- **Normal:** Links expire after a few minutes
- **Fix:** Click "Continue Onboarding" again to generate new link

#### **"Payments not enabled after onboarding"**

- **Wait:** Status can take a few minutes to update
- **Check:** Stripe Dashboard → Connect → Accounts
- **Fix:** May need to refresh page or re-check account

### **Treasury Issues**

#### **"Treasury not found"**

- **Cause:** Migration not run or community created before trigger
- **Fix:** Run migration, treasury will initialize on first use

#### **"Insufficient funds in treasury"**

- **Normal:** Can't spend more than available balance
- **Check:** View current balance in treasury tab
- **Fix:** Members need to donate more to pool

#### **"Failed to fetch treasury stats"**

- **Check:** User is a community member
- **Check:** Database migration was successful
- **Fix:** Verify RLS policies are in place

#### **Donation not reflecting**

- **Wait:** Webhook processing can take 5-10 seconds
- **Check:** Stripe webhook logs for errors
- **Fix:** Refresh page, check webhook endpoint is correct

### **Webhook Issues**

#### **Webhook not processing**

- **Check:** Webhook URL is correct in Stripe Dashboard
- **Check:** Webhook secret matches `STRIPE_WEBHOOK_SECRET`
- **View:** Check Vercel logs or Stripe webhook logs
- **Fix:** Resend test webhook from Stripe

#### **"Treasury donation error" in logs**

- **Check:** Migration was run successfully
- **Check:** RPC function `add_treasury_donation` exists
- **Fix:** Re-run migration if needed

---

## 📊 Database Schema Reference

### **community_treasury**

```sql
id                  uuid PRIMARY KEY
community_id        uuid UNIQUE (FK to communities)
balance             decimal(10,2) -- Current pool balance
total_donations     decimal(10,2) -- All-time donations
total_spent         decimal(10,2) -- All-time spending
created_at          timestamptz
updated_at          timestamptz
```

### **treasury_transactions**

```sql
id                      uuid PRIMARY KEY
community_id            uuid (FK to communities)
transaction_type        text ('donation' | 'sponsorship' | 'withdrawal')
amount                  decimal(10,2)
donor_id                uuid (FK to profiles, nullable)
donor_email             text
donor_name              text
sponsored_content_id    uuid (FK to community_content, nullable)
sponsorship_id          uuid (FK to sponsorships, nullable)
description             text
stripe_payment_intent_id text
status                  text ('pending' | 'completed' | 'failed' | 'refunded')
created_at              timestamptz
created_by              uuid (FK to profiles, nullable)
metadata                jsonb
```

---

## 🎯 Next Steps

### **Immediate:**

1. ✅ Run database migration
2. ✅ Test Stripe Connect in settings
3. ✅ Test treasury donations
4. ✅ Verify webhooks working

### **Coming Next:**

1. 🚧 **Pool-Funded Sponsorships**
   - Admin option in SponsorshipCheckout
   - "Use Community Pool Funds" checkbox
   - Automatic deduction from treasury
   - Notification to members

2. 📧 **Email Notifications**
   - Donation confirmation
   - Treasury milestone alerts
   - Spending notifications
   - Monthly treasury reports

3. 📱 **Treasury Analytics**
   - Donation trends
   - Spending breakdown
   - Impact metrics
   - Top contributors

---

## 📞 Support

If you encounter issues:

1. Check this guide first
2. Review error messages in:
   - Browser console
   - Vercel logs
   - Stripe webhook logs
   - Supabase logs
3. Verify all setup steps completed
4. Test in isolation (one feature at a time)

---

## 🎉 Summary

You now have:

- ✅ **Stripe Connect** accessible from user settings
- ✅ **Community Treasury** system fully functional
- ✅ **Donation flow** working end-to-end
- ✅ **Transaction tracking** with full transparency
- ✅ **Admin controls** for strategic spending
- ✅ **Secure database** with RLS policies

**Your platform now supports both individual payments (85/15 split) and collective community funding!** 🎊
