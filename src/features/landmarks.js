/**
 * Landmark highlighter — host-page inspection lens (APG Landmark Regions; #4).
 *
 * Outlines every landmark region on the target document and labels it with its
 * role + accessible name, making a keyboard/AT user's mental map of the page
 * visible. Follows the inspection-lens contract set by image-names / focus
 * overlay: reads ctx.getTarget().document, paints into ctx.overlayLayer (never
 * the host DOM), group:'inspect' (composes with the other inspect lenses, yields
 * to the full-screen preview). Teardown removes our wrapper + style node.
 *
 * Landmark resolution (the load-bearing a11y logic — HTML-AAM / ARIA-in-HTML):
 *   - Explicit role wins over native semantics. The FIRST token of role= that is
 *     a landmark role is used; a non-landmark explicit role (button, none, ...)
 *     strips the native landmark (e.g. <nav role="none"> is not a landmark).
 *   - <header>/<footer> map to banner/contentinfo ONLY when not nested in
 *     article/aside/main/nav/section. Nested → generic, dropped.
 *   - <section>/<form> (and role=region/form) are landmarks ONLY with an
 *     accessible name. Native unnamed section/form are valid HTML, just not
 *     landmarks → dropped silently. An explicit role=region/form with no name is
 *     an author error (a declared landmark AT won't expose) → shown + flagged.
 *   - <aside> is complementary, except nested in sectioning content with no
 *     accessible name → generic, dropped.
 *   - <nav>, <main>, <search> are always their landmark.
 *
 * Accessible name precedence (landmarks): aria-labelledby -> aria-label -> title.
 *
 * Anti-patterns flagged (amber), per APG:
 *   - more than one banner / main / contentinfo (each must be unique)
 *   - multiple same-role landmarks not told apart by a unique accessible name
 *     (unnamed, or duplicate names) — AT users can't distinguish them
 *
 * Snapshot semantics (matches the other inspect lenses): the landmark set is
 * scanned once on activate; boxes reposition on scroll/resize but are not
 * rebuilt on DOM mutation. Toggle off/on to re-scan.
 *
 * Scope (v1): elements in the target document. querySelectorAll does not pierce
 * our own shadow root, so the tool's chrome is invisible to this scan.
 */

const LM = '#b388ff'; // landmark outline (violet — distinct from the image lens blue)
const LM_WASH = 'rgba(179,136,255,0.08)';
const WARN = '#ffb300'; // anti-pattern (amber)
const WARN_WASH = 'rgba(255,179,0,0.10)';

const STYLE =
    '.a11yt-lm-box{position:absolute;box-sizing:border-box;pointer-events:none;' +
    'box-shadow:0 0 0 1px rgba(0,0,0,0.35);}' +
    '.a11yt-lm-ok{border:2px solid ' + LM + ';background:' + LM_WASH + ';}' +
    '.a11yt-lm-warn{border:2px dashed ' + WARN + ';background:' + WARN_WASH + ';}' +
    '.a11yt-lm-chip{position:absolute;top:0;left:0;max-width:340px;' +
    'font-family:"Courier New",monospace;font-size:11px;font-weight:bold;line-height:1.3;' +
    'padding:2px 6px;border-radius:0 0 4px 0;white-space:nowrap;overflow:hidden;' +
    'text-overflow:ellipsis;pointer-events:auto;cursor:default;}' +
    '.a11yt-lm-chip:hover{max-width:none;overflow:visible;z-index:10;}' +
    '.a11yt-chip-ok{background:' + LM + ';color:#000;}' +
    '.a11yt-chip-warn{background:' + WARN + ';color:#000;}';

// Native element -> implicit landmark role
const NATIVE_ROLE = {
    header: 'banner',
    nav: 'navigation',
    main: 'main',
    aside: 'complementary',
    footer: 'contentinfo',
    section: 'region',
    form: 'form',
    search: 'search',
};

const LANDMARK_ROLES = new Set([
    'banner', 'navigation', 'main', 'complementary',
    'contentinfo', 'region', 'form', 'search',
]);

// Sectioning ancestors that scope <header>/<footer> out of banner/contentinfo,
// and that make an unnamed <aside> generic
const SCOPE_SEL = 'article, aside, main, nav, section';
// Must be unique per page
const UNIQUE = new Set(['banner', 'main', 'contentinfo']);
// Not exposed as a landmark without an accessible name
const NAME_REQUIRED = new Set(['region', 'form']);

