function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || 'https://crowdconscious.app'
}

export function shareToTwitter(marketId: string, title: string) {
  const base = getBaseUrl()
  const text = encodeURIComponent(`${title}\n\nWhat do you think?`)
  const url = encodeURIComponent(`${base}/predictions/markets/${marketId}`)
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank')
}

export function shareToWhatsApp(marketId: string, title: string) {
  const base = getBaseUrl()
  const text = encodeURIComponent(
    `${title} — Make your prediction: ${base}/predictions/markets/${marketId}`
  )
  window.open(`https://wa.me/?text=${text}`, '_blank')
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

export async function downloadCard(marketId: string, format: 'standard' | 'story' = 'standard') {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const url =
    format === 'story'
      ? `${base}/api/og/market/${marketId}?format=story`
      : `${base}/api/og/market/${marketId}`
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

export async function shareNative(marketId: string, title: string, format: 'standard' | 'story' = 'standard') {
  const base = getBaseUrl()
  const marketUrl = `${base}/predictions/markets/${marketId}`
  const url = format === 'story' ? `/api/og/market/${marketId}?format=story` : `/api/og/market/${marketId}`
  const filename = format === 'story' ? 'crowd-conscious-story.png' : 'prediction.png'
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const file = new File([blob], filename, { type: 'image/png' })

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title,
        text: `${title} — What do you think?`,
        url: marketUrl,
        files: [file],
      })
    } else {
      await navigator.share({
        title,
        text: `${title} — What do you think?`,
        url: marketUrl,
      })
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      console.error('Share failed:', err)
    }
  }
}
