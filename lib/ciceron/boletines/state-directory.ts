/**
 * «Boletines por estado» directory — static entry pages for all 32 entities
 * plus federal DOF / SCJN landings. URLs are entry pages only (no date deep links).
 * No DB reads/writes. Verification: VM curl + Mexico-reachable check 2026-11-25.
 */

export type BulletinAccessType =
  | 'abierto'
  | 'requiere_usuario'
  | 'captcha'
  | 'pdf_organo'

export type UrlVerificationStatus =
  | 'ok'
  | 'cloudflare'
  | 'timeout'
  | 'error'
  | 'unverified'

export type StateDirectoryEntry = {
  stateCode: string
  stateName: string
  sourceKey: string
  displayName: string
  landingUrl: string
  accessType: BulletinAccessType
  urlStatus: UrlVerificationStatus
  note?: string
  kind: 'state' | 'federal'
}

export const STATE_DIRECTORY: StateDirectoryEntry[] = [
  {
    stateCode: 'AGS',
    stateName: 'Aguascalientes',
    sourceKey: 'ags_temisoral',
    displayName: 'Lista de Acuerdos Publicados — TemisOral',
    landingUrl: 'https://srvisiop.poderjudicialags.gob.mx/TemisOral/Publicaciones',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'BC',
    stateName: 'Baja California',
    sourceKey: 'bc_boletin_pj',
    displayName: 'Boletín Judicial PJBC',
    landingUrl: 'https://www.pjbc.gob.mx/boletin_judicial.aspx',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'BCS',
    stateName: 'Baja California Sur',
    sourceKey: 'bcs_acceso_libre',
    displayName: 'Tribunal Electrónico — Lista de Acuerdos (Acceso Libre)',
    landingUrl: 'https://e-tribunalbcs.mx/AccesoLibre/LiAcuerdosBusqueda.aspx',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'CAM',
    stateName: 'Campeche',
    sourceKey: 'cam_sigelex',
    displayName: 'SIGELEX — Búsqueda de Lista de Acuerdos',
    landingUrl:
      'https://tribunalvirtual.poderjudicialcampeche.gob.mx/listas-acuerdos-sigelex/',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'CHIS',
    stateName: 'Chiapas',
    sourceKey: 'chis_listas',
    displayName: 'Listas de Publicación de Acuerdos',
    landingUrl: 'https://consultalistas.poderjudicialchiapas.gob.mx/',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'CHIH',
    stateName: 'Chihuahua',
    sourceKey: 'chih_listas_stj',
    displayName: 'Listas de Acuerdos — TSJ Chihuahua',
    landingUrl: 'http://www.stj.gob.mx/direccion-general-juridica/listas-acuerdos.php',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'CDMX',
    stateName: 'Ciudad de México',
    sourceKey: 'cdmx_boletin_pj',
    displayName: 'Boletín Judicial PJCDMX',
    landingUrl: 'https://poderjudicialcdmx.gob.mx/consulta-boletin/',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'COAH',
    stateName: 'Coahuila',
    sourceKey: 'coah_listas_pjecz',
    displayName: 'Listas de Acuerdos PJECZ',
    landingUrl: 'https://www.pjecz.gob.mx/consultas/listas-de-acuerdos/',
    accessType: 'captcha',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'COL',
    stateName: 'Colima',
    sourceKey: 'col_portal_stj',
    displayName: 'Portal STJ Colima',
    landingUrl: 'https://stjcolima.gob.mx/',
    accessType: 'abierto',
    urlStatus: 'ok',
    note: 'Portal del tribunal; la ruta de listas respondió error. Abra las listas desde el portal.',
    kind: 'state',
  },
  {
    stateCode: 'DGO',
    stateName: 'Durango',
    sourceKey: 'dgo_listas_tsj',
    displayName: 'Listas de Acuerdos — TSJ Durango',
    landingUrl: 'http://www.tsjdgo.gob.mx/Recursos/ListasDeAcuerdos.html',
    accessType: 'pdf_organo',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'MEX',
    stateName: 'Estado de México',
    sourceKey: 'edomex_boletin',
    displayName: 'Consulta del Boletín Judicial PJEDOMEX',
    landingUrl: 'https://notificacion.pjedomex.gob.mx/',
    accessType: 'requiere_usuario',
    urlStatus: 'timeout',
    note: 'Requiere usuario de la firma. No inicie sesión desde Cicerón.',
    kind: 'state',
  },
  {
    stateCode: 'GTO',
    stateName: 'Guanajuato',
    sourceKey: 'gto_lista_primera',
    displayName: 'Lista de Acuerdos — Primera Instancia Guanajuato',
    landingUrl:
      'https://www.poderjudicial-gto.gob.mx/modules.php?name=Acuerdos&file=primera_instancia',
    accessType: 'captcha',
    urlStatus: 'ok',
    note: 'Verificación en el portal y PDF por órgano.',
    kind: 'state',
  },
  {
    stateCode: 'GRO',
    stateName: 'Guerrero',
    sourceKey: 'gro_listas',
    displayName: 'Consulta de Listas de Acuerdos',
    landingUrl: 'https://listadeacuerdos.tsj-guerrero.gob.mx/',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'HGO',
    stateName: 'Hidalgo',
    sourceKey: 'hgo_publicaciones',
    displayName: 'Portal de consulta — Publicaciones de tocas',
    landingUrl: 'https://servernet2.pjhidalgo.gob.mx/portal/Publicaciones.aspx',
    accessType: 'captcha',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'JAL',
    stateName: 'Jalisco',
    sourceKey: 'jal_extractos_cjj',
    displayName: 'Extractos / Boletín CJJ — Jalisco',
    landingUrl: 'https://cjj.gob.mx/bulletin',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'MICH',
    stateName: 'Michoacán',
    sourceKey: 'mich_lista_acuerdos',
    displayName: 'Lista de Acuerdos y Resoluciones',
    landingUrl:
      'https://www.poderjudicialmichoacan.gob.mx/web/tramites/listaAcuerdos.aspx',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'MOR',
    stateName: 'Morelos',
    sourceKey: 'mor_boletin',
    displayName: 'Consulta de acuerdos — Boletín Judicial digital',
    landingUrl: 'https://boletinjudicial.tsjmorelos.gob.mx/boletin/boletinjudicial.php',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'NAY',
    stateName: 'Nayarit',
    sourceKey: 'nay_boletin_publico',
    displayName: 'Tribunal Virtual — Boletín público',
    landingUrl: 'https://tribunalvirtual-tsjnay.gob.mx/publico/boletin.public.php',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'NL',
    stateName: 'Nuevo León',
    sourceKey: 'nl_boletin_pjenl',
    displayName: 'Boletín Judicial PJENL',
    landingUrl: 'https://www.pjenl.gob.mx/BoletinJudicial/',
    accessType: 'captcha',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'OAX',
    stateName: 'Oaxaca',
    sourceKey: 'oax_listas',
    displayName: 'Listas — Poder Judicial de Oaxaca',
    landingUrl: 'https://www.tribunaloaxaca.gob.mx/listas',
    accessType: 'abierto',
    urlStatus: 'ok',
    note: 'Portal del tribunal; elija la lista del día en el sitio.',
    kind: 'state',
  },
  {
    stateCode: 'PUE',
    stateName: 'Puebla',
    sourceKey: 'pue_acuerdos',
    displayName: 'Acuerdos — PJ Puebla',
    landingUrl: 'https://pjpuebla.gob.mx/acuerdos',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'QRO',
    stateName: 'Querétaro',
    sourceKey: 'qro_lista_primera',
    displayName: 'Lista de Acuerdos Primera Instancia — Querétaro',
    landingUrl:
      'https://www.poderjudicialqro.gob.mx/acuerdos/lista-de-acuerdos-primera-instancia.php',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'QROO',
    stateName: 'Quintana Roo',
    sourceKey: 'qroo_estrados',
    displayName: 'Lista Electrónica — TSJQROO',
    landingUrl: 'https://www.tsjqroo.gob.mx/estrados/',
    accessType: 'abierto',
    urlStatus: 'timeout',
    note: 'Lista electrónica oficial; el portal no respondió desde algunas redes.',
    kind: 'state',
  },
  {
    stateCode: 'SLP',
    stateName: 'San Luis Potosí',
    sourceKey: 'slp_acuerdos',
    displayName: 'Listas de Acuerdos — PJESLP',
    landingUrl: 'https://www.stjslp.gob.mx/acuerdos/Index',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'SIN',
    stateName: 'Sinaloa',
    sourceKey: 'sin_portal_stj',
    displayName: 'Portal STJ Sinaloa',
    landingUrl: 'https://www.stj-sin.gob.mx/',
    accessType: 'abierto',
    urlStatus: 'ok',
    note: 'Portal del tribunal; la ruta del boletín respondió error. Abra el boletín desde el portal.',
    kind: 'state',
  },
  {
    stateCode: 'SON',
    stateName: 'Sonora',
    sourceKey: 'son_lista_acuerdos',
    displayName: 'Lista de Acuerdos — STJ Sonora',
    landingUrl: 'https://stjsonora.gob.mx/Publicaciones/ListaAcuerdos',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'TAB',
    stateName: 'Tabasco',
    sourceKey: 'tab_lista_acuerdos',
    displayName: 'Listas de Acuerdos — TSJ Tabasco',
    landingUrl: 'https://tsj-tabasco.gob.mx/lista-de-acuerdos/',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'TAM',
    stateName: 'Tamaulipas',
    sourceKey: 'tam_acceso_libre',
    displayName: 'Tribunal Electrónico — Lista de Acuerdos (Acceso Libre)',
    landingUrl: 'https://www.tribunalelectronico.gob.mx/te/AccesoLibre/ListaAcuerdos/',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'TLAX',
    stateName: 'Tlaxcala',
    sourceKey: 'tlax_portal',
    displayName: 'Portal TSJ Tlaxcala — Lista de Notificaciones',
    landingUrl: 'https://tsjtlaxcala.gob.mx/',
    accessType: 'abierto',
    urlStatus: 'ok',
    note: 'Desde el portal abra «Lista de notificaciones» para el día.',
    kind: 'state',
  },
  {
    stateCode: 'VER',
    stateName: 'Veracruz',
    sourceKey: 'ver_listas',
    displayName: 'Consulta Lista de Acuerdos de Juzgados',
    landingUrl: 'https://consultas.pjeveracruz.gob.mx/consultas/ListasAcuerdos',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'YUC',
    stateName: 'Yucatán',
    sourceKey: 'yuc_lista_acuerdos',
    displayName: 'Listado de acuerdos',
    landingUrl: 'https://sistemas.poderjudicialyucatan.gob.mx/lista_acuerdos/',
    accessType: 'captcha',
    urlStatus: 'ok',
    kind: 'state',
  },
  {
    stateCode: 'ZAC',
    stateName: 'Zacatecas',
    sourceKey: 'zac_consulta_acuerdos',
    displayName: 'Consulta de Lista de Acuerdos',
    landingUrl: 'http://pjzac.gob.mx/consulta_acuerdos.html',
    accessType: 'abierto',
    urlStatus: 'ok',
    kind: 'state',
  },
]

