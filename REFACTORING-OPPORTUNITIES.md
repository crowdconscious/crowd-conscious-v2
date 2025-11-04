# 🔧 Code Refactoring Opportunities

**Purpose**: Improve code maintainability, reduce duplication, and prepare for universal marketplace

---

## 🎯 Priority 1: Shared Utilities (High Impact)

### 1.1 Extract Admin Client Creation

**Current State**: Duplicated in 5+ files

```typescript
// Repeated in every cart route
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**Recommended**: Create `lib/supabase-admin.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with admin privileges (service role key)
 * Bypasses RLS for server-side operations
 * ⚠️ USE ONLY in API routes, NEVER in client components
 */
export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

**Usage**:

```typescript
// Before (verbose)
import { createClient as createAdminClient } from '@supabase/supabase-js'
const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)

// After (clean)
import { createAdminClient } from '@/lib/supabase-admin'
const adminClient = createAdminClient()
```

**Files to Update** (17 total):

- `app/api/cart/route.ts`
- `app/api/cart/add/route.ts`
- `app/api/cart/update/route.ts`
- `app/api/cart/remove/route.ts`
- `app/api/cart/clear/route.ts`
- `app/api/marketplace/modules/route.ts`
- `app/api/admin/modules/import/route.ts`
- And ~10 more API routes

**Impact**:

- ✅ Single source of truth for admin client
- ✅ Easier to add logging/monitoring
- ✅ Easier to add error handling
- ✅ Reduces code by ~100 lines

---

### 1.2 Standardized API Responses

**Current State**: Inconsistent error responses

```typescript
// Route A
return NextResponse.json(
  { error: "Unauthorized - Please log in" },
  { status: 401 }
);

// Route B
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Route C
return NextResponse.json({ message: "Not authorized" }, { status: 401 });
```

**Recommended**: Create `lib/api-responses.ts`

```typescript
import { NextResponse } from "next/server";

export const ApiResponse = {
  // Success responses
  ok: <T>(data: T) => NextResponse.json(data, { status: 200 }),
  created: <T>(data: T) => NextResponse.json(data, { status: 201 }),

  // Error responses
  unauthorized: (message = "Please log in to continue") =>
    NextResponse.json({ error: "Unauthorized", message }, { status: 401 }),

  forbidden: (message = "You do not have permission to perform this action") =>
    NextResponse.json({ error: "Forbidden", message }, { status: 403 }),

  notFound: (resource: string) =>
    NextResponse.json(
      { error: "Not Found", message: `${resource} not found` },
      { status: 404 }
    ),

  badRequest: (message: string) =>
    NextResponse.json({ error: "Bad Request", message }, { status: 400 }),

  serverError: (message = "An unexpected error occurred") =>
    NextResponse.json(
      { error: "Internal Server Error", message },
      { status: 500 }
    ),

  // Custom responses
  custom: <T>(data: T, status: number) => NextResponse.json(data, { status }),
};
```

**Usage**:

```typescript
// Before
if (!user) {
  return NextResponse.json(
    { error: "Unauthorized - Please log in" },
    { status: 401 }
  );
}

// After
import { ApiResponse } from "@/lib/api-responses";

if (!user) {
  return ApiResponse.unauthorized();
}

// With custom message
if (!user) {
  return ApiResponse.unauthorized("You must be logged in to access the cart");
}
```

**Impact**:

- ✅ Consistent error messages across API
- ✅ Easier to add logging/monitoring
- ✅ Better client-side error handling
- ✅ Reduces code by ~50 lines

---

### 1.3 Auth Middleware Helper

**Current State**: Repeated auth checks in every route

```typescript
// Repeated in 20+ routes
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Recommended**: Create `lib/auth-middleware.ts`

```typescript
import { createClient } from "@/lib/supabase-server";
import { ApiResponse } from "./api-responses";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: ApiResponse.unauthorized() };
  }

  return { user, error: null };
}

export async function requireCorporateAdmin() {
  const { user, error } = await requireAuth();
  if (error) return { user: null, profile: null, error };

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("corporate_account_id, corporate_role")
    .eq("id", user!.id)
    .single();

  if (!profile?.corporate_account_id || profile?.corporate_role !== "admin") {
    return {
      user: null,
      profile: null,
      error: ApiResponse.forbidden(
        "Only corporate admins can perform this action"
      ),
    };
  }

  return { user, profile, error: null };
}
```

**Usage**:

```typescript
// Before (8-10 lines)
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json(...)

const adminClient = createAdminClient()
const { data: profile } = await adminClient.from('profiles')...
if (!profile?.corporate_account_id) return NextResponse.json(...)

// After (3 lines)
import { requireCorporateAdmin } from '@/lib/auth-middleware'

const { user, profile, error } = await requireCorporateAdmin()
if (error) return error

