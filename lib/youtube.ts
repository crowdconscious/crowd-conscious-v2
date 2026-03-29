const YT_ID = /^[a-zA-Z0-9_-]{11}$/

/** Extract YouTube video id from watch URL, short URL, live URL, or embed URL. */
export function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const u = url.trim()
  if (YT_ID.test(u)) return u
  const short = u.match(/youtu\.be\/([^?&#/]+)/i)
  if (short?.[1]) return short[1]
  const v = u.match(/[?&]v=([^?&#]+)/i)
  if (v?.[1]) return v[1]
  const live = u.match(/youtube\.com\/live\/([^?&#/]+)/i)
  if (live?.[1]) return live[1]
  const embed = u.match(/youtube\.com\/embed\/([^?&#]+)/i)
  if (embed?.[1]) return embed[1]
  const shorts = u.match(/youtube\.com\/shorts\/([^?&#]+)/i)
  if (shorts?.[1]) return shorts[1]
  return null
}
