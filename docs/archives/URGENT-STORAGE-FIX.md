# 🚨 **URGENT: Fix Storage Upload Issues**

## **The Problem**

You're getting "Upload failed: new row violates row-level security policy" which means the Supabase storage policies are blocking uploads.

## **🔧 Step-by-Step Fix**

### **Step 1: Run the Simple SQL Fix**

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the **entire contents** of `fix-storage-simple.sql`
4. **Run the script**
5. Verify you see "Success" messages

**If that fails**, try the nuclear option:

1. Run the contents of `fix-storage-nuclear.sql`
2. This completely disables storage security (for testing only)

### **Step 2: Verify Buckets**

Run this query in SQL Editor to check:

```sql
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('community-images', 'content-media', 'profile-pictures');
```

Should return 3 rows with `public = true`.

### **Step 3: Verify Policies**

Run this query:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
```

Should show 4 policies: read, insert, update, delete.

### **Step 4: Test Upload**

1. Go to your app: `localhost:3000/communities/{id}/content/new`
2. Open **browser console** (F12)
3. Try uploading an image
4. Watch the **detailed debug logs** I added

## **🔍 Debug Information**

The debug upload will show you **exactly** where it's failing:

- ✅ Authentication check
- ✅ Bucket exists check
- ✅ Filename generation
- ❌ **Upload attempt** (this is likely where it fails)
- ✅ Public URL generation

## **💣 Nuclear Option**

If the above doesn't work, run this in SQL Editor:

```sql
-- This completely disables RLS on storage (temporary fix)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning**: This removes all security, so **only use for testing**!

## **📋 Checklist**

- [ ] Ran `fix-storage-final.sql` script
- [ ] Verified 3 buckets exist and are public
- [ ] Verified 4 policies exist
- [ ] Tested upload with debug logs
- [ ] Checked console for detailed error info

## **🆘 If Still Failing**

1. **Share the exact console output** from the debug upload
2. **Share a screenshot** of your Supabase storage buckets page
3. **Share a screenshot** of any SQL errors

The debug logs will tell us **exactly** what's wrong!

## **🎯 Expected Console Output**

When working, you should see:

```
🔍 DEBUG: Starting upload...
✅ DEBUG: User authenticated: { id: "...", email: "..." }
✅ DEBUG: Bucket 'community-images' exists: true
🔍 DEBUG: Generated filename: content/test-123_abc.jpg
🔍 DEBUG: Starting upload to Supabase...
✅ DEBUG: Upload successful: { path: "...", id: "..." }
✅ DEBUG: Public URL generated: https://...
🎉 DEBUG: Upload completed successfully!
```

**Try the fix now and let me know what the debug console shows!** 🔧
