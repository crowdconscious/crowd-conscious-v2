# Concientizaciones - Technical Implementation Roadmap

## 🎯 Overview

This document outlines the **exact technical steps** to build the Concientizaciones corporate training portal. Use this alongside the main strategy document (`CONCIENTIZACIONES-STRATEGY.md`).

---

## 🏗️ System Architecture

### High-Level Structure

```
concientizaciones/                    (New Next.js app)
├── Shared Supabase Backend          (Same database)
├── Shared Authentication            (Same Supabase Auth)
└── API Integration Layer            (Connect to main app)

crowdconscious/                       (Existing app)
├── API endpoints for integration
└── Community creation from corporate
```

### Decision: Subdomain vs Separate Repo

**Recommended: Separate Next.js App with Shared Supabase**

**Pros:**

- Clean separation of concerns
- Different UI/UX paradigm (corporate vs community)
- Independent deployment and scaling
- Easier to white-label later
- Can have different update cadences

**Cons:**

- Need to manage two codebases
- Shared database requires coordination

**Implementation:**

```bash
# Structure
/crowd-conscious-v2/          # Existing community app
/concientizaciones/           # New corporate training app

# Both apps connect to:
- Same Supabase project
- Same auth system
- Shared database tables
```

---

## 📊 Database Implementation

### Phase 1: Core Tables (Week 1)

Run these migrations in your Supabase SQL editor:

#### Migration 1: Corporate Accounts

```sql
-- ============================================
-- FILE: 001_corporate_accounts.sql
-- ============================================

-- Corporate Accounts Table
CREATE TABLE corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_slug TEXT UNIQUE,
  industry TEXT,
  employee_count INTEGER,
  location POINT,
  address TEXT,

  -- Program Details
  program_tier TEXT CHECK (program_tier IN ('inicial', 'completo', 'elite')),
  purchase_date TIMESTAMP DEFAULT NOW(),
  program_start_date TIMESTAMP,
  program_end_date TIMESTAMP,
  program_duration_months INTEGER, -- 3, 6, or 12

  -- Limits
  employee_limit INTEGER NOT NULL,
  modules_included TEXT[] DEFAULT ARRAY['clean_air', 'clean_water', 'safe_cities'], -- Add more based on tier

  -- Customization
  custom_branding JSONB DEFAULT '{}', -- {logo_url, primary_color, secondary_color}
  custom_modules UUID[], -- References to custom course modules

  -- Status & Certification
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'cancelled')),
  certification_status TEXT DEFAULT 'not_started' CHECK (certification_status IN ('not_started', 'in_progress', 'certified')),
  certification_level TEXT CHECK (certification_level IN ('participant', 'contributor', 'leader')),
  certification_date TIMESTAMP,

  -- Financial
  total_paid DECIMAL DEFAULT 0,
  currency TEXT DEFAULT 'MXN',
  community_credits_balance DECIMAL DEFAULT 0,
  next_renewal_date TIMESTAMP,

  -- Contacts
  admin_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  hr_contact_email TEXT,
  billing_email TEXT,
  phone TEXT,

  -- Integration with Main App
  community_id UUID REFERENCES communities(id), -- Created upon certification

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_corporate_accounts_slug ON corporate_accounts(company_slug);
CREATE INDEX idx_corporate_accounts_tier ON corporate_accounts(program_tier);
CREATE INDEX idx_corporate_accounts_status ON corporate_accounts(status);
CREATE INDEX idx_corporate_accounts_admin ON corporate_accounts(admin_user_id);
CREATE INDEX idx_corporate_accounts_community ON corporate_accounts(community_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_corporate_accounts_updated_at
  BEFORE UPDATE ON corporate_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE corporate_accounts ENABLE ROW LEVEL SECURITY;

-- Admins can view their own company
CREATE POLICY "Corporate admins view own company" ON corporate_accounts
  FOR SELECT USING (
    auth.uid() = admin_user_id OR
    auth.uid() IN (
      SELECT employee_id FROM course_enrollments
      WHERE corporate_account_id = id
    )
  );

-- Admins can update their own company
CREATE POLICY "Corporate admins update own company" ON corporate_accounts
  FOR UPDATE USING (auth.uid() = admin_user_id);

-- Platform admins can see all
CREATE POLICY "Platform admins view all companies" ON corporate_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );
```

