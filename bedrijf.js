/* Company v29: one native chronology; only its documentary archive is enhanced. */
(() => {
 'use strict';
 const root = document.documentElement;
 const events = [...document.querySelectorAll('[data-company-year]')];
 if (!events.length) return;
 const archive = document.querySelector('[data-archive-image]');
 const caption = document.querySelector('[data-archive-caption]');
 const header = document.querySelector('.site-header');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const roomy = matchMedia('(min-width:1101px) and (min-height:800px)');
 const images = {
  founder: { src: 'assets/history/pierre-wils-kleur-v1.jpg', alt: 'Archiefportret van oprichter Pierre Wils', caption: 'Pierre Wils, oprichter. Opnamejaar onbekend.', width: 1451, height: 1084 },
  location: { src: 'assets/history/wils-grobbendonk-scherp-v1.jpg', alt: 'Archiefbeeld van de Wils-vestiging in Grobbendonk', caption: 'Archiefbeeld van de vestiging in Grobbendonk. Opnamejaar onbekend.', width: 1499, height: 1049 },
  solar: { src: 'assets/company/luchtfoto-wils.webp', alt: 'Luchtfoto van de Wils-vestiging met zonnepanelen in Grobbendonk', caption: 'De Wils-vestiging met zonnepanelen. Opnamejaar onbekend.', width: 1538, height: 1023 }
 };
 let currentYear = '', currentKey = 'founder', requestedKey = '', request = 0, motion = null, scheduled = false;
 function stopMotion() {
  motion?.cancel(); motion = null;
  archive.style.removeProperty('opacity');
 }
 async function setArchive(key) {
  if (!root.classList.contains('company-archive-enhanced') || key === currentKey || key === requestedKey) return;
  const token = ++request;
  requestedKey = key;
  const data = images[key];
  const next = new Image();
  next.src = data.src;
  try {
   if (typeof next.decode === 'function') await next.decode();
   else if (!next.complete) await new Promise((resolve,reject) => { next.onload=resolve; next.onerror=reject; });
  } catch { if (token === request) requestedKey=''; return; }
  if (token !== request || !root.classList.contains('company-archive-enhanced')) return;
  stopMotion();
  archive.src = data.src; archive.alt = data.alt;
  archive.width = data.width; archive.height = data.height;
  caption.textContent = data.caption;
  currentKey = key; requestedKey='';
  if (!reduced.matches && archive.animate) {
   motion = archive.animate([{opacity:.35},{opacity:1}], {duration:240,easing:'cubic-bezier(.22,1,.36,1)'});
   motion.finished.catch(() => {});
  }
 }
 function setYear(event) {
  const year=event.dataset.companyYear;
  if (year !== currentYear) {
   currentYear=year;
   events.forEach(item => {
    const active=item===event;
    item.classList.toggle('is-current',active);
    const link=item.querySelector('.company-event-year');
    if(active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
   });
  }
  const desired=event.dataset.archiveKey;
  // Returning past 1998 while its image is still loading must invalidate that request.
  if (desired === currentKey && requestedKey && requestedKey !== desired) { ++request; requestedKey=''; }
  setArchive(desired);
 }
 function update() {
  scheduled=false;
  const line=(header?.getBoundingClientRect().height || 0)+60;
  let active=events[0];
  events.forEach(item => { if(item.getBoundingClientRect().top<=line) active=item; });
  // At the document end the final event cannot always reach the header line.
  // Select it while still visible instead of leaving the previous archive up.
  const last=events[events.length-1], bounds=last.getBoundingClientRect();
  if(scrollY+innerHeight>=root.scrollHeight-2 && bounds.top<innerHeight && bounds.bottom>line) active=last;
  setYear(active);
 }
 function schedule() { if(!scheduled) { scheduled=true; requestAnimationFrame(update); } }
 function applyMode() {
  ++request; requestedKey=''; stopMotion();
  root.classList.toggle('company-archive-enhanced',roomy.matches&&!reduced.matches);
  update();
 }
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',schedule,{passive:true});
 addEventListener('hashchange',schedule);
 addEventListener('pageshow',applyMode);
 document.addEventListener('visibilitychange',() => { stopMotion(); if(!document.hidden) schedule(); });
 roomy.addEventListener('change',applyMode);
 reduced.addEventListener('change',applyMode);
 applyMode();
})();
