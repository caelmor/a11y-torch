/**
 * Responsive preview, Orientation (Feature #1) and Reflow (Feature #2).
 *
 * Loads the current page into a full-screen iframe overlay and renders it at a
 * chosen viewport size. This is the only context in which CSS media queries
 * respond to a simulated viewport, so all viewport features (orientation,
 * reflow) build on top of this.
 *
 * Orientation (WCAG 1.3.4) and reflow (WCAG 1.4.10) both live here, not in
 * their own modules, because each is a pure transform of this overlay's own
 * dimension state — a width/height swap, and a fixed-dimension preset
 * respectively. Splitting them out would mean exposing that state across a
 * module boundary for no benefit. The host-page inspection features (#3-#5)
 * are the ones that earn their own modules.
 *
 * Each non-desktop preset carries an explicit portrait width AND height;
 * landscape swaps them — except for `fixed` presets (Reflow), whose dimensions
 * are prescribed by the success criterion and must not rotate. Desktop is fluid
 * (100%) and has no orientation, so the orientation control is disabled there
 * and on any fixed preset.
 */

const OVERLAY_ID = 'a11y-torch-responsive-preview';
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

export function createResponsivePreview() {
  let overlay = null;

  function isOpen() {
    return !!overlay && document.body.contains(overlay);
  }

  function close() {
    if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  function open() {
    if (isOpen()) return;

    const url = location.href;

    // Per-session view state. Orientation persists across size changes and is
    // simply ignored while Desktop (fluid) or a fixed preset is active.
    let activeSize = null;
    let activeButton = null;
    let orientation = PORTRAIT;

    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText =
        'position:fixed;inset:0;z-index:2147483647;background:#0f0f0f;' +
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

    const frame = document.createElement('iframe');
    frame.src = url;
    frame.style.cssText = 'width:100%;height:100%;border:none;display:block;';

    const dimLabel = document.createElement('span');
    dimLabel.style.cssText = 'color:#555;font-size:11px;margin-left:2px;';

    // Paints the active preset onto the stage, honoring the current orientation.
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
      button.textContent = size.label;
      // aria-pressed so the active preset isn't conveyed by color alone.
      button.setAttribute('aria-pressed', 'false');
      button.style.cssText =
          'background:#111;color:#aaa;border:1px solid #333;padding:5px 14px;' +
          'border-radius:20px;font-family:monospace;font-size:12px;cursor:pointer;';
      button.addEventListener('click', () => selectSize(size, button));
      toolbar.appendChild(button);
      return button;
    });

    // Orientation toggle
    const orientationButton = document.createElement('button');
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
    closeButton.textContent = '✕ Close';
    closeButton.style.cssText =
        'margin-left:auto;background:transparent;border:1px solid #444;color:#aaa;' +
        'padding:5px 14px;border-radius:20px;font-family:monospace;font-size:12px;cursor:pointer;';
    closeButton.addEventListener('click', close);

    toolbar.prepend(label);
    toolbar.appendChild(orientationButton);
    toolbar.appendChild(dimLabel);
    toolbar.appendChild(closeButton);

    frameWrap.appendChild(frame);
    stage.appendChild(frameWrap);
    overlay.appendChild(toolbar);
    overlay.appendChild(stage);
    document.body.appendChild(overlay);

    // Default to Desktop, matching the original.
    selectSize(SIZES[2], buttons[2]);
  }

  return { open, close, isOpen };
}