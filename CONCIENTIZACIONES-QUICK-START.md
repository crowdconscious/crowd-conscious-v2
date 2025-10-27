# Concientizaciones - Quick Start Guide

**Ready to start building today?** Follow these steps to get the foundation in place.

---

## 📋 Prerequisites

- [ ] Node.js 18+ installed
- [ ] Access to existing Supabase project (same as main app)
- [ ] Stripe account (can use test mode)
- [ ] Domain access for subdomain setup

---

## 🚀 Day 1: Foundation Setup (2-3 hours)

### Step 1: Create New Next.js App (10 min)

```bash
# Navigate to your projects directory
cd ~/Desktop

# Create new Next.js app
npx create-next-app@latest concientizaciones \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd concientizaciones

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr \
  stripe @stripe/stripe-js \
  lucide-react \
  date-fns \
  recharts \
  react-hook-form zod \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-tabs \
  @radix-ui/react-progress \
  class-variance-authority clsx tailwind-merge

# Run dev server on different port
npm run dev -- -p 3001
```

Visit `http://localhost:3001` - you should see the default Next.js page.

---

### Step 2: Environment Setup (5 min)

```bash
# Create environment file
touch .env.local
```

Add to `.env.local`:

```bash
# Supabase (Use SAME credentials as main app)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Site URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_MAIN_APP_URL=http://localhost:3000

# Stripe (Test mode for now)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**Where to find these:**

- Supabase: Go to project settings → API
- Stripe: Dashboard → Developers → API keys

---

### Step 3: Database Migrations (30 min)

Go to your Supabase dashboard → SQL Editor

Run these migrations **in order**:

#### Migration 1: Corporate Accounts

```sql
-- Copy from CONCIENTIZACIONES-TECHNICAL-ROADMAP.md
-- Section: "Migration 1: Corporate Accounts"
-- Run entire SQL block
```

#### Migration 2: Extend Profiles

```sql
-- Copy from CONCIENTIZACIONES-TECHNICAL-ROADMAP.md
-- Section: "Migration 2: Extend Profiles Table"
```

#### Migration 3: Courses & Modules

```sql
-- Copy from CONCIENTIZACIONES-TECHNICAL-ROADMAP.md
-- Section: "Migration 3: Courses & Modules"
```

#### Migration 4: Enrollments & Progress

```sql
-- Copy from CONCIENTIZACIONES-TECHNICAL-ROADMAP.md
-- Section: "Migration 4: Enrollments & Progress"
```

#### Migration 5: Certifications & Impact

```sql
-- Copy from CONCIENTIZACIONES-TECHNICAL-ROADMAP.md
-- Section: "Migration 5: Certifications & Impact"
```

**Verify:** Go to Supabase Table Editor - you should see all new tables.

---

### Step 4: Supabase Client Setup (15 min)

Create `lib/supabase/` directory:

```bash
mkdir -p lib/supabase
```

**File: `lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**File: `lib/supabase/server.ts`**

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Server component
          }
        },
      },
    }
  );
}
```

---

### Step 5: Basic Folder Structure (10 min)

```bash
# Create app route groups
mkdir -p app/\(auth\)/login
mkdir -p app/\(auth\)/signup
mkdir -p app/\(admin\)/dashboard
mkdir -p app/\(employee\)/dashboard
mkdir -p app/\(public\)
mkdir -p app/api/auth
mkdir -p app/api/corporate

# Create component directories
mkdir -p components/ui
mkdir -p components/admin
mkdir -p components/employee
mkdir -p components/shared

# Create other directories
mkdir -p hooks
mkdir -p types
mkdir -p config
```

---

### Step 6: Basic Landing Page (20 min)

**File: `app/(public)/page.tsx`**

```typescript
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
              Concientizaciones
            </h1>
            <p className="text-xl text-slate-600 mt-4">
              Transform your company into a community force
            </p>
          </div>

          {/* Hero */}
          <div className="bg-white rounded-2xl shadow-xl p-12 mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">
              Employee training that creates real impact
            </h2>
            <p className="text-xl text-slate-600 mb-8">
              Not consulting. Not theory. Real transformation through
              story-driven learning that leads to measurable community change.
            </p>

            <div className="flex gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
              >
                Start Free Assessment
              </Link>
              <Link
                href="/demo"
                className="border-2 border-slate-300 text-slate-700 px-8 py-4 rounded-xl font-bold text-lg hover:border-teal-600 transition-colors"
              >
                Watch Demo
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl font-bold text-teal-600">85%</div>
              <div className="text-slate-600">of funds to communities</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl font-bold text-purple-600">6 months</div>
              <div className="text-slate-600">to certification</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="text-4xl font-bold text-blue-600">100%</div>
              <div className="text-slate-600">measurable impact</div>
            </div>
          </div>

          {/* Status */}
          <div className="mt-12 text-sm text-slate-500">
            🚧 Currently in development • Pilot programs launching soon
          </div>
        </div>
      </div>
    </div>
  )
}
```

Visit `http://localhost:3001` - you should see your landing page! 🎉

