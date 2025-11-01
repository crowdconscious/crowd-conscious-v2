# Phase 2: Marketplace Build Plan

> **Goal:** Transform from curated training portal to two-sided marketplace where communities create modules and corporations purchase them.
>
> **Status:** Ready to build
> **Started:** October 30, 2025
> **Target Completion:** 8-12 weeks

---

## 🎯 Phase 2 Overview

### What We're Building

A full marketplace ecosystem that enables:

1. **Community Creators** to build and sell training modules
2. **Corporate Buyers** to discover, purchase, and deploy custom training
3. **Revenue Sharing** that automatically splits payments to communities
4. **Quality Control** through review processes and ratings
5. **Marketplace Discovery** with smart filtering and recommendations

### Why This Matters

- **Scalability**: From 6 modules (us) to 100+ modules (communities)
- **Authenticity**: Real communities teaching their real solutions
- **Impact Loop**: Corporate spending → Community income → More projects → More modules
- **Network Effects**: More creators → Better content → More buyers → More revenue → More creators

---

## 📊 Phase 2 Success Metrics

### By End of Phase 2 (12 weeks)

| Metric | Current | Target | 
|--------|---------|--------|
| Modules in marketplace | 1 | 15-20 |
| Community creators onboarded | 0 | 5-8 |
| Corporate clients | 1 (test) | 5-10 |
| Module completion rate | 80%+ | 75%+ |
| Creator satisfaction | N/A | 4.2+/5 |
| Revenue to communities | $0 | $50k+ MXN |

---

## 🏗️ Architecture & Technical Stack

### New Database Tables

```sql
-- Module marketplace
CREATE TABLE marketplace_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id),
  community_id UUID REFERENCES communities(id),
  title TEXT NOT NULL,
  description TEXT,
  core_value TEXT NOT NULL,
  price_mxn INTEGER NOT NULL,
  duration_weeks INTEGER,
  status TEXT DEFAULT 'draft', -- draft, under_review, published, archived
  rating_average DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  preview_lesson_id UUID,
  metadata JSONB, -- industry_tags, difficulty, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Module content (lessons, activities, quizzes)
CREATE TABLE module_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  story_content JSONB, -- Story narrative
  learning_objectives TEXT[],
  key_concepts JSONB, -- Key learning points
  activities JSONB, -- Interactive activities
  resources JSONB, -- Links, videos, documents
  xp_reward INTEGER DEFAULT 0,
  estimated_time_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Creator applications
CREATE TABLE creator_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicant_id UUID REFERENCES profiles(id),
  community_id UUID REFERENCES communities(id),
  module_proposal TEXT NOT NULL,
  past_impact JSONB, -- Proof of past projects
  why_qualified TEXT,
  target_audience TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Module reviews & ratings
CREATE TABLE module_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES marketplace_modules(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  completion_rate INTEGER, -- What % of employees completed
  would_recommend BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(module_id, corporate_account_id)
);

-- Revenue tracking & splits
CREATE TABLE revenue_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID REFERENCES marketplace_modules(id),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  total_amount_mxn INTEGER NOT NULL,
  platform_share_mxn INTEGER NOT NULL, -- 30%
  community_share_mxn INTEGER NOT NULL, -- 50%
  creator_share_mxn INTEGER NOT NULL, -- 20%
  payment_status TEXT DEFAULT 'pending', -- pending, completed, failed
  stripe_payment_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Community wallets
CREATE TABLE community_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) UNIQUE,
  balance_mxn INTEGER DEFAULT 0,
  total_earned_mxn INTEGER DEFAULT 0,
  total_withdrawn_mxn INTEGER DEFAULT 0,
  payout_info JSONB, -- Bank account, payment method
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shopping cart (for multi-module purchases)
CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  module_id UUID REFERENCES marketplace_modules(id),
  quantity INTEGER DEFAULT 1, -- Employee packs
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(corporate_account_id, module_id)
);
```

### New API Routes

