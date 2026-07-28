/**
 * Refuses code, scripts and markup in the chat composers.
 *
 * The chat box is a customer-support field: everything typed into it is POSTed to
 * the backend and forwarded verbatim to the ML service, which may quote it back,
 * store it on the transcript and hand it to tools. A pasted `<script>`, a shell
 * one-liner or a `DROP TABLE` has no legitimate reason to travel that path, so it
 * is stopped at the box rather than sanitised somewhere downstream where every
 * consumer has to remember to escape it again.
 *
 * WHAT THIS IS NOT: it is not the app's XSS defence. React already escapes what it
 * renders and nothing in the thread uses `dangerouslySetInnerHTML`, so a payload
 * that reaches the screen is inert. This guard exists so the payload never leaves
 * the browser in the first place — it narrows what the backend, the model and the
 * transcript ever have to deal with.
 *
 * ## Tuned against the questions customers actually ask
 *
 * "Why is my bill $250 for June?", "meter no. 12/3-456", "12 O'Brien St, Apt 4B"
 * and "AC & heating" must all send. So the rules key on CODE SHAPE — a tag with a
 * name, a call with parentheses, a statement with a keyword — never on a single
 * suspicious character. A bare `<`, `&`, `$` or `'` is ordinary prose here.
 */

/** Roughly what was found, so the caller can log or phrase the refusal. */
export type UnsafeKind = 'markup' | 'script' | 'command' | 'query' | 'code'

export interface UnsafeMatch {
  kind: UnsafeKind
  /** The rule that fired. A debugging aid — never show this to a customer. */
  rule: string
}

/**
 * Zero-width characters and bidi overrides — invisible on screen, so in a chat
 * message they only ever serve to break up a word a filter is looking for (a
 * zero-width space wedged into `<script>`).
 */
const INVISIBLE = /[\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g

/**
 * Control codes, which hide a payload the same way. Tab and newline are kept: the
 * line structure is itself evidence (see `looksLikeSource`), and both are ordinary
 * in a typed message.
 */
const CONTROL = /\p{Cc}/gu

const NAMED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
  sol: '/',
  lpar: '(',
  rpar: ')',
  colon: ':',
}

/**
 * Fold away the tricks that hide a payload from a plain match, so a zero-width
 * space wedged into `<script>`, `&#60;script&#62;` and `%3Cscript%3E` are all judged
 * as the `<script>` they become once something downstream decodes them.
 *
 * Decoding is for DETECTION ONLY — the decoded string is never used as the value.
 */
