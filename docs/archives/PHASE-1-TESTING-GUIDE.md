# 🧪 Phase 1 Corporate Features - Testing Guide

## 📋 Overview

This guide will help you test all the corporate features we just built.

---

## 🎯 Step 1: Make Yourself a Corporate Admin

### **Option A: Use SQL (Fastest for Testing)**

1. **Check your current status:**

   ```sql
   -- Open: CHECK-MY-CORPORATE-STATUS.sql
   -- Replace 'YOUR_EMAIL@example.com' with your actual email
   -- Run in Supabase SQL Editor
   ```

2. **Convert to corporate admin:**

   ```sql
   -- Open: MAKE-ME-CORPORATE-ADMIN.sql
   -- Replace 'YOUR_EMAIL@example.com' with your actual email (appears twice)
   -- Run in Supabase SQL Editor
   ```

3. **Sign out and sign back in** to refresh your session

### **Option B: Use Corporate Signup Form (Testing Full Flow)**

1. Go to: `https://crowdconscious.app/signup-corporate`
2. Fill out the corporate signup form with test data
3. Use a **different email** than your main account
4. Complete signup and test as a new corporate user

---

## 🚀 Step 2: Access Corporate Dashboard

### **After running SQL or signing up:**

1. Go to: `https://crowdconscious.app/corporate/dashboard`
2. You should see:
   - Company overview
   - Employee management section
   - Program modules
   - Impact metrics (empty for now)

### **If you're redirected to `/dashboard` instead:**

**Troubleshooting:**

```sql
-- Run this to verify your profile was updated:
SELECT
  email,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'YOUR_EMAIL@example.com';

-- Should show:
-- is_corporate_user: true
-- corporate_role: 'admin'
-- corporate_account_id: (some UUID)
```

**If still not working:**

1. Clear browser cache
2. Sign out completely
3. Sign back in
4. The auth callback should redirect you to `/corporate/dashboard`

---

## 👥 Step 3: Test Employee Invitations

### **From Corporate Dashboard:**

1. Navigate to **"Employees"** tab
2. Fill in the invitation form:
   - **Email:** Use your test email or a real email you can access
   - **Full Name:** Test Employee
   - **Modules:** Select one or more modules
3. Click **"Send Invitation"**

### **Expected Results:**

✅ Success message appears  
✅ Employee appears in "Pending Invitations" list  
✅ Email is sent to the employee's inbox

### **Check the Email:**

📧 Subject: `Invitación a Concientizaciones`  
📧 From: Crowd Conscious  
📧 Contains: Company name, invitation link

---

## 📧 Step 4: Test Employee Acceptance Flow

### **From the invitation email:**

1. Click the **"Aceptar Invitación"** button
2. You should see: `https://crowdconscious.app/employee-portal/accept-invitation?token=...`

### **On the acceptance page:**

1. Email should be pre-filled (read-only)
2. Fill in:
   - Full Name
   - Password (min 6 characters)
   - Confirm Password
3. Click **"Crear Mi Cuenta"**

### **Expected Results:**

✅ Success message: "¡Cuenta Creada! 🎉"  
✅ Auto-redirect to `/login` after 2 seconds  
✅ New profile created with `corporate_role = 'employee'`

---

## 🔐 Step 5: Test Smart Login Redirects

### **Test as Corporate Admin:**

1. Sign out
2. Sign in with your admin email
3. **Should redirect to:** `/corporate/dashboard`

### **Test as Corporate Employee:**

1. Sign out
2. Sign in with the employee email you just created
3. **Should redirect to:** `/employee-portal/dashboard`

### **Test as Regular User:**

1. Sign out
2. Sign in with a non-corporate email
3. **Should redirect to:** `/dashboard` (normal app)

---

## 🎨 Step 6: Test Dashboard Integration

### **From the Main App Dashboard:**

1. Sign in as a **corporate admin**
2. Go to: `https://crowdconscious.app/dashboard`
3. You should see a **purple/teal banner** at the top:
   - Shows your company name
   - Has a button: **"Ver Dashboard →"**
4. Click the button → should take you to `/corporate/dashboard`

### **As a Corporate Employee:**

1. Sign in as an **employee**
2. Go to: `https://crowdconscious.app/dashboard`
3. You should see a similar banner:
   - Shows your company name
   - Has a button: **"Ver Mis Cursos →"**
4. Click the button → should take you to `/employee-portal/dashboard`

---

## ✅ Feature Checklist

### **Corporate Dashboard:**

- [ ] Can access `/corporate/dashboard` as admin
- [ ] Displays company information correctly
- [ ] Shows employee count
- [ ] Shows program modules
- [ ] Can navigate between tabs

### **Employee Management:**

- [ ] Can send invitations from corporate dashboard
- [ ] Invitations appear in "Pending" list
- [ ] Email is sent to invited employee
- [ ] Can view list of registered employees
- [ ] Status badges display correctly