```
Marketplace Discovery:
- GET  /api/marketplace/modules              - List all published modules
- GET  /api/marketplace/modules/[id]         - Module details
- GET  /api/marketplace/search               - Search & filter modules
- GET  /api/marketplace/recommendations      - AI-recommended modules

Creator Management:
- POST /api/marketplace/creator/apply        - Submit creator application
- GET  /api/marketplace/creator/status       - Check application status
- POST /api/marketplace/creator/module       - Create new module (draft)
- PUT  /api/marketplace/creator/module/[id]  - Update module
- POST /api/marketplace/creator/publish      - Submit for review
- GET  /api/marketplace/creator/earnings     - View earnings dashboard

Admin Review:
- GET  /api/admin/marketplace/pending        - Modules pending review
- POST /api/admin/marketplace/approve/[id]   - Approve module
- POST /api/admin/marketplace/reject/[id]    - Reject module with feedback

Purchase Flow:
- POST /api/marketplace/cart/add             - Add module to cart
- GET  /api/marketplace/cart                 - View cart
- POST /api/marketplace/checkout             - Purchase modules
- POST /api/marketplace/review               - Leave module review

Revenue:
- GET  /api/marketplace/wallet               - Community wallet balance
- POST /api/marketplace/wallet/withdraw      - Request payout
- GET  /api/marketplace/revenue              - Revenue dashboard
```

---

## 🚀 Build Roadmap (12 Weeks)

### **Week 1-2: Foundation**

#### Database & Schema
- [ ] Create all new tables with RLS policies
- [ ] Add indexes for performance (module searches, creator_id, etc.)
- [ ] Create database functions for revenue splits
- [ ] Test data integrity and cascades

#### Base UI Structure
- [ ] `/marketplace` - Main marketplace page (browse)
- [ ] `/marketplace/[moduleId]` - Module detail page
- [ ] `/marketplace/creator` - Creator dashboard (empty state)
- [ ] `/marketplace/creator/apply` - Application form
- [ ] Update navigation to include marketplace links

#### Core Components
- [ ] `ModuleCard` - Display module in grid/list
- [ ] `ModuleFilters` - Filter sidebar (core value, price, rating)
- [ ] `SearchBar` - Search modules by keyword
- [ ] `CreatorBadge` - Show verified creator status

---

### **Week 3-4: Creator Onboarding**

#### Application System
- [ ] Creator application form with validation
- [ ] Admin review interface at `/admin/marketplace`
- [ ] Email notifications for application status
- [ ] Creator onboarding checklist/wizard

#### Module Builder (MVP)
- [ ] Module creation form (title, description, pricing)
- [ ] Lesson editor (story, objectives, activities)
- [ ] Preview mode (see how module looks to students)
- [ ] Draft saving & auto-save
- [ ] Image/video upload for lessons

#### Creator Dashboard
- [ ] Module list (drafts, published, earnings per module)
- [ ] Analytics: Views, purchases, ratings
- [ ] Earnings summary & payout requests
- [ ] Support/help resources

---

### **Week 5-6: Marketplace Discovery**

#### Browse & Search
- [ ] Module grid with pagination
- [ ] Filter by:
  - Core value (6 values)
  - Price range (slider)
  - Industry tags
  - Rating (4+ stars)
  - Duration (weeks)
- [ ] Sort by: Popular, Newest, Price, Rating
- [ ] Search with autocomplete
- [ ] "Featured" modules section

#### Module Detail Page
- [ ] Module overview (description, creator, price)
- [ ] Preview first lesson (free)
- [ ] Learning outcomes display
- [ ] Ratings & reviews section
- [ ] "Add to Cart" or "Buy Now" buttons
- [ ] Creator profile sidebar
- [ ] Related modules

#### Recommendations Engine (Simple)
- [ ] Based on assessment results
- [ ] Based on industry match
- [ ] Based on what similar companies bought
- [ ] "Customers also bought" suggestions

---

### **Week 7-8: Purchase Flow**

#### Shopping Cart
- [ ] Add/remove modules
- [ ] Employee pack selection (50, 100, 200, etc.)
- [ ] Price calculation with bundle discounts
- [ ] Cart persistence (save for later)
- [ ] Checkout summary

#### Payment Integration
- [ ] Stripe checkout integration
- [ ] Payment confirmation emails
- [ ] Invoice generation
- [ ] Failed payment handling

#### Post-Purchase
- [ ] Auto-assign modules to corporate account
- [ ] Email to admin with next steps
- [ ] Onboarding guide for new modules
- [ ] Access management

---

### **Week 9-10: Revenue & Quality**

