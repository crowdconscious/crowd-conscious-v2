'use client'

interface SponsorBadgeProps {
  sponsorName: string
  sponsorUrl?: string | null
  sponsorLogoUrl?: string | null
  className?: string
  size?: 'sm' | 'md'
}

export function SponsorBadge({ sponsorName, sponsorUrl, sponsorLogoUrl, className = '', size = 'sm' }: SponsorBadgeProps) {
  const content = (
    <>
      {sponsorLogoUrl && (
        <img
          src={sponsorLogoUrl}
          alt={sponsorName}
          className={size === 'sm' ? 'h-5 w-auto rounded object-contain' : 'h-6 w-auto rounded object-contain'}
        />
      )}
      <span>
        Sponsored by{' '}
        {sponsorUrl ? (
          <a
            href={sponsorUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-emerald-400 hover:underline"
          >
            {sponsorName}
          </a>
        ) : (
          sponsorName
        )}
      </span>
    </>
  )
  return (
    <div className={`flex items-center gap-2 text-slate-500 ${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}>
      {content}
    </div>
  )
}
