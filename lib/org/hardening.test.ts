import test from 'node:test'
import assert from 'node:assert/strict'
import { issueNonce, verifyNonce, rateKey, clientIp, NONCE_MIN_AGE_MS, NONCE_TTL_MS } from './survey-guard'
import { reportLocale, downloadName } from './locale-pref'
import { countTiles, hasInvited } from './readings'

const S = 'x'.repeat(40)
const R = '11111111-2222-3333-4444-555555555555'
const t0 = 1_800_000_000_000

test('nonce: valid after min age, carries a stable hash', () => {
  const n = issueNonce(S, R, t0, 'abc')
  const v = verifyNonce(S, n, R, t0 + NONCE_MIN_AGE_MS + 1)
  assert.equal(v.ok, true)
  const v2 = verifyNonce(S, n, R, t0 + 60_000)
  assert.ok(v.ok && v2.ok && v.nonceHash === v2.nonceHash, 'same nonce -> same hash, so the DB unique key blocks reuse')
  assert.ok(v.ok && !v.nonceHash.includes('abc'))
})
test('nonce: rejects too fast, expired, wrong reading, tampered, other secret, junk', () => {
  const n = issueNonce(S, R, t0, 'abc')
  assert.deepEqual(verifyNonce(S, n, R, t0 + 100), { ok: false, reason: 'too_fast' })
  assert.deepEqual(verifyNonce(S, n, R, t0 + NONCE_TTL_MS + 1), { ok: false, reason: 'expired' })
  assert.deepEqual(verifyNonce(S, n, R.replace('1', '9'), t0 + 5000), { ok: false, reason: 'wrong_reading' })
  const [p, sig] = n.split('.')
  const forged = Buffer.from(`${R}.${t0 - 60_000}.abc`).toString('base64url') + '.' + sig
  assert.deepEqual(verifyNonce(S, forged, R, t0 + 5000), { ok: false, reason: 'bad_signature' })
  assert.deepEqual(verifyNonce('y'.repeat(40), n, R, t0 + 5000), { ok: false, reason: 'bad_signature' })
  for (const j of [undefined, '', 'a', `${p}.${sig}.x`, 'a'.repeat(400)]) assert.equal(verifyNonce(S, j, R, t0 + 5000).ok, false)
})
test('nonces are unique per page load', () => {
  assert.notEqual(issueNonce(S, R, t0), issueNonce(S, R, t0))
})
test('rate key: HMAC only, no raw IP, differs per token/window', () => {
  const k = rateKey(S, '203.0.113.7', 'aa'.repeat(18), 600)
  assert.ok(!k.includes('203') && k.length >= 40)
  assert.notEqual(k, rateKey(S, '203.0.113.7', 'bb'.repeat(18), 600))
  assert.notEqual(k, rateKey(S, '203.0.113.7', 'aa'.repeat(18), 86400))
  assert.notEqual(k, rateKey(S, '203.0.113.8', 'aa'.repeat(18), 600))
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7')
  assert.equal(clientIp(new Headers()), 'unknown')
})
test('report locale defaults to Spanish', () => {
  assert.equal(reportLocale(null), 'es')
  assert.equal(reportLocale('fr'), 'es')
  assert.equal(reportLocale('en'), 'en')
  assert.equal(reportLocale(null, 'en'), 'en')
  assert.equal(reportLocale('es', 'en'), 'es')
})
test('download names carry the full reading id', () => {
  assert.equal(downloadName('agregado', 'acme', R, 'es', 'csv'), `crowd-conscious-agregado-acme-${R}-es.csv`)
  assert.ok(downloadName('reporte', 'acme', R, 'en', 'pdf').includes(R))
})
test('invited=0 shows only responses; invited>0 shows the rate', () => {
  const l = { invited: 'Invitados', responded: 'Respuestas', rate: 'Tasa' }
  assert.equal(hasInvited({ invited: 0 }), false)
  assert.deepEqual(countTiles({ invited: 0, responded: 42 }, l), [['Respuestas', '42']])
  assert.deepEqual(countTiles({ invited: 200, responded: 50 }, l), [['Invitados', '200'], ['Respuestas', '50'], ['Tasa', '25%']])
})
