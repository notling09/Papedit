import { useRef, useState } from 'react'
import {
  ArrowUpRight,
  Circle,
  Eraser,
  Highlighter,
  ImagePlus,
  MousePointer2,
  PenTool,
  Pencil,
  Slash,
  Square,
  TextCursorInput,
  Type,
} from 'lucide-react'
import type { Tool } from '../lib/types'
import { useStore } from '../store/useStore'
import { insertImageOnActivePage } from './insertImage'
import SignatureDialog from './dialogs/SignatureDialog'

const TOOLS: { tool: Tool; icon: typeof Type; label: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select & move' },
  { tool: 'edittext', icon: TextCursorInput, label: 'Edit existing text' },
  { tool: 'text', icon: Type, label: 'Add text' },
  { tool: 'whiteout', icon: Eraser, label: 'Whiteout (cover & replace text)' },
  { tool: 'draw', icon: Pencil, label: 'Draw freehand' },
  { tool: 'highlight', icon: Highlighter, label: 'Highlighter' },
  { tool: 'rect', icon: Square, label: 'Rectangle' },
  { tool: 'ellipse', icon: Circle, label: 'Ellipse' },
  { tool: 'line', icon: Slash, label: 'Line' },
  { tool: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
]

/** Werkzeugleiste am rechten Rand. */
export default function ToolRail() {
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const fileInput = useRef<HTMLInputElement>(null)
  const [signatureOpen, setSignatureOpen] = useState(false)

  const handleImageFile = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Could not read the image'))
      reader.readAsDataURL(file)
    })
    insertImageOnActivePage(dataUrl)
  }

  return (
    <aside className="z-20 flex w-14 shrink-0 flex-col items-center gap-1 overflow-y-auto border-l border-cream-300 bg-cream-50 py-3 dark:border-ink-800 dark:bg-ink-900">
      {TOOLS.map(({ tool: t, icon: Icon, label }) => (
        <button
          key={t}
          title={label}
          onClick={() => setTool(t)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
            tool === t
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-ink-700 hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-800'
          }`}
        >
          <Icon size={19} />
        </button>
      ))}

      <div className="my-1 h-px w-8 bg-cream-300 dark:bg-ink-700" />

      <button
        title="Insert image (e.g. a logo)"
        onClick={() => fileInput.current?.click()}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-800"
      >
        <ImagePlus size={19} />
      </button>
      <button
        title="Insert signature"
        onClick={() => setSignatureOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-cream-200 dark:text-cream-200 dark:hover:bg-ink-800"
      >
        <PenTool size={19} />
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleImageFile(file)
          e.target.value = ''
        }}
      />

      {signatureOpen && <SignatureDialog onClose={() => setSignatureOpen(false)} />}
    </aside>
  )
}
