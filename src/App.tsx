import { useCallback, useEffect, useState } from 'react'
import { useStore } from './store/useStore'
import { loadSource } from './lib/pdfjs'
import Header from './components/Header'
import StartScreen from './components/StartScreen'
import ThumbnailSidebar from './components/ThumbnailSidebar'
import ToolRail from './components/ToolRail'
import PropertiesBar from './components/PropertiesBar'
import Workspace from './components/Workspace'

export default function App() {
  const hasDocument = useStore((s) => s.pages.length > 0)
  const addSource = useStore((s) => s.addSource)
  const selected = useStore((s) => s.selected)
  const removeOverlay = useStore((s) => s.removeOverlay)
  const deselect = useStore((s) => s.deselect)
  const setTool = useStore((s) => s.setTool)
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)

  const openFiles = useCallback(
    async (files: FileList | File[]) => {
      const pdfs = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'),
      )
      if (pdfs.length === 0) return
      setLoading(true)
      try {
        for (const file of pdfs) {
          addSource(await loadSource(file))
        }
      } catch (err) {
        console.error(err)
        alert('Diese Datei konnte leider nicht geöffnet werden.')
      } finally {
        setLoading(false)
      }
    },
    [addSource],
  )

  // PDF überall per Drag-and-Drop öffnen bzw. anhängen
  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) {
        e.preventDefault()
        setDragActive(true)
      }
    }
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragActive(false)
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer?.files.length) void openFiles(e.dataTransfer.files)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [openFiles])

  // Tastatur: Entf löscht das ausgewählte Objekt, Esc wechselt zur Auswahl
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const editing =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (e.key === 'Escape') {
        deselect()
        setTool('select')
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected && !editing) {
        removeOverlay(selected.pageId, selected.overlayId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, removeOverlay, deselect, setTool])

  return (
    <div className="flex h-full flex-col bg-cream-100 text-ink-900 dark:bg-ink-950 dark:text-cream-100">
      {hasDocument ? (
        <>
          <Header onOpenFiles={openFiles} />
          <div className="relative flex min-h-0 flex-1">
            <ThumbnailSidebar />
            <div className="relative flex min-w-0 flex-1 flex-col">
              <PropertiesBar />
              <Workspace />
            </div>
            <ToolRail />
          </div>
        </>
      ) : (
        <StartScreen onOpenFiles={openFiles} loading={loading} />
      )}

      {dragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-gold-500/20 backdrop-blur-[2px]">
          <div className="rounded-2xl border-2 border-dashed border-gold-500 bg-cream-50 px-10 py-8 text-xl font-semibold text-gold-700 shadow-xl dark:bg-ink-900 dark:text-gold-300">
            PDF hier ablegen
          </div>
        </div>
      )}
    </div>
  )
}
