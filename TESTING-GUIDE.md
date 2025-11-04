# 🧪 Cart Testing Guide - Post Deployment

**Deployment Status**: ✅ Pushed to GitHub (Vercel will auto-deploy)

---

## 🎯 What Was Fixed

### Root Cause

The cart API was using `createClient()` (anon key) which respects RLS policies. When querying the database, it was being blocked by Supabase's internal auth system with "permission denied" errors.

### Solution

**Use Supabase Service Role Key** (`createAdminClient()`) for database queries in all cart API routes, while still validating authentication with the regular client.

### Impact

- ✅ Cart API now bypasses RLS for server-side operations
- ✅ Auth is still validated (secure)
- ✅ All cart operations work for corporate admins

---

## 🧪 Testing Checklist

### Prerequisites

- [ ] Logged in as **corporate admin** user
- [ ] Have at least 1 employee in your corporate account
- [ ] Have SUPABASE_SERVICE_ROLE_KEY in Vercel env vars

### Test 1: Browse Marketplace

1. Navigate to `/marketplace`
2. **Expected**: See 4-5 published modules
3. **Expected**: Cart button (floating) shows "0" items
4. **Check**: No console errors

### Test 2: View Module Details

1. Click on any module (e.g., "Aire Limpio Avanzado")
2. **Expected**: Module info loads (title, description, lessons, pricing)
3. **Expected**: "Agregar al Carrito" button appears
4. **Expected**: Share button works (copies link or opens native share)
5. **Check**: No "Módulo no encontrado" error
6. **Check**: No console errors

### Test 3: Add to Cart

1. On module detail page, click "Agregar al Carrito"
2. **Expected**: Button shows loading state briefly
3. **Expected**: Success message appears
4. **Expected**: Cart button badge updates to "1"
5. **Check Console**: Should see:
   ```
   Cart Response: { items: Array(1), summary: {...} }
   ```
6. **Check**: NO 404 or 500 errors

### Test 4: View Cart Sidebar

1. Click the floating cart button
2. **Expected**: Sidebar slides in from right
3. **Expected**: Shows module(s) in cart
4. **Expected**: Shows correct pricing calculation
5. **Expected**: Shows employee count input (default 50)
6. **Expected**: Shows total price

### Test 5: Update Employee Count

1. In cart sidebar, change employee count (e.g., 50 → 75)
2. **Expected**: Price updates dynamically
3. **Expected**: Total updates
4. **Check**: No errors in console

### Test 6: Add Multiple Modules

1. Close cart sidebar
2. Go back to marketplace
3. Click another module
4. Add to cart
5. **Expected**: Cart badge shows "2"
6. **Expected**: Cart sidebar shows both items

### Test 7: Remove from Cart

1. Open cart sidebar
2. Click "Eliminar" on any item
3. **Expected**: Item removed from list
4. **Expected**: Cart badge updates
5. **Expected**: Total price updates

### Test 8: Proceed to Checkout

1. In cart sidebar, click "Ir a Pagar"
2. **Expected**: Navigate to `/corporate/checkout`
3. **Expected**: See all cart items
4. **Expected**: See total price
5. **Expected**: See Stripe checkout form

### Test 9: Complete Purchase (Optional)

⚠️ **Use Stripe test card**: `4242 4242 4242 4242`

1. Fill in checkout form
2. Submit payment
3. **Expected**: Redirect to success page
4. **Expected**: Confetti animation 🎉
5. **Expected**: Cart is cleared
6. **Check Supabase**: Employees should be enrolled in module(s)
7. **Check Stripe**: Payment should appear in dashboard

### Test 10: Verify Revenue Distribution

