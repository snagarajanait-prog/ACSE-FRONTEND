/**
 * Orb lab — a scratch screen for choosing the copilot hero sphere.
 *
 * Two views of every candidate, because they are judged differently: a large
 * tile that shows what the treatment actually *is*, and the real hero mock at
 * the real size, which is where most candidates fall apart. Picking from the
 * large tile alone is how you ship an orb that turns to mush in production.
 *
 * Sizes are quoted as SPHERE DIAMETER, not component box, so the WebGL orb
 * (whose box includes its glow margin) is compared like for like — see `scale`
 * in `catalog.ts`.
 *
 * DEMO SCOPE — delete this folder and its `routes.ts` entry once a variant is
 * chosen. Nothing else imports it.
 */

import { useState } from 'react'
import { ORB_VARIANTS, type OrbVariant } from './catalog'

/** Sphere diameter of the live page hero, for the size-critical row. */
const HERO_DIAMETER = 69

function sizeFor(variant: OrbVariant, diameter: number) {
  return Math.round(diameter * (variant.scale ?? 1))
}

export default function OrbLab() {
  const [selected, setSelected] = useState(ORB_VARIANTS[0])
  const [diameter, setDiameter] = useState(HERO_DIAMETER)

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 dark:bg-brand-navydeep">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-brand-navy dark:text-slate-100">
            Copilot orb — candidates
          </h1>
          <p className="mt-2 text-[15px] text-slate-500 dark:text-slate-400">
            Nine treatments for the hero sphere. Click one to preview it in the real hero layout
            below. Use the app&apos;s theme toggle to check both palettes.
          </p>
        </header>

        {/* Gallery. Each tile shows the treatment large enough to actually see. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ORB_VARIANTS.map((variant) => {
            const { Component } = variant
            const isSelected = variant.id === selected.id
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelected(variant)}
                className={`flex flex-col items-center rounded-2xl border p-5 text-center transition-colors ${
                  isSelected
                    ? 'border-brand-cyan bg-white ring-2 ring-brand-cyan/40 dark:bg-brand-navy/50'
                    : 'border-slate-200 bg-white hover:border-brand-cyan/50 dark:border-white/10 dark:bg-brand-navy/25 dark:hover:border-brand-cyan/40'
                }`}
              >
                <div className="grid h-44 w-full place-items-center">
                  <Component size={sizeFor(variant, 130)} />
                </div>
                <span className="mt-4 text-sm font-semibold text-brand-navy dark:text-slate-100">
                  {variant.name}
                </span>
                <span className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {variant.note}
                </span>
              </button>
            )
          })}
        </div>

        {/* The row that decides it: every candidate at the size it actually ships. */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            All nine at hero size ({diameter}px sphere)
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-8 rounded-2xl border border-slate-200 bg-white px-8 py-10 dark:border-white/10 dark:bg-brand-navy/25">
            {ORB_VARIANTS.map((variant) => {
              const { Component } = variant
              return (
                <div key={variant.id} className="flex flex-col items-center gap-3">
                  <div className="grid h-36 w-36 place-items-center">
                    <Component size={sizeFor(variant, diameter)} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{variant.name}</span>
                </div>
              )
            })}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            Sphere diameter
            <input
              type="range"
              min={40}
              max={140}
              value={diameter}
              onChange={(event) => setDiameter(Number(event.target.value))}
              className="w-56 accent-brand-cyan"
            />
            <span className="tabular-nums">{diameter}px</span>
          </label>
        </section>

        {/* In situ. Copy and spacing mirror the copilot hero. */}
        <section className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            In the hero — {selected.name}
          </h2>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-16 dark:border-white/10 dark:bg-brand-navy/25">
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
              <selected.Component size={sizeFor(selected, HERO_DIAMETER)} className="mb-6" />
              <h1 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-brand-navy md:text-4xl dark:text-slate-100">
                Good afternoon, Robert.
                <br />
                How can I help you today?
              </h1>
              <p className="mt-3 text-[15px] text-slate-500 dark:text-slate-400">
                Ask about a bill, start or stop service, or report a leak — I&apos;ll walk it
                through.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
