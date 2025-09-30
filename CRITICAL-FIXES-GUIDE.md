# 🚨 CRITICAL FIXES GUIDE

## **IMMEDIATE ACTIONS REQUIRED**

### **1. FIX RLS POLICIES (5 minutes)**

**Problem:** Only founders can interact with community content due to restrictive RLS policies.

**Solution:** Run the comprehensive RLS fix in your Supabase SQL editor:

```sql
-- Copy and paste the entire contents of:
-- sql-migrations/fix-rls-policies-comprehensive.sql
```

**What this fixes:**

- ✅ Event registration for all authenticated users
- ✅ Poll voting for all authenticated users
- ✅ Comments for all authenticated users
- ✅ Community content viewing for everyone
- ✅ Community joining for authenticated users

---

### **2. CHECK CURRENT POLICIES FIRST (Optional)**

If you want to see what's currently broken, run this first:

```sql
-- Copy and paste the entire contents of:
-- sql-migrations/check-current-rls-policies.sql
```

---

### **3. TEST EMAIL SYSTEM (2 minutes)**

**Problem:** Email system not working properly.

**Debug Steps:**

1. **Check API Status:**

   ```
   Visit: https://your-domain.vercel.app/api/debug-email
   ```

2. **Test Email Send:**
   ```javascript
   // Browser console:
   fetch("/api/debug-email", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ email: "your-email@gmail.com" }),
   })
     .then((res) => res.json())
     .then(console.log);
   ```

---

### **4. CALENDAR DATA DEBUGGING (1 minute)**

**Problem:** Calendar not showing real data.

**Debug Steps:**

1. **Open Browser Console** when viewing dashboard calendar tab
2. **Look for logs** starting with 🗓️, 👥, 📅, 🔍
3. **Check for errors** in the console

**Expected logs:**

```
🗓️ Fetching calendar events for user: [user-id]
👥 User communities: [array of communities]
📅 Raw event data: [array of events]
🔍 Processing item: [event title] Type: event Data: [event data]
✅ Processed calendar events: X events
```

---

## **VERIFICATION CHECKLIST**

After running the RLS fix, test these:

### **✅ Event Registration Test:**

1. Go to any community event
2. Click "Register"
3. Should work for ANY authenticated user (not just founders)

### **✅ Poll Voting Test:**

1. Go to any community poll
2. Click on a voting option
3. Should work for ANY authenticated user

### **✅ Comments Test:**

1. Go to any community content
2. Try to post a comment
3. Should work for ANY authenticated user

### **✅ Email Test:**

1. Register for an event
2. Check email for confirmation
3. Should receive email within 2 minutes

### **✅ Calendar Test:**

1. Go to Dashboard → Calendar tab
2. Should show events from your communities
3. Should show registered events differently

---

## **EXPECTED RESULTS**

### **Before Fix:**

- ❌ "RLS policy violation" errors
- ❌ Only founders can register/vote/comment
- ❌ Email system not working
- ❌ Calendar showing no data

### **After Fix:**

- ✅ All authenticated users can interact
- ✅ Event registration works for everyone
- ✅ Poll voting works for everyone
- ✅ Comments work for everyone
- ✅ Email confirmations sent
- ✅ Calendar shows real event data

---

## **TROUBLESHOOTING**

### **If RLS Fix Fails:**

1. Check the error message carefully
2. Some policies might already exist with different names
3. You may need to drop policies with different names first

### **If Email Still Doesn't Work:**

1. Check Vercel environment variables
2. Ensure `RESEND_API_KEY` is set correctly
3. Check `/api/debug-email` for detailed error info

### **If Calendar Still Empty:**

1. Check browser console for errors
2. Ensure you're a member of at least one community
3. Ensure communities have events with proper date fields

---

## **FILES CREATED/MODIFIED**

- ✅ `sql-migrations/fix-rls-policies-comprehensive.sql` - Complete RLS fix
- ✅ `sql-migrations/check-current-rls-policies.sql` - Diagnostic queries
- ✅ `app/api/debug-email/route.ts` - Email debugging endpoint
- ✅ `app/api/polls/[id]/vote/route.ts` - Proper voting API
- ✅ `app/components/DashboardCalendar.tsx` - Enhanced with logging

---

**🎯 START WITH THE RLS FIX - That will solve 90% of the interaction issues!**
