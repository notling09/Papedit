import type { ImageOverlay } from '../lib/types'
import { useStore, totalRotation } from '../store/useStore'
import { displaySize } from '../lib/coords'
import { uid } from '../lib/utils'

/**
 * Fügt ein Bild (oder eine Unterschrift) mittig auf der gerade sichtbaren Seite ein.
 * Danach kann es im Auswahlmodus verschoben und skaliert werden.
 */
export function insertImageOnActivePage(dataUrl: string) {
  const img = new Image()
  img.onload = () => {
    const s = useStore.getState()
    const page = s.pages.find((p) => p.id === s.activePageId) ?? s.pages[0]
    if (!page) return
    const src = s.sources[page.srcId]
    const size = src.pageSizes[page.srcIndex]
    const disp = displaySize(size.w, size.h, totalRotation(page, src))

    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight)
    const w = Math.min(200, disp.w * 0.5)
    const h = w / aspect
    const overlay: ImageOverlay = {
      id: uid(),
      type: 'image',
      x: (disp.w - w) / 2,
      y: (disp.h - h) / 2,
      w,
      h,
      dataUrl,
      aspect,
    }
    s.addOverlay(page.id, overlay)
    s.setTool('select')
    useStore.setState({ selected: { pageId: page.id, overlayId: overlay.id } })
  }
  img.src = dataUrl
}
