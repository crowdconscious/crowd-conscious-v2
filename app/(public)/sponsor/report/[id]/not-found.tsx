import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function SponsorReportNotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Invalid or expired link</h1>
        <p className="text-slate-400 mb-6">
          This sponsor report link is invalid or has expired. Please use the link from your confirmation email, or contact us for a new link.
        </p>
        <Link
          href="/sponsor"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
        >
          Back to Sponsor page
        </Link>
      </div>
    </div>
  )
}
