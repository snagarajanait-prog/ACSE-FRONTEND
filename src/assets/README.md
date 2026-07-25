# `assets/` — bundled static files

Images, SVGs and fonts that are **imported by TypeScript**, so Vite bundles,
optimises and fingerprints them.

Files that must keep a stable, predictable public URL go in `/public` instead.

## Brand logo

`logo/Main_logo.svg` is the current brand lockup and the **source of truth** for
every rendered logo:

| File | Role |
| --- | --- |
| `logo/Main_logo.svg` | **Source of truth.** The brand lockup — an SVG wrapping a single 638×220 raster (~2.9 aspect). Imported by `components/Logo.tsx` (on-screen `<img>`) and `utils/pdfTheme.ts` (which lifts the embedded PNG data URI out for jsPDF, since `addImage` can't render SVG). |
| `logo/acse-mark-silhouette.svg` | Mask for the loader's highlight sweep — a silhouette of the mark. Imported by `components/LogoAssembly.tsx`. |
| `ACSE SVG.svg` | Vector export the animated loader is decomposed from — see `components/logo/pieces.tsx`. |

### The animated loader still uses the old artwork

`components/LogoAssembly.tsx` reassembles the lockup on screen from individually
animatable vector pieces (`logo/pieces.tsx`), derived from `ACSE SVG.svg`. It is
**not** driven by `Main_logo.svg` — a raster embedded in an SVG can't be split
into animatable parts. If the brand geometry in `Main_logo.svg` differs from
`ACSE SVG.svg`, the loader's entrance will look slightly different from the
static logo until the pieces are re-derived from the new vector artwork.

### Favicons

`public/favicon.png` and `public/apple-touch-icon.png` are the mark centred on a
transparent square, and were derived from the old master — regenerate them from
`Main_logo.svg` if the icons should match the new lockup.
