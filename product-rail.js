/* Photo-family browsing. Existing home/controller owns selection; this owns only the rail/picker. */
(() => {
  'use strict';
  document.querySelectorAll('[data-category-browser]').forEach(browser => {
    const rail = browser.querySelector('.category-photo-rail');
    const links = [...rail.querySelectorAll('[data-category-link]')];
    const trigger = browser.querySelector('[data-category-open]');
    const heading = browser.querySelector('.category-rail-heading');
    const picker = browser.querySelector('.category-picker');
    const picks = [...picker.querySelectorAll('[data-category-pick]')];
    const close = picker.querySelector('[data-category-close]');
    const status = browser.querySelector('[data-category-status]');
    const native = typeof picker.showPopover === 'function';
    let opened = false, previous = '';
    const selected = () => links.find(link => link.getAttribute('aria-selected') === 'true');
    const narrow = matchMedia('(max-width:600px)');
    const home = rail.classList.contains('group-tabs');

    function revealLink(link) {
      if (!link) return;
      const box = link.getBoundingClientRect(), bounds = rail.getBoundingClientRect();
      if (box.left < bounds.left) rail.scrollLeft -= bounds.left - box.left;
      else if (box.right > bounds.right) rail.scrollLeft += box.right - bounds.right;
    }
    function position() {
      if (!opened) return;
      const safe = 12, gap = 8, rect = trigger.getBoundingClientRect();
      picker.style.removeProperty('top');
      picker.style.removeProperty('bottom');
      if (narrow.matches) {
        picker.style.left = safe + 'px';
        picker.style.bottom = 'max(12px, env(safe-area-inset-bottom))';
      } else {
        const width = picker.offsetWidth, height = picker.offsetHeight;
        picker.style.left = Math.max(safe, Math.min(innerWidth - width - safe, rect.right - width)) + 'px';
        const below = rect.bottom + gap;
        picker.style.top = (below + height <= innerHeight - safe ? below : Math.max(safe, rect.top - height - gap)) + 'px';
      }
    }
    function setOpen(value, restore = false) {
      if (opened === value) return;
      opened = value;
      trigger.setAttribute('aria-expanded', String(value));
      if (value) {
        picker.hidden = false;
        if (native) picker.showPopover();
        else picker.setAttribute('data-picker-open', '');
        position();
        (picks.find(pick => pick.getAttribute('aria-current') === 'true') || picks[0]).focus({preventScroll:true});
      } else {
        if (native && picker.matches(':popover-open')) picker.hidePopover();
        picker.removeAttribute('data-picker-open');
        picker.hidden = true;
        if (restore) trigger.focus({preventScroll:true});
      }
    }
    // One layout read on resize/font changes; no scroll listener or polling.
    function updateAvailability() {
      if (!rail.clientWidth) return;
      const fits = rail.scrollWidth <= rail.clientWidth + 1;
      const restore = fits && (document.activeElement === trigger || picker.contains(document.activeElement));
      if (fits && opened) setOpen(false);
      heading.hidden = fits;
      browser.toggleAttribute('data-category-fits', fits);
      if (restore) (selected() || links[0]).focus({preventScroll:true});
    }
    function sync() {
      const active = selected();
      if (!active) return;
      const slug = active.dataset.categoryLink;
      picks.forEach(pick => {
        if (pick.dataset.categoryPick === slug) pick.setAttribute('aria-current', 'true');
        else pick.removeAttribute('aria-current');
      });
      if (home) {
        const panel = document.getElementById(active.getAttribute('aria-controls'));
        const details = panel && [...panel.querySelectorAll('.product-disclosure')];
        // Keep any previously chosen variant. First selection needs no extra disclosure click.
        if (details?.length && !details.some(detail => detail.open)) details[0].open = true;
      }
      if (slug !== previous) {
        revealLink(active);
        if (previous) status.textContent = active.textContent.trim().replace(/\s+/g, ' ');
        previous = slug;
      }
    }
    if (!native) picker.removeAttribute('popover');
    trigger.hidden = false;
    browser.setAttribute('data-category-ready', '');
    trigger.addEventListener('click', () => setOpen(!opened));
    close.addEventListener('click', () => setOpen(false, true));
    picks.forEach(pick => pick.addEventListener('click', () => {
      const link = links.find(item => item.dataset.categoryLink === pick.dataset.categoryPick);
      setOpen(false);
      link.click();
      link.focus({preventScroll:true});
      revealLink(link);
    }));
    picker.addEventListener('toggle', event => {
      if (event.newState === 'closed' && opened) setOpen(false, true);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && opened) { event.preventDefault(); setOpen(false, true); }
    });
    document.addEventListener('pointerdown', event => {
      if (opened && !picker.contains(event.target) && !trigger.contains(event.target)) setOpen(false);
    });
    picker.addEventListener('keydown', event => {
      const index = picks.indexOf(document.activeElement);
      if (index < 0) return;
      const next = event.key === 'ArrowDown' ? (index + 1) % picks.length : event.key === 'ArrowUp' ? (index + picks.length - 1) % picks.length : event.key === 'Home' ? 0 : event.key === 'End' ? picks.length - 1 : null;
      if (next !== null) { event.preventDefault(); picks[next].focus({preventScroll:true}); }
    });
    rail.addEventListener('focusin', event => revealLink(event.target.closest('[data-category-link]')));
    new MutationObserver(sync).observe(rail, {subtree:true, attributes:true, attributeFilter:['aria-selected']});
    addEventListener('resize', () => { updateAvailability(); position(); revealLink(selected()); }, {passive:true});
    addEventListener('scroll', () => { if (opened && !narrow.matches) setOpen(false); }, {passive:true});
    addEventListener('pageshow', () => { sync(); updateAvailability(); });
    document.fonts?.ready.then(() => { updateAvailability(); revealLink(selected()); });
    document.fonts?.addEventListener?.('loadingdone', updateAvailability);
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(updateAvailability);
      observer.observe(rail);
      if (links.length) observer.observe(links[links.length - 1]);
    }
    sync();
    updateAvailability();
  });
})();
