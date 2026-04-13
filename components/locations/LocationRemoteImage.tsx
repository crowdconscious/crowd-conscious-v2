'use client'

import { useEffect, useState } from 'react'
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
        <span className="text-4xl" aria-hidden>
          📍
        </span>
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
