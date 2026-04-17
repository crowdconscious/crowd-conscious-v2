# 🔧 Critical Database Fixes Required

## ❌ **Issues Found**

### **1. Join Community Button** ❌
**Error**: `function award_xp(uuid, unknown, integer, uuid, unknown) does not exist`

**Root Cause**: Database trigger `trigger_community_join_xp()` is calling `award_xp` with wrong signature:
- **Current**: `award_xp(user_id, 'daily_login', 10, community_id, 'Joined community')`
- **Expected**: `award_xp(UUID, VARCHAR(50), UUID, TEXT)` - no XP amount parameter!

**Fix**: Updated trigger to use correct function signature

---

### **2. Voting on Polls** ❌
**Error**: `function award_xp(uuid, unknown, integer, uuid, unknown) does not exist`

**Root Cause**: Database trigger `trigger_poll_vote_xp()` is calling `award_xp` with wrong signature:
- **Current**: `award_xp(user_id, 'vote_cast', 5, content_id, 'Voted on poll')`
- **Expected**: `award_xp(UUID, VARCHAR(50), UUID, TEXT)` - no XP amount parameter!

**Fix**: Updated trigger to use correct function signature

---

### **3. Volunteer Sponsorship** ❌
**Error**: `new row for relation "sponsorships" violates check constraint "sponsorships_amount_check"`

**Root Cause**: Database CHECK constraint requires `amount >= 100` but we're setting `amount = 0` for non-financial sponsorships

**Fix**: Updated constraint to allow `amount = 0` for volunteer/resources sponsorships

---

## ✅ **SQL Migration Required**

**File**: `sql-migrations/fix-triggers-and-sponsorships.sql`

**Run this in Supabase SQL Editor**:

```sql
-- Fixes all three issues:
-- 1. Community join XP trigger
-- 2. Poll vote XP trigger  
-- 3. Sponsorships amount constraint
```

---

## 🧪 **After Running Migration**

### **Test 1: Join Community** ✅
1. Click "Join Community" button
2. **Expected**: No function error
3. **Expected**: XP awarded (check console/logs)

### **Test 2: Vote on Poll** ✅
1. Vote on a poll
2. **Expected**: No function error
3. **Expected**: XP awarded (check console/logs)

### **Test 3: Volunteer Sponsorship** ✅
1. Offer to volunteer (non-financial)
2. **Expected**: No constraint error
3. **Expected**: Sponsorship created successfully
4. **Expected**: XP awarded immediately

---

## 📊 **What Changed**

### **Triggers Fixed**:
- `trigger_community_join_xp()` - Now uses correct `award_xp` signature
- `trigger_poll_vote_xp()` - Now uses correct `award_xp` signature

### **Constraint Fixed**:
- `sponsorships_amount_check` - Now allows:
  - `amount >= 100` for financial sponsorships
  - `amount = 0` for volunteer/resources sponsorships

---

## ⚠️ **Important**

**You MUST run the SQL migration in Supabase before these fixes will work!**

The code changes are pushed, but the database triggers and constraints need to be updated.

---

**Status**: ✅ **CODE FIXED** - ⚠️ **DATABASE MIGRATION REQUIRED**

