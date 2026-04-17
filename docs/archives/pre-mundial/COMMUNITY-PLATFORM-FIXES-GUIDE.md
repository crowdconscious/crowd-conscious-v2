# Community Platform Fixes Guide

**Date**: November 2, 2025  
**Status**: Deployment Successful ✅ - Minor Issues to Fix

---

## 🎉 **What's Working**

✅ Deployment successful  
✅ TypeScript build passing  
✅ Join Community button working  
✅ Member badge showing correctly  
✅ Beautiful new UI for communities  
✅ Core Values selector working  
✅ Smart home redirect working  

---

## 🔧 **Three Issues to Fix**

### **Issue 1: Member Count Not Updating** 

**Symptom**: After joining a community, the member count stays at "1" instead of updating to "2"

**Root Cause**: Database trigger might not be active or member_count column is stale

**Solution**:

1. **Run the SQL migration** in Supabase SQL Editor:
   ```bash
   sql-migrations/fix-community-member-count-and-storage.sql
   ```

2. **What it does**:
   - Recreates the `update_member_count()` trigger function
   - Ensures trigger fires on INSERT/DELETE to `community_members`
   - Recalculates all member counts to match actual data
   - Adds indexes for performance

3. **Verify it worked**:
   - The SQL script includes a verification query at the end
   - Should show "✅ CORRECT" for all communities
   - If "❌ MISMATCH", run the UPDATE query again

4. **Test**:
   - Leave and rejoin a community
   - Member count should update immediately after page refresh

---

### **Issue 2: Profile Picture Upload Not Working**

**Symptom**: Clicking "Upload New" doesn't do anything or shows an error

**Root Causes** (Multiple Possible):

1. **Storage buckets don't exist**
2. **RLS policies are blocking uploads**
3. **Bucket is not public**

**Solution**:

#### **Step 1: Create Storage Buckets**

Go to Supabase Dashboard → **Storage** → **New Bucket**

Create these buckets:

**Bucket 1: `profile-pictures`**
- Name: `profile-pictures`
- Public bucket: ✅ YES
- File size limit: 5242880 (5MB)
- Allowed MIME types: `image/jpeg,image/png,image/webp`

**Bucket 2: `brand-logos`**
- Name: `brand-logos`
- Public bucket: ✅ YES
- File size limit: 5242880 (5MB)
- Allowed MIME types: `image/jpeg,image/png,image/webp,image/svg+xml`

#### **Step 2: Set RLS Policies**

For **each bucket**, go to Storage → [bucket name] → **Policies** → **New Policy**

**Policy 1: Allow uploads**
```sql
-- Policy name: Allow users to upload own files
-- Operation: INSERT
-- Target roles: authenticated

bucket_id = 'profile-pictures' 
AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 2: Allow public read**
```sql
-- Policy name: Allow public access
-- Operation: SELECT
-- Target roles: public

bucket_id = 'profile-pictures'
```

**Policy 3: Allow updates**
```sql
-- Policy name: Allow users to update own files
-- Operation: UPDATE
-- Target roles: authenticated

bucket_id = 'profile-pictures' 
AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 4: Allow deletes**
```sql
-- Policy name: Allow users to delete own files
-- Operation: DELETE
-- Target roles: authenticated

bucket_id = 'profile-pictures' 
AND auth.uid()::text = (storage.foldername(name))[1]
```

Repeat all 4 policies for `brand-logos` bucket (just change bucket name).

#### **Step 3: Test Upload**

1. Go to `/settings`
2. Click "Upload New" under Profile Picture
3. Select an image (JPG, PNG, or WebP, under 5MB)
4. Should see success message: "✅ Profile picture updated successfully!"
5. Image should appear in navigation bar

#### **Troubleshooting**:

If upload still fails, check browser console for errors:

**Error**: `"new row violates row-level security policy"`
- **Fix**: RLS policies are missing or incorrect. Re-add policies from Step 2.

**Error**: `"Bucket not found"`
- **Fix**: Bucket doesn't exist. Create it in Step 1.

**Error**: `"File size too large"`
- **Fix**: Image is over 5MB. Resize or compress the image.

---

### **Issue 3: Stripe Connect Not Working**

**Symptom**: Clicking "Connect Stripe Account" button does nothing or shows error

**Root Causes** (Multiple Possible):

1. **Stripe API keys not configured**
2. **Stripe Connect not enabled in Stripe Dashboard**
3. **Missing database columns**
4. **API route error**

**Solution**:

#### **Step 1: Verify Stripe Environment Variables**

In Vercel Dashboard → **Settings** → **Environment Variables**, ensure these exist:

```env
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
```

If missing, add them and **redeploy**.

#### **Step 2: Enable Stripe Connect**

