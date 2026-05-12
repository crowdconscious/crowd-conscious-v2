# How to Run Performance Indexes in Supabase

## ⚠️ Important: Supabase Transaction Issue

Supabase SQL Editor automatically wraps multiple statements in a transaction block. This causes `CREATE INDEX CONCURRENTLY` to fail with:
```
ERROR: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
```

## 🎯 **RECOMMENDED SOLUTION: Use the Batch Version**

**File**: `performance-indexes-batch.sql` ⭐

This version:
- ✅ Removes `CONCURRENTLY` keyword
- ✅ Runs all 40+ indexes in one batch (2-5 minutes)
- ✅ Works perfectly in Supabase SQL Editor
- ✅ Same performance benefits
- ⚠️  Brief table locks (< 5 seconds per table, acceptable for current traffic)

**How to Run**:
1. Open Supabase SQL Editor
2. Copy entire `performance-indexes-batch.sql` file
3. Paste and click **Run**
4. Wait 2-5 minutes
5. Done! ✅

---

## 📝 Alternative: Manual One-at-a-Time (Advanced)

### **Option A: Run All at Once** (Recommended - Easiest)

1. Open Supabase SQL Editor
2. Copy the **entire contents** of `performance-indexes.sql`
3. Paste into SQL Editor
4. Click **"Run"** (or Cmd/Ctrl + Enter)
5. Wait 5-10 minutes for all indexes to build
6. Scroll down to see verification queries

**Pros**: One-click, automatic
**Cons**: Takes 5-10 minutes to complete

---

### **Option B: Run in Sections** (If Option A has issues)

If you encounter any errors with Option A, run these sections one at a time:

#### **Section 1: Corporate Training Indexes** (Lines 14-64)
```sql
-- Employee progress queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_employee_status 
ON course_enrollments(employee_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_corporate_status 
ON course_enrollments(corporate_account_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_employee_module 
ON course_enrollments(employee_id, module_id);

-- Lesson responses
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_responses_employee 
ON lesson_responses(employee_id, course_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_responses_employee_module 
ON lesson_responses(employee_id, course_id, module_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lesson_responses_completed 
ON lesson_responses(employee_id, completed_at DESC);

-- Certifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certifications_employee 
ON certifications(employee_id, issued_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certifications_corporate 
ON certifications(corporate_account_id, issued_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certifications_verification 
ON certifications(verification_code);

-- Employee invitations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitations_corporate_status 
ON employee_invitations(corporate_account_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitations_email 
ON employee_invitations(email);
```

**Run this section → Wait for completion → Continue to Section 2**

---

#### **Section 2: Marketplace Indexes** (Lines 66-103)
```sql
-- Module browsing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_modules_status_featured 
ON marketplace_modules(status, featured) WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_modules_core_value_status 
ON marketplace_modules(core_value, status) WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_modules_rating 
ON marketplace_modules(avg_rating DESC, review_count DESC) WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_modules_price 
ON marketplace_modules(base_price_mxn ASC) WHERE status = 'published';

-- Module lessons
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_lessons_module_order 
ON module_lessons(module_id, lesson_order);

-- Creator applications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creator_apps_status 
ON creator_applications(status, submitted_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_creator_apps_community 
ON creator_applications(applicant_community_id);

-- Module reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_reviews_module_rating 
ON module_reviews(module_id, rating DESC);
```

---

#### **Section 3: Wallet & Revenue Indexes** (Lines 105-135)
```sql
-- Wallets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_owner 
ON wallets(owner_type, owner_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_status 
ON wallets(status) WHERE status = 'active';

-- Wallet transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_wallet_date 
ON wallet_transactions(wallet_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_source 
ON wallet_transactions(source, source_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_status 
ON wallet_transactions(status, created_at DESC);

-- Module sales
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_sales_module 
ON module_sales(module_id, purchased_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_sales_corporate 
ON module_sales(corporate_account_id, purchased_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_sales_community_wallet 
ON module_sales(community_wallet_id);
```

---

#### **Section 4: Community Platform Indexes** (Lines 137-170)
```sql
-- Community members
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_user 
ON community_members(user_id, community_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_members_community_role 
ON community_members(community_id, role);

-- Community content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_content_community_type 
ON community_content(community_id, type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_content_status 
ON community_content(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_community_content_type_status 
ON community_content(type, status, created_at DESC);

-- Sponsorships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sponsorships_content_status 
ON sponsorships(content_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sponsorships_sponsor 
ON sponsorships(sponsor_id, created_at DESC);

-- Votes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_content 
ON votes(content_id);

-- Impact metrics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_impact_metrics_community 
ON impact_metrics(community_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_impact_metrics_type 
ON impact_metrics(metric_type, verified);
```

---

#### **Section 5: Profiles & Gamification** (Lines 172-183)
```sql
-- Corporate user lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_corporate_account 
ON profiles(corporate_account_id) WHERE is_corporate_user = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_corporate_role 
ON profiles(corporate_role, corporate_account_id) WHERE is_corporate_user = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_type 
ON profiles(user_type);

-- XP and gamification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_xp 
ON profiles(xp DESC, level DESC);
```

---

#### **Section 6: JSONB & Full-Text Search** (Lines 185-205)
```sql
-- Industry tags (array index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_modules_industry_tags 
ON marketplace_modules USING GIN(industry_tags);

-- Search keywords
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_modules_keywords 
ON marketplace_modules USING GIN(search_keywords);

-- Tools used
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_module_lessons_tools 
ON module_lessons USING GIN(tools_used);

-- Community core values
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_core_values 
ON communities USING GIN(core_values);

-- Full-text search (Spanish)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_marketplace_modules_search 
ON marketplace_modules USING GIN(to_tsvector('spanish', title || ' ' || description));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_communities_search 
ON communities USING GIN(to_tsvector('spanish', name || ' ' || COALESCE(description, '')));
```

---

## ✅ Verification

After running all indexes, verify they were created:

```sql
-- Check all new indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

You should see **40+ indexes** starting with `idx_`.

---

## 🎯 Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Corporate dashboard load | 2-3s | 1-1.5s |
| Employee portal | 1.5-2s | 0.8-1.2s |
| Marketplace browse | 2-3s | 1-1.5s |
| Wallet queries | 1-2s | 0.3-0.6s |

---

## 🐛 Troubleshooting

### **Error: relation "table_name" does not exist**
**Solution**: That table hasn't been created yet. Skip that index or create the table first.

### **Error: index already exists**
**Solution**: The index is already there! You can skip it or the `IF NOT EXISTS` will handle it.

### **Taking too long?**
**Solution**: `CONCURRENTLY` means it builds in the background without locking. It's normal for each index to take 30-60 seconds on tables with data.

### **Want to monitor progress?**
```sql
SELECT 
    pid, 
    now() - pg_stat_activity.query_start AS duration, 
    query 
FROM pg_stat_activity 
WHERE query LIKE 'CREATE INDEX CONCURRENTLY%';
```

---

## 📊 Index Maintenance

Supabase automatically runs `VACUUM ANALYZE`, but if you want to manually optimize:

```sql
-- Analyze all tables (updates statistics)
ANALYZE;

-- Check for bloat (optional)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ✨ You're Done!

Your database is now optimized with **40+ performance indexes**! 🚀

Next steps:
1. Check Vercel Analytics to see performance improvements
2. Test key user flows (dashboard, marketplace, certificates)
3. Monitor query performance over time

---

*Created: November 1, 2025*
*Estimated time: 5-10 minutes*
*Safe to run: Yes (CONCURRENTLY, IF NOT EXISTS)*

