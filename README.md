<p align="center">
  <img src="public/logo.png" alt="PapEdit logo" width="220" />
</p>

# PapEdit

**The free PDF editor in your browser.** No uploads, no watermarks, no limits,
no account – all files are processed exclusively on your device.

The name combines the Portuguese word "papel" (paper) with "edit".

## Features

- **Open & view** – open PDFs via drag and drop or file picker, zoom,
  thumbnail overview of all pages, fast rendering with lazy loading.
- **Edit existing text (Word-like)** – the "Edit existing text" tool automatically
  groups the PDF text into paragraphs. One click covers the paragraph in its
  background color and places the original text on top as a field with automatic
  line wrapping: type in the middle of a sentence and the rest reflows – the
  original line spacing is preserved. Clear the field to delete the text.
- **Text overlays** – insert new text fields, move them, adjust font, size and
  color; cover and replace existing content ("redact & replace").
- **Page management** – rotate, delete, duplicate, reorder pages via drag and
  drop, and extract single pages as separate PDFs.
- **Merge & split** – combine multiple PDFs into one, or split a PDF into
  several files by page ranges.
- **Annotate & draw** – freehand pen, highlighter, rectangle, ellipse, line,
  arrow, and image insertion (e.g. a logo).
- **Signature & forms** – draw a signature or load it as an image and place it
  freely; fill existing PDF form fields directly on the page.
- **Export** – download as PDF or export all pages as PNG images.
- **Design** – warm color palette matching the logo, light & dark mode, responsive.

## Why is PapEdit private?

There is **no backend**. All PDF processing runs directly in your browser using
[PDF.js](https://mozilla.github.io/pdf.js/) (viewing) and
[pdf-lib](https://pdf-lib.js.org/) (editing/creating).
No file ever leaves your device.

## A technical note on text editing

A PDF stores a fixed position for every character – there are no paragraphs
that reflow like in Word. PapEdit therefore deliberately uses **overlay
editing**: an editable layer sits on top of the page; existing text can be
covered and replaced, new text can be added freely, and the paragraph tool
reconstructs flowing text from the character positions. This is honest, stable,
and covers the vast majority of real-world use cases. The replacement font is a
metrically matching standard font (Helvetica/Times/Courier), not the embedded
original – a limitation shared by every browser-based PDF editor.

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | React 19 + Vite 7 |
| Language | TypeScript |
| PDF rendering | PDF.js (Mozilla) |
| PDF editing | pdf-lib |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Icons | Lucide |
| Hosting | Vercel or Netlify (static) |

## Development

```bash
npm install      # install dependencies
npm run dev      # development server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # test the production build locally
```

## Project structure

```
papedit/
├─ public/                  # logo, static files
├─ src/
│  ├─ components/           # UI building blocks (header, toolbar, page view …)
│  │  └─ dialogs/           # split and signature dialogs
│  ├─ lib/                  # PDF logic: loading (PDF.js), export (pdf-lib),
│  │                        # coordinate mapping, utilities
│  ├─ store/                # central state (Zustand)
│  └─ styles/               # Tailwind & design tokens
└─ index.html
```

## Deployment

PapEdit is a purely static application. On **Vercel** or **Netlify**, simply
connect the GitHub repository – build command `npm run build`, output directory
`dist`. Done.

## License

Free to use for private and commercial purposes.
