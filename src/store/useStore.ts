import { create } from 'zustand'
import type { FormValues, Overlay, PageRef, Source, Tool } from '../lib/types'
import { displaySize, normalizeRotation } from '../lib/coords'
import { uid, clamp } from '../lib/utils'

/** Voreinstellungen für neue Overlays (über die Eigenschaften-Leiste änderbar). */
export interface ToolDefaults {
  fontSize: number
  fontFamily: 'Helvetica' | 'Times' | 'Courier'
  textColor: string
  bold: boolean
  italic: boolean
  strokeColor: string
  strokeWidth: number
  highlightColor: string
  whiteoutColor: string
}

interface PapeditState {
  sources: Record<string, Source>
  pages: PageRef[]
  overlays: Record<string, Overlay[]>
  formValues: FormValues

  tool: Tool
  zoom: number
  dark: boolean
  activePageId: string | null
  selected: { pageId: string; overlayId: string } | null
  defaults: ToolDefaults

  // Dokument
  addSource: (src: Source) => void
  closeDocument: () => void

  // Seiten
  rotatePage: (pageId: string) => void
  deletePage: (pageId: string) => void
  duplicatePage: (pageId: string) => void
  movePage: (fromIndex: number, toIndex: number) => void

  // Overlays
  addOverlay: (pageId: string, overlay: Overlay) => void
  updateOverlay: (pageId: string, overlayId: string, patch: Partial<Overlay>) => void
  removeOverlay: (pageId: string, overlayId: string) => void
  select: (pageId: string, overlayId: string) => void
  deselect: () => void

  // Formulare
  setFormValue: (srcId: string, field: string, value: string | boolean) => void

  // UI
  setTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  setDark: (dark: boolean) => void
  setActivePage: (pageId: string) => void
  setDefaults: (patch: Partial<ToolDefaults>) => void
}

