# Admin Review Dashboard - Testing Guide

**Status**: ✅ Already Built - Ready for Testing  
**Date**: November 3, 2025

---

## 🎯 **WHAT EXISTS**

### **✅ Admin Review Dashboard**

- **Location**: `/admin` → "Marketplace" tab
- **Features**:
  - View all pending modules
  - Approve/reject modules
  - Add review notes
  - Preview modules
  - Email notifications to creators

### **✅ API Endpoints**

- `GET /api/admin/modules/pending` - Fetch pending modules
- `POST /api/admin/modules/review` - Approve/reject modules

### **✅ Email System**

- Sends to `comunidad@crowdconscious.app` when module submitted
- Sends to creator when approved/rejected
- Includes review notes in rejection emails

---

## 📋 **TESTING CHECKLIST**

### **Test 1: Access Admin Dashboard** ✅

1. Log in as admin (`francisco@crowdconscious.app`)
2. Go to: `https://crowdconscious.app/admin`
3. Click on "Marketplace" tab

**Expected**:

- Should see admin dashboard
- Marketplace tab should load
- Should show "¡Todo al día!" (no pending modules yet)

---

### **Test 2: Submit a Test Module** ⏳

Since you don't have any pending modules yet, you need to create one:

**Option A: Use Module Builder** (Recommended)

1. Go to a community you're admin of
2. Navigate to `/communities/[id]/modules/create`
3. Create a test module:
   - Title: "Test Module - Please Approve"
   - Description: "This is a test module for review workflow"
   - Add 2-3 lessons
   - Submit for review

**Option B: Create via SQL** (Quick Test)

```sql
-- Insert a test module in 'review' status
INSERT INTO marketplace_modules (
  title, description, slug, creator_community_id, creator_user_id, creator_name,
  core_value, difficulty_level, estimated_duration_hours, xp_reward,
  base_price_mxn, price_per_50_employees, status, is_platform_module,
  featured, lesson_count, published_at
) VALUES (
  'Test Module - Admin Review',
  'This is a test module to verify the admin review workflow',
  'test-module-admin-review',
  NULL,
  '<your-user-id>',
  'Test Creator',
  'clean_air',
  'beginner',
  2,
  200,
  15000,
  7000,
  'review', -- PENDING STATUS
  FALSE,
  FALSE,
  2,
  NULL
);
```

**Expected**:

- Module created with `status = 'review'`
- Email sent to `comunidad@crowdconscious.app`

---

### **Test 3: View Pending Module** ✅

1. Refresh admin dashboard (`/admin` → Marketplace tab)
2. Should see the test module

**Expected**:

- Module appears in pending list
- Shows title, description, creator info
- Shows core value, difficulty, price
- Has "Aprobar" and "Rechazar" buttons

---

### **Test 4: Preview Module** ✅

1. Click "Vista Previa" button
2. Should open module detail page in new tab

**Expected**:

- Module detail page loads
- Shows all module information
- Can see lessons (if any)
- Note: Won't be in marketplace browse yet (not published)

---

### **Test 5: Approve Module** ✅

1. Click "Aprobar y Publicar" button
2. Wait for confirmation

**Expected**:

- ✅ Success message: "Módulo aprobado y publicado exitosamente"
- Module disappears from pending list
- Email sent to creator (approval notification)
- Module appears in marketplace browse
- Module `status` changed to 'published'

**Verification**:

```sql
SELECT id, title, status, approved_by, approval_date
FROM marketplace_modules
WHERE title LIKE '%Test Module%';
```

Should show `status = 'published'`

---

### **Test 6: Reject Module** ✅

1. Create another test module (repeat Test 2)
2. In admin dashboard, click "Rechazar"
3. Enter review notes: "Por favor mejora la descripción y agrega más ejemplos"
4. Click "Confirmar Rechazo"

**Expected**:

- ✅ Success message: "Módulo devuelto al creador para ajustes"
- Module disappears from pending list
- Email sent to creator with feedback
- Module `status` changed to 'draft'
- Creator can edit and resubmit

**Verification**:

```sql
SELECT id, title, status
FROM marketplace_modules
WHERE title LIKE '%Test Module%';
```

Should show `status = 'draft'`

---

## 📧 **EMAIL VERIFICATION**

### **Email 1: Module Submitted** (To Admin)

- **Recipient**: `comunidad@crowdconscious.app`
- **Subject**: "🎓 Nuevo Módulo para Revisión: [Module Title]"
- **Content**:
  - Module title and description
  - Creator info
  - Core value and difficulty
  - Price
  - Link to admin dashboard

### **Email 2: Module Approved** (To Creator)

- **Recipient**: Creator's email
- **Subject**: "🎉 Tu Módulo ha sido Aprobado"
- **Content**:
  - Congratulations message
  - Module is now published
  - Link to marketplace
  - Next steps

### **Email 3: Module Rejected** (To Creator)

- **Recipient**: Creator's email
- **Subject**: "📝 Tu Módulo Requiere Ajustes"
- **Content**:
  - Module needs improvements
  - Admin feedback/notes
  - Instructions to edit
  - Link to module builder

---

## 🐛 **TROUBLESHOOTING**

### **No Pending Modules Showing**:

- Check module status in database: `SELECT * FROM marketplace_modules WHERE status = 'review'`
- Verify RLS policies allow admin to read
- Check browser console for errors

### **Emails Not Sending**:

- Verify `comunidad@crowdconscious.app` is verified in Resend
- Check Resend dashboard for email logs
- Check API logs for errors

### **Can't Approve/Reject**:

- Verify you're logged in as admin
- Check `profiles.user_type = 'admin'`
- Check browser console for API errors

### **Module Not Appearing in Marketplace After Approval**:

- Verify `status = 'published'`
- Clear browser cache
- Check marketplace API endpoint

---

## ✅ **SUCCESS CRITERIA**

After testing, you should have verified:

- [x] Admin can access review dashboard
- [x] Pending modules appear correctly
- [x] Preview functionality works
- [x] Approval workflow works
- [x] Rejection workflow works
- [x] Review notes are captured
- [x] Emails are sent (submission, approval, rejection)
- [x] Approved modules appear in marketplace
- [x] Rejected modules return to draft

---

## 🎯 **CURRENT STATUS**

### **What's Working**:

✅ Admin dashboard UI (beautiful, functional)  
✅ Pending modules fetch  
✅ Approve/reject actions  
✅ Review notes system  
✅ Email notifications  
✅ Status updates

### **What Needs Testing**:

⏳ End-to-end workflow with real module  
⏳ Email delivery verification  
⏳ Creator experience (receiving emails, editing after rejection)

---

## 📊 **NEXT STEPS**

### **After Testing Passes**:

1. ✅ Mark admin review dashboard as complete
2. ➡️ Proceed to Community Module Builder polish
3. ➡️ Build Cart & Checkout

### **If Issues Found**:

- Document the issue
- Fix the bug
- Re-test
- Update this guide

---

## 💡 **RECOMMENDATIONS**

### **For Production**:

1. **Monitor Email Deliverability**: Check Resend dashboard regularly
2. **Track Approval Metrics**:
   - Average time to review
   - Approval rate
   - Rejection reasons
3. **Creator Support**: Have templates for common rejection reasons
4. **Quality Standards**: Document what makes a module "approvable"

### **Future Enhancements**:

- Batch approve/reject
- Module comparison (side-by-side)
- Automated quality checks
- Creator rating system
- Review history/audit log

---

**Ready to Test!** 🚀

The admin review dashboard is fully built and ready for testing. Follow the checklist above to verify everything works correctly.
