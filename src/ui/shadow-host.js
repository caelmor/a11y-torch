/**
 * Single isolated mount point for ALL a11y-torch UI.
 *
 * Everything the tool injects — the control panel, the responsive-preview
 * overlay, and the host-page inspection layer (#3 focus box, #4 landmark
 * outlines) — lives inside ONE shadow root. This is load-bearing:
 *
 *   - Style encapsulation: the host page's CSS can't reach our UI, and our
 *     UI's styles can't leak onto the page being audited.
 *   - Self-isolation from our own lenses: #4 (querySelectorAll over the host
 *     document) does not pierce the shadow boundary, and #5 won't see chrome
 *     emoji as images. #3 only needs to bail when document.activeElement is
 *     OUR host element — focus inside a shadow root retargets to the host.
 *
 * The host element is attached to documentElement (NOT body) so that toggling
 * `document.body.inert` for a modal lens (the full-screen preview) leaves our
 * controls live, and so a host page that rewrites <body> can't take us out.
 */

const HOST_TAG = 'a11y-torch-root';
const SENTINEL = 'data-a11y-torch';
const MAX_Z = '2147483647';

export function createShadowHost() {
    // A hyphenated, custom-element-looking tag can't collide with a host selector.
    const host = document.createElement(HOST_TAG);
    host.setAttribute(SENTINEL, '');
    // `all:initial` blocks inherited host-page properties (font, color) from
    // bleeding across the shadow boundary. The host is a full-viewport,
    // click-through container; children opt back into pointer events as needed.
    host.style.cssText =
        'all:initial;position:fixed;inset:0;z-index:' + MAX_Z + ';pointer-events:none;';

    const root = host.attachShadow({ mode: 'open' });

    // Shared host-page coordinate layer for inspection boxes (#3 focus, #4
    // landmarks). It sits beneath the panel inside the shadow root and never
    // intercepts clicks, so the page under audit stays fully interactive while a
    // lens paints over it. Positioned fixed → viewport coords; lenses translate
    // host-page getBoundingClientRect() values straight into this layer.
    const overlayLayer = document.createElement('div');
    overlayLayer.setAttribute(SENTINEL, 'overlay-layer');
    overlayLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:0;';
    root.appendChild(overlayLayer);

    document.documentElement.appendChild(host);

    return {
        host,
        root,
        overlayLayer,
        destroy() {
            host.remove();
        },
    };
}