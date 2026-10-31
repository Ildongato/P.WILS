/* All twelve products stay visible. Native category links and legacy deep links. */
(() => {
  'use strict';
  const guide = document.querySelector('[data-product-guide]');
  if (!guide || !guide.closest('.pg-complete')) return;
  const rows = [...guide.querySelectorAll('[data-product-row]')];
  const families = [...guide.querySelectorAll('[data-product-family]')];
  const links = [...guide.querySelectorAll('[data-family-link]')];
  let interacted = false;
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(type => addEventListener(type, () => { interacted = true; }, { once: true, passive: true }));
  function clearLegacySearch() {
    const url = new URL(location.href);
    if (!url.searchParams.has('zoeken')) return;
    url.searchParams.delete('zoeken');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  function applyHash({ scroll = false } = {}) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (id.startsWith('snit-')) id = 'product-' + id.slice(5);
    if (['assortiment', 'gids'].includes(id)) id = 'productgids';
    if (['mogelijkheden', 'uitvoering'].includes(id)) id = 'maatwerk';
    if (id === 'vraag') id = 'aanvraag';
    const target = document.getElementById(id);
    const row = target?.matches('[data-product-row]') ? target : null;
    rows.forEach(item => item.classList.toggle('is-current', item === row));
    const group = row?.closest('[data-product-family]')?.id || (families.some(item => item.id === id) ? id : null);
    links.forEach(link => {
      if (link.dataset.familyLink === group) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (scroll && target) target.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function restore() { clearLegacySearch(); applyHash(); }
  addEventListener('popstate', restore);
  addEventListener('hashchange', () => applyHash());
  addEventListener('pageshow', restore);
  restore();
  const incomingHash = location.hash;
  Promise.resolve(document.fonts?.ready).then(() => requestAnimationFrame(() => {
    if (!interacted && location.hash === incomingHash) applyHash({ scroll: true });
  }));
})();
