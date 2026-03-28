import * as React from 'react'
import { cn } from '@/lib/design-system'

/** Default classes for dark inputs — matches #1a2029 / #2d3748 system */
export const inputBaseClass =
  'w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus-visible:border-emerald-500/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, type, ...props }: InputProps) {
  return <input type={type} className={cn(inputBaseClass, className)} {...props} />
}