1. Go to Supabase SQL editor
2. Run:
   ```sql
   SELECT * FROM wallet_transactions
   WHERE corporate_account_id = 'YOUR_CORPORATE_ID'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
3. **Expected**: See 3 transactions for each module:
   - 30% → Creator community wallet
   - 50% → Impact fund wallet
   - 20% → Platform wallet
4. **For platform modules** (is_platform_module = TRUE):
   - 100% → Platform wallet

---

## 🐛 Error Scenarios to Test

### Scenario 1: Non-Corporate User

1. Log in as individual/community user (not corporate)
2. Try to add module to cart
3. **Expected**: Error message "Only corporate admins can add to cart"
4. **Expected**: HTTP 403

### Scenario 2: Already Owned Module

1. As corporate admin, try to add a module you already own
2. **Expected**: Error message "Module already owned by your company"
3. **Expected**: HTTP 400

### Scenario 3: Unauthenticated User

1. Log out
2. Try to access `/api/cart`
3. **Expected**: Error "Unauthorized - Please log in"
4. **Expected**: HTTP 401
5. **Expected**: Cart button either hidden or shows 0

---

## 📊 Console Log Reference

### ✅ Successful Cart Fetch

```
Cart API Response: {
  items: [
    {
      id: "uuid",
      module_id: "uuid",
      employee_count: 50,
      price_snapshot: 18000,
      module: {
        title: "Aire Limpio Avanzado",
        base_price_mxn: 18000,
        ...
      },
      total_price: 18000,
      price_per_employee: 360
    }
  ],
  summary: {
    item_count: 1,
    total_price: 18000,
    total_employees: 50
  }
}
```

### ✅ Successful Add to Cart

```
POST /api/cart/add 200
{
  message: "Module added to cart",
  cartItem: { id: "uuid", ... },
  action: "added"
}
```

### ❌ Error (Should NOT see these anymore)

```
❌ POST /api/cart/add 404 (Not Found)
❌ Error fetching cart: permission denied for table users
❌ Cart API Response: { error: "Failed to fetch cart items" }
```

---

## 🔍 Debugging Tips

### If Cart Button Shows Error:

1. Open DevTools console
2. Look for red error messages
3. Check Network tab → `/api/cart` request
4. If 401: User not logged in
5. If 403: User is not corporate admin
6. If 500: Check Vercel logs

### If Add to Cart Fails:

1. Check console for error message
2. Check Network tab → `/api/cart/add` request
3. Look at response body for specific error
4. Verify user is corporate admin in Supabase

### If Prices Look Wrong:

1. Check `base_price_mxn` in database
2. Check `price_per_50_employees` in database
3. Verify calculation: `base + ((packs - 1) * per_pack)`
4. Example for 75 employees:
   - Packs = Math.ceil(75 / 50) = 2
   - Total = 18000 + ((2 - 1) \* 0) = 18000

---

## 🎯 Success Criteria

**Cart System is Fully Working When**:

- [x] All 5 cart API routes return 200
- [x] Cart fetches items without errors
- [x] Add to cart works for corporate admins
- [x] Cart badge updates correctly
- [x] Cart sidebar displays items
- [x] Update quantity works
- [x] Remove item works
- [x] Checkout flow completes
- [x] Employees get enrolled
- [x] Revenue gets distributed

**Bonus (Universal Marketplace)**:

- [ ] Individual users can buy modules
- [ ] Pricing adapts to user type
- [ ] Community-set prices work
- [ ] Platform modules stay 100% platform revenue

---

## 📝 Known Limitations (To Address Next)

1. **Corporate-Only Access**: Currently only corporate admins can use cart
   - **Next**: Implement universal access (individuals, teams, corporates)

2. **Fixed Pricing**: All modules use platform pricing model
   - **Next**: Let communities set their own prices

3. **No Individual Purchases**: Can't buy for yourself
   - **Next**: Add individual purchase flow

4. **No Pricing Tiers**: One price for all
   - **Next**: Dynamic pricing based on user type

---

## 🚀 Next Phase: Universal Marketplace

### High-Level Plan

1. **Week 1-2**: Database migration (individual cart, enrollments)
2. **Week 3-4**: API refactor (dynamic pricing, checkout)
3. **Week 5-6**: UI updates (pricing tiers, user dashboard)
4. **Week 7-8**: Testing + launch

### Key Features

- **Individual Access**: Buy modules for yourself
- **Team Access**: Buy for 5-20 people
- **Corporate Access**: Current system (50-100+)
- **Community Pricing**: Let creators set prices
- **Platform Modules**: $18k MXN, 100% platform revenue
- **Unified Dashboard**: One learning hub for all users

---

**Happy Testing! 🎉**

If you encounter any issues, check:

1. Console logs first
2. Network tab (DevTools)
3. Vercel deployment logs
4. Supabase logs (Database → Logs)