### **Employee Invitation Acceptance:**

- [ ] Invitation link works
- [ ] Token validation works
- [ ] Expired tokens are rejected (after 7 days)
- [ ] Signup form displays correctly
- [ ] Account is created successfully
- [ ] Profile is linked to corporate account

### **Authentication & Redirects:**

- [ ] Corporate admin → `/corporate/dashboard`
- [ ] Corporate employee → `/employee-portal/dashboard`
- [ ] Regular user → `/dashboard`
- [ ] Corporate banner shows on main dashboard
- [ ] Banner links work correctly

### **Employee Portal:**

- [ ] Can access `/employee-portal/dashboard` as employee
- [ ] Shows company name
- [ ] Shows enrolled modules
- [ ] Displays progress (will be 0% initially)
- [ ] Can navigate between portal sections

---

## 🐛 Common Issues & Fixes

### **Issue: Can't access corporate dashboard**

**Solution:**

```sql
-- Verify your profile has the correct flags:
SELECT * FROM profiles WHERE email = 'YOUR_EMAIL@example.com';

-- If is_corporate_user is false or corporate_account_id is null:
-- Run MAKE-ME-CORPORATE-ADMIN.sql again
```

### **Issue: Invitation email not received**

**Check:**

1. Verify `RESEND_API_KEY` is set in Vercel environment variables
2. Check Resend dashboard for email logs
3. Check spam/junk folder
4. Verify email address is correct

**Debug:**

```bash
# Check server logs in Vercel for email sending errors
# Look for: "Assessment quote email sent to: ..."
```

### **Issue: Token invalid or expired**

**Tokens expire after 7 days.**

**Solution:**

```sql
-- Re-send invitation (delete old one first):
DELETE FROM employee_invitations WHERE email = 'employee@example.com';

-- Then send a new invitation from the corporate dashboard
```

### **Issue: Employee can't access employee portal**

**Verify:**

```sql
SELECT
  email,
  is_corporate_user,
  corporate_role,
  corporate_account_id
FROM profiles
WHERE email = 'employee@example.com';

-- Should show:
-- is_corporate_user: true
-- corporate_role: 'employee'
-- corporate_account_id: (should match admin's corporate_account_id)
```

---

## 📊 Database Verification Queries

### **View all corporate accounts:**

```sql
SELECT
  id,
  company_name,
  program_tier,
  employee_limit,
  admin_user_id,
  created_at
FROM corporate_accounts
ORDER BY created_at DESC;
```

### **View all corporate users:**

```sql
SELECT
  p.email,
  p.full_name,
  p.corporate_role,
  ca.company_name
FROM profiles p
LEFT JOIN corporate_accounts ca ON ca.id = p.corporate_account_id
WHERE p.is_corporate_user = true
ORDER BY p.created_at DESC;
```

### **View all invitations:**

```sql
SELECT
  ei.email,
  ei.full_name,
  ei.status,
  ei.created_at,
  ei.expires_at,
  ca.company_name
FROM employee_invitations ei
LEFT JOIN corporate_accounts ca ON ca.id = ei.corporate_account_id
ORDER BY ei.created_at DESC;
```

### **View course enrollments:**

```sql
SELECT
  ce.id,
  p.email,
  cm.title as module_name,
  ce.status,
  ce.completion_percentage,
  ca.company_name
FROM course_enrollments ce
LEFT JOIN profiles p ON p.id = ce.user_id
LEFT JOIN course_modules cm ON cm.id = ce.module_id
LEFT JOIN corporate_accounts ca ON ca.id = ce.corporate_account_id
ORDER BY ce.created_at DESC;
```

---

## 🎉 Success Criteria

**You've successfully tested Phase 1 when:**

✅ Can access corporate dashboard as admin  
✅ Can send employee invitations  
✅ Invitations are received via email  
✅ Employees can accept invitations  
✅ Employees can access employee portal  
✅ Smart redirects work for all user types  
✅ Corporate banner shows in main app  
✅ Can switch between portals seamlessly

---

## 📝 Notes for Development

- **Database:** All tables created with proper RLS policies
- **Emails:** Using Resend with custom templates
- **Authentication:** Supabase Auth with role-based redirects
- **Type Safety:** Type assertions used temporarily (regenerate types after testing)

**Next Phase Preview:**

- Phase 2: Course content & module delivery
- Phase 3: Progress tracking & certifications
- Phase 4: Impact metrics & reporting

---

## 🚀 Ready to Test?

**Start here:**

1. Run `CHECK-MY-CORPORATE-STATUS.sql` to see your current status
2. If not a corporate admin, run `MAKE-ME-CORPORATE-ADMIN.sql`
3. Sign out and back in
4. Go to `/corporate/dashboard`
5. Follow the steps above!

**Questions or issues?** Check the troubleshooting section or database verification queries above.

---

**Happy Testing! 🎊**
