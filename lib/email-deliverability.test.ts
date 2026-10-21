import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'crypto'
import { htmlToText } from './email-text'
import { listUnsubscribeHeaders, userUnsubscribeUrl, newsletterUnsubscribeUrl } from './email-unsubscribe'
import { suppressionFromEvent, verifyResendWebhook } from './resend-webhook'

test('List-Unsubscribe headers are RFC 8058 shaped', () => {
  const url = userUnsubscribeUrl('u1')
  assert.match(url, /^https:\/\/www\.crowdconscious\.app\/api\/email\/unsubscribe\?user=u1&token=/)
  const h = listUnsubscribeHeaders(url)
  assert.equal(h['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.match(h['List-Unsubscribe'], /^<https:\/\/[^>]+>, <mailto:[^>]+>$/)
  assert.match(newsletterUnsubscribeUrl(' A@B.com '), /email=a%40b\.com&token=/)
})

test('htmlToText keeps links and strips tags', () => {
  const t = htmlToText('<style>x{}</style><p>Hola&nbsp;<b>mundo</b></p><a href="https://x.y/z">Baja</a>')
  assert.equal(t, 'Hola mundo\nBaja (https://x.y/z)')
})

test('webhook signature verification', () => {
  const secret = 'whsec_' + Buffer.from('supersecretkey').toString('base64')
  const body = '{"type":"email.bounced"}'
  const ts = '1700000000'
  const sig = createHmac('sha256', Buffer.from('supersecretkey')).update(`msg_1.${ts}.${body}`).digest('base64')
  const hdr = { id: 'msg_1', timestamp: ts, signature: `v1,${sig}` }
  assert.equal(verifyResendWebhook(body, hdr, secret, 1700000010), true)
  assert.equal(verifyResendWebhook(body + ' ', hdr, secret, 1700000010), false)
  assert.equal(verifyResendWebhook(body, hdr, secret, 1700009999), false)
})

test('suppressionFromEvent: hard bounce and complaint only', () => {
  assert.deepEqual(
    suppressionFromEvent({ type: 'email.bounced', data: { to: ['a@b.c'], bounce: { type: 'Permanent', subType: 'General' } } }),
    { emails: ['a@b.c'], reason: 'hard_bounce', info: 'Permanent/General' }
  )
  assert.equal(suppressionFromEvent({ type: 'email.bounced', data: { to: ['a@b.c'], bounce: { type: 'Transient' } } }), null)
  assert.equal(suppressionFromEvent({ type: 'email.complained', data: { to: ['a@b.c'] } })?.reason, 'complaint')
  assert.equal(suppressionFromEvent({ type: 'email.delivered', data: { to: ['a@b.c'] } }), null)
})
