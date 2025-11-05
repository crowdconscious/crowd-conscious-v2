# 🎨 Phase 2: Creator Economy Implementation Plan

**Status**: Planning  
**Goal**: Enable ANY user to create modules & earn revenue  
**Date**: November 5, 2025

---

## 🎯 **Vision: Universal Creator Economy**

**From**: Only communities can create modules
**To**: Communities + Individual creators can create modules

### **Why This Matters:**

1. **10x More Creators**: Individuals don't need to form communities first
2. **Lower Barrier**: Anyone with expertise can monetize knowledge
3. **Marketplace Growth**: More diverse content = more learners
4. **Revenue Opportunity**: Creators earn 20% of sales (passive income)

---

## 📋 **CURRENT GAPS**

### **Gap 1: Templates Not Loading**

**Issue**: Module builder has no UI to display template modules

**Location**: `app/(app)/communities/[id]/modules/create/ModuleBuilderClient.tsx`

**What's Missing**:
```typescript
// Need to add:
1. Fetch templates from database (WHERE is_template = TRUE)
2. Display "Start from Template" section in Step 1
3. Allow creators to clone template structure
4. Pre-fill module with template lessons
```

**Impact**: Creators start from scratch (harder, slower, lower quality)

---

### **Gap 2: No User Module Builder**

**Issue**: Only communities can create modules - individuals cannot

**Current Route**: `/communities/[id]/modules/create` (requires community membership)

**Needed Routes**:
1. `/create-module` or `/marketplace/create` - User module builder
2. `/dashboard/my-modules` - Manage created modules
3. `/dashboard/earnings` - View wallet & earnings

**Database**: Already supports user creators (modules have `creator_id`)

---

### **Gap 3: Wallet Auto-Creation**

**Issue**: Unclear if wallets are auto-created when users create first module

**Current System**: `wallets` table with `owner_type = 'user'`

**Needed**: 
- Auto-create wallet when user creates first module
- Initialize with balance = 0
- Show wallet in user dashboard

**Function Needed**:
```sql
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Get or create wallet
  INSERT INTO wallets (owner_type, owner_id, balance)
  VALUES ('user', p_user_id, 0.00)
  ON CONFLICT (owner_type, owner_id) DO NOTHING
  RETURNING id INTO v_wallet_id;
  
  -- If already existed, fetch it
  IF v_wallet_id IS NULL THEN
    SELECT id INTO v_wallet_id FROM wallets
    WHERE owner_type = 'user' AND owner_id = p_user_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛠️ **IMPLEMENTATION PLAN**

### **Task 1: Add Templates to Module Builder** (2-3 hours)

#### **1.1: Create Template Fetcher API**

**File**: `app/api/marketplace/templates/route.ts` (NEW)

```typescript
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