#### Revenue Split System
- [ ] Automatic payment splitting on purchase
- [ ] Community wallet creation
- [ ] Transaction history display
- [ ] Payout request system (monthly minimum)
- [ ] Payout approval workflow
- [ ] Tax documentation (invoices, receipts)

#### Ratings & Reviews
- [ ] Review submission form
- [ ] Star rating display
- [ ] Text reviews with character limit
- [ ] "Verified Purchase" badge
- [ ] Creator response to reviews (optional)
- [ ] Moderation tools for inappropriate reviews

#### Quality Control
- [ ] Module reporting system (flag issues)
- [ ] Admin dashboard for quality metrics
- [ ] Automated alerts (low completion rates, bad reviews)
- [ ] Module suspension/archival
- [ ] Creator performance scorecards

---

### **Week 11-12: Polish & Launch**

#### Performance Optimization
- [ ] Database query optimization
- [ ] Image optimization (CDN, lazy loading)
- [ ] Caching strategy (module listings, search results)
- [ ] Mobile responsiveness audit

#### User Experience
- [ ] Onboarding tooltips for creators
- [ ] Empty states (no results, no purchases)
- [ ] Loading states & skeleton screens
- [ ] Error handling & user feedback
- [ ] Accessibility audit (keyboard nav, screen readers)

#### Marketing & Launch
- [ ] Creator onboarding documentation
- [ ] Video tutorials (how to create a module)
- [ ] Marketplace launch announcement
- [ ] Email to existing corporate clients
- [ ] Social media assets

#### Testing
- [ ] End-to-end testing (creator → buyer → payout)
- [ ] Payment testing (test mode + real transactions)
- [ ] Load testing (100+ modules, 50+ searches/sec)
- [ ] Security audit (payment info, creator data)
- [ ] User acceptance testing (3-5 real creators)

---

## 🎨 Key UI/UX Designs

### Marketplace Homepage (`/marketplace`)

```
┌─────────────────────────────────────────────────────────────┐
│ 🎓 Concientizaciones Marketplace                            │
│ "Training created by communities, powered by impact"        │
│                                                              │
│ [Search modules...]                           [🛒 Cart (3)] │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐  ┌─────────────────────────────────────────┐
│  FILTERS     │  │  FEATURED MODULES                       │
│              │  │  ┌───────────────┐ ┌───────────────┐   │
│ Core Value   │  │  │ 🌬️ Clean Air  │ │ 💧 Water Mgmt │   │
│ □ Clean Air  │  │  │ By: Colonia V │ │ By: EcoComm   │   │
│ □ Clean Water│  │  │ ⭐⭐⭐⭐⭐ (24) │ │ ⭐⭐⭐⭐  (18)  │   │
│ □ Safe Cities│  │  │ $18,000 MXN   │ │ $18,000 MXN   │   │
│ □ Zero Waste │  │  └───────────────┘ └───────────────┘   │
│ □ Fair Trade │  │                                          │
│ □ Biodiversity│  │  ALL MODULES (48)                      │
│              │  │  [Grid of module cards...]              │
│ Price Range  │  │                                          │
│ ├────────────┤ │  │  Showing 1-12 of 48                   │
│ $0    $50k   │  │  [1] 2 3 4 → Next                       │
│              │  │                                          │
│ Industry     │  └─────────────────────────────────────────┘
│ □ Manufacturing
│ □ Offices    │
│ □ Retail     │
│              │
│ Rating       │
│ □ 4+ ⭐      │
│ □ 3+ ⭐      │
└──────────────┘
```

