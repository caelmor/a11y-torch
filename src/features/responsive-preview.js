/**
 * Responsive preview — viewport lens (Orientation #1 done; Reflow #2 preset).
 *
 * Loads the current page into a full-screen iframe overlay and renders it at a
 * chosen viewport size. This is the only context in which CSS media queries
 * respond to a simulated viewport, so all viewport features build on it.
 *
 * Under the unified-panel architecture this is now a registry LENS, not a
 * free-standing controller:
 *   - It mounts into the shared shadow root (ctx.root), not document.body, so
 *     it's invisible to the tool's own inspection lenses.
 *   - It's `exclusive` (full-screen) — the registry guarantees one at a time.
 *   - Its ✕ Close and Escape call ctx.deactivateSelf() so the panel button
 *     stays in sync and focus returns to that button.
 *   - It exposes getInspectionTarget(): when the framed page is same-origin and
 *     reachable, that contentDocument is what #3-#5 will inspect (the
 *     cross-frame seam). Cross-origin → null → lenses fall back to the host.
 *
 * Internal sizing/orientation logic is unchanged from the standalone version:
 * each non-desktop preset carries explicit portrait W AND H; landscape swaps
 * them, except for `fixed` presets (Reflow), whose dimensions are prescribed by
 * the SC and must not rotate. Desktop is fluid and has no orientation.
 */

const ACCENT = '#4fc3f7';
const BAR_HEIGHT = 48;

// Portrait dimensions. Landscape is derived by swapping width/height.
const SIZES = [
  { label: '📱 Mobile', width: 375, height: 667, desktop: false },
  { label: '📟 Tablet', width: 768, height: 1024, desktop: false },
  { label: '🖥️ Desktop', width: null, height: null, desktop: true },
  // Reflow (WCAG 1.4.10): a 1280×1024 viewport at 400% zoom == 320×256 CSS px.
  { label: '🔎 Reflow', width: 320, height: 256, desktop: false, fixed: true },
];

const PORTRAIT = 'portrait';
const LANDSCAPE = 'landscape';

