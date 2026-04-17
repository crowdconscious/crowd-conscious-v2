# 🚀 Crowd Conscious V2 - Setup Instructions

**Quick setup guide to get everything working**

---

## ⚡ **Quick Start (5 Minutes)**

### **Step 1: Database Setup**

1. Open [Supabase](https://app.supabase.com)
2. Go to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Open `COMPLETE-DATABASE-SETUP.sql` in your code editor
5. **Copy the ENTIRE file contents**
6. Paste into Supabase SQL Editor
7. Click **RUN** (or press Cmd/Ctrl + Enter)
8. Wait for completion (~30-60 seconds)

You should see success messages:
```
✅ Promo codes system created
✅ 6 Platform modules created/updated
✅ Review system created
```

### **Step 2: Verify Everything Works**

After running the SQL script, verify:

**1. Promo Codes** ✅
```sql
SELECT code, discount_type, discount_value, active
FROM promo_codes;
```
Should return 3 codes: LAUNCH100, PARTNER50, WELCOME25

**2. Modules** ✅
```sql
SELECT title, status, is_platform_module, lesson_count
FROM marketplace_modules
WHERE is_platform_module = TRUE;
```
Should return 6 modules, all with status = 'published'

**3. Review Tables** ✅
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('module_reviews', 'community_reviews');
```
Should return both tables

---

## 🧪 **Testing the Platform**

### **Test 1: Browse Marketplace**
1. Visit `http://localhost:3000/marketplace` (or your deployed URL)
2. You should see **6 modules** displayed
3. Click on any module to view details
4. Verify pricing shows correctly

### **Test 2: Promo Codes Admin**
1. Visit `/admin/promo-codes`
2. You should see 3 existing codes
3. Try creating a new code:
   - Code: TEST10
   - Type: Percentage
   - Value: 10
   - Click "Crear Código"
4. Verify it appears in the active codes list

### **Test 3: Add to Cart & Apply Promo**
1. Browse marketplace
2. Click "Add to Cart" on any module
3. Open cart (shopping cart icon)
4. Enter promo code: WELCOME25
5. Click "Apply"
6. Verify discount shows correctly

### **Test 4: Module Reviews** (requires enrollment)
1. Complete a module (or be enrolled in one)
2. Visit the module overview page
3. You should see a "Leave Review" option
4. Fill out the review form:
   - Rating: 5 stars
   - Title: "Great module!"
   - Review: "Learned a lot..."
5. Submit
6. Verify review appears on module page

---

## 🔧 **Troubleshooting**

### **Issue: Promo codes not showing**

**Problem**: Created a promo code but it doesn't appear

**Solution**:
1. Check database: `SELECT * FROM promo_codes WHERE code = 'YOUR_CODE';`
2. Verify `active = TRUE`
3. Check browser console for errors
4. Refresh admin page

### **Issue: Modules show 404 error**

**Problem**: Clicking on a module gives "Module not found"

**Solution**:
1. Verify modules exist: `SELECT * FROM marketplace_modules WHERE status = 'published';`
2. Check that `is_platform_module = TRUE`
3. Verify `slug` column is not null
4. Run the COMPLETE-DATABASE-SETUP.sql script again

### **Issue: Can't create reviews**

**Problem**: "You must be enrolled" error

**Solution**:
- Reviews require enrollment in the module
- To test: Purchase a module first, or manually insert enrollment:
```sql
INSERT INTO course_enrollments (user_id, module_id, purchase_type)
VALUES ('YOUR_USER_ID', 'MODULE_ID', 'individual');
```

### **Issue: Module builder not accessible**

**Problem**: Community admins can't access module builder

**Solution**:
1. Verify user is community founder/admin:
```sql
SELECT role FROM community_members 
WHERE user_id = 'USER_ID' AND community_id = 'COMMUNITY_ID';
```
2. Role should be 'founder' or 'admin'
3. Visit `/communities/[community-id]/modules/create`

---

## 📁 **File Reference**

### **Critical SQL Files**
- `COMPLETE-DATABASE-SETUP.sql` - **Run this first!** Sets up everything
- `URGENT-FIX-SCRIPT.sql` - Alternative setup (does same thing)
- `sql-migrations/create-promo-codes-system.sql` - Promo codes only
- `sql-migrations/create-review-system.sql` - Reviews only

### **Key Frontend Files**
- `/app/(app)/admin/promo-codes/page.tsx` - Promo admin interface
- `/app/(app)/marketplace/page.tsx` - Module marketplace
- `/app/components/reviews/ModuleReviewForm.tsx` - Review form
- `/app/api/reviews/modules/route.ts` - Review API

### **Database Check Scripts**
- `check-db-status.sql` - Verify database state
- `scripts/check-platform-modules.sql` - Check modules

---

## 🎯 **What You Should Have Now**

After following this guide, you should have:

✅ **6 Platform Modules** ready to purchase
- Aire Limpio (Clean Air) - Beginner
- Estrategias Avanzadas (Clean Air) - Intermediate
- Gestión del Agua (Water) - Beginner
- Economía Circular (Zero Waste) - Intermediate
- Ciudades Seguras (Safe Cities) - Beginner
- Comercio Justo (Fair Trade) - Intermediate

✅ **3 Promo Codes** ready to use
- LAUNCH100 (100% OFF)
- PARTNER50 (50% OFF)
- WELCOME25 (25% OFF)

✅ **Review System** functional
- Module reviews enabled
- Community reviews enabled
- Review prompts after completion
- Rating aggregation working

✅ **Community Module Builder** accessible
- 3-step wizard
- Lesson management
- Tool integration
- Submit for review

---

## 🐛 **Common Errors & Fixes**

### **Error: "relation promo_codes does not exist"**
**Fix**: Run `COMPLETE-DATABASE-SETUP.sql` - table wasn't created

### **Error: "column is_platform_module does not exist"**
**Fix**: Run migration:
```sql
ALTER TABLE marketplace_modules 
ADD COLUMN is_platform_module BOOLEAN DEFAULT FALSE;
```

### **Error: "Cannot read properties of null (reading 'lessons')"**
**Fix**: Module data is malformed. Check:
```sql
SELECT id, title, slug, status FROM marketplace_modules WHERE slug = 'YOUR_SLUG';
```

### **Error: "You must be enrolled to review"**
**Fix**: Create enrollment first:
```sql
INSERT INTO course_enrollments (user_id, module_id, purchase_type, is_verified_purchase)
VALUES ('USER_ID', 'MODULE_ID', 'individual', TRUE);
```

---

## 📞 **Need Help?**

1. **Check Console**: Browser console (F12) for frontend errors
2. **Check Supabase Logs**: API logs in Supabase dashboard
3. **Check Database**: Run diagnostic queries above
4. **Re-run Setup**: Safe to run `COMPLETE-DATABASE-SETUP.sql` multiple times

---

## ✅ **Verification Checklist**

Before considering setup complete:

- [ ] Can browse marketplace and see 6 modules
- [ ] Can click on a module and view details
- [ ] Can add module to cart
- [ ] Can apply promo code in cart
- [ ] Can access `/admin/promo-codes` as admin
- [ ] Can create a new promo code
- [ ] Can access community module builder as community admin
- [ ] Can create a test review (after enrollment)

**All checked?** You're ready to go! 🚀

---

_Last Updated: November 6, 2025_  
_For setup issues, check PLATFORM-MASTER-DOCUMENTATION.md_

