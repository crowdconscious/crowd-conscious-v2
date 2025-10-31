# 🗄️ Storage Bucket Setup Guide

> **Quick guide to set up image storage in Supabase Dashboard**  
> **Time:** 5 minutes

---

## ✅ Step 1: Run the Fixed SQL

**In Supabase SQL Editor:**

Run this file: `sql-migrations/create-storage-buckets-FIXED.sql`

This creates the `employee-evidence` bucket. You should see:

```
id                 | employee-evidence
name               | employee-evidence
public             | true
file_size_limit    | 5242880
allowed_mime_types | {image/jpeg, image/jpg, image/png, image/webp, image/gif}
```

✅ **Bucket created successfully!**

---

## ✅ Step 2: Configure Policies (Dashboard Method)

### **Option A: Simple Public Access** (Recommended for Testing)

1. Go to: **Supabase Dashboard → Storage → Buckets**
2. Find `employee-evidence` bucket
3. Click the **three dots (...)** → **Edit bucket**
4. Toggle **"Public bucket"** to **ON**
5. Click **Save**

✅ **Done!** Images are now publicly accessible via URL.

---

### **Option B: RLS Policies** (For Production Security)

If you want fine-grained control:

1. Go to: **Supabase Dashboard → Storage → Policies**
2. Select `employee-evidence` bucket
3. Click **"New Policy"**

#### **Policy 1: Public Read**
```
Name: Public Read Access
Allowed operation: SELECT
Target roles: public
Policy definition: true
```
Click **Review** → **Save policy**

#### **Policy 2: Authenticated Upload**
```
Name: Authenticated Upload
Allowed operation: INSERT
Target roles: authenticated
Policy definition: (bucket_id = 'employee-evidence')
```
Click **Review** → **Save policy**

#### **Policy 3: Update Own Files**
```
Name: Update Own Files
Allowed operation: UPDATE
Target roles: authenticated
USING expression: 
  (bucket_id = 'employee-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
```
Click **Review** → **Save policy**

#### **Policy 4: Delete Own Files**
```
Name: Delete Own Files
Allowed operation: DELETE
Target roles: authenticated
USING expression:
  (bucket_id = 'employee-evidence' AND (storage.foldername(name))[1] = auth.uid()::text)
```
Click **Review** → **Save policy**

✅ **RLS Policies configured!**

---

## 🧪 Step 3: Test the Bucket

### **Test Upload (Quick Check)**

1. Go to: **Supabase Dashboard → Storage → employee-evidence**
2. Click **"Upload file"**
3. Select a test image
4. Click **Upload**
5. Click on uploaded file → **Get URL**
6. Open URL in browser → Image should display

✅ **Storage is working!**

---

## 🔧 Troubleshooting

### **Error: "Bucket already exists"**
- ✅ **This is fine!** The bucket is already created.
- Just skip to Step 2 (policies)

### **Error: "Cannot upload"**
- Check if bucket is set to public
- Or add RLS policies for authenticated users

### **Images not loading**
- Verify bucket is public: **Storage → employee-evidence → Edit → Public bucket ON**
- Check CORS settings in Supabase settings

---

## 📋 Verification Checklist

- [ ] Bucket `employee-evidence` exists
- [ ] Public access enabled OR RLS policies configured
- [ ] Test upload works
- [ ] Test image URL loads in browser
- [ ] Ready to integrate with Evidence Uploader component

---

## 🚀 Next Steps

Once storage is set up:

1. ✅ Test the Evidence Uploader in `/demo/module-tools`
2. ✅ Follow `TOOLS-INTEGRATION-GUIDE.md` to integrate into lessons
3. ✅ Test full image upload flow in lesson viewer

---

**Status:** Storage bucket ready to use! ✅

---

_Created: October 31, 2025_  
_For: Evidence image uploads in employee lessons_

