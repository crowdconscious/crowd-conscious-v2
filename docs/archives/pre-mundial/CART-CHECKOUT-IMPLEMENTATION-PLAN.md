# Cart & Checkout System - Implementation Plan

**Status**: 🚀 IN PROGRESS  
**Date**: November 3, 2025  
**Priority**: HIGH - Final Major Feature

---

## 🎯 **OBJECTIVE**

Build a complete shopping cart and checkout system that allows corporate admins to:
1. Add multiple modules to cart
2. Adjust employee counts per module
3. See total pricing
4. Checkout via Stripe
5. Auto-enroll employees upon purchase

---

## 📊 **CURRENT STATE**

### **What Exists**:
- ✅ Marketplace browse page
- ✅ Module detail pages
- ✅ Stripe integration (for sponsorships)
- ✅ Wallet system (revenue distribution)
- ✅ `process_module_sale()` SQL function
- ✅ Corporate accounts system

### **What's Missing**:
- ❌ Shopping cart UI
- ❌ Cart state management
- ❌ Cart API endpoints
- ❌ Checkout page
- ❌ Stripe checkout for modules
- ❌ Auto-enrollment after purchase

---

## 🏗️ **ARCHITECTURE**

### **Database Tables**

#### **cart_items** (NEW)
```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  employee_count INTEGER NOT NULL DEFAULT 50,
  price_snapshot NUMERIC(10,2) NOT NULL, -- Price at time of adding to cart
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(corporate_account_id, module_id)
);
```

**Purpose**: Store items in corporate shopping carts

---

### **API Endpoints** (NEW)

#### **1. GET /api/cart**
- Fetch current user's cart items
- Returns: Array of cart items with module details

#### **2. POST /api/cart/add**
- Add module to cart
- Body: `{ moduleId, employeeCount }`
- Returns: Updated cart

#### **3. PUT /api/cart/update**
- Update employee count for cart item
- Body: `{ cartItemId, employeeCount }`
- Returns: Updated cart item

#### **4. DELETE /api/cart/remove**
- Remove item from cart
- Body: `{ cartItemId }`
- Returns: Success message

#### **5. DELETE /api/cart/clear**
- Clear entire cart
- Returns: Success message

#### **6. POST /api/cart/checkout**
- Create Stripe checkout session
- Body: `{ cartItems }`
- Returns: Stripe session URL

---

### **Components** (NEW)

#### **1. CartButton.tsx**
- Floating cart icon with item count badge
- Opens cart sidebar
- Visible on marketplace pages

#### **2. CartSidebar.tsx**
- Slide-out cart panel
- List of cart items
- Employee count adjusters
- Remove buttons
- Total price
- Checkout button

#### **3. CheckoutPage.tsx**
- Full checkout page
- Cart summary
- Company info
- Payment method (Stripe)
- Terms & conditions
- Complete purchase button

#### **4. OrderConfirmation.tsx**
- Success page after purchase
- Order summary
- Next steps (employees will be enrolled)
- Download receipt
- Return to dashboard

---

## 🔄 **USER FLOW**

### **1. Browse & Add to Cart**
```
Marketplace → Module Detail → "Add to Cart"
  ↓
Cart sidebar opens
  ↓
Adjust employee count
  ↓
Continue shopping OR Checkout
```

### **2. Checkout Process**
```
Cart → "Checkout"
  ↓
Checkout page (review cart)
  ↓
Stripe payment
  ↓
Payment success
  ↓
Order confirmation
  ↓
Auto-enroll employees
  ↓
Revenue distribution (30/50/20)
```

### **3. Post-Purchase**
```
Employees receive invitations
  ↓
Employees accept & access modules
  ↓
Corporate admin sees new modules in dashboard
  ↓
Community receives revenue in wallet
```

---

## 💳 **STRIPE INTEGRATION**

