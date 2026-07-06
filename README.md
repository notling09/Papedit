<p align="center">
  <img src="public/logo.png" alt="Papedit-Logo" width="220" />
</p>

# Papedit

**Der kostenlose PDF-Editor im Browser.** Keine Uploads, keine Wasserzeichen, keine Limits,
kein Account – alle Dateien werden ausschließlich auf deinem Gerät verarbeitet.

Der Name verbindet das portugiesische „papel" (Papier) mit „edit" (bearbeiten).

## Funktionen

- **Öffnen & Anzeigen** – PDF per Drag-and-Drop oder Dateiauswahl öffnen, Zoom,
  Miniaturansicht aller Seiten, schnelles Rendern durch Lazy Loading.
- **Vorhandenen Text bearbeiten (Word-ähnlich)** – das „Text bearbeiten"-Werkzeug
  gruppiert den PDF-Text automatisch zu Absätzen. Ein Klick deckt den Absatz in der
  Hintergrundfarbe ab und legt den Originaltext als Feld mit automatischem
  Zeilenumbruch darüber: mitten im Satz tippen, der Rest fließt nach – auch der
  Original-Zeilenabstand wird übernommen. Feld leeren = Text löschen.
- **Textbearbeitung (Overlay)** – neue Textfelder einfügen, verschieben, Schrift, Größe
  und Farbe anpassen; vorhandenen Text abdecken und ersetzen („Redigieren & Ersetzen").
- **Seitenverwaltung** – Seiten drehen, löschen, duplizieren, per Drag-and-Drop sortieren
  und einzeln als PDF extrahieren.
- **Zusammenfügen & Teilen** – mehrere PDFs zu einem verbinden, ein PDF nach
  Seitenbereichen in mehrere Dateien aufteilen.
- **Anmerkungen & Zeichnen** – Freihand-Stift, Textmarker, Rechteck, Ellipse, Linie,
  Pfeil und Bilder (z. B. ein Logo) einfügen.
- **Unterschrift & Formulare** – Unterschrift zeichnen oder als Bild laden und frei
  platzieren; vorhandene PDF-Formularfelder direkt ausfüllen.
- **Export** – als PDF herunterladen oder alle Seiten als PNG-Bilder exportieren.
- **Design** – warme Farbwelt passend zum Logo, hell & dunkel, responsive.

## Warum ist Papedit privat?

Es gibt **kein Backend**. Die gesamte PDF-Verarbeitung läuft mit
[PDF.js](https://mozilla.github.io/pdf.js/) (Anzeigen) und
[pdf-lib](https://pdf-lib.js.org/) (Bearbeiten/Erstellen) direkt im Browser.
Keine Datei verlässt jemals dein Gerät.

## Technischer Hinweis zur Textbearbeitung

Ein PDF speichert für jedes Zeichen eine feste Position – es gibt keine Absätze, die wie
in Word neu umbrechen. Papedit setzt deshalb bewusst auf **Overlay-Bearbeitung**: Eine
bearbeitbare Ebene liegt über der Seite; vorhandener Text kann überdeckt und ersetzt,
neuer Text frei hinzugefügt werden. Das ist ehrlich, stabil und deckt die allermeisten
Anwendungsfälle ab.

## Technischer Stack

| Bereich | Technologie |
| --- | --- |
| Framework | React 19 + Vite 7 |
| Sprache | TypeScript |
| PDF anzeigen | PDF.js (Mozilla) |
| PDF bearbeiten | pdf-lib |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Icons | Lucide |
| Hosting | Vercel oder Netlify (statisch) |

## Entwicklung

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Entwicklungsserver (http://localhost:5173)
npm run build    # Produktions-Build nach dist/
npm run preview  # Produktions-Build lokal testen
```

## Projektstruktur

```
papedit/
├─ public/                  # Logo, statische Dateien
├─ src/
│  ├─ components/           # UI-Bausteine (Header, Toolbar, Seitenansicht …)
│  │  └─ dialogs/           # Teilen- und Unterschrift-Dialog
│  ├─ lib/                  # PDF-Logik: Laden (pdf.js), Export (pdf-lib),
│  │                        # Koordinaten-Umrechnung, Utilities
│  ├─ store/                # Zentraler Zustand (Zustand)
│  └─ styles/               # Tailwind & Design-Tokens
└─ index.html
```

## Deployment

Papedit ist eine rein statische Anwendung. Auf **Vercel** oder **Netlify** genügt es,
das GitHub-Repository zu verbinden – Build-Befehl `npm run build`,
Ausgabeverzeichnis `dist`. Fertig.

## Lizenz

Frei nutzbar für private und kommerzielle Zwecke.
