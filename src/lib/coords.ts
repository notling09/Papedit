/**
 * Koordinaten-Umrechnung zwischen zwei Räumen:
 *
 * - „Anzeige-Raum“: die gedrehte Seite, wie sie auf dem Bildschirm liegt.
 *   Ursprung oben links, y wächst nach unten, Einheit PDF-Punkte (Zoom 100 %).
 * - „PDF-Raum“: die ungedrehte Seite, wie pdf-lib sie beschreibt.
 *   Ursprung unten links, y wächst nach oben.
 *
 * rot ist die Gesamtdrehung (/Rotate + Nutzerdrehung), normalisiert auf 0/90/180/270.
 * W und H sind immer die UNGEDREHTEN Seitenmaße in Punkten.
 */

export function normalizeRotation(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/** Maße der Seite im Anzeige-Raum (bei 90/270 vertauscht). */
export function displaySize(w: number, h: number, rot: number): { w: number; h: number } {
  return rot === 90 || rot === 270 ? { w: h, h: w } : { w, h }
}

/** Anzeige-Raum → PDF-Raum. */
export function displayToPdf(
  xd: number,
  yd: number,
  W: number,
  H: number,
  rot: number,
): { x: number; y: number } {
  switch (rot) {
    case 90:
      return { x: yd, y: xd }
    case 180:
      return { x: W - xd, y: yd }
    case 270:
      return { x: W - yd, y: H - xd }
    default:
      return { x: xd, y: H - yd }
  }
}

/** PDF-Raum → Anzeige-Raum. */
export function pdfToDisplay(
  xp: number,
  yp: number,
  W: number,
  H: number,
  rot: number,
): { x: number; y: number } {
  switch (rot) {
    case 90:
      return { x: yp, y: xp }
    case 180:
      return { x: W - xp, y: yp }
    case 270:
      return { x: H - yp, y: W - xp }
    default:
      return { x: xp, y: H - yp }
  }
}

/**
 * Rechteck aus dem Anzeige-Raum in ein achsenparalleles PDF-Rechteck umrechnen
 * (bei Vielfachen von 90° bleibt es achsenparallel).
 */
export function displayRectToPdf(
  xd: number,
  yd: number,
  wd: number,
  hd: number,
  W: number,
  H: number,
  rot: number,
): { x: number; y: number; w: number; h: number } {
  const a = displayToPdf(xd, yd, W, H, rot)
  const b = displayToPdf(xd + wd, yd + hd, W, H, rot)
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  }
}
