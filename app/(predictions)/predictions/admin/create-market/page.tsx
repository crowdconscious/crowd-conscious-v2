import Link from 'next/link'
import { ArrowLeft, PlusCircle } from 'lucide-react'

export default function CreateMarketPlaceholderPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/predictions"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <PlusCircle className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-80" />
        <h1 className="text-xl font-bold text-white mb-2">Create Market</h1>
        <p className="text-slate-400 mb-6">
          The market creation form is coming soon. Use &quot;Create Market from This&quot; on the
          Review Inbox page to pre-fill from an inbox submission.
        </p>
        <Link
          href="/predictions/admin/inbox"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500"
        >
          Go to Review Inbox
        </Link>
      </div>
    </div>
  )
}
