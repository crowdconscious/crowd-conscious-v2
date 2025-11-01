# Corporate Dashboard Implementation Plan

## 🎯 Overview

Building a comprehensive admin dashboard for corporate accounts to manage their Concientizaciones program, track employee progress, and measure impact.

---

## 📊 Dashboard Structure

### 1. **Dashboard (Home)** `/corporate/dashboard`

**Status:** ✅ Partially Complete

**Current Features:**

- Welcome message with admin name
- Stats cards (employees, progress, completions, certifications)
- Empty state for new accounts
- Program info display
- Quick action cards

**Enhancements Needed:**

- ✅ Add program module cards showing which modules are included
- ✅ Add recent activity feed (new enrollments, completions)
- ✅ Add progress chart (visual progress over time)
- ✅ Add upcoming milestones/deadlines
- ✅ Show certification status breakdown

---

### 2. **Employees** `/corporate/employees`

**Status:** 🚧 Placeholder

**Features to Build:**

#### Employee Invitation System

- Bulk invite via CSV upload
- Individual email invitations
- Auto-generate enrollment links
- Track invitation status (sent, accepted, active)

#### Employee List

- Searchable/filterable table
- Employee info: name, email, enrollment date
- Status indicators (invited, active, inactive)
- Progress per employee
- Quick actions (resend invite, view progress, remove)

#### Employee Detail View

- Individual employee progress
- Modules completed
- Certifications earned
- Activity timeline
- Performance metrics

**Data Model:**

```typescript
Invitation {
  id: uuid
  corporate_account_id: uuid
  email: string
  status: 'pending' | 'accepted' | 'expired'
  invitation_token: string
  expires_at: timestamp
  sent_at: timestamp
  accepted_at: timestamp?
}

// profiles table adds:
- is_corporate_user: boolean
- corporate_account_id: uuid?
- corporate_role: 'admin' | 'employee'
```

---

### 3. **Progress** `/corporate/progress`

**Status:** 🚧 Placeholder

**Features to Build:**

#### Company-Wide Progress

- Overall completion percentage
- Module-by-module breakdown
- Completion timeline chart
- Leaderboard (top performers)
- Lagging employees (need encouragement)

#### Module Analytics

- Per-module engagement
- Average time to complete
- Quiz scores
- Drop-off points

#### Visual Components

- Progress bars for each module
- Completion funnel chart
- Time series graph (progress over time)
- Employee completion heatmap

---

### 4. **Impact** `/corporate/impact`

**Status:** 🚧 Placeholder

**Features to Build:**

#### ROI Metrics

- Energy savings (kWh, MXN)
- Water savings (liters, MXN)
- Waste reduction (kg, MXN)
- Productivity gains (estimated)
- Total savings vs. program cost

#### Impact Categories

Based on modules completed:

- 🌬️ **Clean Air**: CO2 reduced, air quality improved
- 💧 **Clean Water**: Liters saved, efficiency increased
- 🗑️ **Zero Waste**: Waste diverted, recycling increased
- 🏙️ **Safe Cities**: Community projects completed
- 🤝 **Fair Trade**: Local suppliers engaged
- 🎉 **Integration**: Overall transformation metrics

#### Visualization

- Impact dashboard with key metrics
- Before/after comparisons
- Trend charts
- ESG report generator (downloadable PDF)

#### Community Impact

- Bridge to main app
- Community credits used
- Needs sponsored
- Volunteer hours contributed

**Data Model:**

```typescript
ImpactMetrics {
  id: uuid
  corporate_account_id: uuid
  metric_type: 'energy' | 'water' | 'waste' | 'productivity'
  baseline_value: number
  current_value: number
  savings_mxn: number
  unit: string
  measured_at: timestamp
  module_id: string?
}

ProjectSubmissions {
  id: uuid
  employee_id: uuid
  module_id: string
  project_type: string
  description: text
  impact_claim: jsonb
  verified: boolean
  verified_at: timestamp?
}
```

---

### 5. **Settings** `/corporate/settings`

**Status:** 🚧 Placeholder

**Features to Build:**

#### Company Profile

- Company name
- Industry
- Employee count
- Location/address
- Logo upload
- Description

