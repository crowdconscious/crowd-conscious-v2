# 🚀 Marketplace Evolution Plan: Universal Access

**Vision**: Transform marketplace from corporate-only to accessible for ALL users (individuals, corporates, enterprises)

**Status**: Planning Phase → Implementation Starting

---

## 📋 **CORE REQUIREMENTS**

### **1. Community-Set Pricing** 💰
- ✅ Communities decide their module prices
- ✅ Platform modules: Fixed $18k base (premium tools included)
- ✅ Minimum price: $300 MXN (platform recommendation)
- ✅ Maximum price: No limit (market decides)

### **2. Platform vs Community Modules** 🏢

**Platform Modules** (`is_platform_module = true`):
- Created by Crowd Conscious team
- Premium tools and integrations
- 100% revenue to platform
- Fixed pricing structure
- Example: "Aire Limpio: El Despertar Corporativo"

**Community Modules** (`is_platform_module = false`):
- Created by verified communities
- Community sets price
- Revenue split:
  - Platform: 30%
  - Community: 50%
  - Creator: 20% (optional donation to community)

### **3. Universal User Access** 👥

**Three User Types**:

1. **Individual Learners**
   - Buy for themselves (quantity = 1)
   - Personal dashboard
   - Own certificates
   - Price: Module base price

2. **Corporate Teams**
   - Buy for 5-100 employees
   - Team dashboard
   - Bulk enrollments
   - Price: Base price × employee count (with volume discounts)

3. **Enterprise**
   - Custom pricing (100+ employees)
   - Dedicated support
   - Price: Negotiated

---

## 🗄️ **DATABASE CHANGES**

### **Phase 1: Make Cart Universal**

```sql
-- 1. Add user_id to cart_items (support individuals)
ALTER TABLE cart_items 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- 2. Make corporate_account_id optional
ALTER TABLE cart_items 
ALTER COLUMN corporate_account_id DROP NOT NULL;

-- 3. Add check constraint (either user_id OR corporate_account_id required)
ALTER TABLE cart_items
ADD CONSTRAINT cart_owner_check 
CHECK (
  (user_id IS NOT NULL AND corporate_account_id IS NULL) OR
  (user_id IS NULL AND corporate_account_id IS NOT NULL)
);

-- 4. Update unique constraint
ALTER TABLE cart_items
DROP CONSTRAINT IF EXISTS cart_items_corporate_account_id_module_id_key;

-- New unique constraints (one per owner type)
CREATE UNIQUE INDEX cart_items_user_module_unique 
ON cart_items(user_id, module_id) 
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX cart_items_corporate_module_unique 
ON cart_items(corporate_account_id, module_id) 
WHERE corporate_account_id IS NOT NULL;

-- 5. Update RLS policies to support both
DROP POLICY IF EXISTS "Corporate admins can view own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can add to own cart" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Corporate admins can delete own cart items" ON cart_items;

-- Universal cart policies
CREATE POLICY "Users can view own cart"
ON cart_items FOR SELECT
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users can add to own cart"
ON cart_items FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users can update own cart"
ON cart_items FOR UPDATE
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);

CREATE POLICY "Users can delete from own cart"
ON cart_items FOR DELETE
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);
```

### **Phase 2: Make Enrollments Universal**

```sql
-- 1. Add purchase_type to course_enrollments
ALTER TABLE course_enrollments
ADD COLUMN purchase_type TEXT DEFAULT 'corporate' 
CHECK (purchase_type IN ('individual', 'corporate', 'team'));

-- 2. Make corporate_account_id optional
ALTER TABLE course_enrollments
ALTER COLUMN corporate_account_id DROP NOT NULL;

-- 3. Rename employee_id to user_id for clarity
ALTER TABLE course_enrollments
RENAME COLUMN employee_id TO user_id;

-- 4. Update RLS policies
-- (Individual users can see their own enrollments)
CREATE POLICY "Users can view own enrollments"
ON course_enrollments FOR SELECT
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
);
```

### **Phase 3: Community-Set Pricing**

```sql
-- Already exists in marketplace_modules:
-- base_price_mxn INTEGER NOT NULL
-- price_per_50_employees INTEGER NOT NULL

-- Add pricing guidance fields
ALTER TABLE marketplace_modules
ADD COLUMN price_set_by_community BOOLEAN DEFAULT true,
ADD COLUMN platform_suggested_price INTEGER,
ADD COLUMN pricing_notes TEXT;

-- Update for platform modules
UPDATE marketplace_modules
SET 
  price_set_by_community = false,
  base_price_mxn = 18000,
  price_per_50_employees = 8000
WHERE is_platform_module = true;
```

