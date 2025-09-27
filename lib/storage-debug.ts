import { supabaseClient } from './supabase-client'

// Debug version of upload with extensive logging
export async function debugUploadImage(file: File, bucket: string, path: string) {
  console.log('🔍 DEBUG: Starting upload...', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    bucket,
    path
  })
  
  try {
    // Step 1: Check authentication
    console.log('🔍 DEBUG: Checking authentication...')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError) {
      console.error('❌ DEBUG: Auth error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    
    if (!user) {
      console.error('❌ DEBUG: No user found')
      throw new Error('User not authenticated')
    }
    
    console.log('✅ DEBUG: User authenticated:', {
      id: user.id,
      email: user.email
    })
    
    // Step 2: Check bucket exists
    console.log('🔍 DEBUG: Checking if bucket exists...')
    const { data: buckets, error: bucketError } = await supabaseClient.storage.listBuckets()
    
    if (bucketError) {
      console.error('❌ DEBUG: Bucket list error:', bucketError)
    } else {
      const bucketExists = buckets?.some(b => b.id === bucket)
      console.log(`✅ DEBUG: Bucket '${bucket}' exists:`, bucketExists)
      console.log('✅ DEBUG: Available buckets:', buckets?.map(b => b.id))
    }
    
    // Step 3: Generate filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${path}/${timestamp}_${randomId}.${extension}`
    
    console.log('🔍 DEBUG: Generated filename:', fileName)
    
    // Step 4: Attempt upload
    console.log('🔍 DEBUG: Starting upload to Supabase...')
    const uploadStartTime = Date.now()
    
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    const uploadEndTime = Date.now()
    console.log(`🔍 DEBUG: Upload took ${uploadEndTime - uploadStartTime}ms`)
    
    if (error) {
      console.error('❌ DEBUG: Upload error details:', {
        error,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code
      })
      throw new Error(`Upload failed: ${error.message}`)
    }
    
    if (!data?.path) {
      console.error('❌ DEBUG: Upload succeeded but no path returned')
      throw new Error('Upload succeeded but no path returned')
    }
    
    console.log('✅ DEBUG: Upload successful:', {
      path: data.path,
      id: data.id,
      fullPath: data.fullPath
    })
    
    // Step 5: Get public URL
    console.log('🔍 DEBUG: Getting public URL...')
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(data.path)
    
    if (!urlData?.publicUrl) {
      console.error('❌ DEBUG: Failed to get public URL')
      throw new Error('Failed to get public URL')
    }
    
    console.log('✅ DEBUG: Public URL generated:', urlData.publicUrl)
    
    // Step 6: Test if URL is accessible
    console.log('🔍 DEBUG: Testing URL accessibility...')
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' })
      console.log('✅ DEBUG: URL accessible:', {
        status: response.status,
        statusText: response.statusText
      })
    } catch (fetchError) {
      console.warn('⚠️ DEBUG: URL test failed:', fetchError)
    }
    
    console.log('🎉 DEBUG: Upload completed successfully!')
    return urlData.publicUrl
    
  } catch (error) {
    console.error('💥 DEBUG: Upload failed with error:', error)
    throw error
  }
}

// Simplified version that just tries the most basic upload
export async function simpleUpload(file: File) {
  console.log('🔧 SIMPLE: Testing basic upload...')
  
  const fileName = `test-${Date.now()}.${file.name.split('.').pop()}`
  
  const { data, error } = await supabaseClient.storage
    .from('community-images')
    .upload(fileName, file)
  
  if (error) {
    console.error('❌ SIMPLE: Upload failed:', error)
    throw error
  }
  
  console.log('✅ SIMPLE: Upload worked:', data)
  
  const { data: urlData } = supabaseClient.storage
    .from('community-images')
    .getPublicUrl(data.path)
  
  console.log('✅ SIMPLE: URL:', urlData.publicUrl)
  return urlData.publicUrl
}
