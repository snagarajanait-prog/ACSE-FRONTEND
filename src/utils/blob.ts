/**
 * Getting bytes out of object storage and into the browser.
 *
 * Two features need this — the organisation logo and the admin document library —
 * and they share one awkward property: neither endpoint hands back a durable
 * address. Both return a PRE-SIGNED object-storage link that expires 60 seconds
 * after it is issued and is re-signed (so it differs) on every read.
 *
 * The consequence is the same in both places: a signed link must be SPENT, not
 * stored. Put one in an `<img src>` and it paints once, then rots — a remount or a
 * cached copy read back after the minute is up requests a link that now answers
 * 403. Navigate a tab to one and the load can land after the signature lapsed,
 * showing the user object storage's raw `AccessDenied` XML in a tab the app cannot
 * observe, catch, or retry. So the bytes are always pulled here, while the link is
 * still warm, and what the rest of the app handles is bytes.
 *
 * Where those bytes then go differs by feature, deliberately:
 *
 *   - The LOGO becomes a `data:` URL (`fetchImageAsDataUrl`). The brand is cached
 *     to localStorage so a refresh paints the last-known logo before the profile
 *     request resolves, and a `blob:` URL dies with the document — it would
 *     rehydrate as a broken image on every reload. It is also one value shared by
 *     the Redux slice, the topbar, the copilot header and the settings preview: an
 *     object URL has to be revoked, and whoever revoked it would blank the others,
 *     while nobody revoking it leaks. A `data:` URL is plain immutable state with
 *     no lifetime to coordinate, and it matches what the file picker already
 *     produces for a freshly-chosen file. The cost is base64's ~33% overhead,
 *     which the 1 MB logo cap keeps inside the localStorage quota.
 *
 *   - A DOCUMENT is written straight to disk (`saveBlob`). It is a one-shot answer
 *     to a click — nothing caches it, nothing re-renders it — so an object URL is
 *     right here: created and revoked inside the one function, never becoming
 *     state. Uploads are capped at 5 MB per file (see `UploadModal`), so buffering
 *     one in memory is cheap, and it buys a correct file name for free — the
 *     `download` attribute is ignored on a cross-origin href, so navigating to the
 *     signed link saves the storage object's UUID rather than the real name.
 */

/** Blob → `data:` URL. Rejects if the bytes can't be read. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('File data could not be read'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('File data could not be read'))
    reader.readAsDataURL(blob)
  })
}

/**
 * A failed object-storage download, carrying the status so callers can tell the
 * two very different failures apart: 403 means the signature lapsed and a
 * re-signed link would work, while 404 means object storage has no such object —
 * the record points at a file that isn't there, and no amount of retrying will
 * conjure it.
 */
export class RemoteFetchError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Download failed (${status})`)
    this.name = 'RemoteFetchError'
    this.status = status
  }
}

/**
 * Fetch a pre-signed object-storage URL and hand back the raw bytes.
 *
 * Bare `fetch`, NOT `lib/http` — these are the only calls in the app that must
 * reach a third party rather than our API, and every cross-cutting concern
 * `lib/http` adds is actively wrong here. The URL carries its own signature in the
 * query string, so an `Authorization` header alongside it makes object storage
 * reject the request outright (400 — two auth mechanisms), and the custom `ngrok-*`
 * header would force a preflight to a host that has nothing to do with ngrok.
 */
export async function fetchBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new RemoteFetchError(response.status)
  return response.blob()
}

/** Fetch a remote image and return it as a `data:` URL — see the header for why. */
export async function fetchImageAsDataUrl(url: string, signal?: AbortSignal): Promise<string> {
  return blobToDataUrl(await fetchBlob(url, signal))
}

/**
 * Save already-fetched bytes to disk under `fileName`, via a throwaway anchor.
 *
 * The object URL is same-origin, which is what makes the `download` attribute
 * apply at all — the browser honours it for a `blob:` href and ignores it for a
 * cross-origin one.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.rel = 'noopener'
  // Must be in the document for the synthetic click to count as a user-ish
  // activation in Firefox; Chrome is happy either way.
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Revoked on a later task, not synchronously: `click()` only QUEUES the
  // download, and pulling the URL out from under it first cancels the save.
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
