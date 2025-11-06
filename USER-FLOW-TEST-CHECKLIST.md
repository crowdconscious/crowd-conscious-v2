# 🧪 Comprehensive User Flow Test Checklist

**Created**: November 6, 2025  
**Purpose**: Verify entire platform after database schema updates  
**Run in Supabase First**: `FIX-CART-AND-USER-FLOW.sql`

---

## ✅ Pre-Flight Checks

### Database State
- [ ] Run `FIX-CART-AND-USER-FLOW.sql` in Supabase SQL Editor
- [ ] Verify 6 published modules exist (`SELECT COUNT(*) FROM marketplace_modules WHERE status = 'published' AND is_template = false;`)
- [ ] Verify 3 template modules exist (`SELECT COUNT(*) FROM marketplace_modules WHERE is_template = true AND status = 'template';`)
- [ ] Check cart_items has `user_id` column (`\d cart_items` or use schema viewer)
- [ ] Check course_enrollments has `purchase_type` column

### Deployment
- [ ] Latest code deployed to Vercel
- [ ] No build errors in Vercel dashboard
- [ ] Environment variables set correctly
- [ ] Hard refresh browser (Cmd/Ctrl + Shift + R)

---

## 🎯 Test Flow 1: Individual User Journey

### 1. Registration & Login ✅
- [ ] Navigate to `/` (landing page)
- [ ] Click "Ingresar" or "Registrarse"
- [ ] Create new account or log in
- [ ] Verify redirected to dashboard or home
- [ ] **Expected**: User logged in, profile created

### 2. Browse Marketplace 🛍️
- [ ] Navigate to `/marketplace`
- [ ] **Expected**: See 6 published modules (no templates)
- [ ] Verify each module shows:
  - [ ] Title
  - [ ] Description
  - [ ] Individual price ($360 MXN)
  - [ ] Thumbnail
  - [ ] Core value badge
  - [ ] Difficulty level
- [ ] Click "Ver Detalles" on any module

### 3. View Module Details 📖
- [ ] On module detail page, verify:
  - [ ] Full description loads
  - [ ] Lessons/curriculum visible
  - [ ] Pricing shows $360 MXN for 1 person
  - [ ] "Agregar al Carrito" button visible
  - [ ] Reviews section (if any reviews exist)
  - [ ] Module creator info

### 4. Add to Cart 🛒
- [ ] Click "Agregar al Carrito"
- [ ] **Expected**: Success message "Módulo agregado al carrito"
- [ ] **NOT Expected**: "Conflict" error
- [ ] Verify cart icon updates (if cart count shown)
- [ ] Navigate to `/cart`

### 5. View Cart 📦
- [ ] Verify cart shows:
  - [ ] Module title and image
  - [ ] Quantity: 1 person
  - [ ] Price: $360 MXN
  - [ ] Total: $360 MXN
  - [ ] "Proceder al Pago" button
- [ ] Try adding another module
- [ ] Verify cart updates correctly

### 6. Apply Promo Code (Optional) 🎟️
- [ ] Enter promo code (create test code in admin first)
- [ ] Click "Aplicar"
- [ ] **Expected**: Discount applied, total price reduced
- [ ] Verify discount amount shown

### 7. Checkout with Stripe 💳
- [ ] Click "Proceder al Pago"
- [ ] **Expected**: Redirected to Stripe Checkout
- [ ] Verify Stripe shows:
  - [ ] Correct module name
  - [ ] Correct price ($360 MXN or discounted amount)
  - [ ] Your email pre-filled
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Expiry: Any future date (e.g., 12/34)
- [ ] CVC: Any 3 digits (e.g., 123)
- [ ] Complete payment

### 8. Post-Purchase ✅
- [ ] **Expected**: Redirected to success page
- [ ] Navigate to `/employee-portal/dashboard`
- [ ] Verify enrolled module appears in "Mis Cursos"
- [ ] Click on module to access

### 9. Access Module & Lessons 📚
- [ ] Click on enrolled module
- [ ] **Expected**: Module overview page loads
- [ ] Verify:
  - [ ] Module title and description
  - [ ] Lessons list with correct titles
  - [ ] Progress indicator (0% initially)
  - [ ] "Comenzar" button on first lesson
- [ ] Click "Comenzar" on first lesson

