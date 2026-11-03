/* One selected product family; all original records remain in HTML and in print. */
(() => {
  'use strict';
  const guide = document.querySelector('[data-product-guide]');
  if (!guide || !guide.closest('.pg-complete')) return;
  const rows = [...guide.querySelectorAll('[data-product-row]')];
  const families = [...guide.querySelectorAll('[data-product-family]')];
  const links = [...guide.querySelectorAll('[data-family-link]')];
  const rail = guide.querySelector('.category-photo-rail');
  if (!rail) return;
  let interacted = false;
  ['pointerdown','keydown','wheel','touchstart'].forEach(type => addEventListener(type, () => {interacted = true;}, {once:true, passive:true}));
  rail.setAttribute('role', 'tablist');
  links.forEach(link => {
    link.setAttribute('role', 'tab');
    link.setAttribute('aria-controls', link.dataset.familyLink);
  });
  families.forEach(family => {
    family.setAttribute('role', 'tabpanel');
    family.setAttribute('aria-labelledby', 'family-tab-' + family.id);
    // The visible record's inquiry link is the next useful tab stop.
    // Structural hash/focus targets must never draw a panel-sized outline.
    family.tabIndex = -1;
    family.classList.toggle('category-single', family.querySelectorAll('[data-product-row]').length === 1);
  });
  guide.setAttribute('data-family-browsing', '');
  let current = families[0].id;
  function select(slug, write = false) {
    if (!families.some(family => family.id === slug)) return;
    current = slug;
    families.forEach(family => { family.hidden = family.id !== slug; });
    links.forEach(link => {
      const active = link.dataset.familyLink === slug;
      link.setAttribute('aria-selected', String(active));
      link.tabIndex = active ? 0 : -1;
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (write && location.hash !== '#' + slug) history.pushState(history.state, '', '#' + slug);
  }
  function applyHash({scroll = false} = {}) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (id.startsWith('productgroep-')) id = id.slice(13);
    id = ({'snuiten-en-oren':'snuiten','zwoerd-en-kin':'zwoerd','assortiment':'productgids','gids':'productgids','mogelijkheden':'maatwerk','uitvoering':'maatwerk','vraag':'aanvraag'})[id] || id;
    if (id.startsWith('snit-')) id = 'product-' + id.slice(5);
    const target = document.getElementById(id);
    const row = target?.matches('[data-product-row]') ? target : null;
    rows.forEach(item => item.classList.toggle('is-current', item === row));
    const group = row?.closest('[data-product-family]')?.id || target?.closest('[data-product-family]')?.id;
    select(group || current);
    if (scroll && target) target.scrollIntoView({block:'start', behavior:'instant'});
  }
  function restore() {
    const url = new URL(location.href);
    if (url.searchParams.has('zoeken')) {
      url.searchParams.delete('zoeken');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
    applyHash();
  }
  links.forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      rows.forEach(row => row.classList.remove('is-current'));
      select(link.dataset.familyLink, true);
    });
    link.addEventListener('keydown', event => {
      const index = links.indexOf(link);
      const next = event.key === 'ArrowRight' ? (index + 1) % links.length : event.key === 'ArrowLeft' ? (index + links.length - 1) % links.length : event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 : null;
      if (event.key === ' ') {event.preventDefault(); link.click();}
      else if (next !== null) {
        event.preventDefault();
        links.forEach((item, i) => {item.tabIndex = i === next ? 0 : -1;});
        links[next].focus({preventScroll:true});
      }
    });
  });
  addEventListener('popstate', restore);
  addEventListener('hashchange', () => applyHash());
  addEventListener('pageshow', restore);
  restore();
  const incomingHash = location.hash;
  Promise.resolve(document.fonts?.ready).then(() => requestAnimationFrame(() => {
    if (!interacted && location.hash === incomingHash && incomingHash) applyHash({scroll:true});
  }));
})();
