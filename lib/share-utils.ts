function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
}

export type ShareChannel =
  | 'whatsapp'
  | 'native_share'
  | 'clipboard'
  | 'twitter'
  | 'facebook'
  | 'story_download'
  | 'other'

export type ShareTarget =
  | { type: 'market'; marketId: string }
  | { type: 'location'; locationId: string }
  | { type: 'other'; otherType: string; otherId: string }

/**
 * Fire-and-forget analytics ping. Never throws, never awaits longer
 * than the network wants — we don't want tracking to block the user's
 * share action. Uses `keepalive` so the request survives page nav.
 */
export function trackShare(
  target: ShareTarget,
  channel: ShareChannel,
  surface?: string
): void {
  if (typeof window === 'undefined') return
  const payload: Record<string, string> = { channel }
  if (surface) payload.surface = surface
  if (target.type === 'market') payload.market_id = target.marketId
  else if (target.type === 'location') payload.location_id = target.locationId
  else {
    payload.other_type = target.otherType
    payload.other_id = target.otherId
  }
  try {
    void fetch('/api/share/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore — analytics must never break a share
  }
}

/** WhatsApp share for a Conscious Location. */
export function shareLocationToWhatsApp(slug: string, name: string, locale: 'es' | 'en' = 'es') {
  const base = getBaseUrl()
  const url = `${base}/locations/${encodeURIComponent(slug)}`
  const text =
    locale === 'es'
      ? `¿Es ${name} un Lugar Consciente? Vota aquí: ${url}`
      : `Is ${name} a Conscious Location? Vote here: ${url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

/** Copy a location link to the clipboard with the Spanish/English CTA line. */
export async function copyLocationLink(
  slug: string,
  name: string,
  locale: 'es' | 'en' = 'es'
): Promise<boolean> {
  const base = getBaseUrl()
  const url = `${base}/locations/${encodeURIComponent(slug)}`
  const text =
    locale === 'es'
      ? `¿Es ${name} un Lugar Consciente? Vota aquí: ${url}`
      : `Is ${name} a Conscious Location? Vote here: ${url}`
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function getShareSuffix(sponsorName?: string | null): string {
  return sponsorName
    ? ` — Sponsored by ${sponsorName} on Crowd Conscious`
    : ' — What do you think?'
}

export function shareToTwitter(marketId: string, title: string, sponsorName?: string | null) {
  const base = getBaseUrl()
  const suffix = getShareSuffix(sponsorName)
  const text = encodeURIComponent(`${title}${sponsorName ? suffix : `\n\nWhat do you think?`}`)
  const url = encodeURIComponent(`${base}/predictions/markets/${marketId}`)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
}

export function shareToWhatsApp(marketId: string, title: string, sponsorName?: string | null) {
  const base = getBaseUrl()
  const url = `${base}/predictions/markets/${marketId}`
  const text = sponsorName
    ? `${title} — Sponsored by ${sponsorName} on Crowd Conscious. Make your prediction: ${url}`
    : `${title} — Make your prediction: ${url}`
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

export function shareToFacebook(marketId: string) {
  const base = getBaseUrl()
  const url = encodeURIComponent(`${base}/predictions/markets/${marketId}`)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank')
}

export function copyMarketLink(marketId: string) {
  const base = getBaseUrl()
  navigator.clipboard.writeText(`${base}/predictions/markets/${marketId}`)
}

export async function downloadCard(marketId: string, format: 'standard' | 'story' = 'standard', locale?: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const langParam = locale && locale !== 'es' ? `&lang=${locale}` : ''
  const url =
    format === 'story'
      ? `${base}/api/og/market/${marketId}?format=story${langParam}`
      : `${base}/api/og/market/${marketId}${locale && locale !== 'es' ? `?lang=${locale}` : ''}`
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `crowd-conscious-${format === 'story' ? 'story' : 'card'}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.error('Download failed:', err)
  }
}

/** Result of Instagram Story share: native sheet vs file download fallback */
export type ShareStoryResult = 'shared' | 'downloaded' | 'cancelled'

/**
 * Instagram Stories flow: Web Share API with image file on supported mobile browsers.
 * Opens native share sheet where user can pick Instagram Stories.
 * Desktop / unsupported: triggers download of the story PNG.
 */
export async function shareStoryImage(
  marketId: string,
  options: { title: string; locale?: string }
): Promise<ShareStoryResult> {
  const base = getBaseUrl()
  const langParam = options.locale && options.locale !== 'es' ? `&lang=${options.locale}` : ''
  const imageUrl = `${base}/api/og/market/${marketId}?format=story${langParam}`

  let blob: Blob
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`OG fetch ${response.status}`)
    blob = await response.blob()
  } catch (e) {
    console.error('[shareStoryImage] fetch failed:', e)
    throw e
  }

  const file = new File([blob], 'crowd-conscious-story.png', { type: 'image/png' })

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles =
      typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: options.title,
        })
        return 'shared'
      } catch (err) {
        const name = (err as Error)?.name
        if (name === 'AbortError') return 'cancelled'
        console.warn('[shareStoryImage] share() failed, falling back to download:', err)
      }
    }
  }

  // Fallback: direct download (desktop or no file share)
  try {
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = 'crowd-conscious-story.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
    return 'downloaded'
  } catch (e) {
    console.error('[shareStoryImage] download fallback failed:', e)
    throw e
  }
}

export async function shareNative(marketId: string, title: string, format: 'standard' | 'story' = 'standard', locale?: string, sponsorName?: string | null) {
  const base = getBaseUrl()
  const marketUrl = `${base}/predictions/markets/${marketId}`
  const langParam = locale && locale !== 'es' ? (format === 'story' ? `&lang=${locale}` : `?lang=${locale}`) : ''
  const url = format === 'story' ? `/api/og/market/${marketId}?format=story${langParam}` : `/api/og/market/${marketId}${langParam}`
  const filename = format === 'story' ? 'crowd-conscious-story.png' : 'prediction.png'
  const shareText = `${title}${getShareSuffix(sponsorName)}`
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const file = new File([blob], filename, { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title,
        text: shareText,
        url: marketUrl,
        files: [file],
      })
    } else {
      await navigator.share({
        title,
        text: shareText,
        url: marketUrl,
      })
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Share failed:', err)
    }
  }
}
