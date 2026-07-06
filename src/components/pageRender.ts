import type { PageRef, Source } from '../lib/types'
import { totalRotation } from '../store/useStore'

/**
 * Rendert eine Seite mit pdf.js in ein Canvas.
 * scale bezieht sich auf PDF-Punkte (1 = 100 %); dpr sorgt für scharfe Darstellung
 * auf hochauflösenden Bildschirmen.
 */
export async function renderPageToCanvas(
  pageRef: PageRef,
  src: Source,
  canvas: HTMLCanvasElement,
  scale: number,
  dpr = window.devicePixelRatio || 1,
): Promise<void> {
  const page = await src.doc.getPage(pageRef.srcIndex + 1)
  const viewport = page.getViewport({
    scale: scale * dpr,
    rotation: totalRotation(pageRef, src),
  })
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  await page.render({ canvas, canvasContext: ctx, viewport }).promise
}

/** Seite als PNG-Blob rendern (für den Bild-Export). */
export async function renderPageToPng(
  pageRef: PageRef,
  src: Source,
  scale = 2,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  await renderPageToCanvas(pageRef, src, canvas, scale, 1)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG fehlgeschlagen'))), 'image/png')
  })
}
