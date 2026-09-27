import 'server-only'

import type { SimulationReplayPayload } from '@/types/simulation-replay'
import fixturePayload from '@/fixtures/simulation-run.fixture.json'

/** Server-only fixture load. Do not import from client components. */
export function loadSimulationFixture(): SimulationReplayPayload {
  const data = fixturePayload as SimulationReplayPayload
  if (!data.isFixture) {
    throw new Error('Fixture payload missing isFixture:true marker')
  }
  return data
}
