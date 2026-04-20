'use client'

import { LogoUpload } from '@/components/ui/LogoUpload'

export type ImageUploadStoragePath =
  | 'blog'
  | 'pulse'
  | 'live'
  | 'sponsors'
  | 'locations'
  | 'causes'

export type ImageUploadProps = {
  currentUrl: string | null
  onUpload: (url: string) => void
  onClear?: () => void
  storagePath?: ImageUploadStoragePath
  label?: string
  hint?: string
  className?: string
}

/** Uploads to Supabase `sponsor-logos` bucket with a folder prefix (blog / pulse / live / sponsors). */
export function ImageUpload({
  currentUrl,
  onUpload,
  onClear,
  storagePath = 'sponsors',
  label,
  hint,
  className,
}: ImageUploadProps) {
  return (
    <LogoUpload
      currentLogoUrl={currentUrl}
      onUpload={onUpload}
      onClear={onClear}
      storageFolder={storagePath}
      label={label}
      hint={hint}
      className={className}
    />
  )
}
