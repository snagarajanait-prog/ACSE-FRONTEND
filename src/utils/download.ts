/**
 * Hand a generated string to the browser as a file download.
 *
 * jsPDF does this itself (`doc.save`), so this covers the text formats only —
 * Markdown and plain text.
 */

export function downloadTextFile(content: string, fileName: string, mime: string): void {
  // `charset=utf-8` is load-bearing: the transcript contains em dashes, the ·
  // separator and a ✅, all of which arrive as mojibake in Notepad without it.
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoking immediately can cancel the download in some browsers; one frame is
  // enough for the click to have been handled.
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}
