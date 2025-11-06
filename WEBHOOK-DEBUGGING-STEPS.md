# 🔧 WEBHOOK DEBUGGING STEPS - CRITICAL ISSUE

## Problem
User completed purchase successfully, but NO enrollment was created. This will happen to EVERY customer unless we fix it NOW.

---

## ✅ IMMEDIATE ACTIONS NEEDED

### 1. CHECK VERCEL LOGS (MOST IMPORTANT)

**Go to**: Vercel Dashboard → Your Project → Logs

**Filter by**: Function = `/api/webhooks/stripe`

**Look for**:
- Recent webhook calls (within last 10 minutes)
- Any error messages
- Stack traces

**Send screenshot of the logs to identify exact error**

---

### 2. VERIFY WEBHOOK SECRET IN VERCEL

**Go to**: Vercel Dashboard → Your Project → Settings → Environment Variables

**Check**: Is `STRIPE_WEBHOOK_SECRET` set?

**Value should start with**: `whsec_...`

**To get correct value**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on "crowdconscious-production" webhook
3. Click "Reveal" on "Signing secret"
4. Copy the value (starts with `whsec_`)
5. Update in Vercel env vars if different
6. Redeploy after updating

---

### 3. CHECK STRIPE WEBHOOK EVENTS

**Go to**: Stripe Dashboard → Developers → Webhooks → crowdconscious-production

**Click**: View logs/events

**Look for**:
- `checkout.session.completed` events
- Response status (should be 200 OK)
- If status is 4xx or 5xx, click to see error details

---

### 4. RUN SQL DIAGNOSTIC

**In Supabase SQL Editor**, run: `FIX-WEBHOOK-RLS.sql`

This will:
- Check RLS policies
- Test if insert works
- Show exact error if it fails

---

## 🎯 EXPECTED ROOT CAUSES

Based on symptoms, most likely issues:

### A. Webhook Secret Mismatch (70% likely)
- Vercel has wrong `STRIPE_WEBHOOK_SECRET`
- Webhook signature verification fails
- Handler returns 401 and never processes payment

**Fix**: Update secret in Vercel, redeploy

### B. RLS Policy Blocking Insert (20% likely)
- Service role can't insert into `course_enrollments`
- Insert fails silently
- No enrollment created

**Fix**: Run `FIX-WEBHOOK-RLS.sql`

### C. Metadata Parsing Error (10% likely)
- Webhook receives event but can't parse metadata
- `cart_items` JSON is malformed
- Handler crashes

**Fix**: Add better error handling in webhook

---

## 🚨 TEMPORARY WORKAROUND (While we debug)

**For this specific purchase**, run in Supabase:

```sql
-- Get your user ID
SELECT id, email FROM auth.users WHERE email ILIKE '%francisco%';

-- Get the module you purchased (from cart)
SELECT 
  ci.module_id,
  mm.title
FROM cart_items ci
JOIN marketplace_modules mm ON ci.module_id = mm.id
WHERE ci.user_id = 'YOUR_USER_ID_FROM_ABOVE';

-- Create enrollment manually
INSERT INTO course_enrollments (
  user_id,
  corporate_account_id,
  module_id,
  purchase_type,
  purchased_at,
  purchase_price_snapshot,
  progress_percentage,
  completed,
  enrolled_at
)
VALUES (
  'YOUR_USER_ID',     -- From first query
  NULL,                -- individual purchase
  'YOUR_MODULE_ID',   -- From second query
  'individual',
  NOW(),
  0.00,                -- paid with promo code
  0,
  false,
  NOW()
);

-- Verify it worked
SELECT 
  ce.*,
  mm.title
FROM course_enrollments ce
JOIN marketplace_modules mm ON ce.module_id = mm.id
WHERE ce.user_id = 'YOUR_USER_ID';

-- Clear cart
DELETE FROM cart_items WHERE user_id = 'YOUR_USER_ID';
```

---

## 📋 ACTION CHECKLIST

- [ ] Check Vercel logs for webhook errors
- [ ] Verify webhook secret in Vercel matches Stripe
- [ ] Check Stripe webhook event logs for response status
- [ ] Run `FIX-WEBHOOK-RLS.sql` in Supabase
- [ ] Create enrollment manually for current purchase
- [ ] Test with another purchase to verify fix
- [ ] Monitor next 3 purchases to ensure working

---

## 🎯 SUCCESS CRITERIA

Webhook is fixed when:
1. ✅ User completes purchase
2. ✅ Stripe redirects to success page
3. ✅ Module appears in dashboard IMMEDIATELY (no manual SQL)
4. ✅ User can start learning right away

---

**PRIORITY: CRITICAL** - Every customer will experience this issue until fixed.

