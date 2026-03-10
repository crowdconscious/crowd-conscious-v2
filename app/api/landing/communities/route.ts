import { ApiResponse } from '@/lib/api-responses'

// Legacy: communities table removed. Return empty for backwards compatibility.
export const revalidate = 300

export async function GET() {
  return ApiResponse.ok({ communities: [], count: 0 })
}
