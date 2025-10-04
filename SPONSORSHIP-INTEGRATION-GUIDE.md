# 🎯 Sponsorship User Flow & Integration Guide

## Current Status

✅ **Backend Complete**: All sponsorship APIs, database schema, and Stripe integration ready  
❌ **Frontend Missing**: No UI buttons or links to access sponsorship flow yet

---

## 📍 Where Users Should Find Sponsorship

### **1. Content Detail Page** (PRIMARY)

**File**: `app/(app)/communities/[id]/content/[contentId]/page.tsx`  
**Location**: After content description, before comments  
**For**: "Need" type content with funding goals

**Current Flow**:

```
User → Communities → Select Community → View Content List → Click Need → See Details
```

**Missing**: "Sponsor This Need" button on the detail page

---

### **2. Content List Cards** (SECONDARY)

**File**: `app/(app)/communities/[id]/ContentList.tsx`  
**Location**: On each "need" card in the grid (lines 270-377)

**Current**: Shows title, description, status  
**Missing**: Sponsor button and funding progress bar

---

### **3. Dashboard "My Sponsorships"** (TERTIARY)

**File**: `app/(app)/dashboard/page.tsx` or `PersonalizedDashboard.tsx`  
**Component**: `MySponsorships` (already created!)

**Missing**: Integration into dashboard layout

---

## 🔧 Integration Steps

### **Step 1: Add Sponsor Button to Content Detail Page**

**File**: `app/(app)/communities/[id]/content/[contentId]/page.tsx`

**Add after line 149** (after content details, before comments):

```typescript
{/* Sponsorship Section - Only for needs with funding goals */}
{content.type === 'need' && content.funding_goal && (
  <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg p-6 mb-6 border border-teal-200">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          💝 Support This Need
        </h3>
        <p className="text-sm text-slate-600">
          Help make this happen through sponsorship
        </p>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-teal-600">
          ${content.current_funding?.toLocaleString() || 0} MXN
        </div>
        <div className="text-sm text-slate-600">
          of ${content.funding_goal.toLocaleString()} MXN
        </div>
      </div>
    </div>

    {/* Progress Bar */}
    <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
      <div
        className="bg-gradient-to-r from-teal-500 to-blue-500 h-3 rounded-full transition-all"
        style={{
          width: `${Math.min((content.current_funding || 0) / content.funding_goal * 100, 100)}%`
        }}
      />
    </div>

    {/* Sponsor Button */}
    <Link href={`/communities/${communityId}/content/${contentId}/sponsor`}>
      <button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
        💳 Sponsor This Need
      </button>
    </Link>

    {/* Show existing sponsors */}
    <SponsorDisplay contentId={content.id} />
  </div>
)}
```

**Import at top**:

```typescript
import SponsorDisplay from "@/app/components/SponsorDisplay";
```

---

### **Step 2: Create Sponsor Page Route**

**File**: `app/(app)/communities/[id]/content/[contentId]/sponsor/page.tsx` (NEW)

```typescript
import { getCurrentUser } from '@/lib/auth-server'
import { supabase } from '@/lib/supabase'
import { notFound, redirect } from 'next/navigation'
import SponsorshipCheckout from '@/app/components/SponsorshipCheckout'

export const dynamic = 'force-dynamic'

interface SponsorPageProps {
  params: Promise<{
    id: string
    contentId: string
  }>
}

async function getContentForSponsorship(contentId: string) {
  const { data, error } = await supabase
    .from('community_content')
    .select(`
      *,
      communities (
        id,
        name
      )
    `)
    .eq('id', contentId)
    .single()

  if (error) return null
  return data
}

export default async function SponsorPage({ params }: SponsorPageProps) {
  const user = await getCurrentUser()
  const { id: communityId, contentId } = await params

  // Require authentication
  if (!user) {
    redirect(`/login?redirect=/communities/${communityId}/content/${contentId}/sponsor`)
  }

  const content = await getContentForSponsorship(contentId)

  if (!content || content.type !== 'need' || !content.funding_goal) {
    notFound()
  }

  return (
    <SponsorshipCheckout
      contentId={content.id}
      contentTitle={content.title}
      fundingGoal={content.funding_goal}
      currentFunding={content.current_funding || 0}
      communityName={(content.communities as any)?.name || 'Community'}
      onSuccess={() => {
        // Redirect handled by checkout component
      }}
      onCancel={() => {
        window.history.back()
      }}
    />
  )
}
```

