// Test script to check landing page data fetching
// Run in browser console on the deployed site

async function testLandingPageData() {
  console.log('🧪 Testing landing page data...')
  
  try {
    // Test communities query
    console.log('📍 Testing communities query...')
    const communitiesResponse = await fetch('/api/communities-public')
    if (communitiesResponse.ok) {
      const communities = await communitiesResponse.json()
      console.log('✅ Communities data:', communities)
    } else {
      console.log('❌ Communities API not found, testing direct query...')
      
      // We'll need to create this API endpoint
      console.log('⚠️ Need to create /api/communities-public endpoint')
    }
    
    // Test if we can access the database directly
    console.log('📊 Testing if any communities exist...')
    
    // This would require creating API endpoints to test
    console.log('💡 Next steps:')
    console.log('1. Create API endpoint to get communities for landing page')
    console.log('2. Create API endpoint to get impact stats')
    console.log('3. Test with real data')
    
  } catch (error) {
    console.error('💥 Test failed:', error)
  }
}

// Instructions
console.log('📋 To test landing page data:')
console.log('1. Open browser console on your deployed site')
console.log('2. Copy and paste this entire script')
console.log('3. Run: testLandingPageData()')

testLandingPageData()
