import { useEffect, useRef } from 'react'
import { Minus, Plus, Maximize } from 'lucide-react'
import { useStore, totalRotation } from '../store/useStore'
import { displaySize } from '../lib/coords'
import PageView from './PageView'

export default function Workspace() {
  const pages = useStore((s) => s.pages)
  const sources = useStore((s) => s.sources)
  const zoom = useStore((s) => s.zoom)
  const setZoom = useStore((s) => s.setZoom)
  const setActivePage = useStore((s) => s.setActivePage)
  const deselect = useStore((s) => s.deselect)
  const containerRef = useRef<HTMLDivElement>(null)

  // Die am besten sichtbare Seite als „aktive Seite“ verfolgen
  // (dorthin werden z. B. Unterschriften und Bilder eingefügt).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const visibility = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.pageId
          if (id) visibility.set(id, e.isIntersecting ? e.intersectionRatio : 0)
        }
        let best: string | null = null
        let bestRatio = 0
        for (const [id, ratio] of visibility) {
          if (ratio > bestRatio) {
            best = id
            bestRatio = ratio
          }
        }
        if (best) setActivePage(best)
      },
      { root: container, threshold: [0, 0.25, 0.5, 0.75, 1] },
    )
    for (const el of container.querySelectorAll('[data-page-id]')) observer.observe(el)
    return () => observer.disconnect()
  }, [pages, setActivePage])

  const fitWidth = () => {
    const container = containerRef.current
    const page = pages[0]
    if (!container || !page) return
    const src = sources[page.srcId]
    const size = src.pageSizes[page.srcIndex]
    const disp = displaySize(size.w, size.h, totalRotation(page, src))
    setZoom((container.clientWidth - 96) / disp.w)
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto bg-cream-200/70 dark:bg-ink-950"
      onPointerDown={(e) => {
        if (e.target === containerRef.current) deselect()
      }}
    >
      <div className="mx-auto flex w-fit flex-col items-center gap-6 px-8 py-8">
        {pages.map((page, index) => (
          <PageView key={page.id} pageRef={page} pageNumber={index + 1} />
        ))}
      </div>

      {/* Schwebende Zoom-Steuerung */}
      <div className="sticky bottom-4 left-1/2 z-20 flex w-fit -translate-x-1/2 items-center gap-1 rounded-full border border-cream-300 bg-cream-50/95 px-2 py-1 shadow-lg backdrop-blur dark:border-ink-700 dark:bg-ink-900/95">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream-200 dark:hover:bg-ink-800"
          onClick={() => setZoom(zoom - 0.15)}
          title="Zoom out"
        >
          <Minus size={15} />
        </button>
        <span className="w-14 text-center text-sm font-medium tabular-nums">
          {Math.round(zoom * 100)} %
        </span>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream-200 dark:hover:bg-ink-800"
          onClick={() => setZoom(zoom + 0.15)}
          title="Zoom in"
        >
          <Plus size={15} />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-cream-200 dark:hover:bg-ink-800"
          onClick={fitWidth}
          title="Fit to width"
        >
          <Maximize size={14} />
        </button>
      </div>
    </div>
  )
}
