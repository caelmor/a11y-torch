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
 *     id:        string   unique key
 *     label:     string   button text (practitioner-readable)
 *     exclusive: boolean  optional; a full-screen lens (the preview) that can't
 *                         co-exist with another exclusive lens
 *     activate(ctx)       turn on; mount UI into ctx.root / ctx.overlayLayer
 *     deactivate(ctx)     turn off; remove everything it added
 *     getInspectionTarget()  optional; an exclusive viewport lens may expose the
 *                         document/window that inspection lenses should target
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

export function createRegistry({ root, overlayLayer, onChange }) {
    const lenses = []; // descriptors, in registration order
    const active = new Set(); // ids currently on

    const byId = (id) => lenses.find((l) => l.id === id) || null;

    function getActiveExclusive() {
        for (const l of lenses) {
            if (l.exclusive && active.has(l.id)) return l;
        }
        return null;
    }

    // The cross-frame seam. Inspection lenses (#3-#5) call this to learn what to
    // inspect: the host document by default, or when a viewport lens is active
    // and exposes a reachable contentDocument, that frame instead. Nothing
    // consumes the iframe branch yet; the wiring is here so #3-#5 don't have to
    // know the preview exists.
    function getTarget() {
        const ex = getActiveExclusive();
        if (ex && typeof ex.getInspectionTarget === 'function') {
            const t = ex.getInspectionTarget();
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
        // One exclusive lens at a time.
        if (lens.exclusive) {
            const current = getActiveExclusive();
            if (current && current.id !== id) deactivate(current.id);
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
        // and keyboard focus is orphaned.
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
            // Snapshot — deactivating mutates `active`.
            for (const id of [...active]) deactivate(id);
        },
    };
}