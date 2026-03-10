import { ApiResponse } from '@/lib/api-responses'

// Legacy: communities table removed
export async function POST() {
  return ApiResponse.badRequest('Community moderation removed. Communities table was dropped.', 'LEGACY_FEATURE_REMOVED')
}
