/**
 * The identity gate: an account picked from the list is held here until the
 * visitor confirms an email and keys the one-time code in. Shown in place of the
 * list.
 *
 * Both steps are wired to the real backend (see `useAccessGate`): the email step
 * calls `send-code`, the code step calls `verify-code`. There is no real inbox,
 * so the code `send-code` returns is shown on screen for the visitor to enter.
 *
 * Modes wired to a live session never reach this screen; see `useAccessGate`.
 */

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import OtpInput from '@/containers/copilot/components/OtpInput'
import { useAccessGate } from '@/containers/copilot/hooks/useAccessGate'
import type { ApiError } from '@/types'
import { cn } from '@/utils/cn'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** r.chen@example.com → r•••••@example.com — a hint, not a giveaway. */
function maskEmail(email: string) {
  const [user, domain] = email.split('@')
  if (!domain) return email
  return `${user[0]}${'•'.repeat(Math.max(user.length - 1, 1))}@${domain}`
}

const GHOST_CLASS =
  'text-slate-500 hover:text-brand-navy dark:text-slate-400 dark:hover:text-white'

export default function AccountVerify() {
  const { t } = useTranslation('copilot')
  const gate = useAccessGate()
  const [email, setEmail] = useState(gate.email)
  const [error, setError] = useState<string | null>(null)
  // Bumped on a rejected code so the OtpInput remounts empty for another try.
  const [attempt, setAttempt] = useState(0)

  if (!gate.pending) return null
  const { customer, account } = gate.pending

  const handleEmail = async (e: FormEvent) => {
    e.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      // Instant field-level feedback for a client-side format slip.
      setError(t('verify.emailError'))
      return
    }
    setError(null)
    try {
      await gate.sendCode(value)
      toast.success(t('verify.toast.codeSent'))
    } catch (err) {
      // Prefer the backend's message; fall back to a generic line.
      toast.error((err as ApiError)?.message || t('verify.sendError'))
    }
  }

  const handleCode = async (code: string) => {
    try {
      await gate.submitCode(code)
      // On success the context is granted and this screen unmounts.
      toast.success(t('verify.toast.verified'))
    } catch (err) {
      // e.g. "Invalid or expired verification code" (HTTP 401) straight from the API.
      toast.error((err as ApiError)?.message || t('verify.codeError'))
      setAttempt((n) => n + 1)
    }
  }

  return (
    <div className="scrollbar-slim h-full overflow-y-auto bg-slate-50/60 px-4 py-8 dark:bg-transparent">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.03] dark:shadow-none dark:ring-white/10 dark:backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-cyan/10 text-brand-cyan dark:bg-brand-cyan/15">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-brand-navy dark:text-slate-100">
              {t('verify.title')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {gate.step === 'email' ? t('verify.stepEmail') : t('verify.stepCode')}
            </p>
          </div>
        </div>

        {/* The account being unlocked — the pick is not the context yet. */}
        <div className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100 dark:bg-white/[0.04] dark:ring-white/[0.06]">
          <p className="text-sm font-medium text-brand-navy dark:text-slate-100">{customer.name}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            {account.id} · {account.serviceAddress}
          </p>
        </div>

        {gate.step === 'email' ? (
          <form onSubmit={handleEmail} className="mt-5" noValidate>
            <label
              htmlFor="verify-email"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              {t('verify.emailLabel')}
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                id="verify-email"
                type="email"
                value={email}
                autoFocus
                autoComplete="email"
                aria-invalid={Boolean(error)}
                aria-describedby="verify-email-help"
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder={maskEmail(customer.email)}
                className="h-11 w-full rounded-xl bg-white pl-9 pr-3 text-sm text-brand-navy outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-cyan dark:bg-white/[0.04] dark:text-slate-100 dark:ring-white/10 dark:placeholder:text-slate-500"
              />
            </div>

            {error && (
              <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <p id="verify-email-help" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('verify.emailHelp')}
            </p>

            <button
              type="submit"
              disabled={gate.sending}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan text-sm font-semibold text-white outline-none transition-colors hover:bg-brand-cyan/90 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {gate.sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('verify.sending')}
                </>
              ) : (
                t('verify.sendCode')
              )}
            </button>

            <BackButton onClick={gate.cancel}>{t('verify.backToCustomers')}</BackButton>
          </form>
        ) : (
          <div className="mt-5">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <Trans
                t={t}
                i18nKey="verify.codeSent"
                values={{ email: gate.email }}
                components={{
                  1: <span className="font-medium text-brand-navy dark:text-slate-100" />,
                }}
              />
            </p>

            {/* No real inbox: the code the backend generated is shown here for the
                visitor to key into the boxes below. */}
            <div className="mt-4 rounded-xl border border-dashed border-brand-cyan/50 bg-brand-cyan/5 px-4 py-3 text-center dark:border-brand-cyan/40 dark:bg-brand-cyan/10">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('verify.yourCode')}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-[0.4em] text-brand-cyan">
                {gate.displayCode}
              </p>
            </div>

            <OtpInput
              key={attempt}
              onSubmit={handleCode}
              disabled={gate.verifying}
              className="mt-4"
            />

            {gate.verifying ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('verify.verifying')}
              </p>
            ) : (
              // A wrong/expired code surfaces as a toast (see `handleCode`), not here.
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {t('verify.codeHint')}
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  gate.editEmail()
                }}
                className={cn(
                  '-mx-2 inline-flex min-h-[32px] items-center rounded-md px-2 text-xs font-medium underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-brand-cyan',
                  GHOST_CLASS,
                )}
              >
                {t('verify.differentEmail')}
              </button>
              <button
                type="button"
                onClick={gate.cancel}
                className={cn(
                  '-mx-2 inline-flex min-h-[32px] items-center rounded-md px-2 text-xs font-medium underline-offset-4 outline-none transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-brand-cyan',
                  GHOST_CLASS,
                )}
              >
                {t('verify.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BackButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'mx-auto mt-3 flex min-h-[32px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan',
        GHOST_CLASS,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {children}
    </button>
  )
}