export async function GET() {
  try {
    const adminClient = createAdminClient()
    
    const { data: templates, error } = await adminClient
      .from('marketplace_modules')
      .select(`
        id,
        title,
        description,
        core_value,
        difficulty_level,
        estimated_duration_hours,
        xp_reward,
        thumbnail_url,
        lessons:module_lessons(*)
      `)
      .eq('is_template', true)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return ApiResponse.ok({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return ApiResponse.serverError()
  }
}
```

#### **1.2: Update ModuleBuilderClient**

**File**: `app/(app)/communities/[id]/modules/create/ModuleBuilderClient.tsx`

Add to component:
```typescript
const [templates, setTemplates] = useState<any[]>([])
const [loadingTemplates, setLoadingTemplates] = useState(true)

useEffect(() => {
  async function fetchTemplates() {
    const response = await fetch('/api/marketplace/templates')
    const { templates } = await response.json()
    setTemplates(templates || [])
    setLoadingTemplates(false)
  }
  fetchTemplates()
}, [])

// Function to use template
const useTemplate = (template: any) => {
  setModule({
    ...module,
    title: `${template.title} - Copia`,
    description: template.description,
    coreValue: template.core_value,
    difficulty: template.difficulty_level,
    estimatedHours: template.estimated_duration_hours,
    xpReward: template.xp_reward,
    lessons: template.lessons.map((lesson: any) => ({
      id: `lesson-${Date.now()}-${Math.random()}`,
      title: lesson.title,
      description: lesson.content,
      estimatedMinutes: lesson.estimated_minutes,
      xpReward: lesson.xp_reward || 250,
      storyIntro: '',
      keyPoints: lesson.key_points || [],
      activityType: 'reflection',
      toolsUsed: [],
      resources: []
    }))
  })
  
  setMessage({ type: 'success', text: `Plantilla "${template.title}" cargada!` })
}
```

Add to UI (Step 1: Info):
```typescript
{/* Templates Section - BEFORE basic info form */}
{currentStep === 'info' && !loadingTemplates && templates.length > 0 && (
  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
    <div className="flex items-center gap-2 mb-4">
      <Sparkles className="w-6 h-6 text-purple-600" />
      <h3 className="text-xl font-bold text-purple-900">
        🚀 Comenzar con Plantilla
      </h3>
    </div>
    
    <p className="text-slate-700 mb-4">
      Usa una plantilla pre-construida para acelerar la creación
    </p>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => useTemplate(template)}
          className="bg-white border-2 border-purple-300 hover:border-purple-500 rounded-lg p-4 text-left transition-all hover:shadow-lg"
        >
          <div className="font-bold text-purple-900 mb-1">
            {template.title}
          </div>
          <div className="text-sm text-slate-600 mb-2">
            {template.description?.substring(0, 100)}...
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>📚 {template.lessons?.length || 0} lecciones</span>
            <span>⏱️ {template.estimated_duration_hours}h</span>
            <span>⚡ {template.xp_reward} XP</span>
          </div>
        </button>
      ))}
    </div>
  </div>
)}
```

---

### **Task 2: Create User Module Builder** (3-4 hours)

#### **2.1: Create User Module Builder Page**

**File**: `app/(app)/marketplace/create/page.tsx` (NEW)

```typescript
import { getCurrentUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import UserModuleBuilderClient from './UserModuleBuilderClient'

export default async function UserModuleBuilderPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login?redirect=/marketplace/create')
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <UserModuleBuilderClient userId={user.id} />
    </div>
  )
}
```

#### **2.2: Create User Module Builder Client**

**File**: `app/(app)/marketplace/create/UserModuleBuilderClient.tsx` (NEW)

Duplicate from `ModuleBuilderClient.tsx` but:
- Remove `communityId` and `communityName` props
- Set `creator_community_id` to NULL in submission
- Mark as individual creator module
- Update API endpoint to `/api/marketplace/modules` (not community-specific)

#### **2.3: Create Module Submission API for Users**

**File**: `app/api/user/modules/create/route.ts` (NEW)

```typescript
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { ApiResponse } from '@/lib/api-responses'

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return ApiResponse.unauthorized()
    
    const adminClient = createAdminClient()
    const moduleData = await request.json()
    
    // Ensure user wallet exists
    await adminClient.rpc('ensure_user_wallet', { p_user_id: user.id })
    
    // Insert module
    const { data: module, error: moduleError } = await adminClient
      .from('marketplace_modules')
      .insert({
        creator_id: user.id,
        creator_community_id: null, // Individual creator (not community)
        title: moduleData.title,
        description: moduleData.description,
        // ... rest of fields
        status: 'pending_review', // Needs platform approval
        is_platform_module: false,
        price_set_by_community: false // Price set by creator
      })
      .select()
      .single()
    
    if (moduleError) throw moduleError
    
    // Insert lessons...
    // (same logic as community module builder)
    
    return ApiResponse.created({
      message: 'Module submitted for review',
      module
    })
  } catch (error) {
    console.error('Error creating user module:', error)
    return ApiResponse.serverError()
  }
}
```

#### **2.4: Add "Create Module" to Marketplace Nav**

**File**: `app/(app)/HeaderClient.tsx`

Add link:
```typescript
<Link
  href="/marketplace/create"
  className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:scale-105 transition-transform"
