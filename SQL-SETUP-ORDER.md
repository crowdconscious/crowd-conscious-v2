# 🗄️ Database Setup - Correct Order

**IMPORTANT:** Run these SQL files in Supabase SQL Editor **in this exact order**:

---

## Step 1: Add Corporate Columns to Profiles

**File:** `sql-migrations/00-profiles-corporate-columns.sql`

**What it does:**

- Adds `corporate_account_id` column to profiles
- Adds `corporate_role` column to profiles
- Adds `is_corporate_user` column to profiles
- Creates indexes for performance

**Run this first!** This is required before Phase 1 tables.

```sql
-- Copy and paste 00-profiles-corporate-columns.sql
-- in Supabase SQL Editor and run it
```

**Expected result:**

```
✅ Corporate columns added to profiles table successfully!
Columns: corporate_account_id, corporate_role, is_corporate_user
```

---

## Step 2: Create Phase 1 Tables

**File:** `sql-migrations/corporate-phase1-tables-FIXED.sql`

**What it does:**

- Creates 6 new tables:
  - employee_invitations
  - course_enrollments
  - certifications
  - impact_metrics
  - project_submissions
  - corporate_activity_log
- Sets up RLS policies
- Creates helper functions
- Adds triggers

```sql
-- Copy and paste corporate-phase1-tables-FIXED.sql
-- in Supabase SQL Editor and run it
```

**Expected result:**

```
✅ Corporate Phase 1 tables created successfully!
Tables: employee_invitations, course_enrollments, certifications, impact_metrics, project_submissions, corporate_activity_log
Functions: log_corporate_activity, auto_enroll_employee
Triggers: update_updated_at_column (on 4 tables)
```

---

## Step 3: Create Test Corporate Account (Optional)

**File:** `WORKING-SETUP.sql`

**What it does:**

- Creates a test corporate account
- Links your user as admin
- Sets up company with all modules

**Before running:**

1. Replace `'your-email@example.com'` with your actual email (line 20)
2. Optionally customize company details

```sql
-- Copy and paste WORKING-SETUP.sql
-- Change the email address first!
-- Then run in Supabase SQL Editor
```

**Expected result:**

```
✅ Corporate account created successfully!
Corporate Account ID: [uuid]
Admin User ID: [uuid]
```

---

## 🚨 Common Errors & Fixes

### Error: `column "corporate_account_id" does not exist`

**Cause:** You skipped Step 1  
**Fix:** Run `00-profiles-corporate-columns.sql` first

### Error: `relation "corporate_accounts" does not exist`

**Cause:** The corporate_accounts table was never created  
**Fix:** You need to run the original corporate account migration first, or use `WORKING-SETUP.sql`

### Error: `function "log_corporate_activity" already exists`

**Cause:** You ran the migration twice  
**Fix:** It's safe to ignore. The `CREATE OR REPLACE` will update it.

---

## ✅ Verification

After running all SQL, verify in Supabase:

### Check Tables Exist:

Go to Table Editor and verify you see:

- ✅ profiles (with new columns: corporate_account_id, corporate_role, is_corporate_user)
- ✅ corporate_accounts
- ✅ employee_invitations
- ✅ course_enrollments
- ✅ certifications
- ✅ impact_metrics
- ✅ project_submissions
- ✅ corporate_activity_log

### Check Functions Exist:

Go to SQL Editor > Functions and verify:

- ✅ log_corporate_activity
- ✅ auto_enroll_employee

---

## 🎯 Quick Reference

**Correct order:**

1. `00-profiles-corporate-columns.sql` ← **Run this first!**
2. `corporate-phase1-tables-FIXED.sql`
3. `WORKING-SETUP.sql` (optional, for test data)

**If you get errors:**

- Always run Step 1 first
- Check that corporate_accounts table exists
- Make sure you're running in Supabase SQL Editor (not psql or other client)

---

**Ready?** Run Step 1 now! 🚀
