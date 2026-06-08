/**
 * a11y-torch — production loader.
 *
 * If the bundle is already loaded on the page, just toggle it (no re-fetch).
 * Otherwise inject the pinned, immutable bundle from jsDelivr and open it.
 *
 * EDIT BEFORE USE:
 *   - USER  -> your GitHub username
 *   - @v0.1.0 -> the release tag you want to pin to
 * Then run `npm run make:install` to regenerate install.html.
 */
(function () {
  const NS = '__a11yTorch';
  if (window[NS]) {
    window[NS].toggle();
    return;
  }

  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/caelmor/a11y-torch@v0.1.1/dist/a11y-torch.min.js';
  s.setAttribute('data-a11y-torch', '');
  s.onload = function () {
    if (window[NS]) window[NS].open();
  };
  (document.head || document.documentElement).appendChild(s);
})();
