import type { ComponentProps } from 'react'
import type { Components } from 'react-markdown'

/**
 * Custom <img> renderer for blog markdown.
 *
 * Markdown image syntax includes an optional title:
 *
 *   ![alt text](url "Caption goes here")
 *
 * react-markdown surfaces that title via the `title` prop. When present we
 * wrap the image in a <figure> with a <figcaption>, which is the
 * semantically correct way to render an image with a caption. Without a
 * title the image renders as a styled `<img>` — same visual result, no
 * extra DOM.
 *
 * Styling notes:
 *   - `rounded-xl border border-[#2d3748]` matches the cover image frame.
 *   - `bg-[#1a2029]` prevents a flash of white before the image loads.
 *   - `loading="lazy" decoding="async"` keeps the first paint fast on
 *      long-form posts with multiple inline images.
 *   - Captions are intentionally small (text-xs) and centered to mirror
 *      typical editorial conventions.
 */

type ImgProps = ComponentProps<'img'>

function BlogInlineImage({ src, alt, title, ...rest }: ImgProps) {
  if (!src) return null
  const cleanAlt = typeof alt === 'string' ? alt : ''
  const caption = typeof title === 'string' && title.trim() ? title.trim() : null

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={cleanAlt}
      title={caption ?? undefined}
      loading="lazy"
      decoding="async"
      className="my-0 w-full rounded-xl border border-[#2d3748] bg-[#1a2029] object-cover"
      {...rest}
    />
  )

  if (caption) {
    return (
      <figure className="my-8">
        {image}
        <figcaption className="mt-2 text-center text-xs text-slate-400">
          {caption}
        </figcaption>
      </figure>
    )
  }

  return <span className="my-8 block">{image}</span>
}

export const markdownImageComponents: Components = {
  img: BlogInlineImage as unknown as Components['img'],
}
