# a11y-torch 🔦

An accessibility inspection bookmarklet. Click it on any page to view that page through a set of toggleable lenses — responsive viewport, image accessible names, focus location, and landmark structure. Built as a fast manual-audit aid to use alongside automated tools like axe-core, WAVE, and Lighthouse.

## Status

Shipped: the responsive viewport lens (sizing, #1 orientation, #2 reflow), the focus-location overlay (#3), the landmark highlighter (#4), and the image accessible-name exposer (#5), on a unified Shadow-DOM control panel + lens registry.

## Working features

a11y-torch runs in **two execution contexts** by design. **Viewport lenses** operate inside the preview iframe — the only place CSS media queries respond to a simulated viewport. **Inspection lenses** paint over the live host page and **compose with each other**. The full-screen preview owns the screen, so it and the inspection lenses are mutually exclusive — one or the other.

### Viewport lens — inside the preview iframe

Shares a single sizing path, so presets and orientation never drift apart.

| Lens | Control | Notes |
|---|---|---|
| **Responsive viewport** | `📱 Mobile` (375 × 667), `📟 Tablet` (768 × 1024), `🖥️ Desktop` (fluid) | Loads the current URL into a full-screen iframe overlay. |
| **Orientation** (WCAG 1.3.4) | `↻ Portrait` / `↻ Landscape` | Swaps width/height of the active device preset. Disabled on Desktop (fluid) and Reflow (fixed). |
| **Reflow** (WCAG 1.4.10) | `🔎 Reflow` (320 × 256) | 1280 × 1024 viewport at 400% zoom. Orientation is locked — the SC prescribes these dimensions. |

### Inspection lens — on the host page

| Lens | Control | Notes |
|---|---|---|
| **Focus location** (WCAG 2.4.7) | `🎯 Focus location` | Tracks `document.activeElement` with a black box (NVDA-overlay style), repositioned on focus/scroll/resize via `getBoundingClientRect()`. Reveals **where** focus is without touching the page's own indicator, so a missing/weak native focus style stays auditable. Drawn just outside the element; `pointer-events:none` and out of the tab order. |
| **Landmarks** (APG Landmark Regions) | `🗺️ Landmarks` | Outlines every landmark region and labels it with its **role + accessible name**. Detects native elements (`header`→banner, `nav`, `main`, `aside`→complementary, `footer`→contentinfo, `section`→region, `form`, `search`) and explicit landmark roles, applying real HTML-AAM rules: an explicit `role` wins over native semantics; scoped `header`/`footer`, and unnamed `section`/`form`, are **not** landmarks. Flags anti-patterns in **amber** — duplicate `banner`/`main`/`contentinfo`, and same-role landmarks not told apart by a unique accessible name. |
| **Image accessible names** (WCAG 1.1.1) | `🖼️ Image names` | Outlines every `<img>` and shows its accessible name plus the source it came from. Greys out **decorative** images (`alt=""`, `role="presentation"/"none"`) and images **hidden from AT** (`aria-hidden` on the image or any ancestor); flags a **red border** when there is no accessible name — the missing-`alt` case. Name precedence follows accname: `aria-labelledby` → `aria-label` → `alt` → `title`. Hover a label to read it in full where images sit close together. |

## How it works

The bundle (`dist/a11y-torch.min.js`) is a **pure library**: it registers `window.__a11yTorch` (`open` / `close` / `toggle` / `destroy`) and opens nothing on its own. A small **loader bookmarklet is the controller** — the first click injects the bundle and opens it; later clicks toggle it without re-fetching. On load the bundle tears down any prior instance, so dev re-injection is clean.

All UI lives in **one Shadow-DOM host**, so the tool's own chrome is invisible to the tool's own lenses. A **lens registry** is the extensibility seam: each feature is a self-contained descriptor, and adding the next one is "write the module, register it in `index.js`" — no panel, lifecycle, or isolation changes per feature. Exclusivity is handled by **groups**: the full-screen preview is `fullscreen` (solo — it suspends everything); the host-page inspection lenses are `inspect` (they compose with each other and yield to the preview). The floating **control panel** is the single control surface for every lens.

Two execution contexts, kept separate by design: **viewport features** (orientation, reflow) operate on the preview iframe and live in `responsive-preview.js`; **inspection features** operate on the host page and each get their own module — focus location (#3), landmarks (#4), and image accessible names (#5) ship in `focus-overlay.js`, `landmarks.js`, and `image-names.js`.

## Project structure

```
a11y-torch/
├── src/
│   ├── index.js                       # entry: window.__a11yTorch (open/close/toggle/destroy); registers lenses
│   ├── core/registry.js               # lens registry — the extensibility core
│   ├── ui/
│   │   ├── shadow-host.js             # single Shadow-DOM mount for all UI
│   │   └── control-panel.js          # persistent floating control panel
│   └── features/
│       ├── responsive-preview.js     # viewport lens: responsive sizes + orientation + reflow
│       ├── focus-overlay.js          # inspection lens: focus location overlay (#3)
│       ├── landmarks.js              # inspection lens: landmark highlighter (#4)
│       └── image-names.js            # inspection lens: image accessible names (#5)
├── loader/
│   ├── prod.js                        # toggle-if-loaded, else inject pinned bundle
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

Open `install.html` in a browser, show your bookmarks bar (`Ctrl+Shift+B` / `Cmd+Shift+B`), drag the 🔦 button onto it, then click it on any page. Click again or hit ✕ Close to exit. The production bundle is served from jsDelivr pinned to an immutable release tag.

## Scripts

| Command | Does |
|---|---|
| `npm run build` | Bundle + minify `src` → `dist/a11y-torch.min.js` |
| `npm run dev` | Start the local dev server (rebuild-on-request) on `:5174` |
| `npm run make:install` | Regenerate `install.html` from `loader/*.js` |