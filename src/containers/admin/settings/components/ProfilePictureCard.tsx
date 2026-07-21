/**
 * Organisation avatar: the current picture (uploaded logo or an initials
 * monogram) beside a click-or-drag upload zone. Accepts PNG/JPG; the hook
 * validates type and size and reports any problem back via `error`.
 */

import { useRef, useState } from 'react'
import { Image as ImageIcon, Trash2, UploadCloud } from 'lucide-react'
import SettingCard from '@/containers/admin/settings/components/SettingCard'
import { initials } from '@/containers/admin/utils/format'
import { cn } from '@/utils/cn'

interface ProfilePictureCardProps {
  companyName: string
  logoDataUrl: string | null
  error: string
  onPick: (file: File) => void
  onRemove: () => void
}

export default function ProfilePictureCard({
  companyName,
  logoDataUrl,
  error,
  onPick,
  onRemove,
}: ProfilePictureCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <SettingCard
      icon={ImageIcon}
      title="Profile Picture"
      description="Upload a logo or avatar for your organization"
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* Avatar + change button */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt={companyName}
              className="h-24 w-24 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-white/10"
            />
          ) : (
            <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-cyan text-2xl font-bold text-white shadow-sm">
              {initials(companyName)}
            </span>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              <UploadCloud className="h-3.5 w-3.5" aria-hidden />
              Change Picture
            </button>
            {logoDataUrl && (
              <button
                type="button"
                onClick={onRemove}
                aria-label="Remove picture"
                title="Remove picture"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 outline-none transition-colors hover:bg-brand-red/10 hover:text-brand-red focus-visible:ring-2 focus-visible:ring-brand-red"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dropzone */}
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
            const file = e.dataTransfer.files?.[0]
            if (file) onPick(file)
          }}
          className={cn(
            'flex min-h-[112px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-6 py-6 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
            dragging
              ? 'border-brand-cyan bg-brand-cyan/5'
              : 'border-slate-200 hover:border-brand-cyan/60 hover:bg-slate-50/60 dark:border-white/15 dark:hover:border-brand-cyan/50 dark:hover:bg-white/[0.03]',
          )}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-cyan/10 text-brand-cyan">
            <UploadCloud className="h-4.5 w-4.5" aria-hidden />
          </span>
          <span className="text-sm font-medium text-brand-navy dark:text-slate-200">
            {dragging ? 'Drop to upload' : 'Click or drag to upload'}
          </span>
          <span className="text-xs text-slate-400">PNG or JPG · up to 1 MB</span>
        </button>
      </div>

      {error && <p className="mt-3 text-xs font-medium text-brand-red">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
    </SettingCard>
  )
}
