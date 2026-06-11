/**
 * Image accessible-name exposer — host-page inspection lens
 *
 * The FIRST inspection lens, so it sets the pattern #3 and #4 follow:
 *   - Inspects ctx.getTarget().document — the host page by default, or a
 *     reachable preview iframe if a viewport lens ever exposes one. It never
 *     touches `document`/`window` directly, so it is not coupled to the host.
 *   - Paints into ctx.overlayLayer (the shared pointer-events:none box layer),
 *     never into the host DOM. The images under audit are untouched and the
 *     page stays interactive. Teardown is removing our own wrapper + style node.
 *   - group:'inspect' — composes with the other host-page inspection lenses
 *     (e.g. focus location) and only yields the screen to the full-screen
 *     preview. The preview is opaque, so boxes painted in the (lower) overlay
 *     layer would be occluded behind it; the registry suspends inspect lenses
 *     while it's up. True simultaneous preview+inspect needs the cross-frame
 *     seam (inspect the iframe doc and paint above the preview) — deferred.
 *
 * Per <img> in the target document:
 *   - HAS a name      -> accent outline + chip showing the name and its source
 *   - DECORATIVE      -> grey wash   (alt="" OR role=presentation/none)
 *   - HIDDEN from AT  -> grey wash   (aria-hidden on the img OR any ancestor)
 *   - NO name (crux)  -> red border  (missing alt attribute, no other name)
 *
 * Name precedence follows accname: aria-labelledby -> aria-label -> alt -> title.
 * The alt distinction is load-bearing and is the whole point of the feature:
 * alt="" is an author declaring "decorative" (grey); a missing alt attribute is
 * an omission (red error). title only contributes when alt is absent.
 *
 * Scope (v1, matching the spec): <img> elements only. SVG, <input type=image>,
 * <area>, role="img" containers, and CSS background images are out of scope —
 * the last is never in the a11y tree.
 *
 * Snapshot semantics: images are scanned once on activate; boxes reposition on
 * scroll/resize but the set is not rebuilt on DOM mutation. Toggle off/on to
 * re-scan — standard for a point-in-time manual-audit pass.
 *
 * Cross-frame note: boxes are positioned in the top-level overlay layer from
 * the target's viewport rects, which is exact when the target is the host page
 * (the only branch consumed today). Mapping iframe-local rects into the top
 * viewport is deferred with the rest of the cross-frame seam.
 */

const ACCENT = '#4fc3f7';
const ERROR = '#ff3b30';
const GREY_WASH = 'rgba(110,110,110,0.65)';

const STYLE =
    '.a11yt-img-box{position:absolute;box-sizing:border-box;pointer-events:none;overflow:visible;}' +
    '.a11yt-img-named{border:2px solid ' + ACCENT + ';}' +
    '.a11yt-img-grey{background:' + GREY_WASH + ';border:1px dashed #888;}' +
    '.a11yt-img-error{border:3px solid ' + ERROR + ';background:rgba(255,59,48,0.10);}' +
    '.a11yt-img-chip{position:absolute;top:0;left:0;max-width:260px;' +
    'font-family:"Courier New",monospace;font-size:11px;font-weight:bold;line-height:1.3;' +
    'padding:2px 6px;border-radius:0 0 4px 0;white-space:nowrap;overflow:hidden;' +
    'text-overflow:ellipsis;pointer-events:auto;cursor:default;}' +
    '.a11yt-img-chip:hover{max-width:none;overflow:visible;z-index:10;}' +
    '.a11yt-chip-named{background:' + ACCENT + ';color:#000;}' +
    '.a11yt-chip-grey{background:#555;color:#fff;}' +
    '.a11yt-chip-error{background:' + ERROR + ';color:#000;}';

const SOURCE_TAG = {
    labelledby: '[labelledby] ',
    'aria-label': '[aria-label] ',
    alt: '[alt] ',
    title: '[title] ',
};