### Module Detail Page (`/marketplace/[moduleId]`)

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Marketplace                       [Add to Cart]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🌬️ CLEAN AIR CHAMPIONS                                     │
│  Reduce emissions and improve workplace air quality          │
│                                                              │
│  Created by: Colonia Verde (Verified Creator ✓)             │
│  ⭐⭐⭐⭐⭐ 4.8/5 (24 reviews) • 156 companies trained        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │  OVERVIEW                                              ││
│  │  Duration: 4 weeks | Employees: Up to 50              ││
│  │  Price: $18,000 MXN (+$8,000 per extra 50 employees)  ││
│  │                                                        ││
│  │  What You'll Learn:                                   ││
│  │  • Measure air quality (PM2.5, CO2, VOCs)            ││
│  │  • Calculate carbon footprint                         ││
│  │  • Identify emission sources                          ││
│  │  • Implement reduction strategies                     ││
│  │                                                        ││
│  │  [Preview First Lesson Free →]                        ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │  CURRICULUM (3 Lessons)                                ││
│  │  1. The Awakening - Understanding Air Quality         ││
│  │  2. Hidden Sources - Identifying Emissions            ││
│  │  3. Clean Solutions - Reduction Strategies            ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │  REVIEWS (24)                        ⭐⭐⭐⭐⭐ 4.8/5   ││
│  │                                                        ││
│  │  "Amazing module! Our employees loved it..."          ││
│  │  - Tech Corp, Manufacturing (Verified Purchase ✓)     ││
│  │  ⭐⭐⭐⭐⭐  •  23 Oct 2025                              ││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │  ABOUT THE CREATOR                                     ││
│  │  Colonia Verde - Verified Creator ✓                   ││
│  │  Active community of 250+ members                      ││
│  │  5 real projects completed with documented impact     ││
│  │  [View Community Profile →]                            ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Creator Dashboard (`/marketplace/creator`)

```
┌─────────────────────────────────────────────────────────────┐
│ CREATOR DASHBOARD                                           │
│ Welcome back, María! 🎨                                     │
└─────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Earned │ This Month   │ Avg Rating   │ Total Sales  │
│ $52,400 MXN  │ $9,000 MXN   │ ⭐ 4.8/5     │ 18 modules   │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────────────────┐
│ YOUR MODULES (3)                        [+ Create New]      │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 🌬️ Clean Air Champions                   [Edit] [View] ││
│ │ Status: Published ✓  •  Rating: ⭐⭐⭐⭐⭐ 4.8/5 (24)    ││
│ │ Sales: 18  •  Revenue: $45,000 MXN  •  Your share: $9k ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 💧 Water Conservation Basics             [Edit] [View]  ││
│ │ Status: Under Review ⏳  •  Submitted: 2 days ago       ││
│ │ Estimated approval: 3-5 business days                   ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 🌱 Urban Gardening 101                   [Edit] [Preview]││
│ │ Status: Draft  •  Last saved: Today at 2:15 PM          ││
│ │ 2/3 lessons completed                                   ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ EARNINGS & PAYOUTS                                          │
│                                                              │
│ Available Balance: $18,400 MXN                              │
│ [Request Payout]  (Minimum: $10,000 MXN)                    │
│                                                              │
│ Recent Transactions:                                         │
│ • Oct 28 - Clean Air sold to TechCorp     +$3,600 MXN      │
│ • Oct 25 - Clean Air sold to RetailCo     +$3,600 MXN      │
│ • Oct 20 - Payout to bank account         -$15,000 MXN     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Strategy

### Phase 2 Testing Levels

#### 1. **Unit Tests** (Vitest)
```typescript
// Example test cases
describe('Revenue Split', () => {
  it('should split $18k correctly: 30% platform, 50% community, 20% creator', () => {
    const result = calculateRevenueSplit(18000)
    expect(result.platform).toBe(5400)
    expect(result.community).toBe(9000)
    expect(result.creator).toBe(3600)
  })
})