#### Migration 2: Extend Profiles Table

```sql
-- ============================================
-- FILE: 002_extend_profiles_for_corporate.sql
-- ============================================

-- Add corporate fields to existing profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_corporate_user BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS corporate_role TEXT CHECK (corporate_role IN ('admin', 'hr', 'employee'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS training_level INTEGER DEFAULT 1;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_corporate_account ON profiles(corporate_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_corporate ON profiles(is_corporate_user);
```

#### Migration 3: Courses & Modules

```sql
-- ============================================
-- FILE: 003_courses_and_modules.sql
-- ============================================

-- Courses Table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  core_value TEXT, -- 'clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade', 'integration'

  -- Story Context
  story_setting JSONB DEFAULT '{}', -- {industry, location, company_type}
  characters JSONB DEFAULT '[]', -- [{name, role, bio, avatar_url}]

  -- Content Organization
  module_count INTEGER DEFAULT 0,
  estimated_hours INTEGER,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),

  -- Customization
  is_custom BOOLEAN DEFAULT false,
  corporate_account_id UUID REFERENCES corporate_accounts(id), -- If custom course
  industry_specific TEXT[], -- ['manufacturing', 'office', 'retail']

  -- Certification
  certification_points INTEGER DEFAULT 100,
  passing_percentage INTEGER DEFAULT 70,

  -- Status
  published BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Course Modules Table
CREATE TABLE course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,

  -- Module Info
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER,

  -- Story Chapter
  story_chapter JSONB DEFAULT '{}',
  /*
  {
    chapter_number: 1,
    narrative: "María notices her daughter's asthma...",
    characters_involved: ["maría", "don_roberto"],
    conflict: "Air quality affecting health",
    resolution_hint: "Learn about emissions"
  }
  */

  -- Content Sections
  lessons JSONB DEFAULT '[]',
  /*
  [
    {
      type: 'video',
      title: 'Understanding Air Quality',
      content_url: 'https://...',
      duration: 600,
      transcript: '...'
    },
    {
      type: 'text',
      title: 'PM2.5 and Your Health',
      content: 'markdown content...',
      reading_time: 5
    },
    {
      type: 'interactive',
      title: 'Calculate Your Carbon Footprint',
      component: 'CarbonCalculator',
      data: {}
    }
  ]
  */

  -- Activities
  activities JSONB DEFAULT '[]',
  /*
  [
    {
      type: 'quiz',
      title: 'Air Quality Assessment',
      questions: [...],
      passing_score: 70
    },
    {
      type: 'survey',
      title: 'Your Company's Air Impact',
      questions: [...]
    },
    {
      type: 'photo_challenge',
      title: 'Spot the Emissions',
      instructions: '...',
      required_photos: 3
    }
  ]
  */

  -- Mini-Project
  mini_project JSONB DEFAULT '{}',
  /*
  {
    title: "Create Air Quality Monitoring Station",
    description: "Work with neighbors to set up monitoring",
    deliverables: [
      "3 actionable emission reduction ideas",
      "Baseline air quality measurement",
      "Photos of monitoring station"
    ],
    verification_criteria: [...],
    estimated_hours: 4
  }
  */

  -- Requirements
  requires_project_submission BOOLEAN DEFAULT true,
  passing_score INTEGER DEFAULT 70,
  xp_reward INTEGER DEFAULT 100,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(course_id, order_index)
);

-- Indexes
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_core_value ON courses(core_value);
CREATE INDEX idx_courses_published ON courses(published) WHERE published = true;
CREATE INDEX idx_modules_course ON course_modules(course_id);

-- RLS Policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;

-- Anyone can view published courses
CREATE POLICY "Anyone can view published courses" ON courses
  FOR SELECT USING (published = true);

-- Corporate users can view assigned courses
CREATE POLICY "Corporate users view assigned courses" ON courses
  FOR SELECT USING (
    id IN (
      SELECT ce.course_id FROM course_enrollments ce
      WHERE ce.employee_id = auth.uid()
    )
  );

-- Modules follow course visibility
CREATE POLICY "View modules of accessible courses" ON course_modules
  FOR SELECT USING (
    course_id IN (
      SELECT id FROM courses WHERE published = true
    )
  );
```

