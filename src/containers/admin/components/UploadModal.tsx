/**
 * The "Upload Document" / "Upload Image" dialog.
 *
 * Drag-and-drop OR click-to-browse, a small picked-files list you can prune, and
 * the metadata fields (uploader, category, notes). Accept rules and copy switch
 * with the active section. State resets every time the dialog opens, so a
 * cancelled upload never bleeds into the next one.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { FileText, Image as ImageIcon, Paperclip, UploadCloud, X } from 'lucide-react'
import { CATEGORY_OPTIONS } from '@/containers/admin/data'
import type { AdminSection } from '@/containers/admin/types'
import { formatBytes } from '@/containers/admin/utils/format'
import type { UploadPayload } from '@/containers/admin/hooks/useAdminFiles'
import { cn } from '@/utils/cn'
import Modal from '@/containers/admin/components/Modal'

const MAX_FILES = 25

const ACCEPT: Record<AdminSection, string> = {
  document: '.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.txt,.csv,.html',
  image: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
}

const HINT: Record<AdminSection, string> = {
  document: 'PDF, DOC, XLS, PPT, CSV, HTML — up to 25 files',
  image: 'PNG, JPG, WEBP, GIF, SVG — up to 25 files',
}

interface UploadModalProps {
  open: boolean
  section: AdminSection
  onClose: () => void
  onSubmit: (payload: UploadPayload) => void
}

export default function UploadModal({ open, section, onClose, onSubmit }: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<File[]>([])
  const [uploadedBy, setUploadedBy] = useState('')
  const [category, setCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const noun = section === 'image' ? 'Image' : 'Document'
  const categories = CATEGORY_OPTIONS[section]

  // Fresh form on every open.
  useEffect(() => {
    if (!open) return
    setPicked([])
    setUploadedBy('')
    setCategory('')
    setNotes('')
    setDragging(false)
    setError('')
  }, [open])

  function addPicked(list: FileList | null) {
    if (!list || list.length === 0) return
    setPicked((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const next = [...prev]
      for (const file of Array.from(list)) {
        const key = `${file.name}:${file.size}`
        if (!seen.has(key) && next.length < MAX_FILES) {
          seen.add(key)
          next.push(file)
        }
      }
      return next
    })
    setError('')
  }

  function removeAt(index: number) {
    setPicked((prev) => prev.filter((_, i) => i !== index))
  }

  function submit() {
    if (picked.length === 0) {
      setError('Add at least one file to upload.')
      return
    }
    onSubmit({ files: picked, uploadedBy, category, notes })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Upload ${noun}`}
      description={`Add ${noun.toLowerCase()}s to the internal library.`}
      className="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={picked.length === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-brand-cyan to-[#1b7fa8] px-4 text-sm font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UploadCloud className="h-4 w-4" aria-hidden />
            Upload {picked.length > 0 ? `(${picked.length})` : 'File'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Dropzone */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-brand-navy dark:text-slate-200">Upload File</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              addPicked(e.dataTransfer.files)
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
              dragging
                ? 'border-brand-cyan bg-brand-cyan/5'
                : 'border-slate-200 hover:border-brand-cyan/60 hover:bg-slate-50/60 dark:border-white/15 dark:hover:border-brand-cyan/50 dark:hover:bg-white/[0.03]',
            )}
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-cyan/10 text-brand-cyan">
              <UploadCloud className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-medium text-brand-navy dark:text-slate-200">
              {dragging ? 'Drop to add files' : 'Drop your file here'}
            </span>
            <span className="text-xs text-slate-400">
              or <span className="font-medium text-brand-cyan">browse</span> · {HINT[section]}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT[section]}
            className="hidden"
            onChange={(e) => {
              addPicked(e.target.files)
              e.target.value = '' // let the same file be re-picked after removal
            }}
          />
          {error && <p className="mt-2 text-xs font-medium text-brand-red">{error}</p>}
        </div>

        {/* Picked files */}
        {picked.length > 0 && (
          <ul className="space-y-2">
            {picked.map((file, i) => {
              const FileIcon = section === 'image' ? ImageIcon : FileText
              return (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <FileIcon className="h-4 w-4 shrink-0 text-brand-cyan" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-brand-navy dark:text-slate-200">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-slate-400">{formatBytes(file.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Remove ${file.name}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:bg-white hover:text-brand-red focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Uploaded by */}
        <Field label="Uploaded By">
          <input
            type="text"
            value={uploadedBy}
            onChange={(e) => setUploadedBy(e.target.value)}
            placeholder="e.g. John Doe"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-brand-navy outline-none transition-colors placeholder:text-slate-400 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </Field>

        {/* Category */}
        <Field label="Category">
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-brand-navy outline-none transition-colors focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Paperclip className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-slate-400" aria-hidden />
          </div>
        </Field>

        {/* Notes */}
        <Field label="Notes" optional>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any relevant notes here…"
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-brand-navy outline-none transition-colors placeholder:text-slate-400 focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </Field>
      </div>
    </Modal>
  )
}

function Field({
  label,
  optional,
  children,
}: {
  label: string
  optional?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-brand-navy dark:text-slate-200">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">(optional)</span>}
      </span>
      {children}
    </label>
  )
}
