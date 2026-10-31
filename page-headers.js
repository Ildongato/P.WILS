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
  let frame=0, curtain;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function finishEntry(){
    animations.forEach(animation=>animation.cancel());animations.clear();
    curtain?.remove();curtain=null;
  }
  function render(){
    frame=0;
    const bounds=hero.getBoundingClientRect();
    const cover=coverStage && contentSheet?.hasAttribute('data-page-sheet') &&
      !reduced.matches && CSS.supports('position','sticky');
    const source=cover?coverStage.getBoundingClientRect():bounds;
    const incomingTop=cover?contentSheet.getBoundingClientRect().top:bounds.bottom;
    const headerHeight=header?.getBoundingClientRect().height||96;
    header?.classList.toggle('is-filled',incomingTop<=headerHeight+8);
    if(photo){
      const offset=hero.hasAttribute('data-hero-parallax') && wide.matches && !reduced.matches ? clamp(-source.top*.075,0,24):0;
      photo.style.transform=offset?`translate3d(0,${offset.toFixed(2)}px,0)`:'';
    }
    if(incomingTop<=0)finishEntry();
  }
  function requestRender(){if(!frame)frame=requestAnimationFrame(render)}
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
  window.addEventListener('scroll',requestRender,{passive:true});
  window.addEventListener('resize',requestRender,{passive:true});
  window.addEventListener('hashchange',()=>{finishEntry();requestRender()});
  window.addEventListener('pageshow',event=>{if(event.persisted)finishEntry();requestRender()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){finishEntry();requestRender()}});
  document.addEventListener('focusin',event=>{if(hero.contains(event.target))finishEntry()});
  reduced.addEventListener('change',()=>{if(reduced.matches)finishEntry();requestRender()});
  wide.addEventListener('change',requestRender);
})();
