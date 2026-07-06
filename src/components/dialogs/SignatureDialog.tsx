import { useEffect, useRef, useState } from 'react'
import { PenTool, Upload, X } from 'lucide-react'
import { insertImageOnActivePage } from '../insertImage'

interface Props {
  onClose: () => void
}

const PEN_COLORS = ['#1a1a1a', '#1d4ed8', '#8c6a3f']

/** Unterschrift zeichnen (oder als Bild laden) und im Dokument platzieren. */
export default function SignatureDialog({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [color, setColor] = useState(PEN_COLORS[0])
  const [empty, setEmpty] = useState(true)
  const fileInput = useRef<HTMLInputElement>(null)

  // Canvas hochauflösend anlegen (2×), damit die Unterschrift scharf bleibt
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.clientWidth * 2
    canvas.height = canvas.clientHeight * 2
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(2, 2)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [])

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent) => {
    e.preventDefault()
    try {
      canvasRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // Capture ist optional – Zeichnen geht auch ohne
    }
    drawing.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const p = pos(e)
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    setEmpty(false)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const clear = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setEmpty(true)
  }

  const insert = () => {
    if (empty) return
    insertImageOnActivePage(canvasRef.current!.toDataURL('image/png'))
    onClose()
  }

  const uploadImage = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Could not read the image'))
      reader.readAsDataURL(file)
    })
    insertImageOnActivePage(dataUrl)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-plum-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-cream-300 bg-cream-50 p-6 shadow-2xl dark:border-plum-700 dark:bg-plum-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <PenTool size={18} className="text-gold-500" /> Signature
          </h2>
          <button
            className="rounded-lg p-1.5 hover:bg-cream-200 dark:hover:bg-plum-800"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="mb-3 h-44 w-full cursor-crosshair touch-none rounded-xl border border-dashed border-gold-400 bg-white"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
        />

        <div className="flex items-center gap-2">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              className={`h-7 w-7 rounded-full border-2 ${
                color === c ? 'border-gold-500' : 'border-transparent'
              }`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              title="Pen color"
            />
          ))}
          <button
            className="ml-2 rounded-lg px-3 py-1.5 text-sm text-ink-600 hover:bg-cream-200 dark:text-cream-300/80 dark:hover:bg-plum-800"
            onClick={clear}
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-ink-600 hover:bg-cream-200 dark:text-cream-300/80 dark:hover:bg-plum-800"
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={14} /> Upload image
          </button>
          <button
            className="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-600 disabled:opacity-50"
            onClick={insert}
            disabled={empty}
          >
            Insert
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadImage(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
