import { useState } from 'react'
import { Loader2, Scissors, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { exportPdf } from '../../lib/export'
import { baseName, downloadBlob } from '../../lib/utils'

interface Props {
  onClose: () => void
}

/** PDF in mehrere Dateien aufteilen – jede Angabe (z. B. „1-3, 4-6") wird eine eigene Datei. */
export default function SplitDialog({ onClose }: Props) {
  const pageCount = useStore((s) => s.pages.length)
  const [ranges, setRanges] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const doSplit = async (groups: number[][]) => {
    const { sources, pages, overlays, formValues } = useStore.getState()
    const name = baseName(Object.values(sources)[0]?.name ?? 'dokument')
    setBusy(true)
    try {
      for (let i = 0; i < groups.length; i++) {
        const subset = groups[i].map((n) => pages[n - 1]).filter(Boolean)
        if (subset.length === 0) continue
        const bytes = await exportPdf(sources, pages, overlays, formValues, {
          pageSubset: subset,
        })
        downloadBlob(bytes, `${name}-part-${i + 1}.pdf`)
      }
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const splitByRanges = () => {
    setError('')
    const groups: number[][] = []
    for (const token of ranges.split(',')) {
      const part = token.trim()
      if (!part) continue
      const m = /^(\d+)\s*-\s*(\d+)$/.exec(part)
      if (m) {
        const from = Number(m[1])
        const to = Number(m[2])
        if (from < 1 || to > pageCount || from > to) {
          setError(`Invalid range: ${part} (the document has ${pageCount} pages)`)
          return
        }
        groups.push(Array.from({ length: to - from + 1 }, (_, i) => from + i))
      } else if (/^\d+$/.test(part)) {
        const n = Number(part)
        if (n < 1 || n > pageCount) {
          setError(`Page ${n} does not exist (the document has ${pageCount} pages)`)
          return
        }
        groups.push([n])
      } else {
        setError(`Could not read "${part}" – valid formats are e.g. 3 or 1-5`)
        return
      }
    }
    if (groups.length === 0) {
      setError('Please enter at least one range, e.g. 1-3, 4-6')
      return
    }
    void doSplit(groups)
  }

  const splitEachPage = () => {
    void doSplit(Array.from({ length: pageCount }, (_, i) => [i + 1]))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-plum-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-2xl dark:border-plum-700 dark:bg-plum-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Scissors size={18} className="text-gold-500" /> Split PDF
          </h2>
          <button
            className="rounded-lg p-1.5 hover:bg-cream-200 dark:hover:bg-plum-800"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-2 text-sm text-ink-600 dark:text-cream-300/70">
          Separate page ranges with commas – each range becomes its own PDF file.
        </p>
        <input
          type="text"
          placeholder={`e.g. 1-3, 4-${pageCount}`}
          value={ranges}
          onChange={(e) => setRanges(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && splitByRanges()}
          className="mb-2 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm outline-none focus:border-gold-500 dark:border-plum-700 dark:bg-plum-800"
        />
        {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            className="rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-cream-200 disabled:opacity-50 dark:text-cream-300/80 dark:hover:bg-plum-800"
            onClick={splitEachPage}
            disabled={busy}
          >
            Each page separately
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:opacity-60"
            onClick={splitByRanges}
            disabled={busy}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Split &amp; download
          </button>
        </div>
      </div>
    </div>
  )
}