### **Checkout Session**
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: cartItems.map(item => ({
    price_data: {
      currency: 'mxn',
      product_data: {
        name: item.module_title,
        description: `${item.employee_count} employees`,
        images: [item.thumbnail_url]
      },
      unit_amount: item.total_price * 100 // Convert to cents
    },
    quantity: 1
  })),
  customer_email: corporateAdmin.email,
  client_reference_id: corporateAccountId,
  metadata: {
    type: 'module_purchase',
    corporate_account_id: corporateAccountId,
    cart_items: JSON.stringify(cartItems.map(i => ({
      module_id: i.module_id,
      employee_count: i.employee_count
    })))
  },
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/corporate/dashboard?purchase=success`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace?purchase=cancelled`
})
```

### **Webhook Handler**
```typescript
// app/api/webhooks/stripe/route.ts (existing, needs update)
case 'checkout.session.completed':
  if (event.data.object.metadata.type === 'module_purchase') {
    const cartItems = JSON.parse(event.data.object.metadata.cart_items)
    
    for (const item of cartItems) {
      // 1. Call process_module_sale() for each item
      await supabase.rpc('process_module_sale', {
        p_module_id: item.module_id,
        p_corporate_account_id: corporateAccountId,
        p_total_amount: item.total_price,
        p_creator_donates: false
      })
      
      // 2. Enroll all employees in module
      await enrollEmployeesInModule(corporateAccountId, item.module_id)
    }
    
    // 3. Clear cart
    await supabase
      .from('cart_items')
      .delete()
      .eq('corporate_account_id', corporateAccountId)
  }
  break
