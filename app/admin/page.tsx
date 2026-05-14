import { redirect } from 'next/navigation'

/**
 * Legacy /admin landing → redirect to /predictions.
 *
 * The old tile-grid dashboard was retired in favor of the predictions sidebar,
 * which is now the canonical admin entry point. Direct visits to /admin should
 * land users back on the main app.
 */
export default function AdminRootRedirect() {
  redirect('/predictions')
}
