import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'default' | 'white' | 'dark'
  showText?: boolean
  href?: string
  className?: string
}

const sizeClasses = {
  small: 'w-8 h-8',
  medium: 'w-12 h-12', 
  large: 'w-16 h-16'
}

const textSizeClasses = {
  small: 'text-lg',
  medium: 'text-xl',
  large: 'text-2xl'
}

export default function Logo({ 
  size = 'medium', 
  variant = 'default', 
  showText = true, 
  href,
  className = ''
}: LogoProps) {
  const logoContent = (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Actual PNG Logo */}
      <div className={`${sizeClasses[size]} relative flex items-center justify-center`}>
        <Image
          src="/images/logo.png"
          alt="Crowd Conscious Logo"
          width={size === 'small' ? 32 : size === 'medium' ? 48 : 64}
          height={size === 'small' ? 32 : size === 'medium' ? 48 : 64}
          className={`${sizeClasses[size]} object-contain ${
            variant === 'white' ? 'brightness-0 invert' : 
            variant === 'dark' ? 'brightness-0' : 
            ''
          }`}
          priority
        />
      </div>
      
      {showText && (
        <span className={`font-bold tracking-tight ${textSizeClasses[size]} ${
          variant === 'white' ? 'text-white' : 
          variant === 'dark' ? 'text-slate-900' : 
          'bg-gradient-to-r from-teal-600 to-teal-700 bg-clip-text text-transparent'
        }`}>
          CONSCIOUS
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}
