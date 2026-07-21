/**
 * The admin sign-in screen — shown by `AdminGate` in place of the whole panel
 * until a session exists.
 *
 * A two-pane split on a single floating panel: a marketing hero on the left
 * ("Empowering the utility management") and a glass sign-in card on the right
 * (email/username, password with a show/hide toggle, a "remember me" switch and
 * a submit button that spins while signing in). The panel background is the two
 * `Glass_Ribbon` SVGs plus a soft brand wash; the left pane collapses on small
 * screens so the card takes the full width.
 *
 * Credentials are checked by the real `/auth/login` (see `useAdminAuth`) — this
 * file is presentation only and never touches the API or token directly. Chrome
 * mirrors the rest of the app (ACSE·AI lockup, theme toggle) so the gate reads
 * as part of the product.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import ribbonLeft from '@/assets/login/Glass_Ribbon_Left.svg'
import ribbonRight from '@/assets/login/Glass_Ribbon_Right.svg'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/utils/cn'
import { useAdminAuth } from '@/containers/admin/auth/useAdminAuth'

/** Underline-style field: no box, just a rule that lights cyan on focus. */
const FIELD_INPUT =
  'peer w-full border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm text-brand-navy outline-none transition-colors placeholder:text-slate-400 focus:border-brand-cyan dark:border-white/15 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-cyan'

const FIELD_LABEL = 'block text-xs font-medium text-slate-500 dark:text-slate-400'

export default function AdminLogin() {
  const { signIn, signingIn, error, clearError } = useAdminAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void signIn(email, password)
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-slate-100 p-4 font-sans text-brand-navy antialiased sm:p-6 dark:bg-brand-navydeep dark:text-slate-100">
      {/* The floating panel. `isolate` scopes the ribbons' blend mode; `overflow-hidden`
          clips their bleed to the rounded corners. */}
      <div className="relative isolate grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-200/70 motion-safe:animate-fade-in lg:grid-cols-2 dark:bg-brand-navy dark:shadow-black/40 dark:ring-white/10">
        <Backdrop />

        <ThemeToggle className="absolute right-4 top-4 z-20 h-9 w-9" />

        <MarketingPane />

        {/* Sign-in card — centred on small screens, nudged toward the right edge on
            large ones to match the reference. */}
        <section className="relative z-10 flex items-center justify-center px-5 py-12 sm:px-8 lg:justify-end lg:py-14 lg:pr-12 xl:pr-16">
          <div className="w-full max-w-sm rounded-2xl bg-white/80 p-6 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200/80 backdrop-blur-xl sm:p-8 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10">
            <div className="flex items-center gap-1.5">
              <Logo className="h-8" />
              <span className="text-sm font-bold tracking-tight text-brand-cyan">AI</span>
            </div>

            <h1 className="mt-6 text-2xl font-bold tracking-tight text-brand-navy dark:text-slate-100">
              Welcome back!
            </h1>

            <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
              <div>
                <label htmlFor="admin-identifier" className={FIELD_LABEL}>
                  Email or Username
                </label>
                <input
                  id="admin-identifier"
                  type="text"
                  value={email}
                  autoFocus
                  autoComplete="username"
                  aria-invalid={Boolean(error)}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) clearError()
                  }}
                  placeholder="you@company.com"
                  className={cn(FIELD_INPUT, 'mt-1.5')}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className={FIELD_LABEL}>
                  Password
                </label>
                <div className="relative mt-1.5">
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
                    className={cn(FIELD_INPUT, 'pr-8')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 outline-none transition-colors hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-cyan dark:hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  id="admin-login-error"
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20"
                >
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-3 pt-1">
                <RememberToggle checked={remember} onChange={setRemember} />

                <button
                  type="submit"
                  disabled={signingIn}
                  className="inline-flex h-11 min-w-[7.5rem] items-center justify-center gap-2 rounded-full bg-brand-navy px-7 text-sm font-semibold uppercase tracking-wide text-white shadow-sm outline-none transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 dark:bg-brand-cyan dark:text-brand-navy dark:focus-visible:ring-offset-brand-navy"
                >
                  {signingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    'Log in'
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * The left hero. Hidden below `lg` so the card owns the full width on phones;
 * the panel's shared backdrop still shows through, so it never reads as plain.
 */
function MarketingPane() {
  return (
    <section className="relative z-10 hidden flex-col justify-center p-10 lg:flex xl:p-14">
      <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-brand-navy xl:text-5xl dark:text-white">
        Empowering the{' '}
        <span className="bg-gradient-to-r from-brand-cyan to-[#1b7fa8] bg-clip-text text-transparent">
          utility management
        </span>
      </h2>
      <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Manage customer accounts, service requests, billing, outages, field operations, and
        analytics from a secure, centralized platform designed for modern utility providers.
      </p>
    </section>
  )
}

/**
 * The shared panel background: a light base, a soft brand wash, and the two
 * glass-ribbon SVGs anchored to diagonally-opposite corners — left ribbon
 * top-left, right ribbon bottom-right, matching the reference. Each is pulled
 * off its corner with negative offsets so only the soft flowing part shows and
 * the artwork's straight edge is clipped away by the panel's rounded overflow.
 * Purely decorative and dimmed on dark, where the ribbons' `darken` blend would
 * otherwise vanish.
 */
function Backdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden rounded-[1.75rem]"
    >
      {/* Corner washes echoing the ribbons so the tint reads even where the art is faint. */}
      <div className="absolute inset-0 bg-[radial-gradient(75%_60%_at_0%_0%,rgba(44,165,217,0.12),transparent_60%),radial-gradient(70%_60%_at_100%_100%,rgba(139,120,220,0.10),transparent_60%)] dark:bg-[radial-gradient(75%_60%_at_0%_0%,rgba(44,165,217,0.20),transparent_62%)]" />
      {/* Top-left ribbon (the `Right` artwork) — masked so its inner (bounding-box)
          edge fades to nothing and only the soft corner flow shows. The tall art
          suits the vertical left edge, so it's sized by height. */}
      <img
        src={ribbonRight}
        alt=""
        style={{
          WebkitMaskImage: 'linear-gradient(to right, #000 42%, transparent 82%)',
          maskImage: 'linear-gradient(to right, #000 42%, transparent 82%)',
        }}
        className="absolute -left-4 -top-8 h-[112%] w-auto dark:opacity-25"
      />
      {/* Bottom-right ribbon (the `Left` artwork) — same inward fade, opposite
          corner. The wide art is sized by width. */}
      <img
        src={ribbonLeft}
        alt=""
        style={{
          WebkitMaskImage: 'radial-gradient(140% 140% at 82% 78%, #000 40%, transparent 80%)',
          maskImage: 'radial-gradient(140% 140% at 82% 78%, #000 40%, transparent 80%)',
        }}
        className="absolute -bottom-20 -right-16 w-[52%] max-w-[500px] dark:opacity-25"
      />
    </div>
  )
}

/** A small iOS-style switch for "remember me". */
function RememberToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-brand-navy',
          checked ? 'bg-brand-cyan' : 'bg-slate-300 dark:bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
      <span className="whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300">
        Remember me
      </span>
    </label>
  )
}
