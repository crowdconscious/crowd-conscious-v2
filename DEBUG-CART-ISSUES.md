# 🐛 Debug Cart Issues - Step by Step

## Current Errors in Console

1. ❌ **404 (Not Found)** - `POST https://www.crowdconscious.app/api/cart/add`
2. ❌ **500 (Internal Server Error)** - `GET /api/cart:1`

---

## 🔍 Step 1: Verify SQL Migration Ran Successfully

Run this in **Supabase SQL Editor**:

```sql
-- Check if cart_items table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'cart_items'
) as table_exists;
```

**Expected Result:** `table_exists: true`

**If FALSE:** The SQL didn't run. Go back and run `create-cart-items-simple.sql` again.

---

## 🔍 Step 2: Check Your User Role

Run this in **Supabase SQL Editor**:

```sql
SELECT 
  id,
  email,
  corporate_role,
  corporate_account_id,
  user_type
FROM profiles 
WHERE id = auth.uid();
```

**Expected Result:**
- `corporate_role`: `'admin'`
- `corporate_account_id`: Should have a UUID value (not NULL)

**If NULL or not 'admin':** Run this fix:

```sql
-- First, check if you have a corporate account
SELECT id, company_name FROM corporate_accounts LIMIT 5;

-- If no corporate accounts exist, create one:
INSERT INTO corporate_accounts (company_name, industry, company_size)
VALUES ('Test Company', 'Technology', '50-200')
RETURNING id;

-- Then update your profile (replace YOUR_CORPORATE_ACCOUNT_ID):
UPDATE profiles 
SET 
  corporate_role = 'admin',
  corporate_account_id = 'YOUR_CORPORATE_ACCOUNT_ID'
WHERE id = auth.uid();
```

---

## 🔍 Step 3: Test Cart API Directly

### Test 1: Check if you're logged in

Open browser console on crowdconscious.app and run:

```javascript
// Check auth status
fetch('/api/cart')
  .then(r => r.json())
  .then(d => console.log('Cart API Response:', d))
  .catch(e => console.error('Cart API Error:', e))
```

**Possible Results:**

1. **401 Unauthorized** → You're not logged in
   - **Fix:** Log in first

2. **403 Forbidden** → You're not a corporate admin
   - **Fix:** Run Step 2 SQL to update your role

3. **500 Internal Server Error** → Database issue
   - **Fix:** Check Supabase logs (see Step 4)

4. **200 OK with empty cart** → ✅ Working!

### Test 2: Try adding to cart manually

```javascript
// Get module ID from current page URL
const moduleId = window.location.pathname.split('/').pop()

// Try adding to cart
fetch('/api/cart/add', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    moduleId: moduleId,
    employeeCount: 50
  })
})
  .then(r => r.json())
  .then(d => console.log('Add to Cart Response:', d))
  .catch(e => console.error('Add to Cart Error:', e))
```

---

## 🔍 Step 4: Check Supabase Logs

1. Go to **Supabase Dashboard**
2. Click **Logs** in the left sidebar
3. Select **Postgres Logs**
4. Look for recent errors related to `cart_items`

**Common Errors:**

### Error: "permission denied for table cart_items"
**Cause:** RLS policies not created  
**Fix:** Re-run the SQL migration (all of it)

### Error: "relation cart_items does not exist"
**Cause:** Table wasn't created  
**Fix:** Re-run the SQL migration

### Error: "null value in column corporate_account_id"
**Cause:** Your profile doesn't have a corporate_account_id  
**Fix:** Run Step 2 SQL

---

## 🔍 Step 5: Check Vercel Deployment

### Option A: Check Vercel Dashboard

1. Go to **Vercel Dashboard**
2. Select your project
3. Click on the latest deployment
4. Check **Build Logs** for errors
5. Check **Function Logs** for runtime errors

### Option B: Force Redeploy

Sometimes Vercel caches old code. Force a fresh deploy:

```bash
# In your terminal
cd /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
git commit --allow-empty -m "Force redeploy"
git push
```

---

## 🔍 Step 6: Check API Routes Exist

Run this in your terminal:

```bash
cd /Users/franciscoblockstrand/Desktop/crowd-conscious-v2
ls -la app/api/cart/
```

**Expected Output:**
```
add/
checkout/
clear/
remove/
route.ts
update/
```

**If missing:** The files weren't committed. Check git status.

---

## 🔍 Step 7: Test with cURL (Bypass Browser)

```bash
# Replace YOUR_MODULE_ID with actual module ID
curl -X POST https://crowdconscious.app/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"moduleId":"YOUR_MODULE_ID","employeeCount":50}' \
  -v
```

**Expected:** 401 (because no auth cookie)  
**If 404:** API route doesn't exist on server

---

## 🔍 Step 8: Check Environment Variables

In **Vercel Dashboard** → **Settings** → **Environment Variables**:

Required variables:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `STRIPE_WEBHOOK_SECRET`

**If any are missing:** Add them and redeploy.

---

## 🔍 Step 9: Clear Browser Cache

Sometimes the browser caches API responses:

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**
4. Try adding to cart again

---

## 🔍 Step 10: Check for CORS Issues

The console shows it's trying to POST to `https://www.crowdconscious.app` (with www).

**Potential Issue:** You're on `www.` but API expects non-www or vice versa.

**Fix:** Add this to `next.config.ts`:

```typescript
async redirects() {
  return [
    {
      source: '/:path*',
      has: [
        {
          type: 'host',
          value: 'www.crowdconscious.app',
        },
      ],
      destination: 'https://crowdconscious.app/:path*',
      permanent: true,
    },
  ]
},
```

---

## ✅ Quick Checklist

Run through this checklist:

- [ ] SQL migration ran successfully (Step 1)
- [ ] I'm logged in to the app
- [ ] My profile has `corporate_role = 'admin'` (Step 2)
- [ ] My profile has a `corporate_account_id` (Step 2)
- [ ] `cart_items` table exists in Supabase
- [ ] RLS policies exist on `cart_items` table
- [ ] API routes exist in `app/api/cart/` directory
- [ ] Latest code is deployed to Vercel
- [ ] Environment variables are set in Vercel
- [ ] I cleared my browser cache

---

## 🚨 If Nothing Works

### Last Resort: Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Deployments** → Click latest deployment
4. Click **Functions** tab
5. Look for `/api/cart/add` and `/api/cart`
6. Check if they exist and have errors

### Nuclear Option: Complete Rebuild

```bash
cd /Users/franciscoblockstrand/Desktop/crowd-conscious-v2

# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Test locally
npm run dev

# Visit http://localhost:3000/marketplace
# Try adding to cart locally
# If it works locally but not on Vercel, it's a deployment issue
```

---

## 📞 Report Back

After running through these steps, report back with:

1. **Result of Step 1** (table exists?)
2. **Result of Step 2** (your role and corporate_account_id)
3. **Result of Step 3** (what does the API return?)
4. **Any error messages from Supabase logs**
5. **Any error messages from Vercel logs**

This will help me pinpoint the exact issue! 🎯

