# `components/` — global reusable UI

Starts empty on purpose. **Promote on the second reuse, not the first.**

A component belongs here once **2+ features** use it. Until then it lives in
`containers/<feature>/components/`.

Rules that keep these reusable:

- **Props in, events out.** No `useSelector`, no direct store access, no data fetching.
- Presentational and feature-agnostic — a component here must not know which screen renders it.
- Typed props via an exported `interface`.
