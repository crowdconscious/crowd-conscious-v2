# 🚨 STRIPE DEPLOYMENT FIX

## Problem

You added `STRIPE_SECRET_KEY` to Vercel, but the app still says "STRIPE_SECRET_KEY is not set"

## Why This Happens

**Environment variables only take effect AFTER a new deployment.**

Simply adding them in Vercel settings doesn't update the running app - you need to trigger a new deployment.

---

## ✅ SOLUTION: Force Redeploy

### Option 1: Redeploy from Vercel Dashboard (Fastest)

1. Go to: https://vercel.com/francisco-blockstrands-projects/crowd-conscious-platform
2. Click on the **"Deployments"** tab
3. Find the latest deployment
4. Click the **"⋯"** menu → **"Redeploy"**
5. Confirm the redeploy
6. Wait 2-3 minutes for deployment to complete

### Option 2: Push a Small Change (Recommended)

This ensures the environment variables are picked up:

```bash
# Make a small change to trigger deployment
echo "# Trigger redeploy for Stripe env vars" >> README.md

# Commit and push
git add README.md
git commit -m "chore: Trigger redeploy to load Stripe environment variables"
git push origin main
```

---

## ⚠️ IMPORTANT: Check All Required Env Vars

Make sure you have ALL of these in Vercel:

### Required for Sponsorship to Work:

- ✅ `STRIPE_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
- ✅ `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)

### Also Check These:

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `RESEND_API_KEY`
- ✅ `NEXT_PUBLIC_APP_URL` (should be `https://crowdconscious.app`)

---

## 🧪 How to Test After Redeploy

1. Wait for deployment to complete (check Vercel dashboard)
2. Go to your app: https://crowdconscious.app
3. Navigate to a need with funding goal
4. Click "💝 Sponsor This Need"
5. Fill out the form
6. Click "Sponsor $1,000 MXN"
7. Should redirect to Stripe checkout (not show error)

---

## 🔍 Still Not Working?

### Check Environment Variable Scope

In Vercel, make sure the variables are set for:

- ✅ **Production** environment
- ✅ **Preview** environment (optional)
- ✅ **Development** environment (optional)

### Verify the Key Format

- `STRIPE_SECRET_KEY` should start with `sk_test_` (test mode) or `sk_live_` (production)
- If it starts with anything else, it's the wrong key

### Check Vercel Logs

1. Go to Vercel → Deployments → Latest deployment
2. Click "View Function Logs"
3. Look for any Stripe-related errors

---

## 📝 Quick Checklist

- [ ] Environment variables added in Vercel
- [ ] Triggered a new deployment (Option 1 or 2 above)
- [ ] Deployment completed successfully
- [ ] Tested sponsorship flow
- [ ] Stripe checkout page loads

---

## 🎯 Expected Result

After redeploying, when you click "Sponsor Now":

1. ✅ Form submits successfully
2. ✅ Redirects to Stripe checkout page
3. ✅ Can enter test card: `4242 4242 4242 4242`
4. ✅ After payment, redirects to success page
5. ✅ Sponsorship shows as "paid" in database

---

**Bottom Line**: Just click "Redeploy" in Vercel and wait 2-3 minutes. The Stripe keys are there, they just need a fresh deployment to load! 🚀
