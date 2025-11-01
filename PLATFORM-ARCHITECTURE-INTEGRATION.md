# Platform Architecture Integration Plan

## 🎯 **The Big Picture**

We have **TWO interconnected platforms** that need seamless integration:

### **Platform 1: Community Impact Platform** (Main App)

- **URL**: `crowdconscious.app/communities/[id]`
- **Purpose**: Communities create real-world projects, share needs, get sponsorships
- **Users**: Community members, volunteers, donors
- **Current Features**:
  - Community creation and management
  - Needs posting and sponsorship
  - Project submissions
  - Impact tracking
  - Community pool (wallet-like feature)
  - Content feed

### **Platform 2: Corporate Training (Concientizaciones)**

- **URL**: `crowdconscious.app/concientizaciones` or `crowdconscious.app/corporate`
- **Purpose**: Companies buy training modules, employees learn, communities get paid
- **Users**: Corporate admins, employees
- **Current Features**:
  - Course enrollment
  - Module completion
  - Certificates
  - Progress tracking
  - Employee management

---

## 💰 **THE MISSING LINK: Wallet & Revenue System**

According to the marketplace strategy, here's how money should flow:

```
Corporation purchases module ($18,000 MXN)
         ↓
Platform Split:
├─ Platform (30%): $5,400 → Platform operating account
├─ Community (50%): $9,000 → Community wallet
└─ Creator (20%): $3,600 → Creator personal wallet
```

### **What We Need:**

#### **1. Community Wallet** (50% revenue share)

- **Purpose**: Receives revenue from module sales created by that community
- **Uses**:
  - Fund local needs in community platform
  - Pay for community projects
  - Compensate facilitators
  - Create more modules
- **Access**: Community admins
- **Current State**: ✅ We have `community_pool` but it's for sponsorships, not module sales

#### **2. Creator Wallet** (20% revenue share)

- **Purpose**: Individual creators earn from modules they build
- **Users**: Community members who created modules
- **Uses**:
  - Personal income
  - Withdraw to bank account
  - Track earnings
- **Current State**: ❌ Not implemented

#### **3. Platform Treasury** (30% revenue)

- **Purpose**: Platform operating costs, marketing, support
- **Access**: Super admins only
- **Current State**: ❌ Not implemented

---

## 🔄 **PROPOSED INTEGRATION ARCHITECTURE**

### **Phase 1: Database Schema (Wallets)**

```sql
-- WALLETS TABLE
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('community', 'user', 'platform')),
  owner_id UUID NOT NULL, -- community_id, user_id, or NULL for platform
  balance NUMERIC(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'MXN',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- TRANSACTIONS TABLE
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount NUMERIC(10, 2) NOT NULL,
  source TEXT NOT NULL, -- 'module_sale', 'withdrawal', 'need_sponsorship', etc.
  source_id UUID, -- marketplace_module_id, need_id, etc.
  description TEXT,
  metadata JSONB, -- Store additional context
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- MODULE SALES TABLE (track revenue distribution)
CREATE TABLE module_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES marketplace_modules(id),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  total_amount NUMERIC(10, 2) NOT NULL,
  platform_fee NUMERIC(10, 2) NOT NULL, -- 30%
  community_share NUMERIC(10, 2) NOT NULL, -- 50%
  creator_share NUMERIC(10, 2) NOT NULL, -- 20%
  community_wallet_id UUID REFERENCES wallets(id),
  creator_wallet_id UUID REFERENCES wallets(id),
  transaction_ids JSONB, -- Store all related transaction IDs
  status TEXT DEFAULT 'completed',
  purchased_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 **MODULE BUILDER PLACEMENT**

### **Current State:**

- Module builder at: `/creator/module-builder`
- Creator application at: `/creator/apply`

### **Proposed New Structure:**

#### **Option A: Community Dashboard Integration** ⭐ RECOMMENDED

```
/communities/[id]/
├─ /admin-panel (community admin only)
   ├─ /dashboard (overview)
   ├─ /members
   ├─ /needs
   ├─ /wallet 🆕 (view balance, transactions, withdraw)
   ├─ /modules 🆕 (manage created modules)
   │  ├─ /create (module builder)
   │  ├─ /[moduleId]/edit
   │  └─ /earnings (revenue breakdown)
   └─ /settings