function decodeForMatching(text: string): string {
  const fromCode = (code: number): string =>
    Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''

  return (
    text
      // NFKC folds full-width and other compatibility forms onto plain ASCII.
      .normalize('NFKC')
      .replace(INVISIBLE, '')
      .replace(CONTROL, (c) => (c === '\n' || c === '\t' ? c : ''))
      .replace(/&#x([0-9a-f]{1,6});?/gi, (_, hex: string) => fromCode(parseInt(hex, 16)))
      .replace(/&#(\d{1,7});?/g, (_, dec: string) => fromCode(parseInt(dec, 10)))
      .replace(
        /&(lt|gt|quot|apos|amp|sol|lpar|rpar|colon);/gi,
        (_, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? '',
      )
      // Percent escapes, the other half of a URL-borne payload (`%3Cimg%20onerror=`).
      .replace(/%([0-9a-f]{2})/gi, (_, hex: string) => fromCode(parseInt(hex, 16)))
  )
}

interface Rule {
  kind: UnsafeKind
  rule: string
  re: RegExp
}

const RULES: Rule[] = [
  /* ------------------------------- markup ------------------------------- */
  {
    kind: 'script',
    rule: 'script-tag',
    re: /<\s*\/?\s*(?:script|iframe|object|embed|svg|math|link|meta|style|form|base|applet|template|portal)\b/i,
  },
  // Any element with a name: `<div>`, `<img src=x>`, `</p>`. Requires the angle
  // bracket AND a tag name AND the closing bracket, so "under <5 units" is prose.
  { kind: 'markup', rule: 'html-tag', re: /<\s*\/?\s*[a-z][a-z0-9-]*(?:\s[^<>]{0,300})?\/?\s*>/i },
  // Inline handlers are the payload even when the tag around them is malformed.
  {
    kind: 'script',
    rule: 'event-handler',
    re: /\bon(?:error|load|click|focus|blur|mouse[a-z]+|key[a-z]+|submit|toggle|animation[a-z]+|transition[a-z]+|pointer[a-z]+)\s*=/i,
  },
  { kind: 'script', rule: 'script-uri', re: /\b(?:javascript|vbscript|livescript)\s*:/i },
  { kind: 'script', rule: 'data-uri', re: /\bdata\s*:[^,\s]*(?:html|script|base64)/i },

  /* ----------------------------- javascript ----------------------------- */
  {
    kind: 'script',
    rule: 'js-api',
    re: /\b(?:eval|atob|btoa|setTimeout|setInterval|fetch|XMLHttpRequest|WebSocket|importScripts|execScript)\s*\(/,
  },
  {
    kind: 'script',
    rule: 'browser-object',
    re: /\b(?:document|window|globalThis|navigator|localStorage|sessionStorage|indexedDB|location)\s*(?:\.\s*[\w$]|\[)/,
  },
  {
    kind: 'code',
    rule: 'js-syntax',
    re: /(?:\bfunction\s*\*?\s*[\w$]*\s*\(|=>\s*[{(]|\bclass\s+[A-Za-z_$][\w$]*\s*(?:extends\s+[\w$.]+\s*)?\{|\b(?:const|let|var)\s+[\w$]+\s*=|\bnew\s+Function\s*\()/,
  },
  {
    kind: 'code',
    rule: 'module',
    re: /(?:\bimport\s+[\w${},*\s]+\s+from\s+['"]|\bimport\s*\(\s*['"]|\brequire\s*\(\s*['"]|\bexport\s+(?:default|const|let|var|function|class)\b)/,
  },

  /* ------------------------- other languages ---------------------------- */
  {
    kind: 'code',
    rule: 'python',
    re: /(?:\bdef\s+\w+\s*\(|\blambda\s+\w+\s*:|\bimport\s+(?:os|sys|subprocess|socket|requests|pickle)\b|\bfrom\s+\w[\w.]*\s+import\b|\bprint\s*\(\s*["'f])/,
  },
  { kind: 'code', rule: 'server-tag', re: /<\?(?:php|=|xml)|<%[-=@#]?/i },
  { kind: 'code', rule: 'shebang', re: /^\s*#!\s*\/\S/m },
  // A fenced block is someone deliberately handing over source.
  { kind: 'code', rule: 'code-fence', re: /```|~~~/ },
  // `${…}` and `{{…}}` — template injection, the server-side sibling of XSS.
  { kind: 'code', rule: 'template-expression', re: /\$\{[^}]*\}|\{\{[^}]*\}\}/ },

  /* -------------------------------- shell -------------------------------- */
  {
    kind: 'command',
    rule: 'shell-tool',
    re: /\b(?:sudo\s+\w|rm\s+-[rf]|chmod\s+[0-7]{3}|chown\s+\w+:|mkfs\b|shutdown\s+[-/]|kill\s+-9|nc\s+-[lve]|ssh\s+[\w.-]+@|scp\s+\S+@|netsh\s+\w|reg\s+add\b|Invoke-(?:WebRequest|Expression)\b|Start-Process\b)/i,
  },
  // A downloader or an interpreter with something piped, chained or fetched after
  // it — the shape of a drive-by install, not of "I use curl at work".
  {
    kind: 'command',
    rule: 'command-chain',
    re: /\b(?:curl|wget|powershell|pwsh|cmd\.exe|bash|zsh|sh|python3?|node|npm|npx|perl|ruby)\b[^\n]{0,200}?(?:\||&&|;\s*\w|\bhttps?:\/\/)/i,
  },
  // Command substitution and pipe-to-shell, wherever they appear.
  {
    kind: 'command',
    rule: 'substitution',
    re: /\$\(\s*\w|`[^`\n]{2,}`|\|\s*(?:sh|bash|zsh|python3?|node)\b/i,
  },

  /* --------------------------------- sql --------------------------------- */
  {
    kind: 'query',
    rule: 'sql-statement',
    re: /\b(?:select\b[\s\S]{0,120}?\bfrom\b|insert\s+into\b|update\s+[\w."`]+\s+set\b|delete\s+from\b|drop\s+(?:table|database|schema|user)\b|truncate\s+table\b|alter\s+table\b|union\s+(?:all\s+)?select\b|create\s+(?:table|database|user)\b|grant\s+all\b|exec(?:ute)?\s+(?:sp_|xp_))/i,
  },
  // The classic tautologies and stacked statements, plus block comments — none of
  // which survive an innocent reading of a billing question.
  {
    kind: 'query',
    rule: 'sql-injection',
    re: /(?:['"]\s*(?:or|and)\s+(?:'?\w+'?\s*=\s*'?\w+'?|true\b)|;\s*(?:drop|delete|update|insert|select)\b|\/\*[\s\S]*?\*\/|\bor\s+1\s*=\s*1\b)/i,
  },
]

/**
 * Two or more lines that end the way statements do. This is the catch-all for a
 * language none of the rules above name: source pasted from an editor keeps its
 * line structure, and prose does not end its lines in `;` or a lone brace.
 */
function looksLikeSource(text: string): boolean {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 3) return false
  const statementish = lines.filter((l) => /[;{}]$/.test(l) || /^[)\]}]/.test(l)).length
  return statementish >= 2
}

/**
 * The one check both composers call. Returns what was found, or null when the text
 * is ordinary prose and safe to send.
 *
 * Every rule is tested against the raw text AND its decoded form, so neither an
 * encoded payload nor a plain one slips past.
 */
export function findUnsafeCode(text: string): UnsafeMatch | null {
  if (!text.trim()) return null
  const decoded = decodeForMatching(text)

  for (const { kind, rule, re } of RULES) {
    if (re.test(text) || re.test(decoded)) return { kind, rule }
  }
  if (looksLikeSource(text) || looksLikeSource(decoded)) {
    return { kind: 'code', rule: 'source-block' }
  }
  return null
}

/** Convenience wrapper for the call sites that only need the yes/no. */
export function containsUnsafeCode(text: string): boolean {
  return findUnsafeCode(text) !== null
}
