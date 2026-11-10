/** All Cicéron UI strings — formal Mexican Spanish (usted). */
export const copy = {
  brand: 'Cicerón',
  demoLabel: 'Datos de demostración',
  firmDemo: 'Despacho Demo, S.C.',
  roleSocia: 'Socia',
  roleAsociado: 'Asociado',
  rolePasante: 'Pasante',
  roleAdmin: 'Administrador',

  invite: {
    title: 'Cicerón',
    subtitle:
      'Inteligencia jurídica para despachos mexicanos: Diario Oficial, expedientes, investigación con citas verificadas y revisión humana antes de cualquier salida al cliente.',
    codeLabel: 'Código de invitación',
    codePlaceholder: 'Ingrese su código',
    submit: 'Entrar a la demostración',
    error: 'El código no es válido o ha expirado.',
    note: 'Esta es una demostración. Los datos del despacho y de sus clientes son ficticios.',
  },

  rooms: {
    hoy: 'Hoy',
    'monitor-dof': 'Monitor DOF',
    expedientes: 'Expedientes',
    investigacion: 'Investigación',
    revision: 'Revisión',
    clientes: 'Clientes y asuntos',
  },

  topbar: {
    commandHint: 'Buscar',
    commandShortcut: '⌘K',
    matterContext: 'Asunto',
    userMenu: 'Cuenta',
  },

  command: {
    title: 'Ir a…',
    placeholder: 'Sala, cliente, asunto, nota DOF…',
    empty: 'Sin coincidencias.',
    groups: {
      rooms: 'Salas',
      clients: 'Clientes',
      matters: 'Asuntos',
      notes: 'Notas DOF',
    },
  },

  review: {
    borrador: 'borrador',
    en_revision: 'en revisión',
    aprobado: 'aprobado',
    corregido: 'corregido',
    rechazado: 'rechazado',
  },

  empty: {
    title: 'Sin elementos',
    hoyNone:
      'Hoy no hay novedades que afecten a sus clientes. Se revisaron las notas del Diario Oficial disponibles en el corpus de demostración.',
    generic: 'No hay información que mostrar en este momento.',
  },

  hoy: {
    title: 'Hoy',
    lead: 'Lo publicado que afecta a sus clientes, revisiones pendientes y plazos próximos.',
    matches: 'Afectaciones de hoy',
    reviews: 'Revisiones a su cargo',
    deadlines: 'Plazos en los próximos 15 días',
    unopened: 'Pendientes de ayer sin abrir',
  },

  monitor: {
    title: 'Monitor DOF',
    lead: 'Notas del Diario Oficial ordenadas por cliente afectado.',
    filters: 'Filtros',
    onlyMine: 'Solo lo que afecta a mis clientes',
  },

  expedientes: {
    title: 'Expedientes',
    lead: 'Expedientes federales de demostración. Sin acceso automatizado al Poder Judicial.',
    nextDeadline: 'Próximo plazo',
    lastEvent: 'Último acuerdo',
  },

  investigacion: {
    title: 'Investigación',
    lead: 'Respuestas fundadas en el corpus, con citas verificadas.',
    ask: 'Formule su pregunta',
    askPlaceholder: '¿Qué dispone el acuerdo respecto a…?',
    coverage: 'Corpus actual: DOF de demostración (cobertura limitada).',
    stubAnswer:
      'La investigación con citas verificadas se habilita en un paso posterior. Por ahora puede explorar el corpus desde el Monitor DOF.',
  },

  revision: {
    title: 'Revisión',
    lead: 'Borradores que requieren su decisión antes de salir del despacho.',
    due: 'Vence',
    assignee: 'Asignado a',
  },

  clientes: {
    title: 'Clientes y asuntos',
    lead: 'Clientes ficticios del despacho de demostración y sus perfiles de vigilancia.',
    matters: 'Asuntos',
    watch: 'Perfil de vigilancia',
  },

  components: {
    source: 'Fuente',
    openSource: 'Abrir fuente oficial',
    why: 'Por qué le importa',
    action: 'Acción sugerida',
    officialText: 'Texto oficial',
    loading: 'Cargando…',
    error: 'No fue posible cargar esta vista.',
    confirm: 'Confirmar',
    cancel: 'Cancelar',
    close: 'Cerrar',
  },

  table: {
    date: 'Fecha',
    authority: 'Autoridad',
    type: 'Tipo',
    client: 'Cliente',
    status: 'Estado',
    matter: 'Asunto',
    court: 'Tribunal',
    file: 'Expediente',
  },

  adminFuentes: {
    title: 'Fuentes',
    lead:
      'Estado del conector del Diario Oficial (SIDOF): incidentes, ejecuciones y errores.',
    incidents: 'Incidentes',
    runs: 'Ejecuciones recientes',
    noIncidents: 'No hay incidentes registrados.',
    noRuns: 'Aún no hay ejecuciones del conector.',
    resolved: 'resuelto',
    colStarted: 'Inicio (UTC)',
    colDate: 'Fecha objetivo',
    colStatus: 'Estado',
    colDuration: 'Duración',
    colStats: 'Estadísticas',
    colError: 'Error',
  },
} as const

export type CiceronCopy = typeof copy
