import * as React from 'react'
import { cn } from '@/lib/design-system'

export const textareaBaseClass =
  'w-full rounded-lg border border-[#2d3748] bg-[#1a2029] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus-visible:border-emerald-500/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(textareaBaseClass, className)} {...props} />
}
