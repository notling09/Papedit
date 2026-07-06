/** Kurze, eindeutige ID für Seiten, Quellen und Overlays. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/** Hex-Farbe (#rrggbb) in RGB-Anteile 0–1 umrechnen (für pdf-lib). */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { r: 0, g: 0, b: 0 }
  const n = parseInt(m[1], 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

/** Datei im Browser herunterladen (alles bleibt lokal). */
export function downloadBlob(data: Uint8Array | Blob, filename: string, mime = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Dateinamen ohne .pdf-Endung, für Export-Namen wie „name-bearbeitet.pdf“. */
export function baseName(name: string): string {
  return name.replace(/\.pdf$/i, '') || 'dokument'
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}
