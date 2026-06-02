/**
 * a11y-torch — dev loader.
 *
 * Always fetches a FRESH bundle from the local dev server so you can iterate
 * without re-dragging the bookmark: tears down any existing instance, removes
 * prior injected scripts, and reloads with a cache-busting timestamp.
 *
 * No edits needed. Requires `npm run dev` running, and you must click this on a
 * page served from the same localhost origin (open the playground). Same-origin
 * http -> http means no mixed-content or Private Network Access issues.
 *
 * Run `npm run make:install` after editing to regenerate install.html.
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
  s.src = 'http://localhost:5174/dist/a11y-torch.min.js?t=' + Date.now();
  s.setAttribute('data-a11y-torch', '');
  s.onload = function () {
    if (window[NS]) window[NS].open();
  };
  (document.head || document.documentElement).appendChild(s);
})();
