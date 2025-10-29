Course Architecture: "Concientización Consciente"
Step 1: Discovery Phase (Week 0)
Company Assessment Tool:
typescript
interface CompanyProfile {
industry: string;
employeeCount: number;
currentChallenges: string[];
wasteTypes: string[]; // plastic, energy, water, paper
communityLocation: string;
neighborhoodIssues: string[];
supplyChainSize: number;
existingESGEfforts: boolean;
}
Anonymous Employee Survey:
"What bothers you most about our workplace?"
"What would make you proud to work here?"
"What does our neighborhood need?"
"Rate our company on: Air, Water, Safety, Waste, Fairness"
Neighborhood Assessment:
Interview 5 neighbors/local businesses
Map visible problems (trash, lighting, water)
Identify potential partnerships
Step 2: Course Personalization
Modular Selection Based on Discovery:
javascript
const courseBuilder = (companyProfile) => {
const modules = [];

// Core module (mandatory)
modules.push('The Conscious Journey');

// Customize based on issues
if (profile.wasteTypes.includes('plastic')) {
modules.push('Zero Waste Warriors');
}
if (profile.neighborhoodIssues.includes('safety')) {
modules.push('Safe Streets Initiative');
}
if (profile.industry === 'manufacturing') {
modules.push('Clean Air Champions');
}

return modules;
};
Step 3: Story-Driven Course Structure
Master Course Template: "The Factory Next Door"
Characters:
María - Factory employee, single mother
Don Roberto - Neighbor, retired teacher
Carlos - New sustainability manager
Lupita - Local shop owner
The Factory - Personified as character
Module 1: "The Awakening" (Clean Air)
Story Opening: María notices her daughter's asthma worsening. She wonders if the factory's emissions affect the neighborhood. One day, she meets Don Roberto coughing at the bus stop...
Interactive Elements:
Air quality measurement activity
Calculate personal carbon footprint
Photo challenge: "Spot the emissions"
Anonymous poll: "Where do you see air pollution?"
Mini-Project: Create air quality monitoring station with neighbors
Deliverable: 3 actionable ideas to reduce emissions
Module 2: "The Hidden River" (Clean Water)
Story Continuation: Carlos discovers the factory's water usage could fill 3 community pools daily. Meanwhile, Lupita complains her water bill keeps rising...
Interactive Elements:
Water waste audit walkthrough
Calculate water per product unit
Video: "Where does our water go?"
Neighbor interview template
Mini-Project: Install water-saving devices, measure reduction
Deliverable: Water reduction commitment with timeline
Module 3: "Streets We Share" (Safe Cities)
Story Development: Don Roberto's granddaughter is afraid to walk past the factory at night. María organizes employees to understand why...
Interactive Elements:
Safety mapping exercise
Design thinking workshop: "Safe routes"
Create community WhatsApp group
Lighting audit with neighbors
Mini-Project: Adopt-a-streetlight program
Deliverable: Safety improvement plan with community
Module 4: "Treasure in Trash" (Zero Waste)
Story Climax: The factory discovers they pay $50,000/month for waste disposal. Lupita mentions she could use cardboard for her shop...
Interactive Elements:
Waste stream mapping
Circular economy simulator
Matchmaking: "Our waste, their resource"
Cost savings calculator
Mini-Project: Zero waste week challenge
Deliverable: Waste reduction partnership agreement
Module 5: "Fair Winds" (Fair Trade)
Story Resolution: María proposes buying supplies from local vendors. The factory saves on transport, vendors get steady income, everyone wins...
Interactive Elements:
Supply chain mapping
Local vendor database creation
Fair wage calculator
Employee satisfaction survey
Mini-Project: Local supplier pilot program
Deliverable: Local procurement policy
Module 6: "The Celebration"
Story Conclusion: Six months later, the neighborhood celebrates. Air is cleaner, streets safer, local businesses thriving. María's daughter breathes easier...
Final Activities:
Impact measurement
Story sharing session
Certification preparation
Community celebration event
Step 4: Certification & Maintenance
Certification Levels:
typescript
const CertificationRequirements = {
CONSCIOUS_PARTICIPANT: {
coursesCompleted: 3,
employeeParticipation: 50,
projectsImplemented: 1,
impactDocumented: true,
timeline: '3 months'
},
CONSCIOUS_CONTRIBUTOR: {
coursesCompleted: 5,
employeeParticipation: 75,
projectsImplemented: 3,
communityPartnerships: 2,
measurableReduction: '10%',
timeline: '6 months'
},
CONSCIOUS_LEADER: {
allModulesCompleted: true,
employeeParticipation: 90,
projectsImplemented: 5,
communityImpact: 'verified',
continuousImprovement: true,
timeline: '12 months'
}
};
Maintenance Program:
Monthly:
Impact metrics dashboard
New mini-challenges
Success story sharing
Quarterly:
Certification review
Neighbor feedback session
New module releases
Annual:
Certification renewal
Impact report (ESG compliant)
Awards ceremony
Implementation in Platform
Database Structure:
sql
CREATE TABLE course_stories (
id UUID PRIMARY KEY,
title TEXT,
characters JSONB,
modules JSONB,
industry_specific BOOLEAN,
core_value TEXT
);

