/* Approved silver passage, once after the existing home entrance is ready. */
(() => {
  'use strict';
  const root = document.documentElement;
  const text = document.querySelector('.hero-anniversary');
  const light = document.querySelector('.hero-anniversary-light');
  const header = document.querySelector('.site-header');
  if (!text || !light || light.dataset.shineController) return;
  light.dataset.shineController = '148';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !light.animate || !window.IntersectionObserver ||
      !(CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text'))) return;

  let timer = 0, run = null, visible = false, fontsReady = false, done = false;
  function clearPending() { clearTimeout(timer); timer = 0; }
  function finish() {
    if (done) return;
    done = true;
    clearPending();
    run?.cancel(); run = null;
    light.style.removeProperty('visibility');
    intersection.disconnect(); state.disconnect();
    removeEventListener('scroll', sync);
    removeEventListener('pagehide', finish);
    document.removeEventListener('visibilitychange', sync);
    reduced.removeEventListener('change', onPreference);
  }
  function canShow() {
    return fontsReady && visible && !document.hidden && !reduced.matches && scrollY <= 56 &&
      root.dataset.entryState === 'ready' && !root.hasAttribute('data-wils-transition') &&
      !root.classList.contains('entry-pending') && !root.classList.contains('entry-entering') &&
      !header?.classList.contains('menu-open');
  }
  function play() {
    timer = 0;
    if (done || !canShow()) return;
    try {
      light.style.visibility = 'visible';
      run = light.animate([
        { backgroundPosition: '100% 50%' },
        { backgroundPosition: '0% 50%' }
      ], { duration: 2400, easing: 'cubic-bezier(.33,0,.3,1)', iterations: 1 });
      run.finished.then(finish).catch(() => {});
    } catch { finish(); }
  }
  function sync() {
    if (done) return;
    if (!canShow()) {
      clearPending();
      if (run) finish();
      return;
    }
    if (!run && !timer) timer = setTimeout(play, 350);
  }
  function onPreference() { if (reduced.matches) finish(); }
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .75;
    sync();
  }, { threshold: [0, .75] });
  const state = new MutationObserver(sync);
  state.observe(root, { attributes: true, attributeFilter: ['data-entry-state', 'data-wils-transition', 'class'] });
  if (header) state.observe(header, { attributes: true, attributeFilter: ['class'] });
  intersection.observe(text);
  addEventListener('scroll', sync, { passive: true });
  addEventListener('pagehide', finish);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', onPreference);
  Promise.resolve(document.fonts?.ready).then(() => { fontsReady = true; sync(); });
})();
