/**
 * Split a "done" line into its body and any trailing reference id
 * (e.g. "…reference SR-4471-190." -> { body, ref: "SR-4471-190" }), so the id can
 * be typeset as a chip. Kept as one function so the parsing rule lives in
 * exactly one place.
 */

export interface SplitReference {
  body: string
  ref: string | null
}

export function splitReference(text: string): SplitReference {
  const match = text.match(/\b([A-Z]{2,}-[A-Z0-9-]+)\b\.?$/)
  if (!match) return { body: text, ref: null }
  return {
    body: text.slice(0, match.index).replace(/(reference\s*)$/i, '').trim(),
    ref: match[1],
  }
}