```

**Why this works:**

- Modules are created BY communities
- Community gets 50% revenue → needs wallet in same place
- Admins see all community assets in one dashboard
- Natural flow: Community → Create Module → Earn Revenue → Fund Local Needs

#### **Option B: Separate Creator Portal** (Current, but needs integration)

```
/creator/
├─ /apply (application form)
├─ /dashboard (after approved)
├─ /modules
│  ├─ /create (module builder)
│  └─ /[moduleId]/edit
└─ /earnings (personal 20% wallet)
```

**Problems:**

- Separates community from content creation
- Doesn't reflect the community-first model
- Creators don't see their community impact

---

## 🔗 **INTEGRATION POINTS**

### **1. Community Platform → Module Creation**

**Flow:**

1. Community admin goes to community dashboard
2. Clicks "Create Module" (requires approval first)
3. Uses module builder to create content
4. Submits for platform review
5. Once approved → published to marketplace
6. Revenue flows back to community wallet (50%) + creator wallet (20%)

### **2. Corporate Platform → Marketplace → Community Revenue**

**Flow:**

1. Corporate admin browses marketplace
2. Purchases module (e.g., "Clean Air" by "Colonia Verde")
3. Payment processed:
   - Stripe/payment gateway charges corporate
   - System splits revenue:
     - 30% → Platform treasury
     - 50% → "Colonia Verde" community wallet
     - 20% → Individual creator wallet (person who built module)
4. Community sees new funds in wallet
5. Community uses funds to:
   - Post more needs
   - Fund projects
   - Pay local facilitators
   - Create more modules

### **3. Wallet Usage in Community Platform**

**Current**: Sponsorships go to "community pool" (abstract concept)

**Proposed**: Community wallet has REAL balance from:

- Needs sponsorships (existing)
- Module sales revenue (NEW)
- Donations (existing)

**Usage**:

- Fund needs (already have this)
- Withdraw to bank (NEW - for paying facilitators, supplies)
- Invest in content creation (NEW - pay designers, videographers)

---

## 🎯 **SUPER ADMIN DASHBOARD CONNECTION**

### **What Exists:**

You mentioned you already have a super admin dashboard.

### **What Needs to Connect:**

```
/admin/ (Super Admin Dashboard)
├─ /overview
├─ /communities (all communities)
├─ /corporate-accounts 🆕 (concientizaciones customers)
├─ /marketplace 🆕
│  ├─ /modules (all published modules)
│  ├─ /applications (pending creator apps)
│  ├─ /sales (revenue dashboard)
│  └─ /analytics (module performance)
├─ /wallets 🆕
│  ├─ /community-wallets (all community balances)
│  ├─ /creator-wallets (all creator balances)
│  ├─ /platform-treasury (platform revenue)
│  └─ /transactions (all wallet activity)
├─ /users
└─ /settings
```

---

## 📊 **IMPLEMENTATION ROADMAP**

### **Phase 1: Wallet Infrastructure** (2-3 days)

- [ ] Create `wallets` table
- [ ] Create `wallet_transactions` table
- [ ] Create `module_sales` table
- [ ] Build wallet API endpoints:
  - `GET /api/wallets/[id]` - Get wallet balance
  - `GET /api/wallets/[id]/transactions` - Get transaction history
  - `POST /api/wallets/[id]/withdraw` - Request withdrawal
- [ ] Create Wallet UI component (reusable)

### **Phase 2: Move Module Builder to Community Dashboard** (1-2 days)

- [ ] Move `/creator/module-builder` → `/communities/[id]/admin-panel/modules/create`
- [ ] Add "Modules" tab to community admin dashboard
- [ ] Show modules created by this community
- [ ] Show earnings from each module

### **Phase 3: Connect Marketplace to Wallets** (2-3 days)

- [ ] When module purchased → create `module_sales` record
- [ ] Split payment into 3 wallet transactions:
  - Credit community wallet (50%)
  - Credit creator wallet (20%)
  - Credit platform treasury (30%)
- [ ] Show revenue in community dashboard
- [ ] Show revenue in creator's personal wallet

### **Phase 4: Super Admin Integration** (1-2 days)

- [ ] Add "Corporate Accounts" section to super admin
- [ ] Add "Marketplace" section to super admin
- [ ] Add "Wallets" overview to super admin
- [ ] Show all transactions, sales, revenue splits

### **Phase 5: Withdrawal System** (Optional, Future)

- [ ] Stripe Connect or PayPal integration
- [ ] KYC/verification for withdrawals
- [ ] Payout schedule (monthly, on-demand)
- [ ] Tax reporting (1099 forms, etc.)

---

## 🎭 **USER JOURNEYS**

### **Journey 1: Community Creates Module**

1. **Colonia Verde** community admin logs in
2. Goes to `/communities/colonia-verde/admin-panel/modules`
3. Clicks "Create New Module"
4. Uses module builder:
   - Title: "Clean Air Implementation Guide"
   - 5 lessons with activities
   - Includes tools: Air Quality Calculator, Evidence Uploader
5. Submits for review
6. Platform admin approves
7. Module published to marketplace
8. **"Empresa X"** purchases module for $18,000 MXN
9. Revenue split:
   - $9,000 → Colonia Verde wallet
   - $3,600 → Creator (María) wallet
   - $5,400 → Platform treasury
10. Colonia Verde sees $9,000 in wallet
11. Uses funds to:
    - Sponsor local air quality monitors ($2,000)
    - Pay María for module creation ($1,500)
    - Host community workshop ($500)
    - Save rest for future projects ($5,000)

### **Journey 2: Corporate Purchases Training**

1. **Empresa X** admin browses marketplace
2. Finds "Clean Air Implementation Guide" by Colonia Verde
3. Sees testimonials, preview, pricing
4. Adds to cart (100 employees = 2 packs = $26,000 MXN)
5. Completes purchase (Stripe/credit card)
6. System creates:
   - Corporate account access
   - 100 employee invitations
   - Revenue split transactions
7. Employees complete training
8. Company gets "Conscious Company" certificate
9. Community gets funded
10. **Everyone wins** 🎉

---

## ⚡ **CRITICAL DECISIONS NEEDED**

### **1. Module Builder Location**

**Option A**: Community dashboard (`/communities/[id]/admin-panel/modules`)
**Option B**: Separate creator portal (`/creator/dashboard`)

**Recommendation**: **Option A** - aligns with "communities create modules" vision

### **2. Wallet Visibility**

**Community Wallet**: Should all community members see balance?

- **Proposal**: Admins see full details, members see total only

**Creator Wallet**: Private or community-visible?

- **Proposal**: Private to creator, but community admins see aggregated creator earnings

### **3. Revenue Split Flexibility**

Should the 30/50/20 split be configurable per module?

- **Proposal**: Start fixed, allow custom splits later (e.g., 25/60/15 for certain categories)

### **4. Withdrawal Minimums**

Prevent micro-withdrawals that cost more in fees

- **Proposal**: Minimum $500 MXN withdrawal, monthly payout schedule

### **5. Creator Application Flow**

Currently at `/creator/apply`. Should this be:

- **Option A**: Community admin applies on behalf of community
- **Option B**: Individual applies, then chooses their community
- **Recommendation**: **Option A** - community-first model

---

## 🚀 **RECOMMENDED NEXT STEPS**

1. **Review this plan** - Does it align with your vision?
2. **Make key decisions** - Builder location, wallet visibility, etc.
3. **Start with Phase 1** - Build wallet infrastructure
4. **Connect to existing features** - Integrate step by step
5. **Test revenue flow** - Ensure splits work correctly
6. **Polish UI/UX** - Make wallets beautiful and intuitive
7. **Launch** - Go live with marketplace → revenue → community funding loop!

---

## 💡 **WHY THIS MATTERS**

This isn't just about payments. It's about:

✅ **Closing the loop**: Communities create content → Get paid → Fund more projects
✅ **Authentic storytelling**: Modules come from real communities with real results
✅ **Sustainable income**: Communities have recurring revenue (not just donations)
✅ **Scalable impact**: One community's solution helps hundreds of companies
✅ **Marketplace network effects**: More communities → More modules → More corporate buyers → More funding

**This is the core of your platform's value proposition.**

---

_Ready to build? Let's start with Phase 1: Wallet Infrastructure._
