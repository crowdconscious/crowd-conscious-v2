/**
 * Typed bilingual strings for the Citizen Signals surfaces.
 *
 * Server components read locale from cookies (see lib/i18n/useLocale.ts) and
 * call getCitizenSignalsCopy(locale). Client components read locale from
 * useLanguage() (contexts/LanguageContext) and call the same function.
 *
 * No next-intl dependency by design — keep the bundle small and avoid the
 * extra build step.
 */

export type CitizenSignalsLocale = 'es' | 'en'

// Canonical category list. The compose wizard renders these as chips; the
// API rejects writes whose `category` is not in this list. Keep in sync
// with the schema CHECK constraint *intent* in
// supabase/migrations/219_citizen_signals_mvp.sql (we intentionally left
// the DB column free-text so we can extend the list without a migration).
export const SIGNAL_CATEGORIES = [
  'environment',
  'mobility_transport',
  'public_space',
  'public_health',
  'safety_security',
  'corruption_ethics',
  'accessibility',
  'animal_welfare',
  'gender_rights',
  'housing',
  'education',
  'water_sanitation',
  'noise_pollution',
  'consumer_protection',
  'culture_sport',
  'other',
] as const

export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number]

export const SIGNAL_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type SignalSeverity = (typeof SIGNAL_SEVERITIES)[number]

export const SIGNAL_POST_TYPES = ['complaint', 'suggestion'] as const
export type SignalPostType = (typeof SIGNAL_POST_TYPES)[number]

export const SIGNAL_TARGET_KINDS = ['municipality', 'institution'] as const
export type SignalTargetKind = (typeof SIGNAL_TARGET_KINDS)[number]

export const SIGNAL_PUBLICATION_STATUSES = [
  'draft',
  'pending_review',
  'needs_edit',
  'published',
  'rejected',
  'archived',
  'disputed',
] as const
export type SignalPublicationStatus = (typeof SIGNAL_PUBLICATION_STATUSES)[number]

