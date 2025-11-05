# 🚀 Phase 1 Implementation Roadmap

**Status**: Database migrations ✅ COMPLETE | API & UI updates 🚧 IN PROGRESS

---

## ✅ **COMPLETED: Database Foundation**

- [x] Phase 1: Universal Cart (user_id support)
- [x] Phase 2: Universal Enrollments (purchase_type tracking)
- [x] Phase 3: Community Pricing (dynamic pricing functions)

**Result**: Database is now ready for universal marketplace! 🎉

---

## 📋 **IMPLEMENTATION STRATEGY**

Based on our refactoring opportunities and marketplace evolution plan, here's the optimal order:

### **Week 1: Quick Wins + Foundation** (Current)

**Goal**: Get refactoring utilities in place + basic API updates

**Priority**: HIGH (enables everything else)

#### **Step 1: Create Shared Utilities** ⏳

_Time: 2-3 hours | Impact: HIGH_

1. **`lib/supabase-admin.ts`** - Extract admin client creation
   - Used by: All cart routes, checkout, webhooks
   - Saves: ~100 lines of code
   - Benefit: Single source of truth

2. **`lib/api-responses.ts`** - Standardize error responses
   - Used by: All API routes
   - Saves: ~50 lines of code
   - Benefit: Consistent error handling

3. **`lib/pricing.ts`** - Dynamic pricing calculations
   - Used by: Cart, checkout, module detail page
   - Critical for: Universal marketplace
   - Benefit: Centralized pricing logic

**Files to create**:

- `lib/supabase-admin.ts`
- `lib/api-responses.ts`
- `lib/pricing.ts`

---

#### **Step 2: Update Cart API Routes** ⏳

_Time: 3-4 hours | Impact: HIGH_

**Goal**: Support both individual + corporate users

**Routes to update**:

1. `/api/cart/route.ts` (GET) - Detect user type, fetch appropriate cart
2. `/api/cart/add/route.ts` (POST) - Allow individuals (employeeCount = 1)
3. `/api/cart/update/route.ts` (PUT) - Support both user types
4. `/api/cart/remove/route.ts` (DELETE) - Support both user types
5. `/api/cart/clear/route.ts` (DELETE) - Support both user types

**Key changes**:

```typescript
// Detect user type
const { data: profile } = await adminClient
  .from("profiles")
  .select("corporate_account_id, corporate_role")
  .eq("id", user.id)
  .single();

const isCorporate =
  profile?.corporate_role === "admin" && profile?.corporate_account_id;

// Insert cart item with appropriate owner
await adminClient.from("cart_items").insert({
  user_id: isCorporate ? null : user.id,
  corporate_account_id: isCorporate ? profile.corporate_account_id : null,
  module_id: moduleId,
  employee_count: isCorporate ? employeeCount : 1, // Individuals always 1
  price_snapshot: calculateModulePrice(module, employeeCount),
});
```

---

#### **Step 3: Update Checkout API** ⏳

_Time: 2-3 hours | Impact: HIGH_

**File**: `/api/cart/checkout/route.ts`

**Key changes**:

- Support both user types in Stripe metadata
- Calculate pricing using `lib/pricing.ts`
- Handle individual vs corporate in webhook

```typescript
const session = await stripe.checkout.sessions.create({
  metadata: {
    user_id: user.id,
    corporate_account_id: isCorporate ? profile.corporate_account_id : null,
    purchase_type: isCorporate ? "corporate" : "individual",
    cart_items: JSON.stringify(cartItems.map((i) => i.id)),
  },
});
```

---

#### **Step 4: Update Stripe Webhook** ⏳

_Time: 2-3 hours | Impact: HIGH_

**File**: `/api/webhooks/stripe/route.ts`

**Key changes**:

- Handle individual purchases (enroll single user)
- Handle corporate purchases (enroll all employees)
- Use correct `purchase_type` in enrollments

```typescript
if (metadata.purchase_type === "individual") {
  // Enroll individual user
  await supabaseClient.from("course_enrollments").insert({
    user_id: metadata.user_id,
    corporate_account_id: null,
    module_id: item.module_id,
    purchase_type: "individual",
    purchased_at: new Date().toISOString(),
    purchase_price_snapshot: item.price_snapshot,
  });
} else {
  // Enroll all employees (existing logic)
  // ...
}
```

---

### **Week 2: UI Updates** 🎨