export function createResponsivePreviewLens() {
  let overlay = null;
  let frame = null;
  let lastFocused = null;

  // Cross-frame seam (see header). Same-origin frames are reachable; touching a
  // cross-origin contentDocument throws, so we report "not reachable" and let
  // inspection lenses target the host page instead.
  function getInspectionTarget() {
    try {
      const doc = frame && frame.contentDocument;
      if (doc) return { document: doc, window: frame.contentWindow };
    } catch (_) {
      /* cross-origin frame: not reachable */
    }
    return null;
  }

  function activate(ctx) {
    if (overlay) return;
    const url = location.href;

    // Per-session view state. Orientation persists across size changes and is
    // ignored while Desktop (fluid) or a fixed preset is active.
    let activeSize = null;
    let activeButton = null;
    let orientation = PORTRAIT;

    overlay = document.createElement('div');
    overlay.style.cssText =
        'position:fixed;inset:0;z-index:1;pointer-events:auto;background:#0f0f0f;' +
        'display:flex;flex-direction:column;overflow:hidden;font-family:monospace;';

    const toolbar = document.createElement('div');
    toolbar.style.cssText =
        'flex-shrink:0;height:' + BAR_HEIGHT + 'px;display:flex;align-items:center;' +
        'gap:8px;padding:0 16px;background:#1a1a1a;border-bottom:1px solid #2a2a2a;';

    const label = document.createElement('span');
    label.style.cssText =
        'color:' + ACCENT + ';font-weight:bold;font-size:12px;' +
        'letter-spacing:0.05em;margin-right:8px;';
    label.textContent = '🔦 A11Y-TORCH';

    const stage = document.createElement('div');
    stage.style.cssText =
        'flex:1;overflow:hidden;display:flex;justify-content:center;' +
        'padding:0;background:#0f0f0f;';

    const frameWrap = document.createElement('div');
    frameWrap.style.cssText = 'width:100%;height:100%;overflow:hidden;background:#fff;';

    frame = document.createElement('iframe');
    frame.src = url;
    frame.title = 'Responsive preview of the current page';
    frame.style.cssText = 'width:100%;height:100%;border:none;display:block;';

    const dimLabel = document.createElement('span');
    dimLabel.style.cssText = 'color:#555;font-size:11px;margin-left:2px;';

    function render() {
      if (activeSize.desktop) {
        frameWrap.style.width = '100%';
        frameWrap.style.height = '100%';
        frameWrap.style.borderRadius = '0';
        frameWrap.style.boxShadow = 'none';
        stage.style.padding = '0';
        stage.style.overflow = 'hidden';
        dimLabel.textContent = '';
      } else {
        // Landscape swaps W/H, but never for a fixed preset (Reflow).
        const swap = orientation === LANDSCAPE && !activeSize.fixed;
        const width = swap ? activeSize.height : activeSize.width;
        const height = swap ? activeSize.width : activeSize.height;
        frameWrap.style.width = width + 'px';
        frameWrap.style.height = height + 'px';
        frameWrap.style.borderRadius = '6px';
        frameWrap.style.boxShadow = '0 0 0 1px #333,0 8px 32px rgba(0,0,0,0.6)';
        stage.style.padding = '20px';
        stage.style.overflow = 'auto';
        dimLabel.textContent = width + ' × ' + height;
      }
      syncOrientationButton();
    }

    function selectSize(size, button) {
      activeSize = size;
      if (activeButton) {
        activeButton.style.background = '#111';
        activeButton.style.color = '#aaa';
        activeButton.style.borderColor = '#333';
        activeButton.setAttribute('aria-pressed', 'false');
      }
      activeButton = button;
      button.style.background = ACCENT;
      button.style.color = '#000';
      button.style.borderColor = ACCENT;
      button.setAttribute('aria-pressed', 'true');
      render();
    }

    const buttons = SIZES.map((size) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = size.label;
      button.setAttribute('aria-pressed', 'false');
      button.style.cssText =
          'background:#111;color:#aaa;border:1px solid #333;padding:5px 14px;' +
          'border-radius:20px;font-family:monospace;font-size:12px;cursor:pointer;';
      button.addEventListener('click', () => selectSize(size, button));
      toolbar.appendChild(button);
      return button;
    });

    const orientationButton = document.createElement('button');
    orientationButton.type = 'button';
    orientationButton.style.cssText =
        'background:#111;color:#aaa;border:1px solid #333;padding:5px 14px;' +
        'border-radius:20px;font-family:monospace;font-size:12px;cursor:pointer;' +
        'margin-left:4px;';
    orientationButton.addEventListener('click', () => {
      if (activeSize.desktop || activeSize.fixed) return;
      orientation = orientation === PORTRAIT ? LANDSCAPE : PORTRAIT;
      render();
    });

    function syncOrientationButton() {
      const disabled = activeSize.desktop || activeSize.fixed;
      orientationButton.disabled = disabled;
      orientationButton.style.opacity = disabled ? '0.4' : '1';
      orientationButton.style.cursor = disabled ? 'default' : 'pointer';
      orientationButton.textContent =
          orientation === PORTRAIT ? '↻ Portrait' : '↻ Landscape';
    }

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = '✕ Close';
    closeButton.style.cssText =
        'margin-left:auto;background:transparent;border:1px solid #444;color:#aaa;' +
        'padding:5px 14px;border-radius:20px;font-family:monospace;font-size:12px;cursor:pointer;';
    closeButton.addEventListener('click', () => ctx.deactivateSelf());

    // Escape closes the overlay when focus is on the chrome (toolbar). Focus
    // inside the iframe is captured by the framed document and won't reach here
    // — the ✕ button and the panel toggle remain the reliable exits.
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') ctx.deactivateSelf();
    });

    toolbar.prepend(label);
    toolbar.appendChild(orientationButton);
    toolbar.appendChild(dimLabel);
    toolbar.appendChild(closeButton);

    frameWrap.appendChild(frame);
    stage.appendChild(frameWrap);
    overlay.appendChild(toolbar);
    overlay.appendChild(stage);
    ctx.root.appendChild(overlay);

    // Modal-ish focus management. The overlay covers the page; inert the host
    // body so Tab can't reach now-hidden page controls behind it. Our shadow
    // host lives on <html>, not <body>, so it stays interactive. We do NOT
    // claim role="dialog"/aria-modal: a true focus trap can't span the iframe
    // (esp. cross-origin), and over-claiming a trap we can't honor is the same
    // mistake as a fake role="toolbar".
    lastFocused = document.activeElement;
    document.body.inert = true;
    buttons[2].focus(); // Desktop, matching the default preset below.

    selectSize(SIZES[2], buttons[2]);
  }

  function deactivate() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    frame = null;
    document.body.inert = false;
    // If focus was elsewhere on the host page before opening, restore it; the
    // panel separately returns focus to the Responsive button on self-close.
    if (lastFocused && typeof lastFocused.focus === 'function' &&
        document.documentElement.contains(lastFocused)) {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  return {
    id: 'responsive-preview',
    label: '📐 Responsive preview',
    exclusive: true,
    activate,
    deactivate,
    getInspectionTarget,
  };
}