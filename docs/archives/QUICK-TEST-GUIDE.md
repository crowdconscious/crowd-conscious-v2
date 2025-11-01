# 🧪 Quick Test Guide - Authentication & Stripe Fixes

## **Fast Track Testing (5 minutes)**

---

## ✅ **Test 1: Login Flow (2 min)**

### **Steps:**

1. Open your app in a new incognito window
2. Go to `/login`
3. Open browser DevTools console (F12)
4. Enter credentials and click "Sign In"

### **Expected Console Output:**

```
🔐 Starting sign in process...
📧 Email: your@email.com
📦 Sign in response: { hasUser: true, hasError: false }
✅ Sign in successful, user: xxx-xxx-xxx
✅ Session established: true
🔄 Redirecting to dashboard...
```

### **Expected Result:**

- ✅ Page reloads (hard navigation)
- ✅ You see the dashboard
- ✅ No infinite redirect loops

### **If it fails:**

- ❌ Check console for errors
- ❌ Check if NEXT_PUBLIC_SUPABASE_URL is set
- ❌ Clear cookies and try again

---

## ✅ **Test 2: Signup Flow (2 min)**

### **Steps:**

1. Open a new incognito window
2. Go to `/signup`
3. Open DevTools console
4. Fill form and click "Create Account"

### **Expected Console Output:**

```
🚀 Starting signup process...
📧 Email: test@example.com
👤 Full name: Test User
📦 Signup response: { hasUser: true, hasSession: true, hasError: false }
✅ User created in auth.users: xxx-xxx-xxx
```

### **Expected Result:**

- ✅ Success message shown
- ✅ Check email for confirmation link
- ✅ Click link → redirects to dashboard

---

## ✅ **Test 3: Stripe Webhook (1 min)**

### **Local Testing:**

```bash
# Terminal 1: Run your dev server
npm run dev

# Terminal 2: Forward Stripe webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 3: Trigger test event
stripe trigger checkout.session.completed
```

### **Expected Server Console Output:**

```
🔔 Stripe webhook received
🔍 Environment check: { hasWebhookSecret: true, ... }
🔐 Verifying webhook signature...
✅ Webhook signature verified successfully
💳 Checkout session completed
✅ Webhook response sent
```

### **Expected Result:**

- ✅ No signature errors
- ✅ Event processed successfully
- ✅ Returns `{ received: true }`

---

## ✅ **Test 4: Share Button (30 sec)**

### **Steps:**

1. Go to any content page (post/poll/event)
2. Click the share button
3. Copy the link
4. Check the URL

### **Expected Result:**

- ✅ URL should use your domain (not hardcoded)
- ✅ Should work in dev: `http://localhost:3000/...`
- ✅ Should work in prod: `https://your-domain.vercel.app/...`

---

## 🚨 **Quick Troubleshooting**

### **Login Stuck:**

```bash
# Clear browser data
1. Clear cookies
2. Clear localStorage
3. Try incognito mode
```

### **Stripe Webhook Fails:**

```bash
# Check webhook secret
echo $STRIPE_WEBHOOK_SECRET
# Should start with: whsec_

# Verify in code
grep -r "STRIPE_WEBHOOK_SECRET" .env*
```

### **Share Button Wrong URL:**

```bash
# Check env var
echo $NEXT_PUBLIC_APP_URL
# Should be: https://your-domain.vercel.app
```

---

## 📊 **Status Check**

Run this checklist:

- [ ] Can sign up new users
- [ ] Can log in existing users
- [ ] Email confirmation works
- [ ] Protected routes redirect to login
- [ ] Stripe webhook receives events
- [ ] Share buttons use correct URLs
- [ ] No console errors

If all checked ✅ - **You're good to deploy!**

---

## 🚀 **Deploy Now**

```bash
# 1. Commit changes
git add .
git commit -m "fix: Stripe webhook logging and auth flow navigation"

# 2. Push to main
git push origin main

# 3. Vercel will auto-deploy

# 4. Check deployment logs
# Go to: Vercel Dashboard → Your Project → Logs
```

---

## 🎯 **Post-Deployment Test**

1. Visit your production URL
2. Test login: `/login`
3. Check Vercel logs for:
   - "Sign in successful"
   - "AppLayout: User authenticated"
4. Test a payment to verify webhook
5. Check Stripe Dashboard → Webhooks → Recent deliveries

---

## ✅ **Success!**

If all tests pass, you've successfully fixed:

1. ✅ Stripe webhook with comprehensive logging
2. ✅ ShareButton hardcoded URL issue
3. ✅ Login/signup blocking issue
4. ✅ Authentication flow with proper navigation

**Your app is now production-ready! 🎉**