>
  <Plus className="w-4 h-4" />
  Crear Módulo
</Link>
```

**File**: `app/marketplace/page.tsx`

Add CTA button:
```typescript
<div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-2xl p-8 text-white text-center">
  <h2 className="text-3xl font-bold mb-4">
    💡 ¿Tienes conocimiento que compartir?
  </h2>
  <p className="text-lg mb-6">
    Crea módulos educativos y gana dinero compartiendo tu experiencia
  </p>
  <Link
    href="/marketplace/create"
    className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
  >
    Crear Mi Primer Módulo →
  </Link>
</div>
```

---

### **Task 3: Wallet Auto-Creation** (1-2 hours)

#### **3.1: Create Wallet Helper Function**

**File**: `sql-migrations/add-ensure-user-wallet-function.sql` (NEW)

```sql
-- Function to auto-create user wallet if doesn't exist
CREATE OR REPLACE FUNCTION ensure_user_wallet(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Try to insert, ignore if exists
  INSERT INTO wallets (owner_type, owner_id, balance, currency, status)
  VALUES ('user', p_user_id, 0.00, 'MXN', 'active')
  ON CONFLICT (owner_type, owner_id) DO NOTHING
  RETURNING id INTO v_wallet_id;
  
  -- If already existed, fetch it
  IF v_wallet_id IS NULL THEN
    SELECT id INTO v_wallet_id FROM wallets
    WHERE owner_type = 'user' AND owner_id = p_user_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated users to call this for themselves
GRANT EXECUTE ON FUNCTION ensure_user_wallet(UUID) TO authenticated;
```

#### **3.2: Update Module Creation APIs**

Both community and user module creation APIs should call:
```typescript
// Before inserting module
await adminClient.rpc('ensure_user_wallet', { p_user_id: user.id })
```

#### **3.3: Create User Earnings Dashboard**

**File**: `app/(app)/dashboard/earnings/page.tsx` (NEW)

Show:
- Current wallet balance
- Earnings from module sales
- Transaction history
- Withdrawal options (future)

---

### **Task 4: Navigation & Discovery** (1 hour)

#### **4.1: Update Header Navigation**

Add "Create Module" button to header (see Task 2.4)

#### **4.2: Update Marketplace Hero**

Add creator CTA (see Task 2.4)

#### **4.3: Update Dashboard**

Add "My Modules" and "Earnings" cards to dashboard

---

## 📊 **SUCCESS METRICS**

After implementation:

1. ✅ Templates load in module builder
2. ✅ Users can create modules without community
3. ✅ Wallets auto-created for creators
4. ✅ "Create Module" visible in navigation
5. ✅ Module submission works for individuals
6. ✅ Earnings dashboard shows creator revenue

---

## 🚀 **NEXT STEPS AFTER THIS**

1. **Module Review Queue**: Platform admin can approve/reject user modules
2. **Pricing Configuration**: Creators set their own prices
3. **Withdrawal System**: Creators can request payouts
4. **Creator Analytics**: Views, enrollments, ratings per module
5. **Module Editing**: Update published modules
6. **Collaboration**: Co-creators splitting revenue

---

## 🎯 **IMMEDIATE ACTION ITEMS**

### **What to Do Now:**

1. **Verify Database**:
   ```sql
   -- Check if templates exist
   SELECT * FROM marketplace_modules WHERE is_template = TRUE;
   
   -- Check if wallets table exists
   SELECT * FROM wallets LIMIT 5;
   
   -- Check if ensure_user_wallet function exists
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'ensure_user_wallet';
   ```

2. **If Templates Don't Exist**: Run `scripts/insert-template-module.sql`

3. **If Wallet Function Doesn't Exist**: Run the SQL from Task 3.1

4. **Start Implementation**: Begin with Task 1 (Templates) → Task 2 (User Builder) → Task 3 (Wallets)

---

**Ready to build the creator economy! 🚀**

Which task would you like to tackle first?