// Now you have user and profile guaranteed
```

**Impact**:

- ✅ DRY (Don't Repeat Yourself)
- ✅ Reduces cart routes from ~170 to ~120 lines
- ✅ Easier to add features (2FA, role checks, etc.)
- ✅ Centralized auth logic

---

## 🎯 Priority 2: Type Safety (Medium Impact)

### 2.1 Cart Types

**Current State**: Using `any` and inline types

```typescript
const module = (cartItem as any).marketplace_modules;
```

**Recommended**: Create `types/cart.ts`

```typescript
export interface CartItem {
  id: string;
  module_id: string;
  corporate_account_id: string;
  employee_count: number;
  price_snapshot: number;
  added_at: string;
}

export interface CartItemWithModule extends CartItem {
  module: MarketplaceModule;
  total_price: number;
  price_per_employee: number;
}

export interface CartSummary {
  item_count: number;
  total_price: number;
  total_employees: number;
}

export interface CartResponse {
  items: CartItemWithModule[];
  summary: CartSummary;
}
```

**Usage**:

```typescript
// Before
const { data: cartItems } = await adminClient.from("cart_items").select();
const module = (item as any).marketplace_modules; // 😬

// After
import { CartItemWithModule } from "@/types/cart";

const { data: cartItems } = await adminClient
  .from("cart_items")
  .select<"*", CartItemWithModule>();

const module = item.module; // ✅ TypeScript knows the type
```

---

### 2.2 Marketplace Module Types

**Current State**: Scattered module type definitions

```typescript
// In some files
interface Module { ... }

// In others
type MarketplaceModule = { ... }

// Inconsistent
```

**Recommended**: Centralize in `types/marketplace.ts`

```typescript
export type ModuleStatus = "draft" | "pending" | "published" | "rejected";
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type CoreValue =
  | "social_justice"
  | "sustainability"
  | "health"
  | "education";

export interface MarketplaceModule {
  id: string;
  community_id: string;
  creator_name: string;
  title: string;
  description: string;
  slug: string;
  core_value: CoreValue;
  difficulty_level: DifficultyLevel;
  estimated_duration_hours: number;
  base_price_mxn: number;
  price_per_50_employees: number;
  thumbnail_url: string | null;
  status: ModuleStatus;
  is_platform_module: boolean;
  is_template: boolean;
  featured: boolean;
  created_at: string;
  updated_at: string;
  avg_rating: number | null;
  review_count: number;
}

export interface ModuleLesson {
  id: string;
  module_id: string;
  lesson_number: number;
  title: string;
  content: string;
  video_url: string | null;
  quiz_questions: QuizQuestion[] | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
}
```

---

## 🎯 Priority 3: Performance (Low Impact, High Value)

### 3.1 Module Caching

**Current State**: Fresh DB query every time

```typescript
// Every marketplace page load = DB query
const { data: modules } = await supabase.from("marketplace_modules").select();
```

**Recommended**: Add Next.js caching

```typescript
// lib/cache.ts
export async function getCachedModules() {
  "use cache";
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("marketplace_modules")
    .select()
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return data;
}

// Revalidate every 10 minutes
export const revalidate = 600;
```

**Impact**:

- ✅ Faster page loads
- ✅ Reduced DB queries
- ✅ Lower Supabase costs
- ✅ Better user experience

---

### 3.2 Image Optimization

**Current State**: No image optimization

```html
<img src="{module.thumbnail_url}" />
```

**Recommended**: Use Next.js Image component

```typescript
import Image from 'next/image'

<Image
  src={module.thumbnail_url || '/placeholder.png'}
  alt={module.title}
  width={400}
  height={300}
  loading="lazy"
  className="rounded-lg"
/>
```

**Impact**:

- ✅ Automatic WebP/AVIF conversion
- ✅ Lazy loading out of the box
- ✅ Responsive images
- ✅ 50-70% smaller file sizes

---

## 🎯 Priority 4: Future-Proofing (Prepare for Universal Access)

### 4.1 Pricing Service

**Current State**: Hardcoded pricing logic

```typescript
const packs = Math.ceil(employeeCount / 50);
const totalPrice =
  module.base_price_mxn + (packs - 1) * module.price_per_50_employees;
```

**Recommended**: Create `lib/pricing-service.ts`

```typescript
export type PurchaseType = "individual" | "team" | "corporate" | "enterprise";

export interface PricingTier {
  name: string;
  min_users: number;
  max_users: number | null;
  price_per_user: number;
  discount_percentage: number;
}

export class PricingService {
  /**
   * Calculate price for a module based on user count and purchase type
   */
  static calculatePrice(
    module: MarketplaceModule,
    userCount: number,
    purchaseType: PurchaseType
  ): number {
    // Platform modules: Fixed pricing
    if (module.is_platform_module) {
      return this.calculatePlatformPrice(userCount);
    }

    // Community modules: Creator-set pricing
    return this.calculateCommunityPrice(module, userCount, purchaseType);
  }