Go to Stripe Dashboard → **Connect** → **Settings**

1. **Enable Express accounts**: ✅ ON
2. **Set branding**:
   - Business name: Crowd Conscious
   - Icon: Upload logo
   - Brand color: #14b8a6 (teal)
3. **Required capabilities**:
   - ✅ Card payments
   - ✅ Transfers
4. **Redirect URLs** (optional but recommended):
   - Refresh URL: `https://crowdconscious.app/dashboard/payments/refresh`
   - Return URL: `https://crowdconscious.app/dashboard/payments/success`

#### **Step 3: Run SQL Migration**

The SQL migration script (`fix-community-member-count-and-storage.sql`) already includes:

```sql
-- Adds these columns if missing:
ALTER TABLE profiles ADD COLUMN stripe_connect_id TEXT;
ALTER TABLE profiles ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN stripe_charges_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN stripe_payouts_enabled BOOLEAN DEFAULT FALSE;
```

Run it if you haven't already.

#### **Step 4: Test Stripe Connect**

1. Go to `/settings` (scroll down to Payment Settings)
2. Click "Connect Stripe Account"
3. Should redirect to Stripe onboarding
4. Complete the onboarding (add bank account details)
5. After completion, should redirect back and show "✅ Connected"

#### **Troubleshooting**:

**Error**: `"Unauthorized"` in console
- **Fix**: User not logged in. Log in and try again.

**Error**: `"Failed to fetch user profile"`
- **Fix**: Database error. Check Supabase logs.

**Error**: `"Stripe Connect not enabled"`
- **Fix**: Go to Stripe Dashboard → Connect → Enable Express accounts.

**Error**: Button does nothing (no error)
- **Fix**: Check browser console. Likely missing Stripe API key.
- **Fix**: Verify `STRIPE_SECRET_KEY` in Vercel env vars and redeploy.

**Button shows "Continue Onboarding"** (but onboarding is complete)
- **Fix**: Status sync issue. The API route should auto-update status.
- **Manual fix**: Go to `/api/stripe/connect/onboard` (GET request) to refresh status.

---

## 📊 **Verification Checklist**

After fixing all issues, verify:

- [ ] Member count updates when users join/leave communities
- [ ] Profile picture uploads successfully to Supabase Storage
- [ ] Profile picture displays in navigation bar after upload
- [ ] Stripe Connect button redirects to Stripe onboarding
- [ ] After Stripe onboarding, status shows "Connected" in settings
- [ ] Communities dashboard looks beautiful with new UI ✨
- [ ] Core Values selector works with predefined values
- [ ] Smart home redirect sends users to correct dashboard
- [ ] Join community button shows success message
- [ ] Member badge appears after joining

---

## 🚀 **Next Steps After Fixes**

Once all three issues are resolved:

1. **Test the complete flow**:
   - Create a new user account
   - Join a community
   - Upload profile picture
   - Connect Stripe account
   - Verify all works end-to-end

2. **Continue with remaining tasks** from `COMPREHENSIVE-PLATFORM-GUIDE.md`:
   - [ ] Admin wallet & treasury overview tabs
   - [ ] Move module builder to community admin panel
   - [ ] Show module earnings in community dashboard

3. **Performance optimization**:
   - Code splitting
   - Image optimization
   - Caching strategy

---

## 💡 **Quick Debugging Tips**

### **Check if trigger is active:**
```sql
SELECT * FROM pg_trigger WHERE tgname = 'member_count_trigger';
```

### **Manually update member counts:**
```sql
UPDATE communities 
SET member_count = (
    SELECT COUNT(*) 
    FROM community_members 
    WHERE community_id = communities.id
);
```

### **Check storage bucket policies:**
```sql
SELECT * FROM storage.objects WHERE bucket_id = 'profile-pictures';
```

### **Check Stripe Connect status:**
```sql
SELECT 
    id, 
    email, 
    stripe_connect_id, 
    stripe_onboarding_complete 
FROM profiles 
WHERE stripe_connect_id IS NOT NULL;
```

---

## 📞 **Need Help?**

If issues persist:

1. **Check Supabase logs**: Dashboard → Logs → API Logs
2. **Check Vercel logs**: Project → Deployments → [latest] → View Logs
3. **Check browser console**: F12 → Console tab
4. **Check Stripe logs**: Dashboard → Developers → Events

Common error patterns:

- `"RLS policy violation"` → Fix storage bucket policies
- `"Bucket not found"` → Create storage bucket
- `"Unauthorized"` → User not logged in or session expired
- `"Failed to fetch"` → Network error or API route issue
- `"Stripe error"` → Check Stripe API keys and Connect settings

---

**Document Version**: 1.0  
**Last Updated**: November 2, 2025  
**Status**: Ready to Fix 🔧

