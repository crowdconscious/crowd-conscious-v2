# Crowd Conscious - Rebuild Strategy & Context

## 🎯 Project Vision

A community-driven platform where local groups organize around environmental and social impact, funded through brand sponsorships with transparent governance and measurable outcomes.

## 🏗️ Core Architecture Principles

### Keep It Simple

- **Maximum 50 files** for MVP
- **Single responsibility** per component
- **No premature optimization**
- **Database-driven, not code-driven**

### Tech Stack (Minimal)

```json
{
  "dependencies": {
    "next": "14.2.x",
    "@supabase/supabase-js": "latest",
    "@supabase/ssr": "latest",
    "stripe": "latest",
    "@stripe/stripe-js": "latest",
    "react-hook-form": "latest",
    "zod": "latest",
    "@radix-ui/react-*": "only what we use",
    "tailwindcss": "latest",
    "lucide-react": "latest",
    "date-fns": "latest",
    "recharts": "latest"
  }
}
```

**Target: 15-20 dependencies maximum**

## 📁 File Structure (MVP)

```
crowd-conscious/
├── app/
│   ├── (public)/
│   │   ├── page.tsx              # Landing with carousel
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx            # Auth wrapper
│   │   ├── dashboard/page.tsx
│   │   ├── communities/
│   │   │   ├── page.tsx          # List/Map view
│   │   │   └── [id]/page.tsx     # Community detail
│   │   ├── profile/page.tsx
│   │   └── settings/page.tsx
│   ├── admin/
│   │   ├── layout.tsx            # Admin check
│   │   └── page.tsx              # Admin dashboard
│   └── api/
│       ├── communities/route.ts
│       ├── needs/route.ts
│       ├── sponsorships/route.ts
│       └── webhooks/stripe/route.ts
├── components/
│   ├── ui/                       # Only used Radix components
│   ├── CommunityCard.tsx
│   ├── CreateCommunityModal.tsx
│   ├── NeedCard.tsx
│   ├── VotingPanel.tsx
│   └── ImpactDashboard.tsx
├── lib/
│   ├── supabase.ts
│   ├── stripe.ts
│   ├── constants.ts              # Core values, etc
│   └── utils.ts
├── hooks/
│   ├── use-user.ts
│   ├── use-community.ts
│   └── use-translation.ts
└── types/
    └── database.ts               # Generated from Supabase
```

**Total: ~30-40 files**

## 🗄️ Database Schema (Optimized)

### Core Tables

```sql
-- Users extended by Supabase Auth
profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  user_type enum('user', 'brand', 'admin'),
  created_at timestamp
)

-- Communities with built-in location
communities (
  id uuid PRIMARY KEY,
  name text UNIQUE,
  slug text UNIQUE,
  description text,
  image_url text,
  core_values text[] CHECK (array_length(core_values, 1) >= 3),
  location point,              -- PostGIS for map
  address text,
  member_count int DEFAULT 0,
  creator_id uuid REFERENCES profiles(id),
  created_at timestamp
)

-- Membership with voting power
community_members (
  id uuid PRIMARY KEY,
  community_id uuid REFERENCES communities(id),
  user_id uuid REFERENCES profiles(id),
  role enum('founder', 'admin', 'member') DEFAULT 'member',
  voting_power int DEFAULT 1,   -- founder: 3, admin: 2, member: 1
  joined_at timestamp,
  UNIQUE(community_id, user_id)
)

-- Flexible content table (needs, events, challenges, polls)
community_content (
  id uuid PRIMARY KEY,
  community_id uuid REFERENCES communities(id),
  type enum('need', 'event', 'challenge', 'poll'),
  title text,
  description text,
  image_url text,
  data jsonb,                   -- Type-specific data
  status enum('draft', 'voting', 'approved', 'active', 'completed'),
  created_by uuid REFERENCES profiles(id),
  funding_goal decimal,         -- For needs
  current_funding decimal DEFAULT 0,
  voting_deadline timestamp,
  created_at timestamp
)

-- Voting system
votes (
  id uuid PRIMARY KEY,
  content_id uuid REFERENCES community_content(id),
  user_id uuid REFERENCES profiles(id),
  vote enum('approve', 'reject'),
  weight int DEFAULT 1,
  created_at timestamp,
  UNIQUE(content_id, user_id)
)

-- Sponsorships with approval
sponsorships (
  id uuid PRIMARY KEY,
  content_id uuid REFERENCES community_content(id),
  sponsor_id uuid REFERENCES profiles(id),
  amount decimal,
  status enum('pending', 'approved', 'rejected', 'paid'),
  stripe_payment_intent text,
  platform_fee decimal,         -- 15%
  approved_by_community boolean DEFAULT false,
  created_at timestamp
)

-- Impact tracking
impact_metrics (
  id uuid PRIMARY KEY,
  community_id uuid REFERENCES communities(id),
  content_id uuid REFERENCES community_content(id),
  metric_type enum('clean_air', 'clean_water', 'safe_cities', 'zero_waste', 'fair_trade'),
  value decimal,
  unit text,
  verified boolean DEFAULT false,
  created_at timestamp
)

-- Shareable links
share_links (
  id uuid PRIMARY KEY,
  token text UNIQUE DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES community_content(id),
  type enum('poll', 'event', 'post'),
  expires_at timestamp,
  created_at timestamp
)
```

### RLS Policies