**Goal**: Make UI adapt to user type

#### **Step 5: Update Module Detail Page** ⏳

_Time: 3-4 hours | Impact: HIGH_

**File**: `app/marketplace/[id]/ModuleDetailClient.tsx`

**Key changes**:

- Detect user type (individual vs corporate)
- Show dynamic pricing based on employee count
- Hide employee selector for individuals
- Update "Add to Cart" button text

```typescript
const { user, profile } = useUser()
const isCorporate = profile?.corporate_role === 'admin'

const [employeeCount, setEmployeeCount] = useState(isCorporate ? 50 : 1)

// Calculate price dynamically
const price = calculateModulePrice(module, employeeCount)
const pricePerPerson = price / employeeCount

return (
  <div className="pricing-card">
    {isCorporate ? (
      <>
        <div className="text-4xl font-bold">${(price / 1000).toFixed(0)}k MXN</div>
        <div className="text-sm">${pricePerPerson} MXN por empleado</div>

        <label>Número de Empleados</label>
        <input
          type="number"
          value={employeeCount}
          onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value)))}
          min="1"
        />
      </>
    ) : (
      <>
        <div className="text-4xl font-bold">${pricePerPerson.toLocaleString()} MXN</div>
        <div className="text-sm">Acceso personal</div>
      </>
    )}

    <button onClick={handleAddToCart}>
      {isCorporate ? 'Agregar al Carrito' : 'Comprar Ahora'}
    </button>
  </div>
)
```

---

#### **Step 6: Update Cart UI** ⏳

_Time: 2-3 hours | Impact: MEDIUM_

**Files**:

- `app/components/cart/CartButton.tsx` - Show for all users
- `app/components/cart/CartSidebar.tsx` - Adapt to user type

**Key changes**:

- Remove "corporate admin only" restriction
- Show appropriate messaging for individuals
- Update quantity controls (hide for individuals)

---

#### **Step 7: Update Checkout Page** ⏳

_Time: 2-3 hours | Impact: MEDIUM_

**File**: `app/corporate/checkout/page.tsx` → `app/checkout/page.tsx`

**Key changes**:

- Move from `/corporate/checkout` to `/checkout` (universal)
- Adapt UI for individual vs corporate
- Show correct totals and messaging

---

### **Week 3: Dashboard & Module Builder** 📊

**Goal**: Unified experience for all users

#### **Step 8: Create Unified Dashboard** ⏳

_Time: 4-5 hours | Impact: HIGH_

**New file**: `app/dashboard/page.tsx`

**Goal**: Single dashboard for all user types

- Individual learners: See purchased modules, progress, certificates
- Corporate employees: See assigned modules, company progress
- Corporate admins: See team overview, purchase history

```typescript
export default async function UnifiedDashboard() {
  const { user, profile } = await getCurrentUser()

  const dashboardType = getDashboardType(profile)
  // Returns: 'individual', 'corporate_admin', 'corporate_employee'

  return (
    <div>
      <Sidebar type={dashboardType} />

      <main>
        {dashboardType === 'corporate_admin' && <CorporateAdminView />}
        {dashboardType === 'corporate_employee' && <EmployeeView />}
        {dashboardType === 'individual' && <IndividualView />}
      </main>
    </div>
  )
}
```

---

#### **Step 9: Add Pricing to Module Builder** ⏳

_Time: 3-4 hours | Impact: MEDIUM_

**File**: `app/(app)/communities/[id]/modules/create/ModuleBuilderClient.tsx`

**Goal**: Let communities set their own prices

**New component**: `PricingStep.tsx`

```typescript
export function PricingStep({ module, onChange }) {
  const [basePrice, setBasePrice] = useState(18000)
  const [individualPrice, setIndividualPrice] = useState(360)
  const [teamDiscount, setTeamDiscount] = useState(10)

  return (
    <div>
      <h2>Configuración de Precios</h2>

      {/* Revenue distribution preview */}
      <div className="revenue-split">
        <div>50% Tu Comunidad: ${(basePrice * 0.5).toLocaleString()}</div>
        <div>20% Tú (Creador): ${(basePrice * 0.2).toLocaleString()}</div>
        <div>30% Plataforma: ${(basePrice * 0.3).toLocaleString()}</div>
      </div>

      {/* Pricing inputs */}
      <label>Precio Base (50 empleados)</label>
      <input
        type="number"
        value={basePrice}
        onChange={(e) => setBasePrice(parseInt(e.target.value))}
        min="300"
      />

      <label>Precio Individual (1 persona)</label>
      <input
        type="number"
        value={individualPrice}
        onChange={(e) => setIndividualPrice(parseInt(e.target.value))}
        min="10"
      />

      {/* Pricing preview table */}
      <PricingPreview
        basePrice={basePrice}
        individualPrice={individualPrice}
        teamDiscount={teamDiscount}
      />
    </div>
  )
}
```

