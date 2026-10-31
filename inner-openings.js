/* V68. A measured, single-row chapter rail; existing motion retains its owner. */
(() => {
  'use strict';
  const nav = document.querySelector('[data-page-chapters]');
  if (!nav) return;
  const header = document.querySelector('.site-header');
  const bar = nav.closest('.page-chapters');
  const body = document.body;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const items = links.map(link => ({link, target: document.getElementById(decodeURIComponent(link.hash.slice(1)))})).filter(item => item.target);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const groups = body.hasAttribute('data-site-motion-page') ? [] : [...document.querySelectorAll('[data-opening-group]')];
  const seen = new WeakSet();
  const running = new Map();
  let frame = 0, headerHeight = 0, barHeight = 0, current = null, railBusyUntil = 0;

  function measure() {
    const h = header?.getBoundingClientRect().height || 80;
    const b = bar?.getBoundingClientRect().height || 0;
    if (h !== headerHeight) {
      headerHeight = h;
      body.style.setProperty('--chapters-header-height', h + 'px');
    }
    // CSS owns the responsive rail height; reading it avoids a circular inline override.
    barHeight = b;
    return h + b;
  }
  function headingFor(target) {
    const labelled = target.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)).find(Boolean);
    const candidates = [labelled, ...target.querySelectorAll('h2,h3')].filter(Boolean);
    return candidates.find(heading => {
      const box = heading.getBoundingClientRect();
      return box.width > 2 && box.height > 2;
    }) || target;
  }
  function showLink(link) {
    if (!link || Date.now() < railBusyUntil || nav.scrollWidth <= nav.clientWidth + 1) return;
    const bounds = nav.getBoundingClientRect(), box = link.getBoundingClientRect(), pad = 8;
    const delta = box.left < bounds.left + pad ? box.left - bounds.left - pad : box.right > bounds.right - pad ? box.right - bounds.right + pad : 0;
    if (delta) nav.scrollTo({left:nav.scrollLeft + delta, behavior:'instant'});
  }
  function select(item) {
    for (const link of links) {
      if (link === item?.link) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
    if (item !== current) {
      current = item;
      showLink(item?.link);
    }
  }
  function update() {
    frame = 0;
    const offset = measure();
    // Read within the free viewport, rather than the seam above a section's padding.
    const line = offset + Math.min(120, Math.max(24, (innerHeight - offset) * .16));
    const positions = items.map(item => ({item, top:item.target.getBoundingClientRect().top})).sort((a,b) => a.top-b.top);
    const passed = positions.filter(entry => entry.top <= line);
    let active = passed.length ? passed[passed.length-1]?.item : positions[0]?.item;
    // Short final sections still become reachable when the document cannot scroll farther.
    if (window.scrollY > 0 && window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2) active = positions[positions.length-1]?.item;
    select(active);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function layoutChanged() { current = null; schedule(); }
  function focusTarget(node) {
    if (!node.hasAttribute('tabindex')) {
      node.setAttribute('tabindex','-1');
      node.addEventListener('blur',() => node.removeAttribute('tabindex'),{once:true});
    }
    node.focus({preventScroll:true});
  }
  nav.addEventListener('click',event => {
    const link = event.target.closest('a[href^="#"]');
    const item = items.find(entry => entry.link === link);
    if (!item || event.defaultPrevented || (event.button !== undefined && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const heading = headingFor(item.target);
    // Focusing also settles the page's existing first-appearance animation owner.
    focusTarget(heading);
    const top = Math.max(0, window.scrollY + heading.getBoundingClientRect().top - measure() - 16);
    if (window.location.hash !== link.hash) window.history.pushState(null,'',link.hash);
    select(item);
    window.scrollTo({top,behavior:reduced.matches ? 'instant' : 'smooth'});
    schedule();
  });
  // A deliberate swipe is never fought by scrollspy. Focus remains free to expose its link.
  nav.addEventListener('pointerdown',() => {railBusyUntil = Date.now() + 1800;},{passive:true});
  nav.addEventListener('wheel',() => {railBusyUntil = Date.now() + 1800;},{passive:true});
  nav.addEventListener('focusin',event => {railBusyUntil = 0;showLink(event.target.closest('a'));});

  function finish(group) {
    running.get(group)?.cancel();
    running.delete(group);
    seen.add(group);
  }
  function enter(group) {
    if (seen.has(group)) return;
    seen.add(group);
    const box = group.getBoundingClientRect();
    if (reduced.matches || !group.animate || box.bottom <= 0 || box.top >= innerHeight) return;
    const animation = group.animate([
      {opacity:.84, transform:'translate3d(0,12px,0)'},
      {opacity:1, transform:'translate3d(0,0,0)'}
    ], {duration:400, easing:'cubic-bezier(.22,1,.36,1)'});
    running.set(group,animation);
    animation.finished.catch(() => {}).finally(() => { if(running.get(group)===animation) running.delete(group); });
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for(const entry of entries) if(entry.isIntersecting) {enter(entry.target);observer.unobserve(entry.target);}
    }, {threshold:0, rootMargin:'0px 0px -12px 0px'});
    groups.forEach(group => observer.observe(group));
  }
  function settle() { running.forEach((_,group) => finish(group)); schedule(); }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',layoutChanged,{passive:true});
  window.addEventListener('hashchange',settle);
  window.addEventListener('popstate',settle);
  window.addEventListener('pageshow',settle);
  window.addEventListener('load',layoutChanged,{once:true});
  document.fonts?.ready.then(layoutChanged);
  document.addEventListener('visibilitychange',() => {if(!document.hidden) settle();});
  document.addEventListener('focusin',event => {
    const group = event.target.closest('[data-opening-group]');
    if(group) finish(group);
  });
  reduced.addEventListener('change',() => {if(reduced.matches) groups.forEach(finish);schedule();});
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(layoutChanged);
    for (const node of [header,bar,document.querySelector('main')]) if(node) observer.observe(node);
  }
  update();
})();
