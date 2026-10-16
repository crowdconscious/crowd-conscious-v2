import Link from 'next/link'
import { selloSvg, selloVerifyPath, type SelloVariant } from '@/lib/org/sello-badge'

/**
 * The official Sello badge as inline SVG (crisp at any size, transparent).
 * Pass `slug` to link it to the public verify page.
 */
export default function SelloBadge({ variant, size = 160, slug, id, className = '' }: { variant: SelloVariant; size?: number; slug?: string; id?: string; className?: string }) {
  const svg = (
    <span
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      // Static markup generated in-repo (lib/org/sello-svg.generated.ts); no user input.
      dangerouslySetInnerHTML={{ __html: selloSvg(variant, id ?? `sello-${slug ?? 'x'}`).replace('<svg ', '<svg width="100%" height="100%" ') }}
    />
  )
  return slug ? (
    <Link href={selloVerifyPath(slug)} aria-label="Verificar Sello" className="inline-block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
      {svg}
    </Link>
  ) : (
    svg
  )
}
