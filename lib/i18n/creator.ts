export type CreatorLocale = 'es' | 'en'

/**
 * Bilingual copy for the Creator Platform (Prompts 1, 4, 8).
 *
 * ES is the primary language; EN is the secondary fallback. Follows the same
 * `getXCopy(locale)` pattern as lib/i18n/pulse-listing.ts.
 *
 * NOTE: the brief referenced verbatim landing copy in
 * `docs/context-for-creator-market-additions.md`, which is NOT present in the
 * repo. The landing copy below was authored to match the section structure and
 * intent described in the brief (instant account + drafting, quick editorial
 * review on the first post, then auto-publish). Replace with the verbatim copy
 * if/when that document lands.
 */
export function getCreatorCopy(locale: CreatorLocale) {
  const es = locale === 'es'
  return {
    // --- Landing (/creators, /escribe) -------------------------------------
    metaTitle: es
      ? 'Escribe en Crowd Conscious — Plataforma para creadores'
      : 'Write on Crowd Conscious — Creator Platform',
    metaDescription: es
      ? 'Publica artículos sobre lo que le importa a tu comunidad, gana con patrocinios transparentes y aporta al Fondo Consciente. Cuenta instantánea, primer artículo con revisión editorial rápida, luego auto-publicación.'
      : 'Publish articles about what matters to your community, earn from transparent sponsorships, and contribute to the Conscious Fund. Instant account, first post with a quick editorial review, then auto-publish.',

    // 1) Hero
    heroEyebrow: es ? 'Plataforma para creadores' : 'Creator platform',
    heroTitle: es
      ? 'Escribe sobre lo que de verdad le importa a tu comunidad'
      : 'Write about what truly matters to your community',
    heroSubtitle: es
      ? 'Crowd Conscious te da una casa editorial con datos en vivo, patrocinios transparentes y un reparto justo de ingresos. Tú escribes; nosotros nos encargamos de la infraestructura, el pago y la transparencia.'
      : 'Crowd Conscious gives you an editorial home with live data, transparent sponsorships, and a fair revenue split. You write; we handle the infrastructure, the payouts, and the transparency.',
    heroCta: es ? 'Crear cuenta de creador' : 'Create creator account',
    heroSecondaryCta: es ? 'Ver cómo funciona' : 'See how it works',
    heroExpectations: es
      ? 'Cuenta y borradores al instante. Tu primer artículo pasa por una revisión editorial rápida; después publicas en automático.'
      : 'Instant account and drafts. Your first article gets a quick editorial review; after that you auto-publish.',

    // 2) Cómo funciona
    howTitle: es ? 'Cómo funciona' : 'How it works',
    howSteps: es
      ? [
          {
            title: 'Crea tu cuenta',
            body: 'Regístrate como creador en segundos. Eliges tu handle público y empiezas a escribir borradores de inmediato.',
          },
          {
            title: 'Escribe y cita',
            body: 'Editor en markdown, soporte bilingüe (ES/EN) y un bloque de fuentes para respaldar cada afirmación con enlaces verificables.',
          },
          {
            title: 'Revisión rápida, luego auto-publicación',
            body: 'Tu primer artículo pasa por una revisión editorial breve. Una vez aprobado, ganas confianza y publicas en automático.',
          },
          {
            title: 'Gana con transparencia',
            body: 'Genera enlaces de patrocinio para tus artículos. Las marcas patrocinan, tú ganas, y el 20% siempre va al Fondo Consciente.',
          },
        ]
      : [
          {
            title: 'Create your account',
            body: 'Sign up as a creator in seconds. Pick your public handle and start drafting right away.',
          },
          {
            title: 'Write and cite',
            body: 'Markdown editor, bilingual support (ES/EN), and a sources block to back every claim with verifiable links.',
          },
          {
            title: 'Quick review, then auto-publish',
            body: 'Your first article gets a short editorial review. Once approved, you earn trust and publish automatically.',
          },
          {
            title: 'Earn transparently',
            body: 'Generate sponsorship links for your articles. Brands sponsor, you earn, and 20% always goes to the Conscious Fund.',
          },
        ],

    // 3) El reparto (split cards)
    splitTitle: es ? 'El reparto' : 'The split',
    splitSubtitle: es
      ? 'El Fondo Consciente recibe siempre el 20% del bruto. El resto depende de quién trajo al patrocinador.'
      : 'The Conscious Fund always receives 20% of gross. The rest depends on who brought the sponsor.',
    splitCreatorSourced: {
      label: es ? 'Patrocinio que tú traes' : 'Sponsor you bring',
      tagline: es
        ? 'Tú conseguiste al patrocinador para tu artículo.'
        : 'You brought the sponsor to your article.',
      rows: [
        { label: es ? 'Creador' : 'Creator', pct: 60 },
        { label: es ? 'Fondo Consciente' : 'Conscious Fund', pct: 20 },
        { label: es ? 'Plataforma' : 'Platform', pct: 20 },
      ],
    },
    splitPlatformSourced: {
      label: es ? 'Patrocinio de la plataforma' : 'Platform-sourced sponsor',
      tagline: es
        ? 'Crowd Conscious consiguió al patrocinador.'
        : 'Crowd Conscious brought the sponsor.',
      rows: [
        { label: es ? 'Plataforma' : 'Platform', pct: 60 },
        { label: es ? 'Creador' : 'Creator', pct: 20 },
        { label: es ? 'Fondo Consciente' : 'Conscious Fund', pct: 20 },
      ],
    },

    // 4) Por qué Crowd Conscious
    whyTitle: es ? 'Por qué Crowd Conscious' : 'Why Crowd Conscious',
    whyPoints: es
      ? [
          {
            title: 'Datos en vivo, no opiniones vacías',
            body: 'Incrusta consultas Pulse y resultados reales de la comunidad dentro de tus artículos.',
          },
          {
            title: 'Patrocinios honestos',
            body: 'Tarjetas de patrocinio acotadas y siempre etiquetadas como “Patrocinado”. Sin formatos engañosos.',
          },
          {
            title: 'Impacto real',
            body: 'El 20% de cada patrocinio financia causas ambientales a través del Fondo Consciente.',
          },
          {
            title: 'Reparto justo y claro',
            body: 'Ves exactamente cuánto ganas por periodo y el estado de cada pago.',
          },
        ]
      : [
          {
            title: 'Live data, not empty takes',
            body: 'Embed Pulse consultations and real community results inside your articles.',
          },
          {
            title: 'Honest sponsorships',
            body: 'Constrained sponsor cards always labelled “Patrocinado.” No deceptive formats.',
          },
          {
            title: 'Real impact',
            body: '20% of every sponsorship funds environmental causes through the Conscious Fund.',
          },
          {
            title: 'Fair, clear split',
            body: 'See exactly how much you earn per period and the status of every payout.',
          },
        ],

    // 5) Qué buscamos
    lookingTitle: es ? 'Qué buscamos' : 'What we look for',
    lookingPoints: es
      ? [
          'Voces que escriben con rigor y citan sus fuentes.',
          'Temas con impacto local: medio ambiente, ciudades, consumo consciente.',
          'Honestidad por encima del clickbait.',
          'Ganas de construir comunidad, no sólo audiencia.',
        ]
      : [
          'Voices that write with rigor and cite their sources.',
          'Topics with local impact: environment, cities, conscious consumption.',
          'Honesty over clickbait.',
          'A drive to build community, not just an audience.',
        ],

    // 6) Proof strip
    proofTitle: es ? 'Ya está pasando' : "It's already happening",
    proofSubtitle: es
      ? 'Comunidades reales votando con confianza real.'
      : 'Real communities voting with real confidence.',
    proofReadsLabel: es ? 'lecturas en el blog' : 'blog reads',

    // 7) Signup CTA
    finalCtaTitle: es ? '¿List@ para escribir?' : 'Ready to write?',
    finalCtaSubtitle: es
      ? 'Crea tu cuenta de creador y publica tu primer borrador hoy mismo.'
      : 'Create your creator account and publish your first draft today.',
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