export const FEDERAL_DIRECTORY: StateDirectoryEntry[] = [
  {
    stateCode: 'DOF',
    stateName: 'Federación',
    sourceKey: 'fed_dof',
    displayName: 'Diario Oficial de la Federación',
    landingUrl: 'https://dof.gob.mx/',
    accessType: 'abierto',
    urlStatus: 'ok',
    note: 'Monitoreo DOF vive en Monitor Diario Oficial; aquí solo el enlace oficial.',
    kind: 'federal',
  },
  {
    stateCode: 'SCJN',
    stateName: 'Federación',
    sourceKey: 'fed_scjn',
    displayName: 'Suprema Corte de Justicia de la Nación',
    landingUrl: 'https://www.scjn.gob.mx/',
    accessType: 'abierto',
    urlStatus: 'ok',
    note: 'Portal institucional; no es un boletín estatal diario.',
    kind: 'federal',
  },
]

export function stateDirectorySorted(): StateDirectoryEntry[] {
  return [...STATE_DIRECTORY].sort((a, b) =>
    a.stateName.localeCompare(b.stateName, 'es-MX')
  )
}

export function findStateDirectoryEntry(
  stateCode: string
): StateDirectoryEntry | undefined {
  const code = stateCode.trim().toUpperCase()
  return STATE_DIRECTORY.find((e) => e.stateCode === code)
}
