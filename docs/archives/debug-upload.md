# 🔧 Community Media Upload Debug Guide

## ✅ What I've Fixed

### 1. **Enhanced MediaUpload Component**

- ✅ **Upload Progress**: Real-time progress bar with percentage
- ✅ **File Validation**: Size (max 5MB) and type (images only) validation
- ✅ **Error Handling**: Detailed error messages with auto-clear
- ✅ **Immediate Preview**: Shows image preview during upload
- ✅ **Retry Logic**: Automatic retry on failures with exponential backoff

### 2. **Improved Upload Path Format**

- ✅ **Correct Format**: `community-images/{communityId}/{filename}`
- ✅ **Unique Filenames**: Timestamp + random string to prevent conflicts
- ✅ **Path Normalization**: Handles leading slashes correctly

### 3. **Database Integration**

- ✅ **Auto-Update**: Updates community table with new image URLs
- ✅ **Success/Error States**: Clear feedback for upload status
- ✅ **Live Preview**: Shows updated community card preview

### 4. **Storage Bucket Setup**

- ✅ **Bucket Configuration**: Proper MIME types and size limits
- ✅ **Simple Policies**: Public read, authenticated write
- ✅ **Error Recovery**: Handles bucket/policy issues gracefully

## 🚀 **Testing Steps**

### Step 1: Verify Storage Setup

Run this in Supabase SQL Editor:

```sql
-- Check if buckets exist
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('community-images', 'content-media', 'profile-pictures');

-- Check policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';
```

### Step 2: Create Buckets (Dashboard Method)

1. **Go to Storage in Supabase Dashboard**
2. **Click "New bucket"**
3. **Create**: `community-images` (Public: Yes, 50MB limit, image/\* types)
4. **Create**: `content-media` (Public: Yes, 50MB limit, image/\* types)
5. **Create**: `profile-pictures` (Public: Yes, 50MB limit, image/\* types)

### Step 3: Set Simple Policies (Dashboard Method)

1. **Go to Storage → Policies**
2. **Delete all existing policies** on `storage.objects`
3. **Create Policy 1**:

   - Name: `allow_public_read`
   - Operation: `SELECT`
   - Target: `public`
   - USING: `true`

4. **Create Policy 2**:
   - Name: `allow_authenticated_all`
   - Operation: `ALL`
   - Target: `authenticated`
   - USING: `true`
   - WITH CHECK: `true`

### Step 4: Test Upload Flow

1. ✅ **Access Settings**: Go to community settings as founder
2. ✅ **Try Upload**: Click/drag image to logo upload area
3. ✅ **Watch Progress**: Should see progress bar and percentage
4. ✅ **Check Preview**: Should see immediate preview during upload
5. ✅ **Verify Success**: Should see success message and updated preview
6. ✅ **Check Database**: Community table should have new image URL

## 🔍 **Debug Information**

### Upload Path Format

```
✅ Correct: community-images/47e49e89-769d-44ae-b40e-a1fc119c0e8c/1703123456789-abc123.jpg
❌ Wrong: community-images/logos/47e49e89-769d-44ae-b40e-a1fc119c0e8c/filename.jpg
```

### Console Logs to Check

- `Uploading to:` - Shows bucket, path, file info
- `Upload successful:` - Shows final URL and path
- `Logo uploaded:` - Shows settings component received URL
- Any errors will be logged with detailed messages

### Common Issues & Fixes

**Issue**: "Bucket not found"
**Fix**: Create buckets in Dashboard (Step 2)

**Issue**: "Row-level security policy violation"  
**Fix**: Set simple policies (Step 3)

**Issue**: "Upload failed after multiple attempts"
**Fix**: Check network connection and bucket permissions

**Issue**: "File size must be less than 5MB"
**Fix**: Resize image or compress before upload

## 🎯 **What Should Happen**

1. **Drag/Click Upload Area** → File dialog opens
2. **Select Image** → Immediate preview shows
3. **Upload Starts** → Progress bar appears (0-100%)
4. **Upload Completes** → Success message + community preview updates
5. **Database Updates** → Community table gets new image_url
6. **Community Cards** → Show new images immediately

## 📱 **Mobile Testing**

- **Tap Upload Area** → Camera/gallery picker opens
- **Select Photo** → Upload works same as desktop
- **Progress Visible** → Touch-friendly progress indicators
- **Success Feedback** → Clear success/error messages

The upload system now has **comprehensive error handling**, **progress tracking**, and **immediate feedback** while maintaining our lean architecture! 🚀
