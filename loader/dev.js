/**
 * a11y-torch — dev loader.
 *
 * Always fetches a FRESH bundle so you can iterate without re-dragging the
 * bookmark: tears down any existing instance, removes prior injected scripts,
 * and reloads from GitHub Pages with a cache-busting timestamp.
 *
 * Dev loop: edit src -> `npm run dev` (rebuild) -> commit & push -> click this.
 *
 * EDIT BEFORE USE:
 *   - USER -> your GitHub username
 * Requires GitHub Pages enabled on the repo (Settings -> Pages -> main, root).
 * Then run `npm run make:install` to regenerate install.html.
 */
(function () {
  const NS = '__a11yTorch';
  if (window[NS] && window[NS].destroy) {
    try {
      window[NS].destroy();
    } catch (e) {}
  }
  document.querySelectorAll('script[data-a11y-torch]').forEach(function (n) {
    n.remove();
  });

  try {
    delete window[NS];
  } catch (e) {
    window[NS] = undefined;
  }

  const s = document.createElement('script');
  s.src = 'https://USER.github.io/a11y-torch/dist/a11y-torch.min.js?t=' + Date.now();
  //              ^^^^  <- your GitHub username

  s.setAttribute('data-a11y-torch', '');
  s.onload = function () {
    if (window[NS]) window[NS].open();
  };
  (document.head || document.documentElement).appendChild(s);
})();