#### Migration 4: Enrollments & Progress

```sql
-- ============================================
-- FILE: 004_enrollments_and_progress.sql
-- ============================================

-- Course Enrollments
CREATE TABLE course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,

  -- Assignment
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  mandatory BOOLEAN DEFAULT true,

  -- Progress
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'certified')),
  completion_percentage INTEGER DEFAULT 0,
  current_module_id UUID REFERENCES course_modules(id),
  modules_completed INTEGER DEFAULT 0,

  -- Time Tracking
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  total_time_spent INTEGER DEFAULT 0, -- minutes
  last_accessed_at TIMESTAMP,

  -- Scoring
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  final_score INTEGER,

  -- XP & Achievements
  xp_earned INTEGER DEFAULT 0,
  badges_earned TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(employee_id, course_id)
);

-- Module Progress
CREATE TABLE module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES course_enrollments(id) ON DELETE CASCADE,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,

  -- Status
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  completion_percentage INTEGER DEFAULT 0,

  -- Tracking
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  time_spent INTEGER DEFAULT 0, -- minutes

  -- Content Progress
  lessons_completed INTEGER DEFAULT 0,
  activities_completed JSONB DEFAULT '[]', -- [{activity_id, completed_at, score}]

  -- Quiz/Activity Scores
  quiz_attempts INTEGER DEFAULT 0,
  best_quiz_score INTEGER DEFAULT 0,
  last_quiz_score INTEGER,

  -- Project
  project_submitted BOOLEAN DEFAULT false,
  project_data JSONB DEFAULT '{}',
  /*
  {
    submitted_at: timestamp,
    deliverables: [
      {type: 'text', content: '...'},
      {type: 'photo', url: '...'},
      {type: 'metric', value: 123, unit: 'kg'}
    ],
    impact_metrics: {...},
    neighbor_feedback: '...'
  }
  */
  project_approved BOOLEAN DEFAULT false,
  project_reviewed_at TIMESTAMP,
  project_reviewed_by UUID REFERENCES profiles(id),
  project_feedback TEXT,
  project_score INTEGER,

  -- XP
  xp_earned INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(enrollment_id, module_id)
);

-- Indexes
CREATE INDEX idx_enrollments_employee ON course_enrollments(employee_id);
CREATE INDEX idx_enrollments_corporate ON course_enrollments(corporate_account_id);
CREATE INDEX idx_enrollments_status ON course_enrollments(status);
CREATE INDEX idx_module_progress_enrollment ON module_progress(enrollment_id);
CREATE INDEX idx_module_progress_status ON module_progress(status);

-- RLS Policies
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;

-- Employees view own enrollments
CREATE POLICY "Employees view own enrollments" ON course_enrollments
  FOR SELECT USING (auth.uid() = employee_id);

-- Corporate admins view company enrollments
CREATE POLICY "Corporate admins view company enrollments" ON course_enrollments
  FOR SELECT USING (
    corporate_account_id IN (
      SELECT id FROM corporate_accounts WHERE admin_user_id = auth.uid()
    )
  );

-- Employees update own progress
CREATE POLICY "Employees update own progress" ON module_progress
  FOR ALL USING (
    enrollment_id IN (
      SELECT id FROM course_enrollments WHERE employee_id = auth.uid()
    )
  );
```

#### Migration 5: Certifications & Impact