```sql
-- Communities: Public read, authenticated create
CREATE POLICY "Anyone can view communities" ON communities
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create communities" ON communities
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Members: Community-based access
CREATE POLICY "View community members" ON community_members
  FOR SELECT USING (true);

CREATE POLICY "Join communities" ON community_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Voting: Member-only with weight
CREATE POLICY "Members can vote" ON votes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = (
        SELECT community_id FROM community_content
        WHERE id = content_id
      ) AND user_id = auth.uid()
    )
  );

-- Sponsorship: Approval required
CREATE POLICY "Sponsors can create" ON sponsorships
  FOR INSERT WITH CHECK (auth.uid() = sponsor_id);

CREATE POLICY "Community approves sponsorships" ON sponsorships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_id = (
        SELECT community_id FROM community_content
        WHERE id = content_id
      ) AND user_id = auth.uid()
      AND role IN ('founder', 'admin')
    )
  );
```

## 🎨 UI/UX Specifications

### Design System

```css
/* Core Colors */
--primary: #14b8a6 (teal)
--secondary: #8b5cf6 (purple)
--success: #10b981 (green)
--warning: #f59e0b (amber)
--danger: #ef4444 (red)

/* Impact Colors */
--clean-air: #87CEEB
--clean-water: #3B82F6
--safe-cities: #EC4899
--zero-waste: #F59E0B
--fair-trade: #10B981

/* Spacing */
--space-unit: 0.25rem
--container-max: 1280px
--card-radius: 0.75rem
```

### Mobile-First Components

```tsx
// Every component starts mobile
@media (min-width: 768px) { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }

// Touch targets minimum 44x44px
// Text minimum 16px on mobile
// Contrast ratio minimum 4.5:1
```

## 🔄 Core User Flows

### 1. User Journey

```
Landing → Sign Up → Browse Communities → Join →
Participate (vote/attend) → Create Content →
View Impact → Share Achievement
```

### 2. Brand Journey

```
Landing → Brand Sign Up → Discover Communities →
Browse Needs → Propose Sponsorship → Community Votes →
Payment → Receive Certification → Display Badge
```

### 3. Community Creator Journey

```
Create Community → Set Core Values → Invite Members →
Create Need → Community Votes → Approve →
Receive Sponsorship → Execute → Report Impact
```

## 🚀 3-Day Build Plan

### Day 1: Foundation (8 hours)

**Morning (4h)**

- [ ] Next.js setup with TypeScript
- [ ] Supabase connection
- [ ] Authentication flow
- [ ] Database types generation

**Afternoon (4h)**

- [ ] Landing page with real data
- [ ] Dashboard layout
- [ ] Community list/cards
- [ ] Basic routing

### Day 2: Core Features (8 hours)

**Morning (4h)**

- [ ] Create community flow
- [ ] Community detail page
- [ ] Content creation (needs/events/polls)
- [ ] Voting system

**Afternoon (4h)**

- [ ] Stripe integration
- [ ] Sponsorship flow
- [ ] Map view
- [ ] Admin panel basics

### Day 3: Polish & Deploy (8 hours)

**Morning (4h)**

- [ ] Mobile optimization
- [ ] Dark/light mode
- [ ] Language/currency toggle
- [ ] Email notifications

**Afternoon (4h)**

- [ ] Impact dashboard
- [ ] Share links
- [ ] Testing all flows
- [ ] Deploy to Vercel

## 📝 Context Rules for Cursor/AI

### CRITICAL: Next.js App Router Only

```
- NEVER use React Router
- ALWAYS use "use client" for interactive components
- Use app/ directory, not pages/
- API routes are route.ts files
```

### Database First

```
- Fetch data in server components
- Use Supabase real-time for updates
- Let database handle counts/aggregations
- Minimize client-side state
```

### Component Philosophy

```
- One component = one job
- Maximum 150 lines per file
- Props interface always defined
- Mobile-first CSS
```

### No Over-Engineering

```
- No Redux/Zustand (use React Context sparingly)
- No custom webpack configs
- No microservices
- No GraphQL
- No SSG/ISR (just SSR)
```

## 🎯 MVP Success Criteria

### Must Work

1. User can create account and join community
2. Community can create need and get funded
3. Payment processes correctly
4. Impact metrics display
5. Mobile responsive

### Can Wait

1. Advanced analytics
2. Push notifications
3. Video content
4. AI recommendations
5. Blockchain integration

## 🔧 Initial Setup Commands

```bash
# Create new project
npx create-next-app@latest crowd-conscious --typescript --tailwind --app

# Install only essentials
npm install @supabase/supabase-js @supabase/ssr stripe lucide-react

# Generate types from Supabase
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

# Create folder structure
mkdir -p app/\(public\) app/\(app\) app/admin app/api components lib hooks

# Environment variables
cp .env.example .env.local
```

## 📊 Development Metrics

### Target Performance

- Build size: < 500KB
- First load: < 3s
- Lighthouse score: > 90
- Files count: < 50
- Dependencies: < 20

### Code Quality

- TypeScript strict mode
- ESLint + Prettier
- 100% type coverage
- No any types
- No console.logs in production

## 🚦 Go/No-Go Checklist

Before adding ANY feature, ask:

1. Is it needed for MVP?
2. Can the database handle it?
3. Will it work on mobile?
4. Is there a simpler way?
5. Will it add more than 2 files?

If any answer is "no" → don't build it yet.

## 🎬 First File to Create

```typescript
// app/page.tsx - Start here
export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <h1 className="text-4xl font-bold text-center mt-20">Crowd Conscious</h1>
      <p className="text-center mt-4">Communities creating measurable impact</p>
      <div className="flex gap-4 justify-center mt-8">
        <a href="/signup" className="btn-primary">
          Get Started
        </a>
        <a href="/login" className="btn-secondary">
          Sign In
        </a>
      </div>
    </main>
  );
}
```

Build this, see it work, then add the next piece. One step at a time.
