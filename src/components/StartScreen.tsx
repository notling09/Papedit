import { useRef } from 'react'
import { Loader2, Moon, Sun } from 'lucide-react'
import { useStore } from '../store/useStore'

interface Props {
  onOpenFiles: (files: FileList | File[]) => void
  loading: boolean
}

/** Bewusst schlichter Startbildschirm: Logo, eine Ablagefläche, sonst nichts. */
export default function StartScreen({ onOpenFiles, loading }: Props) {
  const dark = useStore((s) => s.dark)
  const setDark = useStore((s) => s.setDark)
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6">
      {/* Hell/Dunkel schwebend oben rechts – ganz ohne Navigationsleiste */}
      <button
        onClick={() => setDark(!dark)}
        title={dark ? 'Heller Modus' : 'Dunkler Modus'}
        className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-800"
      >
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </button>

      <img
        src="/logo.png"
        alt="PapEdit"
        className="mb-10 w-full max-w-md select-none"
        draggable={false}
      />

      <button
        onClick={() => fileInput.current?.click()}
        disabled={loading}
        className="flex w-full max-w-md items-center justify-center gap-3 rounded-2xl border border-dashed border-gold-400/70 px-8 py-10 text-base font-medium text-ink-700 transition-colors hover:border-gold-500 hover:bg-cream-200/50 disabled:opacity-60 dark:text-cream-200 dark:hover:bg-ink-900"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin text-gold-500" />
            PDF wird geöffnet …
          </>
        ) : (
          'PDF hierher ziehen oder klicken'
        )}
      </button>

      <p className="mt-6 text-sm text-ink-500 dark:text-cream-300/50">
        Kostenlos. Deine Dateien bleiben auf deinem Gerät.
      </p>

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
    </main>
  )
}
