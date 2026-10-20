import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeColoniaName } from '../../scripts/observatorio-rentas/colonia-names.mjs'
import { expandCore, type SeedCore } from './model.ts'

test('colonia names follow Spanish orthography', () => {
  assert.equal(normalizeColoniaName('Hipodromo Condesa'), 'Hipódromo Condesa')
  assert.equal(normalizeColoniaName('Polanco V Seccion'), 'Polanco V Sección')
  assert.equal(normalizeColoniaName('San Simon Tolnahuac'), 'San Simón Tolnahuac')
  assert.equal(normalizeColoniaName('5 De Mayo'), '5 de Mayo')
  assert.equal(normalizeColoniaName('Lomas De Chapultepec I Seccion'), 'Lomas de Chapultepec I Sección')
  assert.equal(normalizeColoniaName('Real De Las Lomas'), 'Real de las Lomas')
  assert.equal(normalizeColoniaName('Ventura Perez De Alva'), 'Ventura Pérez de Alva')
  assert.equal(normalizeColoniaName('La Malinche'), 'La Malinche')
})

test('no seeded colonia keeps an unaccented or mis-cased form', () => {
  const seed = expandCore(JSON.parse(readFileSync('public/observatorio-rentas/data/core.json', 'utf8')) as SeedCore)
  for (const c of seed.colonias) {
    assert.equal(normalizeColoniaName(c.nombre), c.nombre, c.nombre)
    assert.doesNotMatch(c.nombre, / (De|Del|La|Las|Los|Y) /, c.nombre)
    assert.doesNotMatch(c.nombre, /\b(Seccion|Hipodromo|Cuauhtemoc|Juarez|Maria|Ampliacion|Mexico|Anahuac)\b/, c.nombre)
  }
})
