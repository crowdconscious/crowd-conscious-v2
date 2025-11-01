# Vercel Environment Variables Setup

## Required Environment Variables

For the corporate signup to work, you need to add the following environment variables to your Vercel project:

### 1. SUPABASE_SERVICE_ROLE_KEY

This is the **service role key** (not the anon key) that allows admin operations like creating users.

**How to find it:**

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon in sidebar)
3. Click **API**
4. Scroll down to **Project API keys**
5. Copy the **`service_role`** key (NOT the `anon` key)

⚠️ **IMPORTANT:** This is a secret key - never expose it in client-side code!

---

## How to Add to Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Select your project (`crowd-conscious-v2`)
3. Go to **Settings** → **Environment Variables**
4. Add the following:

| Name                        | Value                                | Environments                     |
| --------------------------- | ------------------------------------ | -------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` (your service role key) | Production, Preview, Development |

5. Click **Save**
6. **Redeploy** your project for changes to take effect

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login
vercel login

# Set environment variable
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Paste your service role key when prompted
# Select: Production, Preview, Development (all)

# Redeploy
vercel --prod
```

---

## Verify It Works

After adding the environment variable and redeploying:

1. Go to `https://crowdconscious.app/corporate/signup`
2. Fill out the form
3. Click "Continuar al Pago"
4. If it works, you'll be redirected to the dashboard!

---

## All Environment Variables (Reference)

Your Vercel project should have these environment variables:

```bash
# Supabase (Public - OK to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (anon key)

# Supabase (Secret - DO NOT expose)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service role key) ← ADD THIS!

# Stripe (if/when you add payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (if/when you add email)
RESEND_API_KEY=re_...
```

---

## Troubleshooting

### "Missing Supabase environment variables" error

- **Cause:** `SUPABASE_SERVICE_ROLE_KEY` is not set in Vercel
- **Fix:** Follow the steps above to add it

### "Invalid API key" error

- **Cause:** You might have copied the wrong key (anon instead of service_role)
- **Fix:** Double-check you copied the **service_role** key from Supabase

### Changes not taking effect

- **Cause:** Need to redeploy after adding environment variables
- **Fix:** Go to Vercel → Deployments → click "..." on latest → Redeploy

---

## Security Notes

- ✅ `NEXT_PUBLIC_*` variables are safe to expose (client-side)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` is a SECRET - never commit to git
- ⚠️ Service role key bypasses RLS - only use in API routes (server-side)
- ✅ Our code only uses it in `/app/api/` routes (server-side only)

---

**Once you add the environment variable and redeploy, the corporate signup will work!** 🚀