---

### **Step 3: Add Sponsor Badge to Content Cards**

**File**: `app/(app)/communities/[id]/ContentList.tsx`

**Add after line 292** (after description, before the closing div):

```typescript
{/* Funding Progress for Needs */}
{item.type === 'need' && item.funding_goal && (
  <div className="mt-3 pt-3 border-t border-slate-200">
    <div className="flex justify-between text-xs text-slate-600 mb-1">
      <span>${item.current_funding?.toLocaleString() || 0} raised</span>
      <span>${item.funding_goal.toLocaleString()} goal</span>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div
        className="bg-teal-500 h-2 rounded-full"
        style={{
          width: `${Math.min((item.current_funding || 0) / item.funding_goal * 100, 100)}%`
        }}
      />
    </div>
    <Link
      href={`/communities/${communityId}/content/${item.id}/sponsor`}
      className="mt-2 block text-center text-sm text-teal-600 hover:text-teal-700 font-medium"
    >
      💝 Sponsor →
    </Link>
  </div>
)}
```

---

### **Step 4: Add to Dashboard**

**File**: `app/(app)/dashboard/PersonalizedDashboard.tsx` or `NewEnhancedDashboard.tsx`

**Add after the main content sections**:

```typescript
{/* My Sponsorships Section */}
<div className="mt-8">
  <MySponsorships userId={user.id} />
</div>
```

**Import**:

```typescript
import MySponsorships from "@/app/components/MySponsorships";
```

---

## 🎨 Complete User Journey

### **Discovery Path**:

```
1. User browses communities
   ↓
2. Clicks on a community
   ↓
3. Sees content list with needs
   ↓
4. Sees "💝 Sponsor" link on need cards with funding progress
   ↓
5. Clicks need to view details
   ↓
6. Sees full sponsorship section with:
   - Funding progress
   - Sponsor tier benefits
   - "Sponsor This Need" button
   - Existing sponsors displayed
   ↓
7. Clicks "Sponsor This Need"
   ↓
8. Redirected to sponsorship checkout page
   ↓
9. Fills out form (Individual or Business)
   ↓
10. Completes Stripe payment
    ↓
11. Success page with confirmation
    ↓
12. Can view in "My Sponsorships" on dashboard
```

---

## 📊 Visual Hierarchy

```
┌─────────────────────────────────────┐
│     Community Page                  │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Need Card                    │ │
│  │  Title: "Clean Water Project"│ │
│  │  [$500/$1000] ████░░░░ 50%   │ │
│  │  [💝 Sponsor →]               │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
           ↓ Click
┌─────────────────────────────────────┐
│     Content Detail Page             │
│                                     │
│  Title & Description                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 💝 Support This Need        │   │
│  │ $500 of $1,000 MXN          │   │
│  │ ████████░░░░░░░░ 50%        │   │
│  │                             │   │
│  │ [💳 Sponsor This Need]      │   │
│  │                             │   │
│  │ Current Sponsors:           │   │
│  │ 🏢 Company A - $300         │   │
│  │ 👤 John Doe - $200          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
           ↓ Click
┌─────────────────────────────────────┐
│   Sponsorship Checkout Page         │
│                                     │
│  Choose Amount: [Tiers]             │
│  Sponsor As: ⚪ Individual          │
│              ⚪ Business             │
│  [Form Fields...]                   │
│  [💳 Complete Sponsorship]          │
└─────────────────────────────────────┘
```

---

## ✅ Implementation Checklist

- [ ] Add `SponsorDisplay` import to content detail page
- [ ] Add sponsorship section to content detail page (after line 149)
- [ ] Create `sponsor/page.tsx` route
- [ ] Add funding progress to content cards in `ContentList.tsx`
- [ ] Add `MySponsorships` to dashboard
- [ ] Test the complete flow
- [ ] Verify Stripe integration works
- [ ] Check sponsor display shows correctly

---

## 🚀 Quick Start (Copy-Paste Ready)

I've provided all the code snippets above. Just:

1. Copy each section
2. Paste into the specified file at the specified location
3. Add the imports
4. Test!

---

**Need help with any specific step? Let me know!**