### 10. Complete Lesson 🎓
- [ ] **Expected**: Lesson page loads (NOT stuck on "Loading...")
- [ ] Verify lesson content displays:
  - [ ] Lesson title
  - [ ] Lesson description
  - [ ] Key points
  - [ ] Story/content sections
  - [ ] Activity section
- [ ] Complete lesson (if interactive elements exist)
- [ ] Click "Siguiente Lección" or navigate back
- [ ] Verify progress updates on module page

### 11. Check Dashboard Progress 📊
- [ ] Navigate to `/employee-portal/dashboard`
- [ ] Verify:
  - [ ] Module shows as "En Progreso"
  - [ ] Progress percentage updates
  - [ ] XP earned (if implemented)
  - [ ] "Continuar" button appears

### 12. Complete Module & Review ⭐
- [ ] Complete all lessons in module
- [ ] **Expected**: "Módulo Completado" message
- [ ] **Expected**: Review prompt appears
- [ ] Leave a review:
  - [ ] Select star rating (1-5)
  - [ ] Enter review title (optional)
  - [ ] Enter review text (optional)
  - [ ] Check "Recomendaría este módulo"
  - [ ] Submit
- [ ] Verify review appears on module page

---

## 🏢 Test Flow 2: Corporate User Journey

### 1. Corporate Account Setup ✅
- [ ] Log in as corporate admin
- [ ] Verify profile has `corporate_role = 'admin'`
- [ ] Verify profile has `corporate_account_id` set

### 2. Browse & Add to Cart (Bulk) 🛒
- [ ] Navigate to `/marketplace`
- [ ] Click on a module
- [ ] **Expected**: Employee count selector appears (not "Acceso personal")
- [ ] Set employee count to 75
- [ ] Verify total price: $26,000 MXN (2 packs)
- [ ] Verify per-person price shown: ~$347 MXN
- [ ] Add to cart
- [ ] **Expected**: Success, no conflict error

### 3. Checkout (Corporate) 💳
- [ ] Proceed to checkout
- [ ] Complete Stripe payment
- [ ] **Expected**: Webhook creates 75 enrollments
- [ ] Navigate to corporate dashboard
- [ ] Verify all 75 employees enrolled

### 4. Employee Access 👥
- [ ] Log in as an employee (not admin)
- [ ] Navigate to dashboard
- [ ] **Expected**: See assigned module
- [ ] Click to access module
- [ ] Complete lessons
- [ ] Verify progress tracked

---

## 🎨 Test Flow 3: Community Creator Journey

### 1. Access Module Builder 🛠️
- [ ] Log in as community admin
- [ ] Navigate to community page
- [ ] Click "Crear Módulo" or access builder
- [ ] **Expected**: Module builder loads

### 2. Template Selection 📚
- [ ] **Expected**: See 3 template modules
- [ ] Templates shown:
  - [ ] Aire Limpio Básico
  - [ ] Agua Limpia Básico
  - [ ] Cero Residuos Básico
- [ ] Click "Usar Plantilla" on one
- [ ] **Expected**: Template content loads into builder
- [ ] **NOT Expected**: Premium modules shown as templates

### 3. Create Module ✏️
- [ ] Fill in module details:
  - [ ] Title
  - [ ] Description
  - [ ] Difficulty
  - [ ] Duration
- [ ] Add lessons (use template or create new)
- [ ] Set pricing (minimum $300 MXN)
- [ ] Upload thumbnail
- [ ] Submit for review

### 4. Admin Approval 👨‍💼
- [ ] Log in as super admin
- [ ] Navigate to `/admin`
- [ ] **Expected**: Pending module appears
- [ ] Review module content
- [ ] Approve module
- [ ] **Expected**: Module status → 'published'

### 5. Module in Marketplace 🎉
- [ ] Log out or use incognito
- [ ] Navigate to `/marketplace`
- [ ] **Expected**: Community-created module appears
- [ ] Verify pricing set by community
- [ ] Verify "Creado por [Community Name]" shown
- [ ] Purchase and test (same as individual flow)

---

## 🔧 Test Flow 4: Admin Functions

### 1. Promo Codes 🎟️
- [ ] Navigate to `/admin/promo-codes`
- [ ] **Expected**: Dashboard loads
- [ ] Create new promo code:
  - [ ] Code: TEST50
  - [ ] Type: 50% discount
  - [ ] Max uses: 10
  - [ ] Valid dates
