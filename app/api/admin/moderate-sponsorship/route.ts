import { ApiResponse } from '@/lib/api-responses'

// Legacy: sponsorships table removed
export async function POST() {
  return ApiResponse.badRequest('Sponsorship moderation removed. Sponsorships table was dropped.', 'LEGACY_FEATURE_REMOVED')
}
