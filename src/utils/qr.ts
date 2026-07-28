/**
 * A QR encoder, small enough to justify itself.
 *
 * The Home Energy Report prints a QR beside the profile prompt, captioned EASY
 * LOGIN, and the point of that square is that it removes the typing. Rendering
 * the URL as text instead would have kept the clutter and dropped the feature,
 * so this exists to put a real, scannable code on the screen and in the PDF.
 *
 * Why not a library. `qrcode` and friends are 15–40kB for a generator plus
 * renderers for canvas, SVG, terminal and PNG — all of which this codebase
 * already has better answers for, since the two call sites draw their own
 * modules (a CSS grid on screen, filled rects in jsPDF). What is actually needed
 * is "string in, boolean matrix out", which is the ~180 lines below.
 *
 * Scope, deliberately narrow — this is not a general QR library:
 *
 *   • BYTE mode only. The inputs are URLs. Numeric and alphanumeric modes pack
 *     tighter but only pay off for digits and upper-case, which a URL is not.
 *   • Versions 1–10 (21×21 to 57×57). A version-10 symbol at level M holds 213
 *     bytes; the longest thing this will ever be handed is a link.
 *   • Error correction fixed at M (~15%). L would fit more in a smaller grid, but
 *     these codes get printed, folded and photographed off paper — the same
 *     reason the real report's code is not at L either.
 *   • All eight data masks are generated and scored by the standard penalty
 *     rules, because a badly-masked code with large same-colour blocks is the
 *     usual cause of "it scanned on my phone but not on theirs".
 *
 * Implements ISO/IEC 18004. There is no test runner in this project, so it was
 * verified out of tree by three checks worth repeating if you touch it: the
 * finished matrix's format bits read back out of BOTH copies and matched against
 * the eight published level-M strings in table C.1; the Reed-Solomon syndromes
 * of every block recomputed from codewords extracted back out of the matrix
 * (non-zero means the placement, the mask or the interleave is wrong, and the RS
 * math cannot be fooled by a reader that shares a bug with the writer); and a
 * full payload round-trip. Run across versions 1, 2, 3, 4 and 8 — which covers
 * the 1-, 2- and 4-block layouts — plus a multi-byte UTF-8 string.
 *
 * That regime is what caught the one real bug in the first draft: the two copies
 * of the format information were written in the same direction, and the second
 * one ran one module too far and overwrote the fixed dark module. The symbol
 * looked perfect and would have decoded on nothing.
 */

/* ------------------------------ Galois field ------------------------------ */

/**
 * GF(256) log/antilog tables under the QR primitive polynomial 0x11D.
 *
 * Reed–Solomon needs to multiply field elements constantly, and multiplying via
 * logs turns that into an add. Built once at module load — 512 bytes.
 */
const EXP = new Uint8Array(512)
const LOG = new Uint8Array(256)
;(() => {
  let x = 1
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255]
})()

const gfMul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]])

/** The generator polynomial for `degree` error-correction codewords. */
function generatorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let d = 0; d < degree; d += 1) {
    const next = new Uint8Array(poly.length + 1)
    for (let i = 0; i < poly.length; i += 1) {
      next[i] ^= poly[i]
      next[i + 1] ^= gfMul(poly[i], EXP[d])
    }
    poly = next
  }
  return poly
}

/** Polynomial division remainder — the EC codewords for one block. */
function ecCodewords(data: Uint8Array, count: number): Uint8Array {
  const gen = generatorPoly(count)
  const rem = new Uint8Array(count)
  for (const byte of data) {
    const factor = byte ^ rem[0]
    rem.copyWithin(0, 1)
    rem[count - 1] = 0
    if (factor !== 0) for (let i = 0; i < count; i += 1) rem[i] ^= gfMul(gen[i + 1], factor)
  }
  return rem
}

/* ------------------------------ version table ----------------------------- */

/**
 * Per version at level M: [total codewords, EC codewords per block, block count].
 *
 * Straight from ISO/IEC 18004 table 9. Versions 1–10 only — see the header.
 */
const VERSIONS: [totalCodewords: number, ecPerBlock: number, blocks: number][] = [
  [26, 10, 1], // 1
  [44, 16, 1], // 2
  [70, 26, 1], // 3
  [100, 18, 2], // 4
  [134, 24, 2], // 5
  [172, 16, 4], // 6
  [196, 18, 4], // 7
  [242, 22, 4], // 8
  [292, 22, 5], // 9
  [346, 26, 5], // 10
]

/** Centres of the alignment patterns, by version. Version 1 has none. */
const ALIGNMENT: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
]

const dataCapacity = (version: number): number => {
  const [total, ecPerBlock, blocks] = VERSIONS[version - 1]
  return total - ecPerBlock * blocks
}

/* --------------------------------- encoding ------------------------------- */

class BitBuffer {
  bits: number[] = []
  put(value: number, length: number) {
    for (let i = length - 1; i >= 0; i -= 1) this.bits.push((value >>> i) & 1)
  }
}

