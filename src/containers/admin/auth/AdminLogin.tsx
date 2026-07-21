/**
 * The admin sign-in screen — shown by `AdminGate` in place of the whole panel
 * until a session exists.
 *
 * A single centred card: email, password (with a show/hide toggle), a submit
 * button that spins while signing in, and an inline error. The demo account is
 * printed under the form because there's no backend to check against yet (see
 * `credentials.ts`). Chrome mirrors the rest of the app — client brand up top,
 * ACSE "powered by" at the foot, a theme toggle in the corner — so the gate reads
 * as part of the product, not a bolted-on wall.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { useAppSelector } from '@/redux/hooks'
import { cn } from '@/utils/cn'
import { DEMO_ADMIN } from '@/containers/admin/auth/credentials'
import { useAdminAuth } from '@/containers/admin/auth/useAdminAuth'

const INPUT_CLASS =
  'h-11 w-full rounded-xl bg-white pl-9 pr-3 text-sm text-brand-navy outline-none ring-1 ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-cyan dark:bg-white/[0.04] dark:text-slate-100 dark:ring-white/10 dark:placeholder:text-slate-500'

export default function AdminLogin() {
  const { signIn, signingIn, error, clearError } = useAdminAuth()
  const companyName = useAppSelector((s) => s.settingsSlice.companyName)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    signIn(email, password)
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-slate-50 font-sans text-brand-navy antialiased transition-colors duration-300 dark:bg-brand-navydeep dark:text-slate-100">
      {/* Ambient brand wash — barely-there on light, a soft cyan glow on dark, so
          the sign-in feels like the copilot rather than a plain form. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_-8%,rgba(44,165,217,0.10),transparent_70%)] dark:bg-[radial-gradient(60%_50%_at_50%_-10%,rgba(44,165,217,0.18),transparent_72%)]" />
        <div className="brand-dot-grid absolute inset-0 opacity-0 transition-opacity dark:opacity-[0.30]" />
      </div>

      <div className="relative z-10 flex items-center justify-end p-4">
        <ThemeToggle className="h-9 w-9" />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 pb-20">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-navy text-white shadow-sm dark:shadow-none dark:ring-1 dark:ring-white/10">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-brand-navy dark:text-slate-100">
              Admin sign in
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sign in to manage {companyName}
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            noValidate
            className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-white/[0.03] dark:shadow-none dark:ring-white/10 dark:backdrop-blur"
          >
            <label
              htmlFor="admin-email"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Email address
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                id="admin-email"
                type="email"
                value={email}
                autoFocus
                autoComplete="email"
                aria-invalid={Boolean(error)}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) clearError()
                }}
                placeholder="you@company.com"
                className={INPUT_CLASS}
              />
            </div>

            <label
              htmlFor="admin-password"
              className="mt-4 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'admin-login-error' : undefined}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) clearError()
                }}
                placeholder="••••••••"
                className={cn(INPUT_CLASS, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <p
                id="admin-login-error"
                role="alert"
                className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-[#1b7fa8] text-sm font-semibold text-white shadow-sm outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"
            >
              {signingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </button>

            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500 ring-1 ring-slate-100 dark:bg-white/[0.03] dark:text-slate-400 dark:ring-white/[0.06]">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Demo access</span>{' '}
              — not wired to a live server yet. Sign in with{' '}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[10.5px] text-brand-navy ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                {DEMO_ADMIN.email}
              </code>{' '}
              /{' '}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[10.5px] text-brand-navy ring-1 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/10">
                {DEMO_ADMIN.password}
              </code>
              .
            </div>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Powered by
            </span>
            <Logo className="h-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
