import { useRef } from 'react'
import { FileUp, Loader2, Lock, Sparkles, WalletCards } from 'lucide-react'

interface Props {
  onOpenFiles: (files: FileList | File[]) => void
  loading: boolean
}

const FEATURES = [
  {
    icon: Lock,
    title: 'Vollständig privat',
    text: 'Deine Dateien verlassen nie dein Gerät – die gesamte Verarbeitung läuft im Browser.',
  },
  {
    icon: WalletCards,
    title: '100 % kostenlos',
    text: 'Keine Wasserzeichen, keine Limits, kein Account und keine versteckten Paywalls.',
  },
  {
    icon: Sparkles,
    title: 'Alles an Bord',
    text: 'Text, Seiten ordnen, zusammenfügen, unterschreiben, ausfüllen, zeichnen – ein Werkzeugkasten.',
  },
]

export default function StartScreen({ onOpenFiles, loading }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-10">
      <img
        src="/logo.png"
        alt="Papedit – PDF bearbeiten im Browser"
        className="mb-6 h-40 w-40 rounded-3xl object-cover shadow-lg shadow-gold-400/20 sm:h-52 sm:w-52"
      />
      <h1 className="mb-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">
        PDFs bearbeiten. <span className="text-gold-500">Kostenlos. Privat.</span>
      </h1>
      <p className="mb-8 max-w-xl text-center text-ink-600 dark:text-cream-300/70">
        Öffne ein PDF und bearbeite es direkt im Browser – ohne Installation, ohne Account,
        ohne Uploads.
      </p>

      <button
        onClick={() => fileInput.current?.click()}
        disabled={loading}
        className="group mb-10 flex w-full max-w-xl flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-gold-400 bg-cream-50 px-8 py-12 transition-all hover:border-gold-500 hover:bg-cream-200/60 hover:shadow-lg disabled:opacity-60 dark:bg-ink-900 dark:hover:bg-ink-800"
      >
        {loading ? (
          <Loader2 size={40} className="animate-spin text-gold-500" />
        ) : (
          <FileUp
            size={40}
            className="text-gold-500 transition-transform group-hover:-translate-y-1"
          />
        )}
        <span className="text-lg font-semibold">
          {loading ? 'PDF wird geöffnet …' : 'PDF hierher ziehen oder klicken'}
        </span>
        <span className="text-sm text-ink-500 dark:text-cream-300/60">
          Auch mehrere Dateien möglich – sie werden automatisch zusammengefügt
        </span>
      </button>

      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="rounded-2xl border border-cream-300 bg-cream-50 p-5 dark:border-ink-800 dark:bg-ink-900"
          >
            <Icon size={22} className="mb-3 text-gold-500" />
            <h2 className="mb-1 font-semibold">{title}</h2>
            <p className="text-sm text-ink-600 dark:text-cream-300/70">{text}</p>
          </div>
        ))}
      </div>

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
