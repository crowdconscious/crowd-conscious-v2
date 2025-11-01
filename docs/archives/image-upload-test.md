# 🖼️ **Image Upload Test Guide**

## ✅ **What's Been Fixed**

### **1. Centralized Storage Utility (`lib/storage.ts`)**

- ✅ **Single upload function** for all image types
- ✅ **File validation** (size, type, security)
- ✅ **Progress indicators** and error handling
- ✅ **Public URL generation** from Supabase Storage
- ✅ **Compression utilities** and optimization helpers

### **2. Updated MediaUpload Component**

- ✅ **Uses new storage utility** instead of API routes
- ✅ **Aspect ratio support** (square, video, wide, auto)
- ✅ **Label and description** props for better UX
- ✅ **Progress indicators** with visual feedback
- ✅ **Immediate preview** after upload
- ✅ **Proper cleanup** of blob URLs

### **3. Community Settings Upload**

- ✅ **Logo upload**: Square aspect ratio, saves to `logos/{communityId}/`
- ✅ **Banner upload**: Wide aspect ratio, saves to `banners/{communityId}/`
- ✅ **General image**: Video aspect ratio, saves to `images/{communityId}/`
- ✅ **Database updates** with real public URLs

### **4. Content Creation Upload**

- ✅ **Restored MediaUpload** component
- ✅ **Content-specific paths** like `needs/{communityId}/`, `events/{communityId}/`
- ✅ **Real image URLs** saved to database (no more blob URLs)
- ✅ **Upload handlers** with proper error management

## 🚀 **How to Test**

### **1. Community Media Upload**

```
1. Navigate to: /communities/{id}/settings
2. Only founders should see upload sections
3. Try uploading:
   - Logo (square format works best)
   - Banner (wide format works best)
   - General image (any format)
4. Check immediate preview and database updates
```

### **2. Content Creation Upload**

```
1. Navigate to: /communities/{id}/content/new
2. Select any content type
3. Upload an image in the "Content Image" section
4. Check preview appears immediately
5. Submit content and verify image URL is saved
```

### **3. Upload Features to Test**

- ✅ **Drag & drop** file upload
- ✅ **Click to select** file
- ✅ **Progress bar** during upload
- ✅ **Image preview** after upload
- ✅ **Error handling** for invalid files
- ✅ **File size validation** (max 5MB)
- ✅ **File type validation** (images only)

## 📁 **Storage Structure**

### **Community Images Bucket**

```
community-images/
├── logos/{communityId}/
│   └── 1672531200_abc123.jpg
├── banners/{communityId}/
│   └── 1672531200_def456.png
└── images/{communityId}/
    └── 1672531200_ghi789.webp
```

### **Content Media Bucket**

```
content-media/
├── needs/{communityId}/
│   └── 1672531200_jkl012.jpg
├── events/{communityId}/
│   └── 1672531200_mno345.png
├── polls/{communityId}/
│   └── 1672531200_pqr678.webp
└── challenges/{communityId}/
    └── 1672531200_stu901.gif
```

## 🛠️ **Upload Flow**

### **1. File Selection**

```typescript
// User selects/drops file
const file = event.target.files[0];

// Client-side validation
const validation = validateFile(file, { maxSizeMB: 5 });
if (!validation.valid) return;
```

### **2. Upload Process**

```typescript
// Show progress and preview
setUploadProgress(20);
setPreviewUrl(URL.createObjectURL(file));

// Upload to Supabase Storage
const publicUrl = await uploadImage(file, bucket, path);

// Update progress
setUploadProgress(100);

// Cleanup and notify parent
URL.revokeObjectURL(previewUrl);
onUploadComplete(publicUrl);
```

### **3. Database Update**

```typescript
// Community settings
await supabase
  .from('communities')
  .update({ logo_url: publicUrl })
  .eq('id', communityId)

// Content creation
await supabase
  .from('community_content')
  .insert({ image_url: publicUrl, ... })
```

## 🎯 **Expected Results**

### **✅ What Should Work**

- **File uploads** complete successfully
- **Progress bars** show during upload
- **Images appear** immediately after upload
- **Database records** contain real public URLs
- **File validation** prevents invalid uploads
- **Error messages** are user-friendly

### **🚫 Common Issues Fixed**

- ~~Blob URLs being saved to database~~
- ~~API endpoint 404 errors~~
- ~~RLS policy violations~~
- ~~Progress indicators missing~~
- ~~No image previews~~

## 🔍 **Debugging**

### **Check Browser Console**

```javascript
// Should see successful upload logs
"Uploading image: { bucket: 'community-images', fileName: '...', size: 23889, type: 'image/png' }";
"Upload successful: { url: 'https://...', path: '...' }";
```

### **Check Database**

```sql
-- Community images should have real URLs
SELECT id, name, logo_url, banner_url, image_url
FROM communities
WHERE id = 'your-community-id';

-- Content should have real image URLs
SELECT id, title, image_url
FROM community_content
WHERE community_id = 'your-community-id';
```

### **Check Supabase Storage**

- Go to Supabase Dashboard → Storage
- Verify files appear in correct buckets
- Check file paths match expected structure

## 🎉 **Success Criteria**

**Image uploads are working when:**

- ✅ Files upload without errors
- ✅ Progress bars show and complete
- ✅ Images preview immediately
- ✅ Database contains public URLs (not blob URLs)
- ✅ Images display correctly after page refresh
- ✅ File validation prevents bad uploads
- ✅ Only authorized users can upload to restricted areas

**Ready to test! Try uploading some images now! 📷**
