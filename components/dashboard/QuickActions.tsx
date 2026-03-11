'use client'

import Link from 'next/link'
import { BarChart2, Heart, Lightbulb, Trophy, TrendingUp, ArrowRight } from 'lucide-react'

function formatFund(num: number): string {
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`
  return `$${num.toFixed(2)}`
}

const ACTIONS: Array<{
  label: string
  getSublabel: (ctx: { predictionCount: number; fundBalance: number; impactXp: number }) => string
  href: string
  accent: string
  icon: typeof BarChart2
}> = [
  {
    label: 'Your Predictions',
    getSublabel: (ctx) => `${ctx.predictionCount} active`,
    href: '/predictions#your-predictions',
    accent: '#10b981',
    icon: BarChart2,
  },
  {
    label: 'Vote for Causes',
    getSublabel: (ctx) => `${formatFund(ctx.fundBalance)} fund · ${ctx.impactXp} XP impact`,
    href: '/predictions/fund',
    accent: '#f43f5e',
    icon: Heart,
  },
  {
    label: 'Submit Ideas',
    getSublabel: () => 'Conscious Inbox',
    href: '/predictions/inbox',
    accent: '#f59e0b',
    icon: Lightbulb,
  },
  {
    label: 'Leaderboard',
    getSublabel: () => 'See your ranking',
    href: '/predictions/leaderboard',
    accent: '#a78bfa',
    icon: Trophy,
  },
  {
    label: 'Explore Markets',
    getSublabel: () => 'New predictions available',
    href: '/predictions/markets',
    accent: '#38bdf8',
    icon: TrendingUp,
  },
]


interface QuickActionsProps {
  predictionCount: number
  fundBalance: number
  impactXp: number
}

export function QuickActions({ predictionCount, fundBalance, impactXp }: QuickActionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        What you can do
      </p>
      <div className="space-y-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon
          const sublabel = action.getSublabel({
            predictionCount,
            fundBalance,
            impactXp,
          })

          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${action.accent}20`, color: action.accent }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white">{action.label}</p>
                  <p className="text-xs text-slate-400">{sublabel}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
