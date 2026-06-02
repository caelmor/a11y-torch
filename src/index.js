/**
 * a11y-torch — bundle entry point.
 *
 * Exposes a single global, `window.__a11yTorch`, with a small lifecycle API.
 * The bundle does NOT open anything on load; the loader bookmarklet controls
 * open/toggle. This keeps the bundle a pure library and the loader the
 * controller, and lets the same loaded instance be toggled without re-fetching.
 *
 * As inspection features (focus, landmarks, image names) are added, register
 * them here. Inspection features operate on a target document — host page by
 * default — so keep their setup independent of the responsive-preview iframe.
 */

import { createResponsivePreview } from './features/responsive-preview.js';

const NAMESPACE = '__a11yTorch';
const VERSION = '0.1.0';

(function bootstrap() {
  // Tear down a previous instance if one exists. This makes dev re-injection
  // (load a fresh bundle over an old one) clean.
  const existing = window[NAMESPACE];
  if (existing && typeof existing.destroy === 'function') {
    try {
      existing.destroy();
    } catch (_) {
      /* ignore teardown errors from a stale instance */
    }
  }

  const preview = createResponsivePreview();

  window[NAMESPACE] = {
    version: VERSION,
    open() {
      preview.open();
    },
    close() {
      preview.close();
    },
    toggle() {
      preview.isOpen() ? preview.close() : preview.open();
    },
    destroy() {
      // Later: also remove host-page inspection overlays here.
      preview.close();
    },
  };
})();
