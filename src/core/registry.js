/**
 * Lens registry — the extensibility core.
 *
 * A "lens" is a self-contained inspection mode. Each registers a descriptor and
 * is driven entirely through this registry, so adding #3/#4/#5 later is purely
 * additive: write the module, register the descriptor in index.js, done. No
 * panel, lifecycle, or isolation code changes per feature.
 *
 * Lens descriptor:
 *   {
 *     id:     string   unique key
 *     label:  string   button text (practitioner-readable)
 *     group:  string   optional exclusivity group:
 *                        'fullscreen' — owns the screen (the preview). SOLO:
 *                          activating it suspends every other lens, and any
 *                          other lens activating suspends it.
 *                        'inspect'    — host-page lenses (#3-#5). They COMPOSE
 *                          with each other and merely yield to a 'fullscreen'
 *                          lens. (no group → composes freely, yields to nothing)
 *     activate(ctx)       turn on; mount UI into ctx.root / ctx.overlayLayer
 *     deactivate(ctx)     turn off; remove everything it added
 *     getInspectionTarget()  optional; a 'fullscreen' viewport lens may expose
 *                         the document/window inspection lenses should target
 *                         instead of the host page (the cross-frame seam).
 *   }
 *
 * ctx given to every lens:
 *   {
 *     root            ShadowRoot to mount lens UI into
 *     overlayLayer    shared pointer-events:none layer for host-page boxes
 *     getTarget()     { document, window } the lens should inspect right now
 *     deactivateSelf()  lens-initiated turn-off (its own ✕ / Escape), routed
 *                       through the registry so the panel stays in sync
 *   }
 */

// Groups whose members own the screen: only one can be active
const SOLO_GROUPS = new Set(['fullscreen']);

const isSolo = (lens) => !!lens && SOLO_GROUPS.has(lens.group);

export function createRegistry({ root, overlayLayer, onChange }) {
    const lenses = []; // descriptors, in registration order
    const active = new Set(); // ids currently on

    const byId = (id) => lenses.find((l) => l.id === id) || null;

    // The active solo (full-screen) lens
    function getActiveSolo() {
        for (const l of lenses) {
            if (isSolo(l) && active.has(l.id)) return l;
        }
        return null;
    }

    // The cross-frame seam. Inspection lenses (#3-#5) call this to learn what to
    // inspect: the host document by default, or when a solo viewport lens is
    // active and exposes a reachable contentDocument, that frame instead.
    function getTarget() {
        const solo = getActiveSolo();
        if (solo && typeof solo.getInspectionTarget === 'function') {
            const t = solo.getInspectionTarget();
            if (t && t.document) return t;
        }
        return { document, window };
    }

    function contextFor(descriptor) {
        return {
            root,
            overlayLayer,
            getTarget,
            deactivateSelf() {
                deactivate(descriptor.id, true);
            },
        };
    }

    function notify(returnFocusToId) {
        if (typeof onChange === 'function') onChange({ returnFocusToId });
    }

    function activate(id) {
        const lens = byId(id);
        if (!lens || active.has(id)) return;
        if (isSolo(lens)) {
            // Owns the screen — suspend every other lens.
            for (const other of [...active]) deactivate(other);
        } else {
            // Compose with peer inspection lenses, but yield to a solo lens.
            for (const other of [...active]) {
                if (isSolo(byId(other))) deactivate(other);
            }
        }
        lens.activate(contextFor(lens));
        active.add(id);
        notify(null);
    }

    function deactivate(id, selfInitiated) {
        const lens = byId(id);
        if (!lens || !active.has(id)) return;
        lens.deactivate(contextFor(lens));
        active.delete(id);
        // Return focus to the lens's button only when the lens turned ITSELF off
        // (e.g. preview ✕ / Escape) — otherwise the full-screen overlay vanishes
        notify(selfInitiated ? id : null);
    }

    return {
        register(descriptor) {
            if (!byId(descriptor.id)) lenses.push(descriptor);
            return this;
        },
        list: () => lenses.slice(),
        isActive: (id) => active.has(id),
        activate,
        deactivate,
        toggle(id) {
            active.has(id) ? deactivate(id) : activate(id);
        },
        deactivateAll() {
            // Snapshot — deactivating mutates `active`
            for (const id of [...active]) deactivate(id);
        },
    };
}
