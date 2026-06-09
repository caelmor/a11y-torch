/**
 * a11y-torch — production loader.
 * If the bundle is already loaded on the page, just toggle it (no re-fetch).
 */

(function () {
  const NS = '__a11yTorch';
  if (window[NS]) {
    window[NS].toggle();
    return;
  }

  const s = document.createElement('script');
  s.src = 'https://gist.githack.com/caelmor/aede662d649e6c24b3f8faa8b76018c0/raw/9bb7fb094bf5641918e83fb64abbfd116eed6c10/a11y-torch.min.js';
  s.setAttribute('data-a11y-torch', '');
  s.onload = function () {
    if (window[NS]) window[NS].open();
  };
  (document.head || document.documentElement).appendChild(s);
})();