CREATE TABLE company_progress (
company_id UUID,
module_id UUID,
story_checkpoint TEXT,
completion_percentage INTEGER,
employee_participation INTEGER,
impact_metrics JSONB
);

CREATE TABLE neighborhood_feedback (
company_id UUID,
feedback_text TEXT,
sentiment_score INTEGER,
verified BOOLEAN,
date TIMESTAMP
);
Adaptive Storytelling: The story adapts based on:
Industry (factory, office, retail)
Location (urban, suburban, rural)
Size (micro, small, medium)
Challenges identified
Example Adaptations:
Office Building: María becomes an accountant, emissions become e-waste
Restaurant: Focus shifts to food waste and grease disposal
Retail Store: Emphasizes packaging and customer education
This structure makes the learning emotional and memorable while driving real action. The story creates empathy, the activities create engagement, and the projects create impact. Companies get their ESG metrics, employees feel heard, and communities see real change.

**logic**
concientizaciones.crowdconscious.app (Learning Portal) ↓ Company signs up ↓ Employees take courses ↓ Graduate to main app ↓ crowdconscious.app (Community Platform) `**Implementation:** - Separate subdomain for corporate training - Different UI optimized for learning - Single sign-on between platforms - API connection to sync data **Prompt for Cursor:**` Create separate learning portal that connects to main app: 1. New Next.js app: concientizaciones.crowdconscious.app - Simplified UI for corporate users - Course player interface - Progress dashboards - Certificate generation 2. Shared Supabase backend: - Same auth system - New tables: courses, modules, corporate_accounts - User type flag: is_corporate_user 3. Integration flow: - Complete training → Auto-create community in main app - Sync XP and achievements - Unlock features based on progress ```

**File Structure:** ``` concientizaciones/ ├── app/ │ ├── (auth)/ │ │ ├── login/ │ │ └── register/ │ ├── (dashboard)/ │ │ ├── courses/ │ │ ├── progress/ │ │ └── certificates/ │ ├── (admin)/ │ │ ├── companies/ │ │ └── analytics/ │ └── api/ │ ├── sync-to-main/ │ └── generate-certificate/ ├── components/ │ ├── CoursePlayer/ │ ├── ProgressChart/ │ └── CertificateBadge/

<!-- Separate marketing site -->
<Hero>
  "Certifica tu empresa como Consciente"
  "Reduce costos • Mejora cultura • Impacta tu comunidad"
  [Ver Demo] [Agendar Llamada]
</Hero>

<Benefits>
  - Reduce energy costs by 23% average
  - 87% employee satisfaction increase
  - ESG compliance included
  - Tax deductible (Mexico)
</Benefits>

<Pricing>
  Starter: $2,500 MXN/mes
  Professional: $7,500 MXN/mes
  Enterprise: Contactar
</Pricing>
```

### Sales Process:

1. **Discovery Call** (via Calendly)
2. **Custom Demo** showing their industry
3. **Pilot Program** (10 employees, 2 weeks)
4. **Full Rollout** with onboarding support

## User Journey

### Company Admin Flow:

```
1. Signs up at new poral
2. Receives admin account
3. Uploads employee emails
4. Customizes courses (optional)
5. Launches to employees
6. Monitors dashboard
```

### Employee Flow:

```
1. Receives email invitation
2. Creates account (simplified signup)
3. Takes assigned courses
4. Completes challenges in main app
5. Earns XP and badges
6. Sees company impact dashboard
```

## Technical Implementation

**Prompt for Cursor:**

```
Create corporate learning portal connected to main app:

1. Set up subdomain:
   - concientizaciones.crowdconscious.app


2. Database additions to existing Supabase:
   CREATE TABLE corporate_accounts (
     id UUID PRIMARY KEY,
     company_name TEXT,
     subscription_tier TEXT,
     employee_limit INTEGER,
     custom_branding JSONB,
     certification_status TEXT
   );

   CREATE TABLE course_assignments (
     corporate_account_id UUID,
     employee_id UUID,
     course_id UUID,
     due_date TIMESTAMP,
     mandatory BOOLEAN
   );

3. API endpoints in main app:
   POST /api/corporate/create-community
   POST /api/corporate/sync-progress
   GET /api/corporate/impact-report

4. Simplified UI for corporate:
   - No gamification initially
   - Clean, professional design
   - Focus on metrics and compliance
   - Exportable reports for HR

Monetization Strategy
Revenue Streams:
SaaS Subscriptions: $2,500-15,000 MXN/month
Setup Fees: $10,000 MXN one-time
Custom Courses: $25,000 MXN per course
Certification Renewal: $5,000 MXN/year
API Access: $1,000 MXN/month extra
Unit Economics:
CAC: $5,000 MXN (via LinkedIn/direct sales)
LTV: $90,000 MXN (12-month average)
Margin: 80% (after platform costs)
```
