# 🌐 i18n Implementation Guide - Complete

**Status**: Infrastructure ✅ | Components ⏳  
**Time Remaining**: ~4-5 hours  
**Default Language**: Spanish (es)  
**Secondary Language**: English (en)

---

## ✅ **WHAT'S ALREADY DONE**

### **1. Infrastructure** (COMPLETE)
- ✅ next-intl installed
- ✅ Translation files created (`locales/es.json`, `locales/en.json`)
- ✅ i18n configuration (`i18n.ts`)
- ✅ Middleware updated (language routing)
- ✅ next.config.js updated
- ✅ Language switcher component created

### **2. Translation Keys** (READY)
- ✅ 150+ keys across 10 namespaces
- ✅ Spanish as default
- ✅ English translations complete

---

## 🎯 **NEXT STEPS: Update Components**

### **Phase 1: Add Language Switcher** (30 minutes)

#### **Step 1.1: Update Header Component**

**File**: `app/(app)/HeaderClient.tsx`

Add language switcher to header:

```typescript
import LanguageSwitcher from '@/components/LanguageSwitcher'

// Inside the header component, add after navigation items:
<div className="flex items-center gap-4">
  <LanguageSwitcher />
  {/* ... rest of header items ... */}
</div>
```

**Test**: You should now see a language switcher (🇪🇸 / 🇺🇸) in the header

---

### **Phase 2: Wrap App with NextIntlClientProvider** (15 minutes)

#### **Step 2.1: Update Root Layout**

**File**: `app/layout.tsx`

Wrap children with provider:

```typescript
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

export default async function RootLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages();
 
  return (
    <html lang={locale || 'es'}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

### **Phase 3: Update Critical Pages** (2-3 hours)

#### **Priority 1: Marketplace** (45 minutes)

**File**: `app/marketplace/page.tsx`

```typescript
import {useTranslations} from 'next-intl';

export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('addToCart')}</button>
      <Link href="/dashboard">{t('backToDashboard')}</Link>
      {/* Replace all hardcoded strings with t('key') */}
    </div>
  );
}
```

**Strings to Replace**:
- "Marketplace" → `t('title')`
- "Add to Cart" → `t('addToCart')`
- "Checkout" → `t('checkout')`
- "Browse Modules" → `t('browse')`
- "View Details" → `t('viewDetails')`

---

#### **Priority 2: Lessons** (45 minutes)

**File**: `app/employee-portal/modules/[moduleId]/lessons/[lessonId]/page.tsx`

```typescript
import {useTranslations} from 'next-intl';

export default function LessonPage() {
  const t = useTranslations('lessons');
  
  return (
    <div>
      <button>{t('nextLesson')}</button>
      <button>{t('previousLesson')}</button>
      <button>{t('markComplete')}</button>
      <button>{t('submitAnswer')}</button>
    </div>
  );
}
```

**Strings to Replace**:
- "Next Lesson" → `t('nextLesson')`
- "Previous Lesson" → `t('previousLesson')`
- "Mark as Complete" → `t('markComplete')`
- "Submit Answer" → `t('submitAnswer')`

---

#### **Priority 3: Settings** (30 minutes)

**File**: `app/(app)/settings/SettingsClient.tsx`

```typescript
import {useTranslations} from 'next-intl';

export default function SettingsClient() {
  const t = useTranslations('settings');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <h2>{t('profilePicture')}</h2>
      <button>{t('uploadNew')}</button>
      <button>{t('saveChanges')}</button>
    </div>
  );
}
```

---

#### **Priority 4: Employee Portal Layout** (30 minutes)

**File**: `app/employee-portal/layout.tsx`

```typescript
import {useTranslations} from 'next-intl';

