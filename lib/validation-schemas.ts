import { z } from 'zod'

/**
 * Common Zod validation schemas for API requests
 * 
 * These schemas provide type-safe validation and automatic error messages
 * for common request patterns across the platform.
 */

// ============================================================================
// AUTHENTICATION & USER SCHEMAS
// ============================================================================

export const userIdSchema = z.string().uuid('Invalid user ID format')

export const emailSchema = z.string().email('Invalid email format')

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')

// ============================================================================
// MODULE & COURSE SCHEMAS
// ============================================================================

export const moduleIdSchema = z.string().uuid('Invalid module ID format')

export const courseIdSchema = z.string().uuid('Invalid course ID format')

export const enrollmentIdSchema = z.string().uuid('Invalid enrollment ID format')

export const lessonIdSchema = z.string().uuid('Invalid lesson ID format')

export const createEnrollmentSchema = z.object({
  moduleId: moduleIdSchema,
  userId: userIdSchema.optional(), // Optional if using auth context
  employeeCount: z.number().int().positive().optional(),
})

export const completeLessonSchema = z.object({
  enrollmentId: enrollmentIdSchema,
  lessonId: lessonIdSchema,
  activityData: z.record(z.any()).optional(),
  timeSpentMinutes: z.number().nonnegative().optional(),
  completed: z.boolean().default(true),
})

// ============================================================================
// MARKETPLACE & PURCHASE SCHEMAS
// ============================================================================

export const purchaseModuleSchema = z.object({
  moduleId: moduleIdSchema,
  employeeCount: z.number().int().positive().min(1).max(10000),
  paymentMethodId: z.string().optional(),
  promoCode: z.string().optional(),
})

export const addToCartSchema = z.object({
  moduleId: moduleIdSchema,
  employeeCount: z.number().int().positive().min(1).max(10000).default(50),
})

export const applyPromoCodeSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
})

// ============================================================================
// PAYMENT & STRIPE SCHEMAS
// ============================================================================

export const createCheckoutSchema = z.object({
  sponsorshipId: z.string().uuid('Invalid sponsorship ID'),
  amount: z.number().positive('Amount must be positive'),
  contentTitle: z.string().min(1).max(200).optional(),
  communityName: z.string().min(1).max(200).optional(),
  communityId: z.string().uuid('Invalid community ID').optional(),
  sponsorType: z.enum(['individual', 'brand']).optional(),
  brandName: z.string().max(200).optional(),
  email: emailSchema,
  taxReceipt: z.boolean().optional(),
  coverPlatformFee: z.boolean().default(false),
})

export const createPaymentIntentSchema = z.object({
  sponsorshipId: z.string().uuid('Invalid sponsorship ID'),
  amount: z.number().positive('Amount must be positive'),
})

// ============================================================================
// TREASURY SCHEMAS
// ============================================================================

export const treasuryDonateSchema = z.object({
  communityId: z.string().uuid('Invalid community ID'),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount too large'),
  communityName: z.string().min(1).max(200).optional(),
})

export const treasurySpendSchema = z.object({
  communityId: z.string().uuid('Invalid community ID'),
  contentId: z.string().uuid('Invalid content ID'),
  amount: z.number().positive('Amount must be positive'),
  sponsorshipId: z.string().uuid('Invalid sponsorship ID').optional(),
  description: z.string().max(500).optional(),
})

// ============================================================================
// COMMUNITY SCHEMAS
// ============================================================================

export const communityIdSchema = z.string().uuid('Invalid community ID')

export const createCommunitySchema = z.object({
  name: z.string().min(1).max(100, 'Name too long'),
  description: z.string().min(1).max(1000, 'Description too long').optional(),
  address: z.string().max(500).optional(),
  coreValues: z.array(z.string()).optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
})

export const updateCommunitySchema = createCommunitySchema.partial()

// ============================================================================
// REVIEW SCHEMAS
// ============================================================================

export const createReviewSchema = z.object({
  moduleId: moduleIdSchema.optional(),
  communityId: communityIdSchema.optional(),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  comment: z.string().min(1).max(2000, 'Comment too long'),
  title: z.string().min(1).max(200).optional(),
})

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(2000).optional(),
  title: z.string().min(1).max(200).optional(),
})

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const createCommentSchema = z.object({
  contentId: z.string().uuid('Invalid content ID'),
  content: z.string().min(1).max(5000, 'Comment too long'),
  parentId: z.string().uuid('Invalid parent comment ID').optional(),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000, 'Comment too long'),
})

// ============================================================================
// CART SCHEMAS
// ============================================================================

export const updateCartItemSchema = z.object({
  moduleId: moduleIdSchema,
  employeeCount: z.number().int().positive().min(1).max(10000),
})

export const removeCartItemSchema = z.object({
  moduleId: moduleIdSchema,
})

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const createPromoCodeSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  description: z.string().max(500).optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'free']),
  discountValue: z.number().nonnegative().optional(),
  maxUses: z.number().int().positive().optional(),
  maxUsesPerUser: z.number().int().positive().default(1),
  validUntil: z.string().datetime().optional(),
  partnerName: z.string().max(200).optional(),
  campaignName: z.string().max(200).optional(),
  minimumPurchaseAmount: z.number().nonnegative().default(0),
  notes: z.string().max(1000).optional(),
})

export const togglePromoCodeSchema = z.object({
  id: z.string().uuid('Invalid promo code ID'),
  active: z.boolean(),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse and validate request body with Zod schema
 * Returns validated data or throws ApiResponse error
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      throw {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          errors,
          timestamp: new Date().toISOString(),
        },
        status: 422,
      }
    }
    throw error
  }
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(searchParams.entries())
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      throw {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Query parameter validation failed',
          errors,
          timestamp: new Date().toISOString(),
        },
        status: 422,
      }
    }
    throw error
  }
}

