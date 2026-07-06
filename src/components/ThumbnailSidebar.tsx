import { memo, useEffect, useRef, useState } from 'react'
import { Copy, Download, RotateCw, Trash2 } from 'lucide-react'
import type { PageRef } from '../lib/types'
import { useStore } from '../store/useStore'
import { exportPdf } from '../lib/export'
import { baseName, downloadBlob } from '../lib/utils'
import { renderPageToCanvas } from './pageRender'

const THUMB_WIDTH = 118

/** Seitenleiste mit Miniaturen: sortieren (Drag & Drop), drehen, duplizieren, löschen, extrahieren. */
export default function ThumbnailSidebar() {
  const pages = useStore((s) => s.pages)
  const movePage = useStore((s) => s.movePage)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const dragFrom = useRef<number | null>(null)

  return (
    <aside className="z-20 hidden w-40 shrink-0 overflow-y-auto border-r border-cream-300 bg-cream-50 px-3 py-3 md:block dark:border-ink-800 dark:bg-ink-900">
      <div className="flex flex-col gap-3">
        {pages.map((page, index) => (
          <div key={page.id} className="relative">
            {dropIndex === index && (
              <div className="absolute -top-2 right-1 left-1 h-0.5 rounded bg-gold-500" />
            )}
            <Thumbnail
              pageRef={page}
              index={index}
              onDragStart={() => (dragFrom.current = index)}
              onDragOver={(e) => {
                e.preventDefault()
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const before = e.clientY < rect.top + rect.height / 2
                setDropIndex(before ? index : index + 1)
              }}
              onDrop={() => {
                if (dragFrom.current !== null && dropIndex !== null) {
                  const to = dropIndex > dragFrom.current ? dropIndex - 1 : dropIndex
                  movePage(dragFrom.current, to)
                }
                dragFrom.current = null
                setDropIndex(null)
              }}
              onDragEnd={() => {
                dragFrom.current = null
                setDropIndex(null)
              }}
            />
          </div>
        ))}
        {dropIndex === pages.length && (
          <div className="relative">
            <div className="absolute -top-2 right-1 left-1 h-0.5 rounded bg-gold-500" />
          </div>
        )}
      </div>
    </aside>
  )
}

interface ThumbProps {
  pageRef: PageRef
  index: number
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

const Thumbnail = memo(function Thumbnail({
  pageRef,
  index,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ThumbProps) {
  const src = useStore((s) => s.sources[pageRef.srcId])
  const activePageId = useStore((s) => s.activePageId)
  const rotatePage = useStore((s) => s.rotatePage)
  const deletePage = useStore((s) => s.deletePage)
  const duplicatePage = useStore((s) => s.duplicatePage)
  const pageCount = useStore((s) => s.pages.length)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const size = src.pageSizes[pageRef.srcIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rot = (src.baseRotations[pageRef.srcIndex] + pageRef.rotation) % 360
    const dispW = rot === 90 || rot === 270 ? size.h : size.w
    void renderPageToCanvas(pageRef, src, canvas, THUMB_WIDTH / dispW, 2)
  }, [pageRef, pageRef.rotation, src, size])

  const extractPage = async () => {
    const { sources, overlays, formValues, pages } = useStore.getState()
    const bytes = await exportPdf(sources, pages, overlays, formValues, {
      pageSubset: [pageRef],
    })
    downloadBlob(bytes, `${baseName(src.name)}-seite-${index + 1}.pdf`)
  }

  const actionCls =
    'flex h-6 w-6 items-center justify-center rounded bg-cream-50/95 text-ink-700 shadow hover:bg-gold-500 hover:text-white dark:bg-ink-800/95 dark:text-cream-200'

  return (
    <div
      className="group cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() =>
        document
          .getElementById(`page-${pageRef.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    >
      <div
        className={`relative overflow-hidden rounded-lg bg-white ring-2 transition-shadow ${
          activePageId === pageRef.id
            ? 'ring-gold-500'
            : 'shadow-sm ring-transparent hover:ring-gold-300'
        }`}
      >
        <canvas ref={canvasRef} className="block w-full" />
        {/* Aktionen bei Hover */}
        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className={actionCls}
            title="90° drehen"
            onClick={(e) => {
              e.stopPropagation()
              rotatePage(pageRef.id)
            }}
          >
            <RotateCw size={13} />
          </button>
          <button
            className={actionCls}
            title="Seite duplizieren"
            onClick={(e) => {
              e.stopPropagation()
              duplicatePage(pageRef.id)
            }}
          >
            <Copy size={13} />
          </button>
          <button
            className={actionCls}
            title="Seite als eigenes PDF speichern"
            onClick={(e) => {
              e.stopPropagation()
              void extractPage()
            }}
          >
            <Download size={13} />
          </button>
          {pageCount > 1 && (
            <button
              className={`${actionCls} hover:bg-red-600`}
              title="Seite löschen"
              onClick={(e) => {
                e.stopPropagation()
                deletePage(pageRef.id)
              }}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1 text-center text-xs text-ink-500 dark:text-cream-300/50">
        {index + 1}
      </div>
    </div>
  )
})