export default function EmployeePortalLayout() {
  const t = useTranslations('portal');
  
  const navigation = [
    { name: t('myProgress'), href: '/employee-portal/dashboard', icon: Home },
    { name: t('courses'), href: '/employee-portal/courses', icon: BookOpen },
    { name: t('certifications'), href: '/employee-portal/certifications', icon: Award },
    { name: t('myImpact'), href: '/employee-portal/impact', icon: TrendingUp },
    { name: t('esgReports'), href: '/employee-portal/mi-impacto', icon: FileText },
  ];
  
  return (
    {/* ... */}
    <div className="text-xs text-slate-500">{t('name')}</div>
    {/* ... */}
  );
}
```

---

#### **Priority 5: Impact Dashboard** (30 minutes)

**File**: `app/(app)/employee-portal/mi-impacto/page.tsx`

```typescript
import {useTranslations} from 'next-intl';

export default function ImpactDashboard() {
  const t = useTranslations('impact');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
      <div>{t('co2Reduced')}</div>
      <div>{t('waterSaved')}</div>
      <div>{t('wasteReduced')}</div>
      <div>{t('costSavings')}</div>
    </div>
  );
}
```

---

### **Phase 4: Update Corporate Dashboard** (1 hour)

#### **Files to Update**:
1. `app/corporate/dashboard/page.tsx`
2. `app/corporate/esg-reports/page.tsx`
3. `app/corporate/layout.tsx`

**Pattern**:
```typescript
import {useTranslations} from 'next-intl';

const t = useTranslations('corporate');

// Replace strings:
"Corporate Dashboard" → t('title')
"Employee Progress" → t('employeeProgress')
"Download Report" → t('downloadReport')
"Invite Employees" → t('inviteEmployees')
```

---

### **Phase 5: Update Navigation** (30 minutes)

#### **File**: `app/(app)/HeaderClient.tsx`

```typescript
import {useTranslations} from 'next-intl';

export default function HeaderClient() {
  const t = useTranslations('nav');
  
  return (
    <nav>
      <Link href="/dashboard">{t('dashboard')}</Link>
      <Link href="/communities">{t('communities')}</Link>
      <Link href="/discover">{t('discover')}</Link>
      <Link href="/marketplace">{t('marketplace')}</Link>
    </nav>
  );
}
```

---

## 🛠️ **Helper Functions**

### **Using Translations in Components**

#### **Client Components** (most common):
```typescript
'use client'

import {useTranslations} from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('namespace'); // marketplace, lessons, etc.
  
  return <button>{t('key')}</button>;
}
```

#### **Server Components**:
```typescript
import {getTranslations} from 'next-intl/server';

export default async function MyServerComponent() {
  const t = await getTranslations('namespace');
  
  return <button>{t('key')}</button>;
}
```

#### **With Parameters**:
```typescript
// Translation file:
{
  "welcome": "Welcome, {name}!"
}