export function getCitizenSignalsCopy(locale: CitizenSignalsLocale) {
  const isEs = locale === 'es'
  return {
    nav: {
      brand: isEs ? 'Señales Ciudadanas' : 'Citizen Signals',
      feed: isEs ? 'Señales' : 'Signals',
      newSignal: isEs ? 'Crear señal' : 'Create signal',
      beta: isEs ? 'Beta' : 'Beta',
    },

    meta: {
      title: isEs
        ? 'Señales Ciudadanas | Crowd Conscious'
        : 'Citizen Signals | Crowd Conscious',
      description: isEs
        ? 'Reporta lo que debe cambiar en tu ciudad. Señales ciudadanas moderadas, con co-firmas y respuestas oficiales.'
        : 'Signal what needs to change in your city. Moderated citizen reports with co-signs and official replies.',
    },

    feed: {
      heroTitle: isEs
        ? 'Alza la voz sobre lo que debe cambiar.'
        : 'Signal what needs to change — safely and collectively.',
      heroSubtitle: isEs
        ? 'Tu reporte llega a la autoridad correcta. Si suficientes vecinos co-firman, sale a la luz pública.'
        : 'Your report reaches the right authority. If enough neighbours co-sign, it goes public.',
      ctaPrimary: isEs ? 'Crear una señal' : 'Create a signal',
      ctaSecondary: isEs ? 'Ver señales activas' : 'Browse active signals',
      filters: {
        all: isEs ? 'Todas' : 'All',
        category: isEs ? 'Categoría' : 'Category',
        severity: isEs ? 'Urgencia' : 'Severity',
        target: isEs ? 'Destinatario' : 'Target',
        stage: isEs ? 'Etapa' : 'Stage',
        sort: isEs ? 'Orden' : 'Sort',
        sortRecent: isEs ? 'Más recientes' : 'Most recent',
        sortCosigns: isEs ? 'Más co-firmadas' : 'Most co-signed',
        clear: isEs ? 'Limpiar filtros' : 'Clear filters',
        allCategories: isEs ? 'Todas las categorías' : 'All categories',
        allSeverities: isEs ? 'Cualquier urgencia' : 'Any severity',
        allTargets: isEs ? 'Cualquier destinatario' : 'Any target',
      },
      empty: {
        title: isEs
          ? 'Aún no hay señales en esta zona.'
          : 'No signals in this area yet.',
        subtitle: isEs
          ? 'Sé la primera persona en reportar algo que debe cambiar.'
          : 'Be the first to report something worth changing.',
        cta: isEs ? 'Crear la primera señal' : 'Create the first signal',
      },
      card: {
        cosignProgress: (n: number, threshold: number) =>
          isEs
            ? `${n} de ${threshold} co-firmas hacia el umbral`
            : `${n} of ${threshold} co-signs toward threshold`,
        publishedAgo: (rel: string) =>
          isEs ? `Publicada ${rel}` : `Published ${rel}`,
        viewSignal: isEs ? 'Ver señal' : 'View signal',
      },
      loadMore: isEs ? 'Cargar más' : 'Load more',
      loading: isEs ? 'Cargando…' : 'Loading…',
      loadMoreError: isEs
        ? 'No se pudieron cargar más señales.'
        : 'Could not load more signals.',
      betaBanner: isEs
        ? 'Esta superficie está en beta. La moderación es manual y los tiempos de respuesta pueden variar.'
        : 'This surface is in beta. Moderation is manual and response times may vary.',
    },

    compose: {
      title: isEs ? 'Crear una señal' : 'Create a signal',
      requireAuth: isEs
        ? 'Inicia sesión para crear una señal. Tu identidad solo es visible para el equipo de moderación.'
        : 'Sign in to create a signal. Your identity is only visible to the moderation team.',
      steps: {
        type: isEs ? 'Tipo' : 'Type',
        target: isEs ? 'Destinatario' : 'Target',
        location: isEs ? 'Lugar' : 'Location',
        narrative: isEs ? 'Relato' : 'Narrative',
        evidence: isEs ? 'Evidencia' : 'Evidence',
        review: isEs ? 'Revisar y enviar' : 'Review & submit',
      },
      wizard: {
        stepLabel: (n: number, total: number) =>
          isEs ? `Paso ${n} de ${total}` : `Step ${n} of ${total}`,
        next: isEs ? 'Siguiente' : 'Next',
        back: isEs ? 'Atrás' : 'Back',
        previewHeading: isEs ? 'Vista previa' : 'Preview',
        editStep: isEs ? 'Editar' : 'Edit',
        draftRestored: isEs
          ? 'Restauramos tu borrador anterior.'
          : 'We restored your previous draft.',
        clearDraft: isEs ? 'Borrar borrador' : 'Clear draft',
        uploadCta: isEs ? 'Subir archivo' : 'Upload file',
        uploadingCta: isEs ? 'Subiendo…' : 'Uploading…',
        dropHere: isEs
          ? 'Arrastra archivos aquí o haz clic para seleccionar'
          : 'Drag files here or click to select',
        addLink: isEs ? 'Adjuntar enlace' : 'Attach a link',
        addLinkCta: isEs ? 'Agregar' : 'Add',
        removeItem: isEs ? 'Quitar' : 'Remove',
        captionPlaceholder: isEs
          ? 'Descripción opcional (qué muestra esta evidencia)'
          : 'Optional caption (what this evidence shows)',
        searchPlaceholder: isEs ? 'Buscar…' : 'Search…',
        noResults: isEs ? 'Sin resultados.' : 'No results.',
        anonymousToggle: isEs
          ? 'Publicar bajo un alias'
          : 'Publish under an alias',
        anonymousHelp: isEs
          ? 'Tu identidad real sigue siendo visible para moderación.'
          : 'Your real identity is still visible to moderation.',
        aliasPlaceholder: isEs ? 'Vecino de la Roma' : 'Neighbour from Roma',
        languageLabel: isEs ? 'Idioma del relato' : 'Narrative language',
        evidenceCount: (n: number, max: number) =>
          isEs ? `${n} de ${max} archivos` : `${n} of ${max} files`,
      },
      validation: {
        titleTooShort: isEs
          ? 'El título debe tener al menos 10 caracteres.'
          : 'Title must be at least 10 characters.',
        titleTooLong: isEs
          ? 'El título no puede pasar de 120 caracteres.'
          : 'Title can be at most 120 characters.',
        bodyTooShort: isEs
          ? 'La descripción debe tener al menos 50 caracteres.'
          : 'Description must be at least 50 characters.',
        bodyTooLong: isEs
          ? 'La descripción no puede pasar de 4000 caracteres.'
          : 'Description can be at most 4000 characters.',
        targetRequired: isEs
          ? 'Selecciona un destinatario para continuar.'
          : 'Select a target to continue.',
        locationRequired: isEs
          ? 'Selecciona una ubicación para continuar.'
          : 'Select a location to continue.',
        aliasRequired: isEs
          ? 'Escribe el alias público que prefieres.'
          : 'Write the public alias you prefer.',
        aliasTooShort: isEs
          ? 'El alias debe tener al menos 2 caracteres.'
          : 'Alias must be at least 2 characters.',
        aliasTooLong: isEs
          ? 'El alias no puede pasar de 60 caracteres.'
          : 'Alias can be at most 60 characters.',
        attestationRequired: isEs
          ? 'Debes aceptar el aviso legal antes de enviar.'
          : 'You must accept the legal notice before submitting.',
        fileTooLarge: isEs
          ? 'Cada archivo debe pesar 10MB o menos.'
          : 'Each file must be 10MB or smaller.',
        fileWrongType: isEs
          ? 'Solo aceptamos imágenes (JPG, PNG, WEBP, GIF) o PDF.'
          : 'We only accept images (JPG, PNG, WEBP, GIF) or PDF.',
        evidenceMax: (n: number) =>
          isEs
            ? `Máximo ${n} archivos por señal.`
            : `Maximum ${n} files per signal.`,
        invalidUrl: isEs
          ? 'Pega una URL válida (https://…).'
          : 'Paste a valid URL (https://…).',
        submitFailed: isEs
          ? 'No pudimos enviar la señal. Intenta de nuevo.'
          : 'We could not submit the signal. Try again.',
      },
      legalDisclaimerLong: isEs
        ? 'Al enviar esta señal afirmas que la información es verdadera al mejor de tu conocimiento, que no incluye datos personales de terceros (nombres, direcciones, teléfonos) ni afirmaciones difamatorias. Crowd Conscious puede moderar, editar o rechazar el contenido antes de publicarlo. Una señal no sustituye una denuncia formal ante autoridad competente.'
        : 'By submitting this signal you confirm the information is true to the best of your knowledge, contains no third-party personal data (names, addresses, phone numbers) and no defamatory claims. Crowd Conscious may moderate, edit or reject the content before publishing. A signal is not a substitute for a formal complaint before the competent authority.',
      typeChoices: {
        complaint: {
          label: isEs ? 'Denuncia' : 'Complaint',
          help: isEs
            ? 'Algo no está funcionando o representa un problema.'
            : 'Something is broken or a problem.',
        },
        suggestion: {
          label: isEs ? 'Propuesta' : 'Suggestion',
          help: isEs
            ? 'Una idea para mejorar tu colonia o servicios.'
            : 'An idea to improve your area or services.',
        },
      },
      targetIntro: isEs
        ? 'Elige a quién va dirigida la señal. Recibirán una notificación si suficientes vecinos co-firman.'
        : 'Pick who this signal is for. They are notified once enough neighbours co-sign.',
      locationIntro: isEs
        ? 'Selecciona la ubicación en CDMX donde aplica la señal.'
        : 'Pick the CDMX location where this applies.',
      narrative: {
        titleLabel: isEs ? 'Título corto' : 'Short title',
        titlePlaceholder: isEs
          ? 'Ej. Bache sin reparar en Av. Ejército Nacional'
          : 'E.g. Unfixed pothole on Av. Ejército Nacional',
        bodyLabel: isEs ? 'Descripción' : 'Description',
        bodyPlaceholder: isEs
          ? 'Describe qué pasa, desde cuándo y a quién afecta. Sé concreto y verificable.'
          : 'Describe what is happening, since when, and who it affects. Stay specific and verifiable.',
        severityLabel: isEs ? 'Urgencia' : 'Severity',
        languageLabel: isEs ? 'Idioma del relato' : 'Narrative language',
        anonymousLabel: isEs
          ? 'Publicar bajo un alias (tu identidad real sigue siendo visible para moderación)'
          : 'Publish under an alias (your real identity is still visible to moderation)',
        aliasLabel: isEs ? 'Alias público' : 'Public alias',
      },
      evidence: {
        intro: isEs
          ? 'Adjunta hasta 5 fotos, PDFs o enlaces que respalden tu señal. Para denuncias graves la evidencia es obligatoria.'
          : 'Attach up to 5 photos, PDFs or links that back up your signal. Serious complaints require evidence.',
        helpImage: isEs
          ? 'JPEG, PNG, WEBP, GIF — máximo 10MB.'
          : 'JPEG, PNG, WEBP, GIF — 10MB max.',
        helpPdf: isEs ? 'PDF — máximo 10MB.' : 'PDF — 10MB max.',
        helpLink: isEs
          ? 'Pega un enlace público a una nota o documento.'
          : 'Paste a public link to a story or document.',
      },
      review: {
        legalChecklistTitle: isEs ? 'Antes de enviar' : 'Before you submit',
        attestation: isEs
          ? 'Afirmo que la información que envío es verdadera al mejor de mi conocimiento.'
          : 'I confirm the information I am submitting is true to the best of my knowledge.',
        legalDisclaimer: isEs
          ? 'Crowd Conscious modera cada señal antes de publicarla. No ofrecemos asesoría legal. No publiques afirmaciones falsas sobre hechos.'
          : 'Crowd Conscious moderates every signal before publishing. We do not offer legal advice. Do not publish false factual claims.',
        termsLink: isEs ? 'Términos y condiciones' : 'Terms & conditions',
        submit: isEs ? 'Enviar para revisión' : 'Submit for review',
        submitting: isEs ? 'Enviando…' : 'Submitting…',
      },
      success: {
        title: isEs ? 'Recibimos tu señal' : 'We received your signal',
        body: isEs
          ? 'Tu señal está en revisión. Recibirás un correo cuando un moderador la apruebe o pida ajustes.'
          : 'Your signal is under review. You will get an email when a moderator approves it or requests edits.',
        backToFeed: isEs ? 'Ver el feed' : 'Back to feed',
        viewSubmission: isEs ? 'Ver tu envío' : 'View your submission',
        slugCaption: isEs
          ? 'Guarda este enlace; estará público una vez aprobado.'
          : 'Save this link; it goes public once approved.',
        createAnother: isEs ? 'Crear otra señal' : 'Create another signal',
      },
    },

    detail: {
      filedBy: isEs ? 'Firmado por' : 'Filed by',
      anonymous: isEs ? 'Vecino anónimo' : 'Anonymous neighbour',
      filedOn: isEs ? 'Publicado el' : 'Filed on',
      target: isEs ? 'Destinatario' : 'Target',
      category: isEs ? 'Categoría' : 'Category',
      severity: isEs ? 'Urgencia' : 'Severity',
      location: isEs ? 'Lugar' : 'Location',
      cosignsLabel: (n: number) =>
        n === 1
          ? isEs ? '1 co-firma' : '1 co-sign'
          : isEs ? `${n} co-firmas` : `${n} co-signs`,
      shareTitle: isEs ? 'Comparte esta señal' : 'Share this signal',
      evidenceTitle: isEs ? 'Evidencia' : 'Evidence',
      noEvidence: isEs
        ? 'Sin evidencia pública adjunta.'
        : 'No public evidence attached.',
      officialResponses: isEs ? 'Respuesta oficial' : 'Official response',
      noOfficialResponse: isEs
        ? 'El destinatario aún no responde públicamente.'
        : 'The target has not replied publicly yet.',
      commentsTitle: isEs ? 'Comentarios' : 'Comments',
      addCommentPlaceholder: isEs
        ? 'Aporta contexto o detalles…'
        : 'Add context or detail…',
      addCommentSubmit: isEs ? 'Publicar comentario' : 'Post comment',
      notPublished: isEs
        ? 'Esta señal todavía está en revisión.'
        : 'This signal is still under review.',
    },

    cosign: {
      add: isEs ? 'Co-firmar esta señal' : 'Co-sign this signal',
      remove: isEs ? 'Quitar co-firma' : 'Remove co-sign',
      adding: isEs ? 'Co-firmando…' : 'Co-signing…',
      requireAuth: isEs
        ? 'Inicia sesión para co-firmar.'
        : 'Sign in to co-sign.',
      already: isEs ? 'Ya co-firmaste' : 'You already co-signed',
    },

    stages: {
      stage0: {
        label: isEs ? 'Recolectando co-firmas' : 'Collecting co-signs',
        help: (s1: number, s2: number) =>
          isEs
            ? `${s1} co-firmas avisan al destinatario · ${s2} hacen el dossier público`
            : `${s1} co-signs notify the target · ${s2} unlock the public dossier`,
      },
      stage1: {
        label: isEs ? 'Destinatario notificado' : 'Target notified',
        help: isEs
          ? 'Le enviamos un correo privado al destinatario.'
          : 'We emailed the target privately.',
      },
      stage2: {
        label: isEs ? 'Dossier público' : 'Public dossier',
        help: isEs
          ? 'La señal cruzó el umbral público; se exhibe en el dossier.'
          : 'The signal crossed the public threshold; the dossier is live.',
      },
    },

    moderation: {
      pending: isEs ? 'En revisión' : 'Under review',
      needsEdit: isEs ? 'Necesita edición' : 'Needs edit',
      published: isEs ? 'Publicado' : 'Published',
      rejected: isEs ? 'Rechazado' : 'Rejected',
      archived: isEs ? 'Archivado' : 'Archived',
      disputed: isEs ? 'En disputa' : 'Disputed',
      slaBadge: (hours: number) =>
        isEs
          ? `Meta de moderación: ${hours}h`
          : `Moderation target: ${hours}h`,
    },

    targetDash: {
      title: isEs
        ? 'Respuesta oficial · Crowd Conscious'
        : 'Official response · Crowd Conscious',
      heroBody: isEs
        ? 'Recibiste señales ciudadanas. Responder oficialmente fortalece la confianza pública.'
        : 'You have received citizen signals. Replying officially strengthens public trust.',
      roleAttest: isEs
        ? 'Confirmo que represento oficialmente a este destinatario.'
        : 'I confirm I officially represent this target.',
      replyPlaceholder: isEs
        ? 'Escribe la respuesta oficial. Será visible en la página pública de la señal.'
        : 'Write the official reply. It will be visible on the public signal page.',
      statusLabel: isEs ? 'Estado' : 'Status',
      statusOptions: {
        acknowledged: isEs ? 'Recibido' : 'Acknowledged',
        in_progress: isEs ? 'En análisis' : 'In progress',
        resolved: isEs ? 'Resuelto' : 'Resolved',
      },
      submit: isEs ? 'Enviar respuesta' : 'Submit reply',
      invalidToken: isEs
        ? 'Este enlace ya no es válido. Solicita uno nuevo a moderación.'
        : 'This link is no longer valid. Request a new one from moderation.',
      expiredToken: isEs
        ? 'Tu enlace expiró. Pide uno nuevo a moderación.'
        : 'Your link expired. Request a new one from moderation.',
    },

    legal: {
      noLegalAdviceTitle: isEs ? 'Aviso legal' : 'Legal notice',
      noLegalAdviceBody: isEs
        ? 'Crowd Conscious no ofrece asesoría legal. Una señal no sustituye una denuncia formal ante autoridad competente.'
        : 'Crowd Conscious does not offer legal advice. A signal is not a substitute for a formal complaint before the competent authority.',
    },

    // Surfaces that introduce Signals to people who haven't filed one yet:
    //   - The teaser tile we render on the homepage (`landing.*`)
    //   - The standalone `/signals/acerca` product page (`about.*`)
    //
    // Both live under `NEXT_PUBLIC_SIGNALS_ENABLED` so the surfaces vanish
    // cleanly when the flag is off (matches the nav + page-level guards).
    landing: {
      eyebrow: isEs ? 'Nuevo · Beta · CDMX' : 'New · Beta · CDMX',
      title: isEs
        ? 'Reporta lo que debe cambiar. Y haz que llegue.'
        : 'Signal what needs to change. And make sure it lands.',
      subtitle: isEs
        ? 'Una nueva forma de reportar a tu alcaldía o institución. Si suficientes vecinos co-firman, sale a la luz pública y el destinatario recibe un enlace para responder oficialmente.'
        : 'A new way to report to your municipality or institution. If enough neighbours co-sign, it goes public and the recipient gets a magic link to respond officially.',
      bullets: [
        isEs
          ? 'Modera un equipo humano antes de publicar — nada de doxxing ni difamación.'
          : 'A human team moderates before publishing — no doxxing, no defamation.',
        isEs
          ? 'Co-firmas anónimas. Cuando se cruza el umbral, la autoridad recibe la señal.'
          : 'Anonymous co-signs. Once the threshold is crossed, the authority gets the signal.',
        isEs
          ? 'Respuesta oficial pública. Cero buzones perdidos.'
          : 'Public official replies. No more black-hole inboxes.',
      ],
      ctaPrimary: isEs ? 'Ver señales activas' : 'Browse active signals',
      ctaSecondary: isEs ? 'Cómo funciona' : 'How it works',
      pilotNote: isEs
        ? 'Piloto activo en las 16 alcaldías de Ciudad de México.'
        : 'Pilot live across the 16 boroughs of Mexico City.',
    },

    about: {
      heroEyebrow: isEs ? 'Producto · Beta CDMX' : 'Product · CDMX beta',
      heroTitle: isEs
        ? 'Señales Ciudadanas'
        : 'Citizen Signals',
      heroTagline: isEs
        ? 'Reporta. Co-firma. Obtén respuesta oficial.'
        : 'Report. Co-sign. Get an official reply.',
      heroLead: isEs
        ? 'Las quejas que se pierden en formularios oficiales rara vez se resuelven. Señales Ciudadanas es un canal moderado, colectivo y trazable que conecta a vecinos con su alcaldía o institución — y deja constancia pública de la respuesta.'
        : 'Complaints that vanish into official portals rarely get resolved. Citizen Signals is a moderated, collective, traceable channel that connects neighbours with their municipality or institution — and leaves a public record of the reply.',
      heroCtaPrimary: isEs ? 'Crear una señal' : 'Create a signal',
      heroCtaSecondary: isEs ? 'Ver señales activas' : 'Browse signals',
      flowTitle: isEs ? '¿Cómo funciona?' : 'How it works',
      flowSteps: [
        {
          n: 1,
          title: isEs ? 'Tú reportas' : 'You report',
          body: isEs
            ? 'Eliges destinatario, ubicación y categoría. Adjuntas evidencia opcional (fotos, PDFs, enlaces). Puedes publicar bajo un alias — tu identidad real solo la ve el equipo de moderación.'
            : 'Pick a target, a location and a category. Attach optional evidence (photos, PDFs, links). You can publish under an alias — only the moderation team sees your real identity.',
        },
        {
          n: 2,
          title: isEs ? 'Moderamos' : 'We moderate',
          body: isEs
            ? 'Un humano (con apoyo de un agente IA que marca PII, riesgo de difamación y duplicados) revisa cada señal. Si todo está en orden se publica; si necesita ajustes te lo decimos por correo.'
            : 'A human (assisted by an AI agent that flags PII, defamation risk and duplicates) reviews every signal. If everything checks out we publish it; if it needs edits we email you why.',
        },
        {
          n: 3,
          title: isEs ? 'La comunidad co-firma' : 'The community co-signs',
          body: isEs
            ? 'Tus vecinos co-firman lo que les importa. Las co-firmas son anónimas — sumar tu nombre no compromete tu identidad pública.'
            : 'Your neighbours co-sign what matters to them. Co-signs are anonymous — adding your name does not compromise your public identity.',
        },
        {
          n: 4,
          title: isEs ? 'Sube de etapa' : 'It escalates',
          // {stage1} / {stage2} are replaced at render time by the values
          // from NEXT_PUBLIC_SIGNALS_STAGE1 / NEXT_PUBLIC_SIGNALS_STAGE2.
          body: isEs
            ? 'Al cruzar {stage1} co-firmas la señal entra en Etapa 1 y el destinatario recibe un enlace privado para responder oficialmente. Al cruzar {stage2} la señal queda destacada como prioridad pública.'
            : 'At {stage1} co-signs the signal enters Stage 1 and the recipient gets a private link to respond officially. At {stage2} the signal becomes a featured public priority.',
        },
        {
          n: 5,
          title: isEs ? 'Respuesta pública' : 'Public reply',
          body: isEs
            ? 'El destinatario responde desde su enlace mágico. La respuesta queda asociada a la señal — visible a quien la firmó y a cualquiera que la consulte.'
            : 'The recipient replies from their magic link. The reply is attached to the signal — visible to every co-signer and anyone who looks it up.',
        },
      ],
      whoTitle: isEs ? '¿Para quién es?' : 'Who is this for?',
      whoLeft: {
        title: isEs ? 'Personas' : 'Residents',
        body: isEs
          ? 'Vives en CDMX, viste algo que debe cambiar, ya hablaste con tu alcaldía y nadie te contestó. Aquí tu reporte se vuelve un caso colectivo con trazabilidad.'
          : 'You live in Mexico City, you saw something that needs to change, you already talked to your borough and got no reply. Here your report becomes a collective, traceable case.',
      },
      whoRight: {
        title: isEs ? 'Funcionarios públicos' : 'Public officials',
        body: isEs
          ? 'Eres alcaldía o institución y quieres responder con orden a lo que reporta tu comunidad. Te damos un tablero privado y un canal pre-curado.'
          : "You're a borough or institution that wants to respond with clarity to what your community reports. We give you a private dashboard and a pre-curated channel.",
      },
      pillarsTitle: isEs ? 'Lo que sí, lo que no' : 'What it is, what it is not',
      pillarsIs: isEs ? 'Señales Ciudadanas es' : 'Citizen Signals is',
      pillarsIsBullets: [
        isEs
          ? 'Un canal moderado para reportar problemas reales a tu alcaldía o institución.'
          : 'A moderated channel to report real problems to your municipality or institution.',
        isEs
          ? 'Un registro público de respuesta oficial, con trazabilidad.'
          : 'A public record of the official response, with traceability.',
        isEs ? 'Anónimo por diseño para quienes lo necesitan.' : 'Anonymous by design for those who need it.',
      ],
      pillarsIsNot: isEs ? 'Señales Ciudadanas no es' : 'Citizen Signals is not',
      pillarsIsNotBullets: [
        isEs
          ? 'Una vía para denuncias penales — eso es ante MP / FGJCDMX.'
          : 'A channel for criminal complaints — that goes through MP / FGJCDMX.',
        isEs
          ? 'Una plataforma para difamar a personas o negocios.'
          : 'A platform to defame people or businesses.',
        isEs
          ? 'Un sustituto del 911 ni de servicios de emergencia.'
          : 'A substitute for 911 or emergency services.',
      ],
      faqTitle: isEs ? 'Preguntas frecuentes' : 'FAQ',
      faqs: [
        {
          q: isEs ? '¿Es anónimo?' : 'Is it anonymous?',
          a: isEs
            ? 'Sí, puedes publicar bajo un alias. Solo el equipo de moderación ve tu identidad real, y nunca la compartimos con el destinatario.'
            : 'Yes, you can publish under an alias. Only the moderation team sees your real identity, and we never share it with the recipient.',
        },
        {
          q: isEs ? '¿Cuánto tardan en moderar?' : 'How long does moderation take?',
          a: isEs
            ? 'El SLA de moderación durante la beta es 72 horas. La gran mayoría salen mucho más rápido.'
            : 'The moderation SLA during beta is 72 hours. Most signals are reviewed much faster.',
        },
        {
          q: isEs ? '¿Qué pasa si no me responden?' : 'What if no one replies?',
          a: isEs
            ? 'La falta de respuesta también es señal. Tu reporte permanece público y co-firmable; cuando cruza la Etapa 2 entra a la lista pública de prioridades sin respuesta.'
            : 'Silence is also a signal. Your report stays public and co-signable; once it crosses Stage 2 it joins the public list of unanswered priorities.',
        },
        {
          q: isEs ? '¿Por qué solo CDMX?' : 'Why only Mexico City?',
          a: isEs
            ? 'Empezamos donde podemos curar destinatarios reales y dar un SLA serio. Si quieres traerlo a tu ciudad, escríbenos.'
            : 'We start where we can curate real targets and offer a serious SLA. Want it in your city? Write to us.',
        },
      ],
      footerEyebrow: isEs ? '¿Listo?' : 'Ready?',
      footerTitle: isEs
        ? 'Tu vecindario está esperando que alguien diga algo.'
        : 'Your neighbourhood is waiting for someone to speak up.',
      footerCtaPrimary: isEs ? 'Crear una señal' : 'Create a signal',
      footerCtaSecondary: isEs ? 'Ver señales activas' : 'Browse active signals',
      metaTitle: isEs
        ? 'Señales Ciudadanas · Cómo funciona | Crowd Conscious'
        : 'Citizen Signals · How it works | Crowd Conscious',
      metaDescription: isEs
        ? 'Conoce Señales Ciudadanas: un canal moderado y colectivo para reportar a tu alcaldía o institución en Ciudad de México y obtener respuesta oficial.'
        : 'Meet Citizen Signals: a moderated, collective channel to report to your municipality or institution in Mexico City and get an official reply.',
    },

    // Transactional email copy. The body strings are rendered by the React
    // Email templates in lib/emails/signals/*; this block centralises the
    // subject lines + the recurring greeting/button labels so the cron and
    // route callers can keep one source of truth. Moderator-internal emails
    // (digest, agent alerts) are ES-only by founder decision.
    emails: {
      footer: {
        filerDisclosure: isEs
          ? 'Recibes este correo porque presentaste una señal ciudadana.'
          : "You're receiving this because you filed a citizen signal.",
        targetDisclosure: isEs
          ? 'Recibes este correo porque eres el destinatario registrado de una señal ciudadana.'
          : "You're receiving this because you are the registered recipient of a citizen signal.",
        unsubscribe: isEs ? 'Preferencias de correo' : 'Email preferences',
        help: isEs ? 'Ayuda' : 'Help',
      },
      greeting: (name?: string | null) =>
        name
          ? isEs
            ? `Hola ${name},`
            : `Hi ${name},`
          : isEs
            ? 'Hola,'
            : 'Hi there,',
      cta: {
        viewSubmission: isEs ? 'Ver tu envío' : 'View your submission',
        viewSignal: isEs ? 'Ver la señal' : 'View the signal',
        viewAndShare: isEs
          ? 'Ver y compartir la señal'
          : 'View and share the signal',
        openTargetDashboard: isEs
          ? 'Abrir mi panel privado'
          : 'Open my private dashboard',
        reviewDecision: isEs ? 'Revisar la decisión' : 'Review the decision',
        openAndEdit: isEs ? 'Abrir y editar' : 'Open and edit',
        readReply: isEs
          ? 'Leer la respuesta pública'
          : 'Read the public reply',
      },
      filerReceived: {
        subject: (signalTitle: string) =>
          isEs
            ? `Recibimos tu señal: ${signalTitle}`
            : `We received your signal: ${signalTitle}`,
        preview: isEs
          ? 'Tu señal está en revisión.'
          : 'Your signal is under review.',
      },
      filerPublished: {
        subject: (signalTitle: string) =>
          isEs
            ? `Tu señal ya es pública: ${signalTitle}`
            : `Your signal is now public: ${signalTitle}`,
        preview: isEs
          ? 'La aprobamos y ya aparece en el feed.'
          : 'We approved it — it is live in the feed.',
      },
      filerRejected: {
        subject: (signalTitle: string) =>
          isEs
            ? `No pudimos publicar tu señal: ${signalTitle}`
            : `We could not publish your signal: ${signalTitle}`,
        preview: isEs
          ? 'Un moderador rechazó la señal.'
          : 'A moderator rejected the signal.',
      },
      filerNeedsEdit: {
        subject: (signalTitle: string) =>
          isEs
            ? `Tu señal necesita un ajuste: ${signalTitle}`
            : `Your signal needs a quick edit: ${signalTitle}`,
        preview: isEs
          ? 'Un moderador pidió cambios antes de publicarla.'
          : 'A moderator asked for edits before publishing.',
      },
      targetNotifiedStage1: {
        subject: (targetName: string) =>
          isEs
            ? `Crowd Conscious · Señal ciudadana dirigida a ${targetName}`
            : `Crowd Conscious · Citizen signal addressed to ${targetName}`,
        preview: isEs
          ? 'Responde oficialmente desde tu enlace privado.'
          : 'Reply officially from your private link.',
      },
      targetReplied: {
        subject: (signalTitle: string) =>
          isEs
            ? `Recibiste una respuesta oficial sobre tu señal: ${signalTitle}`
            : `Your signal got an official reply: ${signalTitle}`,
        preview: isEs
          ? 'El destinatario respondió oficialmente.'
          : 'The target posted an official reply.',
      },
      moderatorDigest: {
        // ES-only by founder decision; locale toggle is ignored.
        subject: (count: number) =>
          `Crowd Conscious · ${count} señales pendientes de moderación`,
        preview: (count: number) =>
          `${count} señales pendientes en la cola de moderación.`,
      },
    },

    categoryLabel: (cat: SignalCategory): string => {
      const map: Record<SignalCategory, [string, string]> = {
        environment:          ['Medio ambiente', 'Environment'],
        mobility_transport:   ['Movilidad y transporte', 'Mobility & transport'],
        public_space:         ['Espacio público', 'Public space'],
        public_health:        ['Salud pública', 'Public health'],
        safety_security:      ['Seguridad', 'Safety & security'],
        corruption_ethics:    ['Corrupción y ética', 'Corruption & ethics'],
        accessibility:        ['Accesibilidad', 'Accessibility'],
        animal_welfare:       ['Bienestar animal', 'Animal welfare'],
        gender_rights:        ['Derechos de género', 'Gender rights'],
        housing:              ['Vivienda', 'Housing'],
        education:            ['Educación', 'Education'],
        water_sanitation:     ['Agua y saneamiento', 'Water & sanitation'],
        noise_pollution:      ['Contaminación auditiva', 'Noise pollution'],
        consumer_protection:  ['Protección al consumidor', 'Consumer protection'],
        culture_sport:        ['Cultura y deporte', 'Culture & sport'],
        other:                ['Otro', 'Other'],
      }
      return (map[cat] ?? ['Otro', 'Other'])[isEs ? 0 : 1]
    },

    severityLabel: (sev: SignalSeverity): string => {
      const map: Record<SignalSeverity, [string, string]> = {
        low:      ['Baja urgencia', 'Low urgency'],
        medium:   ['Media urgencia', 'Medium urgency'],
        high:     ['Alta urgencia', 'High urgency'],
        critical: ['Crítica', 'Critical'],
      }
      return map[sev][isEs ? 0 : 1]
    },

    postTypeLabel: (pt: SignalPostType): string => {
      const map: Record<SignalPostType, [string, string]> = {
        complaint: ['Denuncia', 'Complaint'],
        suggestion: ['Propuesta', 'Suggestion'],
      }
      return map[pt][isEs ? 0 : 1]
    },

    targetKindLabel: (tk: SignalTargetKind): string => {
      const map: Record<SignalTargetKind, [string, string]> = {
        municipality: ['Alcaldía', 'Municipality'],
        institution: ['Institución', 'Institution'],
      }
      return map[tk][isEs ? 0 : 1]
    },

    statusLabel: (status: SignalPublicationStatus): string => {
      const map: Record<SignalPublicationStatus, [string, string]> = {
        draft:          ['Borrador', 'Draft'],
        pending_review: ['En revisión', 'Under review'],
        needs_edit:     ['Necesita edición', 'Needs edit'],
        published:      ['Publicada', 'Published'],
        rejected:       ['Rechazada', 'Rejected'],
        archived:       ['Archivada', 'Archived'],
        disputed:       ['En disputa', 'Disputed'],
      }
      return map[status][isEs ? 0 : 1]
    },
  }
}

export type CitizenSignalsCopy = ReturnType<typeof getCitizenSignalsCopy>
