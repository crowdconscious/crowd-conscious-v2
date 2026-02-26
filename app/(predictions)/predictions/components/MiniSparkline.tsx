'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface MiniSparklineProps {
  data: { value: number }[]
  positive?: boolean
  className?: string
  width?: number
  height?: number
}

export function MiniSparkline({
  data,
  positive = true,
  className = '',
  width = 100,
  height = 40,
}: MiniSparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-800/50 rounded ${className}`}
        style={{ width, height }}
      >
        <span className="text-slate-500 text-xs">—</span>
      </div>
    )
  }

  const chartData = data.map((d) => ({ value: d.value }))
  const stroke = positive ? '#10b981' : '#ef4444'

  return (
    <div className={className} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