```

---

## 🎨 **UI/UX DESIGN**

### **Cart Sidebar**
```
┌─────────────────────────────────────┐
│  🛒 Tu Carrito (3)            [X]   │
├─────────────────────────────────────┤
│                                      │
│  📘 Aire Limpio: Despertar          │
│  50 empleados                        │
│  [-] 50 [+]                          │
│  $18,000 MXN              [🗑️]      │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  💧 Gestión Sostenible del Agua     │
│  100 empleados                       │
│  [-] 100 [+]                         │
│  $26,000 MXN              [🗑️]      │
│                                      │
│  ─────────────────────────────────  │
│                                      │
│  ♻️ Economía Circular               │
│  50 empleados                        │
│  [-] 50 [+]                          │
│  $18,000 MXN              [🗑️]      │
│                                      │
├─────────────────────────────────────┤
│  Subtotal:           $62,000 MXN    │
│  Empleados totales:  200            │
│                                      │
│  [Continuar Comprando]              │
│  [💳 Proceder al Pago]              │
└─────────────────────────────────────┘
```

### **Checkout Page**
```
┌─────────────────────────────────────────────┐
│  Finalizar Compra                            │
├─────────────────────────────────────────────┤
│                                              │
│  📦 Resumen del Pedido                       │
│  ┌─────────────────────────────────────┐   │
│  │ 3 módulos                            │   │
│  │ 200 empleados                        │   │
│  │ Total: $62,000 MXN                   │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  🏢 Información de la Empresa                │
│  ┌─────────────────────────────────────┐   │
│  │ Empresa: [Auto-filled]               │   │
│  │ Email: [Auto-filled]                 │   │
│  │ RFC: [Optional]                      │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  💳 Método de Pago                           │
│  ┌─────────────────────────────────────┐   │
│  │ [Stripe Checkout]                    │   │
│  │ Tarjeta de crédito/débito            │   │
│  │ Transferencia bancaria               │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  ☑️ Acepto términos y condiciones            │
│                                              │
│  [← Volver al Carrito]                      │
│  [💳 Completar Compra]                      │
└─────────────────────────────────────────────┘
```

---

## 📝 **IMPLEMENTATION STEPS**

### **Phase 1: Database & API** (2-3 hours)
1. Create `cart_items` table
2. Add RLS policies
3. Create API endpoints:
   - GET /api/cart
   - POST /api/cart/add
   - PUT /api/cart/update
   - DELETE /api/cart/remove
   - DELETE /api/cart/clear
4. Test API endpoints

### **Phase 2: Cart UI** (2-3 hours)
1. Create `CartButton` component
2. Create `CartSidebar` component
3. Add to marketplace layout
4. Implement cart state management (React Context or Zustand)
5. Test add/remove/update functionality

### **Phase 3: Checkout** (3-4 hours)
1. Create checkout page
2. Integrate Stripe checkout
3. Create `POST /api/cart/checkout` endpoint
4. Test Stripe session creation
5. Handle success/cancel redirects

### **Phase 4: Webhook & Enrollment** (2-3 hours)
1. Update Stripe webhook handler
2. Implement `enrollEmployeesInModule()` function
3. Test end-to-end purchase flow
4. Verify revenue distribution
5. Verify employee enrollment

### **Phase 5: Polish & Testing** (1-2 hours)
1. Add loading states
2. Add error handling
3. Add success animations
4. Test edge cases
5. Mobile optimization

**Total Estimated Time**: 10-15 hours

---

## ✅ **SUCCESS CRITERIA**

### **Functional Requirements**:
- [ ] Corporate admin can add modules to cart
- [ ] Cart persists across sessions
- [ ] Employee count can be adjusted
- [ ] Total price updates dynamically
- [ ] Stripe checkout works
- [ ] Payment success triggers:
  - [ ] Revenue distribution (30/50/20)
  - [ ] Employee enrollment
  - [ ] Cart clearing
  - [ ] Email notifications
- [ ] Corporate admin sees new modules in dashboard

### **UX Requirements**:
- [ ] Cart icon shows item count
- [ ] Cart sidebar is smooth and responsive
- [ ] Checkout page is clear and professional
- [ ] Loading states are visible
- [ ] Error messages are helpful
- [ ] Success page is celebratory

---

## 🐛 **EDGE CASES TO HANDLE**

1. **Module already purchased**: Show "Already Owned" instead of "Add to Cart"
2. **Module removed from marketplace**: Remove from cart automatically
3. **Price changes**: Use `price_snapshot` from cart, not current price
4. **Payment fails**: Show error, keep cart intact
5. **Duplicate adds**: Update employee count instead of adding twice
6. **Empty cart**: Disable checkout button
7. **Session expires**: Redirect to login, preserve cart

---

## 📊 **TESTING PLAN**

### **Unit Tests**:
- Cart API endpoints
- Price calculations
- Employee count validation

### **Integration Tests**:
- Add to cart flow
- Checkout flow
- Webhook processing
- Revenue distribution

### **E2E Tests**:
- Full purchase journey
- Multiple modules
- Different employee counts
- Payment success/failure

---

## 🚀 **DEPLOYMENT CHECKLIST**

- [ ] SQL migration for `cart_items` table
- [ ] API endpoints deployed
- [ ] Stripe webhook updated
- [ ] Environment variables set
- [ ] Test in staging
- [ ] Test with real Stripe account
- [ ] Monitor first purchases
- [ ] Document for users

---

## 💡 **FUTURE ENHANCEMENTS**

### **Nice-to-Have** (Post-MVP):
1. **Discount Codes**: Apply promo codes at checkout
2. **Bulk Pricing**: Automatic discounts for large orders
3. **Saved Carts**: Multiple carts for different departments
4. **Wishlist**: Save modules for later
5. **Recommendations**: "Customers also bought..."
6. **Invoice Generation**: PDF invoices for accounting
7. **Purchase History**: View past orders
8. **Refunds**: Handle refund requests

---

## 🎯 **NEXT STEPS**

Ready to start implementation! Let's begin with:

**Step 1**: Create `cart_items` table (SQL migration)  
**Step 2**: Build cart API endpoints  
**Step 3**: Create cart UI components  
**Step 4**: Integrate Stripe checkout  
**Step 5**: Test end-to-end

---

**Let's build the cart & checkout system!** 🛒💳


