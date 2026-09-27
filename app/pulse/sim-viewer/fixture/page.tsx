import { redirect, notFound } from 'next/navigation'
import {
  isSimViewerEnabled,
  isSimViewerFixtureOpen,
} from '@/lib/sim-viewer/is-enabled'

export const dynamic = 'force-dynamic'

/**
 * Legacy path under /pulse inherits LandingNav (needs Supabase).
 * Redirect to the standalone fixture preview.
 */
export default function PulseSimViewerFixtureRedirect() {
  if (!isSimViewerEnabled() || !isSimViewerFixtureOpen()) {
    notFound()
  }
  redirect('/sim-viewer/fixture')
}
