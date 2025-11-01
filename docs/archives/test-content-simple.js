// Simple test script to run in browser console
// This will test if basic content creation works

async function testSimpleContentCreation() {
  console.log('🧪 Testing simple content creation...')
  
  try {
    // Import the client
    const { supabaseClient } = await import('./lib/supabase-client.js')
    
    // Test authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return
    }
    console.log('✅ User authenticated:', user.email)
    
    // Test simple content creation
    const testContent = {
      community_id: '47e49e89-769d-44ae-b40e-a1fc119c0e8c', // Replace with your community ID
      type: 'poll',
      title: 'Test Poll - ' + Date.now(),
      description: 'This is a test poll created via console',
      image_url: null,
      data: { poll_options: ['Option 1', 'Option 2'] },
      status: 'voting',
      created_by: user.id
    }
    
    console.log('🔍 Creating content:', testContent)
    
    const { data, error } = await supabaseClient
      .from('community_content')
      .insert(testContent)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Content creation failed:', error)
      return
    }
    
    console.log('✅ Content created successfully:', data)
    
    // Test poll options creation
    if (data) {
      const pollOptions = [
        { content_id: data.id, option_text: 'Option 1', vote_count: 0, order_index: 0 },
        { content_id: data.id, option_text: 'Option 2', vote_count: 0, order_index: 1 }
      ]
      
      const { error: optionsError } = await supabaseClient
        .from('poll_options')
        .insert(pollOptions)
      
      if (optionsError) {
        console.error('❌ Poll options creation failed:', optionsError)
      } else {
        console.log('✅ Poll options created successfully')
      }
    }
    
    console.log('🎉 All tests passed!')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Run the test
testSimpleContentCreation()

console.log('📋 Test function loaded. You can run testSimpleContentCreation() manually if needed.')
