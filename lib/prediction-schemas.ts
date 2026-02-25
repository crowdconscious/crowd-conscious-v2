import { z } from 'zod'

/**
 * Prediction / Collective Consciousness validation schemas
 */

export const tradeSchema = z.object({
  market_id: z.string().uuid('Invalid market ID'),
  side: z.enum(['yes', 'no']),
  amount: z.number().min(10, 'Minimum trade is 10 MXN').max(100000, 'Maximum trade is 100,000 MXN'),
})

export const depositSchema = z.object({
  amount: z.number().min(50, 'Minimum deposit is 50 MXN').max(500000, 'Maximum deposit is 500,000 MXN'),
  payment_method: z.enum(['stripe', 'mercadopago']),
})

export type TradeInput = z.infer<typeof tradeSchema>
export type DepositInput = z.infer<typeof depositSchema>
