'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeBlogMarkdownForDisplay } from '@/lib/blog-markdown'

export function BlogPostBody({ markdown }: { markdown: string }) {
  const md = normalizeBlogMarkdownForDisplay(markdown)
  return (
    <div
      className="prose prose-invert mx-auto max-w-none
        prose-headings:font-bold prose-headings:text-white
        prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-2xl
        prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-xl
        prose-p:mb-5 prose-p:text-gray-300 prose-p:leading-relaxed
        prose-strong:text-white
        prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-emerald-500/30 prose-blockquote:text-gray-400
        prose-code:rounded prose-code:bg-[#1a2029] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-emerald-300
        prose-pre:bg-[#1a2029] prose-pre:text-gray-300
        prose-li:text-gray-300
        prose-hr:border-gray-700
        prose-ul:marker:text-emerald-500/80"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
    </div>
  )
}
