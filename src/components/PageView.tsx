import { memo, useEffect, useRef, useState } from 'react'
import type { PageRef } from '../lib/types'
import { useStore, totalRotation } from '../store/useStore'
import { displaySize } from '../lib/coords'
import { renderPageToCanvas } from './pageRender'
import OverlayLayer from './OverlayLayer'
import FormLayer from './FormLayer'

interface Props {
  pageRef: PageRef
  pageNumber: number
}

/** Eine einzelne PDF-Seite: Canvas (pdf.js) + Formularfelder + Overlay-Ebene. */
function PageView({ pageRef, pageNumber }: Props) {
  const src = useStore((s) => s.sources[pageRef.srcId])
  const zoom = useStore((s) => s.zoom)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [rendered, setRendered] = useState(false)

  const rot = totalRotation(pageRef, src)
  const size = src.pageSizes[pageRef.srcIndex]
  const disp = displaySize(size.w, size.h, rot)
  const cssW = disp.w * zoom
  const cssH = disp.h * zoom

  // Erst rendern, wenn die Seite in Sichtweite kommt (spart Zeit bei großen PDFs)
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '600px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !canvasRef.current) return
    let cancelled = false
    const canvas = canvasRef.current
    void renderPageToCanvas(pageRef, src, canvas, zoom).then(() => {
      if (!cancelled) setRendered(true)
    })
    return () => {
      cancelled = true
    }
  }, [visible, zoom, rot, pageRef, src])

  return (
    <div ref={wrapperRef} data-page-id={pageRef.id} id={`page-${pageRef.id}`} className="relative">
      <div
        className="relative bg-white shadow-md ring-1 ring-black/5 dark:shadow-black/40"
        style={{ width: cssW, height: cssH }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ width: cssW, height: cssH, opacity: rendered ? 1 : 0 }}
        />
        {!rendered && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-500">
            Seite {pageNumber} …
          </div>
        )}
        <FormLayer pageRef={pageRef} pageW={size.w} pageH={size.h} rot={rot} zoom={zoom} />
        <OverlayLayer pageRef={pageRef} dispW={disp.w} dispH={disp.h} zoom={zoom} />
      </div>
      <div className="mt-1.5 text-center text-xs text-ink-500 dark:text-cream-300/50">
        {pageNumber}
      </div>
    </div>
  )
}

export default memo(PageView)
