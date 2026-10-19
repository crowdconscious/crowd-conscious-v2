import Link from 'next/link'
import { sealSvg, sealVerifyPath, SEAL_NAMES, type SealType } from '@/lib/org/sello-badge'

/**
 * One of the two official badges as inline SVG (crisp, transparent).
 * `type` is required: Lugar Consciente (7 stars) and Sello verificado (check) are different seals.
 * Pass `slug` to link it to that seal's public verify page.
 */
export default function SealBadge({ type, size = 160, slug, id, className = '' }: { type: SealType; size?: number; slug?: string; id?: string; className?: string }) {
  const svg = (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      // Static markup generated in-repo (lib/org/sello-svg.generated.ts); no user input.
      dangerouslySetInnerHTML={{ __html: sealSvg(type, id ?? `${type}-${slug ?? 'x'}`).replace('<svg ', '<svg width="100%" height="100%" ') }}
    />
  )
  return slug ? (
    <Link href={sealVerifyPath(type, slug)} aria-label={`Verificar ${SEAL_NAMES[type].es}`} className="inline-block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
      {svg}
    </Link>
  ) : (
    svg
  )
}
