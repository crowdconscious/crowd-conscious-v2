# Crowd Conscious - Comprehensive Platform Guide
**Version: 2.0 | Last Updated: November 1, 2025**

---

## 📋 Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture & Vision](#architecture--vision)
3. [Complete Database Schema](#complete-database-schema)
4. [Features & Modules](#features--modules)
5. [User Roles & Permissions](#user-roles--permissions)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Authentication & Security](#authentication--security)
8. [Payment & Revenue Systems](#payment--revenue-systems)
9. [Email System](#email-system)
10. [Deployment & Environment](#deployment--environment)

---

## 🎯 Platform Overview

**Crowd Conscious** is a comprehensive social impact platform that connects communities, corporations, and individuals to create measurable environmental and social change.

### **Core Value Proposition**

We operate as a **two-sided marketplace** that:
1. **Empowers communities** to create sustainability training modules based on real-world expertise
2. **Enables corporations** to purchase modular training that directly funds community projects
3. **Creates a virtuous cycle** where training revenue flows back to neighborhoods for project implementation
4. **Measures impact** with verifiable metrics and transparent reporting

### **Platform Components**

```
┌──────────────────────────────────────────────────────────┐
│          CROWD CONSCIOUS UNIFIED PLATFORM                 │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────┐│
│  │   COMMUNITIES   │  │    CORPORATE     │  │MARKETPLACE││
│  │    PLATFORM     │←→│    TRAINING      │←→│   BROWSE  ││
│  │                 │  │(Concientizaciones)│  │           ││
│  └─────────────────┘  └──────────────────┘  └──────────┘│
│          ↓                    ↓                   ↓       │
│  ┌──────────────────────────────────────────────────────┐│
│  │            SHARED INFRASTRUCTURE                      ││
│  │  • Auth • Payments • Wallets • Certificates • DB     ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
└──────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture & Vision

### **Strategic Vision**

**Mission**: Create a self-sustaining ecosystem where corporate training revenue directly funds community-led environmental and social projects.

**2025-2027 Roadmap**:

**Phase 1: Foundation** ✅ COMPLETE
- Community platform with needs, events, polls, challenges
- Sponsorship system with payment processing
- Impact metrics tracking
- User authentication and profiles

**Phase 2: Corporate Training (Current)** 🔄 IN PROGRESS
- Corporate accounts and employee management
- Module-based training system
- Progress tracking and gamification (XP, levels)
- Certificate generation and verification
- Employee and corporate dashboards

**Phase 3: Marketplace & Revenue** 🚀 STARTING
- Wallet system for revenue distribution
- Module creation tools for communities
- Creator application workflow
- Revenue split automation (30% platform / 50% community / 20% creator)
- Marketplace browse and purchase

**Phase 4: Scale** 📈 PLANNED (2026)
- API integrations for HR systems
- Custom module development
- Mobile apps (iOS/Android)
- White-label solutions
- International expansion (Latin America)

### **Tech Stack**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15, React 18, TypeScript | Server components, static generation |
| **Styling** | Tailwind CSS, Lucide Icons | Responsive design, mobile-optimized |
| **Backend** | Next.js API Routes, Server Actions | Serverless functions |
| **Database** | Supabase (PostgreSQL) | Real-time, RLS policies |
| **Auth** | Supabase Auth | Email/password, OAuth |
| **Payments** | Stripe | Sponsorships, corporate subscriptions |
| **Email** | Resend | Transactional emails |
| **Storage** | Supabase Storage | Images, documents, certificates |
| **Deployment** | Vercel | Edge network, auto-scaling |

### **Architecture Principles**

1. **Server-First**: Leverage Next.js 15 server components for performance
2. **Type-Safe**: TypeScript everywhere for maintainability
3. **Security-First**: Row Level Security (RLS) on all tables
4. **Mobile-Responsive**: 50% of users on mobile devices
5. **Modular**: Feature-based organization for scalability
6. **Real-time**: Supabase real-time subscriptions where needed

---

## 💾 Complete Database Schema

### **Core Tables (Community Platform)**

#### **1. profiles**
```sql
id                  UUID PRIMARY KEY    -- Links to auth.users
email               TEXT
full_name           TEXT
avatar_url          TEXT
user_type           TEXT                -- 'user', 'brand', 'admin'
corporate_account_id UUID               -- If corporate user
corporate_role      TEXT                -- 'admin', 'employee'
is_corporate_user   BOOLEAN
xp                  INTEGER DEFAULT 0
level               INTEGER DEFAULT 1
streak_days         INTEGER DEFAULT 0
last_activity_date  DATE
created_at          TIMESTAMP
```

**Purpose**: Extended user profiles linking to Supabase Auth

**RLS Policies**:
- ✅ Anyone can view profiles
- ✅ Users can update own profile
- ✅ Users can insert own profile on signup

---

#### **2. communities**
```sql
id              UUID PRIMARY KEY
name            TEXT UNIQUE NOT NULL
slug            TEXT UNIQUE NOT NULL
description     TEXT
image_url       TEXT
core_values     TEXT[]                  -- Min 3 values
location        POINT                   -- PostGIS coordinates
address         TEXT
member_count    INT DEFAULT 0
creator_id      UUID REFERENCES profiles(id)
created_at      TIMESTAMP
```

**Purpose**: Community organizations and neighborhoods

**Core Values**:
- clean_air
- clean_water
- safe_cities
- zero_waste
- fair_trade
- biodiversity

**RLS Policies**:
- ✅ Anyone can view communities
- ✅ Authenticated users can create
- ✅ Creators can update their own

---

#### **3. community_members**
```sql
id              UUID PRIMARY KEY
community_id    UUID REFERENCES communities(id)
user_id         UUID REFERENCES profiles(id)
role            TEXT                    -- 'founder', 'admin', 'member'
voting_power    INT                     -- 3, 2, 1
joined_at       TIMESTAMP
UNIQUE(community_id, user_id)
```

**Purpose**: Track community membership and roles

**Voting Power**:
- Founder: 3 votes
- Admin: 2 votes
- Member: 1 vote

**Triggers**:
- Auto-updates `communities.member_count` on INSERT/DELETE
- Auto-sets `voting_power` based on role

---

#### **4. community_content**
```sql
id              UUID PRIMARY KEY
community_id    UUID REFERENCES communities(id)
type            TEXT                    -- 'need', 'event', 'challenge', 'poll'
title           TEXT NOT NULL
description     TEXT
image_url       TEXT
data            JSONB DEFAULT '{}'      -- Type-specific data
status          TEXT                    -- 'draft', 'voting', 'approved', 'active', 'completed'
created_by      UUID REFERENCES profiles(id)
funding_goal    DECIMAL                 -- For needs
current_funding DECIMAL DEFAULT 0
voting_deadline TIMESTAMP
created_at      TIMESTAMP
```

**Purpose**: Flexible content system for all community activities

**Content Types**:
1. **Need**: Community requests (funding, volunteers, supplies)
2. **Event**: Gatherings, workshops, activities
3. **Challenge**: Community competitions and goals
4. **Poll**: Democratic decision-making

---

#### **5. votes**
```sql
id          UUID PRIMARY KEY
content_id  UUID REFERENCES community_content(id)
user_id     UUID REFERENCES profiles(id)
vote        TEXT                        -- 'approve', 'reject'
weight      INT DEFAULT 1               -- Based on voting_power
created_at  TIMESTAMP
UNIQUE(content_id, user_id)
```

**Purpose**: Weighted voting on community content

---

#### **6. sponsorships**
```sql
id                      UUID PRIMARY KEY
content_id              UUID REFERENCES community_content(id)
sponsor_id              UUID REFERENCES profiles(id)
amount                  DECIMAL NOT NULL
status                  TEXT                -- 'pending', 'approved', 'rejected', 'paid'
stripe_payment_intent   TEXT
platform_fee            DECIMAL             -- 15% of amount
approved_by_community   BOOLEAN DEFAULT false
created_at              TIMESTAMP
```

**Purpose**: Brand sponsorships of community needs

**Flow**:
1. Brand creates sponsorship (status: 'pending')
2. Community approves (approved_by_community: true)
3. Payment processed via Stripe
4. Status updated to 'paid'
5. 85% goes to community, 15% platform fee

---

#### **7. impact_metrics**
```sql
id            UUID PRIMARY KEY
community_id  UUID REFERENCES communities(id)
content_id    UUID REFERENCES community_content(id)
metric_type   TEXT                -- 'clean_air', 'clean_water', etc.
value         DECIMAL NOT NULL
unit          TEXT NOT NULL
verified      BOOLEAN DEFAULT false
created_at    TIMESTAMP
```

**Purpose**: Track measurable community impact

---

#### **8. share_links**
```sql
id          UUID PRIMARY KEY
token       TEXT UNIQUE DEFAULT gen_random_uuid()
content_id  UUID REFERENCES community_content(id)
type        TEXT                -- 'poll', 'event', 'post'
expires_at  TIMESTAMP
created_at  TIMESTAMP
```

**Purpose**: Public sharing of community content

---

### **Corporate Training Tables**

#### **9. corporate_accounts**
```sql
id                  UUID PRIMARY KEY
company_name        TEXT NOT NULL
company_slug        TEXT UNIQUE
industry            TEXT
employee_count      INTEGER
location            POINT
address             TEXT
program_tier        TEXT                -- 'inicial', 'completo', 'elite'
purchase_date       TIMESTAMP
program_start_date  TIMESTAMP
program_end_date    TIMESTAMP
employee_limit      INTEGER NOT NULL
modules_included    TEXT[]
created_at          TIMESTAMP
```

**Purpose**: Corporate client accounts

**Program Tiers**:
- **Inicial** (3 modules): $45,000 MXN
- **Completo** (6 modules): $85,000 MXN ⭐ Recommended
- **Elite** (unlimited): Custom pricing

---

#### **10. employee_invitations**
```sql
id                      UUID PRIMARY KEY
corporate_account_id    UUID REFERENCES corporate_accounts(id)
email                   TEXT NOT NULL
full_name               TEXT
status                  TEXT                -- 'pending', 'accepted', 'expired', 'cancelled'
invitation_token        TEXT UNIQUE
expires_at              TIMESTAMP
sent_at                 TIMESTAMP
accepted_at             TIMESTAMP
invited_by              UUID REFERENCES auth.users(id)
UNIQUE(corporate_account_id, email)
```

**Purpose**: Employee invitation workflow

---

#### **11. course_enrollments**
```sql
id                      UUID PRIMARY KEY
employee_id             UUID REFERENCES auth.users(id)
corporate_account_id    UUID REFERENCES corporate_accounts(id)
module_id               TEXT NOT NULL
module_name             TEXT
status                  TEXT                -- 'not_started', 'in_progress', 'completed'
completion_percentage   INTEGER DEFAULT 0
started_at              TIMESTAMP
completed_at            TIMESTAMP
last_activity_at        TIMESTAMP
quiz_score              INTEGER
time_spent_minutes      INTEGER DEFAULT 0
xp_earned               INTEGER DEFAULT 0
modules_completed       INTEGER DEFAULT 0   -- Count of unique lessons
UNIQUE(employee_id, module_id)
```

**Purpose**: Track employee training progress

**XP System**:
- Lesson completion: 10-20 XP
- Module completion: Bonus XP
- Levels: Every 100 XP = 1 level

---

#### **12. lesson_responses**
```sql
id                      UUID PRIMARY KEY
employee_id             UUID REFERENCES auth.users(id)
course_id               TEXT NOT NULL
module_id               TEXT
lesson_id               TEXT
response_data           JSONB               -- Tool responses, answers
tool_type               TEXT                -- Which tool was used
completed_at            TIMESTAMP
```

**Purpose**: Store employee lesson completion and tool responses

**Captured Data**:
- Reflection journal entries
- Calculator results
- Assessment responses
- Evidence uploads
- Implementation plans

---

#### **13. certifications**
```sql
id                      UUID PRIMARY KEY
employee_id             UUID REFERENCES auth.users(id)
corporate_account_id    UUID REFERENCES corporate_accounts(id)
certification_type      TEXT                -- 'module_completion', 'conscious_company'
certification_level     TEXT                -- 'participant', 'contributor', 'leader'
modules_completed       TEXT[]
xp_earned               INTEGER
issued_at               TIMESTAMP
expires_at              TIMESTAMP
certificate_url         TEXT
verification_code       TEXT UNIQUE         -- 12-char code for public verification
```

**Purpose**: Digital certificates for employees and companies

**Types**:
1. **Module Completion**: Issued per module completed
2. **Conscious Company**: Issued to corporations

**Verification**: Public page at `/verify/[code]`

---

#### **14. project_submissions**
```sql
id                      UUID PRIMARY KEY
employee_id             UUID REFERENCES auth.users(id)
corporate_account_id    UUID REFERENCES corporate_accounts(id)
module_id               TEXT NOT NULL
project_type            TEXT
title                   TEXT NOT NULL
description             TEXT NOT NULL
impact_claim            JSONB
attachments             JSONB DEFAULT '[]'
status                  TEXT                -- 'draft', 'submitted', 'approved', 'rejected'
verified                BOOLEAN DEFAULT false
verified_at             TIMESTAMP
verified_by             UUID
feedback                TEXT
```

**Purpose**: Employee project submissions for verification

---

#### **15. corporate_activity_log**
```sql
id                      UUID PRIMARY KEY
corporate_account_id    UUID REFERENCES corporate_accounts(id)
user_id                 UUID REFERENCES auth.users(id)
action_type             TEXT NOT NULL
action_details          JSONB
ip_address              TEXT
user_agent              TEXT
created_at              TIMESTAMP
```

**Purpose**: Audit trail for corporate actions

---

### **Marketplace Tables**

#### **16. marketplace_modules**
```sql
id                      UUID PRIMARY KEY
title                   TEXT NOT NULL
description             TEXT NOT NULL
slug                    TEXT UNIQUE
creator_community_id    UUID REFERENCES communities(id)
creator_user_id         UUID REFERENCES auth.users(id)
creator_name            TEXT NOT NULL
estimated_duration_hours INTEGER
lesson_count            INTEGER DEFAULT 0
xp_reward               INTEGER NOT NULL
core_value              TEXT NOT NULL
industry_tags           TEXT[]
difficulty_level        TEXT                -- 'beginner', 'intermediate', 'advanced'
base_price_mxn          INTEGER NOT NULL
price_per_50_employees  INTEGER NOT NULL
status                  TEXT                -- 'draft', 'review', 'published', 'suspended'
approved_by             UUID
approval_date           TIMESTAMP
purchase_count          INTEGER DEFAULT 0
enrollment_count        INTEGER DEFAULT 0
avg_rating              DECIMAL(3,2)
review_count            INTEGER DEFAULT 0
completion_rate         INTEGER
featured                BOOLEAN DEFAULT false
search_keywords         TEXT[]
thumbnail_url           TEXT
preview_video_url       TEXT
published_at            TIMESTAMP
```

**Purpose**: Community-created training modules for sale

**Pricing Example**:
- Base (50 employees): $18,000 MXN
- +50 employees: +$8,000 MXN
- 100 employees: $26,000 MXN
- 200 employees: $42,000 MXN

---

#### **17. module_lessons**
```sql
id                  UUID PRIMARY KEY
module_id           UUID REFERENCES marketplace_modules(id)
lesson_order        INTEGER NOT NULL
title               TEXT NOT NULL
description         TEXT
estimated_minutes   INTEGER
xp_reward           INTEGER
story_content       JSONB               -- Narrative structure
learning_objectives TEXT[]
key_points          TEXT[]
did_you_know        TEXT[]
real_world_example  TEXT
activity_type       TEXT
activity_config     JSONB
activity_required   BOOLEAN
tools_used          TEXT[]              -- Tool IDs
resources           JSONB               -- Links, articles
next_steps          TEXT[]
UNIQUE(module_id, lesson_order)
```

**Purpose**: Individual lessons within modules

**Story-Driven Structure**:
```json
{
  "introduction": "Hook the learner",
  "mainContent": ["Point 1", "Point 2", "Point 3"],
  "conclusion": "Wrap up",
  "characterInsight": "Personal perspective"
}
```

---

#### **18. creator_applications**
```sql
id                      UUID PRIMARY KEY
applicant_user_id       UUID REFERENCES auth.users(id)
applicant_community_id  UUID REFERENCES communities(id)
applicant_name          TEXT NOT NULL
applicant_email         TEXT NOT NULL
proposed_module_topic   TEXT NOT NULL
problem_solved          TEXT NOT NULL
impact_achieved         TEXT NOT NULL
unique_qualification    TEXT NOT NULL
target_audience         TEXT NOT NULL
portfolio_links         TEXT[]
testimonials            TEXT
status                  TEXT                -- 'pending', 'approved', 'rejected'
reviewed_by             UUID
review_notes            TEXT
submitted_at            TIMESTAMP
reviewed_at             TIMESTAMP
```

**Purpose**: Application workflow for community creators

**Application Flow**:
1. Community applies (status: 'pending')
2. Admin reviews application
3. Approved → Access to module builder
4. Create & submit module for review
5. Published to marketplace

---

#### **19. module_reviews**
```sql
id                  UUID PRIMARY KEY
module_id           UUID REFERENCES marketplace_modules(id)
reviewer_id         UUID REFERENCES auth.users(id)
corporate_account_id UUID REFERENCES corporate_accounts(id)
rating              INTEGER             -- 1-5 stars
review_text         TEXT
completion_status   TEXT                -- Did they complete it?
would_recommend     BOOLEAN
verified_purchase   BOOLEAN DEFAULT true
created_at          TIMESTAMP
```

**Purpose**: Reviews from corporations/employees

---

#### **20. revenue_transactions**
```sql
id                  UUID PRIMARY KEY
module_id           UUID REFERENCES marketplace_modules(id)
corporate_account_id UUID REFERENCES corporate_accounts(id)
total_amount        DECIMAL NOT NULL
platform_fee        DECIMAL             -- 30%
community_share     DECIMAL             -- 50%
creator_share       DECIMAL             -- 20%
payment_method      TEXT
payment_id          TEXT                -- Stripe payment intent
transaction_date    TIMESTAMP
```

**Purpose**: Revenue tracking for marketplace sales

---

### **Wallet System Tables**

#### **21. wallets**
```sql
id          UUID PRIMARY KEY
owner_type  TEXT NOT NULL               -- 'community', 'user', 'platform'
owner_id    UUID                        -- community_id, user_id, or NULL
balance     NUMERIC(10,2) DEFAULT 0.00
currency    TEXT DEFAULT 'MXN'
status      TEXT DEFAULT 'active'       -- 'active', 'frozen', 'closed'
created_at  TIMESTAMP
updated_at  TIMESTAMP
UNIQUE(owner_type, owner_id)
```

**Purpose**: Store balances for revenue distribution

**Wallet Types**:
1. **Community**: Receives 50% of module sales
2. **User** (Creator): Receives 20% of module sales
3. **Platform**: Receives 30% of module sales

---

#### **22. wallet_transactions**
```sql
id                      UUID PRIMARY KEY
wallet_id               UUID REFERENCES wallets(id)
type                    TEXT                -- 'credit', 'debit'
amount                  NUMERIC(10,2) NOT NULL
source                  TEXT                -- 'module_sale', 'withdrawal', 'need_sponsorship'
source_id               UUID
description             TEXT
metadata                JSONB
status                  TEXT                -- 'pending', 'completed', 'failed', 'reversed'
balance_before          NUMERIC(10,2)
balance_after           NUMERIC(10,2)
related_transaction_id  UUID
created_at              TIMESTAMP
processed_at            TIMESTAMP
```

**Purpose**: Full audit trail of all wallet activity

---

#### **23. module_sales**
```sql
id                              UUID PRIMARY KEY
module_id                       UUID REFERENCES marketplace_modules(id)
corporate_account_id            UUID REFERENCES corporate_accounts(id)
total_amount                    NUMERIC(10,2) NOT NULL
employee_count                  INTEGER DEFAULT 50
platform_fee                    NUMERIC(10,2)
community_share                 NUMERIC(10,2)
creator_share                   NUMERIC(10,2)
creator_donated_to_community    BOOLEAN DEFAULT false
community_wallet_id             UUID REFERENCES wallets(id)
creator_wallet_id               UUID REFERENCES wallets(id)
platform_wallet_id              UUID REFERENCES wallets(id)
transaction_ids                 JSONB
payment_method                  TEXT
payment_id                      TEXT
status                          TEXT                -- 'pending', 'completed', 'refunded', 'failed'
purchased_at                    TIMESTAMP
```

**Purpose**: Track revenue splits from module purchases

**Revenue Distribution**:
```
$18,000 MXN module sale
├─ Platform (30%): $5,400
├─ Community (50%): $9,000 (or 70% if creator donates)
└─ Creator (20%): $3,600 (or 0% if donated)
```

---

#### **24. withdrawal_requests**
```sql
id                  UUID PRIMARY KEY
wallet_id           UUID REFERENCES wallets(id)
amount              NUMERIC(10,2) NOT NULL
bank_name           TEXT
account_number      TEXT
account_holder_name TEXT
routing_number      TEXT
status              TEXT                -- 'pending', 'approved', 'processing', 'completed', 'rejected', 'failed'
admin_notes         TEXT
rejection_reason    TEXT
requested_at        TIMESTAMP
approved_at         TIMESTAMP
completed_at        TIMESTAMP
```

**Purpose**: Withdrawal requests from communities/creators (Future Phase 5)

---

## 🎨 Features & Modules

### **1. Community Platform**

#### **Communities Dashboard**
- **Path**: `/communities`
- **Features**:
  - Browse all communities
  - Filter by core values
  - Search by location
  - View community stats (members, needs, impact)

#### **Individual Community Page**
- **Path**: `/communities/[id]`
- **Tabs**:
  1. **Members**: List of all members with roles
  2. **Content**: Needs, events, challenges, polls
  3. **Community Pool**: Wallet balance, transactions
  4. **Impact**: Verified metrics and achievements

#### **Content Types**:

**A. Needs (Funding Requests)**
```typescript
{
  type: 'need',
  funding_goal: 5000,
  current_funding: 2500,
  status: 'voting' | 'approved' | 'active',
  data: {
    deadline: Date,
    urgency: 'low' | 'medium' | 'high',
    category: string
  }
}
```

**B. Events**
```typescript
{
  type: 'event',
  data: {
    date: Date,
    location: string,
    capacity: number,
    registrations: number
  }
}
```

**C. Challenges**
```typescript
{
  type: 'challenge',
  data: {
    goal: string,
    participants: number,
    progress: number,
    deadline: Date
  }
}
```

**D. Polls**
```typescript
{
  type: 'poll',
  data: {
    options: string[],
    votes: Record<string, number>
  }
}
```

---

### **2. Corporate Training (Concientizaciones)**

#### **Landing Page**
- **Path**: `/concientizaciones`
- **Features**:
  - Hero section with value proposition
  - Free sustainability assessment
  - Module preview cards
  - Pricing calculator
  - Social proof (testimonials, stats)
  - CTA to sign up

#### **Corporate Signup**
- **Path**: `/signup-corporate`
- **Flow**:
  1. Company information
  2. Program tier selection
  3. Payment processing (Stripe)
  4. Account creation
  5. Auto-enrollment in modules

#### **Corporate Admin Dashboard**
- **Path**: `/corporate/dashboard`
- **Sections**:
  1. **Overview**:
     - Total employees
     - Active enrollments
     - Completion rate
     - Certificates issued
  2. **Quick Actions**:
     - Invite employees
     - View progress
     - Download reports
     - Explore marketplace
  3. **Program Status**:
     - Included modules
     - Employee limit
     - Program duration
     - Tier benefits
  4. **Explore Modules** (Preview):
     - Featured marketplace modules
     - "Ver Todos" → `/marketplace`

#### **Employee Management**
- **Path**: `/corporate/employees`
- **Features**:
  - Employee list with stats
  - Bulk invite via CSV
  - Individual progress tracking
  - Resend invitations
  - Remove employees

#### **Progress Tracking**
- **Path**: `/corporate/progress`
- **Views**:
  - Overall completion percentage
  - Module-by-module breakdown
  - Individual employee progress
  - Time spent analytics
  - XP leaderboard
  - Completion trends (chart)

#### **Impact Dashboard**
- **Path**: `/corporate/impact`
- **Metrics**:
  - CO₂ equivalent reduced
  - Cost savings
  - Projects completed
  - Behavioral changes
  - Real-world implementations
  - ESG report generation

#### **Corporate Certificates**
- **Path**: `/corporate/certificates`
- **Features**:
  - "Conscious Company" badge
  - Module completion certificates
  - Employee training records
  - Total XP and impact
  - Social sharing buttons
  - Download as PNG

#### **Settings**
- **Path**: `/corporate/settings`
- **Options**:
  - Company profile
  - Program details
  - Billing information
  - Add more modules
  - Change tier
  - Admin management

---

### **3. Employee Portal**

#### **Employee Dashboard**
- **Path**: `/employee-portal/dashboard`
- **Sections**:
  1. **Welcome Banner**:
     - Personalized greeting
     - Company name
     - Current level and XP
  2. **My Courses**:
     - Enrolled modules
     - Progress bars
     - Continue learning CTAs
     - Next lesson suggestions
  3. **Stats**:
     - Total XP
     - Level
     - Streak (days)
     - Modules completed
     - Certifications earned
  4. **Upcoming**:
     - Next lesson
     - Deadlines (if any)

#### **Courses Page**
- **Path**: `/employee-portal/courses`
- **Features**:
  - All enrolled modules
  - Module cards with:
    - Thumbnail
    - Title
    - Progress percentage
    - Estimated time
    - XP reward
    - "Continue" button

#### **Module Overview**
- **Path**: `/employee-portal/modules/[moduleId]`
- **Sections**:
  1. **Header**:
     - Module title
     - Description
     - Total lessons
     - XP available
  2. **Progress**:
     - Circular progress indicator
     - Lessons completed / total
     - Current XP / Total XP
  3. **Lesson List**:
     - Lesson cards
     - Checkmarks for completed
     - Locked for future lessons
     - Estimated time
     - "Start" or "Continue" buttons

#### **Lesson Viewer**
- **Path**: `/employee-portal/modules/[moduleId]/lessons/[lessonId]`
- **Layout**:
  - **Sidebar** (Desktop):
    - Module title
    - Lesson list
    - Progress indicator
  - **Main Content**:
    - Lesson title
    - Story content (if available)
    - Learning objectives
    - Main content sections
    - Did you know facts
    - Real-world examples
    - Key takeaways
    - Resources (articles, tools)
    - Next steps
  - **Interactive Tools**:
    - Opens in modal
    - 8 reusable tools (see below)
  - **Navigation**:
    - Previous lesson
    - Mark complete
    - Next lesson

#### **Reusable Module Tools**:

1. **Reflection Journal**
   - Path: `tool:reflection_journal`
   - Textarea for personal reflections
   - Auto-saves to `lesson_responses`

2. **Air Quality ROI Calculator**
   - Path: `tool:air_quality_roi`
   - Inputs: office size, current conditions
   - Outputs: cost savings, ROI timeline

3. **Air Quality Assessment**
   - Path: `tool:air_quality_assessment`
   - Multi-step questionnaire
   - Generates recommendations

4. **Air Quality Impact Calculator**
   - Path: `tool:air_quality_impact`
   - Calculates CO₂ reduction
   - Health benefits estimation

5. **Carbon Footprint Calculator**
   - Path: `tool:carbon_footprint`
   - Company-wide emissions
   - Reduction suggestions

6. **Cost Savings Calculator**
   - Path: `tool:cost_savings`
   - Energy, water, waste reduction
   - Financial projections

7. **Implementation Plan Generator**
   - Path: `tool:implementation_plan`
   - 90-day action plan template
   - Milestone tracking

8. **Evidence Uploader**
   - Path: `tool:evidence_uploader`
   - Image/document upload to Supabase Storage
   - Proof of implementation
   - Links to `project_submissions`

#### **Certifications**
- **Path**: `/employee-portal/certifications`
- **Features**:
  - Grid of earned certificates
  - Stats:
    - Total certificates
    - Total XP
    - Remaining modules
  - Each certificate shows:
    - Module name
    - Date earned
    - XP earned
    - Verification code
    - "View" button

#### **Certificate View**
- **Path**: `/employee-portal/modules/[moduleId]/certificate`
- **Features**:
  - Beautiful certificate design
  - Employee name
  - Company name
  - Module title
  - Date issued
  - XP earned
  - Verification code
  - Actions:
    - Download as PNG
    - Copy verification link
    - Share to social media (Twitter, LinkedIn, Facebook, Instagram Stories)

#### **Impact Dashboard**
- **Path**: `/employee-portal/impact`
- **Sections**:
  1. **Gamification**:
     - Current level
     - XP progress to next level
     - Progress bar
  2. **Personal Metrics**:
     - Modules completed
     - Time spent learning
     - CO₂ equivalent reduced
     - Cost savings contributed
  3. **Visual Impact**:
     - Trees equivalent
     - Car miles offset
     - LED hours equivalent
  4. **Achievements**:
     - Badge grid (e.g., "Primer Paso", "En Racha", "Dedicado")
  5. **Company Impact**:
     - Total employees trained
     - Company-wide XP
     - Collective impact

---

### **4. Marketplace**

#### **Browse Page**
- **Path**: `/marketplace`
- **Features**:
  - **Filters**:
    - Core value
    - Industry
    - Price range
    - Difficulty level
    - Rating
  - **Sorting**:
    - Most popular
    - Highest rated
    - Newest
    - Price: low to high
  - **Module Cards**:
    - Thumbnail
    - Title
    - Creator community
    - Price
    - Rating
    - Enrollments
    - Duration
    - "Ver Detalles" button

#### **Module Detail Page**
- **Path**: `/marketplace/[id]`
- **Sections**:
  1. **Header**:
     - Title
     - Creator community
     - Rating and reviews
     - Price calculator (employee count slider)
  2. **Overview**:
     - Description
     - Learning objectives
     - Who should take this
     - What you'll learn
  3. **Curriculum**:
     - Lesson list with titles
     - Estimated duration
     - First lesson preview
  4. **Creator**:
     - Community profile
     - Past projects
     - Impact metrics
  5. **Reviews**:
     - Star ratings
     - Review text
     - Verified purchases
  6. **Pricing**:
     - Base price
     - Employee count selector
     - Total cost
     - "Add to Cart" or "Buy Now"

---

### **5. Module Builder (Community Creator Tool)**

#### **Creator Application**
- **Path**: `/creator/apply`
- **Steps**:
  1. **Personal Info**:
     - Name, email, phone
     - Organization type
     - Organization name
  2. **Experience**:
     - Years of experience
     - Past projects
     - Impact metrics
  3. **Proposed Module**:
     - Title
     - Core value
     - Topic description
     - Target audience
     - Unique value
     - Lesson count & duration
     - Learning objectives
     - Expected outcomes
  4. **Proof & Commitment**:
     - Evidence of work
     - Testimonials
     - Media links
     - Time commitment
     - Support needed
     - Motivation

#### **Module Builder**
- **Path**: `/creator/module-builder` (Future: `/communities/[id]/admin-panel/modules/create`)
- **Features**:
  - Drag-and-drop lesson ordering
  - Lesson editor:
    - Title, description
    - Story content (rich text)
    - Learning objectives (list)
    - Key points (list)
    - Did you know facts
    - Real-world examples
    - Activity/tool selection
    - Resource links
    - Next steps
  - Preview mode
  - Save as draft
  - Submit for review

---

### **6. Admin Dashboard**

#### **Overview Tab**
- **Path**: `/admin` (Tab: Overview)
- **Stats Cards**:
  - Total communities
  - Total content items
  - Total users
- **Recent Activity**:
  - Recent communities created
  - Recent content posted
  - Recent user signups

#### **Corporate Training Tab**
- **Path**: `/admin` (Tab: Corporate Training)
- **Coming Soon**:
  - List of all corporate accounts
  - Employee enrollment stats
  - Module completion rates
  - Certificate issuance tracking
  - Revenue from training sales

#### **Marketplace Tab**
- **Path**: `/admin` (Tab: Marketplace)
- **Coming Soon**:
  - All published modules
  - Pending creator applications
  - Module sales dashboard
  - Revenue analytics
  - Module performance metrics
  - Creator approval workflow

#### **Wallets & Treasury Tab**
- **Path**: `/admin` (Tab: Wallets & Treasury)
- **Coming Soon**:
  - Platform treasury balance
  - All community wallets
  - All creator wallets
  - Transaction history
  - Withdrawal requests
  - Revenue split analytics
  - Payout management

---

### **7. Certificate Verification**

#### **Public Verification Page**
- **Path**: `/verify/[code]`
- **Features**:
  - Certificate details:
    - Employee/company name
    - Module completed
    - Date issued
    - XP earned
  - Verification status (✅ Valid or ❌ Invalid)
  - Crowd Conscious branding
  - "Print" button

---

## 👥 User Roles & Permissions

### **Role Hierarchy**

```
Super Admin (user_type: 'admin')
  └─ Full platform access
  └─ Manage communities
  └─ Approve modules
  └─ Manage wallets
  └─ View all data

Corporate Admin (corporate_role: 'admin', is_corporate_user: true)
  └─ Manage corporate account
  └─ Invite employees
  └─ View employee progress
  └─ Access corporate dashboard
  └─ Purchase modules
  └─ Download reports

Corporate Employee (corporate_role: 'employee', is_corporate_user: true)
  └─ Access employee portal
  └─ Complete modules
  └─ Earn certificates
  └─ View personal progress
  └─ View personal impact

Community Founder (community_members.role: 'founder')
  └─ Full community admin
  └─ Manage members
  └─ Edit community
  └─ Approve sponsorships
  └─ Access community wallet
  └─ 3x voting power

Community Admin (community_members.role: 'admin')
  └─ Manage content
  └─ Moderate posts
  └─ Approve sponsorships
  └─ 2x voting power

Community Member (community_members.role: 'member')
  └─ Create content
  └─ Vote on proposals
  └─ Comment
  └─ 1x voting power

Brand (user_type: 'brand')
  └─ Sponsor needs
  └─ View community impact
  └─ Access sponsorship dashboard

Regular User (user_type: 'user')
  └─ Join communities
  └─ Create content
  └─ Vote
  └─ Comment

Public (Not authenticated)
  └─ View communities
  └─ View content
  └─ View impact metrics
  └─ Sign up
```

---

## 🔐 Authentication & Security

### **Supabase Auth Integration**

**Providers**:
- ✅ Email/Password
- ✅ Magic Link (Future)
- ⚠️ OAuth (Google, Facebook) - Planned

**Session Management**:
- Server-side session cookies
- `createClient()` from `@/lib/supabase-server`
- Middleware checks auth status
- Auto-redirect to `/login` for protected routes

### **Row Level Security (RLS)**

All tables have RLS enabled. Key policies:

**Public Read**:
- `communities`, `community_content`, `profiles`, `votes`, `sponsorships`, `impact_metrics`, `share_links`

**Authenticated Write**:
- Users can create own profile
- Users can create communities (as creator)
- Users can join communities
- Community members can create content

**Role-Based Access**:
- Only community founders/admins can approve sponsorships
- Only corporate admins can invite employees
- Only super admins can see all wallets
- Only content creators can create share links

**Data Isolation**:
- Employees see only their own progress
- Corporate admins see only their company data
- Community admins see only their community data

---

## 💳 Payment & Revenue Systems

### **Stripe Integration**

**Sponsorships** (Community Platform):
```typescript
POST /api/create-checkout
→ Stripe Checkout Session
→ Redirect to Stripe
→ Webhook: /api/webhooks/stripe
→ Update sponsorship status to 'paid'
→ Credit community pool (85%)
→ Platform fee (15%)
```

**Corporate Subscriptions** (Future):
```typescript
POST /api/corporate/signup
→ Create corporate_account
→ Stripe Customer
→ Stripe Subscription
→ Auto-enroll employees
```

**Marketplace Purchases** (Phase 3):
```typescript
POST /api/marketplace/purchase
→ Stripe Payment Intent
→ process_module_sale() SQL function
→ Split revenue:
   - Platform wallet: 30%
   - Community wallet: 50%
   - Creator wallet: 20%
→ Update module_sales record
→ Create wallet_transactions
```

### **Wallet System**

**Revenue Distribution**:

```sql
-- Automated by process_module_sale() function
CALL process_module_sale(
  module_id := 'uuid',
  corporate_account_id := 'uuid',
  total_amount := 18000.00,
  creator_donates := false
);
```

**Creator Donation Option**:
- Creator can donate their 20% to community
- Increases community share from 50% to 70%
- Strengthens community-first model

**Withdrawal Flow** (Future - Phase 5):
1. User requests withdrawal (min: $500 MXN)
2. Admin reviews request
3. Stripe Connect payout
4. Update wallet balance
5. Create transaction record

---

## 📧 Email System

### **Resend Integration**

**Email Types**:

1. **Welcome Email**
   - Trigger: User signup
   - Recipient: New user
   - Template: `lib/email-templates/welcome.tsx`
   - Content: Platform intro, next steps

2. **Employee Invitation**
   - Trigger: Corporate admin invites employee
   - Recipient: Employee email
   - Template: Custom HTML
   - Content: Company name, invitation link, expiration

3. **Assessment Quote**
   - Trigger: User completes assessment
   - Recipient: User email
   - Template: `lib/email-templates/assessment-quote.tsx`
   - Content: Results, recommended modules, pricing

4. **Sponsorship Approved**
   - Trigger: Community approves sponsorship
   - Recipient: Sponsor
   - Template: `lib/email-templates/sponsorship-approved.tsx`
   - Content: Thank you, community impact, receipt

5. **Monthly Impact Report** (Future - Cron)
   - Trigger: Monthly cron job
   - Recipient: All users
   - Template: `lib/email-templates/monthly-report.tsx`
   - Content: Personal stats, community impact, achievements

6. **Certificate Issued** (Future)
   - Trigger: Module completion
   - Recipient: Employee
   - Template: TBD
   - Content: Congrats, certificate link, share buttons

**Cron Jobs** (Vercel Cron - Future):
- `api/cron/monthly-impact`: Send monthly reports
- `api/cron/event-reminders`: Remind about upcoming events
- `api/cron/challenge-reminders`: Remind about challenge deadlines

---

## 🚀 Deployment & Environment

### **Vercel Configuration**

**Build Settings**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

**Environment Variables**:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Resend
RESEND_API_KEY=re_xxx

# URLs
NEXT_PUBLIC_APP_URL=https://crowdconscious.app
NEXT_PUBLIC_API_URL=https://crowdconscious.app/api
```

**Deployment Checklist**:
- [x] Environment variables set in Vercel
- [x] Database migrations run in Supabase
- [x] RLS policies enabled
- [x] Stripe webhooks configured
- [x] DNS configured (crowdconscious.app)
- [x] SSL certificate active
- [ ] Monitoring setup (Sentry/LogRocket)
- [ ] Performance tracking
- [ ] Error tracking

---

## 📊 Performance & Analytics

### **Current Metrics**

**Database**:
- Tables: 24
- Indexes: 50+
- RLS Policies: 60+
- Storage Buckets: 3 (avatars, content-images, evidence-uploads)

**API Endpoints**: 70+
- Community: 15
- Corporate: 20
- Marketplace: 10
- Wallets: 5
- Certificates: 5
- Admin: 10
- Misc: 5

**Pages**: 45+
- Public: 10
- Community: 8
- Corporate: 6
- Employee: 6
- Marketplace: 3
- Admin: 4
- Misc: 8

---

## 🎯 Next Steps & Roadmap

### **Immediate Priorities** (November 2025)

1. **Complete Wallet System**:
   - ✅ Database tables
   - ✅ API endpoints
   - ✅ UI components
   - ⏳ Connect marketplace purchases
   - ⏳ Test revenue splits

2. **Move Module Builder**:
   - ⏳ Relocate to `/communities/[id]/admin-panel/modules`
   - ⏳ Integrate wallet display
   - ⏳ Show module earnings

3. **Performance Optimization**:
   - ⏳ Code splitting
   - ⏳ Image optimization
   - ⏳ Database query optimization
   - ⏳ Caching strategy

4. **Bug Fixes**:
   - ⏳ Test all user flows
   - ⏳ Fix any routing issues
   - ⏳ Ensure mobile responsiveness
   - ⏳ Test on multiple devices

### **Short Term** (December 2025 - January 2026)

1. **Marketplace Launch**:
   - Complete module builder
   - Launch 3-5 initial modules
   - Onboard first community creators
   - Marketing campaign

2. **Corporate Features**:
   - Custom module requests
   - Advanced reporting
   - Team management
   - API integrations (HR systems)

3. **Mobile Optimization**:
   - Test on iOS/Android
   - Optimize touch interactions
   - Improve mobile lesson viewer
   - PWA features

### **Medium Term** (Q1-Q2 2026)

1. **Scale Marketplace**:
   - 20+ modules
   - 10+ community creators
   - 50+ corporate clients
   - $5-8M MXN revenue

2. **Platform Enhancements**:
   - Live workshops/webinars
   - Discussion forums
   - Advanced analytics
   - White-label options

3. **Geographic Expansion**:
   - Launch in Colombia
   - Launch in Argentina
   - Spanish localization refinement
   - Local payment methods

### **Long Term** (2026-2027)

1. **Mobile Apps**:
   - Native iOS app
   - Native Android app
   - Offline mode
   - Push notifications

2. **Enterprise Features**:
   - Custom module development
   - Dedicated success manager
   - SLA guarantees
   - Advanced integrations

3. **Impact Fund**:
   - $50M+ MXN to communities
   - 100+ community creators
   - 200+ corporate clients
   - 10,000+ employees trained

---

## 📝 Conclusion

Crowd Conscious is a comprehensive platform that bridges the gap between corporate training needs and community-driven sustainability solutions. By creating a two-sided marketplace, we enable:

✅ **Communities** to monetize their expertise and fund local projects
✅ **Corporations** to access authentic training that creates real impact
✅ **Employees** to learn from real-world experiences and earn verifiable credentials
✅ **The Platform** to sustain operations while maximizing community benefit

**This guide serves as the single source of truth for all platform features, architecture, and future direction.**

---

*Last Updated: November 1, 2025*
*Version: 2.0*
*Maintainer: Francisco Blockstrand (francisco@crowdconscious.app)*

