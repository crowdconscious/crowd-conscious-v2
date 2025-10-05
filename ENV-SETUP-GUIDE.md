# 🔐 Environment Variables Setup Guide

## 🚨 CRITICAL: Are You Testing Locally or on Production?

### If Testing on **crowdconscious.app** (Production):

✅ Your Vercel env vars are set correctly  
✅ Just wait for deployment to complete  
✅ Clear your browser cache and try again

### If Testing on **localhost:3000** (Local Development):

❌ You need to add Stripe keys to your **local** `.env.local` file  
❌ Vercel env vars don't apply to local development

---

## 📝 Setup Local Environment Variables

### Step 1: Open Your `.env.local` File

```bash
cd /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
nano .env.local
```

### Step 2: Add These Lines

```bash
# Stripe Keys (Get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (should already be there)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Resend (for emails)
RESEND_API_KEY=re_YOUR_KEY_HERE
```

### Step 3: Get Your Stripe Keys

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Copy **Secret key** (starts with `sk_test_`)
3. Copy **Publishable key** (starts with `pk_test_`)
4. For webhook secret, see below

### Step 4: Restart Your Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

---

## 🎯 Quick Fix: Test on Production Instead

**Easiest solution**: Just test on your **live site** instead of localhost!

1. ✅ Your Vercel env vars are already set
2. ✅ Wait for deployment to finish (check Vercel dashboard)
3. ✅ Go to: https://crowdconscious.app
4. ✅ Test sponsorship there

**Why this works**: Production uses Vercel's environment variables, not your local `.env.local`

---

## 🔍 How to Check Which Environment You're On

### Production (Vercel):

- URL: `https://crowdconscious.app`
- Uses: Vercel environment variables ✅
- Your Stripe keys: Already configured ✅

### Local Development:

- URL: `http://localhost:3000`
- Uses: `.env.local` file ❌
- Your Stripe keys: Need to be added manually

---

## ⚡ Quick Commands

### Check if .env.local has Stripe keys:

```bash
cd /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
grep STRIPE .env.local
```

### Add Stripe keys quickly:

```bash
echo "STRIPE_SECRET_KEY=sk_test_YOUR_KEY" >> .env.local
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY" >> .env.local
echo "STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET" >> .env.local
```

### Restart dev server:

```bash
npm run dev
```

---

## 🎯 Recommended Approach

### For Quick Testing (Recommended):

1. **Test on production**: https://crowdconscious.app
2. No local setup needed
3. Your Stripe keys already work there

### For Local Development:

1. Add Stripe keys to `.env.local`
2. Restart dev server
3. Test on `localhost:3000`

---

## 🐛 Still Not Working?

### Check Vercel Deployment Status:

```bash
# Go to: https://vercel.com/francisco-blockstrands-projects/crowd-conscious-platform
# Look for: "Ready" status on latest deployment
```

### Check Browser Console:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors
4. Share them with me

### Check Vercel Function Logs:

1. Go to Vercel dashboard
2. Click on latest deployment
3. Click "Functions" tab
4. Click on `/api/create-checkout`
5. Check logs for errors

---

## 📋 Checklist

**For Production Testing:**

- [ ] Vercel deployment shows "Ready"
- [ ] All env vars visible in Vercel settings
- [ ] Testing on https://crowdconscious.app (not localhost)
- [ ] Browser cache cleared

**For Local Testing:**

- [ ] `.env.local` file exists
- [ ] Stripe keys added to `.env.local`
- [ ] Dev server restarted after adding keys
- [ ] Testing on http://localhost:3000

---

## 🎬 Next Steps

1. **Confirm**: Are you testing on `crowdconscious.app` or `localhost:3000`?
2. **If production**: Check Vercel deployment status
3. **If local**: Add Stripe keys to `.env.local`
4. **Try again**: Test the sponsorship flow

---

**Bottom Line**:

- **Production** = Uses Vercel env vars (already set ✅)
- **Local** = Uses `.env.local` file (needs Stripe keys ❌)

Choose where you want to test and follow the appropriate steps! 🚀
