/**
 * Cover image with an optional question overlay. When a Pulse is embedded
 * we surface the actual question on top of the hero image so the user
 * gets the “you’re here to vote on X” framing before they read a single
 * paragraph.
 *
 * Server component — no interactivity, just CSS. Falls back gracefully:
 *   - No image: nothing renders.
 *   - No question: plain image (matches old behavior).
 */

type Props = {
  imageUrl: string
  question?: string | null
  locale: 'es' | 'en'
}

export function BlogCoverWithQuestion({ imageUrl, question, locale }: Props) {
  const hasQuestion = !!(question && question.trim())
  const label = locale === 'en' ? 'Question' : 'Pregunta'

  return (
    <div className="relative mt-8 aspect-[2/1] w-full overflow-hidden rounded-xl border border-[#2d3748] bg-[#1a2029]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      {hasQuestion ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/95 md:text-[11px]">
              {label}
            </p>
            <p className="mt-1.5 text-base font-semibold leading-snug text-white drop-shadow-md md:text-xl">
              {question!.trim()}
            </p>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default BlogCoverWithQuestion
