/* A language change is native navigation to the equivalent content. */
(() => {
  'use strict';

  const control = document.querySelector('[data-language-switch]');
  if (!control) return;

  const trigger = control.querySelector('summary');
  const links = [...document.querySelectorAll('[data-switch-language]')];
  const form = document.querySelector('#request-form');
  const status = document.querySelector('#language-switch-status');
  const english = document.documentElement.lang === 'en';
  const draftKey = 'wils:language-draft';
  const contextKeys = ['product', 'document', 'onderwerp', 'afdeling'];
  const controls = form ? [...form.querySelectorAll('input[name], textarea[name], select[name]')] : [];
  let statusTimer;

  function hashTarget(hash) {
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  function visibleSection() {
    const marker = (document.querySelector('.site-header')?.offsetHeight || 0) + 64;
    const sections = [...document.querySelectorAll('main > section[id], .support-section[id]')];
    return sections.find(section => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= marker && bounds.bottom > marker;
    });
  }

  function readingPosition() {
    if (scrollY < 12 && (!location.hash || location.hash === '#top' || location.hash === '#intro')) {
      return location.hash;
    }
    const current = document.querySelector('[data-page-chapters] a[aria-current="location"]');
    const section = current ? hashTarget(current.hash) : visibleSection();
    const exact = hashTarget(location.hash);
    if (section?.id === 'geschiedenis' && document.querySelector('.intro-scene')) {
      const year = section.querySelector('.history-tab:is([aria-current="location"], [aria-selected="true"])');
      if (year) return year.hash;
    }
    if (section && (section === exact || section.contains(exact))) return location.hash;

    const alias = exact && !exact.getClientRects().length;
    if (alias && !section && location.hash) return location.hash;
    if (!section) return exact ? location.hash : '';

    const currentItem = section.querySelector([
      '[data-family-link][aria-selected="true"]',
      '[data-group-tab][aria-selected="true"]',
      '.company-event.is-current .company-event-year'
    ].join(', '));
    return currentItem?.hash || '#' + section.id;
  }

  function destination(link) {
    const target = new URL(link.getAttribute('href'), location.href);
    const current = new URLSearchParams(location.search);
    for (const key of contextKeys) {
      for (const value of current.getAll(key)) target.searchParams.append(key, value);
    }
    target.hash = readingPosition() || target.hash;
    return target;
  }

  function collectDraft() {
    const fields = Object.fromEntries(controls.map(field => [
      field.id, field.type === 'checkbox' ? field.checked : field.value
    ]));
    const changed = controls.some(field => {
      if (field.type === 'checkbox') return field.checked !== field.defaultChecked;
      if (field.tagName === 'SELECT') return field.selectedIndex !== Math.max(0, [...field.options].findIndex(option => option.defaultSelected));
      return field.value !== field.defaultValue;
    });
    if (!changed) return null;
    const opened = [...form.querySelectorAll('details[id][open]')].map(node => node.id);
    return { fields, opened };
  }

  function restoreDraft() {
    try {
      const stored = sessionStorage.getItem(draftKey);
      if (!stored) return;
      const draft = JSON.parse(stored);
      sessionStorage.removeItem(draftKey);
      if (!form || draft.target !== location.href || Date.now() - draft.created > 60_000) return;
      for (const field of controls) {
        const value = draft.fields?.[field.id];
        if (field.type === 'checkbox' && typeof value === 'boolean') field.checked = value;
        else if (typeof value === 'string') field.value = value;
      }
      form.querySelector('#request-department')?.dispatchEvent(new Event('change', { bubbles: true }));
      for (const node of form.querySelectorAll('details[id]')) {
        if (draft.opened?.includes(node.id)) node.open = true;
      }
    } catch {
      // The regular form remains usable if session storage is unavailable.
    }
  }

  function close(restoreFocus = false) {
    if (!control.open) return;
    control.open = false;
    if (restoreFocus) trigger.focus({ preventScroll: true });
  }

  function showStorageMessage() {
    clearTimeout(statusTimer);
    status.textContent = english
      ? 'Copy your enquiry before switching language. Your browser could not carry over the form.'
      : 'Kopieer je vraag vóór je van taal wisselt. Je browser kon het formulier niet meenemen.';
    statusTimer = setTimeout(() => { status.textContent = ''; }, 8500);
  }

  for (const link of links) {
    const original = link.getAttribute('href');
    const refresh = () => {
      link.setAttribute('href', original);
      link.href = destination(link);
    };
    link.addEventListener('pointerdown', refresh);
    link.addEventListener('focus', refresh);
    link.addEventListener('click', event => {
      refresh();
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const draft = collectDraft();
      if (draft) {
        try {
          sessionStorage.setItem(draftKey, JSON.stringify({ ...draft, target: link.href, created: Date.now() }));
        } catch {
          event.preventDefault();
          showStorageMessage();
          return;
        }
      }
      close();
    });
  }
  control.addEventListener('toggle', () => {
    if (!control.open) control.querySelector('.language-documents').open = false;
  });
  document.addEventListener('pointerdown', event => {
    if (!control.contains(event.target)) close();
  });
  document.addEventListener('focusin', event => {
    if (!control.contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && control.open) close(true);
  });
  matchMedia('(max-width: 1100px)').addEventListener('change', () => close());
  addEventListener('wils:page-snapshot', () => close());
  addEventListener('pageshow', () => close());
  restoreDraft();
})();
