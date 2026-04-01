'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/design-system'

export type LogoStorageFolder = 'blog' | 'pulse' | 'live' | 'sponsors'

export interface LogoUploadProps {
  currentLogoUrl: string | null
  onUpload: (url: string) => void
  onClear?: () => void
  label?: string
  /** Shown under the dashed area (e.g. format hints) */
  hint?: string
  className?: string
  /** Subfolder under the storage bucket (default sponsors). */
  storageFolder?: LogoStorageFolder
}

const MAX_BYTES = 2 * 1024 * 1024

/**
 * Uploads to `sponsor-logos` via POST /api/sponsor/upload-logo (same as Stripe sponsor flow).
 */
export function LogoUpload({
  currentLogoUrl,
  onUpload,
  onClear,
  label = 'Logo de tu marca',
  hint,
  className,
  storageFolder = 'sponsors',
}: LogoUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      setError(null)
      if (file.size > MAX_BYTES) {
        setError('El archivo debe ser menor a 2MB / File must be under 2MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Selecciona una imagen / Select an image file')
        return
      }
      setLoading(true)
      try {
        const fd = new FormData()
        fd.append('logo', file)
        fd.append('folder', storageFolder)
        const res = await fetch('/api/sponsor/upload-logo', { method: 'POST', body: fd })
        const json = (await res.json()) as {
          success?: boolean
          data?: { url?: string }
          error?: { message?: string }
        }
        if (!res.ok || json.success === false) {
          setError(json.error?.message ?? 'Error al subir / Upload failed')
          return
        }
        const url = json.data?.url
        if (!url) {
          setError('Sin URL / No URL returned')
          return
        }
        onUpload(url)
      } catch {
        setError('Error al subir / Upload failed')
      } finally {
        setLoading(false)
      }
    },
    [onUpload, storageFolder]
  )

  const url = currentLogoUrl?.trim() || ''

  return (
    <div className={cn('space-y-2', className)}>
      {label ? (
        <span className="block text-sm font-medium text-gray-300">{label}</span>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={cn(
          'w-full rounded-xl border-2 border-dashed border-[#2d3748] bg-[#0f1419] p-6 text-center transition-colors',
          'hover:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30',
          loading && 'cursor-wait opacity-80'
        )}
      >
        {url ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="max-h-20 max-w-full object-contain mx-auto"
            />
            <span className="text-xs text-gray-400">
              {loading ? 'Subiendo… / Uploading…' : 'Clic para cambiar / Click to change'}
            </span>
            {onClear && (
              <button
                type="button"
                onClick={(ev) => {
                  ev.stopPropagation()
                  onClear()
                }}
                className="text-xs text-red-400 hover:underline"
              >
                Quitar / Remove
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload
              className={cn('h-8 w-8 text-gray-400', loading && 'animate-spin')}
            />
            <span className="text-sm text-gray-400">
              {loading ? 'Subiendo… / Uploading…' : 'Sube tu logo / Upload your logo'}
            </span>
            <span className="text-xs text-gray-600">
              PNG, JPG, WebP, GIF · máx. 2MB / max 2MB
            </span>
          </div>
        )}
      </button>
      {hint ? <p className="text-xs text-gray-600">{hint}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  )
}
