import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { authorizeCronBearer, isBackfillEnabled } from './backfill-gate'

describe('ciceron dof backfill gate', () => {
  it('kill switch defaults off and accepts truthy tokens', () => {
    assert.equal(isBackfillEnabled(undefined), false)
    assert.equal(isBackfillEnabled(''), false)
    assert.equal(isBackfillEnabled('false'), false)
    assert.equal(isBackfillEnabled('0'), false)
    assert.equal(isBackfillEnabled('true'), true)
    assert.equal(isBackfillEnabled('TRUE'), true)
    assert.equal(isBackfillEnabled('1'), true)
    assert.equal(isBackfillEnabled('yes'), true)
  })

  it('requires Bearer CRON_SECRET and rejects missing/wrong auth', () => {
    assert.equal(authorizeCronBearer(null, 's3cret'), false)
    assert.equal(authorizeCronBearer('Bearer s3cret', undefined), false)
    assert.equal(authorizeCronBearer('Bearer s3cret', ''), false)
    assert.equal(authorizeCronBearer('Bearer wrong', 's3cret'), false)
    assert.equal(authorizeCronBearer('s3cret', 's3cret'), false)
    assert.equal(authorizeCronBearer('Bearer s3cret', 's3cret'), true)
  })
})