---

### Step 7: Type Generation (10 min)

Generate TypeScript types from your Supabase schema:

```bash
# Install Supabase CLI if not already
npm install -g supabase

# Login to Supabase
supabase login

# Generate types (replace YOUR_PROJECT_ID)
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > types/database.ts
```

**Where to find project ID:** Supabase Dashboard → Project Settings → General

---

## ✅ Day 1 Complete!

You now have:

- ✅ New Next.js app running on port 3001
- ✅ Database migrations completed
- ✅ Supabase connected
- ✅ Basic folder structure
- ✅ Landing page working
- ✅ TypeScript types generated

---

## 🚀 Day 2: Authentication (3-4 hours)

### Step 1: Auth Middleware (20 min)

**File: `middleware.ts`** (in root)

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith("/(admin)") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect employee routes
  if (request.nextUrl.pathname.startsWith("/(employee)") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/(admin)/:path*", "/(employee)/:path*"],
};
```

---

### Step 2: Login Page (30 min)

**File: `app/(auth)/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if corporate user
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_corporate_user, corporate_role')
      .eq('id', data.user.id)
      .single()

    // Redirect based on role
    if (profile?.corporate_role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/employee/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-purple-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-teal-600 to-purple-600 bg-clip-text text-transparent">
          Concientizaciones
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:scale-105 transition-transform disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link href="/signup" className="text-teal-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
```

---

### Step 3: Simple Admin Dashboard (30 min)

**File: `app/(admin)/dashboard/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminDashboard() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get profile and corporate account
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, corporate_account_id')
    .eq('id', user.id)
    .single()

  const { data: corporate } = await supabase
    .from('corporate_accounts')
    .select('*')
    .eq('id', profile?.corporate_account_id)
    .single()

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">
          Welcome to Concientizaciones Dashboard
        </h1>

        {corporate ? (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {corporate.company_name}
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-teal-50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-teal-600">0</div>
                <div className="text-slate-600">Employees Enrolled</div>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">0%</div>
                <div className="text-slate-600">Completion Rate</div>
              </div>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{corporate.program_tier}</div>
                <div className="text-slate-600">Program Tier</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <p className="text-slate-600 mb-4">
              You don't have a corporate account yet.
            </p>
            <button className="bg-gradient-to-r from-teal-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold">
              Create Corporate Account
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

Test by visiting `http://localhost:3001/admin/dashboard` (will redirect to login if not authenticated)

---

## ✅ Day 2 Complete!

You now have:

- ✅ Authentication middleware
- ✅ Login page working
- ✅ Basic admin dashboard
- ✅ Route protection

---

## 📅 Next Steps

### Day 3: Employee Dashboard

- Create employee dashboard
- Build course card components
- Create progress tracker

### Day 4-5: Course Player

- Build module player component
- Add video player
- Create quiz component
- Implement progress tracking

### Week 2: First Module Content

- Write Module 1 (Clean Air) content
- Create story narrative
- Build interactive activities
- Design mini-project

---

## 🆘 Troubleshooting

### Can't connect to Supabase?

- Check `.env.local` has correct values
- Restart dev server after adding env variables
- Verify Supabase project is not paused

### Types not generating?

- Make sure you're logged into Supabase CLI: `supabase login`
- Check project ID is correct
- Migrations must be run first

### Port 3001 already in use?

- Kill process: `lsof -ti:3001 | xargs kill`
- Or use different port: `npm run dev -- -p 3002`

### Getting RLS policy errors?

- Check you ran all 5 migrations
- Verify policies in Supabase dashboard
- Check user has correct role in profiles table

---

## 💡 Pro Tips

1. **Use Two Terminal Windows:**
   - Terminal 1: Main app on port 3000
   - Terminal 2: Concientizaciones on port 3001

2. **Database Changes:**
   - Always create new migration files
   - Test in staging before production
   - Keep migration history

3. **Type Safety:**
   - Regenerate types after schema changes
   - Use TypeScript strict mode
   - Leverage Supabase type helpers

4. **Testing:**
   - Test both admin and employee flows
   - Test on mobile early
   - Check all RLS policies

---

## 📚 Reference Docs

- Main Strategy: `CONCIENTIZACIONES-STRATEGY.md`
- Technical Roadmap: `CONCIENTIZACIONES-TECHNICAL-ROADMAP.md`
- Main App Docs: `COMPLETE-SETUP-GUIDE.md`

---

**Questions?** Review the strategy and technical roadmap docs, or reach out for guidance.

**Ready to build Day 3+?** Follow the Technical Roadmap for detailed week-by-week implementation.

🚀 **Let's transform companies into community forces!**
