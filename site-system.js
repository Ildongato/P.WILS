(() => {
  'use strict';
  document.documentElement.classList.add('ui-enhanced');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const header=document.querySelector('.site-header');
  const toggle=document.querySelector('.menu-toggle');
  const menu=document.getElementById('mobile-menu');
  let menuAnimation;
  function setMenu(open, restore=false) {
    if(!toggle || !menu)return;
    menuAnimation?.cancel();
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Sluit navigatie':'Open navigatie');
    const label=toggle.querySelector('[data-menu-label]');if(label)label.textContent=open?'Sluiten':'Menu';
    header?.classList.toggle('menu-open',open);
    menu.hidden=!open;
    if(open && !reduced.matches)menuAnimation=menu.animate([{opacity:0,transform:'translate3d(0,-6px,0)'},{opacity:1,transform:'none'}],{duration:220,easing:'cubic-bezier(.22,1,.36,1)'});
    if(restore)toggle.focus({preventScroll:true});
  }
  toggle?.addEventListener('click',()=>setMenu(toggle.getAttribute('aria-expanded')!=='true'));
  menu?.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
  document.addEventListener('click',e=>{if(!header?.contains(e.target))setMenu(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && toggle?.getAttribute('aria-expanded')==='true')setMenu(false,true)});
  window.matchMedia('(min-width:1101px)').addEventListener('change',e=>{if(e.matches)setMenu(false)});
  if(document.body.hasAttribute('data-site-motion-page'))return;
  const seen=new WeakSet(), active=new Map();
  const candidates=[...document.querySelectorAll('.enter,[data-enter],.media-reveal')];
  function complete(el){active.get(el)?.cancel();active.delete(el);el.querySelector(':scope > .reveal-curtain')?.remove();seen.add(el)}
  function enter(el){
    if(seen.has(el))return;seen.add(el);
    if(reduced.matches || !el.animate)return;
    const box=el.getBoundingClientRect();if(box.bottom<0 || box.top>innerHeight)return;
    let animation;
    if(el.classList.contains('media-reveal')){
      const curtain=document.createElement('i');curtain.className='reveal-curtain';curtain.setAttribute('aria-hidden','true');el.append(curtain);
      animation=curtain.animate([{transform:'scaleX(1)'},{transform:'scaleX(0)'}],{duration:580,easing:'cubic-bezier(.22,1,.36,1)'});
      animation.finished.catch(()=>{}).finally(()=>curtain.remove());
    }else{
      animation=el.animate([{opacity:0,transform:'translate3d(0,10px,0)'},{opacity:1,transform:'none'}],{duration:460,easing:'cubic-bezier(.22,1,.36,1)'});
    }
    active.set(el,animation);animation.finished.catch(()=>{}).finally(()=>active.delete(el));
  }
  if('IntersectionObserver'in window){
    const io=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(isIntersecting){enter(target);io.unobserve(target)}}),{threshold:.08});
    candidates.forEach(el=>io.observe(el));
  }
  function revealRelevant(){for(const el of candidates){const b=el.getBoundingClientRect();if(b.bottom<0 || (b.top<innerHeight && b.bottom>0))complete(el)}}
  document.addEventListener('focusin',e=>{const el=e.target.closest('.enter,[data-enter],.media-reveal');if(el)complete(el)});
  window.addEventListener('hashchange',revealRelevant);
  window.addEventListener('pageshow',event=>{if(event.persisted)revealRelevant()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)revealRelevant()});
  reduced.addEventListener('change',()=>{if(reduced.matches)candidates.forEach(complete)});
})();
