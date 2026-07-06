import type { PDFDocumentProxy } from 'pdfjs-dist'

/** Verfügbare Standardschriften (werden beim Export mit pdf-lib eingebettet). */
export type FontFamily = 'Helvetica' | 'Times' | 'Courier'

/** Frei platzierbares Textfeld (Overlay-Bearbeitung, Kapitel 4 des Konzepts). */
export interface TextOverlay {
  id: string
  type: 'text'
  /** Position/Breite in PDF-Punkten, bezogen auf die angezeigte (gedrehte) Seite, Ursprung oben links. */
  x: number
  y: number
  w: number
  text: string
  fontSize: number
  color: string
  font: FontFamily
  bold: boolean
  italic: boolean
}

/** Deckfläche, um vorhandenen Text zu „redigieren & ersetzen“. */
export interface WhiteoutOverlay {
  id: string
  type: 'whiteout'
  x: number
  y: number
  w: number
  h: number
  color: string
}

/** Eingefügtes Bild oder gezeichnete Unterschrift. */
export interface ImageOverlay {
  id: string
  type: 'image'
  x: number
  y: number
  w: number
  h: number
  dataUrl: string
  /** Seitenverhältnis Breite/Höhe, damit beim Skalieren nichts verzerrt. */
  aspect: number
}

/** Freihand-Stift oder Textmarker (flaches Array [x0, y0, x1, y1, …]). */
export interface DrawOverlay {
  id: string
  type: 'draw' | 'highlight'
  points: number[]
  color: string
  width: number
  opacity: number
}

/** Geometrische Formen. */
export interface ShapeOverlay {
  id: string
  type: 'rect' | 'ellipse' | 'line' | 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  width: number
}

export type Overlay =
  | TextOverlay
  | WhiteoutOverlay
  | ImageOverlay
  | DrawOverlay
  | ShapeOverlay

export type Tool =
  | 'select'
  | 'text'
  | 'whiteout'
  | 'draw'
  | 'highlight'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'

/** Eine geladene PDF-Quelldatei (bei „Zusammenfügen“ kann es mehrere geben). */
export interface Source {
  id: string
  name: string
  /** Original-Bytes – bleiben unangetastet, pdf.js bekommt immer eine Kopie. */
  bytes: Uint8Array
  doc: PDFDocumentProxy
  pageCount: number
  /** Intrinsische /Rotate-Werte der Seiten. */
  baseRotations: number[]
  /** Ungedrehte Seitengrößen in PDF-Punkten. */
  pageSizes: { w: number; h: number }[]
}

/** Eine Seite im aktuellen Dokument (Reihenfolge = Anzeige-Reihenfolge). */
export interface PageRef {
  id: string
  srcId: string
  srcIndex: number
  /** Vom Nutzer hinzugefügte Drehung (0/90/180/270). */
  rotation: number
}

/** Ausgefüllte Formularfelder, je Quelle nach Feldname. */
export type FormValues = Record<string, Record<string, string | boolean>>