---

### **Week 4: Testing & Polish** 🧪

**Goal**: Ensure everything works end-to-end

#### **Step 10: End-to-End Testing** ⏳

_Time: 4-5 hours | Impact: CRITICAL_

**Test scenarios**:

1. **Individual Purchase Flow**:
   - Browse marketplace as individual
   - Add module to cart (quantity = 1)
   - Complete checkout
   - Verify enrollment
   - Access module in dashboard

2. **Corporate Purchase Flow**:
   - Browse marketplace as corporate admin
   - Add module to cart (quantity = 50)
   - Complete checkout
   - Verify all employees enrolled
   - Check revenue distribution

3. **Community Module Creation**:
   - Create module as community admin
   - Set custom pricing
   - Submit for review
   - Approve as platform admin
   - Verify appears in marketplace

---

## 🎯 **SUCCESS METRICS**

After implementation:

- [ ] Individuals can purchase modules (1 person)
- [ ] Corporates can purchase modules (50+ people)
- [ ] Dynamic pricing works correctly
- [ ] Revenue distribution is accurate
- [ ] Communities can set their own prices
- [ ] Platform modules retain 100% revenue
- [ ] Unified dashboard works for all user types
- [ ] No regressions in existing features

---

## 📊 **PRIORITY MATRIX**

| Step                      | Priority  | Time | Impact   | Dependencies |
| ------------------------- | --------- | ---- | -------- | ------------ |
| 1. Utilities              | 🔴 HIGH   | 2-3h | HIGH     | None         |
| 2. Cart API               | 🔴 HIGH   | 3-4h | HIGH     | Step 1       |
| 3. Checkout API           | 🔴 HIGH   | 2-3h | HIGH     | Step 1, 2    |
| 4. Stripe Webhook         | 🔴 HIGH   | 2-3h | HIGH     | Step 1, 2, 3 |
| 5. Module Detail UI       | 🟡 MEDIUM | 3-4h | HIGH     | Step 1       |
| 6. Cart UI                | 🟡 MEDIUM | 2-3h | MEDIUM   | Step 2       |
| 7. Checkout UI            | 🟡 MEDIUM | 2-3h | MEDIUM   | Step 3       |
| 8. Unified Dashboard      | 🟢 LOW    | 4-5h | HIGH     | Step 4       |
| 9. Module Builder Pricing | 🟢 LOW    | 3-4h | MEDIUM   | Step 1       |
| 10. Testing               | 🔴 HIGH   | 4-5h | CRITICAL | All          |

**Total estimated time**: 28-36 hours (3.5-4.5 weeks at 8h/week)

---

## 🚀 **RECOMMENDED NEXT STEPS**

### **Today (Next 2-3 hours)**:

1. ✅ Create `lib/supabase-admin.ts`
2. ✅ Create `lib/api-responses.ts`
3. ✅ Create `lib/pricing.ts`

**Why start here?**:

- These utilities are used by EVERYTHING
- Quick wins (2-3 hours total)
- Enables all subsequent work
- Reduces code duplication immediately

### **Tomorrow (Next 3-4 hours)**:

1. ✅ Update `/api/cart/add` to support individuals
2. ✅ Update `/api/cart/route` to detect user type
3. ✅ Test cart works for both user types

### **This Week (Remaining time)**:

1. ✅ Update remaining cart routes
2. ✅ Update checkout API
3. ✅ Update Stripe webhook
4. ✅ Test full purchase flow

---

## 💡 **QUICK START**

Want to start NOW? Here's the first file to create:

**`lib/supabase-admin.ts`**:

```typescript
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with admin privileges (service role key)
 * Bypasses RLS for server-side operations
 * ⚠️ USE ONLY in API routes, NEVER in client components
 */
export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

Then update one cart route to use it and see the immediate benefit! 🎯

---

**Ready to build the universal marketplace! 🚀**

**Which step would you like to start with?**
