/**
 * a11y-torch — bundle entry point.
 *
 * Pure library: registers `window.__a11yTorch` (open/close/toggle/destroy) and
 * opens NOTHING on load. The loader bookmarklet is the controller — first click
 * injects + open(), later clicks toggle().
 *
 * Architecture (unified control panel — Option 4):
 *   - One Shadow DOM host carries every piece of UI (panel, preview overlay,
 *     and the host-page inspection layer for #3-#5). The tool's own chrome is
 *     therefore invisible to the tool's own lenses.
 *   - A lens REGISTRY is the extensibility seam. Each feature is a descriptor
 *     { id, label, group?, activate, deactivate, getInspectionTarget? }.
 *     Adding #3/#4/#5 is: write the module, register it below. Nothing else.
 *   - The panel is THE control surface for all lenses, viewport and inspection
 *     alike. open() shows the panel (not the preview); the preview is just the
 *     first registered lens.
 *
 * Lifecycle semantics:
 *   open()    build (once) + show the panel; move focus into it.
 *   close()   deactivate every lens, then hide the panel (nothing keeps
 *             painting once the controls are gone). Shadow host is kept, so
 *             re-open is cheap.
 *   toggle()  open if hidden, close if shown.
 *   destroy() deactivate everything, remove the shadow host, reset globals —
 *             used for clean dev re-injection and by the dev loader.
 */

import { createShadowHost } from './ui/shadow-host.js';
import { createRegistry } from './core/registry.js';
import { createControlPanel } from './ui/control-panel.js';
import { createResponsivePreviewLens } from './features/responsive-preview.js';
// Host-page inspection lenses. Register here when built — purely additive; no
// panel / lifecycle / isolation changes are needed per feature:
import { createFocusOverlayLens } from './features/focus-overlay.js';  // #3
//   import { createLandmarkLens } from './features/landmarks.js';          // #4
import { createImageNameLens } from './features/image-names.js';       // #5

const NAMESPACE = '__a11yTorch';
const VERSION = '0.2.0';

(function bootstrap() {
  // Tear down a previous instance (clean dev re-injection over an old bundle).
  const existing = window[NAMESPACE];
  if (existing && typeof existing.destroy === 'function') {
    try {
      existing.destroy();
    } catch (_) {
      /* ignore teardown errors from a stale instance */
    }
  }

  let host = null;
  let registry = null;
  let panel = null;

  function build() {
    if (host) return;
    host = createShadowHost();
    registry = createRegistry({
      root: host.root,
      overlayLayer: host.overlayLayer,
      onChange: ({ returnFocusToId }) => {
        if (panel) panel.sync(returnFocusToId);
      },
    });
    panel = createControlPanel({ root: host.root, getRegistry: () => registry, version: VERSION });

    registry.register(createResponsivePreviewLens());
    registry.register(createFocusOverlayLens());  // #3
    // registry.register(createLandmarkLens());      // #4
    registry.register(createImageNameLens());     // #5
  }

  function open() {
    build();
    if (!panel.isMounted()) {
      const { closeButton } = panel.mount();
      closeButton.addEventListener('click', close);
      panel.sync();
    }
    panel.focusFirst();
  }

  function close() {
    if (!host) return;
    registry.deactivateAll();
    panel.unmount();
  }

  function destroy() {
    if (!host) return;
    registry.deactivateAll();
    panel.unmount();
    host.destroy();
    host = registry = panel = null;
  }

  window[NAMESPACE] = {
    version: VERSION,
    open,
    close,
    toggle() {
      panel && panel.isMounted() ? close() : open();
    },
    destroy,
  };
})();