/** Byte-mode payload: mode nibble, length, data, terminator, pad. */
function encodeData(bytes: Uint8Array, version: number): Uint8Array {
  const capacity = dataCapacity(version) * 8
  const buf = new BitBuffer()
  buf.put(0b0100, 4) // byte mode
  buf.put(bytes.length, version <= 9 ? 8 : 16)
  for (const b of bytes) buf.put(b, 8)

  // Terminator, then pad to a byte boundary, then the alternating pad bytes.
  buf.put(0, Math.min(4, capacity - buf.bits.length))
  while (buf.bits.length % 8 !== 0) buf.bits.push(0)

  const out = new Uint8Array(capacity / 8)
  for (let i = 0; i < buf.bits.length; i += 8) {
    let byte = 0
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | buf.bits[i + j]
    out[i / 8] = byte
  }
  for (let i = buf.bits.length / 8, alt = 0; i < out.length; i += 1, alt += 1) {
    out[i] = alt % 2 === 0 ? 0xec : 0x11
  }
  return out
}

/**
 * Splits into blocks, appends each block's EC, then interleaves.
 *
 * The interleave is what makes a QR survive a scratch: a burst of damage lands
 * across many blocks a little rather than one block fatally.
 */
function interleave(data: Uint8Array, version: number): Uint8Array {
  const [, ecPerBlock, blockCount] = VERSIONS[version - 1]
  const shortLen = Math.floor(data.length / blockCount)
  const longCount = data.length % blockCount

  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []
  let at = 0
  for (let b = 0; b < blockCount; b += 1) {
    const len = shortLen + (b >= blockCount - longCount ? 1 : 0)
    const block = data.subarray(at, at + len)
    at += len
    dataBlocks.push(block)
    ecBlocks.push(ecCodewords(block, ecPerBlock))
  }

  const out: number[] = []
  const maxData = Math.max(...dataBlocks.map((b) => b.length))
  for (let i = 0; i < maxData; i += 1)
    for (const block of dataBlocks) if (i < block.length) out.push(block[i])
  for (let i = 0; i < ecPerBlock; i += 1) for (const block of ecBlocks) out.push(block[i])
  return Uint8Array.from(out)
}

/* --------------------------------- matrix --------------------------------- */

type Grid = (boolean | null)[][]

const inRange = (n: number, size: number) => n >= 0 && n < size

function placeFinder(grid: Grid, reserved: boolean[][], row: number, col: number) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r
      const cc = col + c
      if (!inRange(rr, grid.length) || !inRange(cc, grid.length)) continue
      const edge = r === 0 || r === 6 || c === 0 || c === 6
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4
      grid[rr][cc] = edge || core
      reserved[rr][cc] = true
    }
  }
}

/** Builds the function patterns and marks every module they own as reserved. */
function baseGrid(version: number): { grid: Grid; reserved: boolean[][] } {
  const size = version * 4 + 17
  const grid: Grid = Array.from({ length: size }, () => Array<boolean | null>(size).fill(null))
  const reserved = Array.from({ length: size }, () => Array<boolean>(size).fill(false))

  placeFinder(grid, reserved, 0, 0)
  placeFinder(grid, reserved, 0, size - 7)
  placeFinder(grid, reserved, size - 7, 0)

  // Timing patterns.
  for (let i = 8; i < size - 8; i += 1) {
    const on = i % 2 === 0
    grid[6][i] = on
    grid[i][6] = on
    reserved[6][i] = true
    reserved[i][6] = true
  }

  // Alignment patterns, skipping the three that would sit on a finder.
  const centres = ALIGNMENT[version]
  for (const r of centres) {
    for (const c of centres) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          grid[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1
          reserved[r + dr][c + dc] = true
        }
      }
    }
  }

  // Format-information area, plus the lone dark module.
  for (let i = 0; i < 9; i += 1) {
    if (!reserved[8][i]) reserved[8][i] = true
    if (!reserved[i][8]) reserved[i][8] = true
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true
    reserved[size - 1 - i][8] = true
  }
  grid[size - 8][8] = true
  reserved[size - 8][8] = true

  return { grid, reserved }
}

/** Lays the codeword stream in the standard up/down zig-zag, right to left. */
function placeData(grid: Grid, reserved: boolean[][], codewords: Uint8Array) {
  const size = grid.length
  let bit = 0
  let upward = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right -= 1 // the vertical timing column is not a data column
    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step
      for (const col of [right, right - 1]) {
        if (reserved[row][col]) continue
        const byte = codewords[bit >>> 3]
        grid[row][col] = byte !== undefined && ((byte >>> (7 - (bit & 7))) & 1) === 1
        bit += 1
      }
    }
    upward = !upward
  }
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
]

