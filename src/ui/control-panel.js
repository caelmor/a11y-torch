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
 *   - Occlusion: a dock button cycles the panel through the four viewport
 *     corners. It's a plain <button> (keyboard + pointer), so — unlike a drag
 *     handle — it carries no WCAG 2.5.7 single-pointer-alternative obligation.
 *     Move it off whatever you're inspecting (or off the preview's toolbar).
 *
 * Lives in the shadow root, so none of this chrome is visible to the tool's own
 * lenses.
 */

const ACCENT = '#4fc3f7';
const FOCUS_RING = '#e8e8e8';

// Dock cycle order: clockwise from top-right
const DOCKS = ['tr', 'br', 'bl', 'tl'];
const DOCK_NAME = { tr: 'top right', br: 'bottom right', bl: 'bottom left', tl: 'top left' };
const DOCK_GLYPH = { tr: '\u25F3', br: '\u25F2', bl: '\u25F1', tl: '\u25F0' };

const STYLE =
    ':host,*{box-sizing:border-box}' +
    '.panel{position:fixed;z-index:2;pointer-events:auto;width:220px;overflow:hidden;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;font-family:"Courier New",monospace;color:#e8e8e8;box-shadow:0 8px 32px rgba(0,0,0,.5)}' +
    '.panel[data-dock="tr"]{top:16px;right:16px}' +
    '.panel[data-dock="br"]{bottom:16px;right:16px}' +
    '.panel[data-dock="bl"]{bottom:16px;left:16px}' +
    '.panel[data-dock="tl"]{top:16px;left:16px}' +
    '.panel__bar{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111;border-bottom:1px solid #2a2a2a}' +
    '.panel__title{color:' + ACCENT + ';font-weight:bold;font-size:11px;letter-spacing:.1em}' +
    '.panel__btn{background:transparent;border:1px solid #444;color:#aaa;border-radius:6px;font:inherit;font-size:12px;line-height:1;padding:2px 8px;cursor:pointer}' +
    '.panel__btn:hover{color:' + ACCENT + ';border-color:' + ACCENT + '}' +
    '.panel__btn:focus-visible{outline:2px solid ' + FOCUS_RING + ';outline-offset:2px}' +
    '.panel__dock{margin-left:auto}' +
    '.panel__body{display:flex;flex-direction:column;gap:6px;padding:10px}' +
    '.lens{display:flex;align-items:center;width:100%;text-align:left;background:#111;color:#aaa;border:1px solid #333;border-radius:8px;font:inherit;font-size:12px;padding:8px 10px;cursor:pointer}' +
    '.lens:hover:not(:disabled):not([aria-pressed="true"]){border-color:' + ACCENT + ';color:' + ACCENT + '}' +
    '.lens:focus-visible{outline:2px solid ' + FOCUS_RING + ';outline-offset:2px}' +
    '.lens[aria-pressed="true"]{background:' + ACCENT + ';color:#000;border-color:' + ACCENT + '}' +
    '.lens:disabled{opacity:.4;cursor:default}' +
    '.panel__stamp{padding:6px 10px;border-top:1px solid #2a2a2a;color:#666;font-size:10px;letter-spacing:.04em;font-family:"Courier New",monospace}';

export function createControlPanel({ root, getRegistry, version }) {
    let styleEl = null;
    let container = null;
    let closeButton = null;
    // Dock position persists across hide/show within one panel instance
    let dockIndex = 0;
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
            title.textContent = '\uD83D\uDD26 A11Y-TORCH';

            const dockButton = document.createElement('button');
            dockButton.type = 'button';
            dockButton.className = 'panel__btn panel__dock';

            function applyDock() {
                const dock = DOCKS[dockIndex];
                container.dataset.dock = dock;
                dockButton.textContent = DOCK_GLYPH[dock];
                // Name reflects the resulting position so AT users know where it went
                dockButton.setAttribute('aria-label', 'Move a11y-torch panel (now ' + DOCK_NAME[dock] + ')');
            }
            dockButton.addEventListener('click', () => {
                dockIndex = (dockIndex + 1) % DOCKS.length;
                applyDock();
            });

            closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'panel__btn';
            closeButton.textContent = '\u2715';
            closeButton.setAttribute('aria-label', 'Close a11y-torch');

            bar.appendChild(title);
            bar.appendChild(dockButton);
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

            // Build stamp: version + live lens count
            const stamp = document.createElement('div');
            stamp.className = 'panel__stamp';
            const n = reg.list().length;
            stamp.textContent =
                'v' + (version || '?') + ' \u00B7 ' + n + (n === 1 ? ' lens' : ' lenses');

            container.appendChild(bar);
            container.appendChild(body);
            container.appendChild(stamp);
            applyDock(); // set initial dock data-attr + button label
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
