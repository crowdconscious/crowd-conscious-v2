# 🔍 STRIPE DEBUG CHECKLIST - Production Issue

## Current Situation

- ✅ Testing on **production** (crowdconscious.app)
- ✅ Latest deployment is complete
- ❌ Still showing "STRIPE_SECRET_KEY is not set"

## 🚨 Most Likely Causes

### 1. Environment Variable Name Mismatch

**Check in Vercel**: Is it named EXACTLY `STRIPE_SECRET_KEY`?

Common mistakes:

- ❌ `STRIPE_SECRET` (missing \_KEY)
- ❌ `STRIPE_API_KEY` (wrong name)
- ❌ `stripe_secret_key` (lowercase)
- ✅ `STRIPE_SECRET_KEY` (correct)

### 2. Environment Variable Not Set for Production

In Vercel settings, the variable must be checked for:

- ✅ **Production** ← CRITICAL
- ⚪ Preview (optional)
- ⚪ Development (optional)

### 3. Deployment Didn't Pick Up Changes

Sometimes Vercel caches the old build.

---

## 🎯 STEP-BY-STEP FIX

### Step 1: Verify Exact Variable Names in Vercel

Go to: https://vercel.com/francisco-blockstrands-projects/crowd-conscious-platform/settings/environment-variables

**Required variables** (copy these EXACTLY):

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

**Screenshot what you see and compare with above ↑**

### Step 2: Check Environment Scope

For EACH variable, make sure **Production** is checked:

- Click on the variable
- Look for checkboxes: Production / Preview / Development
- **Production MUST be checked** ✅

### Step 3: Force a Clean Redeploy

Sometimes Vercel needs a hard refresh:

1. Go to Vercel dashboard
2. Click **"Deployments"** tab
3. Find the **latest deployment**
4. Click **"⋯"** (three dots)
5. Click **"Redeploy"**
6. **IMPORTANT**: Check ✅ "Use existing Build Cache" = **OFF**
7. Click **"Redeploy"**

This forces a completely fresh build.

### Step 4: Check Vercel Function Logs

While the error is happening:

1. Go to Vercel dashboard
2. Click on latest deployment
3. Click **"Functions"** tab
4. Find `/api/create-checkout`
5. Click to see logs
6. Look for the actual error message

**Share the logs with me** - they'll show the real issue.

---

## 🔧 Alternative: Create New Stripe Keys

If nothing works, let's create fresh keys:

### Get New Stripe Test Keys:

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click **"Create secret key"**
3. Name it: `crowd-conscious-production`
4. Copy the key (starts with `sk_test_`)
5. Also copy the **Publishable key** (starts with `pk_test_`)

### Add to Vercel:

1. Delete old `STRIPE_SECRET_KEY` in Vercel
2. Add new one with the fresh key
3. Make sure **Production** is checked ✅
4. Click **Save**
5. Redeploy (without cache)

---

## 🐛 Debug: Add Logging

Let me add better error logging to see what's actually happening:

### Option A: Check if variable exists at runtime

Add this to your API route temporarily to debug.

### Option B: Use Vercel's built-in env var checker

Run this in Vercel CLI:

```bash
vercel env ls
```

---

## 📋 Quick Verification Checklist

Go through this list and tell me which ones are ✅ or ❌:

### In Vercel Dashboard:

- [ ] Variable is named exactly `STRIPE_SECRET_KEY` (case-sensitive)
- [ ] Variable value starts with `sk_test_` or `sk_live_`
- [ ] **Production** environment is checked ✅
- [ ] Variable was saved (not just typed)
- [ ] Latest deployment shows "Ready" status
- [ ] Deployment happened AFTER adding the variable

### In Browser:

- [ ] Testing on https://crowdconscious.app (not localhost)
- [ ] Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- [ ] Browser cache cleared
- [ ] Tried in incognito/private window

### Stripe Dashboard:

- [ ] Using **Test mode** keys (toggle in top right)
- [ ] Keys are from https://dashboard.stripe.com/test/apikeys
- [ ] Account is active (not restricted)

---

## 🎬 What to Do Right Now

### 1. Take Screenshots

Screenshot your Vercel environment variables page and share with me.

### 2. Check Vercel Function Logs

Go to the function logs and copy/paste any errors you see.

### 3. Try This Quick Test

Open browser console (F12) when you click "Sponsor Now" and share any errors.

### 4. Verify Deployment

Go to: https://vercel.com/francisco-blockstrands-projects/crowd-conscious-platform

- What's the status of the latest deployment?
- When was it deployed?
- Does it show any errors?

---

## 🔥 Nuclear Option: Complete Reset

If nothing else works:

```bash
# 1. Remove all Stripe env vars from Vercel
# 2. Create completely new Stripe keys
# 3. Add them fresh to Vercel
# 4. Redeploy without cache
# 5. Wait 5 minutes
# 6. Test again
```

---

## 💡 Most Common Solution

**90% of the time**, it's one of these:

1. Variable name has a typo
2. Production checkbox not checked
3. Need to redeploy without cache
4. Stripe key is invalid/expired

---

**Next Step**: Please share:

1. Screenshot of your Vercel environment variables
2. Exact error message from browser console (F12)
3. Status of latest Vercel deployment

This will help me pinpoint the exact issue! 🎯