  private static calculatePlatformPrice(userCount: number): number {
    if (userCount === 1) return 18000; // Individual
    if (userCount <= 20) return 15000 * userCount * 0.8; // 20% team discount
    // Corporate pricing (current system)
    const packs = Math.ceil(userCount / 50);
    return 18000 + (packs - 1) * 0;
  }

  private static calculateCommunityPrice(
    module: MarketplaceModule,
    userCount: number,
    purchaseType: PurchaseType
  ): number {
    // Use module's custom pricing tiers (to be added to DB)
    // For now, use base pricing
    return module.base_price_mxn;
  }
}
```

**Why This Matters**:

- ✅ Ready for universal marketplace
- ✅ Easy to add new pricing tiers
- ✅ Centralized pricing logic
- ✅ Testable pricing calculations

---

### 4.2 Revenue Distribution Service

**Current State**: Hardcoded in Stripe webhook

```typescript
// 30/50/20 split hardcoded
const creatorAmount = totalAmount * 0.3;
const impactAmount = totalAmount * 0.5;
const platformAmount = totalAmount * 0.2;
```

**Recommended**: Create `lib/revenue-service.ts`

```typescript
export interface RevenueDistribution {
  creator_amount: number;
  impact_fund_amount: number;
  platform_amount: number;
}

export class RevenueService {
  /**
   * Calculate revenue distribution based on module type
   */
  static calculateDistribution(
    totalAmount: number,
    isPlatformModule: boolean,
    creatorDonates: boolean
  ): RevenueDistribution {
    // Platform modules: 100% to platform
    if (isPlatformModule) {
      return {
        creator_amount: 0,
        impact_fund_amount: 0,
        platform_amount: totalAmount,
      };
    }

    // Community modules with donation
    if (creatorDonates) {
      return {
        creator_amount: 0,
        impact_fund_amount: totalAmount * 0.8, // 80%
        platform_amount: totalAmount * 0.2, // 20%
      };
    }

    // Standard 30/50/20 split
    return {
      creator_amount: totalAmount * 0.3, // 30%
      impact_fund_amount: totalAmount * 0.5, // 50%
      platform_amount: totalAmount * 0.2, // 20%
    };
  }
}
```

**Why This Matters**:

- ✅ Easy to add new revenue models
- ✅ Transparent revenue calculation
- ✅ Easier to test
- ✅ Ready for community-set pricing

---

## 📊 Refactoring Impact Summary

| Priority            | Effort | Impact     | LOC Saved | Files Affected |
| ------------------- | ------ | ---------- | --------- | -------------- |
| **Admin Client**    | Low    | High       | ~100      | 17             |
| **API Responses**   | Low    | Medium     | ~50       | 25+            |
| **Auth Middleware** | Medium | High       | ~150      | 20+            |
| **Cart Types**      | Low    | Medium     | ~30       | 8              |
| **Module Caching**  | Low    | High       | ~20       | 5              |
| **Pricing Service** | High   | Critical\* | ~80       | 10+            |
| **Revenue Service** | Medium | Critical\* | ~50       | 5              |

\*Critical for universal marketplace

**Total Impact**:

- **480+ lines of code removed** (DRY)
- **Better type safety** across codebase
- **Faster performance** (caching)
- **Ready for universal marketplace** (pricing/revenue services)

---

## 🗺️ Refactoring Roadmap

### Week 1: Quick Wins (2-3 hours)

- [ ] Create `lib/supabase-admin.ts`
- [ ] Create `lib/api-responses.ts`
- [ ] Update 5 cart routes to use new utilities
- [ ] Deploy and test

### Week 2: Auth & Types (3-4 hours)

- [ ] Create `lib/auth-middleware.ts`
- [ ] Create `types/cart.ts` and `types/marketplace.ts`
- [ ] Update remaining API routes
- [ ] Add TypeScript strict mode

### Week 3: Performance (2-3 hours)

- [ ] Add module caching
- [ ] Optimize images with Next/Image
- [ ] Add loading states
- [ ] Add error boundaries

### Week 4: Future-Proofing (4-5 hours)

- [ ] Create `lib/pricing-service.ts`
- [ ] Create `lib/revenue-service.ts`
- [ ] Add tests for pricing calculations
- [ ] Update Stripe webhook to use services

**Total Time**: ~12-15 hours spread over 4 weeks

---

## ✅ Refactoring Principles

1. **One Change at a Time**: Don't refactor everything at once
2. **Test After Each Change**: Ensure nothing breaks
3. **Keep Old Code**: Comment out, don't delete (rollback safety)
4. **Deploy Incrementally**: Small, frequent deployments
5. **Document Changes**: Update this doc as you go

---

**Questions to Consider**:

- Which refactoring should we prioritize first?
- Should we do refactoring now or after universal marketplace?
- Do we need to add tests before refactoring?
- Should we create a `refactor-*` branch or work on main?
