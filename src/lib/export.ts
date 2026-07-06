import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  LineCapStyle,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import type {
  DrawOverlay,
  FormValues,
  FontFamily,
  ImageOverlay,
  Overlay,
  PageRef,
  ShapeOverlay,
  Source,
  TextOverlay,
  WhiteoutOverlay,
} from './types'
import { displayToPdf, displayRectToPdf, normalizeRotation } from './coords'
import { hexToRgb } from './utils'

/** Standard-Zeilenhöhe der Textfelder – muss zur CSS-Darstellung passen. */
export const TEXT_LINE_HEIGHT = 1.25

/**
 * Abstand der Baseline vom oberen Zeilenrand als Faktor der Schriftgröße.
 * CSS verteilt den Durchschuss halb über, halb unter die Glyphen (Half-Leading);
 * die Ascent liegt bei den Standardschriften bei rund 0,8 em.
 */
export function baselineFactor(lineHeight: number): number {
  return (lineHeight - 1) / 2 + 0.8
}

const FONT_MAP: Record<FontFamily, Record<string, StandardFonts>> = {
  Helvetica: {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
    bolditalic: StandardFonts.HelveticaBoldOblique,
  },
  Times: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
    bolditalic: StandardFonts.TimesRomanBoldItalic,
  },
  Courier: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
    bolditalic: StandardFonts.CourierBoldOblique,
  },
}

function fontVariant(o: TextOverlay): StandardFonts {
  const key =
    o.bold && o.italic ? 'bolditalic' : o.bold ? 'bold' : o.italic ? 'italic' : 'regular'
  return FONT_MAP[o.font][key]
}

/** Zeichen entfernen, die die Standardschriften (WinAnsi) nicht kennen. */
function sanitizeForFont(text: string, font: PDFFont): string {
  let out = ''
  for (const ch of text) {
    if (ch === '\n') {
      out += ch
      continue
    }
    try {
      font.widthOfTextAtSize(ch, 10)
      out += ch
    } catch {
      out += '?'
    }
  }
  return out
}

interface ExportOptions {
  /** Nur diese Seiten exportieren (Standard: alle). */
  pageSubset?: PageRef[]
}

/**
 * Baut aus Quellen, Seitenreihenfolge, Overlays und Formularwerten das fertige PDF.
 * Läuft – wie alles bei Papedit – vollständig im Browser.
 */
export async function exportPdf(
  sources: Record<string, Source>,
  pages: PageRef[],
  overlays: Record<string, Overlay[]>,
  formValues: FormValues,
  options: ExportOptions = {},
): Promise<Uint8Array> {
  const usePages = options.pageSubset ?? pages
  const out = await PDFDocument.create()
  out.setProducer('PapEdit – free PDF editor in your browser')

  // 1) Quellen vorbereiten: Formularwerte eintragen und einbetten (flatten),
  //    damit sie das Kopieren einzelner Seiten überleben.
  const srcDocs = new Map<string, PDFDocument>()
  for (const page of usePages) {
    if (srcDocs.has(page.srcId)) continue
    const src = sources[page.srcId]
    let doc = await PDFDocument.load(src.bytes)
    const values = formValues[page.srcId]
    if (values && Object.keys(values).length > 0) {
      fillForm(doc, values)
      const filled = await doc.save()
      doc = await PDFDocument.load(filled)
    }
    srcDocs.set(page.srcId, doc)
  }

  // 2) Seiten in Anzeige-Reihenfolge kopieren
  const fontCache = new Map<StandardFonts, PDFFont>()
  const getFont = async (f: StandardFonts) => {
    let font = fontCache.get(f)
    if (!font) {
      font = await out.embedFont(f)
      fontCache.set(f, font)
    }
    return font
  }

  for (const pageRef of usePages) {
    const src = sources[pageRef.srcId]
    const srcDoc = srcDocs.get(pageRef.srcId)!
    const [copied] = await out.copyPages(srcDoc, [pageRef.srcIndex])
    out.addPage(copied)

    const total = normalizeRotation(src.baseRotations[pageRef.srcIndex] + pageRef.rotation)
    copied.setRotation(degrees(total))

    // 3) Overlays dieser Seite einzeichnen
    const size = src.pageSizes[pageRef.srcIndex]
    for (const o of overlays[pageRef.id] ?? []) {
      await drawOverlay(copied, o, size.w, size.h, total, getFont)
    }
  }

  return out.save()
}

/** Formularfelder einer Quelle ausfüllen und statisch einbetten. */
function fillForm(doc: PDFDocument, values: Record<string, string | boolean>) {
  const form = doc.getForm()
  for (const [name, value] of Object.entries(values)) {
    try {
      if (typeof value === 'boolean') {
        const box = form.getCheckBox(name)
        if (value) box.check()
        else box.uncheck()
      } else {
        try {
          form.getTextField(name).setText(value)
        } catch {
          try {
            form.getDropdown(name).select(value)
          } catch {
            form.getRadioGroup(name).select(value)
          }
        }
      }
    } catch {
      // Unbekanntes oder nicht unterstütztes Feld – überspringen
    }
  }
  try {
    form.updateFieldAppearances()
    form.flatten()
  } catch {
    // Flatten kann bei exotischen Formularen scheitern – Werte sind trotzdem gesetzt
  }
}

