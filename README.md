# okso. — think on paper

A minimal sketching app for thinking on paper: pen, shapes, eraser, pages and instant export. Built with plain HTML, CSS and vanilla JavaScript — no build tools, no framework.

## Features

- **Pen** with adjustable stroke width (`1–60 px`) and opacity
- **Ink palette** (10 preset colors) plus a custom color picker
- **Shapes**: line, rectangle, and ellipse (`Shift` constrains proportions / snaps lines to 45°)
- **Eraser** that rubs back to the paper
- **Multiple pages** with thumbnails, paging (top bar or arrow keys), and a grid overview
- **Undo / Redo** per page, and a clear-page action
- **Export** the current page or all pages as PNG
- **Keyboard shortcuts** for almost everything

## Live demo

Deployed to GitHub Pages: <https://atefbb.github.io/okso-drawing-app/>

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `P` / `B` | Pen |
| `L` | Line |
| `R` | Rectangle |
| `C` | Circle |
| `E` | Eraser |
| `[` / `]` | Decrease / increase stroke width |
| `⌘Z` / `⇧⌘Z` | Undo / Redo (also `Ctrl+Y`) |
| `N` | New page |
| `S` | Export current page as PNG |
| `Tab` | Toggle all-pages overview |
| `←` / `→` or top-bar chevrons | Previous / next page |
| `⌫` / `Delete` | Clear current page |
| `Esc` | Close overview / popovers |

## Project structure

```
.
├── index.html      # App shell, toolbar, page overview modal
├── styles.css      # All styling
├── icon.svg        # Favicon
├── manifest.json   # PWA manifest
└── js/
    ├── engine.js   # Canvas, drawing, history, pages, export data
    └── app.js      # UI wiring, tools, popovers, keyboard, overview
```

## Run it locally

No dependencies or install step needed. Serve the folder with any static server:

```sh
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open <http://localhost:8000>.

> The app pulls `lucide` icons and Tailwind from CDNs, so an internet connection is required for full functionality.

## Deploying to GitHub Pages

The site is published straight from the `main` branch root. To ship a new version:

```sh
git add .
git commit -m "describe your change"
git push
```

GitHub rebuilds Pages automatically within a minute or two.

## License

Not specified.

---

وقف لله تعالى