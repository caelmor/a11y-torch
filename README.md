# a11y-torch 🔦

An accessibility inspection bookmarklet. Click it on any page to view that page through a set of toggleable lenses — responsive viewport, focus location, landmark structure, and image accessible names. Built as a fast manual-audit aid to use alongside automated tools like axe-core, WAVE, and Lighthouse.

## Status

The viewport lens is built and working: **responsive sizing**, **orientation (#1)**, and **reflow (#2)** have all shipped. The remaining host-page inspection features ship one at a time.

**Build order:** `#5 → #4 → #3`.

## Working features

All viewport features run **inside the preview iframe** — the only context where CSS media queries respond to a simulated viewport. They share a single sizing path, so presets and orientation never drift apart.

| Lens | Control | Notes |
|---|---|---|
| **Responsive viewport** | `📱 Mobile` (375 × 667), `📟 Tablet` (768 × 1024), `🖥️ Desktop` (fluid) | Loads the current URL into a full-screen iframe overlay. |
| **Orientation** (WCAG 1.3.4) | `↻ Portrait` / `↻ Landscape` | Swaps width/height of the active device preset. Disabled on Desktop (fluid) and Reflow (fixed). |
| **Reflow** (WCAG 1.4.10) | `🔎 Reflow` (320 × 256) | 1280 × 1024 viewport at 400% zoom. Orientation is locked — the SC prescribes these dimensions. |

**Reading the Reflow lens:** the iframe owns its own scrollbars, so a page that fails to reflow shows a **horizontal** scrollbar *inside* the 320px frame — that two-dimensional scroll is the 1.4.10 failure. A vertical scrollbar at 320px width is expected and allowed. The 256px-height dimension governs horizontal-scrolling content (e.g. vertical text). The tool surfaces the condition; the tester still applies the standard exceptions (images, maps, data tables, toolbars that must stay in view).

The toolbar controls are real `<button>`s: the active size carries `aria-pressed`, and orientation uses a true `disabled` state rather than color alone.

## Planned features

The next three lenses paint on the **live host page**, not the iframe, so they need a control surface that isn't the full-screen preview overlay. **Step one of #5 is adding a small floating control panel** as the shared home for these inspection toggles.

- **#5 Image accessible-name exposer** (WCAG 1.1.1) — expose each image's accessible name. `alt=""` or `aria-hidden` (on the image or any ancestor) → gray out; missing `alt` attribute entirely → red error.
- **#4 Landmark highlighter** (APG Landmark Regions) — outline and label every landmark, native (`header`, `nav`, `main`, `aside`, `footer`, named `section`/`form`, `search`) and ARIA-role equivalents. Flag anti-patterns (duplicate banner/main/contentinfo, indistinguishable same-role regions).
- **#3 Focus indicator overlay** (WCAG 2.4.7) — a tracked overlay that follows `document.activeElement` to reveal where focus sits, including on replaced elements where `::before`/`::after` can't render.

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

## Setup

1. Replace the placeholders:
   - `loader/prod.js` — `USER` → your GitHub username, `@v0.1.0` → the release tag to pin
   - `package.json` (`purge` script) — `USER` → your GitHub username
2. Build and generate the install page:
   ```bash
   npm install
   npm run build        # bundle src -> dist/a11y-torch.min.js
   npm run make:install # regenerate install.html from the loaders
   ```
3. Commit and push. `dist/` is committed on purpose — that is what jsDelivr serves.

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