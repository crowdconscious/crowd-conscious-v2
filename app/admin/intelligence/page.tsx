import { redirect } from 'next/navigation'

/** Legacy URL — Intelligence Hub lives under Predictions with the main app shell. */
export default function AdminIntelligenceRedirect() {
  redirect('/predictions/intelligence')
}
