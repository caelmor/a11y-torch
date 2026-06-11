/**
 * Focus location overlay — host-page inspection lens (WCAG 2.4.7 Focus Visible;
 * 2.4.11 Focus Not Obscured AA / 2.4.13 Focus Appearance AAA in WCAG 2.2).
 *
 * Reveals WHERE keyboard focus is by tracking the target document's
 * activeElement with a single black box, NVDA-overlay style. This is a
 * reveal-only audit aid: it does NOT inject a :focus style onto the page. The
 * page's own focus styling is left intact and visible — masking it would defeat
 * the audit (the question is whether the page itself ships a visible indicator).
 * The box is drawn just OUTSIDE the element so it frames focus location without
 * covering the element's own ring.
 *
 * Why an overlay element, not the meeting's ::before/::after on the focused
 * element: pseudo-elements don't render on replaced elements (input, select,
 * textarea, img) — exactly the controls you most need focus visibility on. One
 * tracked overlay box works uniformly across every element type.
 *
 */

const BOX = '#000';
const HALO = 'rgba(255,255,255,0.9)'; // outer ring so the black box stays visible on dark pages
const BORDER = 3;
const PAD = BORDER;

const STYLE =
    '.a11yt-focus-box{position:absolute;box-sizing:border-box;pointer-events:none;display:none;' +
    'border:' + BORDER + 'px solid ' + BOX + ';border-radius:2px;' +
    'box-shadow:0 0 0 2px ' + HALO + ';}';

export function createFocusOverlayLens() {
    let state = null;

    function activate(ctx) {
        if (state) return;
        const target = ctx.getTarget();
        const doc = target.document;
        const win = target.window || window;
        // Focus inside our own shadow root retargets to this element.
        const selfHost = ctx.root.host;

        const styleEl = document.createElement('style');
        styleEl.textContent = STYLE;
        ctx.root.appendChild(styleEl);

        const box = document.createElement('div');
        box.className = 'a11yt-focus-box';
        box.setAttribute('data-a11y-torch', 'focus-overlay');
        ctx.overlayLayer.appendChild(box);

        function reposition() {
            const el = doc.activeElement;
            // Nothing meaningful is focused, or focus is on our own chrome.
            if (!el || el === selfHost || el === doc.body || el === doc.documentElement) {
                box.style.display = 'none';
                return;
            }
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) {
                box.style.display = 'none';
                return;
            }
            box.style.display = 'block';
            box.style.left = r.left - PAD + 'px';
            box.style.top = r.top - PAD + 'px';
            box.style.width = r.width + PAD * 2 + 'px';
            box.style.height = r.height + PAD * 2 + 'px';
        }

        // Coalesce focus + viewport changes into one frame-aligned read so we
        // never sample activeElement mid-transition.
        let raf = 0;
        function schedule() {
            if (raf) return;
            if (typeof win.requestAnimationFrame === 'function') {
                raf = win.requestAnimationFrame(() => {
                    raf = 0;
                    reposition();
                });
            } else {
                reposition();
            }
        }

        reposition(); // reveal current focus the moment the lens turns on
        doc.addEventListener('focusin', schedule, true);
        doc.addEventListener('focusout', schedule, true);
        win.addEventListener('scroll', schedule, true);
        win.addEventListener('resize', schedule);

        function teardown() {
            doc.removeEventListener('focusin', schedule, true);
            doc.removeEventListener('focusout', schedule, true);
            win.removeEventListener('scroll', schedule, true);
            win.removeEventListener('resize', schedule);
            if (raf && typeof win.cancelAnimationFrame === 'function') win.cancelAnimationFrame(raf);
            box.remove();
            styleEl.remove();
        }

        state = { teardown };
    }

    function deactivate() {
        if (!state) return;
        state.teardown();
        state = null;
    }

    return {
        id: 'focus-overlay',
        label: '🎯 Focus location',
        group: 'inspect',
        activate,
        deactivate,
    };
}