#### Program Settings

- Program tier (read-only, contact to upgrade)
- Employee limit
- Modules included
- Program dates (start, end)
- Auto-enrollment settings

#### Branding (Premium feature)

- Custom color scheme
- Logo on certificates
- Custom welcome message
- White-label options

#### Billing & Payments

- Current plan details
- Payment history
- Invoices (downloadable)
- Payment method
- Upgrade/downgrade options
- Community credits balance

#### Notifications

- Email preferences
- Weekly progress reports
- Completion alerts
- Milestone notifications

#### Team Management

- Add/remove admins
- Admin permissions
- Activity log

---

## 🗄️ Database Schema Additions

### Tables to Create/Modify:

```sql
-- Employee invitations
CREATE TABLE employee_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Course enrollments (already exists, verify structure)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  module_id TEXT NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completion_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  quiz_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Impact metrics
CREATE TABLE impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  metric_type TEXT NOT NULL,
  baseline_value NUMERIC,
  current_value NUMERIC,
  savings_mxn NUMERIC DEFAULT 0,
  unit TEXT,
  module_id TEXT,
  measured_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Project submissions
CREATE TABLE project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  module_id TEXT NOT NULL,
  project_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  impact_claim JSONB,
  attachments JSONB,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Certifications (already exists, verify structure)
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  certification_type TEXT NOT NULL,
  certification_level TEXT,
  modules_completed TEXT[],
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  certificate_url TEXT,
  verification_code TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activity log
CREATE TABLE corporate_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID REFERENCES corporate_accounts(id),
  user_id UUID REFERENCES profiles(id),
  action_type TEXT NOT NULL,
  action_details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 UI Components to Build

### Reusable Components:

1. **`<StatCard />`** - Metric display card
2. **`<ProgressBar />`** - Visual progress indicator
3. **`<EmployeeTable />`** - Searchable employee list
4. **`<ModuleCard />`** - Module overview with progress
5. **`<ImpactChart />`** - Chart for impact metrics
6. **`<InviteModal />`** - Employee invitation form
7. **`<ActivityFeed />`** - Recent activity list
8. **`<ESGReportGenerator />`** - Export impact report

---

## 🚀 Implementation Priority

### Phase 1: Core Functionality (Week 1)

1. ✅ Employee invitation system
2. ✅ Employee list and management
3. ✅ Basic progress tracking
4. ✅ Module overview on dashboard

### Phase 2: Analytics & Insights (Week 2)

1. ✅ Progress charts and analytics
2. ✅ Impact metrics tracking
3. ✅ Activity feed
4. ✅ Leaderboard

### Phase 3: Polish & Features (Week 3)

1. ✅ Settings page (company profile, billing)
2. ✅ ESG report generator
3. ✅ Email notifications
4. ✅ Certifications

---

## 📧 Email Templates Needed

1. **Employee Invitation**
   - Welcome to Concientizaciones
   - Link to accept invitation
   - Program overview

2. **Weekly Progress Report** (to admin)
   - Completion stats
   - New enrollments
   - Certifications earned

3. **Completion Congratulations** (to employee)
   - Module completed
   - XP earned
   - Next steps

4. **Certification Earned** (to employee & admin)
   - Certificate download link
   - Share on LinkedIn

---

## 🔗 Integration with Main App

### Bridge Features:

1. **Community Credits**
   - Show balance in dashboard
   - Allow sponsoring needs from corporate dashboard
   - Track community impact

2. **Employee Graduation**
   - Certified employees get main app access
   - Auto-create community for company
   - Enable employees to sponsor local needs

3. **Impact Sync**
   - Corporate projects feed into main app
   - Show company impact in public profile
   - Enable transparency

---

## 🧪 Testing Checklist

- [ ] Admin can invite employees
- [ ] Employees can accept invitations
- [ ] Progress tracking updates correctly
- [ ] Impact metrics calculate accurately
- [ ] Charts render properly
- [ ] Export functions work
- [ ] Emails send successfully
- [ ] Mobile responsive
- [ ] RLS policies secure

---

**Ready to start building?** Let's begin with Phase 1!
