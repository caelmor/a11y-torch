# a11y-torch

An accessibility inspection bookmarklet. Click it on any page to view that page through a set of toggleable lenses — responsive viewport, focus location, landmark structure, and image accessible names. Built as a fast manual-audit aid to use alongside automated tools like axe-core, WAVE, and Lighthouse.

## Status

The responsive-preview base is built and working. The five features below are planned and ship one at a time.

## Planned features

- **Orientation toggle** — switch the simulated device between portrait and landscape (WCAG 1.3.4).
- **Reflow preset** — one-click 320 × 256 viewport for testing reflow at 400% zoom (WCAG 1.4.10).
- **Focus indicator overlay** — highlight where keyboard focus currently sits, surfacing missing or weak focus indicators (WCAG 2.4.7).
- **Landmark highlighter** — outline and label every landmark region on the page: `header`, `nav`, `main`, `aside`, `footer`, named `section`/`form`, and their ARIA role equivalents (APG Landmark Regions).
- **Image accessible-name exposer** — show each image's alt / aria-label; gray out decorative or `aria-hidden` images; flag images with no accessible name in red (WCAG 1.1.1).

## How it works

The bundle (`dist/a11y-torch.min.js`) is a library that registers `window.__a11yTorch` and opens nothing on its own. A small loader bookmarklet is the controller: the first click injects the bundle and opens it; later clicks toggle it without re-fetching.

## Project structure

```
a11y-torch/
├── src/
│   ├── index.js                       # entry: defines window.__a11yTorch (open/close/toggle/destroy)
│   └── features/responsive-preview.js # responsive preview overlay (Mobile/Tablet/Desktop)
├── loader/
│   ├── prod.js                        # toggle-if-loaded, else inject pinned jsDelivr bundle
│   └── dev.js                         # always tears down + re-fetches fresh (cache-busted)
├── scripts/
│   ├── dev-server.mjs                 # local dev server (esbuild serve + watch)
│   └── make-install.mjs               # minifies loaders -> regenerates install.html
├── dev/playground.html                # local fixture page to test against
├── dist/a11y-torch.min.js             # built bundle (committed; this is what gets served)
├── install.html                       # drag-to-bookmarks page (generated -- do not edit by hand)
└── package.json
```

## Setup

1. Replace the placeholders:
   - `loader/prod.js` — `USER` → your GitHub username, `@v0.1.0` → the release tag to pin
   - `loader/dev.js` — `USER` → your GitHub username
   - `package.json` (`purge` script) — `USER` → your GitHub username
2. Build and generate the install page:
   ```bash
   npm install
   npm run build        # bundle src -> dist/a11y-torch.min.js
   npm run make:install # regenerate install.html from the loaders
   ```
3. Commit and push. `dist/` is committed on purpose — it is what jsDelivr / GitHub Pages serve.

## Local development

No hosting needed. The dev loader points at a local server.

1. `npm install`
2. `npm run dev` — starts a server on `http://localhost:8000` that rebuilds the bundle on every request.
3. Open `http://localhost:8000/dev/playground.html` (or any page served from this localhost origin).
4. Click the **dev** bookmark from `install.html`. Edit `src`, save, click again — fresh code, no re-dragging, no push.

The dev loader and the page share the same `http://localhost` origin, so there is no mixed-content or Private Network Access issue in any browser. Testing the bookmarklet on real external `https://` sites from a local http server is blocked by browsers — use the prod loader for that once it is hosted.

## Hosting (prod, later)

The **production** loader serves the pinned bundle from jsDelivr (`@v0.1.0`, immutable, zero setup). Replace the `USER`/tag placeholders in `loader/prod.js`, commit `dist/`, and the prod bookmark resolves.

## Install

Open `install.html`, show your bookmarks bar (`Ctrl+Shift+B` / `Cmd+Shift+B`), drag a button onto it, then click it on any page. Click again or hit ✕ Close to exit.

## Scripts

| Command | Does |
|---|---|
| `npm run build` | Bundle + minify `src` → `dist/a11y-torch.min.js` |
| `npm run dev` | Start the local dev server (rebuild-on-request) on `:8000` |
| `npm run make:install` | Regenerate `install.html` from `loader/*.js` |
| `npm run purge` | Purge the jsDelivr cache for the `@main` bundle |
