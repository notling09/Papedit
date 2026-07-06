import { useEffect, useState } from 'react'
import type { PageRef } from '../lib/types'
import { useStore } from '../store/useStore'
import { pdfToDisplay } from '../lib/coords'

interface Props {
  pageRef: PageRef
  pageW: number
  pageH: number
  rot: number
  zoom: number
}

interface FieldAnnot {
  id: string
  name: string
  kind: 'text' | 'multiline' | 'checkbox' | 'radio' | 'select'
  rect: [number, number, number, number]
  value: string
  checked: boolean
  exportValue?: string
  options?: { value: string; label: string }[]
}

/**
 * Macht vorhandene PDF-Formularfelder direkt auf der Seite ausfüllbar.
 * Die Werte werden beim Export mit pdf-lib in das Dokument geschrieben.
 */
export default function FormLayer({ pageRef, pageW, pageH, rot, zoom }: Props) {
  const src = useStore((s) => s.sources[pageRef.srcId])
  const values = useStore((s) => s.formValues[pageRef.srcId])
  const setFormValue = useStore((s) => s.setFormValue)
  const [fields, setFields] = useState<FieldAnnot[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const page = await src.doc.getPage(pageRef.srcIndex + 1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annots: any[] = await page.getAnnotations({ intent: 'display' })
      if (cancelled) return
      const result: FieldAnnot[] = []
      for (const a of annots) {
        if (a.subtype !== 'Widget' || !a.fieldName || a.readOnly || a.pushButton) continue
        let kind: FieldAnnot['kind'] | null = null
        if (a.fieldType === 'Tx') kind = a.multiLine ? 'multiline' : 'text'
        else if (a.fieldType === 'Ch') kind = 'select'
        else if (a.fieldType === 'Btn' && a.checkBox) kind = 'checkbox'
        else if (a.fieldType === 'Btn' && a.radioButton) kind = 'radio'
        if (!kind) continue
        result.push({
          id: a.id ?? `${a.fieldName}-${result.length}`,
          name: a.fieldName,
          kind,
          rect: a.rect,
          value: typeof a.fieldValue === 'string' ? a.fieldValue : '',
          checked: a.fieldValue != null && a.fieldValue !== 'Off',
          exportValue: a.exportValue ?? a.buttonValue,
          options: Array.isArray(a.options)
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              a.options.map((o: any) => ({ value: o.exportValue, label: o.displayValue }))
            : undefined,
        })
      }
      setFields(result)
    })()
    return () => {
      cancelled = true
    }
  }, [pageRef, src])

  if (fields.length === 0) return null

  return (
    <>
      {fields.map((f) => {
        // PDF-Rechteck in Bildschirmkoordinaten umrechnen
        const a = pdfToDisplay(f.rect[0], f.rect[1], pageW, pageH, rot)
        const b = pdfToDisplay(f.rect[2], f.rect[3], pageW, pageH, rot)
        const left = Math.min(a.x, b.x) * zoom
        const top = Math.min(a.y, b.y) * zoom
        const w = Math.abs(a.x - b.x) * zoom
        const h = Math.abs(a.y - b.y) * zoom

        const stored = values?.[f.name]
        const cls =
          'absolute border border-gold-400/50 bg-gold-400/10 outline-none transition-colors hover:bg-gold-400/20 focus:border-gold-500 focus:bg-white/70 dark:focus:bg-plum-900/70'
        const style = { left, top, width: w, height: h, fontSize: Math.min(h * 0.55, 14 * zoom) }

        switch (f.kind) {
          case 'checkbox':
            return (
              <input
                key={f.id}
                type="checkbox"
                className={`${cls} cursor-pointer accent-gold-500`}
                style={style}
                checked={typeof stored === 'boolean' ? stored : f.checked}
                onChange={(e) => setFormValue(pageRef.srcId, f.name, e.target.checked)}
              />
            )
          case 'radio':
            return (
              <input
                key={f.id}
                type="radio"
                name={`${pageRef.srcId}-${f.name}`}
                className={`${cls} cursor-pointer accent-gold-500`}
                style={style}
                checked={
                  typeof stored === 'string' ? stored === f.exportValue : f.checked
                }
                onChange={() =>
                  f.exportValue && setFormValue(pageRef.srcId, f.name, f.exportValue)
                }
              />
            )
          case 'select':
            return (
              <select
                key={f.id}
                className={cls}
                style={style}
                value={typeof stored === 'string' ? stored : f.value}
                onChange={(e) => setFormValue(pageRef.srcId, f.name, e.target.value)}
              >
                <option value="" />
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label || o.value}
                  </option>
                ))}
              </select>
            )
          case 'multiline':
            return (
              <textarea
                key={f.id}
                className={`${cls} resize-none p-1`}
                style={style}
                value={typeof stored === 'string' ? stored : f.value}
                onChange={(e) => setFormValue(pageRef.srcId, f.name, e.target.value)}
              />
            )
          default:
            return (
              <input
                key={f.id}
                type="text"
                className={`${cls} px-1`}
                style={style}
                value={typeof stored === 'string' ? stored : f.value}
                onChange={(e) => setFormValue(pageRef.srcId, f.name, e.target.value)}
              />
            )
        }
      })}
    </>
  )
}