---

## 🔧 **API CHANGES**

### **1. Cart API** (`/api/cart/*`)

#### **GET /api/cart**

```typescript
export async function GET() {
  const { user } = await supabase.auth.getUser()
  if (!user) return 401

  // NEW: Get profile to determine user type
  const { data: profile } = await adminClient
    .from('profiles')
    .select('corporate_account_id, corporate_role')
    .eq('id', user.id)
    .single()

  const isCorporate = profile?.corporate_role === 'admin' && profile?.corporate_account_id

  // NEW: Fetch cart items for EITHER individual OR corporate
  const query = adminClient
    .from('cart_items')
    .select('*, marketplace_modules(*)')

  if (isCorporate) {
    query.eq('corporate_account_id', profile.corporate_account_id)
  } else {
    query.eq('user_id', user.id)
  }

  const { data: cartItems } = await query

  return { items: cartItems, summary: { ... } }
}
```

#### **POST /api/cart/add**

```typescript
export async function POST(req: Request) {
  const { moduleId, employeeCount = 1 } = await req.json()
  const { user } = await supabase.auth.getUser()
  
  // NEW: Validate employee count
  if (employeeCount < 1) {
    return NextResponse.json({ error: 'Invalid employee count' }, { status: 400 })
  }

  // Get profile
  const { data: profile } = await adminClient
    .from('profiles')
    .select('corporate_account_id, corporate_role, is_corporate_user')
    .eq('id', user.id)
    .single()

  const isCorporate = profile?.corporate_role === 'admin'

  // NEW: Individuals can only buy for themselves
  if (!isCorporate && employeeCount > 1) {
    return NextResponse.json(
      { error: 'Individual users can only purchase for 1 person' },
      { status: 400 }
    )
  }

  // Get module
  const { data: module } = await adminClient
    .from('marketplace_modules')
    .select('*')
    .eq('id', moduleId)
    .single()

  // NEW: Calculate price based on employee count
  const price = calculateModulePrice(module, employeeCount)

  // NEW: Insert with appropriate owner
  await adminClient.from('cart_items').insert({
    user_id: isCorporate ? null : user.id,
    corporate_account_id: isCorporate ? profile.corporate_account_id : null,
    module_id: moduleId,
    employee_count: employeeCount,
    price_snapshot: price
  })

  return NextResponse.json({ success: true })
}
```

### **2. New Pricing Utility**

```typescript
// lib/pricing.ts

export interface Module {
  base_price_mxn: number
  price_per_50_employees: number
  is_platform_module: boolean
}

export function calculateModulePrice(
  module: Module,
  employeeCount: number
): number {
  if (employeeCount === 1) {
    // Individual purchase
    return module.base_price_mxn / 50 // Price per person
  }

  if (employeeCount <= 50) {
    // Small team (1-50)
    return module.base_price_mxn
  }

  // Large team (50+)
  const packs = Math.ceil(employeeCount / 50)
  return module.base_price_mxn + ((packs - 1) * module.price_per_50_employees)
}

export function calculateVolumeDiscount(employeeCount: number): number {
  if (employeeCount <= 10) return 0
  if (employeeCount <= 50) return 0.05 // 5% off
  if (employeeCount <= 100) return 0.10 // 10% off
  return 0.15 // 15% off for 100+
}

export function getPricePerEmployee(
  module: Module,
  employeeCount: number
): number {
  const totalPrice = calculateModulePrice(module, employeeCount)
  return Math.round(totalPrice / employeeCount)
}
```

### **3. Checkout API Updates**