/** Format bits: 5 data bits, BCH(15,5), XOR 0x5412. Level M is 0b00. */
function formatBits(maskIndex: number): number {
  const data = (0b00 << 3) | maskIndex
  let rem = data
  for (let i = 0; i < 10; i += 1) {
    rem <<= 1
    if (rem & 0x400) rem ^= 0x537
  }
  return ((data << 10) | rem) ^ 0x5412
}

/**
 * Writes both copies of the 15 format bits.
 *
 * The two copies do NOT run in the same direction, which is the trap here: the
 * strip beside the top-left finder is read one way and the split strip along the
 * far edges the other. Getting them symmetric produces a symbol that looks
 * perfect and decodes on nothing.
 *
 * The dark module at (size−8, 8) is set LAST, because the bottom-left format
 * strip stops one short of it and an off-by-one there overwrites the one module
 * in a QR code whose value is fixed by the standard.
 */
function applyFormat(grid: Grid, maskIndex: number) {
  const size = grid.length
  const bits = formatBits(maskIndex)
  const on = (i: number) => ((bits >>> i) & 1) === 1

  for (let i = 0; i < 15; i += 1) {
    // Copy 1 — down column 8, skipping the horizontal timing row at 6.
    if (i < 6) grid[i][8] = on(i)
    else if (i < 8) grid[i + 1][8] = on(i)
    else grid[size - 15 + i][8] = on(i)

    // Copy 2 — right to left along row 8, skipping the vertical timing column.
    if (i < 8) grid[8][size - 1 - i] = on(i)
    else if (i === 8) grid[8][7] = on(i)
    else grid[8][14 - i] = on(i)
  }

  grid[size - 8][8] = true
}

/** The four standard penalty rules. Lower is better. */
function penalty(m: boolean[][]): number {
  const size = m.length
  let score = 0

  // Rule 1 — runs of five or more of the same colour, both directions.
  for (let i = 0; i < size; i += 1) {
    for (const read of [(j: number) => m[i][j], (j: number) => m[j][i]]) {
      let run = 1
      for (let j = 1; j < size; j += 1) {
        if (read(j) === read(j - 1)) {
          run += 1
          if (run === 5) score += 3
          else if (run > 5) score += 1
        } else run = 1
      }
    }
  }

  // Rule 2 — every 2×2 block of one colour.
  for (let r = 0; r < size - 1; r += 1)
    for (let c = 0; c < size - 1; c += 1)
      if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1])
        score += 3

  // Rule 3 — the finder-lookalike 1:1:3:1:1 pattern with four light modules.
  const A = [true, false, true, true, true, false, true, false, false, false, false]
  const B = [false, false, false, false, true, false, true, true, true, false, true]
  const matches = (read: (j: number) => boolean, at: number, pat: boolean[]) =>
    pat.every((want, k) => read(at + k) === want)
  for (let i = 0; i < size; i += 1) {
    for (const read of [(j: number) => m[i][j], (j: number) => m[j][i]]) {
      for (let j = 0; j + 11 <= size; j += 1) {
        if (matches(read, j, A)) score += 40
        if (matches(read, j, B)) score += 40
      }
    }
  }

  // Rule 4 — deviation from a 50/50 light/dark balance.
  const dark = m.reduce((s, row) => s + row.filter(Boolean).length, 0)
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10

  return score
}

/* ---------------------------------- api ----------------------------------- */

/**
 * Encodes `text` and returns the symbol as a square boolean matrix, `true` for a
 * dark module. No quiet zone — the caller owns its own padding, because the
 * screen and the PDF want different amounts of it.
 *
 * Throws if the text will not fit in a version-10 symbol at level M (213 bytes).
 */
export function qrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)

  const version = VERSIONS.findIndex((_, i) => {
    const capacity = dataCapacity(i + 1)
    const header = 2 + (i + 1 <= 9 ? 1 : 2) // mode + length, in whole bytes
    return bytes.length + header <= capacity
  })
  if (version === -1) {
    throw new Error(`qrMatrix: ${bytes.length} bytes exceeds the version-10 level-M limit`)
  }
  const v = version + 1

  const codewords = interleave(encodeData(bytes, v), v)
  const { grid, reserved } = baseGrid(v)
  placeData(grid, reserved, codewords)

  // Generate all eight masks, keep the one the penalty rules like best.
  let best: boolean[][] | null = null
  let bestScore = Infinity
  for (let maskIndex = 0; maskIndex < 8; maskIndex += 1) {
    const candidate: Grid = grid.map((row) => [...row])
    for (let r = 0; r < candidate.length; r += 1)
      for (let c = 0; c < candidate.length; c += 1)
        if (!reserved[r][c] && MASKS[maskIndex](r, c)) candidate[r][c] = !candidate[r][c]
    applyFormat(candidate, maskIndex)

    const solid = candidate.map((row) => row.map((cell) => cell === true))
    const score = penalty(solid)
    if (score < bestScore) {
      bestScore = score
      best = solid
    }
  }

  return best as boolean[][]
}
