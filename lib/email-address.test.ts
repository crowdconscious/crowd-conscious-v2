import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSendableEmail, maskEmail } from './email-address.ts'

test('accepts normal addresses', () => {
  for (const e of ['ana@gmail.com', 'a.b+news@crowdconscious.app', 'X_Y@sub.domain.mx', ' padded@duck.com ']) {
    assert.equal(isSendableEmail(e), true, e)
  }
})

test('rejects the malformed shapes Resend 422s on', () => {
  for (const e of ['alguien@duck', 'no-at-sign.com', 'a@b', 'two@@x.com', 'sp ace@x.com', 'a@x.c', '.dot@x.com', 'a..b@x.com', 'Name <a@x.com>', '', null, undefined, 42]) {
    assert.equal(isSendableEmail(e), false, String(e))
  }
})

test('mask keeps logs free of full addresses', () => {
  assert.equal(maskEmail('alguien@duck'), 'al***@duck')
  assert.equal(maskEmail('x@y.com'), 'x***@y.com')
  assert.equal(maskEmail('nope'), 'no***(no @)')
})
