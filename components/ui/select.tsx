import * as React from 'react'
import { cn } from '@/lib/design-system'

/** Native `<select>` styling (no Radix). Use for dark forms consistently. */
export const selectTriggerClass =
  'w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-3 py-2 text-sm text-white focus:outline-none focus-visible:border-emerald-500/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={cn(selectTriggerClass, className)} {...props}>
      {children}
    </select>
  )
}
