/**
 * Delete confirmation. Destructive and irreversible in the demo (there is no
 * trash/restore), so the action gets an explicit confirm step and a red button.
 */

import { AlertTriangle } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import type { FileRecord } from '@/containers/admin/types'
import Modal from '@/containers/admin/components/Modal'

interface ConfirmDeleteDialogProps {
  record: FileRecord | null
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDeleteDialog({
  record,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation('admin')
  return (
    <Modal
      open={Boolean(record)}
      onClose={onCancel}
      title={t('confirmDelete.title')}
      className="max-w-sm"
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-cyan dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {t('confirmDelete.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 items-center rounded-lg bg-brand-red px-4 text-sm font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t('confirmDelete.confirm')}
          </button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-red/10 text-brand-red">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <Trans
            t={t}
            i18nKey="confirmDelete.body"
            values={{ name: record?.fileName }}
            components={{ 1: <span className="font-semibold text-brand-navy dark:text-slate-100" /> }}
          />
        </p>
      </div>
    </Modal>
  )
}
