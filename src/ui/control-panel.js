/**
 * The persistent control panel — a11y-torch's single control surface (Option 4).
 *
 * One small floating panel is home for every lens: the viewport preview and the
 * host-page inspection toggles (#3-#5) alike.
 *
 * Deliberate a11y choices:
 *   - NOT a landmark; NOT role="toolbar". A toolbar owes roving tabindex +
 *     arrow-key navigation (APG Toolbar); a handful of plain <button>s in the
 *     natural tab order is more correct than a half-built toolbar. This mirrors
 *     the preview's own bar, which is also a row of plain buttons.
 *   - Each lens button reflects state with aria-pressed, never color alone.
 *   - role="group" + aria-label names the cluster without claiming a landmark.
 *
 * Lives in the shadow root, so none of this chrome is visible to the tool's own
 * lenses.
 *
 * STYLE note: authored as one rule per source line but concatenated (no literal
 * newlines), so the minified bundle stays a true single line — esbuild folds
 * `'…' + ACCENT + '…'` of string constants into one literal and does not strip
 * newlines that live *inside* a template string.
 */

const ACCENT = '#4fc3f7';
const FOCUS_RING = '#e8e8e8';

const STYLE =
    ':host,*{box-sizing:border-box}' +
    '.panel{position:fixed;top:16px;right:16px;z-index:2;pointer-events:auto;width:220px;overflow:hidden;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;font-family:"Courier New",monospace;color:#e8e8e8;box-shadow:0 8px 32px rgba(0,0,0,.5)}' +
    '.panel__bar{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111;border-bottom:1px solid #2a2a2a}' +
    '.panel__title{color:' + ACCENT + ';font-weight:bold;font-size:11px;letter-spacing:.1em}' +
    '.panel__close{margin-left:auto;background:transparent;border:1px solid #444;color:#aaa;border-radius:6px;font:inherit;font-size:11px;padding:2px 8px;cursor:pointer}' +
    '.panel__close:hover{color:' + ACCENT + ';border-color:' + ACCENT + '}' +
    '.panel__close:focus-visible{outline:2px solid ' + FOCUS_RING + ';outline-offset:2px}' +
    '.panel__body{display:flex;flex-direction:column;gap:6px;padding:10px}' +
    '.lens{display:flex;align-items:center;width:100%;text-align:left;background:#111;color:#aaa;border:1px solid #333;border-radius:8px;font:inherit;font-size:12px;padding:8px 10px;cursor:pointer}' +
    // Hover recolors text/border to accent ONLY when not active — recoloring the
    // active (accent-filled) button painted accent-on-accent (invisible).
    '.lens:hover:not(:disabled):not([aria-pressed="true"]){border-color:' + ACCENT + ';color:' + ACCENT + '}' +
    // Focus is its own visible ring rather than a recolor, so it survives every
    // state (incl. the active accent fill) without contrast collisions.
    '.lens:focus-visible{outline:2px solid ' + FOCUS_RING + ';outline-offset:2px}' +
    '.lens[aria-pressed="true"]{background:' + ACCENT + ';color:#000;border-color:' + ACCENT + '}' +
    '.lens:disabled{opacity:.4;cursor:default}';

export function createControlPanel({ root, getRegistry }) {
    let styleEl = null;
    let container = null;
    let closeButton = null;
    const buttons = new Map(); // id -> <button>

    function sync(returnFocusToId) {
        const reg = getRegistry();
        for (const [id, btn] of buttons) {
            btn.setAttribute('aria-pressed', reg.isActive(id) ? 'true' : 'false');
        }
        if (returnFocusToId && buttons.has(returnFocusToId)) {
            buttons.get(returnFocusToId).focus();
        }
    }

    return {
        mount() {
            if (container) return { closeButton };
            const reg = getRegistry();

            styleEl = document.createElement('style');
            styleEl.textContent = STYLE;

            container = document.createElement('div');
            container.className = 'panel';
            container.setAttribute('role', 'group');
            container.setAttribute('aria-label', 'a11y-torch controls');

            const bar = document.createElement('div');
            bar.className = 'panel__bar';
            const title = document.createElement('span');
            title.className = 'panel__title';
            title.textContent = '🔦 A11Y-TORCH';
            closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'panel__close';
            closeButton.textContent = '✕';
            closeButton.setAttribute('aria-label', 'Close a11y-torch');
            bar.appendChild(title);
            bar.appendChild(closeButton);

            const body = document.createElement('div');
            body.className = 'panel__body';

            buttons.clear();
            for (const lens of reg.list()) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'lens';
                btn.textContent = lens.label;
                btn.setAttribute('aria-pressed', 'false');
                btn.addEventListener('click', () => reg.toggle(lens.id));
                buttons.set(lens.id, btn);
                body.appendChild(btn);
            }

            container.appendChild(bar);
            container.appendChild(body);
            root.appendChild(styleEl);
            root.appendChild(container);

            return { closeButton };
        },
        unmount() {
            if (container) container.remove();
            if (styleEl) styleEl.remove();
            container = styleEl = closeButton = null;
            buttons.clear();
        },
        isMounted: () => !!container,
        sync,
        focusFirst() {
            const first = buttons.values().next().value;
            if (first) first.focus();
        },
    };
}