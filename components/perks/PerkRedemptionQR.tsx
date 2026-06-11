'use client'

const SITE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') || 'https://crowdconscious.app'

/** QR linking to the public verify URL (no extra npm dep). */
export default function PerkRedemptionQR({
  code,
  size = 200,
  className = '',
}: {
  code: string
  size?: number
  className?: string
}) {
  const verifyUrl = `${SITE_URL}/perks/verify/${encodeURIComponent(code)}`
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(verifyUrl)}`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      className={`rounded-lg bg-white p-2 ${className}`}
    />
  )
}
