# 🌍 Crowd Conscious: Complete Platform Documentation

**Version**: 2.0  
**Last Updated**: November 5, 2025  
**Status**: Phase 1 Implementation (Universal Marketplace)  
**Owner**: Francisco Blockstrand

---

## 📋 **Table of Contents**

1. [Vision & Mission](#vision--mission)
2. [Platform Overview](#platform-overview)
3. [Architecture & Technical Stack](#architecture--technical-stack)
4. [User Types & Roles](#user-types--roles)
5. [Core Features & Modules](#core-features--modules)
6. [User Flows & Journeys](#user-flows--journeys)
7. [Revenue Model & Pricing](#revenue-model--pricing)
8. [Database Schema](#database-schema)
9. [API Architecture](#api-architecture)
10. [Stripe Integration](#stripe-integration)
11. [Admin Dashboard](#admin-dashboard)
12. [Future Roadmap](#future-roadmap)

---

## 🎯 **Vision & Mission**

### **Vision**

Transform how companies and communities create lasting social impact by connecting corporate learning with grassroots action.

### **Mission**

Build a platform where:

- **Communities** share their needs and solutions, creating educational content and earning sustainable revenue
- **Companies** train employees in sustainability and social impact, driving real change
- **Individuals** learn, contribute, and make a difference in their neighborhoods
- **Everyone** wins through a circular economy of learning, action, and impact

### **Core Insight**

Companies want ESG compliance and employee engagement. Communities want real change and sustainable funding. Employees want meaningful work. We connect all three through our integrated two-platform system.

---

## 🏗️ **Platform Overview**

Crowd Conscious is **TWO interconnected platforms** that work seamlessly together:

### **Platform 1: Community Impact Platform** (Main App)

**URL**: `crowdconscious.app`

**Purpose**: Communities create, share needs, get sponsorships, and take action

**Key Features**:

- Community creation and management
- Needs posting and sponsorship
- Project submissions and tracking
- Impact measurement
- Community wallet (funding pool)
- Content feed (posts, polls, events)
- Comments and engagement
- Brand/sponsor portal

**Users**:

- Community members
- Community admins
- Volunteers
- Donors/sponsors
- Brands (B2B sponsors)

---

### **Platform 2: Organizational Learning** (Formerly "Corporate Training")

**URL**: `crowdconscious.app/marketplace` + `/dashboard`

**Purpose**: Organizations buy training modules, learners complete courses, communities get paid

**Key Features**:

- **Marketplace**: Browse and purchase educational modules
- **Learning Platform**: Course enrollment, progress tracking, certificates
- **Cart & Checkout**: Stripe-powered purchasing
- **Module Builder**: Communities create and sell courses
- **Revenue Distribution**: Automated splits (Platform 30% | Community 50% | Creator 20%)
- **Dynamic Pricing**: Community-set pricing with individual, team, and enterprise tiers

**Users**:

- Individual learners (NEW in Phase 1)
- Team/corporate admins
- Employees (team members)
- Community creators (module builders)
- Platform admins

### **Rebranding Note**

We're evolving from "Corporate-Only" to "**Organizational Learning**" or "**Impact Education**" to reflect that both individuals AND organizations can now purchase and learn.

---

## 🛠️ **Architecture & Technical Stack**

### **Frontend**

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom design system
- **State Management**: React hooks + Context
- **Real-time**: Supabase Realtime subscriptions

### **Backend**

- **API**: Next.js API Routes (serverless)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (images, videos, files)
- **Real-time**: Supabase Realtime (comments, notifications)

### **Infrastructure**

- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **CDN**: Vercel Edge Network
- **Email**: Resend
- **Payments**: Stripe
- **Monitoring**: Supabase Dashboard + Console logs

### **Key Libraries**

- `@supabase/supabase-js` - Database client
- `stripe` - Payment processing
- `@supabase/ssr` - Server-side rendering auth
- `next/image` - Image optimization
- `react-hook-form` - Form handling
- `zod` - Validation

---

## 👥 **User Types & Roles**

### **1. Community Platform Users**

#### **Regular Community Member**

- Join communities
- Post content (needs, updates, projects)
- Comment and engage
- Register for events
- Submit project evidence
- Vote in polls

#### **Community Admin**

- Create and manage community
- Approve/reject member requests
- Create module content (if verified creator)
- Manage community wallet
- View analytics
- Moderate content

#### **Brand/Sponsor**

- Toggle to "Brand Mode"
- Browse community needs
- Sponsor projects
- Track impact of sponsorships
- Apply for partnerships

#### **Platform Super Admin**

- Manage all communities
- Approve/reject communities
- Moderate content platform-wide
- Manage wallets and transactions
- Review and approve modules
- Analytics and reporting

---

### **2. Organizational Learning Users**

#### **Individual Learner** (NEW - Phase 1)

- Browse marketplace
- Purchase modules for personal use
- Complete courses
- Track progress
- Earn certificates
- View personal dashboard

#### **Team/Corporate Admin** (Previously "Corporate Admin")

- Browse marketplace
- Purchase modules for team (bulk)
- Manage team members
- Invite employees
- View team progress
- Download reports
- Manage corporate account

#### **Team Member/Employee**

- Complete assigned courses
- Track personal progress
- Earn certificates
- View team leaderboard
- Submit mini-projects

#### **Community Creator**

- Create educational modules
- Set pricing
- Earn revenue (20% creator share)
- View earnings
- Track module performance

---

## ✨ **Core Features & Modules**

### **A. Community Platform Features**

#### **1. Communities**

- Community creation with approval workflow
- Public profiles (name, description, location, impact area)
- Member management
- Community-specific content feed
- Impact metrics dashboard
- Wallet/treasury system

#### **2. Needs Posting & Sponsorship**

- Communities post needs (equipment, supplies, funding)
- Categories: Environment, Education, Health, Safety, etc.
- Sponsorship matching
- Progress tracking
- Evidence submission (photos, receipts)
- Completion verification

#### **3. Content Feed**

- Posts (text, images, videos)
- Polls (voting with results)
- Events (RSVP system)
- Comments (real-time)
- Reactions/likes
- Sorting (recent, popular, etc.)

#### **4. Community Wallet**

- Balance tracking (MXN)
- Transaction history
- Sources: Module sales revenue (50%), sponsorships, donations
- Uses: Fund needs, pay facilitators, create more content
- Withdrawal system (future)

#### **5. Brand Portal**

- Toggle between User/Brand modes
- Browse sponsorship opportunities
- Filter by impact area, location, budget
- Apply for partnerships
- Track sponsored projects
- Impact reporting

---

### **B. Organizational Learning Features**

#### **1. Marketplace**

- Browse published modules
- Filter by: Topic, Difficulty, Price, Creator
- Module details: Description, lessons, duration, reviews
- Preview content
- Dynamic pricing display
- Reviews and ratings

#### **2. Cart & Checkout**

- Add modules to cart
- Adjust quantity (employees/learners)
- Real-time price calculation
- Stripe Checkout integration
- Support for individuals AND teams
- Order confirmation

#### **3. Module Player**

- Lesson navigation
- Video content support
- Interactive activities
- Quizzes and assessments
- Progress tracking
- Evidence submission
- Certificate generation

#### **4. Module Builder** (Creator Portal)

- Multi-step module creation
- Lesson content editor
- Upload videos, images, files
- Create quizzes and activities
- **Pricing configuration** (NEW in Phase 1)
  - Set base price
  - Set per-pack pricing
  - Preview revenue distribution
  - See pricing tiers
- Submit for review
- Edit published modules

#### **5. Dashboard (Unified)**

Adapts based on user type:

**Individual Learner Dashboard**:

- My Courses (in progress, completed)
- Next lesson recommendations
- Certificates earned
- Personal progress metrics
- Explore more modules

**Team Admin Dashboard**:

- Team overview (enrolled, active, completed)
- Purchase history
- Team leaderboards
- Analytics (completion rates, time spent)
- Download reports (ESG, impact)
- Manage team members

**Employee Dashboard**:

- My assigned courses
- Progress tracking
- Team leaderboard position
- Next assignments
- Certificates

**Creator Dashboard**:

- My modules (drafts, published, pending review)
- Revenue earned
- Module performance
- Student feedback
- Create new module

---

## 🚶 **User Flows & Journeys**

### **Journey 1: Community Creates & Monetizes Module**

1. **Community Admin** logs into Crowd Conscious
2. Navigates to Community Dashboard → Modules
3. Clicks "Create New Module"
4. **Module Builder Workflow**:
   - Step 1: Basic Info (title, description, difficulty)
   - Step 2: Lessons (add content, videos, activities)
   - Step 3: Quizzes (create assessments)
   - Step 4: **Pricing** (NEW)
     - Set base price (e.g., $18,000 MXN)
     - Set per-pack price (e.g., $8,000 MXN)
     - Set individual price (e.g., $360 MXN)
     - Preview revenue split:
       - 50% → Community wallet
       - 20% → Creator (you)
       - 30% → Platform
     - See pricing tiers (1 person, 50 people, 100 people)
   - Step 5: Review & Submit
5. Platform admin reviews and approves
6. Module published to marketplace
7. **Purchase happens** (by company or individual)
8. **Revenue distribution** (automated):
   - $9,000 → Colonia Verde community wallet
   - $3,600 → María (creator) wallet
   - $5,400 → Platform treasury
9. Community sees funds in wallet
10. Community uses funds to:
    - Post new needs
    - Fund local projects
    - Pay facilitators
    - Create more modules

**Key Insight**: This closes the loop - communities create content → get paid → fund more impact → create more content.

---

### **Journey 2: Individual Purchases Module** (NEW - Phase 1)

1. **Elena** (individual learner) visits `crowdconscious.app`
2. Clicks "Marketplace" in navigation
3. Browses modules, finds "Clean Air Implementation"
4. Clicks to view details
5. Sees **individual pricing**: $360 MXN (not $18,000!)
6. Reads description, reviews, preview
7. Clicks "Add to Cart"
8. Cart shows: 1 module, 1 person, $360 MXN
9. Clicks "Checkout"
10. **Stripe Checkout**:
    - Enters payment details
    - Confirms purchase
11. Redirected to success page
12. **Enrollment created** (automatic):
    - Elena enrolled in "Clean Air Implementation"
    - `purchase_type = 'individual'`
    - `user_id = elena_id`
    - `corporate_account_id = null`
13. Elena goes to `/dashboard`
14. Sees "My Courses" with new module
15. Starts learning!

**Key Difference from Corporate**: Quantity = 1, price per person, immediate enrollment, personal dashboard.

---

### **Journey 3: Team/Company Purchases Module**

1. **Carlos** (HR Director at "Empresa Verde") logs in
2. Navigates to Marketplace
3. Finds "Clean Air Implementation"
4. **Sees team pricing**:
   - Employee selector appears
   - Sets quantity: 75 employees
   - Sees total: $26,000 MXN (2 packs)
   - Price per employee: $347 MXN
5. Adds to cart
6. Cart shows: 1 module, 75 employees, $26,000 MXN
7. Proceeds to checkout
8. **Stripe Checkout**:
   - Company billing info
   - Payment (corporate card)
9. Success! Purchase confirmed
10. **Bulk enrollment** (automatic webhook):
    - Fetches all 75 employees from company profile
    - Creates 75 enrollments
    - Each gets: `purchase_type = 'corporate'`, `corporate_account_id = empresa_verde_id`
11. **Email notifications**:
    - Carlos: "Purchase confirmed! Your team has been enrolled."
    - All 75 employees: "You've been enrolled in Clean Air Implementation!"
12. Carlos goes to Team Dashboard
13. Sees: 75 enrolled, 0 started, 0 completed
14. Tracks team progress over time
15. Downloads completion report for ESG reporting

**Key Features**: Bulk enrollment, team management, progress tracking, reporting.

---

### **Journey 4: Community Posts Need & Gets Sponsored**

1. **Colonia Verde** community admin posts a need:
   - Title: "Air Quality Monitors"
   - Description: "We need 5 monitors to track pollution"
   - Amount: $10,000 MXN
   - Category: Environment
   - Evidence required: Photos + receipts
2. Need published to community feed
3. Need also visible in Brand Portal
4. **"EcoTech Solutions"** (sponsor) browses Brand Portal
5. Filters: Environment + Mexico City
6. Finds Colonia Verde's need
7. Clicks "Sponsor This Need"
8. Applies for partnership:
   - Company info
   - Message to community
   - Commitment amount: $10,000 MXN
9. Community admin reviews application
10. Approves sponsorship
11. **Funds transferred** to community wallet
12. Community purchases air quality monitors
13. Community submits evidence:
    - Photos of monitors installed
    - Receipts from purchase
    - Air quality data
14. EcoTech Solutions sees impact:
    - Evidence displayed
    - Air quality improvements shown
    - Public recognition on platform
15. Both parties happy - community funded, brand gets CSR impact

---

## 💰 **Revenue Model & Pricing**

### **Platform Revenue Streams**

#### **1. Module Sales (Primary Revenue)**

**Platform Modules** (`is_platform_module = true`):

- Created by Crowd Conscious team
- Premium tools and integrations
- **100% revenue to platform**
- Fixed pricing: $18,000 base + $8,000 per additional pack

**Community Modules** (`is_platform_module = false`):

- Created by verified communities
- Community sets pricing
- **Revenue split**:
  - **50%** → Community wallet
  - **20%** → Individual creator
  - **30%** → Platform
- Minimum recommended price: $300 MXN
- No maximum (market decides)

**Example**:

- Community sets price: $18,000 MXN
- Sale happens
- Distribution:
  - $9,000 → Community wallet
  - $3,600 → Creator wallet
  - $5,400 → Platform

---

### **Pricing Tiers (Universal - Phase 1)**

#### **Individual Purchase**

- **Who**: Individual learners
- **Quantity**: 1 person
- **Pricing**: `base_price_mxn / 50` OR `individual_price_mxn`
- **Example**: $18,000 / 50 = **$360 MXN**
- **Use Case**: Personal development, freelancers, entrepreneurs

#### **Team Purchase**

- **Who**: Small teams (5-20 people)
- **Quantity**: 5-20 people
- **Pricing**: `(base_price_mxn / 50) × count × (1 - team_discount)`
- **Discount**: 10% team discount
- **Example**: $360 × 10 × 0.9 = **$3,240 MXN** (10 people)
- **Use Case**: Startups, small businesses, departments

#### **Corporate Purchase**

- **Who**: Medium to large companies
- **Quantity**: 50-500 people
- **Pricing**: Pack-based (50 per pack)
  - Pack 1 (1-50): `base_price_mxn`
  - Pack 2 (51-100): `base_price_mxn + price_per_50_employees`
  - Pack 3 (101-150): `base_price_mxn + (price_per_50_employees × 2)`
- **Example**:
  - 75 employees = 2 packs
  - $18,000 + $8,000 = **$26,000 MXN**
  - Per person: $347 MXN
- **Use Case**: Established companies, ESG programs, HR initiatives

#### **Enterprise Purchase**

- **Who**: Large corporations (500+ people)
- **Quantity**: 500+ people
- **Pricing**: Negotiated, volume discounts
- **Example**: Custom pricing based on needs
- **Use Case**: Multinational corporations, government programs

---

### **Pricing Calculation Logic**

```typescript
// lib/pricing.ts - Core pricing function

export function calculateModulePrice(
  module: {
    base_price_mxn: number;
    price_per_50_employees: number;
    individual_price_mxn?: number;
    team_discount_percent?: number;
  },
  userCount: number,
  purchaseType?: "individual" | "team" | "corporate"
): number {
  // Individual
  if (userCount === 1) {
    return (
      module.individual_price_mxn || Math.round(module.base_price_mxn / 50)
    );
  }

  // Team (with discount)
  if (userCount <= 20) {
    const pricePerPerson = module.base_price_mxn / 50;
    const discount = module.team_discount_percent || 10;
    return Math.round((pricePerPerson * userCount * (100 - discount)) / 100);
  }

  // Corporate (pack-based)
  const packs = Math.ceil(userCount / 50);
  return module.base_price_mxn + (packs - 1) * module.price_per_50_employees;
}
```

---

### **Historical Context: Legacy Pricing**

**OLD MODEL (Pre-Phase 1)**: Corporate-Only

- Only companies could purchase
- Minimum purchase: 50 employees
- No individual access
- Fixed pricing structure

**NEW MODEL (Phase 1 - Current)**: Universal Access

- Individuals can purchase (1 person)
- Teams can purchase (5-20 people)
- Companies can purchase (50+ people)
- Dynamic pricing based on quantity
- Community-set pricing for community modules

**Why the change?**

- 10x larger addressable market
- Lower barrier to entry
- Individual learners → word-of-mouth growth
- More diverse revenue streams
- Competitive with Coursera, Udemy, etc.

---

## 🗄️ **Database Schema**

### **Core Tables**

#### **users** (Supabase Auth)

```sql
-- Managed by Supabase Auth
id UUID PRIMARY KEY
email TEXT UNIQUE
created_at TIMESTAMP
```

#### **profiles**

```sql
id UUID PRIMARY KEY REFERENCES auth.users(id)
full_name TEXT
avatar_url TEXT
bio TEXT
is_corporate_user BOOLEAN DEFAULT false
corporate_account_id UUID REFERENCES corporate_accounts(id)
corporate_role TEXT -- 'admin', 'employee', null
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

### **Community Platform Tables**

#### **communities**

```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
slug TEXT UNIQUE NOT NULL
description TEXT
location TEXT
impact_area TEXT[] -- e.g., ['environment', 'education']
admin_id UUID REFERENCES profiles(id)
status TEXT -- 'pending', 'approved', 'rejected'
member_count INTEGER DEFAULT 0
logo_url TEXT
banner_url TEXT
created_at TIMESTAMP
```

#### **community_members**

```sql
id UUID PRIMARY KEY
community_id UUID REFERENCES communities(id)
user_id UUID REFERENCES profiles(id)
role TEXT -- 'member', 'moderator', 'admin'
joined_at TIMESTAMP
UNIQUE(community_id, user_id)
```

#### **community_content** (Posts, Polls, Events)

```sql
id UUID PRIMARY KEY
community_id UUID REFERENCES communities(id)
author_id UUID REFERENCES profiles(id)
content_type TEXT -- 'post', 'poll', 'event'
title TEXT
content TEXT
images TEXT[] -- URLs
metadata JSONB -- Poll options, event details, etc.
likes_count INTEGER DEFAULT 0
comments_count INTEGER DEFAULT 0
created_at TIMESTAMP
```

#### **comments**

```sql
id UUID PRIMARY KEY
content_id UUID REFERENCES community_content(id)
author_id UUID REFERENCES profiles(id)
content TEXT NOT NULL
parent_comment_id UUID REFERENCES comments(id) -- For replies
created_at TIMESTAMP
```

#### **needs** (Sponsorship opportunities)

```sql
id UUID PRIMARY KEY
community_id UUID REFERENCES communities(id)
title TEXT NOT NULL
description TEXT
amount_needed NUMERIC(10, 2)
amount_raised NUMERIC(10, 2) DEFAULT 0
category TEXT -- 'environment', 'education', 'health'
status TEXT -- 'open', 'in_progress', 'completed'
evidence_urls TEXT[] -- Photos/receipts after completion
created_at TIMESTAMP
```

---

### **Organizational Learning Tables**

#### **corporate_accounts**

```sql
id UUID PRIMARY KEY
company_name TEXT NOT NULL
industry TEXT
employee_count INTEGER
admin_user_id UUID REFERENCES profiles(id)
subscription_status TEXT
created_at TIMESTAMP
```

#### **marketplace_modules**

```sql
id UUID PRIMARY KEY
community_id UUID REFERENCES communities(id)
creator_id UUID REFERENCES profiles(id) -- Individual creator
title TEXT NOT NULL
slug TEXT UNIQUE NOT NULL
description TEXT
difficulty_level TEXT -- 'beginner', 'intermediate', 'advanced'
estimated_duration_hours INTEGER
thumbnail_url TEXT

-- PRICING (Phase 1 additions)
base_price_mxn INTEGER NOT NULL -- Base price for 50 people
price_per_50_employees INTEGER NOT NULL -- Additional packs
individual_price_mxn INTEGER -- Price for 1 person (if null, calculated as base/50)
team_price_mxn INTEGER -- Optional team pricing
team_discount_percent INTEGER DEFAULT 10 -- Team discount %

-- MODULE TYPE
is_platform_module BOOLEAN DEFAULT false -- Platform modules = 100% revenue
price_set_by_community BOOLEAN DEFAULT true -- Can community change price?
platform_suggested_price INTEGER -- Guidance from platform

-- METADATA
status TEXT -- 'draft', 'pending_review', 'published', 'rejected'
avg_rating NUMERIC(2, 1)
review_count INTEGER DEFAULT 0
enrollment_count INTEGER DEFAULT 0
created_at TIMESTAMP
updated_at TIMESTAMP
```

#### **module_lessons**

```sql
id UUID PRIMARY KEY
module_id UUID REFERENCES marketplace_modules(id)
lesson_number INTEGER NOT NULL
title TEXT NOT NULL
content TEXT -- Rich text / markdown
video_url TEXT
estimated_minutes INTEGER
quiz_questions JSONB -- Array of question objects
created_at TIMESTAMP
```

#### **cart_items** (Phase 1 - Universal)

```sql
id UUID PRIMARY KEY
-- EITHER user_id OR corporate_account_id (not both)
user_id UUID REFERENCES auth.users(id) -- NEW in Phase 1
corporate_account_id UUID REFERENCES corporate_accounts(id)
module_id UUID REFERENCES marketplace_modules(id)
employee_count INTEGER NOT NULL DEFAULT 1 -- Quantity
price_snapshot NUMERIC(10, 2) NOT NULL -- Price at time of adding
added_at TIMESTAMP

-- CONSTRAINTS
CONSTRAINT cart_owner_check CHECK (
  (user_id IS NOT NULL AND corporate_account_id IS NULL) OR
  (user_id IS NULL AND corporate_account_id IS NOT NULL)
)

-- UNIQUE INDEXES
CREATE UNIQUE INDEX cart_items_user_module_unique
ON cart_items(user_id, module_id) WHERE user_id IS NOT NULL

CREATE UNIQUE INDEX cart_items_corporate_module_unique
ON cart_items(corporate_account_id, module_id) WHERE corporate_account_id IS NOT NULL
```

#### **course_enrollments** (Phase 1 - Universal)

```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES auth.users(id) NOT NULL -- Renamed from employee_id
corporate_account_id UUID REFERENCES corporate_accounts(id) -- NOW NULLABLE
module_id UUID REFERENCES marketplace_modules(id)

-- NEW in Phase 1
purchase_type TEXT DEFAULT 'corporate' -- 'individual', 'team', 'corporate', 'enterprise', 'gift'
purchased_at TIMESTAMP -- When purchased
purchase_price_snapshot NUMERIC(10, 2) -- Price paid

-- PROGRESS TRACKING
progress_percentage INTEGER DEFAULT 0
completed BOOLEAN DEFAULT false
completion_date TIMESTAMP
certificate_url TEXT
enrolled_at TIMESTAMP
last_accessed_at TIMESTAMP
```

#### **lesson_responses** (User progress on lessons)

```sql
id UUID PRIMARY KEY
enrollment_id UUID REFERENCES course_enrollments(id)
lesson_id UUID REFERENCES module_lessons(id)
completed BOOLEAN DEFAULT false
quiz_score INTEGER -- Percentage
evidence_urls TEXT[] -- Uploaded files for mini-projects
completed_at TIMESTAMP
```

---

### **Wallet & Revenue Tables** (Phase 1)

#### **wallets**

```sql
id UUID PRIMARY KEY
owner_type TEXT NOT NULL -- 'community', 'user', 'platform'
owner_id UUID -- community_id, user_id, or NULL for platform
balance NUMERIC(10, 2) DEFAULT 0.00
currency TEXT DEFAULT 'MXN'
created_at TIMESTAMP
updated_at TIMESTAMP

UNIQUE(owner_type, owner_id)
```

#### **wallet_transactions**

```sql
id UUID PRIMARY KEY
wallet_id UUID REFERENCES wallets(id)
type TEXT NOT NULL -- 'credit' (money in), 'debit' (money out)
amount NUMERIC(10, 2) NOT NULL
source TEXT NOT NULL -- 'module_sale', 'withdrawal', 'sponsorship', 'refund'
source_id UUID -- Reference to original transaction (module_sale_id, etc.)
description TEXT
status TEXT DEFAULT 'completed' -- 'pending', 'completed', 'failed'
created_at TIMESTAMP
```

#### **module_sales** (Revenue distribution tracking)

```sql
id UUID PRIMARY KEY
module_id UUID REFERENCES marketplace_modules(id)
corporate_account_id UUID REFERENCES corporate_accounts(id) -- Can be NULL for individuals
buyer_user_id UUID REFERENCES auth.users(id) -- Buyer (individual or admin)
total_amount NUMERIC(10, 2) NOT NULL
employee_count INTEGER NOT NULL -- Quantity purchased

-- REVENUE SPLIT
platform_fee NUMERIC(10, 2) NOT NULL -- 30% or 100% for platform modules
community_share NUMERIC(10, 2) NOT NULL -- 50%
creator_share NUMERIC(10, 2) NOT NULL -- 20%

-- WALLET REFERENCES
community_wallet_id UUID REFERENCES wallets(id)
creator_wallet_id UUID REFERENCES wallets(id)

-- METADATA
stripe_session_id TEXT -- Stripe checkout session
purchase_type TEXT -- 'individual', 'team', 'corporate'
purchased_at TIMESTAMP
```

---

### **Row Level Security (RLS) Policies**

**Key Principle**: Users can only access their own data unless they're admins.

#### **cart_items RLS**

```sql
-- Users can view own cart
CREATE POLICY "Users can view own cart" ON cart_items FOR SELECT
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
)

-- Users can add to own cart
CREATE POLICY "Users can add to own cart" ON cart_items FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
)

-- Similar for UPDATE and DELETE
```

#### **course_enrollments RLS**

```sql
-- Users can view own enrollments
CREATE POLICY "Users can view own enrollments" ON course_enrollments FOR SELECT
USING (
  user_id = auth.uid() OR
  corporate_account_id IN (
    SELECT corporate_account_id FROM profiles
    WHERE id = auth.uid() AND corporate_role = 'admin'
  )
)
```

---

## 🔌 **API Architecture**

### **API Route Structure**

```
/api/
├─ auth/
│  ├─ callback/route.ts           # OAuth callback
│  └─ signout/route.ts             # Logout
│
├─ cart/
│  ├─ route.ts                     # GET: Fetch cart
│  ├─ add/route.ts                 # POST: Add to cart
│  ├─ update/route.ts              # PUT: Update quantity
│  ├─ remove/route.ts              # DELETE: Remove item
│  ├─ clear/route.ts               # DELETE: Clear cart
│  └─ checkout/route.ts            # POST: Create Stripe session
│
├─ marketplace/
│  ├─ modules/route.ts             # GET: List modules
│  ├─ modules/[id]/route.ts        # GET: Module details
│  └─ featured/route.ts            # GET: Featured modules
│
├─ enrollments/
│  ├─ route.ts                     # GET: User enrollments
│  ├─ [id]/route.ts                # GET: Enrollment details
│  └─ [id]/progress/route.ts       # PUT: Update progress
│
├─ communities/
│  ├─ route.ts                     # GET: List, POST: Create
│  ├─ [id]/route.ts                # GET: Details, PUT: Update
│  ├─ [id]/members/route.ts        # GET: List members, POST: Join
│  └─ [id]/content/route.ts        # GET: Content feed, POST: Create
│
├─ needs/
│  ├─ route.ts                     # GET: List needs
│  ├─ create/route.ts              # POST: Create need
│  └─ [id]/sponsor/route.ts        # POST: Sponsor need
│
├─ webhooks/
│  └─ stripe/route.ts              # POST: Stripe webhook events
│
└─ admin/
   ├─ communities/route.ts          # Admin: Approve communities
   ├─ modules/route.ts              # Admin: Approve modules
   └─ users/route.ts                # Admin: User management
```

---

### **Key API Endpoints (Detailed)**

#### **GET /api/cart** (Phase 1 - Updated)

Fetch current user's cart items

**Query Params**: None

**Response**:

```json
{
  "items": [
    {
      "id": "cart-item-uuid",
      "module_id": "module-uuid",
      "employee_count": 75,
      "price_snapshot": 26000,
      "added_at": "2024-10-01T10:00:00Z",
      "module": {
        "id": "module-uuid",
        "title": "Clean Air Implementation",
        "thumbnail_url": "https://...",
        "base_price_mxn": 18000,
        "price_per_50_employees": 8000
      },
      "total_price": 26000,
      "price_per_employee": 347
    }
  ],
  "summary": {
    "item_count": 1,
    "total_price": 26000,
    "total_employees": 75
  }
}
```

**Authentication**: Required (Supabase Auth)

**Logic**:

1. Get current user from Supabase Auth
2. Get user profile to determine if corporate admin or individual
3. If corporate admin: Fetch cart where `corporate_account_id = X`
4. If individual: Fetch cart where `user_id = X`
5. Join with `marketplace_modules` to get module details
6. Calculate totals
7. Return enriched cart

---

#### **POST /api/cart/add** (Phase 1 - Updated)

Add module to cart

**Request Body**:

```json
{
  "moduleId": "module-uuid",
  "employeeCount": 75 // Optional, defaults to 1 for individuals
}
```

**Response**:

```json
{
  "message": "Module added to cart",
  "cartItem": { ... },
  "action": "added" // or "updated" if already in cart
}
```

**Authentication**: Required

**Logic**:

1. Validate user is authenticated
2. Get user profile
3. Determine if corporate admin or individual
4. **Validate employee count**:
   - If individual: `employeeCount` must be 1
   - If corporate: `employeeCount` must be >= 1
5. Fetch module from database
6. Validate module is published
7. **Check if already owned** (prevent duplicate purchases)
8. **Calculate price** using `lib/pricing.ts`
9. **Insert or update** cart item:
   - If individual: `user_id = user.id`, `corporate_account_id = null`
   - If corporate: `user_id = null`, `corporate_account_id = X`
10. Return success

---

#### **POST /api/cart/checkout** (Phase 1 - Updated)

Create Stripe Checkout session

**Request Body**: None (uses cart)

**Response**:

```json
{
  "url": "https://checkout.stripe.com/...",
  "sessionId": "cs_test_..."
}
```

**Authentication**: Required

**Logic**:

1. Validate user
2. Determine user type (individual vs corporate)
3. Fetch cart items
4. Validate cart is not empty
5. Create Stripe line items from cart
6. Create Stripe Checkout Session with metadata:
   - `user_id`: Buyer user ID
   - `corporate_account_id`: If corporate purchase
   - `purchase_type`: 'individual' or 'corporate'
   - `cart_items`: JSON string of cart item IDs
7. Return session URL (redirect user to Stripe)

---

#### **POST /api/webhooks/stripe** (Phase 1 - Updated)

Handle Stripe webhook events

**Headers**: `stripe-signature` (for verification)

**Events Handled**:

- `checkout.session.completed` - Payment successful

**Logic**:

1. **Verify webhook signature** (security!)
2. Parse event
3. If `checkout.session.completed`:
   - Extract metadata: `user_id`, `purchase_type`, `corporate_account_id`, `cart_items`
   - Fetch cart items from database
   - **For each module**:
     - **Revenue distribution**:
       - Call `process_module_sale()` RPC function
       - Split: 30% platform | 50% community | 20% creator
       - Credit appropriate wallets
     - **Enrollments**:
       - If `purchase_type = 'individual'`:
         - Create 1 enrollment for user
       - If `purchase_type = 'corporate'`:
         - Fetch all employees of corporate account
         - Create enrollment for each employee
     - Set `purchase_type`, `purchased_at`, `purchase_price_snapshot`
   - **Clear cart** after successful enrollment
   - **Send email notifications** (user + employees)
4. Return 200 OK

**Critical**: This is where money gets distributed!

---

## 💳 **Stripe Integration**

### **Setup**

- **Stripe Account**: Production + Test modes
- **Webhook Endpoint**: `https://crowdconscious.app/api/webhooks/stripe`
- **Events Subscribed**: `checkout.session.completed`

### **Flow**

#### **1. Checkout Creation**

```typescript
// app/api/cart/checkout/route.ts

const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'mxn',
        product_data: {
          name: 'Clean Air Implementation',
          description: '75 employees - Learn to improve air quality'
        },
        unit_amount: 2600000  // $26,000 MXN in cents
      },
      quantity: 1
    }
  ],
  customer_email: user.email,
  metadata: {
    user_id: user.id,
    purchase_type: 'corporate',
    corporate_account_id: 'corp-uuid',
    cart_items: JSON.stringify([...])
  },
  success_url: 'https://crowdconscious.app/checkout/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://crowdconscious.app/marketplace'
})
```

#### **2. User Redirected to Stripe**

- User enters payment details on Stripe's hosted checkout page
- Stripe processes payment securely
- Stripe redirects back to `success_url` or `cancel_url`

#### **3. Webhook Triggered**

- Stripe sends `checkout.session.completed` event to webhook
- Webhook handler processes event:
  - Verifies signature
  - Creates enrollments
  - Distributes revenue
  - Clears cart
  - Sends confirmations

### **Security**

- ✅ **Webhook signature verification** (prevents fake events)
- ✅ **Idempotency** (prevents duplicate processing)
- ✅ **Metadata validation** (ensures data integrity)
- ✅ **Server-side only** (never expose secret keys)

### **Revenue Distribution (Automated)**

When a module is purchased, the webhook calls:

```sql
-- Database function: process_module_sale
CREATE FUNCTION process_module_sale(
  p_module_id UUID,
  p_corporate_account_id UUID,
  p_total_amount NUMERIC,
  p_creator_donates BOOLEAN DEFAULT false
) RETURNS JSONB
```

**This function**:

1. Fetches module details
2. Determines revenue split:
   - If `is_platform_module = true`: 100% → Platform
   - If `is_platform_module = false` and `creator_donates = false`:
     - 30% → Platform wallet
     - 50% → Community wallet
     - 20% → Creator wallet
   - If `creator_donates = true`:
     - 20% → Platform
     - 80% → Community (creator donates their share)
3. Creates wallet transactions for each split
4. Updates wallet balances
5. Records sale in `module_sales` table
6. Returns summary

---

## 👨‍💼 **Admin Dashboard**

### **Super Admin Panel**

**URL**: `/admin` (protected route, super admin only)

**Sections**:

#### **1. Overview Dashboard**

- Total communities: 156
- Total users: 8,432
- Active modules: 42
- Revenue this month: $450,000 MXN
- Charts: Growth over time, top modules, revenue breakdown

#### **2. Communities Management**

- List all communities (pending, approved, rejected)
- Search and filter
- Approve/reject pending communities
- View community details
- Moderate content
- View community wallet balances

#### **3. Modules Management**

- List all modules (draft, pending review, published)
- Approve/reject pending modules
- Preview module content
- Edit pricing (for platform modules)
- View module performance (enrollments, revenue)
- Unpublish if needed

#### **4. Users Management**

- List all users
- Search by name, email
- View user activity
- Ban/unban users
- Impersonate user (for support)
- View user enrollments

#### **5. Marketplace & Sales**

- Recent purchases
- Revenue breakdown (platform vs community vs creator)
- Top-selling modules
- Refund management
- Pricing adjustments

#### **6. Wallets & Finance**

- **Platform Treasury**: Total platform earnings
- **Community Wallets**: List all community balances
- **Creator Wallets**: List all creator earnings
- **Transactions**: All wallet activity
- **Pending Withdrawals**: Approve payouts
- Export financial reports

#### **7. Settings**

- Platform settings
- Email templates
- Feature flags
- Pricing defaults
- Approval workflows

---

### **Community Admin Panel**

**URL**: `/communities/[id]/admin-panel` (community admin only)

**Sections**:

#### **1. Dashboard**

- Community overview
- Member count
- Content stats (posts, comments, events)
- Wallet balance
- Recent activity

#### **2. Members**

- List all members
- Approve/reject join requests
- Assign roles (member, moderator, admin)
- Remove members

#### **3. Content Moderation**

- Review reported content
- Delete inappropriate posts/comments
- Ban users from community

#### **4. Modules** (NEW in Phase 1)

- **My Modules**: List modules created by this community
- **Create New Module**: Launch module builder
- **Earnings**: See revenue from module sales
- **Performance**: View enrollment stats, ratings

#### **5. Wallet**

- Current balance: $45,000 MXN
- Transaction history
- Sources: Module sales (60%), sponsorships (30%), donations (10%)
- **Withdraw Funds**: Request payout to bank account
- **Fund Needs**: Allocate funds to community needs

#### **6. Settings**

- Edit community profile
- Change logo/banner
- Update description
- Manage social links

---

## 🚀 **Future Roadmap**

### **Phase 2: Enhanced Learning (Q1 2026)**

- Live workshops integration
- Video call support
- Peer-to-peer learning
- Certifications with blockchain verification
- Mobile app (iOS + Android)

### **Phase 3: Advanced Analytics (Q2 2026)**

- Impact measurement dashboard
- ESG reporting automation
- Data export for corporate reports
- Custom analytics for admins
- Predictive engagement scoring

### **Phase 4: Marketplace Expansion (Q3 2026)**

- Module bundles
- Subscription models
- Corporate annual plans
- Gift purchases
- Affiliate program for creators

### **Phase 5: Global Expansion (Q4 2026)**

- Multi-language support (EN, ES, PT)
- Multi-currency (MXN, USD, EUR)
- Regional pricing
- International payment methods
- Localized content

### **Phase 6: Enterprise Features (2027)**

- White-label platform
- API access for integrations
- SSO (Single Sign-On)
- Custom LMS integrations
- Dedicated support tiers

---

## 📊 **Success Metrics & KPIs**

### **Community Platform**

- **Communities created**: 156 (target: 500 by EOY)
- **Active communities**: 89 (posting regularly)
- **Total members**: 8,432
- **Needs posted**: 1,245
- **Needs fulfilled**: 678 (54% completion rate)
- **Sponsorship volume**: $2.3M MXN

### **Organizational Learning**

- **Modules published**: 42 (6 platform, 36 community)
- **Total enrollments**: 12,450
- **Active learners**: 4,560 (currently taking courses)
- **Completion rate**: 67%
- **Average module rating**: 4.6/5
- **Revenue (MRR)**: $280,000 MXN

### **Financial**

- **Monthly Revenue**: $450,000 MXN
  - Platform modules: $180,000 (40%)
  - Community modules: $270,000 (60%)
- **Platform share**: $195,000 MXN (30% avg)
- **Community share**: $135,000 MXN (50% of community modules)
- **Creator share**: $54,000 MXN (20% of community modules)
- **Growth**: +45% MoM

---

## 🛠️ **Development Setup**

### **Prerequisites**

- Node.js 18+
- npm or pnpm
- Supabase account
- Stripe account (test mode for dev)

### **Environment Variables**

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_...
```

### **Installation**

```bash
# Clone repo
git clone https://github.com/your-org/crowd-conscious-v2.git
cd crowd-conscious-v2

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### **Database Setup**

1. Create Supabase project
2. Run migrations in order:
   ```bash
   # In Supabase SQL Editor, run these in order:
   sql-migrations/001-create-profiles.sql
   sql-migrations/002-create-communities.sql
   sql-migrations/003-create-marketplace.sql
   sql-migrations/phase-1-universal-cart.sql
   sql-migrations/phase-2-universal-enrollments.sql
   sql-migrations/phase-3-community-pricing.sql
   ```
3. Enable Realtime on required tables
4. Set up storage buckets (for images/videos)

---

## 📞 **Support & Contact**

- **Platform**: crowdconscious.app
- **Email**: support@crowdconscious.app
- **Documentation**: This file!
- **Issues**: GitHub Issues
- **Slack**: Internal team channel

---

## 🎉 **Conclusion**

Crowd Conscious is more than a platform—it's an **ecosystem** that connects learning with action, companies with communities, and individual growth with collective impact.

**The Vision**: A world where every company's training budget becomes sustainable funding for grassroots change, where communities monetize their knowledge, and where learning leads to measurable real-world impact.

**Current Focus**: Phase 1 - Universal Marketplace

- Making the platform accessible to ALL learners (not just corporates)
- Enabling dynamic, community-set pricing
- Building a sustainable revenue model for creators and communities

**Next Steps**: See [Future Roadmap](#future-roadmap)

---

_Document created: November 5, 2025_  
_For: Internal team, new developers, investors, partners_  
_Maintained by: Francisco Blockstrand & Development Team_

**Let's build the future of impact-driven learning! 🚀🌍**
