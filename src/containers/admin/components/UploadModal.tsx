/**
 * The "Upload Document" / "Upload Image" dialog.
 *
 * Drag-and-drop OR click-to-browse, a small picked-files list you can prune, and
 * an optional notes field. Accept rules and copy switch with the active section.
 * State resets every time the dialog opens, so a cancelled upload never bleeds
 * into the next one.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { FileText, Image as ImageIcon, Loader2, UploadCloud, X } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { AdminSection } from '@/containers/admin/types'
import { formatBytes } from '@/containers/admin/utils/format'
import type { UploadPayload } from '@/containers/admin/hooks/useAdminFiles'
import { cn } from '@/utils/cn'
import Modal from '@/containers/admin/components/Modal'

const MAX_FILES = 25

/** The backend caps each upload at 5 MB (down from 25 MB) — reject bigger files up front. */
const MAX_FILE_MB = 5
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024

const ACCEPT: Record<AdminSection, string> = {
  document: '.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.txt,.csv,.html',
  image: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
}

interface UploadModalProps {
  open: boolean
  section: AdminSection
  /** An upload is in flight — buttons lock and the primary shows a spinner. */
  submitting?: boolean
  onClose: () => void
  onSubmit: (payload: UploadPayload) => void
}

export default function UploadModal({
  open,
  section,
  submitting = false,
  onClose,
  onSubmit,
}: UploadModalProps) {
  const { t } = useTranslation('admin')
  const inputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<File[]>([])
  const [notes, setNotes] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  // Fresh form on every open.
  useEffect(() => {
    if (!open) return
    setPicked([])
    setNotes('')
    setDragging(false)
    setError('')
  }, [open])

  function addPicked(list: FileList | null) {
    // Snapshot the files NOW, synchronously. The setPicked updater below runs
    // after this event completes — by then the browse input has been cleared
    // (`e.target.value = ''`) and a drop's `dataTransfer` is gone, so a deferred
    // `Array.from(list)` would read an empty FileList and silently add nothing.
    const incoming = list ? Array.from(list) : []
    if (incoming.length === 0) return

    // Keep only files within the backend's per-file size cap; flag the rest.
    const withinLimit = incoming.filter((f) => f.size <= MAX_FILE_BYTES)
    const tooBig = incoming.length - withinLimit.length

    setPicked((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const next = [...prev]
      for (const file of withinLimit) {
        const key = `${file.name}:${file.size}`
        if (!seen.has(key) && next.length < MAX_FILES) {
          seen.add(key)
          next.push(file)
        }
      }
      return next
    })
    setError(tooBig > 0 ? t('upload.errorTooLarge', { size: MAX_FILE_MB, count: tooBig }) : '')
  }

  function removeAt(index: number) {
    setPicked((prev) => prev.filter((_, i) => i !== index))
  }

  function submit() {
    if (picked.length === 0) {
      setError(t('upload.errorNoFiles'))
      return
    }
    onSubmit({ files: picked, notes })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(`upload.title.${section}`)}
      className="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-cyan disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {t('upload.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={picked.length === 0 || submitting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-brand-cyan to-[#1b7fa8] px-4 text-sm font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t('upload.uploading')}
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" aria-hidden />
                {picked.length > 0
                  ? t('upload.submitWithCount', { count: picked.length })
                  : t('upload.submit')}
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Dropzone */}
        <div>
          <p className="mb-1.5 text-sm font-medium text-brand-navy dark:text-slate-200">
            {t('upload.fileFieldLabel')}
          </p>
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
              {dragging ? t('upload.dropActive') : t('upload.dropIdle')}
            </span>
            <span className="text-xs text-slate-400">
              <Trans
                t={t}
                i18nKey="upload.browsePrompt"
                components={{ 1: <span className="font-medium text-brand-cyan" /> }}
              />{' '}
              · {t(`upload.hint.${section}`, { max: MAX_FILES, size: MAX_FILE_MB })}
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
                    aria-label={t('upload.removeFile', { name: file.name })}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:bg-white hover:text-brand-red focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:bg-white/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Notes */}
        <Field label={t('upload.notesLabel')} optional>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t('upload.notesPlaceholder')}
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
  const { t } = useTranslation('admin')
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-brand-navy dark:text-slate-200">
        {label}
        {optional && (
          <span className="text-xs font-normal text-slate-400">{t('upload.optional')}</span>
        )}
      </span>
      {children}
    </label>
  )
}
