import { ApiResponse } from '@/lib/api-responses'

// Retired one-time bootstrap endpoint. Admin roles are managed in the database only.
export async function POST() {
  return ApiResponse.forbidden('This endpoint has been retired', 'ENDPOINT_RETIRED')
}
