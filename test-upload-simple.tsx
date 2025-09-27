// Simple upload test component - paste this in browser console or create a test page
// This bypasses all our components to test raw Supabase upload

import { supabase } from './lib/supabase'

async function testRawUpload() {
  console.log('🧪 Testing raw Supabase upload...')
  
  try {
    // Create a simple test file
    const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
    console.log('📁 Created test file:', testFile.name, testFile.size, 'bytes')
    
    // Test 1: Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return
    }
    console.log('✅ User authenticated:', user.email)
    
    // Test 2: Try to upload to storage
    const fileName = `test-${Date.now()}.txt`
    const { data, error } = await supabase.storage
      .from('community-images')
      .upload(fileName, testFile, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('❌ Upload failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return
    }
    
    console.log('✅ Upload successful:', data)
    
    // Test 3: Get public URL
    const { data: urlData } = supabase.storage
      .from('community-images')
      .getPublicUrl(data.path)
    
    console.log('✅ Public URL:', urlData.publicUrl)
    
    // Test 4: Clean up
    await supabase.storage
      .from('community-images')
      .remove([data.path])
    
    console.log('✅ Cleanup successful')
    console.log('🎉 All tests passed! Storage is working.')
    
  } catch (error) {
    console.error('💥 Unexpected error:', error)
  }
}

// Call this function to test
testRawUpload()

// Alternative: Test with a real image
async function testImageUpload() {
  console.log('🖼️ Testing image upload...')
  
  // You can create an input element to select a real file
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    console.log('📁 Selected file:', file.name, file.size, 'bytes', file.type)
    
    try {
      const fileName = `test-image-${Date.now()}.${file.name.split('.').pop()}`
      const { data, error } = await supabase.storage
        .from('community-images')
        .upload(fileName, file)
      
      if (error) {
        console.error('❌ Image upload failed:', error)
        return
      }
      
      console.log('✅ Image upload successful:', data)
      
      const { data: urlData } = supabase.storage
        .from('community-images')
        .getPublicUrl(data.path)
      
      console.log('✅ Image URL:', urlData.publicUrl)
      
      // Create an img element to test if it works
      const img = document.createElement('img')
      img.src = urlData.publicUrl
      img.style.maxWidth = '200px'
      img.style.border = '2px solid green'
      document.body.appendChild(img)
      console.log('✅ Image added to page')
      
    } catch (error) {
      console.error('💥 Image upload error:', error)
    }
  }
  
  input.click()
}

// Export for manual testing
;(window as any).testRawUpload = testRawUpload
;(window as any).testImageUpload = testImageUpload

console.log('🔧 Upload test functions loaded. Run testRawUpload() or testImageUpload() in console.')
