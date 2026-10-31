(() => {
  'use strict';
  const guide = document.querySelector('[data-product-guide]');
  document.querySelectorAll('[data-print-product]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => window.print());
  });
  if (!guide) return;
  const search = guide.querySelector('#product-search');
  const rows = [...guide.querySelectorAll('[data-product-row]')];
  const families = [...guide.querySelectorAll('[data-product-family]')];
  const familyLinks = [...guide.querySelectorAll('[data-family-link]')];
  const status = guide.querySelector('#search-status');
  const empty = guide.querySelector('#search-empty');
  const photo = guide.querySelector('[data-guide-photo]');
  const photoFigure = guide.querySelector('.pg-photo');
  const captionName = guide.querySelector('[data-guide-photo-name]');
  const captionCode = guide.querySelector('[data-guide-photo-code]');
  const photoLink = guide.querySelector('[data-guide-photo-link]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  guide.querySelector('[data-search-control]').hidden = false;
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('nl').replace(/\s+/g, ' ').trim();
  let imageRequest = 0;
  let photoAnimation;
  let currentPhoto = photo?.dataset.slug;
  let opened = null;
  let interacted = false;
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(type => addEventListener(type, () => { interacted = true; }, { once: true, passive: true }));

  async function showPhoto(row) {
    const request = ++imageRequest;
    if (!photo || !row || currentPhoto === row.dataset.slug) return;
    const probe = new Image();
    probe.srcset = row.dataset.srcset;
    probe.sizes = '(max-width:1100px) 30vw, 384px';
    const loaded = new Promise((resolve, reject) => { probe.onload = resolve; probe.onerror = reject; });
    probe.src = row.dataset.image;
    try {
      await loaded;
      if (probe.decode) await probe.decode().catch(() => {});
      if (request !== imageRequest) return;
      photoAnimation?.cancel();
      photo.srcset = row.dataset.srcset;
      photo.src = row.dataset.image;
      photo.alt = row.dataset.fullName;
      photo.dataset.slug = row.dataset.slug;
      captionName.textContent = row.dataset.name;
      captionCode.textContent = `Artikelcode${row.dataset.code.includes('/') ? 's' : ''}: ${row.dataset.code}`;
      photoLink.href = `#${row.id}`;
      photoLink.setAttribute('aria-label', `Specificaties van ${row.dataset.name}`);
      currentPhoto = row.dataset.slug;
      if (!reduced.matches && photo.animate) photoAnimation = photo.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
    } catch {
      // Keep the previous photograph and its matching caption together on failure.
    }
  }

  function updateHash(row) {
    const hash = row ? `#${row.id}` : '#productgids';
    if (location.hash !== hash) history.pushState(null, '', hash);
  }

  rows.forEach(row => row.addEventListener('toggle', () => {
    if (!row.open) {
      if (opened === row) {
        opened = null;
        if (location.hash === `#${row.id}`) history.replaceState(null, '', '#productgids');
      }
      return;
    }
    opened = row;
    rows.forEach(other => { if (other !== row) other.open = false; });
    showPhoto(row);
    updateHash(row);
  }));

  function filter() {
    const words = normalize(search.value).split(' ').filter(Boolean);
    let count = 0;
    rows.forEach(row => {
      row.hidden = !words.every(word => normalize(row.dataset.search).includes(word));
      if (!row.hidden) count += 1;
      else row.open = false;
    });
    families.forEach(family => {
      family.hidden = !rows.some(row => row.closest('[data-product-family]') === family && !row.hidden);
    });
    familyLinks.forEach(link => { link.hidden = document.getElementById(link.dataset.familyLink).hidden; });
    empty.hidden = count !== 0;
    if(photoFigure)photoFigure.hidden=count===0;
    status.hidden = words.length === 0;
    status.textContent = `${count} ${count === 1 ? 'product gevonden' : 'producten gevonden'}`;
    const visible = rows.find(row => !row.hidden && row.open) || rows.find(row => !row.hidden);
    if (visible) showPhoto(visible);
  }

  search.addEventListener('input', filter);
  guide.querySelector('#reset-search').addEventListener('click', () => {
    search.value = '';
    filter();
    search.focus();
  });

  function applyHash({ scroll = false } = {}) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const row = rows.find(item => item.id === id);
    if (!row) {
      if (id === 'productgids') { opened = null; rows.forEach(item => { item.open = false; }); }
      return;
    }
    if (row.hidden) { search.value = ''; filter(); }
    rows.forEach(item => { item.open = item === row; });
    opened = row;
    showPhoto(row);
    if (scroll) row.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  addEventListener('hashchange', () => applyHash());
  addEventListener('popstate', () => applyHash());
  photoLink?.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const row = rows.find(item => `#${item.id}` === photoLink.hash);
    if (!row) return;
    event.preventDefault();
    if (row.hidden) { search.value = ''; filter(); }
    row.open = true;
    updateHash(row);
    row.querySelector('summary').focus({ preventScroll: true });
  });
  guide.setAttribute('data-enhanced','true');
  applyHash();
  const initialHash = location.hash;
  Promise.resolve(document.fonts?.ready).then(() => requestAnimationFrame(() => {
    if (!interacted && location.hash === initialHash) applyHash({ scroll: true });
  }));
  addEventListener('pageshow', () => { filter(); applyHash(); });
  reduced.addEventListener('change', () => { if (reduced.matches) photoAnimation?.finish(); });
})();
