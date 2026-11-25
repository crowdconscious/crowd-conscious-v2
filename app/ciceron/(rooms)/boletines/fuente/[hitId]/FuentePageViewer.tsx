'use client'

import { useEffect, useRef, useState } from 'react'
import type { HighlightBox } from '@/lib/ciceron/boletines/local-sources'
import { copy } from '@/lib/ciceron/copy/es-MX'

type Props = {
  imagePath: string
  imageAlt: string
  highlight: HighlightBox
  downloadLabel: string
}

/**
 * Page scan with mint highlight; scrolls the match into view on mount.
 * Mobile: pinch-zoom via CSS touch-action + double-tap / tap opens full size.
 */
export function FuentePageViewer(props: Props) {
  const highlightRef = useRef<HTMLDivElement>(null)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    const el = highlightRef.current
    if (!el) return
    const id = window.setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 80)
    return () => window.clearTimeout(id)
  }, [props.imagePath, props.highlight.y])

  return (
    <>
      <div className="cic-fuente-stage">
        <button
          type="button"
          className="cic-fuente-page-btn"
          onClick={() => setLightbox(true)}
          aria-label={copy.boletines.fuenteOpenFull}
        >
          <div className="cic-fuente-page">
            <img
              src={props.imagePath}
              alt={props.imageAlt}
              className="cic-fuente-img"
              draggable={false}
            />
            <div
              ref={highlightRef}
              className="cic-fuente-highlight"
              style={{
                left: `${props.highlight.x * 100}%`,
                top: `${props.highlight.y * 100}%`,
                width: `${props.highlight.w * 100}%`,
                height: `${props.highlight.h * 100}%`,
              }}
              aria-hidden
            />
          </div>
        </button>
        <p className="cic-muted cic-fuente-zoom-hint">{copy.boletines.fuenteZoomHint}</p>
      </div>

      {lightbox ? (
        <div
          className="cic-fuente-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={copy.boletines.fuenteOpenFull}
          onClick={() => setLightbox(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightbox(false)
          }}
        >
          <div
            className="cic-fuente-lightbox-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cic-fuente-page cic-fuente-page-full">
              <img
                src={props.imagePath}
                alt={props.imageAlt}
                className="cic-fuente-img"
              />
              <div
                className="cic-fuente-highlight"
                style={{
                  left: `${props.highlight.x * 100}%`,
                  top: `${props.highlight.y * 100}%`,
                  width: `${props.highlight.w * 100}%`,
                  height: `${props.highlight.h * 100}%`,
                }}
                aria-hidden
              />
            </div>
            <div className="cic-fuente-lightbox-actions">
              <a
                className="cic-btn cic-btn-secondary cic-btn-compact"
                href={props.imagePath}
                download
              >
                {props.downloadLabel}
              </a>
              <button
                type="button"
                className="cic-btn cic-btn-compact"
                onClick={() => setLightbox(false)}
              >
                {copy.boletines.fuenteCloseFull}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
