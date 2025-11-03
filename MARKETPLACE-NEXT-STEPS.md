# Marketplace - Next Steps Plan

**Status**: ✅ Phase 1 Complete - Marketplace Browse & Detail Pages Working  
**Date**: November 3, 2025

---

## 🎉 **COMPLETED - Phase 1**

### ✅ Marketplace Infrastructure
- [x] SQL migrations for platform modules
- [x] Imported 4 platform modules to database
- [x] Created API endpoints for module browsing
- [x] Created API endpoint for module details
- [x] Fixed RLS policies for public access
- [x] Connected browse page to database
- [x] Connected detail page to database
- [x] Added share functionality (viral growth)

### ✅ Platform Modules Live
1. **Aire Limpio: El Despertar Corporativo** (5 lessons)
2. **Estrategias Avanzadas de Calidad del Aire** (5 lessons)
3. **Gestión Sostenible del Agua** (5 lessons)
4. **Economía Circular: Cero Residuos** (6 lessons)

---

## 🚀 **NEXT STEPS - Phase 2**

### **Priority Order** (As Requested by User):

1. **Template Module** ⏳
2. **Admin Review Dashboard** ⏳
3. **Community Module Builder** ⏳
4. **Cart & Checkout** ⏳

---

## 📋 **1. TEMPLATE MODULE** ⏳

**Goal**: Create 1 educational template for community creators

### **What to Build**:
- Mock module: "Cómo Construir un Módulo Efectivo"
- Shows structure, best practices, examples
- Can be cloned by communities as starting point

### **Implementation Steps**:
1. Create template module data (JSON)
2. Mark as `is_template = TRUE` in database
3. Add template flag to schema
4. Create `/templates` browse page
5. Add "Clone Template" functionality
6. Update module builder to show templates

### **Files to Create/Update**:
- `scripts/template-module-data.json`
- `sql-migrations/add-template-flag.sql`
- `app/api/modules/templates/route.ts`
- `app/(app)/communities/[id]/modules/templates/page.tsx`

**Estimated Time**: 2-3 hours

---

## 🔍 **2. ADMIN REVIEW DASHBOARD** ⏳

**Goal**: Test and polish the module approval workflow

### **What Already Exists**:
- ✅ Email notifications to `comunidad@crowdconscious.app`
- ✅ Admin review API endpoints
- ✅ Module status workflow (draft → review → published)

### **What to Test/Fix**:
1. Verify email notifications work
2. Test approval flow in admin dashboard
3. Test rejection flow with feedback
4. Ensure creator receives notification emails
5. Verify published modules appear in marketplace

### **Testing Checklist**:
- [ ] Submit test module for review
- [ ] Receive email notification
- [ ] Approve module via admin dashboard
- [ ] Creator receives approval email
- [ ] Module appears in marketplace
- [ ] Test rejection flow
- [ ] Creator receives rejection email with feedback

**Estimated Time**: 1-2 hours

---

## 🎨 **3. COMMUNITY MODULE BUILDER** ⏳

**Goal**: Finalize module builder for community creators

### **What Already Exists**:
- ✅ Module builder at `/communities/[id]/modules/create`
- ✅ Modules management dashboard
- ✅ Image upload for thumbnails
- ✅ Submit for review workflow
- ✅ Drag-and-drop lesson ordering

### **What to Add/Polish**:
1. **Preview Mode**: View module as student would see it
2. **Template Integration**: "Start from Template" option
3. **Better Onboarding**: Tooltips, help text, examples
4. **Validation**: Required fields, lesson count limits
5. **Save Draft**: Auto-save functionality
6. **Edit Published Modules**: Allow updates (with re-review)

### **Optional Enhancements**:
- Rich text editor for lessons
- Image upload for lesson content
- Embed videos (YouTube, Vimeo)
- Quiz builder
- Interactive exercise builder

**Estimated Time**: 4-6 hours

---

## 🛒 **4. CART & CHECKOUT** ⏳

**Goal**: Allow corporate clients to purchase modules

### **Shopping Cart Flow**:
```
Browse Marketplace
  ↓
View Module Details
  ↓
Add to Cart (with employee count)
  ↓
View Cart (adjust quantities)
  ↓
Checkout (Stripe payment)
  ↓
Payment Success
  ↓
Enroll Employees in Modules
  ↓
Revenue Split to Wallets (30/50/20)
  ↓
Send Confirmation Emails
```

### **Implementation Steps**:

#### **A. Shopping Cart** (2-3 hours)
- Create `cart_items` table
- Cart API endpoints (add, remove, update)
- Cart UI component
- Cart badge in header
- Persistent cart (localStorage + database)

#### **B. Checkout Page** (3-4 hours)
- Checkout form (company info, employee count)
- Stripe integration
- Payment processing
- Error handling
- Loading states

#### **C. Post-Purchase** (2-3 hours)
- Enroll employees in purchased modules
- Trigger revenue split to wallets
- Send confirmation emails
- Redirect to corporate dashboard
- Show purchase in admin dashboard

### **Database Schema**:

```sql
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  module_id UUID REFERENCES marketplace_modules(id),
  employee_count INTEGER NOT NULL,
  price_snapshot DECIMAL NOT NULL,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);
```

### **API Endpoints to Create**:
- `POST /api/cart/add` - Add module to cart
- `GET /api/cart` - Get user's cart
- `PUT /api/cart/[id]` - Update employee count
- `DELETE /api/cart/[id]` - Remove from cart
- `POST /api/checkout/create-session` - Create Stripe session
- `POST /api/checkout/process` - Process successful payment

**Estimated Time**: 8-10 hours total

---

## 📊 **SUMMARY**

| Task | Priority | Time | Status |
|------|----------|------|--------|
| **Template Module** | 1️⃣ | 2-3h | ⏳ Pending |
| **Admin Review Dashboard** | 2️⃣ | 1-2h | ⏳ Pending |
| **Community Module Builder** | 3️⃣ | 4-6h | ⏳ Pending |
| **Cart & Checkout** | 4️⃣ | 8-10h | ⏳ Pending |
| **TOTAL** | - | **15-21h** | - |

---

## 🎯 **SUCCESS METRICS**

After completing all 4 phases, we should have:

- ✅ Functional marketplace (browse, search, filter)
- ✅ Module detail pages with sharing
- ✅ Template library for creators
- ✅ Admin review workflow
- ✅ Community module builder
- ✅ Shopping cart
- ✅ Stripe checkout
- ✅ Automated revenue splits
- ✅ Employee enrollment
- ✅ Email confirmations

**= FULL MARKETPLACE READY FOR LAUNCH! 🚀**

---

## 🔮 **FUTURE ENHANCEMENTS** (Post-Launch)

### **Phase 3: Optimization**
- Module analytics dashboard
- Creator earnings dashboard
- Review and rating system
- Bundle discounts
- Volume pricing tiers
- Subscription model for unlimited access

### **Phase 4: Growth**
- Referral program
- Affiliate system
- White-label options
- API for enterprise integration
- Mobile app
- International expansion

---

**Next Action**: Proceed with Template Module creation


