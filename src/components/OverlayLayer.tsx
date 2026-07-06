import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GripHorizontal } from 'lucide-react'
import type {
  DrawOverlay,
  ImageOverlay,
  Overlay,
  PageRef,
  ShapeOverlay,
  TextOverlay,
  WhiteoutOverlay,
} from '../lib/types'
import { useStore } from '../store/useStore'
import { uid } from '../lib/utils'
import { TEXT_LINE_HEIGHT } from '../lib/export'

interface Props {
  pageRef: PageRef
  dispW: number
  dispH: number
  zoom: number
}

/** Stabile leere Liste, damit der Zustand-Selector keine neuen Referenzen erzeugt. */
const EMPTY_OVERLAYS: Overlay[] = []

/** setPointerCapture kann in Randfällen werfen (z. B. Zeiger schon losgelassen). */
function capturePointer(target: EventTarget | null, pointerId: number) {
  try {
    ;(target as HTMLElement)?.setPointerCapture(pointerId)
  } catch {
    // ohne Capture weitermachen – das Ziehen funktioniert meist trotzdem
  }
}

const FONT_CSS: Record<string, string> = {
  Helvetica: 'Helvetica, Arial, sans-serif',
  Times: '"Times New Roman", Times, serif',
  Courier: '"Courier New", Courier, monospace',
}

