/** Extract YouTube video id from watch URL, short URL, or embed URL. */
export function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  const u = url.trim()
  const short = u.match(/youtu\.be\/([^?&#/]+)/i)
  if (short?.[1]) return short[1]
  const v = u.match(/[?&]v=([^?&#]+)/i)
  if (v?.[1]) return v[1]
  const embed = u.match(/youtube\.com\/embed\/([^?&#]+)/i)
  if (embed?.[1]) return embed[1]
  const shorts = u.match(/youtube\.com\/shorts\/([^?&#]+)/i)
  if (shorts?.[1]) return shorts[1]
  return null
}
