import { useRef, useState } from 'react'
import {
  Download,
  FilePlus2,
  Images,
  Moon,
  Scissors,
  Sun,
  X,
  Loader2,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { exportPdf } from '../lib/export'
import { baseName, downloadBlob } from '../lib/utils'
import { renderPageToPng } from './pageRender'
import SplitDialog from './dialogs/SplitDialog'

interface Props {
  onOpenFiles: (files: FileList | File[]) => void
}

export default function Header({ onOpenFiles }: Props) {
  const hasDocument = useStore((s) => s.pages.length > 0)
  const sources = useStore((s) => s.sources)
  const dark = useStore((s) => s.dark)
  const setDark = useStore((s) => s.setDark)
  const closeDocument = useStore((s) => s.closeDocument)
  const fileInput = useRef<HTMLInputElement>(null)
  const [splitOpen, setSplitOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const docName = baseName(Object.values(sources)[0]?.name ?? 'dokument')

  const handleDownload = async () => {
    const { sources, pages, overlays, formValues } = useStore.getState()
    setBusy(true)
    try {
      const bytes = await exportPdf(sources, pages, overlays, formValues)
      downloadBlob(bytes, `${docName}-papedit.pdf`)
    } catch (err) {
      console.error(err)
      alert('Beim Erstellen des PDFs ist etwas schiefgelaufen.')
    } finally {
      setBusy(false)
    }
  }

  const handlePngExport = async () => {
    const { sources, pages } = useStore.getState()
    setBusy(true)
    try {
      for (let i = 0; i < pages.length; i++) {
        const blob = await renderPageToPng(pages[i], sources[pages[i].srcId], 2)
        downloadBlob(blob, `${docName}-seite-${i + 1}.png`, 'image/png')
      }
    } finally {
      setBusy(false)
    }
  }

  const iconBtn =
    'flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-800'

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-cream-300 bg-cream-50 px-4 shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <img src="/logo.png" alt="Papedit-Logo" className="h-9 w-9 rounded-lg object-cover" />
      <div className="mr-2 flex flex-col leading-tight">
        <span className="text-lg font-bold tracking-tight text-ink-900 dark:text-cream-50">
          Pap<span className="text-gold-500">edit</span>
        </span>
        <span className="hidden text-[10px] text-ink-500 sm:block dark:text-cream-300/60">
          100 % kostenlos &amp; privat
        </span>
      </div>

      {hasDocument && (
        <span className="hidden max-w-64 truncate rounded-full bg-cream-200 px-3 py-1 text-xs font-medium text-ink-700 md:block dark:bg-ink-800 dark:text-cream-200">
          {Object.values(sources)
            .map((s) => s.name)
            .join(' + ')}
        </span>
      )}

      <div className="flex-1" />

      {hasDocument && (
        <>
          <button
            className={iconBtn}
            title="Weiteres PDF anhängen (zusammenfügen)"
            onClick={() => fileInput.current?.click()}
          >
            <FilePlus2 size={18} />
          </button>
          <button className={iconBtn} title="PDF teilen" onClick={() => setSplitOpen(true)}>
            <Scissors size={18} />
          </button>
          <button
            className={iconBtn}
            title="Seiten als PNG-Bilder exportieren"
            onClick={handlePngExport}
          >
            <Images size={18} />
          </button>
        </>
      )}

      <button
        className={iconBtn}
        title={dark ? 'Heller Modus' : 'Dunkler Modus'}
        onClick={() => setDark(!dark)}
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {hasDocument && (
        <>
          <button
            onClick={handleDownload}
            disabled={busy}
            className="ml-1 flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gold-600 disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Herunterladen
          </button>
          <button
            className={iconBtn}
            title="Dokument schließen"
            onClick={() => {
              if (confirm('Dokument schließen? Nicht heruntergeladene Änderungen gehen verloren.')) {
                closeDocument()
              }
            }}
          >
            <X size={18} />
          </button>
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onOpenFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {splitOpen && <SplitDialog onClose={() => setSplitOpen(false)} />}
    </header>
  )
}
