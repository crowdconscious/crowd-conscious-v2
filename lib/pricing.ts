/**
 * Dynamic pricing calculations for marketplace modules
 * 
 * **PRICING TIERS**:
 * - Individual: 1 person (base_price / 50)
 * - Team: 5-20 people (per-person with discount)
 * - Corporate: 50+ people (pack-based pricing)
 * - Enterprise: 100+ people (negotiated)
 * 
 * **REVENUE DISTRIBUTION**:
 * - Platform modules: 100% → Platform
 * - Community modules: 50% Community + 20% Creator + 30% Platform
 */

export type PurchaseType = 'individual' | 'team' | 'corporate' | 'enterprise'

export interface ModulePricing {
  base_price_mxn: number
  price_per_50_employees: number
  individual_price_mxn?: number | null
  team_price_mxn?: number | null
  team_discount_percent?: number | null
  is_platform_module: boolean
}

export interface PriceCalculation {
  total_price: number
  price_per_person: number
  packs: number
  discount_applied: number
  purchase_type: PurchaseType
}

/**
 * Calculate module price based on user count and purchase type
 * 
 * @param module - Module pricing information
 * @param userCount - Number of users purchasing
 * @param purchaseType - Type of purchase (auto-detected if not provided)
 * @returns Calculated price in MXN
 * 
 * @example
 * ```typescript
 * const price = calculateModulePrice(module, 1, 'individual')
 * // Returns: 360 (for platform module)
 * 
 * const price = calculateModulePrice(module, 75, 'corporate')
 * // Returns: 26000 (18000 + 8000 for 2 packs)
 * ```
 */
export function calculateModulePrice(
  module: ModulePricing,
  userCount: number,
  purchaseType?: PurchaseType
): number {
  // Validate inputs
  if (userCount < 1) {
    throw new Error('User count must be at least 1')
  }

  // Auto-detect purchase type if not provided
  if (!purchaseType) {
    purchaseType = detectPurchaseType(userCount)
  }

  // Individual purchase (1 person)
  if (userCount === 1 || purchaseType === 'individual') {
    return module.individual_price_mxn || Math.round(module.base_price_mxn / 50)
  }

  // Team purchase (5-20 people with discount)
  if (userCount <= 20 && purchaseType === 'team') {
    const pricePerPerson = Math.round(module.base_price_mxn / 50)
    const discount = module.team_discount_percent || 10
    const discountedPrice = pricePerPerson * (100 - discount) / 100
    return Math.round(discountedPrice * userCount)
  }

  // Corporate purchase (pack-based pricing)
  const packs = Math.ceil(userCount / 50)
  return module.base_price_mxn + ((packs - 1) * module.price_per_50_employees)
}

/**
 * Get detailed price calculation breakdown
 * 
 * @param module - Module pricing information
 * @param userCount - Number of users purchasing
 * @returns Detailed price calculation
 * 
 * @example
 * ```typescript
 * const calc = getPriceCalculation(module, 75)
 * console.log(calc)
 * // {
 * //   total_price: 26000,
 * //   price_per_person: 347,
 * //   packs: 2,
 * //   discount_applied: 0,
 * //   purchase_type: 'corporate'
 * // }
 * ```
 */
export function getPriceCalculation(
  module: ModulePricing,
  userCount: number
): PriceCalculation {
  const purchaseType = detectPurchaseType(userCount)
  const totalPrice = calculateModulePrice(module, userCount, purchaseType)
  const pricePerPerson = Math.round(totalPrice / userCount)
  const packs = Math.ceil(userCount / 50)

  let discountApplied = 0
  if (purchaseType === 'team') {
    discountApplied = module.team_discount_percent || 10
  }

  return {
    total_price: totalPrice,
    price_per_person: pricePerPerson,
    packs,
    discount_applied: discountApplied,
    purchase_type: purchaseType
  }
}

/**
 * Auto-detect purchase type based on user count
 * 
 * @param userCount - Number of users
 * @returns Detected purchase type
 */
export function detectPurchaseType(userCount: number): PurchaseType {
  if (userCount === 1) return 'individual'
  if (userCount <= 20) return 'team'
  if (userCount <= 100) return 'corporate'
  return 'enterprise'
}

/**
 * Calculate volume discount percentage
 * 
 * @param userCount - Number of users
 * @returns Discount percentage (0-100)
 */
export function getVolumeDiscount(userCount: number): number {
  if (userCount <= 10) return 0
  if (userCount <= 50) return 5  // 5% off
  if (userCount <= 100) return 10 // 10% off
  return 15 // 15% off for 100+
}

/**
 * Get pricing preview for different user counts
 * 
 * @param module - Module pricing information
 * @returns Array of pricing examples
 * 
 * @example
 * ```typescript
 * const preview = getPricingPreview(module)
 * // Returns pricing for: 1, 10, 25, 50, 100, 200 users
 * ```
 */
export function getPricingPreview(module: ModulePricing) {
  const userCounts = [1, 10, 25, 50, 100, 200]

  return userCounts.map(count => {
    const calc = getPriceCalculation(module, count)
    return {
      user_count: count,
      ...calc
    }
  })
}

/**
 * Format price for display
 * 
 * @param price - Price in MXN
 * @param format - Format type ('short' | 'long')
 * @returns Formatted price string
 * 
 * @example
 * ```typescript
 * formatPrice(18000, 'short') // "$18k MXN"
 * formatPrice(18000, 'long')  // "$18,000 MXN"
 * ```
 */
export function formatPrice(price: number, format: 'short' | 'long' = 'long'): string {
  if (format === 'short' && price >= 1000) {
    return `$${(price / 1000).toFixed(0)}k MXN`
  }
  return `$${price.toLocaleString('es-MX')} MXN`
}

/**
 * Calculate revenue distribution for a module sale
 * 
 * @param totalAmount - Total sale amount
 * @param isPlatformModule - Whether this is a platform-owned module
 * @param creatorDonates - Whether creator donates their share to community
 * @returns Revenue distribution breakdown
 * 
 * @example
 * ```typescript
 * // Platform module
 * const dist = calculateRevenueDistribution(18000, true, false)
 * // { creator: 0, community: 0, platform: 18000 }
 * 
 * // Community module
 * const dist = calculateRevenueDistribution(18000, false, false)
 * // { creator: 3600, community: 9000, platform: 5400 }
 * ```
 */
export function calculateRevenueDistribution(
  totalAmount: number,
  isPlatformModule: boolean,
  creatorDonates: boolean = false
) {
  // Platform modules: 100% to platform
  if (isPlatformModule) {
    return {
      creator_amount: 0,
      community_amount: 0,
      platform_amount: totalAmount
    }
  }

  // Community modules with creator donation
  if (creatorDonates) {
    return {
      creator_amount: 0,
      community_amount: Math.round(totalAmount * 0.8), // 80%
      platform_amount: Math.round(totalAmount * 0.2)   // 20%
    }
  }

  // Standard community module split: 50/20/30
  return {
    creator_amount: Math.round(totalAmount * 0.2),    // 20%
    community_amount: Math.round(totalAmount * 0.5),  // 50%
    platform_amount: Math.round(totalAmount * 0.3)    // 30%
  }
}

