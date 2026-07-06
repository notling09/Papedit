import { useEffect, useState, type RefObject } from 'react'
import type { FontFamily, PageRef, TextOverlay, WhiteoutOverlay } from '../lib/types'
import { useStore } from '../store/useStore'
import { pdfToDisplay } from '../lib/coords'
import { uid, clamp } from '../lib/utils'
import { baselineFactor, TEXT_LINE_HEIGHT } from '../lib/export'

interface Props {
  pageRef: PageRef
  pageW: number
  pageH: number
  rot: number
  zoom: number
  canvasRef: RefObject<HTMLCanvasElement | null>
}

/** Eine Textzeile im (ungedrehten) PDF-Raum. */
interface Line {
  x: number
  y: number
  w: number
  fs: number
  cos: number
  sin: number
  str: string
  font: FontFamily
}

/** Ein anklickbarer Absatz im Anzeige-Raum (Punkte). */
interface Para {
  x: number
  y: number
  w: number
  h: number
  baselineX: number
  baselineY: number
  text: string
  fontSize: number
  font: FontFamily
  lineHeight: number
  pdfW: number
}

/**
 * „Text bearbeiten“-Werkzeug: gruppiert den vorhandenen PDF-Text zu Absätzen.
 * Ein Klick deckt den Absatz in der Hintergrundfarbe ab und legt ein
 * bearbeitbares Feld mit automatischem Zeilenumbruch (wie in Word) darüber.
 */
