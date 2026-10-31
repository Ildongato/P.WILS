/* P.WILS · approved detail refinement V56. Source: work/details-system-v56/partials */
/* V56 navigation. Append to the shared details layer; load its script with
   defer blocking="render" so pagereveal listeners precede the first paint.
   This module never handles clicks, prevents defaults, changes URLs or starts
   a same-document transition. Existing home/menu/timeline controllers retain ownership. */
(() => {
 'use strict';
 const root=document.documentElement;
 const header=document.querySelector('.site-header');
 const nav=header?.querySelector('.desktop-nav');
 const links=nav?[...nav.querySelectorAll(':scope > a.nav-link')]:[];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const wide=matchMedia('(min-width:1101px)');
 let frame=0,snapNext=false,primed=false;
 let marker;
 const urlPath=value=>{try{return new URL(value,location.href).pathname}catch{return''}};
 function activeLink(){return links.find(link=>link.getAttribute('aria-current')==='page')}
 function geometry(link){
  const parent=nav.getBoundingClientRect(),box=link?.getBoundingClientRect();
  if(!box||parent.width<=0||box.width<=0)return null;
  return `translate3d(${(box.left-parent.left).toFixed(2)}px,${(box.bottom-parent.top-7).toFixed(2)}px,0) scaleX(${box.width.toFixed(2)})`;
 }
 function draw(snap=false){
  frame=0;
  if(!marker)return;
  const target=activeLink();
  const transform=wide.matches&&target?geometry(target):null;
  if(!transform){marker.classList.remove('is-visible');nav.removeAttribute('data-nav-marker-ready');snapNext=false;return}
  const instant=snap||snapNext||reduced.matches;
  if(instant)marker.setAttribute('data-marker-snap','');else marker.removeAttribute('data-marker-snap');
  marker.style.transform=transform;
  marker.classList.add('is-visible');
  nav.setAttribute('data-nav-marker-ready','');
  snapNext=false;
 }
 function schedule(snap=false){snapNext=snapNext||snap;if(!frame)frame=requestAnimationFrame(()=>draw())}
 function primePrevious(value){
  if(primed||reduced.matches||!wide.matches||!activeLink())return;
  const previousPath=urlPath(value);
  const previous=links.find(link=>urlPath(link.href)===previousPath);
  if(!previous||previous===activeLink())return;
  const transform=geometry(previous);
  if(!transform)return;
  primed=true;
  marker.setAttribute('data-marker-snap','');
  marker.style.transform=transform;
  marker.classList.add('is-visible');
  nav.setAttribute('data-nav-marker-ready','');
  // Commit the initial rail once, then animate only its transform to this page.
  marker.getBoundingClientRect();
  marker.removeAttribute('data-marker-snap');
  schedule();
 }
 if(nav&&links.length){
  marker=document.createElement('span');marker.className='nav-active-marker';marker.setAttribute('aria-hidden','true');nav.append(marker);
  const navigationType=performance.getEntriesByType?.('navigation')?.[0]?.type;
  if(navigationType!=='reload')primePrevious(window.navigation?.activation?.from?.url||document.referrer);
  if(!primed)draw(true);
  new MutationObserver(()=>schedule()).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current','href']});
  if('ResizeObserver'in window){const observer=new ResizeObserver(()=>schedule(true));observer.observe(nav);if(header)observer.observe(header)}
  document.fonts?.ready.then(()=>schedule(true));
  document.fonts?.addEventListener?.('loadingdone',()=>schedule(true));
  addEventListener('resize',()=>schedule(true),{passive:true});
  addEventListener('pageshow',event=>{if(event.persisted){primed=false;schedule(true)}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(true)});
  wide.addEventListener('change',()=>schedule(true));
 }

 // Both endpoints must be ordinary inner documents. The cinematic home does
 // not opt in, so its intro, drone and scroll storytelling cannot be replaced.
 const innerNames=new Set(['producten.html','kwaliteit.html','bedrijf.html','contact.html','bereikbaarheid.html']);
 const isInnerURL=value=>{try{const url=new URL(value,location.href);return url.origin===location.origin&&innerNames.has(url.pathname.split('/').pop())}catch{return false}};
 const isInner=document.body.classList.contains('inner-page')&&isInnerURL(location.href)&&!document.body.hasAttribute('data-site-motion-page');
 let activeTransition=null;
 if(isInner&&'onpageswap'in window&&'onpagereveal'in window){
  root.setAttribute('data-wils-page-transition','');
  const optIn=document.createElement('style');
  optIn.setAttribute('data-wils-transition-opt-in','');
  optIn.media='(prefers-reduced-motion: no-preference)';
  optIn.textContent='@view-transition { navigation: auto; }';
  document.head.append(optIn);
  function settleArrival(){
   const top=header?.getBoundingClientRect().height||0;
   const candidates=document.querySelectorAll('[data-page-hero], [data-opening-group], main .enter, main [data-enter], main .media-reveal');
   candidates.forEach(node=>{
    const box=node.getBoundingClientRect();
    if(box.bottom<=top||box.top>=innerHeight)return;
    node.setAttribute('data-wils-arrival-settled','');
    const targets=[node,...node.querySelectorAll('[data-banner-title],.page-banner-curtain,.reveal-curtain')];
    targets.forEach(target=>target.getAnimations?.().forEach(animation=>{try{animation.finish()}catch{animation.cancel()}}));
   });
  }
  addEventListener('pageswap',event=>{
   if(!event.viewTransition)return;
   const destination=event.activation?.entry?.url;
   if(reduced.matches||!destination||!isInnerURL(destination))event.viewTransition.skipTransition();
  });
  addEventListener('pagereveal',event=>{
   const transition=event.viewTransition;
   if(!transition)return;
   const previous=window.navigation?.activation?.from?.url;
   if(reduced.matches||(previous&&!isInnerURL(previous))){transition.skipTransition();return}
   activeTransition=transition;
   settleArrival();
   if(previous)primePrevious(previous);
   transition.finished.catch(()=>{}).finally(()=>{if(activeTransition===transition)activeTransition=null;schedule(true)});
  });
 }
 reduced.addEventListener('change',()=>{schedule(true);if(reduced.matches)activeTransition?.skipTransition()});
})();
