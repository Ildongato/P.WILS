/* P.WILS / Industrial precision. Semantic content first; one scroll owner. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motions = new Set();
  let interacted = false;
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(type => addEventListener(type, () => { interacted = true; }, { once: true, passive: true }));
  const animate = (el, frames, options) => {
    if (reduced.matches || !el.animate) return null;
    const a = el.animate(frames, options);
    motions.add(a);
    a.finished.catch(() => {}).finally(() => motions.delete(a));
    return a;
  };
  let finishRevealsWithin = () => {};
  let finishPassedReveals = () => {};
  let requestLayout = () => {};
  const refresh = () => window.ScrollTrigger?.refresh();
  const pushHash = hash => { if (location.hash !== hash) history.pushState(null, '', hash); };
  // A single media surface survives entry, choice, scrolling and language return.
  const gate = $('.entry-gate');
  const headerNode = $('.site-header');
  const heroContent = $('.hero-content');
  const scrollCue = $('.hero-scroll');
  let cueHint = null, cueHintTimer = 0, cueHintPlayed = false;
  let cueProgress = '', cueAway = null;
  function stopCueHint() {
    clearTimeout(cueHintTimer); cueHintTimer = 0;
    cueHint?.cancel(); cueHint = null;
  }
  function syncScrollCue() {
    const progress = reduced.matches ? 0 : Math.max(0, Math.min(1, (scrollY - 12) / 100));
    const value = (progress * progress * (3 - 2 * progress)).toFixed(4);
    if (value !== cueProgress) {
      scrollCue.style.setProperty('--cue-progress', value);
      cueProgress = value;
    }
    const away = entryState !== 'ready' || (reduced.matches ? scrollY > 56 : progress === 1);
    if (away !== cueAway) {
      scrollCue.classList.toggle('is-scrolled', away);
      scrollCue.inert = away;
      cueAway = away;
    }
    if (away || scrollY > 4) stopCueHint();
  }
  function inviteScroll() {
    syncScrollCue();
    if (cueHintPlayed || reduced.matches || scrollY > 4 || document.hidden) return;
    cueHintPlayed = true;
    cueHintTimer = setTimeout(() => {
      cueHintTimer = 0;
      if (entryState !== 'ready' || scrollY > 4 || reduced.matches || document.hidden) return;
      cueHint = animate($('.hero-scroll-chevron'), [
        { transform: 'translate3d(0,0,0)', offset: 0 },
        { transform: 'translate3d(0,4px,0)', offset: .30 },
        { transform: 'translate3d(0,0,0)', offset: .62 },
        { transform: 'translate3d(0,0,0)', offset: 1 }
      ], { duration: 1100, iterations: 2, easing: 'cubic-bezier(.22,1,.36,1)' });
      cueHint?.finished.catch(() => {}).finally(() => { cueHint = null; });
    }, 400);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCueHint(); });
  addEventListener('pageshow', event => { if (event.persisted) { stopCueHint(); syncScrollCue(); } });
  reduced.addEventListener('change', () => { stopCueHint(); syncScrollCue(); });
  const film = $('.hero-film');
  const languageReturns = $$('[data-language-return]');
  const homeRegions = [headerNode, heroContent, $('.skip-link'), ...$$('main > section:not(.intro-scene)')].filter(Boolean);
  let entryState = root.classList.contains('entry-pending') ? 'entry' : 'ready';
  let entryMotion;
  let entrySerial = 0, entryWatchdog = 0, entryReturnCover = null, entryReturnFocus = false;
  let mediaVisible = true;
  root.dataset.entryController = 'active';
  // The opaque product surface decides when the header needs a filled background.
  // It stays on one geometry, including while scrolling back into the hero.
  let headerFrame = 0, heroCovered = false;
  function syncHeaderSurface() {
    const surface = $('#producten').getBoundingClientRect();
    const covered = surface.top <= headerNode.offsetHeight + 1;
    headerNode.classList.toggle('is-filled', covered);
    syncScrollCue();
    if (covered !== heroCovered) { heroCovered = covered; syncMedia(); }
  }
  function scheduleHeaderSurface() {
    if (headerFrame) return;
    headerFrame = requestAnimationFrame(() => { headerFrame = 0; syncHeaderSurface(); });
  }
  addEventListener('scroll', scheduleHeaderSurface, { passive: true });
  addEventListener('resize', scheduleHeaderSurface, { passive: true });
  window.ScrollTrigger?.addEventListener('refresh', scheduleHeaderSurface);
  function syncMedia() {
    const paused = reduced.matches || document.hidden || !mediaVisible || (entryState === 'ready' && heroCovered);
    root.classList.toggle('media-paused', paused);
    // A still poster is sufficient for reduced motion; defer the MP4 request.
    if (!paused && !film.getAttribute('src') && film.dataset.droneSrc.trim()) {
      film.src = film.dataset.droneSrc.trim();
      film.load();
    }
    if (!film.getAttribute('src')) return;
    if (paused) film.pause();
    else film.play().catch(() => root.classList.remove('has-film'));
  }
  film.addEventListener('playing', () => root.classList.add('has-film'));
  film.addEventListener('error', () => root.classList.remove('has-film'));
  document.addEventListener('visibilitychange', syncMedia);
  const mediaObserver = new IntersectionObserver(entries => {
    mediaVisible = entries[0].isIntersecting; syncMedia();
  }, { threshold: 0 });
  mediaObserver.observe($('.hero-stage'));
  function setHomeAvailable(available) {
    homeRegions.forEach(node => { node.inert = !available; });
  }
  function clearEntryStyles() {
    if (!window.gsap) return;
    gsap.set([gate, $('.entry-choice-panel'), headerNode, heroContent,
      ...$$('.hero-title .line-mask > span'), $('.hero-lead'), $('.hero-description'), $('.hero-action'),
      scrollCue],
    { clearProps: 'transform,opacity,visibility,clipPath' });
    gsap.set([$('.hero-reading-shade'), $('.hero-entry-shade')], { clearProps: 'opacity,transition' });
  }
  function cancelEntryMotion() {
    ++entrySerial;
    clearTimeout(entryWatchdog); entryWatchdog = 0;
    entryMotion?.kill(); entryMotion = null;
    entryReturnCover?.remove(); entryReturnCover = null;
  }
  function settleEntryGate({ focus = false } = {}) {
    cancelEntryMotion(); clearEntryStyles();
    entryState = 'entry'; root.dataset.entryState = 'entry';
    root.classList.remove('entry-entering'); root.classList.add('entry-pending');
    gate.hidden = false; gate.inert = false; setHomeAvailable(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    scheduleHeaderSurface(); syncMedia();
    if (focus && !document.hidden) $('[data-entry-language="nl"]').focus({ preventScroll: true });
  }
  function finishEntry({ focus = false } = {}) {
    cancelEntryMotion();
    entryReturnFocus = false;
    entryState = 'ready'; root.dataset.entryState = 'ready';
    root.classList.remove('entry-pending', 'entry-entering');
    gate.hidden = true; gate.inert = true;
    setHomeAvailable(true); clearEntryStyles();
    if (focus) {
      $('#hero-title').focus({ preventScroll: true });
      // The language gate owns the first viewport. Keep focus handoff from
      // leaving a cropped hero in WebKit or after responsive layout changes.
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    requestLayout();
    scheduleHeaderSurface();
    inviteScroll();
  }
  function openEntry({ write = false, focus = false, motion = false } = {}) {
    stopCueHint();
    if (root.classList.contains('ui-enhanced')) setMenu(false);
    entryReturnFocus = entryReturnFocus || focus;
    if (write && location.hash) history.pushState(null, '', location.pathname + location.search);
    if (entryState === 'returning') return;
    if (!motion || entryState === 'entry' || reduced.matches || document.hidden || !window.gsap) {
      settleEntryGate({ focus: entryReturnFocus }); entryReturnFocus = false; return;
    }
    // At the hero, only the reading layers change over the surviving video.
    // Deeper in the document, obscure the old viewport before the instant jump.
    const fromDeep = scrollY > 56;
    const alpha = node => parseFloat(getComputedStyle(node).opacity) || 0;
    const headerAlpha = alpha(headerNode), contentAlpha = alpha(heroContent);
    const readingShade = $('.hero-reading-shade'), entryShade = $('.hero-entry-shade');
    const readingAlpha = alpha(readingShade), entryAlpha = alpha(entryShade);
    cancelEntryMotion(); clearEntryStyles();
    const token = entrySerial;
    entryState = 'returning'; root.dataset.entryState = 'returning'; setHomeAvailable(false);
    const complete = () => {
      if (token !== entrySerial) return;
      const focusGate = entryReturnFocus; entryReturnFocus = false;
      settleEntryGate({ focus: focusGate });
    };
    const prepare = () => {
      if (token !== entrySerial) return;
      gsap.set([readingShade, entryShade], { transition: 'none' });
      gsap.set(readingShade, { opacity: fromDeep ? 0 : readingAlpha });
      gsap.set(entryShade, { opacity: fromDeep ? 1 : entryAlpha });
      gsap.set(headerNode, { autoAlpha: fromDeep ? 0 : headerAlpha });
      gsap.set(heroContent, { autoAlpha: fromDeep ? 0 : contentAlpha });
      gsap.set(gate, { autoAlpha: 0 });
      root.classList.remove('entry-entering'); root.classList.add('entry-pending');
      gate.hidden = false; gate.inert = true;
      window.scrollTo({ top: 0, behavior: 'instant' });
      scheduleHeaderSurface(); syncMedia();
    };
    try {
      if (fromDeep) {
        entryReturnCover = document.createElement('div');
        entryReturnCover.setAttribute('aria-hidden', 'true');
        entryReturnCover.dataset.entryReturnCover = '';
        Object.assign(entryReturnCover.style, { position: 'fixed', inset: '0', zIndex: '2147483646', background: 'var(--ink, #171717)', opacity: '0', pointerEvents: 'auto' });
        document.body.append(entryReturnCover);
        const cover = entryReturnCover;
        entryMotion = gsap.timeline({ onComplete: complete })
          .to(cover, { opacity: 1, duration: .12, ease: 'power2.out' }, 0)
          .call(prepare, [], .12)
          .to(cover, { opacity: 0, duration: .20, ease: 'power2.out' }, .12)
          .to(gate, { autoAlpha: 1, duration: .20, ease: 'power2.out' }, .12)
          .fromTo($('.entry-choice-panel'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .20, ease: 'power3.out' }, .12);
      } else {
        prepare();
        entryMotion = gsap.timeline({ onComplete: complete })
          .to([headerNode, heroContent], { autoAlpha: 0, duration: .18, ease: 'power2.out' }, 0)
          .to(readingShade, { opacity: 0, duration: .32, ease: 'power2.out' }, 0)
          .to(entryShade, { opacity: 1, duration: .32, ease: 'power2.out' }, 0)
          .to(gate, { autoAlpha: 1, duration: .20, ease: 'power2.out' }, .10)
          .fromTo($('.entry-choice-panel'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .22, ease: 'power3.out' }, .10);
      }
      // Hidden tabs, cancelled frames or a stopped animation never leave a veil.
      entryWatchdog = setTimeout(complete, 520);
    } catch { complete(); }
  }
  function chooseLanguage(event) {
    event.preventDefault();
    if (entryState !== 'entry') return;
    // Both choices intentionally enter the same Dutch document.
    document.documentElement.lang = 'nl';
    history.pushState(null, '', '#intro');
    entryState = 'entering'; root.dataset.entryState = 'entering';
    root.classList.add('entry-entering'); gate.inert = true;
    if (reduced.matches || !window.gsap) { finishEntry({ focus: true }); return; }
    try {
      cancelEntryMotion();
      const token = entrySerial;
      const complete = () => { if (token === entrySerial) finishEntry({ focus: true }); };
      entryMotion = gsap.timeline({ onComplete: complete });
      entryMotion.to($('.entry-choice-panel'), { opacity: 0, y: -6, duration: .18, ease: 'power2.in' }, 0)
        .to(gate, { opacity: 0, duration: .26, ease: 'power2.out' }, .08)
        .fromTo(headerNode, { autoAlpha: 0 }, { autoAlpha: 1, duration: .26, ease: 'power2.out' }, .08)
        .set(heroContent, { opacity: 1, visibility: 'visible' }, .16)
        .fromTo('.hero-title .line-mask > span', { yPercent: 108 }, { yPercent: 0, duration: .56, stagger: .065, ease: 'power3.out' }, .20)
        .fromTo('.hero-description', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .42, ease: 'power3.out' }, .40)
        .fromTo('.hero-action', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .40, ease: 'power3.out' }, .52)
        .fromTo(scrollCue, { opacity: 0 }, { opacity: 1, duration: .36, ease: 'power3.out' }, .64);
      entryWatchdog = setTimeout(complete, 1200);
    } catch { finishEntry({ focus: true }); }
  }
  $$('[data-entry-language]').forEach(link => link.addEventListener('click', chooseLanguage));
  languageReturns.forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openEntry({ write: true, focus: true, motion: true });
  }));
  function routeEntry() {
    if (!location.hash) openEntry({ motion: true });
    else if (entryState !== 'ready') finishEntry();
  }
  addEventListener('popstate', routeEntry);
  addEventListener('hashchange', routeEntry);
  function settleEntryInterruption() {
    if (entryState === 'returning') { const focusGate = entryReturnFocus; entryReturnFocus = false; settleEntryGate({ focus: focusGate }); }
    else if (entryState === 'entering') finishEntry();
  }
  addEventListener('resize', settleEntryInterruption, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) settleEntryInterruption(); });
  addEventListener('pagehide', settleEntryInterruption);
  addEventListener('pageshow', event => { if (event.persisted) { routeEntry(); syncMedia(); } });
  addEventListener('wils:page-arrival', () => {
    if (root.dataset.wilsPageArrival === 'home' && location.hash === '#intro') finishEntry();
  });
  reduced.addEventListener('change', () => { settleEntryInterruption(); syncMedia(); });
  if (entryState === 'entry') openEntry(); else finishEntry();
  syncMedia();
  syncHeaderSurface();

  // The two hero links use native smooth scrolling, not a second scroll engine.
  // Keyboard focus lands in the arriving chapter instead of behind its surface.
  $$('a[href="#producten"]', heroContent).forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = $('#producten'), heading = $('#products-title');
    pushHash('#producten');
    finishRevealsWithin(target);
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
    target.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'instant' : 'smooth' });
  }));

  function imageCrossfade(stage, previous, next) {
    $$('.product-image-stage .transition-image').forEach(node => { node.getAnimations().forEach(a => a.cancel()); node.remove(); });
    if (!previous || reduced.matches || previous.getAttribute('src') === next.getAttribute('src')) return;
    const cover = previous.cloneNode(false);
    cover.className = 'transition-image'; cover.alt = '';
    cover.setAttribute('aria-hidden', 'true'); cover.removeAttribute('data-product-image');
    Object.assign(cover.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' });
    stage.append(cover);
    const reveal = () => {
      if (!cover.isConnected) return;
      const motion = animate(cover, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      if (motion) motion.finished.catch(() => {}).finally(() => cover.remove()); else cover.remove();
    };
    if (next.complete) reveal();
    else { next.addEventListener('load', reveal, { once: true }); next.addEventListener('error', () => cover.remove(), { once: true }); }
  }

  function imageWipe(stage, previous, next, direction = 1) {
    $$('.transition-image', stage).forEach(node => { node.getAnimations().forEach(a => a.cancel()); node.remove(); });
    if (!previous || reduced.matches || previous.getAttribute('src') === next.getAttribute('src')) return;
    const cover = previous.cloneNode(false);
    cover.className = 'transition-image';
    cover.alt = '';
    cover.setAttribute('aria-hidden', 'true');
    cover.removeAttribute('data-product-image');
    Object.assign(cover.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' });
    stage.append(cover);
    const finish = () => {
      if (!cover.isConnected) return;
      const edge = direction > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      const a = animate(cover, [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: edge }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      if (a) a.finished.catch(() => {}).finally(() => cover.remove()); else cover.remove();
    };
    if (next.complete) finish();
    else { next.addEventListener('load', finish, { once: true }); next.addEventListener('error', () => cover.remove(), { once: true }); }
  }

  // Primary actions use a CSS contour and one decorative, uniformly scaled dot.

  const menuButton = $('.menu-toggle');
  const menu = $('.mobile-menu');
  function setMenu(open, focus = false) {
    headerNode.classList.toggle('menu-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Sluit navigatie' : 'Open navigatie');
    $('[data-menu-label]').textContent = open ? 'Sluiten' : 'Menu';
    $('.menu-glyph path').setAttribute('d', open ? 'M5 5l14 14M5 19 19 5' : 'M4 8h16M4 16h16');
    menu.hidden = !open;
    if (open) animate(menu, [{ clipPath: 'inset(0 0 100% 0)', opacity: .6 }, { clipPath: 'inset(0 0 0 0)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' });
    else if (focus) menuButton.focus({ preventScroll: true });
  }
  menuButton.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setMenu(false);
    if (link.matches('[data-menu-language]')) {
      event.preventDefault();
      // Both menu language choices use this Dutch home until translation exists.
      pushHash('#intro');
      $('#hero-title').focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' });
    }
  });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.site-header')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false, true); });
  matchMedia('(min-width:1101px)').addEventListener('change', () => setMenu(false));

  const groupTabs = $$('[data-group-tab]');
  const groups = $$('[data-group-panel]');
  const groupRail = $('.group-tabs');
  groupRail.setAttribute('role', 'tablist');
  groupRail.setAttribute('aria-label', 'Kies een productgroep');
  groupTabs.forEach(tab => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', 'productgroep-' + tab.dataset.groupTab);
  });
  groups.forEach(panel => {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', 'group-tab-' + panel.dataset.groupPanel);
    panel.tabIndex = 0;
  });
  let currentGroup = 'kopvlees';
  function selectGroup(slug, { motion = false, write = false } = {}) {
    const target = groups.find(p => p.dataset.groupPanel === slug);
    if (!target) return;
    const previous = groups.find(p => p.dataset.groupPanel === currentGroup);
    const oldImage = previous && $('[data-product-image]', previous).cloneNode(false);
    const changed = slug !== currentGroup;
    currentGroup = slug;
    groups.forEach(p => { p.hidden = p !== target; });
    groupTabs.forEach(t => { const selected = t.dataset.groupTab === slug; t.setAttribute('aria-selected', String(selected)); t.tabIndex = selected ? 0 : -1; });
    if (changed && motion) finishRevealsWithin(target);
    requestLayout();
    if (changed && motion) imageCrossfade($('.product-image-stage', target), oldImage, $('[data-product-image]', target));
    if (write) pushHash('#productgroep-' + slug);
  }
  groupTabs.forEach(tab => {
    tab.addEventListener('click', e => { e.preventDefault(); selectGroup(tab.dataset.groupTab, { motion: true, write: true }); });
    tab.addEventListener('keydown', e => {
      const i = groupTabs.indexOf(tab);
      let next = i;
      if (e.key === 'ArrowRight') next = (i + 1) % groupTabs.length;
      else if (e.key === 'ArrowLeft') next = (i + groupTabs.length - 1) % groupTabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = groupTabs.length - 1;
      else if (e.key === ' ') { e.preventDefault(); tab.click(); return; }
      else return;
      e.preventDefault();
      groupTabs.forEach(t => { t.tabIndex = t === groupTabs[next] ? 0 : -1; });
      groupTabs[next].focus();
    });
  });
  $$('.product-disclosure').forEach(detail => {
    const summary = $('summary', detail);
    summary.setAttribute('aria-expanded', 'false');
    detail.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', String(detail.open));
      finishRevealsWithin(detail.closest('[data-group-panel]'));
      requestLayout();
      if (!detail.open) return;
      const panel = detail.closest('[data-group-panel]');
      $$('.product-disclosure', panel).forEach(other => { if (other !== detail) other.open = false; });
      const img = $('[data-product-image]', panel);
      const previous = img.cloneNode(false);
      img.src = detail.dataset.image;
      img.alt = detail.dataset.label;
      $('[data-product-caption]', panel).textContent = detail.dataset.label;
      const photoLink = $('[data-product-photo-link]', panel);
      photoLink.setAttribute('href', '#' + detail.id);
      photoLink.setAttribute('aria-label', 'Specificaties van ' + detail.dataset.label);
      imageCrossfade($('.product-image-stage', panel), previous, img);
      animate($('.product-detail', detail), [{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' });
    });
  });
  $$('[data-product-photo-link]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const detail = document.getElementById(link.hash.slice(1));
    if (!detail?.matches('.product-disclosure')) return;
    event.preventDefault();
    detail.open = true;
    pushHash('#' + detail.id);
    finishRevealsWithin(detail.closest('[data-group-panel]'));
    $('summary', detail).focus({ preventScroll: true });
    // On stacked phones the pictured product's data sits below the photograph.
    // Wide layouts keep the visitor's viewport still while the row opens.
    if (matchMedia('(max-width:600px)').matches) {
      detail.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'instant' : 'smooth' });
    }
  }));
  selectGroup('kopvlees');

  const yearTabs = $$('[data-year]');
  const yearPanels = $$('[data-history-panel]');
  const yearRail = $('.history-tabs');
  const historyStage = $('.history-stage');
  const historyChapter = $('.history-chapter');
  const historyInner = $('.history-inner');
  const historyHeading = $('.history-heading');
  const historyMore = $('.text-link', historyHeading);
  historyMore.classList.add('history-more');
  const sharedHistoryVisual = $('.history-visual', yearPanels[0]).cloneNode(true);
  sharedHistoryVisual.classList.add('history-shared-visual');
  sharedHistoryVisual.setAttribute('aria-hidden', 'true');
  $('img', sharedHistoryVisual).alt = '';
  $('img', sharedHistoryVisual).loading = 'eager';
  historyStage.prepend(sharedHistoryVisual);
  // One decorative source pair belongs to the sticky frame, not the moving stage.
  const historyAtmosphere = document.createElement('div');
  historyAtmosphere.className = 'history-atmosphere';
  historyAtmosphere.setAttribute('aria-hidden', 'true');
  const atmosphereLayers = [0, 1].map(() => {
    const layer = document.createElement('div'), image = document.createElement('span');
    layer.className = 'history-atmosphere-layer'; image.className = 'history-atmosphere-image';
    layer.append(image); historyAtmosphere.append(layer); return layer;
  });
  $('.history-chapter > .chapter-frame').prepend(historyAtmosphere);
  let atmosphereIndex = 0, atmosphereSource = '', atmospherePendingSource = '', atmosphereToken = 0;
  function clearHistoryAtmosphere() {
    ++atmosphereToken; atmospherePendingSource = '';
    atmosphereLayers.forEach(layer => layer.getAnimations().forEach(a => a.cancel()));
  }
  function syncHistoryAtmosphere(image, { motion = false } = {}) {
    const src = image.getAttribute('src');
    if (src === atmospherePendingSource) return;
    const token = ++atmosphereToken; atmospherePendingSource = '';
    if (src === atmosphereSource) return;
    atmospherePendingSource = src;
    const apply = () => {
      if (token !== atmosphereToken || image.getAttribute('src') !== src || !image.naturalWidth) return;
      atmosphereLayers.forEach(layer => layer.getAnimations().forEach(a => a.cancel()));
      const previous = atmosphereLayers[atmosphereIndex];
      const incoming = atmosphereLayers[1 - atmosphereIndex];
      $('.history-atmosphere-image', incoming).style.backgroundImage = `url("${src}")`;
      previous.style.opacity = '0'; incoming.style.opacity = '1';
      if (motion && atmosphereSource) {
        const timing = { duration: 550, easing: 'cubic-bezier(.22,1,.36,1)' };
        animate(previous, [{ opacity: 1 }, { opacity: 0 }], timing);
        animate(incoming, [{ opacity: 0 }, { opacity: 1 }], timing);
      }
      atmosphereIndex = 1 - atmosphereIndex; atmosphereSource = src; atmospherePendingSource = '';
    };
    if (image.complete) { apply(); if (!image.naturalWidth) atmospherePendingSource = ''; }
    else {
      image.addEventListener('load', apply, { once: true });
      image.addEventListener('error', () => { if (token === atmosphereToken) atmospherePendingSource = ''; }, { once: true });
    }
  }
  let historyImageToken = 0;
  function clearHistoryMask() {
    $$('.history-image-mask', sharedHistoryVisual).forEach(mask => {
      [mask, ...mask.children].forEach(node => node.getAnimations().forEach(a => a.cancel()));
      mask.remove();
    });
  }
  addEventListener('resize', () => { ++historyImageToken; clearHistoryMask(); });
  function syncHistoryVisual(panel, { motion = false, direction = 1 } = {}) {
    const source = $('.history-visual', panel);
    const next = $('img', source);
    const stage = $('.history-image-stage', sharedHistoryVisual);
    const image = $('img', stage);
    const caption = $('figcaption', sharedHistoryVisual), nextCaption = $('figcaption', source).textContent;
    if (caption.textContent !== nextCaption) caption.textContent = nextCaption;
    // Repeated selection keeps the current photograph and its stable frame.
    if (image.getAttribute('src') === next.getAttribute('src')) { syncHistoryAtmosphere(image); return; }
    const token = ++historyImageToken;
    finishRevealsWithin(sharedHistoryVisual);
    clearHistoryMask();
    const snapshot = stage.cloneNode(true);
    $$('.media-curtain,.media-exposure,.history-image-mask', snapshot).forEach(node => node.remove());
    stage.dataset.historyImage = $('.history-image-stage', source).dataset.historyImage;
    ['width', 'height', 'src'].forEach(name => image.setAttribute(name, next.getAttribute(name)));
    syncHistoryAtmosphere(image, { motion });
    if (!motion || reduced.matches) return;
    const mask = document.createElement('div');
    mask.className = 'history-image-mask'; mask.setAttribute('aria-hidden', 'true');
    mask.append(snapshot); stage.append(mask);
    const reveal = () => {
      if (token !== historyImageToken || !mask.isConnected) return;
      if (!image.naturalWidth) { mask.remove(); return; }
      const distance = direction * 101;
      const options = { duration: compactMode ? 320 : 550, easing: 'cubic-bezier(.65,0,.35,1)' };
      const outer = animate(mask, [{ transform: 'translateX(0)' }, { transform: `translateX(${distance}%)` }], options);
      // Counter-motion keeps the photographed subject stationary behind its mask.
      animate(snapshot, [{ transform: 'translateX(0)' }, { transform: `translateX(${-distance}%)` }], options);
      if (outer) outer.finished.catch(() => {}).finally(() => mask.remove());
      else mask.remove();
    };
    if (image.complete) reveal();
    else {
      image.addEventListener('load', reveal, { once: true });
      image.addEventListener('error', () => { if (token === historyImageToken) mask.remove(); }, { once: true });
    }
  }
  const progressLine = document.createElement('span');
  progressLine.className = 'history-progress';
  progressLine.setAttribute('aria-hidden', 'true');
  yearRail.append(progressLine);
  let currentYear = '1957', storyMode = false, compactMode = false, historyScroll = null;
  const initialHistoryHash = yearPanels.some(panel => '#history-' + panel.dataset.historyPanel === location.hash) ? location.hash : null;
  let historyRouteReady = false;
  let historyRouteFrame = 0, restoringHistoryRoute = false;
  let requestedYearPosition = null;
  yearPanels.forEach(panel => {
    const year = $('.history-year', panel);
    const ink = document.createElement('span');
    ink.className = 'year-ink'; ink.textContent = year.textContent;
    year.replaceChildren(ink);
  });
  // Timeline copy has one owner. Never hide it in the general GSAP reveal
  // context: responsive context reverts can restore an old opacity:0 after a
  // reveal has already been marked complete. Native motion is temporary and
  // always falls back to the readable, untransformed document.
  let historyTextMotion = null;
  // The rail follows actual reading progress, including the distance between
  // stops. Reached stations stay orange until the visitor scrolls back.
  let historyRailGeometry = null, historyRailFrame = 0, historyRailPosition = 0;
  let flowHistoryFrame = 0;
  function paintHistoryRail() {
    if (!historyRailGeometry) {
      const rail = yearRail.getBoundingClientRect();
      if (!rail.width) return;
      historyChapter.style.setProperty('--history-rail-height', rail.height + 'px');
      historyRailGeometry = yearTabs.map(tab => {
        const box = tab.getBoundingClientRect(), dot = getComputedStyle(tab, '::after');
        const border = dot.boxSizing === 'border-box' ? 0 :
          (parseFloat(dot.borderLeftWidth) || 0) + (parseFloat(dot.borderRightWidth) || 0);
        return box.left - rail.left - yearRail.clientLeft + yearRail.scrollLeft +
          (parseFloat(dot.left) || 0) + ((parseFloat(dot.width) || 0) + border) / 2;
      });
    }
    const last = historyRailGeometry.length - 1;
    const position = Math.max(0, Math.min(last, historyRailPosition));
    const lower = Math.floor(position), upper = Math.min(last, lower + 1);
    const start = historyRailGeometry[0];
    const end = historyRailGeometry[lower] +
      (historyRailGeometry[upper] - historyRailGeometry[lower]) * (position - lower);
    progressLine.style.transform = `translate3d(${start.toFixed(3)}px,0,0) scaleX(${(end - start).toFixed(3)})`;
    if (yearRail.dataset.stationYear !== currentYear) yearRail.dataset.stationYear = currentYear;
  }
  function requestHistoryRail() {
    historyRailGeometry = null;
    if (!historyRailFrame) historyRailFrame = requestAnimationFrame(() => {
      historyRailFrame = 0; paintHistoryRail(); requestFlowHistory();
    });
  }
  addEventListener('resize', requestHistoryRail, { passive: true });
  addEventListener('pageshow', requestHistoryRail);
  document.fonts?.ready.then(requestHistoryRail);
  document.fonts?.addEventListener?.('loadingdone', requestHistoryRail);
  if ('ResizeObserver' in window) new ResizeObserver(requestHistoryRail).observe(yearRail);
  function clearHistoryTextMotion() {
    const previous = historyTextMotion;
    historyTextMotion = null;
    previous?.cancel();
  }
  function settleHistoryText(panel) {
    $$('.history-story,.history-entry-heading,.history-copy', panel).forEach(node => {
      ['opacity', 'transform', 'will-change'].forEach(property => node.style.removeProperty(property));
    });
  }
  function settleHistoryTexts() {
    clearHistoryTextMotion();
    yearPanels.forEach(settleHistoryText);
  }
  function enterHistoryText(panel, direction) {
    const transition = animate($('.history-story', panel), [
      { opacity: .65, transform: `translateY(${direction * 6}px)` },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
    historyTextMotion = transition;
    transition?.finished.catch(() => {}).finally(() => {
      // An outgoing promise must never settle or cancel a newer entrance.
      if (historyTextMotion === transition) historyTextMotion = null;
    });
  }
  let historySelectionMode = null;
  function selectYear(year, { motion = false, railPosition = null } = {}) {
    const target = yearPanels.find(p => p.dataset.historyPanel === year);
    if (!target) return;
    const changed = currentYear !== year;
    const mode = storyMode ? 'story' : compactMode ? 'compact' : 'flow';
    const selectedIndex = yearPanels.indexOf(target);
    historyRailPosition = Number.isFinite(railPosition) ? railPosition : selectedIndex;
    // Scroll progress keeps moving between stations. Panel text, image and
    // accessibility state only change at a station or responsive mode change.
    if (!changed && historySelectionMode === mode) { paintHistoryRail(); return; }
    historySelectionMode = mode;
    const direction = Number(year) >= Number(currentYear) ? 1 : -1;
    if (changed || !motion) clearHistoryTextMotion();
    settleHistoryText(target);
    currentYear = year;
    yearTabs.forEach((tab, index) => {
      const selected = tab.dataset.year === year;
      tab.dataset.historyReached = String(index <= selectedIndex);
      if (storyMode || compactMode) {
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        tab.removeAttribute('aria-current');
      } else {
        tab.removeAttribute('aria-selected'); tab.removeAttribute('tabindex');
        if (selected) tab.setAttribute('aria-current', 'location'); else tab.removeAttribute('aria-current');
      }
    });
    paintHistoryRail();
    if (!storyMode && !compactMode) return;
    // Never leave keyboard focus in a panel that is about to become inert.
    if (yearPanels.some(p => p !== target && p.contains(document.activeElement))) {
      yearTabs.find(tab => tab.dataset.year === year)?.focus({ preventScroll: true });
    }
    yearPanels.forEach(p => {
      p.hidden = p !== target; p.inert = p !== target; p.tabIndex = p === target ? 0 : -1;
    });
    if (changed && motion) enterHistoryText(target, direction);
    // Loading and masking a photograph must never gate the selected text.
    syncHistoryVisual(target, { motion: changed && motion, direction });
  }
  function setStoryMode(on) {
    settleHistoryTexts();
    storyMode = on;
    compactMode = false;
    if (!on) { ++historyImageToken; clearHistoryMask(); clearHistoryAtmosphere(); }
    root.classList.toggle('history-scroll', on);
    root.classList.toggle('history-compact', compactMode);
    root.classList.toggle('history-flow', !on);
    historyRailGeometry = null;
    historyHeading.append(historyMore);
    if (on) {
      yearRail.setAttribute('role', 'tablist');
      yearRail.setAttribute('aria-orientation', 'horizontal');
    } else {
      yearRail.removeAttribute('role'); yearRail.removeAttribute('aria-orientation');
    }
    yearTabs.forEach(tab => {
      if (on) {
        tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', 'history-' + tab.dataset.year);
      } else { tab.removeAttribute('role'); tab.removeAttribute('aria-controls'); }
    });
    yearPanels.forEach(panel => {
      if (on) {
        panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', 'history-tab-' + panel.dataset.historyPanel);
      } else {
        panel.removeAttribute('role');
        panel.setAttribute('aria-labelledby', panel.id + '-year ' + panel.id + '-title');
        panel.hidden = false; panel.inert = false; panel.tabIndex = -1;
      }
    });
    selectYear(currentYear);
    requestFlowHistory();
  }
  function updateFlowHistory() {
    if (storyMode || compactMode || restoringHistoryRoute) return;
    const bounds = historyChapter.getBoundingClientRect();
    // Outside the chapter there is no reading progress to compute. In
    // particular, do not measure every future panel throughout the page.
    if (bounds.top >= innerHeight || bounds.bottom <= 0) return;
    const header = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) || 0;
    const stickyTop = parseFloat(getComputedStyle(yearRail).top);
    const readAt = (Number.isFinite(stickyTop) ? stickyTop : header) + yearRail.getBoundingClientRect().height + 24;
    const tops = yearPanels.map(panel => panel.getBoundingClientRect().top);
    let index = 0;
    while (index < tops.length - 1 && tops[index + 1] <= readAt + 1) ++index;
    const distance = index < tops.length - 1 ? tops[index + 1] - tops[index] : 1;
    const fraction = index < tops.length - 1 ? Math.max(0, Math.min(1, (readAt - tops[index]) / Math.max(1, distance))) : 0;
    const year = yearPanels[index].dataset.historyPanel;
    selectYear(year, { railPosition: index + fraction });
    if (historyRouteReady && bounds.top <= header && bounds.bottom > readAt && location.hash !== '#history-' + year) {
      history.replaceState(history.state, '', '#history-' + year);
    }
  }
  function requestFlowHistory() {
    if (flowHistoryFrame) return;
    flowHistoryFrame = requestAnimationFrame(() => { flowHistoryFrame = 0; updateFlowHistory(); });
  }
  addEventListener('scroll', requestFlowHistory, { passive: true });
  addEventListener('resize', requestFlowHistory, { passive: true });
  addEventListener('pageshow', requestFlowHistory);
  document.addEventListener('visibilitychange', requestFlowHistory);
  yearPanels.forEach(panel => {
    $('.history-image-stage img', panel)?.addEventListener('load', requestFlowHistory);
  });
  function goToYear(year, smooth = true, { align = false } = {}) {
    const panel = yearPanels.find(p => p.dataset.historyPanel === year);
    if (!panel) return;
    selectYear(year, { motion: smooth });
    finishRevealsWithin(panel);
    if (storyMode && historyScroll) {
      const i = yearPanels.indexOf(panel);
      const position = historyScroll.start + historyScroll.vars.storyDistance() * ((i + .14) / yearPanels.length);
      requestedYearPosition = position;
      // The frame is already sticky: jump only its invisible scroll position.
      // The authored text/image transition supplies the visible continuity.
      window.scrollTo({ top: position, behavior: 'instant' });
    } else if (compactMode) {
      if (align) historyChapter.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else {
      panel.scrollIntoView({ block: 'start', behavior: smooth && !reduced.matches ? 'smooth' : 'instant' });
      panel.focus({ preventScroll: true });
    }
    requestAnimationFrame(() => finishPassedReveals());
  }
  yearTabs.forEach(tab => {
    tab.addEventListener('click', e => { e.preventDefault(); pushHash('#history-' + tab.dataset.year); goToYear(tab.dataset.year); });
    tab.addEventListener('keydown', e => {
      if (!storyMode && !compactMode) return;
      let i = yearTabs.indexOf(tab);
      if (e.key === 'ArrowRight') i = (i + 1) % yearTabs.length;
      else if (e.key === 'ArrowLeft') i = (i + yearTabs.length - 1) % yearTabs.length;
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = yearTabs.length - 1;
      else if (e.key === ' ') { e.preventDefault(); tab.click(); return; }
      else return;
      e.preventDefault(); yearTabs.forEach(t => { t.tabIndex = t === yearTabs[i] ? 0 : -1; }); yearTabs[i].focus({ preventScroll: true });
    });
  });
  // Swiping is an optional shortcut. The visible year rail remains primary;
  // touch-action preserves native vertical scrolling and pinch zoom.
  let historySwipe = null;
  sharedHistoryVisual.addEventListener('pointerdown', event => {
    if (!compactMode || event.isPrimary === false || event.button !== 0 || !['touch', 'pen'].includes(event.pointerType)) return;
    historySwipe = { id: event.pointerId, x: event.clientX, y: event.clientY, at: event.timeStamp, axis: null };
  });
  sharedHistoryVisual.addEventListener('pointermove', event => {
    if (!historySwipe || historySwipe.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - historySwipe.x), dy = Math.abs(event.clientY - historySwipe.y);
    if (dy > 12 && dy > dx) historySwipe = null;
    else if (dx > 12 && dx > dy * 1.3) historySwipe.axis = 'x';
  });
  sharedHistoryVisual.addEventListener('pointerup', event => {
    const swipe = historySwipe; historySwipe = null;
    if (!compactMode || !swipe || swipe.id !== event.pointerId || swipe.axis !== 'x' || event.timeStamp - swipe.at > 1200) return;
    const dx = event.clientX - swipe.x, dy = Math.abs(event.clientY - swipe.y);
    const threshold = Math.max(36, Math.min(64, sharedHistoryVisual.getBoundingClientRect().width * .14));
    if (Math.abs(dx) < threshold || Math.abs(dx) <= dy * 1.3) return;
    const i = yearPanels.findIndex(panel => panel.dataset.historyPanel === currentYear);
    const next = Math.max(0, Math.min(yearTabs.length - 1, i + (dx < 0 ? 1 : -1)));
    if (next !== i) { pushHash('#history-' + yearTabs[next].dataset.year); goToYear(yearTabs[next].dataset.year); }
  });
  ['pointercancel', 'lostpointercapture'].forEach(type => sharedHistoryVisual.addEventListener(type, () => { historySwipe = null; }));
  addEventListener('resize', () => { historySwipe = null; });
  function cancelHistoryRouteRestore() {
    cancelAnimationFrame(historyRouteFrame); historyRouteFrame = 0;
    restoringHistoryRoute = false;
  }
  ['wheel', 'touchstart'].forEach(type => addEventListener(type, () => {
    requestedYearPosition = null;
    cancelHistoryRouteRestore();
  }, { passive: true }));
  addEventListener('resize', settleHistoryTexts);
  document.addEventListener('visibilitychange', settleHistoryTexts);
  reduced.addEventListener('change', settleHistoryTexts);
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    settleHistoryTexts();
    selectYear(currentYear);
    requestLayout();
  });
  addEventListener('keydown', e => {
    if (!e.defaultPrevented && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) {
      requestedYearPosition = null;
      cancelHistoryRouteRestore();
    }
  }, { passive: true });
  root.classList.add('ui-enhanced');
  setStoryMode(false);

  function applyRoute(scroll = false) {
    let hash = location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch { /* Keep external malformed fragments harmless. */ }
    let target = document.getElementById(hash);
    if (hash === 'geschiedenis') selectYear('1957');
    if (hash.startsWith('snit-')) target = document.getElementById('product-' + hash.slice(5));
    if (target?.matches('.product-disclosure')) {
      selectGroup(target.closest('[data-group-panel]').dataset.groupPanel); target.open = true;
    } else if (target?.matches('[data-group-panel]')) selectGroup(target.dataset.groupPanel);
    else if (target?.matches('[data-history-panel]')) {
      goToYear(target.dataset.historyPanel, false, { align: scroll }); return;
    }
    if (target) finishRevealsWithin(target.closest('[data-sheet]') || target);
    if (scroll && target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
    if (target) requestAnimationFrame(() => finishPassedReveals());
  }
  function restoreHistoryRoute() {
    cancelHistoryRouteRestore();
    const hash = location.hash;
    restoringHistoryRoute = yearPanels.some(panel => '#history-' + panel.dataset.historyPanel === hash);
    applyRoute(false);
    if (!restoringHistoryRoute) return;
    // Back/forward can restore a native scroll position after popstate. Keep
    // the requested year authoritative until that restoration has settled;
    // otherwise a transient scroll update can overwrite its fragment with 1957.
    historyRouteFrame = requestAnimationFrame(() => {
      historyRouteFrame = requestAnimationFrame(() => {
        historyRouteFrame = 0;
        if (location.hash === hash) applyRoute(false);
        restoringHistoryRoute = false;
        requestedYearPosition = null;
      });
    });
  }
  addEventListener('hashchange', restoreHistoryRoute);
  addEventListener('popstate', restoreHistoryRoute);

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(min-width:1101px) and (min-height:720px) and (prefers-reduced-motion:no-preference)', () => {
      root.classList.add('scene-enhanced');
      setStoryMode(true);
      const chapter = $('.history-chapter');
      const frame = $('.chapter-frame', chapter);
      const header = () => parseFloat(getComputedStyle(root).getPropertyValue('--header-h'));
      const stageHeight = () => innerHeight - header();
      const storyDistance = () => stageHeight() * 2.8;
      const setStageY = gsap.quickSetter(historyStage, 'y', 'px');
      let exitLift = 0, currentLift = 0;
      function updateHistoryExit(progress) {
        // The last reading interval lets the image approach the screen centre.
        // Afterwards CSS releases the whole frame through ordinary page scroll.
        const tail = Math.max(0, Math.min(1, (progress - .9) / .1));
        currentLift = exitLift * tail;
        setStageY(-currentLift);
      }
      function measureHistory() {
        const size = frame.offsetHeight;
        chapter.style.setProperty('--sheet-height', size + 'px');
        chapter.style.setProperty('--sheet-top', (header() + Math.min(0, stageHeight() - size)) + 'px');
        chapter.style.setProperty('--history-travel', storyDistance() + 'px');
        const bounds = frame.getBoundingClientRect();
        const stage = historyStage.getBoundingClientRect();
        const image = $('.history-image-stage', sharedHistoryVisual).getBoundingClientRect();
        const rail = yearRail.getBoundingClientRect();
        // Add back the applied translation: refresh must never compound the lift.
        const imageCentre = header() + image.top - bounds.top + currentLift + image.height / 2;
        const railClearance = Math.max(0, stage.top - bounds.top + currentLift - (rail.bottom - bounds.top + 24));
        exitLift = Math.max(0, Math.min(imageCentre - innerHeight / 2, railClearance));
        requestHistoryRail();
      }
      measureHistory();
      ScrollTrigger.addEventListener('refreshInit', measureHistory);
      let layoutFrame = 0;
      requestLayout = () => {
        cancelAnimationFrame(layoutFrame);
        // refreshInit already owns measurement. Measuring here as well doubles
        // the layout reads and sheet geometry writes in the same frame.
        layoutFrame = requestAnimationFrame(() => { layoutFrame = 0; ScrollTrigger.refresh(); });
      };
      let measuredFrameWidth = frame.clientWidth, measuredFrameHeight = frame.clientHeight;
      const resizeObserver = new ResizeObserver(() => {
        const width = frame.clientWidth, height = frame.clientHeight;
        if (width === measuredFrameWidth && height === measuredFrameHeight) return;
        measuredFrameWidth = width; measuredFrameHeight = height;
        requestLayout();
      });
      resizeObserver.observe(frame);
      function renderHistory(self) {
        updateHistoryExit(self.progress);
        chapter.dataset.storyProgress = self.progress.toFixed(3);
        if (restoringHistoryRoute) return;
        if (requestedYearPosition !== null) {
          if (Math.abs(scrollY - requestedYearPosition) > 4) return;
          requestedYearPosition = null;
        }
        const index = Math.min(yearPanels.length - 1, Math.floor(self.progress * yearPanels.length));
        const year = yearPanels[index].dataset.historyPanel;
        selectYear(year, { motion: self.isActive, railPosition: self.progress * yearPanels.length });
        if (historyRouteReady && self.isActive && location.hash !== '#history-' + year) history.replaceState(history.state, '', '#history-' + year);
      }
      historyScroll = ScrollTrigger.create({
        trigger: $('.history-chapter'), start: () => 'top ' + header(),
        end: () => '+=' + storyDistance(), storyDistance, invalidateOnRefresh: true,
        onRefresh: renderHistory,
        onUpdate: renderHistory
      });
      return () => {
        cancelAnimationFrame(layoutFrame); resizeObserver.disconnect();
        ScrollTrigger.removeEventListener('refreshInit', measureHistory);
        requestLayout = () => {};
        historyScroll = null; requestedYearPosition = null;
        gsap.set(historyStage, { clearProps: 'transform' });
        root.classList.remove('scene-enhanced');
        ['--sheet-height', '--sheet-top', '--history-travel'].forEach(prop => chapter.style.removeProperty(prop));
        setStoryMode(false);
      };
    });

    // One-time entrances: each unit owns only its own reveal, never the scroll plane.
    mm.add('(prefers-reduced-motion:no-preference)', () => {
      const records = new Map();
      const cleanups = [];
      let reconcileFrame = 0, pendingReveals = 0;
      function finish(el) {
        const record = records.get(el);
        if (!record || record.done) return;
        record.done = true; --pendingReveals;
        clearTimeout(record.watchdog);
        record.timeline?.progress(1).kill();
        record.end(); el.dataset.revealState = 'complete';
        observer.unobserve(el);
      }
      function start(el) {
        const record = records.get(el);
        if (!record || record.done || record.started) return;
        record.started = true; el.dataset.revealState = 'playing';
        // Content wins if a timeline is interrupted, throttled or cancelled.
        record.watchdog = setTimeout(() => finish(el), Math.ceil(record.timeline.totalDuration() * 1000) + 160);
        record.timeline.play();
      }
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        start(entry.target);
      }), { rootMargin: '0px 0px -7% 0px', threshold: .04 });
      function reconcile() {
        reconcileFrame = 0;
        // Read first, then write: fast jumps may cross the entire observer zone
        // between callbacks. Passing a section always resolves its concealment.
        const pending = [...records].filter(([, record]) => !record.done).map(([el]) => ({ el, rect: el.getBoundingClientRect(), visibility: getComputedStyle(el).visibility }));
        pending.forEach(({ el, rect, visibility }) => {
          if (!rect.height) return;
          if (rect.bottom <= 0) finish(el);
          else if (rect.top < innerHeight * .93 && visibility !== 'hidden') start(el);
        });
      }
      function scheduleReconcile() {
        if (!pendingReveals || reconcileFrame) return;
        reconcileFrame = requestAnimationFrame(reconcile);
      }
      function register(el, build) {
        if (!el || records.has(el)) return;
        const rect = el.getBoundingClientRect();
        // Do not obscure a deep-linked/initially visible or already passed unit.
        if (rect.height && rect.top < innerHeight * .94) { el.dataset.revealState = 'complete'; return; }
        const record = build(el);
        record.build = build;
        records.set(el, record); ++pendingReveals;
        el.dataset.revealState = 'pending';
        record.timeline.eventCallback('onComplete', () => finish(el));
        observer.observe(el);
      }
      function block(el, delay = 0, { distance = 12, duration = .44 } = {}) {
        register(el, node => {
          gsap.set(node, { opacity: 0, y: distance });
          return { end: () => gsap.set(node, { clearProps: 'opacity,transform,willChange' }), timeline: gsap.timeline({ paused: true }).to(node, { opacity: 1, y: 0, duration, delay, ease: 'power3.out' }) };
        });
      }
      function heading(el) {
        register(el, node => {
          const original = node.innerHTML, label = node.innerText.replace(/\s+/g, ' ').trim();
          const rows = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          let text;
          while ((text = walker.nextNode())) {
            const regex = /(\s*)(\S+)/g; let match;
            while ((match = regex.exec(text.textContent))) {
              const range = document.createRange();
              range.setStart(text, match.index + match[1].length); range.setEnd(text, regex.lastIndex);
              const top = range.getBoundingClientRect().top;
              let row = rows.find(r => Math.abs(r.top - top) < 4);
              if (!row) { row = { top, tokens: [] }; rows.push(row); }
              row.tokens.push({ space: match[1], value: match[2], accent: !!text.parentElement.closest('.brand-period') });
            }
          }
          node.replaceChildren();
          node.setAttribute('aria-label', label);
          rows.forEach(row => {
            const mask = document.createElement('span'), ink = document.createElement('span');
            mask.className = 'motion-line'; ink.className = 'motion-line-ink'; mask.setAttribute('aria-hidden', 'true');
            row.tokens.forEach((token, i) => {
              if (i && token.space) ink.append(' ');
              const span = document.createElement('span'); span.textContent = token.value;
              if (token.accent) span.className = 'brand-period'; ink.append(span);
            });
            mask.append(ink); node.append(mask);
          });
          const inks = $$('.motion-line-ink', node);
          gsap.set(inks, { y: 22, opacity: 0 });
          return { end: () => { node.innerHTML = original; node.removeAttribute('aria-label'); }, timeline: gsap.timeline({ paused: true }).to(inks, { y: 0, opacity: 1, duration: .52, stagger: .07, ease: 'expo.out' }) };
        });
      }
      function exposure(surface) {
        const layer = document.createElement('span');
        layer.className = 'media-exposure'; layer.setAttribute('aria-hidden', 'true');
        surface.append(layer); gsap.set(layer, { opacity: .18 });
        return layer;
      }
      function composition(el) {
        register(el, node => {
          const stage = $('.product-image-stage', node);
          const layer = stage ? exposure(stage) : null;
          const caption = $('figcaption', node);
          gsap.set(node, { opacity: .66, y: 8 });
          const tl = gsap.timeline({ paused: true }).to(node, { opacity: 1, y: 0, duration: .52, ease: 'power3.out' }, 0);
          if (layer) tl.to(layer, { opacity: 0, duration: .48, ease: 'power3.out' }, 0);
          if (caption) {
            gsap.set(caption, { opacity: .66 });
            tl.to(caption, { opacity: 1, duration: .4, ease: 'power3.out' }, .05);
          }
          return { end: () => {
            layer?.remove();
            gsap.set(node, { clearProps: 'opacity,transform,willChange' });
            if (caption) gsap.set(caption, { clearProps: 'opacity' });
          }, timeline: tl };
        });
      }
      function media(el) {
        register(el, node => {
          node.classList.add('media-reveal');
          const layer = exposure(node);
          // The photo, its crop and the surrounding layout stay stationary.
          const tl = gsap.timeline({ paused: true }).to(layer, { opacity: 0, duration: .48, ease: 'power3.out' });
          return { end: () => layer.remove(), timeline: tl };
        });
      }
      $$('.quality-heading h2,.history-heading h2,.news-heading h2,.contact-intro h2').forEach(heading);
      $$('.quality-heading>p,.quality-heading>.text-link,.quality-support,.establishment-row,.history-more,.history-tabs,.news-heading>.text-link,.contact-intro>div,.contact-register>div,.footer-brand,.footer-nav,.footer-bottom').forEach((el, i) => block(el, i % 3 * .04));
      $$('.proof-row,.news-row').forEach((el, i) => block(el, i % 3 * .06));
      $$('.company-copy,.company-evidence').forEach(el => block(el, 0, { distance: 8, duration: .4 }));
      media($('.company-photo'));
      $$('.products-heading,.group-tabs,.bespoke-row').forEach(el => block(el, 0, { distance: 8, duration: .4 }));
      $$('.product-panel-body').forEach(composition);
      if (storyMode || compactMode) media($('.history-image-stage', sharedHistoryVisual));
      else yearPanels.forEach(panel => media($('.history-image-stage', panel)));
      finishRevealsWithin = parent => records.forEach((record, el) => { if (el === parent || parent.contains(el)) finish(el); });
      finishPassedReveals = () => records.forEach((record, el) => { if (!record.done && el.getBoundingClientRect().bottom < 0) finish(el); });
      const focus = e => records.forEach((record, el) => { if (el === e.target || el.contains(e.target)) finish(el); });
      document.addEventListener('focusin', focus);
      addEventListener('scroll', scheduleReconcile, { passive: true });
      document.addEventListener('visibilitychange', scheduleReconcile);
      ScrollTrigger.addEventListener('refresh', scheduleReconcile);
      scheduleReconcile();
      // Preserve unseen first entrances across a width/orientation change.
      // Finish readable/playing units; remeasure only future, unplayed units.
      let previousWidth = innerWidth;
      const resize = () => {
        if (innerWidth === previousWidth) return;
        previousWidth = innerWidth;
        records.forEach((record, el) => {
          if (record.done) return;
          const rect = el.getBoundingClientRect();
          if (record.started || (rect.height && rect.top < innerHeight * .94)) { finish(el); return; }
          // Rebuild paused line masks after reflow, without consuming their
          // one allowed entrance or stacking old media curtains/timelines.
          clearTimeout(record.watchdog);
          record.timeline.kill(); record.end();
          const next = record.build(el);
          next.build = record.build;
          records.set(el, next);
          next.timeline.eventCallback('onComplete', () => finish(el));
          el.dataset.revealState = 'pending';
        });
        scheduleReconcile();
      };
      addEventListener('resize', resize);
      return () => {
        cancelAnimationFrame(reconcileFrame);
        removeEventListener('scroll', scheduleReconcile);
        document.removeEventListener('visibilitychange', scheduleReconcile);
        ScrollTrigger.removeEventListener('refresh', scheduleReconcile);
        records.forEach((record, el) => finish(el)); observer.disconnect();
        document.removeEventListener('focusin', focus); removeEventListener('resize', resize);
        finishRevealsWithin = () => {}; finishPassedReveals = () => {}; cleanups.forEach(fn => fn());
      };
    });
    // refreshInit performs the history measurement; font readiness needs one
    // refresh, not an immediate refresh plus a second queued requestLayout.
    document.fonts.ready.then(() => { refresh(); if (!interacted && location.hash) applyRoute(true); });
  }
  applyRoute(true);
  // Native fragment scrolling may run after the first frame, especially after
  // a viewport change. Settle the authored year after fonts/load and refresh
  // before allowing passive scroll updates to replace its incoming URL.
  if (initialHistoryHash) {
    const loaded = document.readyState === 'complete' ? Promise.resolve() : new Promise(resolve => addEventListener('load', resolve, { once: true }));
    Promise.all([document.fonts.ready, loaded]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!interacted && location.hash === initialHistoryHash) { refresh(); applyRoute(true); }
      historyRouteReady = true;
    })));
  } else requestAnimationFrame(() => { historyRouteReady = true; });
  reduced.addEventListener('change', () => {
    motions.forEach(a => a.cancel());
    $$('.transition-image').forEach(el => el.remove());
  });
})();
