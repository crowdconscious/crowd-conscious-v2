# 🚨 Critical Fixes Required - Action Plan

## Issues Identified:

1. ❌ Comments asking logged-in users to sign in
2. ❌ Brand portal not loading (missing database tables)
3. ❌ User/Brand toggle not working properly  
4. ⚠️ Stripe not tested
5. ❌ Email system not working (no emails sent)

---

## 🔧 IMMEDIATE FIXES

### Fix 1: Comments Authentication (FIXED in code)
**File**: `app/components/CommentsSection.tsx`
**Problem**: Relying on server-side user prop that wasn't reliable
**Solution**: Always use client-side auth check directly

### Fix 2: Brand System Database Tables (NEEDS SQL)
**Problem**: Brand dashboard queries tables that don't exist
**Required Tables**:
- `brand_preferences`
- `sponsorship_applications`  
- `brand_community_relationships`

**Action**: Run this SQL migration in Supabase

### Fix 3: Email System (NEEDS CONFIGURATION)
**Problem**: No email service configured
**Required**:
- Set `RESEND_API_KEY` in Vercel environment variables
- Verify domain in Resend dashboard

### Fix 4: Stripe (NEEDS TESTING)
**Problem**: Not tested
**Required**:
- Verify `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are set
- Test payment flow

---

## 📋 SQL TO RUN IN SUPABASE

Run these in order in your Supabase SQL Editor:

### Step 1: Create Brand System Tables

```sql
-- Run this first: sql-migrations/create-brand-system.sql
-- Then: sql-migrations/enable-realtime.sql
```

### Step 2: Enable RLS on New Tables

```sql
-- Enable RLS
ALTER TABLE brand_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_community_relationships ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Brands can read own preferences" ON brand_preferences
  FOR SELECT USING (auth.uid() = brand_id);

CREATE POLICY "Brands can update own preferences" ON brand_preferences
  FOR UPDATE USING (auth.uid() = brand_id);

CREATE POLICY "Anyone can view brand relationships" ON brand_community_relationships
  FOR SELECT USING (true);
```

---

## 🔑 ENVIRONMENT VARIABLES TO SET IN VERCEL

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

### Required for Emails:
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

### Required for Payments:
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

### Already Set (verify):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
NEXT_PUBLIC_APP_URL=https://www.crowdconscious.app
```

---

## 🧪 TESTING CHECKLIST

After fixes are deployed:

### Test Comments:
- [ ] Open content page while logged in
- [ ] Verify you can see comments without signing in
- [ ] Post a comment
- [ ] Verify it appears

### Test Brand Portal:
- [ ] Toggle to Brand mode in header
- [ ] Verify brand dashboard loads
- [ ] Check for opportunities list
- [ ] Test switching back to User mode

### Test Emails:
- [ ] Visit `/admin/email-test`
- [ ] Send test welcome email
- [ ] Check inbox (including spam)
- [ ] Verify email received

### Test Stripe:
- [ ] Find a need requiring funding
- [ ] Click "Sponsor" button
- [ ] Verify Stripe form loads
- [ ] Test with test card: 4242 4242 4242 4242

---

## 📧 EMAIL SETUP STEPS

### 1. Get Resend API Key:
1. Go to https://resend.com
2. Sign up/Login
3. Get your API key
4. Add to Vercel env vars

### 2. Verify Domain (Optional for production):
1. In Resend dashboard, add your domain
2. Add DNS records they provide
3. Wait for verification

### 3. Test:
```bash
curl -X POST https://www.crowdconscious.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom",
    "email": "your-email@gmail.com"
  }'
```

---

## 🚀 DEPLOYMENT ORDER

1. ✅ Push code fixes (comments auth) - DONE
2. ⏳ Run SQL migrations in Supabase
3. ⏳ Set environment variables in Vercel
4. ⏳ Test each feature
5. ⏳ Enable email triggers (optional)

---

## 🔥 QUICK WINS

### If you want emails working FAST:
1. Get Resend API key (5 min)
2. Add to Vercel (1 min)
3. Redeploy app (automatic)
4. Test at `/admin/email-test` (1 min)

### If you want brand portal working:
1. Open Supabase SQL Editor
2. Copy contents of `sql-migrations/create-brand-system.sql`
3. Paste and run (30 sec)
4. Refresh brand dashboard

---

## 📝 NOTES

- Comments fix is already in code, will work on next deploy
- Brand portal fix requires running SQL migration
- Email system requires Resend API key
- Stripe requires API keys and testing
- All fixes are independent and can be done in any order

---

## 🆘 IF SOMETHING STILL DOESN'T WORK

1. Check browser console for errors
2. Check Vercel function logs
3. Check Supabase logs
4. Visit `/api/test-integrations` to see what's configured

---

**Next Step**: 
1. Run the SQL migration for brand tables
2. Set Resend API key in Vercel
3. Redeploy and test!