// Accessible name precedence for <img>: aria-labelledby -> aria-label -> alt -> title
// Returns one of: {name, source} | {decorative, reason} | {missing:true}
function accessibleName(img, doc) {
    const labelledby = img.getAttribute('aria-labelledby');
    if (labelledby) {
        const text = labelledby
            .split(/\s+/)
            .map((id) => {
                const el = id && doc.getElementById(id);
                return el ? el.textContent.trim() : '';
            })
            .filter(Boolean)
            .join(' ')
            .trim();
        if (text) return { name: text, source: 'labelledby' };
    }

    const ariaLabel = img.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return { name: ariaLabel.trim(), source: 'aria-label' };

    // Present but empty alt is decorative, an absent alt is a fail
    if (img.hasAttribute('alt')) {
        const alt = img.getAttribute('alt');
        if (alt.trim()) return { name: alt.trim(), source: 'alt' };
        return { decorative: true, reason: 'alt=""' };
    }

    // title only contributes as a name when alt is absent
    const title = img.getAttribute('title');
    if (title && title.trim()) return { name: title.trim(), source: 'title' };

    return { missing: true };
}

// Returns {kind: 'named'|'grey'|'error', chip: string}
function classify(img, doc) {
    // Removed from the a11y tree entirely — self or any ancestor.
    const hiddenEl = img.closest('[aria-hidden="true"]');
    if (hiddenEl) {
        return { kind: 'grey', chip: 'hidden — aria-hidden (' + (hiddenEl === img ? 'self' : 'ancestor') + ')' };
    }

    const role = (img.getAttribute('role') || '').trim().toLowerCase();
    if (role === 'presentation' || role === 'none') {
        return { kind: 'grey', chip: 'decorative — role=' + role };
    }

    const result = accessibleName(img, doc);
    if (result.name) return { kind: 'named', chip: (SOURCE_TAG[result.source] || '') + result.name };
    if (result.decorative) return { kind: 'grey', chip: 'decorative — ' + result.reason };
    return { kind: 'error', chip: 'NO NAME — missing alt' };
}

export function createImageNameLens() {
    let state = null;

    function activate(ctx) {
        if (state) return;
        const target = ctx.getTarget();
        const doc = target.document;
        const win = target.window || window;

        const styleEl = document.createElement('style');
        styleEl.textContent = STYLE;
        ctx.root.appendChild(styleEl);

        // One wrapper so teardown is a single removeChild
        const wrap = document.createElement('div');
        wrap.setAttribute('data-a11y-torch', 'image-names');
        ctx.overlayLayer.appendChild(wrap);

        const entries = [];
        doc.querySelectorAll('img').forEach((img) => {
            const { kind, chip } = classify(img, doc);
            const box = document.createElement('div');
            box.className = 'a11yt-img-box a11yt-img-' + kind;
            const label = document.createElement('span');
            label.className = 'a11yt-img-chip a11yt-chip-' + kind;
            label.textContent = chip;
            box.appendChild(label);
            wrap.appendChild(box);
            entries.push({ img, box });
        });

        // The overlay layer is position:fixed at the viewport origin
        function reposition() {
            for (const { img, box } of entries) {
                const r = img.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) {
                    box.style.display = 'none';
                    continue;
                }
                box.style.display = 'block';
                box.style.left = r.left + 'px';
                box.style.top = r.top + 'px';
                box.style.width = r.width + 'px';
                box.style.height = r.height + 'px';
            }
        }

        reposition();
        // Settle once after layout
        const raf = typeof win.requestAnimationFrame === 'function' ? win.requestAnimationFrame(reposition) : 0;
        win.addEventListener('scroll', reposition, true);
        win.addEventListener('resize', reposition);

        state = { styleEl, wrap, reposition, win, raf };
    }

    function deactivate() {
        if (!state) return;
        state.win.removeEventListener('scroll', state.reposition, true);
        state.win.removeEventListener('resize', state.reposition);
        if (state.raf && typeof state.win.cancelAnimationFrame === 'function') {
            state.win.cancelAnimationFrame(state.raf);
        }
        state.wrap.remove();
        state.styleEl.remove();
        state = null;
    }

    return {
        id: 'image-names',
        label: '🖼️ Image names',
        group: 'inspect',
        activate,
        deactivate,
    };
}
