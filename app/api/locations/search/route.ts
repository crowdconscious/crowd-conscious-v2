import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 3) {
    return ApiResponse.badRequest('Query must be at least 3 characters', 'QUERY_TOO_SHORT')
  }

  try {
    // Using Nominatim API with proper server-side headers
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&` +
      `format=json&` +
      `addressdetails=1&` +
      `limit=5&` +
      `countrycodes=us,mx,ca&` +
      `accept-language=en`,
      {
        headers: {
          'User-Agent': 'CrowdConscious/1.0 (https://crowdconscious.org)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the data to a consistent format
    const locations = data.map((item: any) => ({
      place_id: item.place_id,
      display_name: item.display_name,
      lat: item.lat,
      lon: item.lon,
      address: {
        house_number: item.address?.house_number,
        road: item.address?.road,
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        postcode: item.address?.postcode,
        country: item.address?.country
      }
    }))

    return ApiResponse.ok(locations)
  } catch (error: any) {
    console.error('Location search error:', error)
    
    // Return fallback suggestions
    const fallbackResults = [
      {
        place_id: 'fallback-1',
        display_name: `${query} (manual entry)`,
        lat: '0',
        lon: '0',
        address: {
          city: query,
          country: 'Unknown'
        }
      }
    ]
    
    return ApiResponse.ok(fallbackResults)
  }
}
