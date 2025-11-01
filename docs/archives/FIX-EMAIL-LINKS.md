# Fix Email Links - Point to crowdconscious.app

## Problem

Email links are going to `localhost:3000` instead of `crowdconscious.app`

## Root Cause

`NEXT_PUBLIC_APP_URL` environment variable not set in Vercel

## Fix

### Step 1: Add to Vercel

1. Go to **Vercel Dashboard** → Your Project
2. Go to **Settings** → **Environment Variables**
3. Click **Add New**
4. Add:
   - **Key**: `NEXT_PUBLIC_APP_URL`
   - **Value**: `https://crowdconscious.app`
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**

### Step 2: Redeploy

After adding the variable, trigger a new deployment:

- Go to **Deployments** tab
- Click **•••** on latest deployment
- Click **Redeploy**

OR just push a new commit (easier):

```bash
git commit --allow-empty -m "chore: trigger redeploy for new env var"
git push
```

### Step 3: Test

After deployment completes:

1. Sign up with a new test email
2. Check the welcome email
3. Links should now go to `https://crowdconscious.app` ✅

## Local Development

Already added to `.env.local`:

```
NEXT_PUBLIC_APP_URL=https://crowdconscious.app
```

This ensures local testing also uses the production URL.

## Why This Works

The `lib/resend.ts` file uses:

```typescript
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
```

Once the env var is set, all email links will use `crowdconscious.app` instead of `localhost`.
