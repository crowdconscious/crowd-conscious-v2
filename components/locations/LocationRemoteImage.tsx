'use client'

import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { resolveLocationImageUrl } from '@/lib/locations/image-url'

export function LocationCoverImage({
  url,
  alt,
  className,
}: {
  url: string | null
  alt: string
  className?: string
}) {
  const resolved = resolveLocationImageUrl(url)
  const [err, setErr] = useState(false)
  useEffect(() => {
    setErr(false)
  }, [resolved, url])

  if (!resolved || err) {
    return (
      <div className={`flex items-center justify-center bg-[#0f1419] text-slate-600 ${className ?? ''}`}>
        <MapPin className="h-12 w-12 text-emerald-500/30" aria-hidden />
      </div>
    )
  }
  return (
    <img
      src={resolved}
      alt={alt}
      draggable={false}
      className={className}
      onError={() => setErr(true)}
    />
  )
}

export function LocationLogoImage({
  url,
  alt,
  className,
}: {
  url: string | null
  alt: string
  className?: string
}) {
  const resolved = resolveLocationImageUrl(url)
  const [err, setErr] = useState(false)
  useEffect(() => {
    setErr(false)
  }, [resolved, url])

  if (!resolved || err) {
    return null
  }
  return (
    <img
      src={resolved}
      alt={alt}
      draggable={false}
      className={className}
      onError={() => setErr(true)}
    />
  )
}