export default function TextEditLayer({ pageRef, pageW, pageH, rot, zoom, canvasRef }: Props) {
  const src = useStore((s) => s.sources[pageRef.srcId])
  const addOverlay = useStore((s) => s.addOverlay)
  const defaults = useStore((s) => s.defaults)
  const [paras, setParas] = useState<Para[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const page = await src.doc.getPage(pageRef.srcIndex + 1)
      const content = await page.getTextContent()
      if (cancelled) return

      // 1) Fragmente einsammeln (pdf.js liefert Zeilen oft in Stücken)
      const frags: Line[] = []
      for (const it of content.items) {
        if (!('str' in it) || !it.str.trim()) continue
        const [a, b, , d, e, f] = it.transform as number[]
        const fs = Math.hypot(it.transform[2], d) || 10
        const scale = Math.hypot(a, b) || 1
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const family: string = (content.styles as any)[it.fontName]?.fontFamily ?? ''
        const font: FontFamily = /mono|courier/i.test(family)
          ? 'Courier'
          : /serif/i.test(family) && !/sans/i.test(family)
            ? 'Times'
            : 'Helvetica'
        frags.push({ x: e, y: f, w: it.width, fs, cos: a / scale, sin: b / scale, str: it.str, font })
      }

      // 2) Fragmente derselben Zeile zusammenfassen
      frags.sort((p, q) => {
        const dy = q.y - p.y
        if (Math.abs(dy) > Math.min(p.fs, q.fs) * 0.4) return dy
        return p.x - q.x
      })
      const lines: Line[] = []
      let cur: Line | null = null
      for (const fr of frags) {
        if (
          cur &&
          Math.abs(fr.y - cur.y) < cur.fs * 0.35 &&
          Math.abs(fr.fs - cur.fs) < cur.fs * 0.3 &&
          fr.font === cur.font
        ) {
          const gap = fr.x - (cur.x + cur.w)
          if (gap > -cur.fs * 0.4 && gap < cur.fs * 1.4) {
            const needsSpace =
              gap > cur.fs * 0.12 && !cur.str.endsWith(' ') && !fr.str.startsWith(' ')
            cur.str += (needsSpace ? ' ' : '') + fr.str
            cur.w = fr.x + fr.w - cur.x
            continue
          }
        }
        cur = { ...fr }
        lines.push(cur)
      }

      // 3) Zeilen zu Absätzen gruppieren (nur waagerechter Text; gedrehter
      //    Text bleibt eine Einzelzeile)
      interface Group {
        lines: Line[]
        x0: number
        x1: number
        lastY: number
        fs: number
        font: FontFamily
      }
      const groups: Group[] = []
      const solo: Line[] = []
      const horizontal = lines.filter((ln) => Math.abs(ln.sin) < 0.1)
      solo.push(...lines.filter((ln) => Math.abs(ln.sin) >= 0.1))
      horizontal.sort((p, q) => q.y - p.y || p.x - q.x)

      for (const ln of horizontal) {
        const g = groups.find((g) => {
          if (g.font !== ln.font || Math.abs(g.fs - ln.fs) > g.fs * 0.2) return false
          const gap = g.lastY - ln.y
          if (gap < g.fs * 0.6 || gap > g.fs * 2.0) return false
          // Breiten müssen sich deutlich überlappen (verhindert Spalten-Mix)
          const overlap = Math.min(g.x1, ln.x + ln.w) - Math.max(g.x0, ln.x)
          return overlap > Math.min(g.x1 - g.x0, ln.w) * 0.3
        })
        if (g) {
          g.lines.push(ln)
          g.x0 = Math.min(g.x0, ln.x)
          g.x1 = Math.max(g.x1, ln.x + ln.w)
          g.lastY = ln.y
        } else {
          groups.push({ lines: [ln], x0: ln.x, x1: ln.x + ln.w, lastY: ln.y, fs: ln.fs, font: ln.font })
        }
      }

      // 4) In anklickbare Absätze (Anzeige-Raum) umrechnen
      const result: Para[] = []
      for (const g of groups) {
        const first = g.lines[0]
        const last = g.lines[g.lines.length - 1]

        // Original-Zeilenabstand messen, damit das Ersatzfeld gleich hoch läuft
        let lineHeight = TEXT_LINE_HEIGHT
        if (g.lines.length > 1) {
          const gaps = g.lines.slice(1).map((ln, i) => g.lines[i].y - ln.y)
          gaps.sort((a, b) => a - b)
          lineHeight = clamp(gaps[Math.floor(gaps.length / 2)] / g.fs, 1.02, 1.8)
        }

        // Text zusammenfügen; Silbentrennung am Zeilenende fortführen
        let text = ''
        for (const ln of g.lines) {
          const s = ln.str.trim()
          if (!text) text = s
          else if (text.endsWith('-')) text += s
          else text += ' ' + s
        }

        const top = first.y + g.fs * 0.98
        const bottom = last.y - g.fs * 0.3
        const c1 = pdfToDisplay(g.x0, bottom, pageW, pageH, rot)
        const c2 = pdfToDisplay(g.x1, top, pageW, pageH, rot)
        const base = pdfToDisplay(g.x0, first.y, pageW, pageH, rot)
        result.push({
          x: Math.min(c1.x, c2.x),
          y: Math.min(c1.y, c2.y),
          w: Math.abs(c1.x - c2.x),
          h: Math.abs(c1.y - c2.y),
          baselineX: base.x,
          baselineY: base.y,
          text,
          fontSize: g.fs,
          font: g.font,
          lineHeight,
          pdfW: g.x1 - g.x0,
        })
      }

      // Gedrehte Einzelzeilen: Box über die vier Ecken bestimmen
      for (const ln of solo) {
        const ax = ln.cos * ln.w
        const ay = ln.sin * ln.w
        const px = -ln.sin
        const py = ln.cos
        const corners = [
          [ln.x - px * ln.fs * 0.26, ln.y - py * ln.fs * 0.26],
          [ln.x + px * ln.fs * 0.98, ln.y + py * ln.fs * 0.98],
          [ln.x + ax - px * ln.fs * 0.26, ln.y + ay - py * ln.fs * 0.26],
          [ln.x + ax + px * ln.fs * 0.98, ln.y + ay + py * ln.fs * 0.98],
        ].map(([cx, cy]) => pdfToDisplay(cx, cy, pageW, pageH, rot))
        const xs = corners.map((c) => c.x)
        const ys = corners.map((c) => c.y)
        const base = pdfToDisplay(ln.x, ln.y, pageW, pageH, rot)
        result.push({
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
          baselineX: base.x,
          baselineY: base.y,
          text: ln.str.trim(),
          fontSize: ln.fs,
          font: ln.font,
          lineHeight: TEXT_LINE_HEIGHT,
          pdfW: ln.w,
        })
      }

      setParas(result)
    })()
    return () => {
      cancelled = true
    }
  }, [pageRef, src, pageW, pageH, rot])

  const editPara = (para: Para) => {
    // Hintergrundfarbe neben dem Absatz vom gerenderten Canvas abtasten,
    // damit die Abdeckung auch auf farbigen Flächen unsichtbar bleibt.
    const color = sampleBackground(canvasRef.current, para, pageW, pageH, rot)

    const whiteout: WhiteoutOverlay = {
      id: uid(),
      type: 'whiteout',
      x: para.x - 2,
      y: para.y - 1.5,
      w: para.w + 4,
      h: para.h + 3,
      color,
    }
    addOverlay(pageRef.id, whiteout)

    const text: TextOverlay = {
      id: uid(),
      type: 'text',
      x: para.baselineX,
      y: para.baselineY - para.fontSize * baselineFactor(para.lineHeight),
      // Etwas Luft, damit der Umbruch nicht früher fällt als im Original
      w: para.pdfW + 6,
      text: para.text,
      fontSize: Math.round(para.fontSize * 10) / 10,
      color: defaults.textColor,
      font: para.font,
      bold: false,
      italic: false,
      wrap: true,
      lineHeight: para.lineHeight,
    }
    addOverlay(pageRef.id, text)
    // Direkt in den Auswahlmodus wechseln, Auswahl auf dem neuen Feld lassen
    useStore.setState({ tool: 'select', selected: { pageId: pageRef.id, overlayId: text.id } })
  }

  return (
    <div className="absolute inset-0">
      {paras.map((para, i) => (
        <button
          key={i}
          title="Click to edit this paragraph"
          onClick={() => editPara(para)}
          className="absolute cursor-text rounded-[2px] outline-1 outline-dashed outline-gold-400/50 transition-colors hover:bg-gold-400/25 hover:outline-gold-500"
          style={{
            left: (para.x - 2) * zoom,
            top: (para.y - 1.5) * zoom,
            width: (para.w + 4) * zoom,
            height: (para.h + 3) * zoom,
          }}
        />
      ))}
    </div>
  )
}

