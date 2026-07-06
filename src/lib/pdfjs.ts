import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { Source } from './types'
import { uid } from './utils'

// pdf.js rendert in einem Web Worker – Vite liefert die Worker-Datei als Asset aus.
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Liest eine PDF-Datei ein und erstellt eine Quelle für den Store.
 * Wichtig: pdf.js überträgt den ArrayBuffer in den Worker (er wird „detached“),
 * deshalb bekommt getDocument eine Kopie und die Original-Bytes bleiben erhalten.
 */
export async function loadSource(file: File): Promise<Source> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise

  const baseRotations: number[] = []
  const pageSizes: { w: number; h: number }[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    baseRotations.push(page.rotate)
    const [x1, y1, x2, y2] = page.view
    pageSizes.push({ w: x2 - x1, h: y2 - y1 })
  }

  return {
    id: uid(),
    name: file.name,
    bytes,
    doc,
    pageCount: doc.numPages,
    baseRotations,
    pageSizes,
  }
}
