# 🚀 Deployment Verification Checklist

**Date**: November 6, 2025  
**Deployment**: Post-Crisis Recovery  
**Status**: Testing Phase

---

## ✅ **Critical Fixes Deployed**

### 1. Database Schema Updates
- ✅ Added `individual_price_mxn` column to `marketplace_modules`
- ✅ Added `is_template` column to `marketplace_modules`
- ✅ Added `price_per_4_employees` column for small teams
- ✅ Updated `calculate_module_price` function for 1-4 employee pricing
- ✅ Created 3 free template modules (Aire Limpio Básico, Agua Limpia Básico, Cero Residuos Básico)
- ✅ Set 11 premium modules with correct pricing ($360/person)

### 2. API Fixes
- ✅ `/api/marketplace/modules` - Excludes templates, shows only published modules
- ✅ `/api/marketplace/templates` - Returns only template modules for builder
- ✅ `/api/admin` - Fixed profile query to not require email field
- ✅ Landing page error handling - Graceful fallbacks for data fetching

### 3. Infrastructure Fixes
- ✅ Removed redirect loop from `vercel.json`
- ✅ Fixed browser caching issues
- ✅ Proper error boundaries for server components

---

## 🧪 **Testing Checklist**

### **A. Landing Page (Public - Not Logged In)**
- [ ] Visit `crowdconscious.app`
- [ ] Page loads without "Loading..." freeze
- [ ] No console errors (ERR_TOO_MANY_REDIRECTS)
- [ ] Hero section displays
- [ ] Navigation works
- [ ] Impact stats show (even if 0)

### **B. Marketplace**
**URL**: `/marketplace`
- [ ] Shows exactly 11 modules (not 14)
- [ ] Each module displays $360/person pricing
- [ ] No template modules visible
- [ ] Module cards have correct info:
  - Title
  - Description
  - Difficulty level
  - Duration
  - Price
  - Creator name

**Test Premium Modules Present**:
1. [ ] Aire Limpio: El Despertar Corporativo
2. [ ] Estrategias Avanzadas de Calidad del Aire
3. [ ] Gestión Sostenible del Agua
4. [ ] Economía Circular: Cero Residuos
5. [ ] Ciudades Seguras y Espacios Inclusivos
6. [ ] Comercio Justo y Cadenas de Valor
7-11. [ ] Plus 5 community-created modules

### **C. Module Builder / Templates**
**URL**: `/communities/[id]/modules/create` OR general module builder

- [ ] Template selection appears
- [ ] Shows 3 free templates:
  - Aire Limpio Básico
  - Agua Limpia Básico
  - Cero Residuos Básico
- [ ] Templates marked as FREE
- [ ] Can clone/use templates
- [ ] Templates are NOT in marketplace

### **D. Admin Dashboard**
**URL**: `/admin`

- [ ] Dashboard loads without errors
- [ ] Shows communities list
- [ ] Shows content list
- [ ] Shows users list
- [ ] No "Failed to fetch" errors
- [ ] Can navigate between tabs

### **E. Promo Codes**
**URL**: `/admin/promo-codes`

- [ ] Page loads
- [ ] Can view existing promo codes
- [ ] Can create new promo code
- [ ] Can toggle active/inactive
- [ ] Shows usage statistics

**Create Test Promo Code**:
- Code: `TEST50`
- Type: 50% discount
- Save and verify it appears in active codes

### **F. Cart & Checkout Flow**
**Test as Individual User**:
1. [ ] Add module to cart
2. [ ] Cart shows 1 module, $360 MXN
3. [ ] Can apply promo code
4. [ ] Checkout redirects to Stripe
5. [ ] (Don't complete payment in test)

**Test as Corporate User** (if you have test account):
1. [ ] Add module to cart
2. [ ] Set employee count (e.g., 4 employees)
3. [ ] Price calculates correctly using `price_per_4_employees`
4. [ ] Checkout works

### **G. Review System**
**Test on any module you've enrolled in**:
- [ ] Can view existing reviews
- [ ] Can submit a review (if enrolled)
- [ ] Star rating works
- [ ] Review text saves
- [ ] Module rating updates

---

## 🎯 **Expected Results**

### **Database State**
Query to verify in Supabase:
```sql
-- Should return 11 premium modules
SELECT COUNT(*) FROM marketplace_modules 
WHERE status = 'published' AND is_template = false;

-- Should return 3 templates
SELECT COUNT(*) FROM marketplace_modules 
WHERE status = 'template' AND is_template = true;

-- Should show correct pricing
SELECT title, individual_price_mxn, is_template, status 
FROM marketplace_modules 
ORDER BY is_template DESC, title;
```

### **API Response Checks**
```bash
# Marketplace modules (should return 11)
curl https://crowdconscious.app/api/marketplace/modules | jq '.modules | length'

# Templates (should return 3)
curl https://crowdconscious.app/api/marketplace/templates | jq '.templates | length'
```

---

## 🐛 **If Issues Found**

### **Issue**: Marketplace shows wrong number of modules
**Fix**: Run `FIX-PRICING-AND-TEMPLATES.sql` again in Supabase

### **Issue**: Admin dashboard fails to load
**Check**: 
- Supabase RLS policies
- User has admin permissions
- Browser console for specific errors

### **Issue**: Promo codes not saving
**Check**:
- `promo_codes` table exists
- RLS policies allow admin inserts
- `created_by` column is nullable

### **Issue**: Templates not showing in builder
**Check**:
- `/api/marketplace/templates` returns data
- Module builder component is calling correct endpoint
- User has permission to create modules

---

## ✅ **Sign-Off**

Once all items checked:
- [ ] All critical features tested and working
- [ ] No console errors on main pages
- [ ] Ready to proceed with Phase 2 features
- [ ] Documentation updated with any findings

**Tested By**: _________________  
**Date**: _________________  
**Notes**: _________________

---

## 📝 **Next Steps After Verification**

See `NEXT-STEPS.md` for Phase 2 priorities based on master plan.

