'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  linkTo?: string
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { width: 120, height: 36 },
  md: { width: 160, height: 48 },
  lg: { width: 220, height: 66 },
}

export default function Logo({
  size = 'md',
  linkTo = '/',
  showText = false,
  className = '',
}: LogoProps) {
  const { width, height } = sizes[size]

  const logoContent = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/images/logo.png"
        alt="Crowd Conscious"
        width={width}
        height={height}
        style={{ objectFit: 'contain', height: 'auto', maxHeight: `${height}px` }}
        priority
        onError={(e) => {
          const img = e.target as HTMLImageElement
          if (img.src.includes('logo.png') && !img.src.includes('logo-small')) {
            img.src = '/images/logo-small.png'
          }
        }}
      />
    </div>
  )

  if (linkTo) {
    return <Link href={linkTo}>{logoContent}</Link>
  }
  return logoContent
}
