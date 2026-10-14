import { notFound } from 'next/navigation'
import SurveyForm from '@/components/org/SurveyForm'
import { ORG_PORTAL_V2 } from '@/lib/org/config'
import { surveyByToken } from '@/lib/org/survey'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

/** Public, anonymous survey link the client distributes. */
export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  if (!ORG_PORTAL_V2) notFound()
  const { token } = await params
  const s = await surveyByToken(token)
  if (!s) notFound()
  return (
    <main className="min-h-screen bg-[#0f1419] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-xl">
        <p className="text-sm font-semibold text-emerald-300">{s.orgName}</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{s.title[s.locale]}</h1>
        {s.open ? (
          <SurveyForm token={token} locale={s.locale} questions={s.questions.map((q) => ({ id: q.id, text: q.text[s.locale] }))} />
        ) : (
          <p className="mt-6 rounded-xl border border-slate-600 p-4 text-slate-200">
            {s.locale === 'es' ? 'Esta consulta ya cerró. Gracias.' : 'This survey is closed. Thank you.'}
          </p>
        )}
      </div>
    </main>
  )
}