```sql
-- ============================================
-- FILE: 005_certifications_and_impact.sql
-- ============================================

-- Certifications
CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Certification Details
  certification_level TEXT CHECK (certification_level IN ('participant', 'contributor', 'leader')),
  certification_number TEXT UNIQUE, -- Format: CC-YYYY-NNNNNN

  -- Requirements Met
  courses_completed TEXT[], -- Course IDs
  modules_completed INTEGER,
  projects_implemented INTEGER,
  total_xp_earned INTEGER,

  -- Impact Documented
  impact_summary JSONB DEFAULT '{}',
  /*
  {
    clean_air: {value: 2400, unit: 'kg CO2', cost_saved: 12000},
    clean_water: {value: 15000, unit: 'liters', cost_saved: 8500},
    ...
  }
  */

  -- Dates
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Typically 1 year from issue
  renewed_at TIMESTAMP,

  -- Certificate Files
  certificate_pdf_url TEXT, -- Stored in Supabase Storage
  badge_image_url TEXT,
  shareable_url TEXT, -- Public verification page

  -- Verification
  verified BOOLEAN DEFAULT true,
  verification_code TEXT UNIQUE, -- For public verification
  verification_url TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Corporate Impact Metrics
CREATE TABLE corporate_impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,

  -- Metric Details
  metric_type TEXT NOT NULL, -- 'cost_savings', 'emissions_reduced', 'water_saved', etc
  category TEXT, -- 'clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade'

  -- Values
  baseline_value DECIMAL,
  current_value DECIMAL,
  improvement_value DECIMAL, -- Calculated: baseline - current
  improvement_percentage DECIMAL,

  -- Units
  unit TEXT, -- 'MXN', 'kg CO2', 'liters', 'kWh', etc

  -- Time Period
  measurement_period TEXT, -- 'monthly', 'quarterly', 'annual', 'program'
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  measured_at TIMESTAMP DEFAULT NOW(),

  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP,
  evidence JSONB DEFAULT '{}',
  /*
  {
    photos: ['url1', 'url2'],
    documents: ['url1'],
    calculations: {...},
    third_party_verification: '...'
  }
  */

  -- Community Benefit
  community_benefit_description TEXT,
  neighborhood_impact TEXT,

  -- Module/Project Link
  related_module_id UUID REFERENCES course_modules(id),
  related_project JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Neighborhood Partnerships
CREATE TABLE neighborhood_partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,

  -- Partner Details
  partner_type TEXT, -- 'neighbor', 'local_business', 'school', 'ngo', 'government'
  partner_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,

  -- Partnership Details
  partnership_type TEXT, -- 'supplier', 'beneficiary', 'collaborator', 'resource_recipient'
  description TEXT,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,

  -- Projects & Value
  projects_count INTEGER DEFAULT 0,
  total_investment DECIMAL DEFAULT 0,
  currency TEXT DEFAULT 'MXN',

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('proposed', 'active', 'completed', 'paused', 'cancelled')),

  -- Impact
  impact_created TEXT,
  impact_metrics JSONB DEFAULT '{}',

  -- Documentation
  agreement_url TEXT,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Company Assessments (Pre-program)
CREATE TABLE company_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id),

  -- Company Info
  industry TEXT,
  employee_count INTEGER,
  annual_revenue_range TEXT,

  -- Current State
  current_challenges TEXT[],
  waste_types TEXT[], -- ['plastic', 'energy', 'water', 'paper', 'electronic']
  community_location TEXT,
  neighborhood_issues TEXT[],
  supply_chain_size INTEGER,
  existing_esg_efforts BOOLEAN,
  esg_details TEXT,

  -- Employee Feedback (Aggregated)
  employee_survey_data JSONB DEFAULT '{}',
  /*
  {
    total_responses: 45,
    priorities: {
      air_quality: 23,
      water_conservation: 18,
      ...
    },
    satisfaction_scores: {...}
  }
  */

  -- Neighborhood Feedback
  neighbor_interviews JSONB DEFAULT '[]',
  /*
  [
    {
      name: "Don Roberto",
      type: "resident",
      concerns: ["emissions", "noise"],
      suggestions: ["plant trees", "better lighting"]
    }
  ]
  */
  community_needs TEXT[],

  -- Recommendations
  recommended_modules TEXT[],
  recommended_program TEXT, -- 'inicial', 'completo', 'elite'
  custom_focus_areas TEXT[],
  estimated_impact_potential TEXT, -- 'high', 'medium', 'low'
  custom_notes TEXT,

  -- Status
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  completed_by UUID REFERENCES profiles(id),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_certifications_employee ON certifications(employee_id);
CREATE INDEX idx_certifications_corporate ON certifications(corporate_account_id);
CREATE INDEX idx_certifications_level ON certifications(certification_level);
CREATE INDEX idx_certifications_number ON certifications(certification_number);
CREATE INDEX idx_impact_metrics_corporate ON corporate_impact_metrics(corporate_account_id);
CREATE INDEX idx_impact_metrics_category ON corporate_impact_metrics(category);
CREATE INDEX idx_partnerships_corporate ON neighborhood_partnerships(corporate_account_id);
CREATE INDEX idx_partnerships_status ON neighborhood_partnerships(status);

-- RLS Policies
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_impact_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_assessments ENABLE ROW LEVEL SECURITY;

-- View own certifications
CREATE POLICY "View own certifications" ON certifications
  FOR SELECT USING (
    auth.uid() = employee_id OR
    corporate_account_id IN (
      SELECT id FROM corporate_accounts WHERE admin_user_id = auth.uid()
    )
  );

-- Public verification (when verified)
CREATE POLICY "Public verification" ON certifications
  FOR SELECT USING (verified = true);
```