// Component:
const message = t('welcome', {name: 'John'});
```

---

## 🧪 **Testing Checklist**

### **Step 1: Build & Start**
```bash
npm run build
npm run dev
```

### **Step 2: Test Language Switcher**
- [ ] Click language switcher in header
- [ ] Select "English"
- [ ] URL should change to `/en/...`
- [ ] Page content should be in English
- [ ] Select "Español"
- [ ] URL should change back to `/...` (no prefix)
- [ ] Page content should be in Spanish

### **Step 3: Test Each Section**
- [ ] Marketplace: All buttons/text in selected language
- [ ] Lessons: Navigation buttons translated
- [ ] Settings: Form labels translated
- [ ] Portal: Sidebar items translated
- [ ] Impact: Metrics labels translated
- [ ] Corporate: Dashboard translated

### **Step 4: Test Edge Cases**
- [ ] Refresh page while in English (should stay English)
- [ ] Direct link to `/en/marketplace` works
- [ ] API routes not affected by locale
- [ ] Static files load correctly
- [ ] Images display properly

---

## 📋 **File Checklist**

### **High Priority** (Do First):
- [ ] `app/(app)/HeaderClient.tsx` - Add LanguageSwitcher
- [ ] `app/layout.tsx` - Wrap with NextIntlClientProvider
- [ ] `app/marketplace/page.tsx` - Translate marketplace
- [ ] `app/employee-portal/layout.tsx` - Translate portal nav
- [ ] `app/(app)/employee-portal/mi-impacto/page.tsx` - Translate impact
- [ ] `app/(app)/settings/SettingsClient.tsx` - Translate settings

### **Medium Priority**:
- [ ] `app/employee-portal/modules/[moduleId]/lessons/[lessonId]/page.tsx`
- [ ] `app/corporate/dashboard/page.tsx`
- [ ] `app/corporate/esg-reports/page.tsx`
- [ ] `components/Cart.tsx` (if exists)
- [ ] `components/checkout/*`

### **Low Priority** (Nice to Have):
- [ ] `app/admin/**` - Admin panel
- [ ] Error messages throughout
- [ ] Loading states
- [ ] Tooltips

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: "Messages are not available"**
**Solution**: Make sure you wrapped the app with `NextIntlClientProvider` in layout.tsx

### **Issue 2: Translation key not found**
**Solution**: Check that the key exists in both `es.json` and `en.json`

### **Issue 3: Language doesn't change**
**Solution**: 
- Clear browser cache
- Check middleware is configured correctly
- Verify next.config.js has `withNextIntl`

### **Issue 4: Build fails**
**Solution**: 
- Run `npm run build` to see specific errors
- Ensure all translation keys are strings
- Check JSON syntax in locale files

### **Issue 5: URL shows `/es/...` instead of `/...`**
**Solution**: Check middleware `localePrefix: 'as-needed'` setting

---

## 📊 **Progress Tracker**

| Phase | Task | Time | Status |
|-------|------|------|--------|
| ✅ 1 | Infrastructure setup | 1h | **DONE** |
| ⏳ 2 | Add language switcher | 30min | Pending |
| ⏳ 3 | Wrap app with provider | 15min | Pending |
| ⏳ 4 | Update marketplace | 45min | Pending |
| ⏳ 5 | Update lessons | 45min | Pending |
| ⏳ 6 | Update settings | 30min | Pending |
| ⏳ 7 | Update portal layout | 30min | Pending |
| ⏳ 8 | Update impact dashboard | 30min | Pending |
| ⏳ 9 | Update corporate | 1h | Pending |
| ⏳ 10 | Update navigation | 30min | Pending |
| ⏳ 11 | Testing & fixes | 30min | Pending |

**Total Remaining**: ~5 hours

---

## 🎯 **Success Criteria**

Platform is fully internationalized when:

1. ✅ Language switcher visible in header
2. ✅ All user-facing text responds to language change
3. ✅ Spanish is default (no /es/ prefix)
4. ✅ English accessible via /en/ prefix
5. ✅ Page refresh maintains language selection
6. ✅ No console errors
7. ✅ All translations present (no missing keys)
8. ✅ URLs work in both languages

---

## 💡 **Quick Start Commands**

```bash
# Development
npm run dev

# Build (test for errors)
npm run build

# Production test
npm run build && npm start
```

---

## 📚 **Additional Resources**

- [next-intl docs](https://next-intl-docs.vercel.app/)
- [Translation keys reference](locales/es.json)
- [Language audit](SPANISH-ENGLISH-CONSISTENCY-AUDIT.md)

---

## 🎊 **When Complete**

**Your platform will have**:
- ✅ Full Spanish interface (default)
- ✅ Full English interface (toggle)
- ✅ Professional i18n implementation
- ✅ No language mixing
- ✅ Ready for more languages (just add locale files!)

**Platform Score**: **8.5/10** → **9.5/10** (A)

---

**Status**: Infrastructure complete ✅  
**Next**: Follow steps 2-11 above (5 hours)  
**Result**: Professional multilingual platform