/** Mittlere Farbe der Pixel rund um die Absatzbox (Fallback: Weiß). */
function sampleBackground(
  canvas: HTMLCanvasElement | null,
  para: Para,
  pageW: number,
  pageH: number,
  rot: number,
): string {
  try {
    if (!canvas || canvas.width === 0) return '#ffffff'
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return '#ffffff'
    const dispW = rot === 90 || rot === 270 ? pageH : pageW
    const k = canvas.width / dispW // Punkte → Canvas-Pixel
    const probes: [number, number][] = [
      [para.x - 5, para.y + para.h / 2],
      [para.x + para.w + 5, para.y + para.h / 2],
      [para.x + para.w / 2, para.y - 5],
      [para.x + para.w / 2, para.y + para.h + 5],
    ]
    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (const [px, py] of probes) {
      const cx = Math.round(px * k)
      const cy = Math.round(py * k)
      if (cx < 0 || cy < 0 || cx >= canvas.width || cy >= canvas.height) continue
      const d = ctx.getImageData(cx, cy, 1, 1).data
      if (d[3] === 0) continue
      r += d[0]
      g += d[1]
      b += d[2]
      n++
    }
    if (n === 0) return '#ffffff'
    const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
    return `#${hex(r)}${hex(g)}${hex(b)}`
  } catch {
    return '#ffffff'
  }
}
