'use client'

import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'nav' | 'sidebar'
  linkTo?: string
  showText?: boolean
  className?: string
}

const sizes = {
  sm: { width: 120, height: 36, className: 'h-9 w-auto' },
  md: { width: 160, height: 48, className: 'h-12 w-auto' },
  lg: { width: 220, height: 66, className: 'h-[66px] w-auto' },
  // h-10 for public nav bars — keep width auto so the stacked wordmark
  // isn't squashed when the flex row is tight.
  nav: { width: 176, height: 44, className: 'h-11 w-auto' },
  sidebar: { width: 120, height: 32, className: 'h-8 w-auto' },
}

export default function Logo({
  size = 'md',
  linkTo = '/',
  className = '',
}: LogoProps) {
  const { width, height, className: sizeClass } = sizes[size]

  // shrink-0 is load-bearing: LandingNav's desktop row is a crowded
  // justify-between flex. Without it the logo link collapses to 0px
  // width and the wordmark vanishes on production desktop (mobile still
  // showed it because the link rows are hidden below md).
  const logoContent = (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      <Image
        src="/images/logo.png"
        alt="Crowd Conscious"
        width={width}
        height={height}
        className={`${sizeClass} shrink-0 object-contain object-left`}
        style={{ width: 'auto', height: 'auto', maxHeight: height }}
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
    return (
      <Link
        href={linkTo}
        className="inline-flex shrink-0 items-center"
        aria-label="Crowd Conscious"
      >
        {logoContent}
      </Link>
    )
  }
  return logoContent
}
