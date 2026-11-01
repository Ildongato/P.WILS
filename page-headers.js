/* One image-header grammar for the four inner-page entrances. */
(() => {
  'use strict';
  const hero=document.querySelector('[data-page-hero]');
  if(!hero)return;
  const coverStage=hero.closest('[data-page-cover]');
  const contentSheet=coverStage?.nextElementSibling;
  const header=document.querySelector('.site-header');
  const photo=hero.querySelector('.page-banner-media img');
  const media=hero.querySelector('.page-banner-media');
  const title=hero.querySelector('[data-banner-title]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const wide=window.matchMedia('(min-width:821px)');
  const animations=new Set();
  let frame=0, curtain,sceneVisible=true,lastFilled=null,lastTransform=null;
  const stickySupported=CSS.supports('position','sticky');
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function finishEntry(){
    animations.forEach(animation=>animation.cancel());animations.clear();
    curtain?.remove();curtain=null;
  }
  function render(){
    frame=0;
    const bounds=hero.getBoundingClientRect();
    const cover=coverStage && contentSheet?.hasAttribute('data-page-sheet') &&
      !reduced.matches && stickySupported;
    const source=cover?coverStage.getBoundingClientRect():bounds;
    const incomingTop=cover?contentSheet.getBoundingClientRect().top:bounds.bottom;
    const headerHeight=header?.getBoundingClientRect().height||96;
    const filled=incomingTop<=headerHeight+8;
    const offset=photo&&hero.hasAttribute('data-hero-parallax')&&wide.matches&&!reduced.matches?clamp(-source.top*.075,0,24):0;
    // Finish all reads before touching classes/styles shared with other scroll
    // owners, and do not invalidate styles for an unchanged visual state.
    if(filled!==lastFilled){header?.classList.toggle('is-filled',filled);lastFilled=filled}
    if(photo){
      const transform=offset?`translate3d(0,${offset.toFixed(2)}px,0)`:'';
      if(transform!==lastTransform){photo.style.transform=transform;lastTransform=transform}
    }
    if(incomingTop<=0)finishEntry();
  }
  function requestRender(){if(sceneVisible&&!frame)frame=requestAnimationFrame(render)}
  function refreshRender(){if(!frame)frame=requestAnimationFrame(render)}
  function track(animation){animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));return animation}
  function enter(){
    if(document.body.hasAttribute('data-site-motion-page'))return;
    const bounds=hero.getBoundingClientRect();
    if(reduced.matches || bounds.top< -48 || bounds.bottom<=0 || !title?.animate)return;
    if(media){
      curtain=document.createElement('span');curtain.className='page-banner-curtain';curtain.setAttribute('aria-hidden','true');media.append(curtain);
      const cover=curtain;
      track(cover.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:680,easing:'cubic-bezier(.22,1,.36,1)'})).finished.catch(()=>{}).finally(()=>{cover.remove();if(curtain===cover)curtain=null});
    }
    track(title.animate([{transform:'translate3d(0,108%,0)'},{transform:'translate3d(0,0,0)'}],{duration:600,delay:90,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'}));
  }
  render();enter();
  // A covered/offscreen photograph has no scroll work. The observer wakes it
  // before re-entry, preserving native reverse scrolling and the same parallax.
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{
      sceneVisible=entries.some(entry=>entry.isIntersecting);
      refreshRender();
    },{rootMargin:'128px 0px',threshold:0}).observe(coverStage||hero);
  }
  window.addEventListener('scroll',requestRender,{passive:true});
  window.addEventListener('resize',refreshRender,{passive:true});
  window.addEventListener('hashchange',()=>{finishEntry();refreshRender()});
  window.addEventListener('pageshow',event=>{if(event.persisted)finishEntry();refreshRender()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){finishEntry();refreshRender()}});
  document.addEventListener('focusin',event=>{if(hero.contains(event.target))finishEntry()});
  reduced.addEventListener('change',()=>{if(reduced.matches)finishEntry();refreshRender()});
  wide.addEventListener('change',refreshRender);
})();
