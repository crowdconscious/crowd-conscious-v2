import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { savedViewHref, type SavedView } from '@/lib/ciceron/case-files/saved-view-href'

function view(partial: Partial<SavedView> & Pick<SavedView, 'room' | 'filters'>): SavedView {
  return {
    id: 'v1',
    name: 'Test',
    isSample: false,
    ...partial,
  }
}

describe('savedViewHref', () => {
  it('maps expedientes filters to query string', () => {
    assert.equal(
      savedViewHref(
        view({ room: 'expedientes', filters: { urgency: 'soon', status: 'activo' } })
      ),
      '/ciceron/expedientes?urgency=soon'
    )
  })

  it('maps calendario room', () => {
    assert.equal(
      savedViewHref(view({ room: 'calendario', filters: {} })),
      '/ciceron/expedientes/calendario'
    )
  })

  it('maps monitor-dof room', () => {
    assert.equal(
      savedViewHref(view({ room: 'monitor-dof', filters: { clientId: 'c1' } })),
      '/ciceron/monitor-dof?client=c1'
    )
  })
})
