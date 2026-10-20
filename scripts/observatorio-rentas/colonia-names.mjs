/**
 * Normalises official CDMX colonia names (catalogue is unaccented Title Case)
 * to Spanish orthography: accents, roman numerals, lowercase particles.
 * Used by seed.mjs; tested in lib/observatorio-rentas/names.test.ts.
 */
// Whole-name corrections (applied after word-level normalisation).
export const NAME_CORRECTIONS = {
  'Ampl. Asturias': 'Ampliación Asturias',
  'Francisco I Madero': 'Francisco I. Madero',
  'Cerro del Judío - Av': 'Cerro del Judío',
}
// Word-level accent dictionary (lower-case unaccented → correct form).
export const ACCENTS = {
  algarin: 'Algarín', hipodromo: 'Hipódromo', cuauhtemoc: 'Cuauhtémoc', juarez: 'Juárez', simon: 'Simón',
  maria: 'María', transito: 'Tránsito', gomez: 'Gómez', anahuac: 'Anáhuac', america: 'América',
  ampliacion: 'Ampliación', seccion: 'Sección', escandon: 'Escandón', irrigacion: 'Irrigación', avila: 'Ávila',
  mexico: 'México', panteon: 'Panteón', elias: 'Elías', joaquin: 'Joaquín', tomas: 'Tomás', perez: 'Pérez',
  veronica: 'Verónica', jeronimo: 'Jerónimo', lidice: 'Lídice', nicolas: 'Nicolás', bernabe: 'Bernabé',
  heroes: 'Héroes', concepcion: 'Concepción', judio: 'Judío', ermitano: 'Ermitaño', alvaro: 'Álvaro',
  martin: 'Martín', aragon: 'Aragón', agricola: 'Agrícola', napoles: 'Nápoles', alamos: 'Álamos', letran: 'Letrán',
  angel: 'Ángel', tecomitl: 'Tecómitl', yecahuizotl: 'Yecahuizotl', tlaltenco: 'Tlaltenco', martir: 'Mártir',
  balbuena: 'Balbuena', serdan: 'Serdán', aztahuacan: 'Aztahuacán', sifon: 'Sifón', escuadron: 'Escuadrón',
  merced: 'Merced', aguilas: 'Águilas', chavez: 'Chávez', garcia: 'García', rodriguez: 'Rodríguez',
  lopez: 'López', hernandez: 'Hernández', jardin: 'Jardín', regulo: 'Régulo', ramon: 'Ramón',
}
const LOWER = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'para', 'en'])
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i

export function normalizeColoniaName(raw) {
  const words = raw.trim().replace(/\s+/g, ' ').split(' ')
  const out = words.map((w, i) => {
    const bare = w.toLowerCase()
    const key = bare.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (ROMAN.test(bare) && i > 0) return bare.toUpperCase()
    if (i > 0 && LOWER.has(bare)) return bare
    if (ACCENTS[key]) return ACCENTS[key]
    if (/^\d/.test(w)) return bare // "2a", "10"
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  })
  const joined = out.join(' ')
  return NAME_CORRECTIONS[joined] ?? NAME_CORRECTIONS[raw] ?? joined
}