// First token of role= wins (ARIA: first valid role in the list is used)
function firstRoleToken(el) {
    const role = (el.getAttribute('role') || '').trim().toLowerCase();
    if (!role) return null;
    return role.split(/\s+/)[0] || null;
}

// Landmark accessible name: aria-labelledby -> aria-label -> title
function accessibleName(el, doc) {
    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
        const text = labelledby
            .split(/\s+/)
            .map((id) => {
                const ref = id && doc.getElementById(id);
                return ref ? ref.textContent.trim() : '';
            })
            .filter(Boolean)
            .join(' ')
            .trim();
        if (text) return text;
    }
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    return '';
}

function scopedOut(el) {
    const parent = el.parentElement;
    return !!(parent && parent.closest(SCOPE_SEL));
}

// Resolve an element to a landmark record, or null if it isn't one
function resolve(el, doc) {
    const explicit = firstRoleToken(el);
    let role;
    let fromRole;
    if (explicit) {
        if (!LANDMARK_ROLES.has(explicit)) return null; // non-landmark role overrides native semantics
        role = explicit;
        fromRole = true;
    } else {
        role = NATIVE_ROLE[el.localName] || null;
        if (!role) return null;
        fromRole = false;
    }

    const name = accessibleName(el, doc);

    // Native header/footer: banner/contentinfo only when not scoped by sectioning content
    if (!fromRole && (el.localName === 'header' || el.localName === 'footer') && scopedOut(el)) {
        return null;
    }
    // Native aside: complementary unless scoped + unnamed
    if (!fromRole && el.localName === 'aside' && scopedOut(el) && !name) {
        return null;
    }

    const issues = [];
    if (NAME_REQUIRED.has(role) && !name) {
        if (!fromRole) return null; // native unnamed section/form: valid HTML, simply not a landmark
        issues.push('no accessible name — not exposed as a landmark');
    }

    return { el, role, name, fromRole, issues };
}

// Cross-cutting checks that need the whole set
function flagAntiPatterns(records) {
    const byRole = new Map();
    for (const rec of records) {
        if (!byRole.has(rec.role)) byRole.set(rec.role, []);
        byRole.get(rec.role).push(rec);
    }
    for (const [role, group] of byRole) {
        if (group.length > 1 && UNIQUE.has(role)) {
            for (const rec of group) rec.issues.push('duplicate ' + role + ' — only one per page');
            continue;
        }
        if (group.length > 1) {
            const counts = new Map();
            for (const rec of group) {
                const key = rec.name.toLowerCase();
                counts.set(key, (counts.get(key) || 0) + 1);
            }
            for (const rec of group) {
                if (!rec.name) {
                    rec.issues.push('unnamed — indistinguishable from ' + (group.length - 1) + ' other ' + role);
                } else if (counts.get(rec.name.toLowerCase()) > 1) {
                    rec.issues.push('duplicate name among ' + role + ' landmarks');
                }
            }
        }
    }
}

function chipText(rec) {
    const head = rec.role.toUpperCase() + (rec.name ? ' \u00B7 ' + rec.name : '');
    return rec.issues.length ? head + '  \u26A0 ' + rec.issues.join('; ') : head;
}

export function createLandmarkLens() {
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
        wrap.setAttribute('data-a11y-torch', 'landmarks');
        ctx.overlayLayer.appendChild(wrap);

        const records = [];
        doc
            .querySelectorAll('header,nav,main,aside,footer,section,form,search,[role]')
            .forEach((el) => {
                const rec = resolve(el, doc);
                if (rec) records.push(rec);
            });
        flagAntiPatterns(records);

        const entries = records.map((rec) => {
            const kind = rec.issues.length ? 'warn' : 'ok';
            const box = document.createElement('div');
            box.className = 'a11yt-lm-box a11yt-lm-' + kind;
            const chip = document.createElement('span');
            chip.className = 'a11yt-lm-chip a11yt-chip-' + kind;
            chip.textContent = chipText(rec);
            box.appendChild(chip);
            wrap.appendChild(box);
            return { el: rec.el, box };
        });

        // The overlay layer is position:fixed at the viewport origin
        function reposition() {
            for (const { el, box } of entries) {
                const r = el.getBoundingClientRect();
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
        id: 'landmarks',
        label: '\uD83D\uDDFA\uFE0F Landmarks',
        group: 'inspect',
        activate,
        deactivate,
    };
}
