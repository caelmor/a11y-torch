/**
 * Responsive preview (Feature 0).
 *
 * Loads the current page into a full-screen iframe overlay and renders it at a
 * chosen viewport width. This is the only context in which CSS media queries
 * respond to a simulated viewport, so all viewport features (orientation,
 * reflow) build on top of this.
 *
 * Behavior is preserved from the original inline bookmarklet. Orientation and
 * reflow are separate planned features and are intentionally not implemented
 * here yet.
 */

const OVERLAY_ID = 'a11y-torch-responsive-preview';
const ACCENT = '#4fc3f7';
const BAR_HEIGHT = 48;

const SIZES = [
  { label: '📱 Mobile', width: 375, desktop: false },
  { label: '📟 Tablet', width: 768, desktop: false },
  { label: '🖥️ Desktop', width: null, desktop: true },
];

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
    label.textContent = '📐 PREVIEW';

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

    let activeButton = null;

    function setSize(size, button) {
      if (size.desktop) {
        frameWrap.style.width = '100%';
        frameWrap.style.height = '100%';
        frameWrap.style.borderRadius = '0';
        frameWrap.style.boxShadow = 'none';
        stage.style.padding = '0';
        stage.style.overflow = 'hidden';
        dimLabel.textContent = '';
      } else {
        frameWrap.style.width = size.width + 'px';
        frameWrap.style.height = '100%';
        frameWrap.style.borderRadius = '6px';
        frameWrap.style.boxShadow = '0 0 0 1px #333,0 8px 32px rgba(0,0,0,0.6)';
        stage.style.padding = '20px';
        stage.style.overflow = 'auto';
        dimLabel.textContent = size.width + 'px';
      }

      if (activeButton) {
        activeButton.style.background = '#111';
        activeButton.style.color = '#aaa';
        activeButton.style.borderColor = '#333';
      }
      activeButton = button;
      button.style.background = ACCENT;
      button.style.color = '#000';
      button.style.borderColor = ACCENT;
    }

    const buttons = SIZES.map((size) => {
      const button = document.createElement('button');
      button.textContent = size.label;
      button.style.cssText =
        'background:#111;color:#aaa;border:1px solid #333;padding:5px 14px;' +
        'border-radius:20px;font-family:monospace;font-size:12px;cursor:pointer;';
      button.addEventListener('click', () => setSize(size, button));
      toolbar.appendChild(button);
      return button;
    });

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ Close';
    closeButton.style.cssText =
      'margin-left:auto;background:transparent;border:1px solid #444;color:#aaa;' +
      'padding:5px 14px;border-radius:20px;font-family:monospace;font-size:12px;cursor:pointer;';
    closeButton.addEventListener('click', close);

    toolbar.prepend(label);
    toolbar.appendChild(dimLabel);
    toolbar.appendChild(closeButton);

    frameWrap.appendChild(frame);
    stage.appendChild(frameWrap);
    overlay.appendChild(toolbar);
    overlay.appendChild(stage);
    document.body.appendChild(overlay);

    // Default to Desktop, matching the original.
    setSize(SIZES[2], buttons[2]);
  }

  return { open, close, isOpen };
}