- [ ] **Expected**: Code created successfully (NO ERROR)
- [ ] Code appears in "Active Codes" section
- [ ] Copy code
- [ ] Test applying code in cart (see Flow 1, step 6)

### 2. Dashboard Analytics 📊
- [ ] Navigate to `/admin`
- [ ] **Expected**: Dashboard loads (NO FETCH ERROR)
- [ ] Verify stats cards:
  - [ ] Total Users
  - [ ] Total Communities
  - [ ] Active Modules
  - [ ] Revenue
- [ ] Verify recent users list loads
- [ ] Verify recent purchases list loads

### 3. Module Management 📦
- [ ] Navigate to admin module management
- [ ] **Expected**: All modules listed
- [ ] Filter by status (published, draft, pending)
- [ ] Click "Edit" on a module
- [ ] Update pricing or details
- [ ] Save changes
- [ ] Verify changes reflected in marketplace

---

## 🐛 Known Issues to Check

### ❌ Issues That Should Be FIXED Now:
1. **Cart "Conflict" Error** 
   - ✅ Fixed by adding `user_id` to `cart_items`
   - Test: Add module to cart as individual user

2. **Lessons Not Loading**
   - ✅ Fixed by adding lessons to DB and using real UUIDs
   - Test: Click into any lesson

3. **App Stuck on Loading**
   - ✅ Fixed by using `Promise.allSettled()` on landing page
   - Test: Visit `/` (should load even if some data fails)

4. **Admin Dashboard Not Fetching**
   - ✅ Fixed by removing `email` requirement
   - Test: Visit `/admin`

5. **Templates Showing in Marketplace**
   - ✅ Fixed by `status = 'template'` filter
   - Test: Marketplace should only show 6 premium modules

6. **Promo Code Creation Error**
   - ❓ Should be fixed if `created_by` is nullable
   - Test: Create promo code in admin panel

### 🔍 Potential Issues to Watch For:
- **Progress Not Updating**: Check `course_enrollments` and `lesson_responses` tables
- **Certificate Not Generating**: May not be implemented yet
- **Revenue Distribution**: Check `module_sales` and `wallets` after purchase
- **Email Notifications**: May not be configured in dev environment
- **Image Uploads**: Check Supabase storage buckets configured

---

## 📊 Success Criteria

### ✅ Minimum Viable Test (Must Pass)
- [ ] Can browse marketplace
- [ ] Can add module to cart (individual)
- [ ] Can checkout with Stripe
- [ ] Can access enrolled module
- [ ] Can open and read a lesson
- [ ] No console errors blocking critical functionality

### 🎯 Full Feature Test (Ideal)
- [ ] All individual user flows work
- [ ] Corporate flows work
- [ ] Community creator flows work
- [ ] Admin functions work
- [ ] Promo codes work
- [ ] Reviews work
- [ ] Progress tracking works
- [ ] No critical errors in console

---

## 🚨 If Tests Fail

### Debugging Steps:
1. **Check Console**: Open browser DevTools → Console tab
2. **Check Network**: DevTools → Network tab → Look for failed API calls
3. **Check Supabase Logs**: Supabase Dashboard → Logs → API
4. **Check Database**: Run schema checks in SQL Editor
5. **Check Vercel Logs**: Vercel Dashboard → Your Project → Logs

### Common Fixes:
- **404 on API**: Route file missing or not deployed
- **500 error**: Check Vercel function logs
- **Supabase RLS error**: Check policies allow the operation
- **Missing column**: Run SQL migration again
- **Type error**: Might need to rebuild/redeploy

---

## 📝 Test Results Template

```
Date: _____________
Tester: _____________
Environment: [ ] Production [ ] Staging [ ] Local

Flow 1 (Individual): [ ] PASS [ ] FAIL
Flow 2 (Corporate):  [ ] PASS [ ] FAIL [ ] N/A
Flow 3 (Creator):    [ ] PASS [ ] FAIL [ ] N/A
Flow 4 (Admin):      [ ] PASS [ ] FAIL

Critical Issues Found:
1. _______________________________
2. _______________________________
3. _______________________________

Notes:
_____________________________________
_____________________________________
```

---

**Next Steps After Testing**:
1. Document any failures in GitHub Issues
2. Update this checklist based on findings
3. Fix critical bugs before production launch
4. Run regression tests after each fix

🎉 **Good luck!**

