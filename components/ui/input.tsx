import * as React from 'react'
import { cn } from '@/lib/design-system'

/** Default classes for dark cc-themed inputs (use with native `<input>` or spread onto components). */
export const inputBaseClass =
  'w-full rounded-lg border border-cc-border bg-cc-card px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, type, ...props }: InputProps) {
  return <input type={type} className={cn(inputBaseClass, className)} {...props} />
}
