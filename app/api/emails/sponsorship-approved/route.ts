import { ApiResponse } from '@/lib/api-responses'

// Legacy: sponsorships table removed
export async function POST() {
  return ApiResponse.badRequest('Sponsorship approval emails no longer supported. Sponsorships table was dropped.', 'LEGACY_FEATURE_REMOVED')
}
