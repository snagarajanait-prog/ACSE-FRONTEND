# `assets/` — bundled static files

Images, SVGs and fonts that are **imported by TypeScript**, so Vite bundles,
optimises and fingerprints them.

Files that must keep a stable, predictable public URL go in `/public` instead.

## Brand logo

| File | Role |
| --- | --- |
| `ACSE PNG.png` | **Source of truth.** The brand master: 8334×8334 RGBA, transparent. Not imported by any code. |
| `ACSE SVG.svg` | Vector master (Adobe Illustrator export, true paths, 9KB). Not imported by any code — see the note below. |
| `acse-solutions-logo.png` | **What `components/Logo.tsx` imports.** 900×470, derived from the master. |
| `acse-logo.png` | Superseded artwork (the older lockup, with the `\| AI` suffix). Unreferenced — kept only because the loader's layer split in `assets/logo/` was originally traced from it. |

### Why the logo is derived rather than imported directly

In the master the mark occupies just **29% of the canvas** (ink box 6412×3351
inside 8334×8334). Importing it and applying `h-8 w-auto` would size the *padded
square*, rendering the mark at roughly 12px tall — and shipping 492KB to do it.
`acse-solutions-logo.png` is that master trimmed to the ink box and downsampled
to 900×470 (36KB), which is what every surface renders.

### Regenerating it

If the master is ever replaced, redo the trim. The one-off script alpha-weights
its box filter — averaging straight RGB pulls the transparent white padding into
the edges and haloes the artwork on the navy navbar and dark footer. Also
regenerate `public/favicon.png` and `public/apple-touch-icon.png`, which are the
same ink box centred on a transparent square.

### Worth considering

`ACSE SVG.svg` is genuine vector — 15 paths, no embedded bitmaps, brand hexes
intact (`#2CA5D9`, `#E33935`, `#6D6E71`). At 9KB it is a quarter the size of the
derived PNG, stays crisp at every size and DPR, and needs no regeneration step
when the artwork changes (padding is trimmed losslessly via `viewBox`). Switching
`Logo.tsx` to it would remove this whole derivation pipeline.