async function drawOverlay(
  page: PDFPage,
  o: Overlay,
  W: number,
  H: number,
  rot: number,
  getFont: (f: StandardFonts) => Promise<PDFFont>,
) {
  switch (o.type) {
    case 'whiteout':
      return drawWhiteout(page, o, W, H, rot)
    case 'text':
      return drawText(page, o, W, H, rot, getFont)
    case 'image':
      return drawImage(page, o, W, H, rot)
    case 'draw':
    case 'highlight':
      return drawPath(page, o, W, H, rot)
    default:
      return drawShape(page, o, W, H, rot)
  }
}

function drawWhiteout(page: PDFPage, o: WhiteoutOverlay, W: number, H: number, rot: number) {
  const r = displayRectToPdf(o.x, o.y, o.w, o.h, W, H, rot)
  const c = hexToRgb(o.color)
  page.drawRectangle({
    x: r.x,
    y: r.y,
    width: r.w,
    height: r.h,
    color: rgb(c.r, c.g, c.b),
  })
}

/**
 * Fließtext an der Feldbreite umbrechen – mit den Metriken der
 * eingebetteten PDF-Schrift, damit der Export der Anzeige entspricht.
 */
function wrapLines(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = []
  for (const logical of text.split('\n')) {
    if (!logical) {
      out.push('')
      continue
    }
    let line = ''
    for (const word of logical.split(' ')) {
      const candidate = line ? `${line} ${word}` : word
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxW) {
        line = candidate
      } else {
        out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  return out
}

async function drawText(
  page: PDFPage,
  o: TextOverlay,
  W: number,
  H: number,
  rot: number,
  getFont: (f: StandardFonts) => Promise<PDFFont>,
) {
  const font = await getFont(fontVariant(o))
  const c = hexToRgb(o.color)
  const lh = o.lineHeight ?? TEXT_LINE_HEIGHT
  const lineH = o.fontSize * lh
  const clean = sanitizeForFont(o.text, font)
  const lines = o.wrap ? wrapLines(clean, font, o.fontSize, o.w) : clean.split('\n')

  // Jede Zeile einzeln zeichnen: Baseline im Anzeige-Raum bestimmen,
  // in den PDF-Raum abbilden und – bei gedrehten Seiten – mitdrehen,
  // damit der Text auf dem Bildschirm waagerecht bleibt.
  lines.forEach((line, i) => {
    if (!line) return
    const baselineY = o.y + i * lineH + o.fontSize * baselineFactor(lh)
    const p = displayToPdf(o.x, baselineY, W, H, rot)
    page.drawText(line, {
      x: p.x,
      y: p.y,
      size: o.fontSize,
      font,
      color: rgb(c.r, c.g, c.b),
      rotate: degrees(rot),
    })
  })
}

async function drawImage(page: PDFPage, o: ImageOverlay, W: number, H: number, rot: number) {
  const doc = page.doc
  const isPng = o.dataUrl.startsWith('data:image/png')
  const bytes = dataUrlToBytes(o.dataUrl)
  const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)

  // pdf-lib verankert Bilder unten links und dreht um diesen Punkt.
  const pivot = displayToPdf(o.x, o.y + o.h, W, H, rot)
  page.drawImage(img, {
    x: pivot.x,
    y: pivot.y,
    width: o.w,
    height: o.h,
    rotate: degrees(rot),
  })
}

function drawPath(page: PDFPage, o: DrawOverlay, W: number, H: number, rot: number) {
  const c = hexToRgb(o.color)
  const color = rgb(c.r, c.g, c.b)
  for (let i = 0; i + 3 < o.points.length; i += 2) {
    const a = displayToPdf(o.points[i], o.points[i + 1], W, H, rot)
    const b = displayToPdf(o.points[i + 2], o.points[i + 3], W, H, rot)
    page.drawLine({
      start: a,
      end: b,
      thickness: o.width,
      color,
      opacity: o.opacity,
      lineCap: LineCapStyle.Round,
    })
  }
}

function drawShape(page: PDFPage, o: ShapeOverlay, W: number, H: number, rot: number) {
  const c = hexToRgb(o.color)
  const color = rgb(c.r, c.g, c.b)

  if (o.type === 'line' || o.type === 'arrow') {
    const a = displayToPdf(o.x1, o.y1, W, H, rot)
    const b = displayToPdf(o.x2, o.y2, W, H, rot)
    page.drawLine({ start: a, end: b, thickness: o.width, color, lineCap: LineCapStyle.Round })
    if (o.type === 'arrow') {
      // Pfeilspitze: zwei kurze Linien im 30°-Winkel zur Richtung
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      const len = Math.max(8, o.width * 4)
      for (const off of [Math.PI - 0.5, Math.PI + 0.5]) {
        page.drawLine({
          start: b,
          end: {
            x: b.x + len * Math.cos(angle + off),
            y: b.y + len * Math.sin(angle + off),
          },
          thickness: o.width,
          color,
          lineCap: LineCapStyle.Round,
        })
      }
    }
    return
  }

  const x = Math.min(o.x1, o.x2)
  const y = Math.min(o.y1, o.y2)
  const r = displayRectToPdf(x, y, Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1), W, H, rot)
  if (o.type === 'rect') {
    page.drawRectangle({
      x: r.x,
      y: r.y,
      width: r.w,
      height: r.h,
      borderColor: color,
      borderWidth: o.width,
    })
  } else {
    page.drawEllipse({
      x: r.x + r.w / 2,
      y: r.y + r.h / 2,
      xScale: r.w / 2,
      yScale: r.h / 2,
      borderColor: color,
      borderWidth: o.width,
    })
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
