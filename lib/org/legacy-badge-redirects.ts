/**
 * PR #60 published the paid org seal as "Empresa Consciente" / "Esfuerzo
 * Consciente" badge files; PR #63 renamed both to "Sello verificado", which
 * broke embeds of the old URLs. Keep the old URLs alive as redirects.
 */
const LEGACY = ['sello-empresa-consciente', 'sello-esfuerzo-consciente'] as const
const SIZES = ['', '-512', '-1024'] as const

export const LEGACY_BADGE_REDIRECTS: Array<{ source: string; destination: string; permanent: boolean }> = LEGACY.flatMap((old) =>
  SIZES.map((size) => ({
    source: `/sello/${old}${size}.${size ? 'png' : 'svg'}`,
    destination: `/sello/sello-verificado${size}.${size ? 'png' : 'svg'}`,
    permanent: true,
  })),
)
