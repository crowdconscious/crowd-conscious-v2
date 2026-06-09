export type CreatorLocale = 'es' | 'en'

/**
 * Bilingual copy for the Creator Platform (Prompts 1, 4, 8).
 *
 * ES is the primary language; EN is the secondary fallback. Follows the same
 * `getXCopy(locale)` pattern as lib/i18n/pulse-listing.ts.
 *
 * The /creators landing strings (hero → closing CTA) are the APPROVED VERBATIM
 * copy from the "CREATOR LANDING PAGE COPY (ES primary / EN secondary)" section
 * of the shared brief. Map onto the existing 7 sections; do not paraphrase.
 */
export function getCreatorCopy(locale: CreatorLocale) {
  const es = locale === 'es'
  return {
    // --- Landing (/creators, /escribe) -------------------------------------
    // APPROVED VERBATIM COPY — see brief "CREATOR LANDING PAGE COPY". Do not
    // paraphrase. metaTitle/metaDescription derive from the verbatim Hero.
    metaTitle: es
      ? 'Escribe con propósito. Monetiza con impacto. | Crowd Conscious'
      : 'Write with purpose. Monetize with impact. | Crowd Conscious',
    metaDescription: es
      ? 'Crowd Conscious abre su Blog a creadores. Publica análisis sobre lo que de verdad importa, gana con patrocinios en tus publicaciones, y destina impacto real a causas comunitarias — en cada post.'
      : 'Crowd Conscious is opening its Blog to creators. Publish analysis on what actually matters, earn from sponsorships on your posts, and send real impact to community causes — with every post.',

    // 1) Hero
    heroEyebrow: es ? 'Para creadores' : 'For creators',
    heroTitle: es
      ? 'Escribe con propósito. Monetiza con impacto.'
      : 'Write with purpose. Monetize with impact.',
    heroSubtitle: es
      ? 'Crowd Conscious abre su Blog a creadores. Publica análisis sobre lo que de verdad importa, gana con patrocinios en tus publicaciones, y destina impacto real a causas comunitarias — en cada post.'
      : 'Crowd Conscious is opening its Blog to creators. Publish analysis on what actually matters, earn from sponsorships on your posts, and send real impact to community causes — with every post.',
    heroCta: es ? 'Crear cuenta de creador' : 'Create creator account',
    heroSecondaryCta: es ? 'Ver cómo funciona' : 'See how it works',
    heroExpectations: es
      ? 'Acceso de creador al instante. Tu primera publicación pasa por una revisión editorial rápida; después publicas tú.'
      : 'Instant creator access. Your first post gets a quick editorial review; after that you publish yourself.',

    // 2) Cómo funciona
    howTitle: es ? 'Cómo funciona' : 'How it works',
    howSteps: es
      ? [
          {
            title: 'Crea tu cuenta y escribe.',
            body: 'Acceso de creador al instante. Publicas análisis con fuentes, en español e inglés. Tu primera publicación pasa por una revisión editorial rápida; después publicas tú.',
          },
          {
            title: 'Trae tu marca — o deja que la traigamos.',
            body: 'Comparte tu enlace de patrocinio (lleva tu ID) y quien patrocina por ahí cuenta como tuyo. Si la marca llega sola, la trajo la plataforma.',
          },
          {
            title: 'Ganas, con impacto incluido.',
            body: 'El 20% de cada peso va directo al Fondo Consciente, automáticamente.',
          },
        ]
      : [
          {
            title: 'Create your account and write.',
            body: 'Instant creator access. Publish sourced analysis in Spanish and English. Your first post gets a quick editorial review; after that you publish yourself.',
          },
          {
            title: 'Bring your brand — or let us.',
            body: 'Share your sponsorship link (it carries your ID); anyone who sponsors through it counts as yours. If the brand arrives on its own, the platform brought it.',
          },
          {
            title: 'You earn, with impact built in.',
            body: '20% of every peso goes straight to the Conscious Fund, automatically.',
          },
        ],

    // 3) El reparto (split cards)
    splitTitle: es ? 'El reparto' : 'The split',
    splitSubtitle: es
      ? 'Transparente, siempre. El Fondo recibe 20% del bruto en cada patrocinio. El resto depende de quién cierra el trato:'
      : 'Transparent, always. The Fund takes 20% of gross on every sponsorship. The rest depends on who closes the deal:',
    splitCreatorSourced: {
      label: es
        ? 'Tú traes la marca (tu enlace) → te quedas con el 60%.'
        : 'You bring the brand (your link) → you keep 60%.',
      tagline: es ? 'El 80% sale de nuestro bolsillo.' : '80% leaves our pocket.',
      rows: [
        { label: es ? 'Creador' : 'Creator', pct: 60 },
        { label: es ? 'Fondo' : 'Fund', pct: 20 },
        { label: es ? 'Plataforma' : 'Platform', pct: 20 },
      ],
    },
    splitPlatformSourced: {
      label: es
        ? 'La marca llega sola → recibes el 20%.'
        : 'The brand arrives on its own → you get 20%.',
      tagline: es ? 'Ingreso pasivo: nosotros vendemos.' : 'Passive income: we sell.',
      rows: [
        { label: es ? 'Creador' : 'Creator', pct: 20 },
        { label: es ? 'Fondo' : 'Fund', pct: 20 },
        { label: es ? 'Plataforma' : 'Platform', pct: 60 },
      ],
    },

    // 4) Por qué Crowd Conscious
    whyTitle: es ? 'Por qué Crowd Conscious' : 'Why Crowd Conscious',
    whyPoints: es
      ? [
          {
            title: 'Audiencia cívica, no scroll vacío.',
            body: 'Lectores que vienen a pensar.',
          },
          {
            title: 'Distribución hecha.',
            body: 'Tu pieza vive junto a Pulses, Señales y una app móvil.',
          },
          {
            title: 'Credibilidad real.',
            body: 'Primera plataforma de inteligencia colectiva con certificación Hecho en México.',
          },
          {
            title: 'Impacto que se ve.',
            body: 'Cada patrocinio financia causas votadas por la comunidad.',
          },
        ]
      : [
          {
            title: 'A civic audience, not empty scroll.',
            body: 'Readers who come to think.',
          },
          {
            title: 'Distribution, done.',
            body: 'Your piece lives next to Pulses, Signals, and a mobile app.',
          },
          {
            title: 'Real credibility.',
            body: 'The first collective-intelligence platform with the Hecho en México certification.',
          },
          {
            title: 'Visible impact.',
            body: 'Every sponsorship funds community-voted causes.',
          },
        ],

    // 5) Qué buscamos
    lookingTitle: es ? 'Qué buscamos' : 'What we look for',
    lookingPoints: es
      ? [
          'Análisis original con fuentes citadas',
          'Español e inglés (ambos se publican juntos)',
          'Apolítico y seguro para marcas',
          'Revisión editorial en tus primeras piezas',
          'Calidad sobre volumen.',
        ]
      : [
          'Original analysis with cited sources',
          'Spanish and English (both ship together)',
          'Apolitical and brand-safe',
          'Editorial review on your first pieces',
          'Quality over volume.',
        ],

    // 6) Proof strip
    proofTitle: es ? 'Ya está pasando' : "It's already happening",
    proofSubtitle: es
      ? 'Comunidades reales votando con confianza real.'
      : 'Real communities voting with real confidence.',
    proofReadsLabel: es ? 'lecturas en el blog' : 'blog reads',

    // 7) Cierre / Closing CTA
    finalCtaTitle: es
      ? '¿Listo para escribir con propósito?'
      : 'Ready to write with purpose?',
    finalCtaSubtitle: es ? 'Empieza a escribir hoy.' : 'Start writing today.',
    finalCta: es ? 'Crear cuenta de creador' : 'Create creator account',

    // --- Roles / byline -----------------------------------------------------
    roleCreator: es ? 'Creador' : 'Creator',
    roleEditorial: 'Editorial',
    bylineBy: es ? 'Por' : 'By',
    sourcesTitle: es ? 'Fuentes' : 'Sources',

    // --- Sponsor card -------------------------------------------------------
    sponsoredLabel: 'Patrocinado',
    sponsorVisit: es ? 'Visitar' : 'Visit',
    sponsorThisPost: es ? 'Patrocina esta publicación' : 'Sponsor this post',

    // --- Signup -------------------------------------------------------------
    signupTitle: es ? 'Crea tu cuenta de creador' : 'Create your creator account',
    signupSubtitle: es
      ? 'Cuenta y borradores al instante. Tu primer artículo lleva una revisión editorial rápida.'
      : 'Instant account and drafts. Your first article gets a quick editorial review.',
    signupName: es ? 'Nombre para mostrar' : 'Display name',
    signupNamePlaceholder: es ? 'Tu nombre' : 'Your name',
    signupHandle: es ? 'Handle público' : 'Public handle',
    signupHandleHint: es
      ? '3–30 caracteres: letras minúsculas, números y guion bajo. Es tu enlace de referido.'
      : '3–30 chars: lowercase letters, numbers, underscore. It powers your referral link.',
    signupEmail: es ? 'Correo electrónico' : 'Email',
    signupPassword: es ? 'Contraseña' : 'Password',
    signupSubmit: es ? 'Crear cuenta de creador' : 'Create creator account',
    signupSubmitting: es ? 'Creando cuenta...' : 'Creating account...',
    signupCheckEmail: es
      ? 'Revisa tu correo para confirmar tu cuenta. Luego entra a tu panel de creador.'
      : 'Check your email to confirm your account. Then open your creator dashboard.',
    signupHasAccount: es ? '¿Ya tienes cuenta?' : 'Already have an account?',
    signupLogin: es ? 'Iniciar sesión' : 'Log in',
    handleTaken: es ? 'Ese handle ya está en uso.' : 'That handle is already taken.',
    handleInvalid: es
      ? 'Handle inválido. Usa 3–30 caracteres: a-z, 0-9, _.'
      : 'Invalid handle. Use 3–30 chars: a-z, 0-9, _.',

    // --- Creator dashboard --------------------------------------------------
    dashTitle: es ? 'Panel de creador' : 'Creator dashboard',
    dashNewPost: es ? 'Nuevo artículo' : 'New article',
    dashYourPosts: es ? 'Tus artículos' : 'Your articles',
    dashNoPosts: es ? 'Aún no tienes artículos. Crea tu primer borrador.' : 'No articles yet. Create your first draft.',
    dashEarnings: es ? 'Ganancias por periodo' : 'Earnings by period',
    dashNoEarnings: es ? 'Aún no hay ganancias registradas.' : 'No earnings recorded yet.',
    dashPeriod: es ? 'Periodo' : 'Period',
    dashEarned: es ? 'Ganado' : 'Earned',
    dashPaid: es ? 'Pagado' : 'Paid',
    dashPayoutStatus: es ? 'Estado de pago' : 'Payout status',
    dashReferredClicks: es ? 'Clics referidos' : 'Referred clicks',
    dashReferredClicksHint: es
      ? 'Clics en tu enlace de descarga. No son instalaciones — Apple no comparte ese dato.'
      : 'Clicks on your download link. Not installs — Apple does not share that data.',
    dashYourHandle: es ? 'Tu handle' : 'Your handle',
    dashClaimHandle: es ? 'Reclamar handle' : 'Claim handle',
    dashSetHandle: es ? 'Guardar handle' : 'Save handle',
    dashHandleNeeded: es
      ? 'Reclama un handle para generar enlaces de patrocinio y de referido.'
      : 'Claim a handle to generate sponsorship and referral links.',
    dashCopyLink: es ? 'Copiar enlace' : 'Copy link',
    dashCopied: es ? '¡Copiado!' : 'Copied!',
    dashSponsorLink: es ? 'Enlace de patrocinio' : 'Sponsorship link',
    dashReferralLink: es ? 'Enlace de referido (app)' : 'Referral link (app)',
    dashEdit: es ? 'Editar' : 'Edit',
    dashView: es ? 'Ver' : 'View',

    // Payout statuses
    payoutPending: es ? 'Pendiente' : 'Pending',
    payoutHeld: es ? 'Retenido' : 'Held',
    payoutReleased: es ? 'Liberado' : 'Released',
    payoutPaid: es ? 'Pagado' : 'Paid',

    // Post statuses
    statusDraft: es ? 'Borrador' : 'Draft',
    statusPendingReview: es ? 'En revisión' : 'In review',
    statusPublished: es ? 'Publicado' : 'Published',
    statusArchived: es ? 'Archivado' : 'Archived',

    // --- Editor -------------------------------------------------------------
    editorNewTitle: es ? 'Nuevo artículo' : 'New article',
    editorEditTitle: es ? 'Editar artículo' : 'Edit article',
    editorIntro: es
      ? 'Escribe en markdown. Cita tus fuentes. Guarda como borrador, envía a revisión o publica si ya tienes confianza.'
      : 'Write in markdown. Cite your sources. Save as draft, submit for review, or publish if you already have trust.',
    editorTitleEs: es ? 'Título (ES) *' : 'Title (ES) *',
    editorTitleEn: es ? 'Título (EN)' : 'Title (EN)',
    editorSlug: 'Slug',
    editorExcerptEs: es ? 'Extracto (ES) *' : 'Excerpt (ES) *',
    editorExcerptEn: es ? 'Extracto (EN)' : 'Excerpt (EN)',
    editorContentEs: es ? 'Contenido (ES) *' : 'Content (ES) *',
    editorContentEn: es ? 'Contenido (EN)' : 'Content (EN)',
    editorCategory: es ? 'Categoría' : 'Category',
    editorCover: es ? 'Imagen de portada' : 'Cover image',
    editorSources: es ? 'Fuentes' : 'Sources',
    editorSourcesHint: es
      ? 'Respalda tu artículo con enlaces verificables. Se muestran al pie del artículo.'
      : 'Back your article with verifiable links. Shown at the foot of the article.',
    editorSourceLabel: es ? 'Etiqueta' : 'Label',
    editorSourceUrl: 'URL',
    editorAddSource: es ? 'Agregar fuente' : 'Add source',
    editorSaveDraft: es ? 'Guardar borrador' : 'Save draft',
    editorSubmitReview: es ? 'Enviar a revisión' : 'Submit for review',
    editorPublish: es ? 'Publicar' : 'Publish',
    editorSaving: es ? 'Guardando...' : 'Saving...',
    editorRequired: es
      ? 'Título, extracto y contenido (ES) son obligatorios.'
      : 'Title, excerpt, and content (ES) are required.',
    editorPublishLocked: es
      ? 'Tu primer artículo necesita revisión editorial. Envíalo a revisión; podrás auto-publicar cuando ganes confianza.'
      : 'Your first article needs editorial review. Submit it for review; you can auto-publish once you earn trust.',
    editorBack: es ? 'Volver al panel' : 'Back to dashboard',

    // --- Admin review queue -------------------------------------------------
    reviewTitle: es ? 'Revisión de artículos' : 'Article review',
    reviewSubtitle: es
      ? 'Artículos de creadores en espera de aprobación. Aprobar publica y sube la confianza del autor.'
      : 'Creator articles awaiting approval. Approving publishes and raises the author trust level.',
    reviewEmpty: es ? 'No hay artículos en revisión.' : 'No articles in review.',
    reviewApprove: es ? 'Aprobar y publicar' : 'Approve & publish',
    reviewPreview: es ? 'Previsualizar' : 'Preview',
    reviewApproving: es ? 'Aprobando...' : 'Approving...',
    reviewAuthor: es ? 'Autor' : 'Author',
    reviewTrust: es ? 'Confianza' : 'Trust',
    reviewSubmitted: es ? 'Enviado' : 'Submitted',
  }
}

export type CreatorCopy = ReturnType<typeof getCreatorCopy>

const HANDLE_RE = /^[a-z0-9_]{3,30}$/

/** Validate a creator handle against the DB CHECK constraint. */
export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle)
}

/** Normalize a handle candidate to the canonical lowercase form. */
export function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase()
}