```typescript
// app/api/cart/checkout/route.ts

export async function POST(req: Request) {
  const { user } = await supabase.auth.getUser()
  
  // Get cart items
  const cartItems = await getCartForUser(user.id)
  
  // NEW: Calculate total for individual or corporate
  const lineItems = cartItems.map(item => ({
    price_data: {
      currency: 'mxn',
      product_data: {
        name: item.module.title,
        description: `${item.employee_count} ${item.employee_count === 1 ? 'persona' : 'empleados'}`,
      },
      unit_amount: Math.round(item.price_snapshot * 100), // Stripe uses cents
    },
    quantity: 1,
  }))

  // Create Stripe session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/marketplace`,
    metadata: {
      user_id: user.id,
      corporate_account_id: isCorporate ? profile.corporate_account_id : null,
      purchase_type: isCorporate ? 'corporate' : 'individual',
      cart_items: JSON.stringify(cartItems.map(i => i.id))
    }
  })

  return NextResponse.json({ url: session.url })
}
```

---

## 🎨 **UI CHANGES**

### **1. Module Detail Page** (`/marketplace/[id]/ModuleDetailClient.tsx`)

```typescript
'use client'

export default function ModuleDetailClient({ module }) {
  const { user, profile } = useUser()
  const isCorporate = profile?.corporate_role === 'admin'
  
  // NEW: Dynamic employee count
  const [employeeCount, setEmployeeCount] = useState(isCorporate ? 50 : 1)
  
  // NEW: Dynamic pricing
  const price = calculateModulePrice(module, employeeCount)
  const pricePerPerson = getPricePerEmployee(module, employeeCount)

  return (
    <div>
      {/* Hero - show pricing */}
      <div className="pricing-card">
        <div className="text-4xl font-bold">
          {employeeCount === 1 ? (
            // Individual pricing
            <>
              ${pricePerPerson.toLocaleString()} MXN
              <div className="text-sm text-gray-600">Acceso personal</div>
            </>
          ) : (
            // Corporate pricing
            <>
              ${(price / 1000).toFixed(0)}k MXN
              <div className="text-sm text-gray-600">
                ${pricePerPerson} MXN por empleado
              </div>
            </>
          )}
        </div>

        {/* NEW: Conditional employee selector */}
        {isCorporate && (
          <div>
            <label>Número de Empleados</label>
            <input
              type="number"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
            />
            <div className="text-xs text-gray-500">
              {Math.ceil(employeeCount / 50)} paquete(s) de 50 empleados
            </div>
          </div>
        )}

        {/* CTA Button */}
        <button onClick={handleAddToCart}>
          <ShoppingCart />
          {isCorporate ? 'Agregar al Carrito' : 'Comprar Ahora'}
        </button>

        {/* NEW: Individual vs Team toggle (for flexibility) */}
        {!profile?.is_corporate_user && (
          <div className="mt-4">
            <a href="/corporate/signup" className="text-sm text-purple-600">
              ¿Necesitas para tu equipo? Crea cuenta empresarial →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
```

### **2. Dashboard Unification** (`/dashboard`)

```typescript
// app/dashboard/page.tsx (NEW - replaces corporate & employee dashboards)

export default async function UnifiedDashboard() {
  const { user, profile } = await getCurrentUser()
  
  // Determine dashboard type
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

function IndividualView() {
  return (
    <>
      <WelcomeBanner />
      <MyCourses />
      <PersonalProgress />
      <Certificates />
      <ExploreMarketplace />
    </>
  )
}
```

---

## 📊 **MODULE BUILDER: Pricing Setup**

### **Community Module Creation Form**

```typescript
// app/communities/[id]/modules/create/PricingStep.tsx

export function PricingStep({ module, onChange }) {
  const [basePrice, setBasePrice] = useState(18000)
  const [pricePerPack, setPricePerPack] = useState(8000)

  return (
    <div className="pricing-config">
      <h2>Configuración de Precios</h2>
      
      <div className="bg-purple-50 p-4 rounded-lg mb-6">
        <h3>💰 Distribución de Ingresos</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-2xl font-bold text-purple-600">50%</div>
            <div className="text-sm">Tu Comunidad</div>
            <div className="text-xs text-gray-600">
              ${(basePrice * 0.5).toLocaleString()} MXN
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">20%</div>
            <div className="text-sm">Tú (Creador)</div>
            <div className="text-xs text-gray-600">
              ${(basePrice * 0.2).toLocaleString()} MXN
            </div>
            <button className="text-xs text-purple-600">
              Donar a comunidad →
            </button>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">30%</div>
            <div className="text-sm">Plataforma</div>
            <div className="text-xs text-gray-600">
              ${(basePrice * 0.3).toLocaleString()} MXN
            </div>
          </div>
        </div>
      </div>

      <div>
        <label>Precio Base (50 empleados)</label>
        <input
          type="number"
          value={basePrice}
          onChange={(e) => setBasePrice(parseInt(e.value))}
          min="300"
          step="100"
        />
        <div className="text-sm text-gray-600">
          Sugerencia: $18,000 MXN (estándar del mercado)
        </div>
        <div className="text-sm text-gray-600">
          Precio por persona: ${(basePrice / 50).toFixed(0)} MXN
        </div>
      </div>

      <div>
        <label>Precio por Paquete Adicional (50 empleados)</label>
        <input
          type="number"
          value={pricePerPack}
          onChange={(e) => setPricePerPack(parseInt(e.value))}
          min="200"
          step="100"
        />
        <div className="text-sm text-gray-600">
          Para empresas con más de 50 empleados
        </div>
      </div>

      {/* Pricing Preview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4>Vista Previa de Precios</h4>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Empleados</th>
              <th>Precio Total</th>
              <th>Por Empleado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1 (individual)</td>
              <td>${(basePrice / 50).toFixed(0)} MXN</td>
              <td>${(basePrice / 50).toFixed(0)} MXN</td>
            </tr>
            <tr>
              <td>50</td>
              <td>${basePrice.toLocaleString()} MXN</td>
              <td>${(basePrice / 50).toFixed(0)} MXN</td>
            </tr>
            <tr>
              <td>100</td>
              <td>${(basePrice + pricePerPack).toLocaleString()} MXN</td>
              <td>${((basePrice + pricePerPack) / 100).toFixed(0)} MXN</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## 🚀 **IMPLEMENTATION TIMELINE**

### **Week 1: Fix Current Cart (IN PROGRESS)**
- ✅ Admin client for cart API
- ⏳ Test cart works for corporates
- ⏳ Fix any remaining bugs

### **Week 2: Database Migration**
- Run Phase 1 SQL (cart universal)
- Run Phase 2 SQL (enrollments universal)
- Run Phase 3 SQL (community pricing)
- Test migrations in staging

### **Week 3: API Refactor**
- Update cart API (GET, POST, PUT, DELETE)
- Update checkout API
- Create pricing utility functions
- Add individual purchase flow

### **Week 4: UI Updates**
- Module detail page (dynamic pricing)
- Cart page (support both types)
- Checkout page (universal)
- Success page (universal)

### **Week 5: Dashboard Unification**
- Create `/dashboard` route
- Migrate corporate dashboard logic
- Migrate employee portal logic
- Add individual learner view
- Update navigation

### **Week 6: Module Builder Pricing**
- Add pricing step to builder
- Revenue distribution preview
- Pricing guidance and suggestions
- Save pricing to database

### **Week 7: Testing & Refinement**
- End-to-end testing (all user types)
- Edge case handling
- Performance optimization
- Mobile optimization

### **Week 8: Launch**
- Marketing materials
- Pricing page updates
- Help documentation
- Soft launch to existing users
- Monitor and iterate

---

## 🎯 **SUCCESS METRICS**

**After Evolution:**
- ✅ 3x larger addressable market
- ✅ Individual purchase conversion rate: 5-10%
- ✅ Corporate purchase conversion rate: 2-5%
- ✅ Average cart value: $5,000-15,000 MXN
- ✅ Community module variety: 10+ modules in 3 months
- ✅ Creator satisfaction: 80%+ happy with pricing control

---

## 📝 **ROLLOUT STRATEGY**

### **Phase A: Corporate-Only (Current - 2 weeks)**
- Fix current cart issues
- Perfect corporate experience
- Get first 5-10 corporate clients
- Validate pricing model

### **Phase B: Soft Launch Universal (Week 3-4)**
- Enable individual purchases (beta)
- Invite select individuals
- Collect feedback
- Iterate quickly

### **Phase C: Full Launch (Week 5-8)**
- Public announcement
- Marketing campaign
- Community creator onboarding
- Scale infrastructure

---

## 🔒 **BACKWARDS COMPATIBILITY**

- ✅ Existing corporate accounts: No changes needed
- ✅ Existing enrollments: Work as-is
- ✅ Existing certificates: Still valid
- ✅ Existing wallets: Continue tracking revenue
- ✅ Migration path: All existing data migrates cleanly

---

**Status**: Ready to begin Week 1 (Fix current cart)  
**Next Action**: Wait for deployment, test cart, then proceed with Week 2

🎯 **Let's fix the cart first, then evolve!**

