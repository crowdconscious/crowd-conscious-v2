'use client'

import { useCallback, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  Link as LinkIcon,
  Quote,
  List,
  ListOrdered,
  Minus,
  Eye,
  Pencil,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import { htmlToMarkdown } from '@/lib/html-to-markdown'
import { normalizeBlogMarkdownForDisplay } from '@/lib/blog-markdown'
import { markdownImageComponents } from '@/components/blog/blog-image-components'

const IMAGE_UPLOAD_ENDPOINT = '/api/predictions/admin/blog-posts/upload-image'
const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Markdown-backed rich editor for the admin blog flow.
 *
 * Design goals (driven by the admin request "I want to just copy and
 * paste text and have it recognize titles, add hyperlinks, make
 * emerald-green section breaks…"):
 *
 *   1. Storage stays as **markdown**. Agents continue to write markdown
 *      directly; the public blog renderer (BlogPostBody) and RSS/email
 *      paths don't need to change.
 *   2. Authoring gets a formatting toolbar + keyboard shortcuts so the
 *      admin never has to remember `##` / `**` / `[](…)` syntax.
 *   3. Paste is smart — any HTML on the clipboard is converted to clean
 *      markdown via Turndown (Google Docs, ChatGPT, web pages all work).
 *      Plain-text paste is unchanged, so pasting markdown-as-text is
 *      idempotent.
 *   4. Live preview uses the exact Tailwind `prose` classes from
 *      BlogPostBody, including the emerald-bordered blockquote — so
 *      "Callout" button output looks identical to what readers see.
 */
export function MarkdownEditor({
  value,
  onChange,
  minHeight = 240,
  label,
  placeholder,
  hint,
  id,
}: {
  value: string
  onChange: (next: string) => void
  minHeight?: number
  label?: string
  placeholder?: string
  hint?: string
  id?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Wrap the current selection (or insert placeholder text when nothing
  // is selected). Works for inline markers like `**bold**`, `*italic*`,
  // and `[label](url)`.
  const wrapSelection = useCallback(
    (left: string, right: string, fallback = '') => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const selected = value.slice(start, end)
      const inner = selected || fallback
      const next = value.slice(0, start) + left + inner + right + value.slice(end)
      onChange(next)
      // Re-focus and select the newly wrapped region so repeated clicks
      // don't nest markers and keyboard-driven users can keep typing.
      requestAnimationFrame(() => {
        ta.focus()
        const cursorStart = start + left.length
        const cursorEnd = cursorStart + inner.length
        ta.setSelectionRange(cursorStart, cursorEnd)
      })
    },
    [value, onChange]
  )

  // Apply a line-level prefix (headings, blockquote, list items). Finds
  // the start of the line containing the caret and inserts the prefix
  // there — so clicking "H2" with the caret anywhere on a line converts
  // that whole line to a heading, matching how Google Docs / Notion
  // behave.
  const prefixLines = useCallback(
    (prefix: string, fallback = '') => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = value.indexOf('\n', end)
      const sliceEnd = lineEnd === -1 ? value.length : lineEnd
      const block = value.slice(lineStart, sliceEnd) || fallback
      const prefixed = block
        .split('\n')
        .map((line) => (line.trim().length > 0 ? `${prefix}${line}` : line))
        .join('\n')
      const next = value.slice(0, lineStart) + prefixed + value.slice(sliceEnd)
      onChange(next)
      requestAnimationFrame(() => {
        ta.focus()
        const delta = prefixed.length - (sliceEnd - lineStart)
        ta.setSelectionRange(lineStart, sliceEnd + delta)
      })
    },
    [value, onChange]
  )

  // Insert a raw chunk at the caret (used for divider `---`, ordered
  // list starter, etc.). Always surrounded by blank lines so block-level
  // markdown renders correctly.
  const insertBlock = useCallback(
    (chunk: string) => {
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = value.slice(0, start)
      const after = value.slice(end)
      const needLeading = before.length > 0 && !before.endsWith('\n\n')
      const needTrailing = after.length > 0 && !after.startsWith('\n\n')
      const insertion =
        (needLeading ? (before.endsWith('\n') ? '\n' : '\n\n') : '') +
        chunk +
        (needTrailing ? (after.startsWith('\n') ? '\n' : '\n\n') : '')
      const next = before + insertion + after
      onChange(next)
      requestAnimationFrame(() => {
        ta.focus()
        const cursor = start + insertion.length
        ta.setSelectionRange(cursor, cursor)
      })
    },
    [value, onChange]
  )

  // Insert markdown image syntax at the current caret position. We deliberately
  // omit the alt text so the user can fill it in by selecting the inserted
  // placeholder — accessible alt text matters and forcing a prompt up front
  // makes the toolbar feel slow. Caption is the markdown `title` attribute
  // (`"…"`) so authors can add a figcaption inline if they want.
  const insertImageMarkdown = useCallback(
    (url: string) => {
      const ta = textareaRef.current
      const altPlaceholder = 'descripción de la imagen'
      const snippet = `\n\n![${altPlaceholder}](${url})\n\n`
      if (!ta) {
        onChange(value + snippet)
        return
      }
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = value.slice(0, start) + snippet + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        ta.focus()
        // Select the placeholder so the user can immediately type real alt text.
        const altStart = start + 3 // after "\n\n!["
        const altEnd = altStart + altPlaceholder.length
        ta.setSelectionRange(altStart, altEnd)
      })
    },
    [value, onChange]
  )

  const uploadImageFile = useCallback(
    async (file: File): Promise<void> => {
      setUploadError(null)
      if (!ALLOWED_IMAGE_MIME.has(file.type)) {
        setUploadError('Formato no soportado. Usa JPG, PNG, WebP o GIF.')
        return
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setUploadError(
          `La imagen pesa ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo 5MB.`
        )
        return
      }
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(IMAGE_UPLOAD_ENDPOINT, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean
          url?: string
          error?: string
        }
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? `Subida falló (${res.status})`)
        }
        insertImageMarkdown(json.url)
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : 'Error al subir')
      } finally {
        setUploading(false)
      }
    },
    [insertImageMarkdown]
  )

  const handleImagePickerChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      await uploadImageFile(file)
    },
    [uploadImageFile]
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault()
      setDragActive(false)
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith('image/')
      )
      if (!file) return
      void uploadImageFile(file)
    },
    [uploadImageFile]
  )

  const onDragOver = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    if (Array.from(e.dataTransfer.items).some((it) => it.kind === 'file')) {
      e.preventDefault()
      setDragActive(true)
    }
  }, [])

  const onDragLeave = useCallback(() => setDragActive(false), [])

  const linkPrompt = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    const url = window.prompt(
      'URL (https://…)',
      selected && /^https?:\/\//i.test(selected) ? selected : 'https://'
    )
    if (!url || url === 'https://') return
    const label = selected && !/^https?:\/\//i.test(selected) ? selected : ''
    wrapSelection('[', `](${url})`, label || 'texto del enlace')
  }, [value, wrapSelection])

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      // 1) Pasted image (screenshot / "copy image"): upload + insert.
      // We check this BEFORE the HTML path because some clipboards include
      // both an HTML wrapper and a file — we always prefer the file.
      const pastedFile = Array.from(e.clipboardData.files).find((f) =>
        f.type.startsWith('image/')
      )
      if (pastedFile) {
        e.preventDefault()
        void uploadImageFile(pastedFile)
        return
      }

      const html = e.clipboardData.getData('text/html')
      if (!html || !html.trim()) return
      // Ignore HTML that is already a single code block (<pre>/<code>) —
      // users copying code snippets usually want the raw plain-text.
      const isCodeOnly = /^<(pre|code)[\s>]/i.test(html.trim()) && !/<(p|h\d|ul|ol|table)[\s>]/i.test(html)
      if (isCodeOnly) return

      const markdown = htmlToMarkdown(html)
      if (!markdown) return

      e.preventDefault()
      const ta = textareaRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const before = value.slice(0, start)
      const after = value.slice(end)
      const joiner =
        before.length > 0 && !before.endsWith('\n') && !markdown.startsWith('\n')
          ? '\n\n'
          : ''
      const next = before + joiner + markdown + after
      onChange(next)
      requestAnimationFrame(() => {
        ta.focus()
        const cursor = start + joiner.length + markdown.length
        ta.setSelectionRange(cursor, cursor)
      })
    },
    [value, onChange, uploadImageFile]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const key = e.key.toLowerCase()
      if (key === 'b') {
        e.preventDefault()
        wrapSelection('**', '**', 'texto')
      } else if (key === 'i') {
        e.preventDefault()
        wrapSelection('*', '*', 'texto')
      } else if (key === 'k') {
        e.preventDefault()
        linkPrompt()
      }
    },
    [wrapSelection, linkPrompt]
  )

  return (
    <div className="rounded-lg border border-[#2d3748] bg-[#1a2029]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[#2d3748] px-2 py-1.5">
        <ToolbarButton
          label="Título (H2)"
          onClick={() => prefixLines('## ', 'Encabezado')}
          icon={<Heading2 className="h-4 w-4" />}
        />
        <ToolbarButton
          label="Subtítulo (H3)"
          onClick={() => prefixLines('### ', 'Subencabezado')}
          icon={<Heading3 className="h-4 w-4" />}
        />
        <ToolbarDivider />
        <ToolbarButton
          label="Negrita (⌘B)"
          onClick={() => wrapSelection('**', '**', 'texto')}
          icon={<Bold className="h-4 w-4" />}
        />
        <ToolbarButton
          label="Cursiva (⌘I)"
          onClick={() => wrapSelection('*', '*', 'texto')}
          icon={<Italic className="h-4 w-4" />}
        />
        <ToolbarButton
          label="Enlace (⌘K)"
          onClick={linkPrompt}
          icon={<LinkIcon className="h-4 w-4" />}
        />
        <ToolbarButton
          label="Insertar imagen"
          onClick={() => imageInputRef.current?.click()}
          icon={
            uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )
          }
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handleImagePickerChange}
        />
        <ToolbarDivider />
        <ToolbarButton
          label="Cita / Callout verde"
          onClick={() => prefixLines('> ', 'Texto destacado en verde esmeralda')}
          icon={<Quote className="h-4 w-4" />}
          accent
        />
        <ToolbarButton
          label="Lista con viñetas"
          onClick={() => prefixLines('- ', 'Elemento')}
          icon={<List className="h-4 w-4" />}
        />
        <ToolbarButton
          label="Lista numerada"
          onClick={() => prefixLines('1. ', 'Elemento')}
          icon={<ListOrdered className="h-4 w-4" />}
        />
        <ToolbarButton
          label="Separador"
          onClick={() => insertBlock('---')}
          icon={<Minus className="h-4 w-4" />}
        />

        <div className="ml-auto flex items-center gap-1">
          <ToolbarTab
            active={mode === 'write'}
            onClick={() => setMode('write')}
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="Escribir"
          />
          <ToolbarTab
            active={mode === 'preview'}
            onClick={() => setMode('preview')}
            icon={<Eye className="h-3.5 w-3.5" />}
            label="Vista previa"
          />
        </div>
      </div>

      {/* Body */}
      {mode === 'write' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={id}
            aria-label={label}
            className={`block w-full resize-y rounded-b-lg bg-[#1a2029] px-4 py-3 font-mono text-sm text-white placeholder:text-gray-500 focus:outline-none transition-colors ${
              dragActive ? 'ring-2 ring-emerald-500/60 ring-inset' : ''
            }`}
            style={{ minHeight }}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onPaste={onPaste}
            onKeyDown={onKeyDown}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            spellCheck
          />
          {dragActive ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-b-lg bg-emerald-500/10 backdrop-blur-[1px]">
              <div className="rounded-full border border-emerald-500/40 bg-[#0f1419]/95 px-4 py-2 text-sm text-emerald-300">
                Suelta para subir imagen
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="rounded-b-lg bg-[#1a2029] px-4 py-4 overflow-auto"
          style={{ minHeight }}
        >
          {value.trim().length === 0 ? (
            <p className="text-sm italic text-slate-500">
              Nada que mostrar todavía. Escribe o pega contenido en la pestaña Escribir.
            </p>
          ) : (
            <div
              className="prose prose-invert max-w-none
                prose-headings:font-bold prose-headings:text-white
                prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-xl
                prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-lg
                prose-p:mb-4 prose-p:text-gray-300 prose-p:leading-relaxed
                prose-strong:text-white
                prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-emerald-500/50 prose-blockquote:text-gray-300 prose-blockquote:bg-emerald-500/5 prose-blockquote:not-italic prose-blockquote:rounded-r-md prose-blockquote:px-4 prose-blockquote:py-2
                prose-code:rounded prose-code:bg-black/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-emerald-300
                prose-pre:bg-black/40 prose-pre:text-gray-300
                prose-li:text-gray-300
                prose-hr:border-emerald-500/30
                prose-ul:marker:text-emerald-500/80"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownImageComponents}>
                {normalizeBlogMarkdownForDisplay(value)}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {uploading || uploadError ? (
        <div className="border-t border-[#2d3748] px-3 py-2 text-[11px] leading-snug">
          {uploading ? (
            <span className="inline-flex items-center gap-2 text-emerald-300/90">
              <Loader2 className="h-3 w-3 animate-spin" /> Subiendo imagen…
            </span>
          ) : null}
          {uploadError ? (
            <span className="text-amber-400">{uploadError}</span>
          ) : null}
        </div>
      ) : null}

      {hint ? (
        <div className="border-t border-[#2d3748] px-3 py-2 text-[11px] leading-snug text-slate-500">
          {hint}
        </div>
      ) : null}
    </div>
  )
}

function ToolbarButton({
  label,
  onClick,
  icon,
  accent = false,
}: {
  label: string
  onClick: () => void
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-300 transition-colors hover:border-[#3a4556] hover:bg-[#242c38] ${
        accent ? 'text-emerald-400 hover:text-emerald-300' : ''
      }`}
    >
      {icon}
    </button>
  )
}

function ToolbarDivider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-[#2d3748]" />
}

function ToolbarTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-500/15 text-emerald-300'
          : 'text-slate-400 hover:bg-[#242c38] hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