describe('Module Filtering', () => {
  it('should filter modules by core value', () => {
    const filtered = filterModules(allModules, { coreValue: 'clean_air' })
    expect(filtered.every(m => m.core_value === 'clean_air')).toBe(true)
  })
})
```

#### 2. **Integration Tests** (Playwright)
- [ ] Creator application → Approval → Module creation → Publishing
- [ ] Browse marketplace → View module → Add to cart → Checkout → Payment
- [ ] Purchase module → Auto-assign to employees → Employee completes → Leave review
- [ ] Revenue split → Community wallet update → Payout request → Approval

#### 3. **Manual Testing Scenarios**
1. **Happy Path (Creator)**
   - Apply as creator → Get approved → Create module → Publish → Get sale → Request payout

2. **Happy Path (Buyer)**
   - Browse marketplace → Filter by industry → Preview module → Add to cart → Checkout → Assign to employees

3. **Edge Cases**
   - Module rejected → Feedback → Resubmit
   - Payment fails → Retry logic
   - Review moderation → Flagged review → Admin action
   - Payout below minimum → Cannot request

#### 4. **Load Testing**
- [ ] 100+ concurrent marketplace searches
- [ ] 50+ simultaneous module creations
- [ ] 20+ simultaneous checkouts
- [ ] Large module listings (500+ modules)

---

## 🚨 Risk Mitigation

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Payment processing failures | High | Medium | Stripe webhooks + retry logic + manual fallback |
| Revenue split errors | Critical | Low | Automated tests + financial reconciliation dashboard |
| Module quality issues | High | Medium | Mandatory review process + rating threshold for visibility |
| Database performance (100+ modules) | Medium | Medium | Indexes + caching + pagination |
| Creator abandonment (incomplete modules) | Medium | High | Draft auto-save + email reminders + support chat |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Not enough creator applications | High | Medium | Proactive outreach to top communities + incentives ($5k advance) |
| Low-quality first modules | Critical | Medium | Hands-on support for first 5 creators + co-creation |
| Corporations don't trust community modules | High | Low | Verified creator badges + case studies + money-back guarantee |
| Price point too high/low | Medium | Medium | A/B testing + feedback loop + flexible pricing |

---

## 📋 Pre-Launch Checklist

### Before Opening to Creators
- [ ] All database tables created with RLS
- [ ] Creator application form tested
- [ ] Admin review interface functional
- [ ] Module builder basic version complete
- [ ] Revenue split calculations verified
- [ ] Email notifications working
- [ ] Creator documentation written

### Before Opening to Buyers
- [ ] At least 8-10 modules published
- [ ] Marketplace filtering working
- [ ] Module detail pages complete
- [ ] Shopping cart functional
- [ ] Stripe integration tested (test + live mode)
- [ ] Post-purchase flow tested
- [ ] Module assignment to employees working

### Before First Payout
- [ ] Community wallet system tested
- [ ] Payout request workflow tested
- [ ] Tax documentation templates ready
- [ ] Bank transfer or Stripe Connect configured
- [ ] Financial reconciliation dashboard built

---

## 💡 Phase 2 Quick Wins (Build These First)

1. **Simple Marketplace Page** (Week 1)
   - Just list existing modules with filters
   - Prove the UI/UX works before building creator tools

2. **Creator Application Form** (Week 2)
   - Get 5-8 applications in queue
   - Start approvals manually
   - Gather feedback on what creators need

3. **Module Builder MVP** (Week 3-4)
   - Text editor for story + objectives + activities
   - Skip fancy features (image upload can be manual initially)
   - Get 2-3 modules created to test

4. **Revenue Split Dashboard** (Week 5)
   - Build transparency first
   - Show creators their earnings potential
   - Even before real payments, build trust

---

## 🎯 Success Criteria for Phase 2 Completion

We'll know Phase 2 is done when:

✅ **Creator Side:**
- 5+ approved creators with active modules
- Module creation time < 2 weeks (onboarding to published)
- Creator satisfaction score > 4/5
- $50k+ MXN paid out to communities

✅ **Buyer Side:**
- 10+ corporations purchased from marketplace
- Marketplace search used 100+ times
- Average order value: 2.5+ modules
- Module completion rate > 75%

✅ **Platform Health:**
- Average module rating: 4.2+/5
- 90%+ uptime for marketplace
- Payment success rate: 98%+
- Revenue split automation: 100% accurate

✅ **Impact:**
- Communities earning recurring income from modules
- Corporate clients expanding from starter → more modules
- Network effects visible (creators referring creators, companies referring companies)
- Clear path to Phase 3 (international expansion, mobile app, etc.)

---

## 🔄 After Phase 2: What's Next?

### Phase 3 Ideas (6+ months out)
- Mobile app for learning on-the-go
- Live workshops/webinars with creators
- White-label option for large enterprises
- Certification pathways (beginner → expert tracks)
- API for HR system integrations
- International expansion (Latin America first)
- Advanced analytics (predictive impact, ROI forecasting)

---

**Status:** 📝 Phase 2 plan complete, ready to execute
**Next Step:** Start Week 1 - Database schema + Base UI structure
**Owner:** Francisco + development team
**Review Cadence:** Weekly progress check-ins

---

_Document Version: 1.0_  
_Created: October 30, 2025_  
_Last Updated: October 30, 2025_  
_Next Review: November 6, 2025 (after Week 1)_

