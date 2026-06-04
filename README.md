# a11y-torch 🔦

An accessibility inspection bookmarklet. Click it on any page to view that page through a set of toggleable lenses — responsive viewport, focus location, landmark structure, and image accessible names. Built as a fast manual-audit aid to use alongside automated tools like axe-core, WAVE, and Lighthouse.

## Status
Viewport lens shipped (responsive sizing, #1 orientation, #2 reflow). Unified Shadow-DOM control panel + lens registry now in place. Build order: #5 → #4 → #3.
**Build order:** `#5 → #4 → #3`.

## Working features

All viewport features run **inside the preview iframe** — the only context where CSS media queries respond to a simulated viewport. They share a single sizing path, so presets and orientation never drift apart.

| Lens | Control | Notes |
|---|---|---|
| **Responsive viewport** | `📱 Mobile` (375 × 667), `📟 Tablet` (768 × 1024), `🖥️ Desktop` (fluid) | Loads the current URL into a full-screen iframe overlay. |
| **Orientation** (WCAG 1.3.4) | `↻ Portrait` / `↻ Landscape` | Swaps width/height of the active device preset. Disabled on Desktop (fluid) and Reflow (fixed). |
| **Reflow** (WCAG 1.4.10) | `🔎 Reflow` (320 × 256) | 1280 × 1024 viewport at 400% zoom. Orientation is locked — the SC prescribes these dimensions. |

## How it works

The bundle (`dist/a11y-torch.min.js`) is a **pure library**: it registers `window.__a11yTorch` (`open` / `close` / `toggle` / `destroy`) and opens nothing on its own. A small **loader bookmarklet is the controller** — the first click injects the bundle and opens it; later clicks toggle it without re-fetching. On load the bundle tears down any prior instance, so dev re-injection is clean.

Two execution contexts, kept separate by design: **viewport features** (orientation, reflow) operate on the preview iframe and live in `responsive-preview.js`; **inspection features** (#3–#5) operate on the host page by default and each get their own module.

## Project structure

```
a11y-torch/
├── src/
│   ├── index.js                       # entry: defines window.__a11yTorch (open/close/toggle/destroy)
│   └── features/responsive-preview.js # viewport lens: responsive sizes + orientation + reflow
├── loader/
│   ├── prod.js                        # toggle-if-loaded, else inject pinned jsDelivr bundle
│   └── dev.js                         # always tears down + re-fetches fresh (cache-busted)
├── scripts/
│   ├── dev-server.mjs                 # local dev server (esbuild serve + watch) on :5174
│   └── make-install.mjs               # minifies loaders -> regenerates install.html
├── dev/playground.html                # local fixture page to test against
├── dist/a11y-torch.min.js             # built bundle (committed; this is what gets served)
├── install.html                       # drag-to-bookmarks page (generated -- do not edit by hand)
└── package.json
```

## Local development

No hosting needed. The dev loader points at a local server.

1. `npm install`
2. `npm run dev` — starts a server on `http://localhost:5174` that rebuilds the bundle on every request.
3. Open `http://localhost:5174/dev/playground.html` (or any page served from this localhost origin).
4. Click the **dev** bookmark from `install.html`. Edit `src`, save, click again — fresh code, no re-dragging, no push.

The dev loader and the page share the same `http://localhost` origin, so there is no mixed-content or Private Network Access issue in any browser. Testing the bookmarklet on real external `https://` sites from a local http server is blocked by browsers.

## Install

Open `install.html`, show your bookmarks bar (`Ctrl+Shift+B` / `Cmd+Shift+B`), drag a button onto it, then click it on any page. Click again or hit ✕ Close to exit.

## Scripts

| Command | Does |
|---|---|
| `npm run build` | Bundle + minify `src` → `dist/a11y-torch.min.js` |
| `npm run dev` | Start the local dev server (rebuild-on-request) on `:5174` |
| `npm run make:install` | Regenerate `install.html` from `loader/*.js` |
| `npm run purge` | Purge the jsDelivr cache for the `@main` bundle |
