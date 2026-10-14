'use client'

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-400 px-4 text-sm font-semibold text-slate-100 hover:border-emerald-400"
    >
      {label}
    </button>
  )
}
