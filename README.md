# a11y-torch

An accessibility inspection bookmarklet. Click it on any page to view that page through a set of toggleable lenses — responsive viewport, focus location, landmark structure, and image accessible names. Built as a fast manual-audit aid to use alongside automated tools like axe-core, WAVE, and Lighthouse.

## Planned features

- **Responsive preview** — Render the current page at Mobile (375px), Tablet (768px), or Desktop width.
- **Orientation toggle** — Switch the simulated device between portrait and landscape (WCAG 1.3.4).
- **Reflow preset** — One-click 320 × 256 viewport for testing reflow at 400% zoom (WCAG 1.4.10).
- **Focus indicator overlay** — Highlight where keyboard focus currently sits, surfacing missing or weak focus indicators (WCAG 2.4.7).
- **Landmark highlighter** — Outline and label every landmark region on the page: `header`, `nav`, `main`, `aside`, `footer`, named `section`/`form`, and their ARIA role equivalents (APG Landmark Regions).
- **Image accessible-name exposer** — Show each image's alt / aria-label; gray out decorative or `aria-hidden` images; flag images with no accessible name in red (WCAG 1.1.1).

## Install

Show your bookmarks bar (`Ctrl+Shift+B` / `Cmd+Shift+B`), drag the bookmarklet button onto it, then click it on any page to launch. Click it again or hit ✕ Close to exit.