/** Interaktive Ebene über der PDF-Seite: erstellen, auswählen, verschieben, bearbeiten. */
export default function OverlayLayer({ pageRef, dispW, dispH, zoom }: Props) {
  const tool = useStore((s) => s.tool)
  const overlays = useStore((s) => s.overlays[pageRef.id] ?? EMPTY_OVERLAYS)
  const selected = useStore((s) => s.selected)
  const defaults = useStore((s) => s.defaults)
  const addOverlay = useStore((s) => s.addOverlay)

  const containerRef = useRef<HTMLDivElement>(null)
  // Vorschau während des Aufziehens (Formen/Abdecken) bzw. Zeichnens.
  // Zusätzlich als Ref, damit schnelle Ereignisfolgen nicht am
  // asynchronen State-Update vorbeilaufen.
  const [draft, setDraftState] = useState<Overlay | null>(null)
  const draftRef = useRef<Overlay | null>(null)
  const setDraft = (d: Overlay | null) => {
    draftRef.current = d
    setDraftState(d)
  }

  /** Zeigerposition in Seiten-Punkten (Anzeige-Raum). */
  const toPt = (e: ReactPointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
  }

  const handlePointerDown = (e: ReactPointerEvent) => {
    if (tool === 'select' || tool === 'edittext' || e.button !== 0) return
    e.preventDefault()
    const p = toPt(e)

    if (tool === 'text') {
      const overlay: TextOverlay = {
        id: uid(),
        type: 'text',
        x: p.x,
        y: Math.max(0, p.y - defaults.fontSize * 0.7),
        w: Math.min(220, dispW - p.x),
        text: '',
        fontSize: defaults.fontSize,
        color: defaults.textColor,
        font: defaults.fontFamily,
        bold: defaults.bold,
        italic: defaults.italic,
      }
      addOverlay(pageRef.id, overlay)
      setToolKeepSelection('select', pageRef.id, overlay.id)
      return
    }

    capturePointer(e.target, e.pointerId)

    if (tool === 'draw' || tool === 'highlight') {
      setDraft({
        id: uid(),
        type: tool,
        points: [p.x, p.y],
        color: tool === 'highlight' ? defaults.highlightColor : defaults.strokeColor,
        width: tool === 'highlight' ? 14 : defaults.strokeWidth,
        opacity: tool === 'highlight' ? 0.4 : 1,
      })
    } else if (tool === 'whiteout') {
      setDraft({
        id: uid(),
        type: 'whiteout',
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        color: defaults.whiteoutColor,
      })
    } else {
      setDraft({
        id: uid(),
        type: tool,
        x1: p.x,
        y1: p.y,
        x2: p.x,
        y2: p.y,
        color: defaults.strokeColor,
        width: defaults.strokeWidth,
      })
    }
  }

  const handlePointerMove = (e: ReactPointerEvent) => {
    const draft = draftRef.current
    if (!draft) return
    const p = toPt(e)
    if (draft.type === 'draw' || draft.type === 'highlight') {
      const pts = draft.points
      const lx = pts[pts.length - 2]
      const ly = pts[pts.length - 1]
      if (Math.hypot(p.x - lx, p.y - ly) > 1) {
        setDraft({ ...draft, points: [...pts, p.x, p.y] })
      }
    } else if (draft.type === 'whiteout') {
      setDraft({ ...draft, w: p.x - draft.x, h: p.y - draft.y })
    } else if ('x2' in draft) {
      setDraft({ ...draft, x2: p.x, y2: p.y })
    }
  }

  const handlePointerUp = () => {
    const draft = draftRef.current
    if (!draft) return
    setDraft(null)
    if (draft.type === 'draw' || draft.type === 'highlight') {
      if (draft.points.length >= 4) addOverlay(pageRef.id, draft)
    } else if (draft.type === 'whiteout') {
      const w = Math.abs(draft.w)
      const h = Math.abs(draft.h)
      if (w > 3 && h > 3) {
        addOverlay(pageRef.id, {
          ...draft,
          x: Math.min(draft.x, draft.x + draft.w),
          y: Math.min(draft.y, draft.y + draft.h),
          w,
          h,
        })
      }
    } else if ('x2' in draft) {
      if (Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 3) {
        addOverlay(pageRef.id, draft)
      }
    }
  }

  const isSelectMode = tool === 'select'
  // In diesen Modi lässt die Ebene Klicks zu den Schichten darunter durch
  // (Formularfelder bzw. „Text bearbeiten“-Ebene)
  const passthrough = tool === 'select' || tool === 'edittext'
  const vectorOverlays = overlays.filter(
    (o): o is DrawOverlay | ShapeOverlay =>
      o.type === 'draw' || o.type === 'highlight' || o.type === 'rect' ||
      o.type === 'ellipse' || o.type === 'line' || o.type === 'arrow',
  )
  const draftIsVector =
    draft && (draft.type !== 'whiteout') && (draft.type !== 'text') && draft.type !== 'image'

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 touch-none"
      style={{
        pointerEvents: passthrough ? 'none' : 'auto',
        cursor: passthrough ? undefined : tool === 'text' ? 'text' : 'crosshair',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Vektor-Overlays (Stift, Marker, Formen) in einem SVG in Seitengröße */}
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${dispW} ${dispH}`}
        style={{ pointerEvents: 'none' }}
      >
        {vectorOverlays.map((o) => (
          <VectorItem
            key={o.id}
            overlay={o}
            pageId={pageRef.id}
            zoom={zoom}
            interactive={isSelectMode}
            isSelected={selected?.overlayId === o.id}
          />
        ))}
        {draftIsVector && draft && (
          <VectorItem overlay={draft as DrawOverlay | ShapeOverlay} pageId={pageRef.id} zoom={zoom} interactive={false} isSelected={false} />
        )}
      </svg>

      {draft?.type === 'whiteout' && (
        <div
          className="absolute border border-dashed border-gold-500"
          style={{
            left: Math.min(draft.x, draft.x + draft.w) * zoom,
            top: Math.min(draft.y, draft.y + draft.h) * zoom,
            width: Math.abs(draft.w) * zoom,
            height: Math.abs(draft.h) * zoom,
            background: draft.color,
          }}
        />
      )}

      {overlays.map((o) => {
        if (o.type === 'text') {
          return (
            <TextItem
              key={o.id}
              overlay={o}
              pageId={pageRef.id}
              zoom={zoom}
              interactive={isSelectMode}
              isSelected={selected?.overlayId === o.id}
            />
          )
        }
        if (o.type === 'whiteout') {
          return (
            <BoxItem
              key={o.id}
              overlay={o}
              pageId={pageRef.id}
              zoom={zoom}
              interactive={isSelectMode}
              isSelected={selected?.overlayId === o.id}
            />
          )
        }
        if (o.type === 'image') {
          return (
            <BoxItem
              key={o.id}
              overlay={o}
              pageId={pageRef.id}
              zoom={zoom}
              interactive={isSelectMode}
              isSelected={selected?.overlayId === o.id}
            />
          )
        }
        return null
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

function setToolKeepSelection(tool: 'select', pageId: string, overlayId: string) {
  useStore.setState({ tool, selected: { pageId, overlayId } })
}

/** Generisches Ziehen: liefert Deltas in Punkten. */
function useDrag(zoom: number, onMove: (dx: number, dy: number) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    capturePointer(e.target, e.pointerId)
    start.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!start.current) return
    const dx = (e.clientX - start.current.x) / zoom
    const dy = (e.clientY - start.current.y) / zoom
    start.current = { x: e.clientX, y: e.clientY }
    onMove(dx, dy)
  }
  const onPointerUp = () => {
    start.current = null
  }
  return { onPointerDown, onPointerMove, onPointerUp }
}

/* ------------------------------------------------------------------ */
/* Textfeld                                                            */
/* ------------------------------------------------------------------ */

function TextItem({
  overlay: o,
  pageId,
  zoom,
  interactive,
  isSelected,
}: {
  overlay: TextOverlay
  pageId: string
  zoom: number
  interactive: boolean
  isSelected: boolean
}) {
  const updateOverlay = useStore((s) => s.updateOverlay)
  const removeOverlay = useStore((s) => s.removeOverlay)
  const select = useStore((s) => s.select)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const drag = useDrag(zoom, (dx, dy) =>
    updateOverlay(pageId, o.id, { x: o.x + dx, y: o.y + dy }),
  )
  const resize = useDrag(zoom, (dx) =>
    updateOverlay(pageId, o.id, { w: Math.max(40, o.w + dx) }),
  )

  // Höhe automatisch an den Inhalt anpassen
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [o.text, o.fontSize, o.w, zoom])

  // Frisch erstellte Felder (leer oder aus „Text bearbeiten“) direkt fokussieren
  useEffect(() => {
    if (isSelected) {
      const el = textareaRef.current
      el?.focus()
      el?.setSelectionRange(el.value.length, el.value.length)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`absolute ${isSelected ? 'ring-2 ring-gold-500' : interactive ? 'hover:ring-1 hover:ring-gold-400/70' : ''}`}
      style={{
        left: o.x * zoom,
        top: o.y * zoom,
        width: o.w * zoom,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      onPointerDown={(e) => {
        e.stopPropagation()
        select(pageId, o.id)
      }}
    >
      <textarea
        ref={textareaRef}
        value={o.text}
        placeholder="Text …"
        aria-label="Text field"
        spellCheck={false}
        onChange={(e) => updateOverlay(pageId, o.id, { text: e.target.value })}
        onBlur={() => {
          if (o.text.trim() === '') removeOverlay(pageId, o.id)
        }}
        className="block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-ink-500/40"
        style={{
          fontSize: o.fontSize * zoom,
          lineHeight: o.lineHeight ?? TEXT_LINE_HEIGHT,
          color: o.color,
          fontFamily: FONT_CSS[o.font],
          fontWeight: o.bold ? 700 : 400,
          fontStyle: o.italic ? 'italic' : 'normal',
          // Absatz-Felder brechen wie in Word an der Feldbreite um
          whiteSpace: o.wrap ? 'pre-wrap' : 'pre',
          overflowWrap: o.wrap ? 'break-word' : 'normal',
        }}
      />
      {isSelected && (
        <>
          {/* Griff zum Verschieben */}
          <div
            className="absolute -top-6 left-1/2 flex h-5 w-9 -translate-x-1/2 cursor-move items-center justify-center rounded-md bg-gold-500 text-white shadow"
            {...drag}
          >
            <GripHorizontal size={14} />
          </div>
          {/* Griff zum Ändern der Breite */}
          <div
            className="absolute top-1/2 -right-1.5 h-4 w-3 -translate-y-1/2 cursor-ew-resize rounded-sm bg-gold-500 shadow"
            {...resize}
          />
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Rechteckige Objekte: Abdecken & Bilder                              */
/* ------------------------------------------------------------------ */

function BoxItem({
  overlay: o,
  pageId,
  zoom,
  interactive,
  isSelected,
}: {
  overlay: WhiteoutOverlay | ImageOverlay
  pageId: string
  zoom: number
  interactive: boolean
  isSelected: boolean
}) {
  const updateOverlay = useStore((s) => s.updateOverlay)
  const select = useStore((s) => s.select)

  const drag = useDrag(zoom, (dx, dy) =>
    updateOverlay(pageId, o.id, { x: o.x + dx, y: o.y + dy }),
  )
  const resize = useDrag(zoom, (dx, dy) => {
    if (o.type === 'image') {
      // Seitenverhältnis beibehalten
      const w = Math.max(20, o.w + dx)
      updateOverlay(pageId, o.id, { w, h: w / o.aspect })
    } else {
      updateOverlay(pageId, o.id, {
        w: Math.max(8, o.w + dx),
        h: Math.max(8, o.h + dy),
      })
    }
  })

  return (
    <div
      className={`absolute ${isSelected ? 'ring-2 ring-gold-500' : interactive ? 'cursor-move hover:ring-1 hover:ring-gold-400/70' : ''}`}
      style={{
        left: o.x * zoom,
        top: o.y * zoom,
        width: o.w * zoom,
        height: o.h * zoom,
        background: o.type === 'whiteout' ? o.color : undefined,
        pointerEvents: interactive ? 'auto' : 'none',
      }}
      onPointerDown={(e) => {
        select(pageId, o.id)
        drag.onPointerDown(e)
      }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
    >
      {o.type === 'image' && (
        <img
          src={o.dataUrl}
          alt=""
          draggable={false}
          className="h-full w-full select-none object-fill"
        />
      )}
      {isSelected && (
        <div
          className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm border border-white bg-gold-500 shadow"
          {...resize}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Vektor-Objekte im SVG: Stift, Marker, Formen                        */
/* ------------------------------------------------------------------ */

function isDrawLike(o: DrawOverlay | ShapeOverlay): o is DrawOverlay {
  return o.type === 'draw' || o.type === 'highlight'
}

function VectorItem({
  overlay: o,
  pageId,
  zoom,
  interactive,
  isSelected,
}: {
  overlay: DrawOverlay | ShapeOverlay
  pageId: string
  zoom: number
  interactive: boolean
  isSelected: boolean
}) {
  const updateOverlay = useStore((s) => s.updateOverlay)
  const select = useStore((s) => s.select)

  const drag = useDrag(zoom, (dx, dy) => {
    if (isDrawLike(o)) {
      const pts = [...o.points]
      for (let i = 0; i < pts.length; i += 2) {
        pts[i] += dx
        pts[i + 1] += dy
      }
      updateOverlay(pageId, o.id, { points: pts })
    } else {
      updateOverlay(pageId, o.id, {
        x1: o.x1 + dx,
        y1: o.y1 + dy,
        x2: o.x2 + dx,
        y2: o.y2 + dy,
      })
    }
  })

  const common = {
    style: {
      pointerEvents: interactive ? ('stroke' as const) : ('none' as const),
      cursor: interactive ? 'move' : undefined,
    },
    onPointerDown: (e: ReactPointerEvent) => {
      select(pageId, o.id)
      drag.onPointerDown(e)
    },
    onPointerMove: drag.onPointerMove,
    onPointerUp: drag.onPointerUp,
  }
  const highlight = isSelected
    ? { filter: 'drop-shadow(0 0 2px rgba(169, 130, 82, 0.9))' }
    : undefined

  if (isDrawLike(o)) {
    const d = pointsToPath(o.points)
    return (
      <path
        d={d}
        fill="none"
        stroke={o.color}
        strokeWidth={o.width}
        strokeOpacity={o.opacity}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ ...common.style, ...highlight }}
        onPointerDown={common.onPointerDown}
        onPointerMove={common.onPointerMove}
        onPointerUp={common.onPointerUp}
      />
    )
  }

  const stroke = { stroke: o.color, strokeWidth: o.width, fill: 'none' as const }
  if (o.type === 'rect') {
    return (
      <rect
        x={Math.min(o.x1, o.x2)}
        y={Math.min(o.y1, o.y2)}
        width={Math.abs(o.x2 - o.x1)}
        height={Math.abs(o.y2 - o.y1)}
        {...stroke}
        style={{ ...common.style, ...highlight }}
        onPointerDown={common.onPointerDown}
        onPointerMove={common.onPointerMove}
        onPointerUp={common.onPointerUp}
      />
    )
  }
  if (o.type === 'ellipse') {
    return (
      <ellipse
        cx={(o.x1 + o.x2) / 2}
        cy={(o.y1 + o.y2) / 2}
        rx={Math.abs(o.x2 - o.x1) / 2}
        ry={Math.abs(o.y2 - o.y1) / 2}
        {...stroke}
        style={{ ...common.style, ...highlight }}
        onPointerDown={common.onPointerDown}
        onPointerMove={common.onPointerMove}
        onPointerUp={common.onPointerUp}
      />
    )
  }

  // Linie / Pfeil
  const angle = Math.atan2(o.y2 - o.y1, o.x2 - o.x1)
  const len = Math.max(8, o.width * 4)
  return (
    <g
      style={{ ...common.style, ...highlight }}
      onPointerDown={common.onPointerDown}
      onPointerMove={common.onPointerMove}
      onPointerUp={common.onPointerUp}
    >
      <line x1={o.x1} y1={o.y1} x2={o.x2} y2={o.y2} {...stroke} strokeLinecap="round" />
      {o.type === 'arrow' &&
        [Math.PI - 0.5, Math.PI + 0.5].map((off) => (
          <line
            key={off}
            x1={o.x2}
            y1={o.y2}
            x2={o.x2 + len * Math.cos(angle + off)}
            y2={o.y2 + len * Math.sin(angle + off)}
            {...stroke}
            strokeLinecap="round"
          />
        ))}
    </g>
  )
}

function pointsToPath(points: number[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0]} ${points[1]}`
  for (let i = 2; i < points.length; i += 2) {
    d += ` L ${points[i]} ${points[i + 1]}`
  }
  return d
}