---

## 🏢 File Structure for New App

### Create New Next.js App

```bash
# Create new Next.js app
npx create-next-app@latest concientizaciones --typescript --tailwind --app --no-src-dir

cd concientizaciones
```

### Directory Structure

```
concientizaciones/
├── app/
│   ├── (auth)/                     # Authentication pages
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   ├── company/            # Company signup
│   │   │   │   └── page.tsx
│   │   │   └── employee/           # Employee invitation signup
│   │   │       └── page.tsx
│   │   └── layout.tsx              # Auth layout (centered, logo)
│   │
│   ├── (admin)/                    # Corporate admin dashboard
│   │   ├── layout.tsx              # Admin layout (sidebar, header)
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Overview dashboard
│   │   ├── employees/
│   │   │   ├── page.tsx            # Employee list
│   │   │   ├── invite/
│   │   │   │   └── page.tsx        # Invite employees
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Employee detail
│   │   ├── progress/
│   │   │   └── page.tsx            # Company-wide progress
│   │   ├── impact/
│   │   │   └── page.tsx            # Impact metrics
│   │   ├── certification/
│   │   │   └── page.tsx            # Certification status
│   │   ├── settings/
│   │   │   └── page.tsx            # Company settings
│   │   └── reports/
│   │       └── page.tsx            # Generate ESG reports
│   │
│   ├── (employee)/                 # Employee portal
│   │   ├── layout.tsx              # Employee layout (top nav)
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Employee dashboard
│   │   ├── courses/
│   │   │   ├── page.tsx            # My courses
│   │   │   └── [courseId]/
│   │   │       ├── page.tsx        # Course overview
│   │   │       └── module/
│   │   │           └── [moduleId]/
│   │   │               └── page.tsx # Module player
│   │   ├── projects/
│   │   │   ├── page.tsx            # My projects
│   │   │   └── [projectId]/
│   │   │       └── page.tsx        # Project detail
│   │   ├── achievements/
│   │   │   └── page.tsx            # XP, badges, progress
│   │   └── profile/
│   │       └── page.tsx            # Employee profile
│   │
│   ├── (public)/                   # Public pages
│   │   ├── page.tsx                # Marketing landing
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── demo/
│   │   │   └── page.tsx            # Demo request
│   │   └── verify/
│   │       └── [certificationNumber]/
│   │           └── page.tsx        # Public cert verification
│   │
│   ├── api/                        # API routes
│   │   ├── auth/
│   │   │   └── [...supabase]/
│   │   │       └── route.ts        # Supabase auth callback
│   │   ├── corporate/
│   │   │   ├── create/
│   │   │   │   └── route.ts        # Create corporate account
│   │   │   ├── graduate/
│   │   │   │   └── route.ts        # Graduate to main app
│   │   │   └── impact/
│   │   │       └── route.ts        # Track impact metrics
│   │   ├── enrollments/
│   │   │   ├── create/
│   │   │   │   └── route.ts        # Enroll employee
│   │   │   └── progress/
│   │   │       └── route.ts        # Update progress
│   │   ├── certifications/
│   │   │   ├── generate/
│   │   │   │   └── route.ts        # Generate certificate PDF
│   │   │   └── verify/
│   │   │       └── route.ts        # Verify certificate
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts        # Stripe webhooks
│   │
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   └── providers.tsx               # Context providers
│
├── components/
│   ├── admin/                      # Admin components
│   │   ├── DashboardStats.tsx
│   │   ├── EmployeeList.tsx
│   │   ├── ProgressChart.tsx
│   │   ├── ImpactMetrics.tsx
│   │   └── ESGReportGenerator.tsx
│   │
│   ├── employee/                   # Employee components
│   │   ├── CourseCard.tsx
│   │   ├── ModulePlayer.tsx
│   │   ├── StoryChapter.tsx
│   │   ├── QuizComponent.tsx
│   │   ├── ProjectSubmission.tsx
│   │   └── ProgressTracker.tsx
│   │
│   ├── shared/                     # Shared components
│   │   ├── Navigation.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   └── LoadingSpinner.tsx
│   │
│   ├── ui/                         # UI components (Radix)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   ├── input.tsx
│   │   ├── progress.tsx
│   │   └── tabs.tsx
│   │
│   └── course/                     # Course-specific
│       ├── VideoPlayer.tsx
│       ├── InteractiveActivity.tsx
│       ├── CarbonCalculator.tsx
│       ├── WaterAudit.tsx
│       └── ImpactTracker.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── middleware.ts           # Auth middleware
│   ├── stripe.ts                   # Stripe integration
│   ├── pdf.ts                      # PDF generation
│   ├── email.ts                    # Email sending (Resend)
│   ├── utils.ts                    # Utility functions
│   └── constants.ts                # Constants
│
├── hooks/
│   ├── use-user.ts                 # Current user hook
│   ├── use-corporate-account.ts    # Corporate account hook
│   ├── use-enrollments.ts          # User enrollments
│   ├── use-progress.ts             # Progress tracking
│   └── use-impact-metrics.ts       # Impact metrics
│
├── types/
│   ├── database.ts                 # Generated Supabase types
│   ├── course.ts                   # Course types
│   ├── enrollment.ts               # Enrollment types
│   └── impact.ts                   # Impact types
│
├── config/
│   ├── site.ts                     # Site config
│   └── courses.ts                  # Course configuration
│
├── public/
│   ├── images/
│   ├── videos/
│   └── certificates/
│
├── .env.local                      # Environment variables
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🔧 Configuration Files

### Environment Variables

```bash
# .env.local

