/**
 * Copy text to the clipboard, with a fallback for the cases the modern API is
 * simply not there.
 *
 * `navigator.clipboard` requires a secure context, so it is absent over plain
 * HTTP — which is exactly how this demo tends to be shown on an internal host or
 * from a LAN IP. Falling back to the deprecated `execCommand('copy')` keeps Copy
 * working there instead of failing silently in front of a client.
 */

export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Permission denied, or a non-secure context that still exposed the API.
    // Fall through — the legacy path may still work.
  }
  return legacyCopy(value)
}

function legacyCopy(value: string): boolean {
  const area = document.createElement('textarea')
  area.value = value
  // Off-screen rather than `display: none` — a hidden element cannot be selected,
  // and `readOnly` stops the mobile keyboard from flying up on focus.
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.top = '-1000px'
  area.style.opacity = '0'
  document.body.appendChild(area)

  try {
    area.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(area)
  }
}
