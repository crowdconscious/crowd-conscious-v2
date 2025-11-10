# 🔧 Promo Code Button - Troubleshooting Guide

**Issue**: "Crear Código" button not working  
**Page**: `/admin/promo-codes`  
**Date**: November 10, 2025

---

## 🎯 **Expected Behavior**

When you click "Crear Código" button:
1. Button should be purple gradient, top-right of page
2. Click → Form should appear BELOW the button
3. Form has fields for code, discount type, value, etc.
4. Form is inside a white rounded card

---

## 🔍 **Quick Diagnosis**

### **Check 1: Is the button visible?**
✅ YES - You can see it in your screenshot!

### **Check 2: What happens when you click?**
Try clicking and:
- Scroll down immediately
- Look for a white form card below the purple "Códigos Activos" section
- Check if page height increases

---

## 🚀 **Fix Attempts** (In Order)

### **Fix 1: Hard Refresh** ⚡ (Try this first!)

**Command**:
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Why**: JavaScript might be cached. This forces reload.

---

### **Fix 2: Clear Cache & Reload**

1. Open DevTools (`F12`)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"
4. Try button again

---

### **Fix 3: Check JavaScript Errors**

1. Open browser console (`F12` → Console tab)
2. Clear console
3. Click "Crear Código" button
4. Look for red errors

**Common Errors**:
- `Uncaught TypeError`: JS error blocking button
- `Failed to fetch`: Network issue
- Nothing: Button working, form just not visible

---

### **Fix 4: Scroll Down After Click**

The form might be below the fold!

1. Click "Crear Código"
2. **Immediately scroll down** (mousewheel or Page Down)
3. Look for a white form card
4. Form should be between stats and "Códigos Activos" section

---

### **Fix 5: Check Button State**

Open browser DevTools:
1. Right-click "Crear Código" button
2. Click "Inspect Element"
3. Click the button
4. Watch for class changes in DevTools
5. Button should toggle `showCreateForm` state

---

### **Fix 6: Try Different Browser**

Sometimes browser extensions block functionality:
1. Open in **Incognito/Private Mode**
2. Navigate to `/admin/promo-codes`
3. Try button again

If it works → Browser extension is the issue!

---

## 🐛 **If Still Not Working**

### **Manual Workaround**:

You can create promo codes directly via API!

**Option A: Use API Tool** (Postman, Insomnia, etc.):

```http
POST https://crowdconscious.app/api/admin/promo-codes/create
Content-Type: application/json

{
  "code": "TESTCODE",
  "discount_type": "percentage",
  "discount_value": 50,
  "max_uses": 100,
  "max_uses_per_user": 1,
  "description": "Test promo code",
  "partner_name": "Test Partner"
}
```

**Option B: Use Browser Console**:

1. Go to `/admin/promo-codes`
2. Open console (`F12`)
3. Paste this:

```javascript
fetch('/api/admin/promo-codes/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'TESTCODE50',
    discount_type: 'percentage',
    discount_value: 50,
    max_uses: 100,
    max_uses_per_user: 1,
    description: 'Test promo code',
    partner_name: 'Test Partner'
  })
})
.then(r => r.json())
.then(d => console.log('Created:', d))
.catch(e => console.error('Error:', e))
```

4. Press Enter
5. Check result in console
6. Refresh page to see new code!

---

## 🔍 **Deep Dive: How the Button Works**

### **Code Flow**:

1. **Button Click**:
```typescript
<button onClick={() => setShowCreateForm(!showCreateForm)}>
  Crear Código
</button>
```

2. **State Toggle**:
```typescript
const [showCreateForm, setShowCreateForm] = useState(false)
// Click → false becomes true
```

3. **Form Appears**:
```typescript
{showCreateForm && (
  <div className="bg-white rounded-xl shadow-lg...">
    {/* Form here */}
  </div>
)}
```

### **Possible Issues**:

❌ **JavaScript not loading**
- Check Network tab for 404s
- Verify JS bundle loaded

❌ **React not hydrating**
- Server-side render issue
- Check for hydration errors in console

❌ **CSS hiding form**
- Form renders but invisible
- Check computed styles in DevTools

❌ **State not updating**
- React issue
- Try clicking multiple times

---

## 📊 **Diagnostic Checklist**

Run through this checklist:

- [ ] Hard refreshed page (`Ctrl + Shift + R`)
- [ ] Cleared browser cache
- [ ] Checked console for JavaScript errors
- [ ] Clicked button and scrolled down
- [ ] Inspected button element (classes changing?)
- [ ] Tried in incognito mode
- [ ] Tried different browser (Chrome, Firefox, Safari)
- [ ] Checked network tab (any 404s or 500s?)
- [ ] Tried manual API call (workaround)

---

## 🎯 **Expected Form Fields**

When form appears, you should see:

```
┌─────────────────────────────────┐
│ Crear Nuevo Código              │
├─────────────────────────────────┤
│ Código * [PARTNER50]            │
│ Tipo de Descuento * [Dropdown]  │
│ Valor del Descuento * [Number]  │
│ Usos Máximos (Total) [Number]   │
│ Usos por Usuario [1]            │
│ Válido Hasta [DateTime]         │
│ Nombre del Socio [Text]         │
│ Nombre de Campaña [Text]        │
│ Compra Mínima (MXN) [0]         │
│ Descripción Interna [Text]      │
│ Notas [Textarea]                │
├─────────────────────────────────┤
│ [Crear Código] [Cancelar]       │
└─────────────────────────────────┘
```

---

## 🔥 **Quick Test**

Want to verify the system works?

### **Test via API** (Guaranteed to work):

```bash
# In terminal:
curl -X POST https://crowdconscious.app/api/admin/promo-codes/create \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST123",
    "discount_type": "percentage",
    "discount_value": 25
  }'
```

If this works → Backend is fine, frontend button is the issue.
If this fails → Backend issue (need to check auth).

---

## 💡 **Alternative: Direct Database Insert**

As a last resort, insert directly into Supabase:

1. Open Supabase Dashboard
2. Go to Table Editor
3. Select `promo_codes` table
4. Click "Insert row"
5. Fill in:
   - `code`: "TESTCODE"
   - `discount_type`: "percentage"
   - `discount_value`: 50
   - `active`: true
   - `created_by`: (your user ID)
6. Save
7. Refresh `/admin/promo-codes` page

---

## 📞 **Still Stuck?**

If nothing works, it might be:
1. **Browser extension** blocking JavaScript
2. **Ad blocker** interfering with UI
3. **Strict CSP policy** blocking scripts
4. **Network proxy** modifying responses

**Try**:
- Disable all browser extensions
- Try on mobile
- Try on different network (mobile hotspot)

---

## ✅ **Success Indicators**

You'll know it's working when:
- [ ] Click button
- [ ] Page scrolls or expands
- [ ] White form card appears
- [ ] You can type in "Código" field
- [ ] Submit creates code
- [ ] Code appears in list below

---

_Created: November 10, 2025_  
_For: Francisco Blockstrand_  
_Status: Troubleshooting Guide_

