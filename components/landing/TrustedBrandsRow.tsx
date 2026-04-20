'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type Brand = {
  id: string
  company_name: string
  logo_url: string
  tier: string
  case_study_featured: boolean
}

type Props = {
  locale: 'es' | 'en'
}

/**
 * Horizontal monochrome strip of partner logos rendered just below the hero.
 *
 * Rules of the road (audit §3.2):
 *   - Render NOTHING below 3 logos. Two grayed-out brands look weak; zero is
 *     less embarrassing than two.
 *   - Logos are grayscale by default; saturate on hover (desktop) and during
 *     auto-scroll dwell (mobile).
 *   - Auto-scroll on mobile via a CSS marquee — never with JS so we don't fire
 *     state updates while the user is scrolling the page itself.
 *
 * Data source: GET /api/landing/trusted-brands. The endpoint already filters
 * to `mundial_pack`, `mundial_pack_founding`, `enterprise`, plus any sponsor
 * the founder explicitly toggled via `case_study_featured`.
 */
export function TrustedBrandsRow({ locale }: Props) {
  const [brands, setBrands] = useState<Brand[] | null>(null)

  useEffect(() => {
    let aborted = false
    fetch('/api/landing/trusted-brands')
      .then((r) => r.json())
      .then((d: { brands?: Brand[] }) => {
        if (!aborted) setBrands(Array.isArray(d.brands) ? d.brands : [])
      })
      .catch(() => {
        if (!aborted) setBrands([])
      })
    return () => {
      aborted = true
    }
  }, [])

  if (!brands || brands.length < 3) return null

  const heading =
    locale === 'es' ? 'Marcas que confían en nosotros' : 'Brands that trust us'

  // Duplicate the list once so the marquee loop is seamless on mobile.
  const looped = [...brands, ...brands]

  return (
    <section
      aria-label={heading}
      className="border-b border-cc-border/40 bg-cc-bg/60 px-4 py-6 md:py-8"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {heading}
        </p>

        {/* Mobile: marquee. Desktop: static centered row. */}
        <div className="group relative overflow-hidden md:overflow-visible">
          <ul
            className="trusted-brands-track flex items-center gap-8 md:flex-wrap md:justify-center md:gap-x-10 md:gap-y-4"
            aria-hidden={false}
          >
            {looped.map((b, i) => (
              <li
                key={`${b.id}-${i}`}
                className="shrink-0 md:shrink"
                title={b.company_name}
              >
                <div className="relative h-7 w-[88px] grayscale opacity-70 transition duration-300 hover:grayscale-0 hover:opacity-100 md:h-9 md:w-[112px]">
                  <Image
                    src={b.logo_url}
                    alt={b.company_name}
                    fill
                    sizes="112px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Marquee animation (mobile only). 30s cycle = slow enough that a
          quick glance reads ~3 logos without tracking. */}
      <style jsx>{`
        .trusted-brands-track {
          animation: trusted-brands-scroll 30s linear infinite;
          will-change: transform;
        }
        @media (min-width: 768px) {
          .trusted-brands-track {
            animation: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .trusted-brands-track {
            animation: none;
          }
        }
        @keyframes trusted-brands-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  )
}

export default TrustedBrandsRow
