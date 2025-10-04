'use client'

import Link from 'next/link'

export default function SponsorshipCancelledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">😔</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Sponsorship Cancelled
            </h1>
            <p className="text-slate-200">
              Your payment was not completed
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <p className="text-slate-600">
                No worries! Your sponsorship has not been processed and you have not been charged.
              </p>
              <p className="text-slate-600">
                You can try again whenever you're ready, or explore other ways to support the community.
              </p>
            </div>

            {/* Other Ways to Help */}
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-6 rounded-xl">
              <h3 className="font-semibold text-slate-900 mb-3">Other Ways to Help</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span>
                  Share the community with your network
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span>
                  Volunteer your time or skills
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span>
                  Engage with community content
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-teal-600">✓</span>
                  Spread awareness on social media
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link href="/communities">
                <button className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-colors">
                  Browse Communities
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="w-full px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors">
                  Go to Dashboard
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <p>
            Need help?{' '}
            <a href="mailto:support@crowdconscious.app" className="text-teal-600 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