# Supabase (Same as main app)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site URL
NEXT_PUBLIC_SITE_URL=https://concientizaciones.crowdconscious.app
NEXT_PUBLIC_MAIN_APP_URL=https://crowdconscious.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (Email)
RESEND_API_KEY=re_...

# S3 or Supabase Storage
NEXT_PUBLIC_STORAGE_URL=your_storage_url
```

### Package.json

```json
{
  "name": "concientizaciones",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "14.2.x",
    "react": "^18",
    "react-dom": "^18",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "stripe": "^14.10.0",
    "@stripe/stripe-js": "^2.4.0",
    "react-hook-form": "^7.49.3",
    "zod": "^3.22.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-progress": "^1.0.3",
    "lucide-react": "^0.300.0",
    "date-fns": "^3.0.6",
    "recharts": "^2.10.3",
    "react-player": "^2.14.1",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "resend": "^3.2.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.4.0",
    "eslint": "^8",
    "eslint-config-next": "14.2.x"
  }
}
```

---

## 🔌 Integration APIs (Add to Main App)

### API Endpoints to Add to Main crowdconscious.app

```typescript
// app/api/corporate/graduate-to-community/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { corporate_account_id, certification_id } = await req.json();

  try {
    // 1. Get corporate account details
    const { data: corporate, error: corpError } = await supabase
      .from("corporate_accounts")
      .select("*")
      .eq("id", corporate_account_id)
      .single();

    if (corpError) throw corpError;

    // 2. Create community in main app
    const { data: community, error: communityError } = await supabase
      .from("communities")
      .insert({
        name: corporate.company_name,
        slug: corporate.company_slug,
        description: `${corporate.company_name} - Certified Conscious Company`,
        address: corporate.address,
        location: corporate.location,
        core_values: [
          "clean_air",
          "clean_water",
          "safe_cities",
          "zero_waste",
          "fair_trade",
        ],
        creator_id: corporate.admin_user_id,
        is_corporate_community: true,
        certification_level: corporate.certification_level,
      })
      .select()
      .single();

    if (communityError) throw communityError;

    // 3. Get all certified employees
    const { data: employees } = await supabase
      .from("certifications")
      .select("employee_id")
      .eq("corporate_account_id", corporate_account_id);

    // 4. Add employees as founding members
    const memberships =
      employees?.map((emp) => ({
        community_id: community.id,
        user_id: emp.employee_id,
        role:
          emp.employee_id === corporate.admin_user_id ? "founder" : "member",
        voting_power: emp.employee_id === corporate.admin_user_id ? 3 : 1,
      })) || [];

    await supabase.from("community_members").insert(memberships);

    // 5. Load sponsorship credits
    if (corporate.community_credits_balance > 0) {
      // Create credit record or wallet entry
      await supabase.from("community_credits").insert({
        community_id: community.id,
        amount: corporate.community_credits_balance,
        source: "corporate_program",
        corporate_account_id: corporate_account_id,
      });
    }

    // 6. Update corporate account with community_id
    await supabase
      .from("corporate_accounts")
      .update({
        community_id: community.id,
        status: "completed",
      })
      .eq("id", corporate_account_id);

    // 7. Send celebration email
    // await sendCelebrationEmail(corporate, community)

    return NextResponse.json({
      success: true,
      community_id: community.id,
      community_slug: community.slug,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 📝 What We'll Build - Phase by Phase

### Phase 1 (Weeks 1-2): MVP Core

**Week 1 Focus: Foundation**

1. Set up new Next.js app with Supabase
2. Run all database migrations
3. Create authentication flows (login, signup)
4. Build basic admin dashboard (empty state)
5. Build basic employee dashboard (empty state)

**Week 2 Focus: Course Player** 6. Create course player component 7. Build Module 1 content (Clean Air) 8. Implement progress tracking 9. Create quiz component 10. Build project submission form

**Outcome:** Admin can create account, invite 1 employee, employee can take 1 module

---

### Phase 2 (Weeks 3-4): Content Expansion

**Week 3 Focus: More Modules**

1. Build Modules 2-3 (Water, Safe Cities)
2. Story continuity system
3. Improve course player UX
4. Add video player support
5. Create interactive activities

**Week 4 Focus: Complete Curriculum** 6. Build Modules 4-6 (Waste, Fair Trade, Integration) 7. Complete story arc 8. Test full employee journey 9. Add gamification (XP, badges) 10. Polish mobile experience

**Outcome:** Complete 6-module curriculum, tested end-to-end

---

### Phase 3 (Weeks 5-6): Certification & Integration

**Week 5 Focus: Certification**

1. Certification requirements tracker
2. Certificate PDF generation
3. Digital badge system
4. Public verification page
5. Celebration/graduation page

**Week 6 Focus: Main App Bridge** 6. Build graduate-to-community API 7. Test community creation 8. Test employee migration 9. Test credit loading 10. End-to-end integration test

**Outcome:** Certified companies can graduate to main app

---

### Phase 4 (Weeks 7-8): Admin Tools

**Week 7 Focus: Admin Dashboard**

1. Company-wide progress dashboard
2. Employee management (invite, remove)
3. Individual employee drilldown
4. Impact metrics visualization
5. ESG report generator

**Week 8 Focus: Assessment Tools** 6. Pre-program company assessment 7. Employee survey system 8. Recommendation engine 9. Custom branding (Elite tier) 10. Analytics and reporting

**Outcome:** Full-featured admin experience

---

### Phase 5 (Weeks 9-10): Go-to-Market

**Week 9 Focus: Marketing**

1. Public landing page
2. Pricing page
3. Demo request flow
4. Email sequences
5. Demo environment setup

**Week 10 Focus: Polish & Launch** 6. Bug fixes and QA 7. Performance optimization 8. Mobile polish 9. Documentation 10. Soft launch prep

**Outcome:** Ready for pilot programs

---

## ✅ Pre-Launch Checklist

### Technical Setup

- [ ] New Next.js app created
- [ ] Supabase connected (same project as main app)
- [ ] All database migrations run successfully
- [ ] RLS policies tested
- [ ] Authentication working
- [ ] Subdomain configured (concientizaciones.crowdconscious.app)
- [ ] SSL certificate active
- [ ] Environment variables set

### Core Features

- [ ] Corporate account creation flow
- [ ] Employee invitation system
- [ ] Course player functional
- [ ] Progress tracking working
- [ ] Quiz/assessment system
- [ ] Project submission working
- [ ] Certification generation
- [ ] Graduate-to-community API

### Content

- [ ] Module 1 (Clean Air) complete
- [ ] Module 2 (Clean Water) complete
- [ ] Module 3 (Safe Cities) complete
- [ ] Module 4 (Zero Waste) complete
- [ ] Module 5 (Fair Trade) complete
- [ ] Module 6 (Integration) complete
- [ ] Story arc coherent
- [ ] All videos uploaded
- [ ] All quizzes tested

### Testing

- [ ] Admin user journey tested
- [ ] Employee user journey tested
- [ ] Certification flow tested
- [ ] Community creation tested
- [ ] Mobile responsive (all pages)
- [ ] Performance tested (Lighthouse > 90)
- [ ] Cross-browser tested

### Go-to-Market

- [ ] Landing page live
- [ ] Demo video produced
- [ ] Pricing page complete
- [ ] Payment processing working
- [ ] Email notifications working
- [ ] Support email set up
- [ ] Demo environment ready

---

## 🚀 Next Steps - Your Action Items

### This Week:

1. ✅ **Review strategy doc** (CONCIENTIZACIONES-STRATEGY.md)
2. ✅ **Review technical roadmap** (this doc)
3. **Make key decisions:**
   - Confirm subdomain: concientizaciones.crowdconscious.app?
   - Confirm we're using separate Next.js app?
   - Confirm Phase 1 timeline (2 weeks)?
4. **Set up infrastructure:**
   - Create new Next.js app
   - Run database migrations
   - Configure subdomain
5. **Start content creation:**
   - Write Module 1 story script
   - Outline learning objectives
   - Plan mini-project

### Next Week:

1. Build authentication flows
2. Build basic dashboards
3. Start course player component
4. Create first module content
5. Test with internal users

---

## 📞 Questions to Answer Before Building

1. **Content Creation:**
   - Will you write course content or hire a writer?
   - Will you produce videos in-house or hire?
   - What's realistic timeline for 6 modules of content?

2. **Pilot Programs:**
   - Do you have 3 companies in mind for pilots?
   - What industries will you focus on first?
   - When do you want to launch pilots?

3. **Resources:**
   - Is this full-time or part-time project?
   - Will you build solo or hire developers?
   - What's your budget for content production?

4. **Integration:**
   - Should certification immediately create community or require approval?
   - What happens if company doesn't want to graduate to main app?
   - Should there be a trial period in community?

---

## 🎯 Success Criteria for MVP

Before launching pilots, we need:

✅ **Functional:**

- [ ] Admin can sign up and invite employees
- [ ] Employees can take all 6 modules
- [ ] Progress is tracked accurately
- [ ] Projects can be submitted and reviewed
- [ ] Certification can be generated
- [ ] Community can be created from certified company

✅ **Usable:**

- [ ] Works on mobile and desktop
- [ ] Navigation is intuitive
- [ ] Course content is engaging
- [ ] No major bugs

✅ **Valuable:**

- [ ] Content teaches actual sustainability practices
- [ ] Projects create measurable impact
- [ ] Certification is credible and shareable
- [ ] Bridge to main app is seamless

---

**Ready to build?** Let's start with Phase 1, Week 1. 🚀

_Document Version: 1.0_
_Last Updated: October 27, 2025_
_Next Review: After Phase 1 completion_
