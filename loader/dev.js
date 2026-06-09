/**
 * a11y-torch — dev loader.
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
  s.src = 'http://localhost:5174/dist/a11y-torch.dev.js?t=' + Date.now();
  s.setAttribute('data-a11y-torch', '');
  s.onload = function () {
    if (window[NS]) window[NS].open();
  };
  (document.head || document.documentElement).appendChild(s);
})();
