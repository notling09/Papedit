import { Bold, Italic, Trash2 } from 'lucide-react'
import type { FontFamily, Overlay } from '../lib/types'
import { useStore } from '../store/useStore'

const HIGHLIGHT_COLORS = ['#f6d35b', '#8de969', '#7cc4ff', '#ff8ec7']

/**
 * Kontextabhängige Eigenschaften-Leiste: zeigt je nach Werkzeug bzw.
 * ausgewähltem Objekt die passenden Einstellungen (Schrift, Farbe, Stärke …).
 */
export default function PropertiesBar() {
  const tool = useStore((s) => s.tool)
  const selected = useStore((s) => s.selected)
  const overlays = useStore((s) => s.overlays)
  const defaults = useStore((s) => s.defaults)
  const setDefaults = useStore((s) => s.setDefaults)
  const updateOverlay = useStore((s) => s.updateOverlay)
  const removeOverlay = useStore((s) => s.removeOverlay)

  const selectedOverlay: Overlay | undefined = selected
    ? overlays[selected.pageId]?.find((o) => o.id === selected.overlayId)
    : undefined

  // Welcher Kontext ist aktiv?
  const context: string | null = selectedOverlay
    ? selectedOverlay.type
    : tool !== 'select'
      ? tool
      : null
  if (!context) return null

  /** Änderung auf Auswahl UND Voreinstellung anwenden. */
  const apply = (patch: Record<string, unknown>, defaultsPatch?: Record<string, unknown>) => {
    if (selected && selectedOverlay) {
      updateOverlay(selected.pageId, selected.overlayId, patch as Partial<Overlay>)
    }
    setDefaults((defaultsPatch ?? patch) as Partial<typeof defaults>)
  }

  const isText = context === 'text'
  const isDrawing = context === 'draw' || ['rect', 'ellipse', 'line', 'arrow'].includes(context)
  const isHighlight = context === 'highlight'
  const isWhiteout = context === 'whiteout'
  const isImage = context === 'image'

  const t = selectedOverlay?.type === 'text' ? selectedOverlay : null
  const d = selectedOverlay && 'width' in selectedOverlay ? selectedOverlay : null

  const label = 'text-xs text-ink-500 dark:text-cream-300/60'
  const control =
    'h-8 rounded-md border border-cream-300 bg-white px-1.5 text-sm outline-none focus:border-gold-500 dark:border-ink-700 dark:bg-ink-800'

  return (
    <div className="absolute top-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-cream-300 bg-cream-50/95 px-4 py-1.5 shadow-lg backdrop-blur dark:border-ink-700 dark:bg-ink-900/95">
      {isText && (
        <>
          <select
            className={control}
            value={t?.font ?? defaults.fontFamily}
            onChange={(e) =>
              apply({ font: e.target.value as FontFamily }, { fontFamily: e.target.value })
            }
          >
            <option value="Helvetica">Helvetica</option>
            <option value="Times">Times</option>
            <option value="Courier">Courier</option>
          </select>
          <input
            type="number"
            min={6}
            max={96}
            className={`${control} w-16`}
            value={t?.fontSize ?? defaults.fontSize}
            onChange={(e) => apply({ fontSize: Number(e.target.value) || 14 })}
            title="Schriftgröße (pt)"
          />
          <button
            className={`flex h-8 w-8 items-center justify-center rounded-md ${
              (t?.bold ?? defaults.bold)
                ? 'bg-gold-500 text-white'
                : 'hover:bg-cream-200 dark:hover:bg-ink-800'
            }`}
            onClick={() => apply({ bold: !(t?.bold ?? defaults.bold) })}
            title="Fett"
          >
            <Bold size={15} />
          </button>
          <button
            className={`flex h-8 w-8 items-center justify-center rounded-md ${
              (t?.italic ?? defaults.italic)
                ? 'bg-gold-500 text-white'
                : 'hover:bg-cream-200 dark:hover:bg-ink-800'
            }`}
            onClick={() => apply({ italic: !(t?.italic ?? defaults.italic) })}
            title="Kursiv"
          >
            <Italic size={15} />
          </button>
          <label className="flex items-center gap-1.5">
            <span className={label}>Farbe</span>
            <input
              type="color"
              className="h-7 w-9 cursor-pointer rounded border-none bg-transparent"
              value={t?.color ?? defaults.textColor}
              onChange={(e) => apply({ color: e.target.value }, { textColor: e.target.value })}
            />
          </label>
        </>
      )}

      {(isDrawing || isHighlight) && (
        <>
          {isHighlight ? (
            <div className="flex items-center gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-6 w-6 rounded-full border-2 ${
                    (d?.color ?? defaults.highlightColor) === c
                      ? 'border-ink-900 dark:border-cream-100'
                      : 'border-transparent'
                  }`}
                  style={{ background: c }}
                  onClick={() => apply({ color: c }, { highlightColor: c })}
                  title="Markerfarbe"
                />
              ))}
            </div>
          ) : (
            <label className="flex items-center gap-1.5">
              <span className={label}>Farbe</span>
              <input
                type="color"
                className="h-7 w-9 cursor-pointer rounded border-none bg-transparent"
                value={d?.color ?? defaults.strokeColor}
                onChange={(e) => apply({ color: e.target.value }, { strokeColor: e.target.value })}
              />
            </label>
          )}
          <label className="flex items-center gap-1.5">
            <span className={label}>Stärke</span>
            <input
              type="range"
              min={isHighlight ? 6 : 1}
              max={isHighlight ? 28 : 12}
              className="w-24 accent-gold-500"
              value={d?.width ?? (isHighlight ? 14 : defaults.strokeWidth)}
              onChange={(e) =>
                apply(
                  { width: Number(e.target.value) },
                  isHighlight ? {} : { strokeWidth: Number(e.target.value) },
                )
              }
            />
          </label>
        </>
      )}

      {isWhiteout && (
        <label className="flex items-center gap-1.5">
          <span className={label}>Deckfarbe</span>
          <input
            type="color"
            className="h-7 w-9 cursor-pointer rounded border-none bg-transparent"
            value={
              selectedOverlay?.type === 'whiteout' ? selectedOverlay.color : defaults.whiteoutColor
            }
            onChange={(e) => apply({ color: e.target.value }, { whiteoutColor: e.target.value })}
          />
        </label>
      )}

      {isImage && <span className={label}>Ziehen zum Verschieben, Ecke zum Skalieren</span>}

      {selectedOverlay && selected && (
        <button
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          onClick={() => removeOverlay(selected.pageId, selected.overlayId)}
          title="Objekt löschen (Entf)"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}
