import { NextRequest } from 'next/server'
import { ApiResponse } from '@/lib/api-responses'

// Legacy: community_reviews and community_members tables removed
export async function GET(request: NextRequest) {
  return ApiResponse.ok({ reviews: [] })
}

export async function POST(request: NextRequest) {
  return ApiResponse.badRequest('Community reviews no longer supported. Communities table was dropped.', 'LEGACY_FEATURE_REMOVED')
}

export async function PUT(request: NextRequest) {
  return ApiResponse.badRequest('Community reviews no longer supported. Communities table was dropped.', 'LEGACY_FEATURE_REMOVED')
}

export async function DELETE(request: NextRequest) {
  return ApiResponse.badRequest('Community reviews no longer supported. Communities table was dropped.', 'LEGACY_FEATURE_REMOVED')
}
