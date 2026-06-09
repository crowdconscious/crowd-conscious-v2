import { getCreatorCopy, type CreatorLocale } from '@/lib/i18n/creator'

type Props = {
  authorName: string | null
  avatarUrl: string | null
  /** 'creator' when the post has an influencer author; 'editorial' otherwise. */
  role: 'creator' | 'editorial'
  dateLabel: string | null
  locale: CreatorLocale
}

/**
 * Author byline rendered at the TOP of a blog post: avatar, display name, a
 * role badge ("Creador"/"Creator" vs "Editorial") and the date.
 */
export function BlogByline({ authorName, avatarUrl, role, dateLabel, locale }: Props) {
  const t = getCreatorCopy(locale)
  const name = authorName?.trim() || (role === 'creator' ? t.roleCreator : 'Crowd Conscious')
  const roleLabel = role === 'creator' ? t.roleCreator : t.roleEditorial
  const initials = name.slice(0, 1).toUpperCase()

  return (
    <div className="mt-5 flex items-center gap-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="h-10 w-10 rounded-full border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-emerald-500/15 text-sm font-semibold text-emerald-300">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {t.bylineBy} {name}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              role === 'creator'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-slate-500/15 text-slate-300'
            }`}
          >
            {roleLabel}
          </span>
        </div>
        {dateLabel ? <p className="text-xs text-slate-500">{dateLabel}</p> : null}
      </div>
    </div>
  )
}
