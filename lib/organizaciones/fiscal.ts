/**
 * Mexican fiscal data helpers for the B2B pilot form. Validation is
 * format-only (SAT structure); it does not confirm the RFC exists.
 */

// Persona moral: 3 letters + YYMMDD + 3 homoclave. Persona física: 4 letters.
export const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([A-Z\d]{2})([A\d])$/

export function normalizeRfc(raw: string) {
  return raw.trim().toUpperCase().replace(/[\s-]/g, '')
}

export function isValidRfcFormat(raw: string) {
  return RFC_REGEX.test(normalizeRfc(raw))
}

export const CP_REGEX = /^\d{5}$/

/** SAT catálogo c_RegimenFiscal (common B2B subset). */
export const REGIMENES_FISCALES: { code: string; es: string; en: string }[] = [
  { code: '601', es: 'General de Ley Personas Morales', en: 'General regime, legal entities' },
  { code: '603', es: 'Personas Morales con Fines no Lucrativos', en: 'Non-profit legal entities' },
  { code: '605', es: 'Sueldos y Salarios', en: 'Salaried individuals' },
  { code: '606', es: 'Arrendamiento', en: 'Leasing' },
  { code: '612', es: 'Personas Físicas con Actividades Empresariales y Profesionales', en: 'Individuals with business/professional activity' },
  { code: '620', es: 'Sociedades Cooperativas de Producción', en: 'Production cooperatives' },
  { code: '623', es: 'Opcional para Grupos de Sociedades', en: 'Optional regime for groups of companies' },
  { code: '624', es: 'Coordinados', en: 'Coordinated' },
  { code: '626', es: 'Régimen Simplificado de Confianza (RESICO)', en: 'Simplified Trust Regime (RESICO)' },
]

/** SAT catálogo c_UsoCFDI (common B2B subset). */
export const USOS_CFDI: { code: string; es: string; en: string }[] = [
  { code: 'G03', es: 'Gastos en general', en: 'General expenses' },
  { code: 'G01', es: 'Adquisición de mercancías', en: 'Purchase of goods' },
  { code: 'I08', es: 'Otra maquinaria y equipo', en: 'Other machinery and equipment' },
  { code: 'S01', es: 'Sin efectos fiscales', en: 'No tax effects' },
  { code: 'CP01', es: 'Pagos', en: 'Payments' },
]

export const REGIMEN_CODES = REGIMENES_FISCALES.map((r) => r.code)
export const USO_CFDI_CODES = USOS_CFDI.map((u) => u.code)