export const useStore = create<PapeditState>((set, get) => ({
  sources: {},
  pages: [],
  overlays: {},
  formValues: {},

  tool: 'select',
  zoom: 1,
  dark: localStorage.getItem('papedit-dark') === '1',
  activePageId: null,
  selected: null,
  defaults: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    textColor: '#2a2118',
    bold: false,
    italic: false,
    strokeColor: '#a98252',
    strokeWidth: 2,
    highlightColor: '#f6d35b',
    whiteoutColor: '#ffffff',
  },

  addSource: (src) =>
    set((s) => {
      const newPages: PageRef[] = Array.from({ length: src.pageCount }, (_, i) => ({
        id: uid(),
        srcId: src.id,
        srcIndex: i,
        rotation: 0,
      }))
      return {
        sources: { ...s.sources, [src.id]: src },
        pages: [...s.pages, ...newPages],
        activePageId: s.activePageId ?? newPages[0]?.id ?? null,
      }
    }),

  closeDocument: () => {
    // pdf.js-Worker der Quellen freigeben
    for (const src of Object.values(get().sources)) {
      void src.doc.destroy()
    }
    set({
      sources: {},
      pages: [],
      overlays: {},
      formValues: {},
      activePageId: null,
      selected: null,
      tool: 'select',
      zoom: 1,
    })
  },

  rotatePage: (pageId) =>
    set((s) => {
      const page = s.pages.find((p) => p.id === pageId)
      if (!page) return s
      const src = s.sources[page.srcId]
      const oldTotal = normalizeRotation(src.baseRotations[page.srcIndex] + page.rotation)
      const size = src.pageSizes[page.srcIndex]
      const { h: oldDispH } = displaySize(size.w, size.h, oldTotal)

      // Vorhandene Overlays mitdrehen: Punkt (x, y) → (H_alt − y, x)
      const rot = (x: number, y: number) => ({ x: oldDispH - y, y: x })
      const rotated = (s.overlays[pageId] ?? []).map((o): Overlay => {
        switch (o.type) {
          case 'text': {
            // Näherung der Boxhöhe, damit der Anker sinnvoll mitwandert
            const lines = o.text.split('\n').length
            const h = lines * o.fontSize * 1.25
            const p = rot(o.x, o.y + h)
            return { ...o, x: p.x, y: p.y }
          }
          case 'whiteout': {
            const p = rot(o.x, o.y + o.h)
            return { ...o, x: p.x, y: p.y, w: o.h, h: o.w }
          }
          case 'image': {
            const p = rot(o.x, o.y + o.h)
            return { ...o, x: p.x, y: p.y }
          }
          case 'draw':
          case 'highlight': {
            const pts: number[] = []
            for (let i = 0; i < o.points.length; i += 2) {
              const p = rot(o.points[i], o.points[i + 1])
              pts.push(p.x, p.y)
            }
            return { ...o, points: pts }
          }
          default: {
            const a = rot(o.x1, o.y1)
            const b = rot(o.x2, o.y2)
            return { ...o, x1: a.x, y1: a.y, x2: b.x, y2: b.y }
          }
        }
      })

      return {
        pages: s.pages.map((p) =>
          p.id === pageId ? { ...p, rotation: normalizeRotation(p.rotation + 90) } : p,
        ),
        overlays: { ...s.overlays, [pageId]: rotated },
      }
    }),

  deletePage: (pageId) =>
    set((s) => {
      if (s.pages.length <= 1) return s // die letzte Seite bleibt
      const pages = s.pages.filter((p) => p.id !== pageId)
      const overlays = { ...s.overlays }
      delete overlays[pageId]
      return {
        pages,
        overlays,
        activePageId: s.activePageId === pageId ? pages[0]?.id ?? null : s.activePageId,
        selected: s.selected?.pageId === pageId ? null : s.selected,
      }
    }),

  duplicatePage: (pageId) =>
    set((s) => {
      const idx = s.pages.findIndex((p) => p.id === pageId)
      if (idx < 0) return s
      const copy: PageRef = { ...s.pages[idx], id: uid() }
      const pages = [...s.pages]
      pages.splice(idx + 1, 0, copy)
      const copiedOverlays = (s.overlays[pageId] ?? []).map((o) => ({ ...o, id: uid() }))
      return { pages, overlays: { ...s.overlays, [copy.id]: copiedOverlays } }
    }),

  movePage: (fromIndex, toIndex) =>
    set((s) => {
      if (fromIndex === toIndex) return s
      const pages = [...s.pages]
      const [moved] = pages.splice(fromIndex, 1)
      pages.splice(clamp(toIndex, 0, pages.length), 0, moved)
      return { pages }
    }),

  addOverlay: (pageId, overlay) =>
    set((s) => ({
      overlays: { ...s.overlays, [pageId]: [...(s.overlays[pageId] ?? []), overlay] },
      selected: { pageId, overlayId: overlay.id },
    })),

  updateOverlay: (pageId, overlayId, patch) =>
    set((s) => ({
      overlays: {
        ...s.overlays,
        [pageId]: (s.overlays[pageId] ?? []).map((o) =>
          o.id === overlayId ? ({ ...o, ...patch } as Overlay) : o,
        ),
      },
    })),

  removeOverlay: (pageId, overlayId) =>
    set((s) => ({
      overlays: {
        ...s.overlays,
        [pageId]: (s.overlays[pageId] ?? []).filter((o) => o.id !== overlayId),
      },
      selected: s.selected?.overlayId === overlayId ? null : s.selected,
    })),

  select: (pageId, overlayId) => set({ selected: { pageId, overlayId } }),
  deselect: () => set({ selected: null }),

  setFormValue: (srcId, field, value) =>
    set((s) => ({
      formValues: {
        ...s.formValues,
        [srcId]: { ...(s.formValues[srcId] ?? {}), [field]: value },
      },
    })),

  setTool: (tool) => set({ tool, selected: null }),
  setZoom: (zoom) => set({ zoom: clamp(zoom, 0.25, 4) }),
  setDark: (dark) => {
    localStorage.setItem('papedit-dark', dark ? '1' : '0')
    document.documentElement.classList.toggle('dark', dark)
    set({ dark })
  },
  setActivePage: (pageId) => set({ activePageId: pageId }),
  setDefaults: (patch) => set((s) => ({ defaults: { ...s.defaults, ...patch } })),
}))

/** Gesamtdrehung (intrinsisch + Nutzer) einer Seite. */
export function totalRotation(page: PageRef, src: Source): number {
  return normalizeRotation(src.baseRotations[page.srcIndex] + page.rotation)
}
