/* V107. Native news disclosures; exact story fragments reveal before alignment.
   No page router, document fetching, global scroll owner or stored user input. */
(() => {
  'use strict';
  const register = document.querySelector('[data-company-news]');
  if (!register) return;
  const items = [...register.querySelectorAll('details.company-news-item[id]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let firstArrival = true, frame = 0, epoch = 0;
  const initialHash = location.hash;
  function story(hash = location.hash) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return null; }
    return items.find(item => item.id === id) || null;
  }
  function open(item) {
    if (!item) return;
    item.setAttribute('data-news-jump', '');
    item.open = true;
    item.getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => item.removeAttribute('data-news-jump')));
  }
  function align(item, { smooth = false, focus = false } = {}) {
    const summary = item?.querySelector('summary');
    if (!summary) return;
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
    const chapters = document.querySelector('.page-chapters')?.getBoundingClientRect().height || 0;
    const top = Math.max(0, scrollY + summary.getBoundingClientRect().top - header - chapters - 16);
    if (focus) summary.focus({ preventScroll: true });
    scrollTo({ top, behavior: smooth && !reduced.matches ? 'smooth' : 'instant' });
  }
  function reveal({ smooth = false, focus = false, position = true } = {}) {
    const item = story();
    if (!item) return;
    epoch++;
    const token = epoch;
    open(item);
    if (frame) cancelAnimationFrame(frame);
    if (position) frame = requestAnimationFrame(() => {
      frame = 0;
      if (token === epoch && item === story()) align(item, { smooth, focus });
    });
  }
  function confirmArrival() {
    if (firstArrival && location.hash === initialHash) reveal();
  }
  function userInteracted(event) {
    if (event.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) return;
    firstArrival = false;
  }
  for (const event of ['wheel', 'touchstart', 'pointerdown', 'keydown']) addEventListener(event, userInteracted, { passive: true });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    let url;
    try { url = new URL(link.href, location.href); } catch { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || !story(url.hash)) return;
    event.preventDefault();
    firstArrival = false;
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
    reveal({ smooth: true, focus: true });
  });
  addEventListener('hashchange', () => { firstArrival = false; reveal(); });
  addEventListener('popstate', () => { firstArrival = false; reveal(); });
  addEventListener('pageshow', event => { if (event.persisted) reveal({ position: false }); });
  addEventListener('load', confirmArrival, { once: true });
  document.fonts?.ready.then(confirmArrival);
  addEventListener('wils:page-arrival', confirmArrival);
  reveal();
  setTimeout(() => { firstArrival = false; }, 2000);
})();
