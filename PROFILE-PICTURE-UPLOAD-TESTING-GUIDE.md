# 📸 Profile Picture Upload - Testing Guide

**Status**: SQL fixes deployed ✅  
**Location**: `/settings` page  
**Issue**: User reports button "not leading to uploader"

---

## 🔍 **Where is the Upload Button?**

The upload button IS on the settings page. Here's where to find it:

1. **Navigate to**: `https://crowdconscious.app/settings`
2. **Scroll down** to the "Profile Picture" section
3. **Look for**: A circular avatar placeholder (👤 icon if no image)
4. **Button**: "Upload New" button (teal/green color)

---

## 🧪 **How to Test Upload (Step-by-Step)**

### Step 1: Open Browser Console (IMPORTANT!)
- Press `F12` (Windows/Linux) or `Cmd+Option+I` (Mac)
- Click on "Console" tab
- Keep this open while testing

### Step 2: Click "Upload New" Button
- The button should trigger a file picker
- **If nothing happens**: Check console for errors

### Step 3: Select an Image
**Requirements**:
- **Format**: JPG, PNG, or WebP
- **Size**: Under 5MB
- **Recommended**: 300x300px square image

### Step 4: Wait for Upload
- You should see a progress bar
- Button will say "Uploading..."
- After ~2-5 seconds, green notification: "✅ Profile picture updated successfully!"

### Step 5: Verify Success
- Image should appear in the circle
- Hard refresh (Ctrl+Shift+R) if it doesn't
- Check Supabase Storage → `profile-pictures` bucket → Should see your file

---

## 🚨 **Common Issues & Solutions**

### Issue 1: Button Doesn't Open File Picker

**Symptom**: Click "Upload New", nothing happens

**Likely Cause**: JavaScript error or event listener issue

**How to Debug**:
1. Open console (F12)
2. Click button
3. Look for red error messages
4. Send me the exact error text

**Possible Fixes**:
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Try different browser (Chrome/Firefox)

---

### Issue 2: File Picker Opens, But Upload Fails

**Symptom**: Select image, upload fails with error

**Error Messages to Look For**:

**A. "403 Forbidden" or "new row violates row-level security policy"**
- **Cause**: RLS policies not applied correctly
- **Fix**: Re-run `FIX-PROFILE-PICTURE-UPLOAD.sql` in Supabase

**B. "404 Not Found" or "Bucket not found"**
- **Cause**: `profile-pictures` bucket doesn't exist
- **Fix**: Create bucket in Supabase Storage

**C. "Failed to update profile"**
- **Cause**: `profiles` table RLS blocks UPDATE
- **Fix**: Check profiles table policies

**D. "File too large"**
- **Cause**: File > 5MB
- **Fix**: Compress image or choose smaller file

---

### Issue 3: Upload Succeeds, But Image Doesn't Show

**Symptom**: Green success message, but image still shows placeholder

**Likely Causes**:
1. **Cache Issue**: Browser showing old cached page
   - **Fix**: Hard refresh (Ctrl+Shift+R)

2. **URL Issue**: Image uploaded but URL wrong in database
   - **Fix**: Check database for `avatar_url` value
   - Run: `SELECT id, avatar_url FROM profiles WHERE id = auth.uid();`

3. **Bucket Not Public**: Image uploaded but can't be accessed
   - **Fix**: Make bucket public in Supabase Storage

---

## 🔧 **Debugging Steps (If Still Not Working)**

### Step 1: Check if SQL Ran Successfully

Run this in Supabase SQL Editor:

```sql
-- Check if buckets exist and are public
SELECT 
  id,
  name,
  public,
  CASE 
    WHEN public = true THEN '✅ PUBLIC (Good)'
    ELSE '❌ PRIVATE (Problem!)'
  END as status
FROM storage.buckets
WHERE id IN ('profile-pictures', 'brand-logos');
```

**Expected Output**:
```
id                 | name              | public | status
profile-pictures   | profile-pictures  | true   | ✅ PUBLIC (Good)
brand-logos        | brand-logos       | true   | ✅ PUBLIC (Good)
```

**If buckets don't exist**: Run the full `FIX-PROFILE-PICTURE-UPLOAD.sql` again

---

### Step 2: Check Storage Policies

```sql
-- Check storage policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN '✅ Has USING clause'
    ELSE 'ℹ️  No USING clause'
  END as using_check,
  CASE 
    WHEN with_check IS NOT NULL THEN '✅ Has WITH CHECK clause'
    ELSE 'ℹ️  No WITH CHECK clause'
  END as check_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage'
AND policyname LIKE '%profile%'
ORDER BY policyname;
```

**Expected**: Should see 4 policies (INSERT, SELECT, UPDATE, DELETE)

---

### Step 3: Test Upload from Browser Console

Open console (F12) and run:

```javascript
// Test if Supabase client is available
console.log('Supabase client:', window.supabase)

// Check current user
const { data: { user } } = await window.supabase.auth.getUser()
console.log('Current user:', user)

// Try uploading a test file (you'll need to adjust file variable)
// This is just to check permissions
const testUpload = async () => {
  const { data, error } = await window.supabase.storage
    .from('profile-pictures')
    .list()
  
  console.log('List result:', data, error)
}
testUpload()
```

**Expected Output**: Should list files (or empty array if no files)

**If error**: Copy the exact error message and send to me

---

### Step 4: Check Network Tab

1. Open DevTools → Network tab
2. Click "Upload New" and select image
3. Look for requests to:
   - `storage/v1/object/profile-pictures/...` (upload)
   - `rest/v1/profiles` (database update)
4. Check status codes:
   - ✅ 200 = Success
   - ❌ 403 = Permission denied
   - ❌ 404 = Not found
   - ❌ 500 = Server error

---

## 📊 **Verification Checklist**

After fixing, verify ALL these work:

- [ ] "Upload New" button opens file picker
- [ ] Can select JPG/PNG/WebP file under 5MB
- [ ] Progress bar appears during upload
- [ ] Green success notification appears
- [ ] Image appears in circular avatar
- [ ] Image persists after hard refresh
- [ ] Can upload different image (replaces old one)
- [ ] "Remove" button works (deletes image)

---

## 🆘 **If ALL Else Fails**

Send me these details:

1. **Browser Console Errors** (copy exact text)
2. **Network Tab** (screenshot of failed request)
3. **SQL Query Results** (from Step 1 & 2 above)
4. **Screenshot of Settings Page** (showing the button)

**Quick Check**:
```sql
-- Run this to see if storage is set up correctly
SELECT 
  (SELECT COUNT(*) FROM storage.buckets WHERE id = 'profile-pictures') as bucket_exists,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') as storage_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles' AND policyname LIKE '%update%') as profile_policies;
```

**Expected**:
- bucket_exists: 1
- storage_policies: 4+
- profile_policies: 1+

---

## ✅ **Success Criteria**

Upload is working when:

1. ✅ Button opens file picker
2. ✅ Upload completes without errors
3. ✅ Image appears immediately
4. ✅ Image persists after refresh
5. ✅ Can be replaced with new image
6. ✅ Can be removed

---

**Next**: Try the upload now and let me know which step fails (if any)

