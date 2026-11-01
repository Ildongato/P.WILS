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
 function snapForPageCapture(){
  if(frame)cancelAnimationFrame(frame);
  frame=0;snapNext=false;primed=true;
  draw(true);
 }
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
  if(root.dataset.wilsPageArrival)snapForPageCapture();
  else{
   if(navigationType!=='reload')primePrevious(window.navigation?.activation?.from?.url||document.referrer);
   if(!primed)draw(true);
  }
  addEventListener('wils:page-snapshot',snapForPageCapture);
  addEventListener('wils:page-arrival',snapForPageCapture);
  new MutationObserver(()=>schedule()).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current','href']});
  if('ResizeObserver'in window){const observer=new ResizeObserver(()=>schedule(true));observer.observe(nav);if(header)observer.observe(header)}
  document.fonts?.ready.then(()=>schedule(true));
  document.fonts?.addEventListener?.('loadingdone',()=>schedule(true));
  addEventListener('resize',()=>schedule(true),{passive:true});
  addEventListener('pageshow',event=>{if(event.persisted){primed=false;schedule(true)}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(true)});
  wide.addEventListener('change',()=>schedule(true));
 }

 // V98 owns document transitions; this module retains only the active-nav rail.
 reduced.addEventListener('change',()=>schedule(true));
})();
