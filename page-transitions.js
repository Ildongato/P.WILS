/* P.WILS V106. Native document navigation; reveal the final page without resizing its photograph.
   No router, document fetching, click interception, scroll reset or form storage. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root?.document)root.WILS_TRANSITIONS=api.init(root);
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const VERSION='fixed-canvas-106-local',KEY='wils:page-motion:98';
 const pages={ 'index.html':'home','producten.html':'products','kwaliteit.html':'quality','bedrijf.html':'company','contact.html':'contact' };
 const photoRoles=new Set(['products','quality','company','contact']);
 const textNames=new Set(['nieuws.html','werken-bij-wils.html','sector-vakbeurzen.html','privacy-nl.html']);
 const images={home:'assets/video/industrial-aerial-poster.jpg',products:'assets/page-headers/producten-marmer-breed-v40.jpg',quality:'assets/page-headers/kwaliteit.jpg',company:'assets/page-headers/bedrijf.jpg',contact:'assets/page-headers/contact.jpg'};
 function route(value,base){
  if(!value)return null;
  try{
   const directory=new URL('.',base),url=new URL(value,directory);
   if(url.origin!==directory.origin||!/^https?:$/.test(url.protocol))return null;
   let role;
   if(url.pathname.startsWith(directory.pathname)){
    const relative=url.pathname.slice(directory.pathname.length);
    role=relative===''?'home':pages[relative]||(textNames.has(relative)?'text':/\.html$/i.test(relative)?'task':null);
   }else if(directory.pathname.endsWith('/pwils-home-industrial-v1/dist/')){
    const legacy=new URL('../../pwils-producten-v6/',directory).pathname;
    const editorial=new URL('../../pwils-inhoudsplan/teksten/',directory).pathname;
    if(url.pathname.startsWith(legacy)&&/\.html$/i.test(url.pathname))role='task';
    if(url.pathname.startsWith(editorial)&&textNames.has(url.pathname.slice(editorial.length)))role='text';
   }
   return role?{url,role,path:url.pathname,photo:photoRoles.has(role)}:null;
  }catch{return null}
 }
 function topTarget(target){
  if(!target)return false;
  if([...target.url.searchParams.keys()].some(key=>['product','document','onderwerp','afdeling'].includes(key)))return false;
  return !target.url.hash||target.url.hash==='#top'||(target.role==='home'&&target.url.hash==='#intro');
 }
 function plan(from,to,{top=true,history=false,viewport=true}={}){
  if(!from||!to||from.path===to.path)return null;
  if(history||!top||!viewport||!topTarget(to))return 'quiet';
  if(from.role==='home'&&to.photo)return 'home-inner';
  if(from.photo&&to.role==='home')return 'inner-home';
  if(from.photo&&to.photo)return 'inner-inner';
  return 'quiet';
 }
 function init(win){
  const doc=win.document,root=doc.documentElement,script=doc.currentScript;
  const base=new URL('.',script?.src||new URL('page-transitions.js',win.location.href));
  const own=()=>route(win.location.href,base);
  const reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const supported='onpageswap'in win&&'onpagereveal'in win&&!!win.CSS?.supports?.('view-transition-name','wils-media');
  const named=new Map(),warm=new Map();
  let active=null,pending=null,optIn;
  const get=selector=>doc.querySelector(selector);
  const navType=()=>win.performance?.getEntriesByType?.('navigation')?.[0]?.type;
  const activationFrom=()=>win.navigation?.activation?.from?.url;
  function consumeRecord(){
   try{
    const raw=win.sessionStorage.getItem(KEY);win.sessionStorage.removeItem(KEY);
    if(!raw)return null;
    const value=JSON.parse(raw);
    if(value.version!==VERSION||typeof value.from!=='string'||typeof value.to!=='string'||!Number.isFinite(value.at)||Date.now()-value.at>8000||Date.now()<value.at)return null;
    if(!['home-inner','inner-home','inner-inner','quiet'].includes(value.kind))return null;
    return value;
   }catch{return null}
  }
  function remember(value){try{win.sessionStorage.setItem(KEY,JSON.stringify(value))}catch{}}
  function validRecord(value,from,to){
   return value&&to&&value.to===to.path&&(!from||value.from===from.path)&&Math.abs(value.width-win.innerWidth)<2&&Math.abs(value.height-win.innerHeight)<40;
  }
  function incomingHint(){
   if(!supported||reduced.matches||navType()==='reload')return;
   pending=consumeRecord();
  }
  function emit(name){win.dispatchEvent(new win.CustomEvent(name,{detail:{kind:root.dataset.wilsTransition||'quiet'}}))}
  function closeMenu(){
   const menu=get('#mobile-menu'),toggle=get('.menu-toggle');
   if(menu&&!menu.hidden&&toggle){toggle.click();if(!menu.hidden){menu.hidden=true;toggle.setAttribute('aria-expanded','false');get('.site-header')?.classList.remove('menu-open')}}
  }
  function clearNames(){
   named.forEach((previous,node)=>{if(previous.value)node.style.setProperty('view-transition-name',previous.value,previous.priority);else node.style.removeProperty('view-transition-name')});
   named.clear();
  }
  function name(node,value){
   if(!node)return false;
   const rect=node.getBoundingClientRect();
   if(!rect.width||!rect.height||rect.bottom<=0||rect.top>=win.innerHeight||win.getComputedStyle(node).visibility==='hidden'||node.closest('[hidden]'))return false;
   if(!named.has(node))named.set(node,{value:node.style.getPropertyValue('view-transition-name'),priority:node.style.getPropertyPriority('view-transition-name')});
   node.style.setProperty('view-transition-name',value);return true;
  }
  function settleLegacy(){
   if(doc.body?.hasAttribute('data-site-motion-page'))return;
   doc.querySelectorAll('main .enter,main [data-enter],main .media-reveal').forEach(node=>{
    const box=node.getBoundingClientRect();if(box.bottom<=0||box.top>=win.innerHeight)return;
    node.getAnimations?.({subtree:true}).forEach(animation=>{try{animation.finish()}catch{animation.cancel()}});
    node.querySelectorAll('.reveal-curtain,.page-banner-curtain').forEach(layer=>layer.remove());
   });
  }
  function clear(expected){
   if(expected&&active!==expected)return;
   if(active)win.clearTimeout(active.timer);
   active=null;clearNames();
   delete root.dataset.wilsTransition;delete root.dataset.wilsPageArrival;
   root.style.removeProperty('--wils-sheet-edge');root.style.removeProperty('--wils-page-duration');root.style.removeProperty('--wils-viewport-height');
  }
  function stop(){const previous=active;if(previous){try{previous.transition.skipTransition()}catch{}}clear(previous)}
  function mediaReady(){
   const current=own();if(!current||(!current.photo&&current.role!=='home'))return true;
   if(current.role==='home'){
    const film=get('.hero-film');if(film&&film.readyState>=2)return true;
   }
   const image=get(current.role==='home'?'.hero-aerial':'[data-transition-media] img');
   return !image||(image.complete&&image.naturalWidth>0);
  }
  function prepare(kind){
   clearNames();root.dataset.wilsTransition=kind;
   root.style.setProperty('--wils-viewport-height',win.innerHeight+'px');
   root.style.setProperty('--wils-page-duration',kind==='quiet'?'180ms':'380ms');
   // The root owns the photograph, its crop and all content at final geometry.
   // Only the persistent header is captured independently; no media morph.
   name(get('.site-header'),'wils-header');
  }
  function begin(transition,phase){
   if(active)win.clearTimeout(active.timer);
   const record={transition,phase,timer:0};active=record;
   record.timer=win.setTimeout(()=>{if(active===record)stop()},1600);
   // Never leave captured-name state behind in a BFCache-restored document.
   transition.ready?.catch(()=>{});
   transition.finished?.catch(()=>{}).finally(()=>clear(record));
   return record;
  }
  function swap(event){
   const transition=event.viewTransition;if(!transition)return;
   const from=own(),to=route(event.activation?.entry?.url,base);
   const kind=plan(from,to,{top:win.scrollY<=8,history:event.activation?.navigationType==='traverse',viewport:win.innerHeight>=450});
   if(!supported||reduced.matches||!kind){transition.skipTransition();clear();return}
   // A new native navigation owns the frame immediately, even during arrival.
   if(active&&active.transition!==transition)stop();
   closeMenu();emit('wils:page-snapshot');settleLegacy();
   remember({version:VERSION,from:from.path,to:to.path,kind,at:Date.now(),width:win.innerWidth,height:win.innerHeight});
   prepare(kind);begin(transition,'outgoing');
  }
  function reveal(event){
   const transition=event.viewTransition;
   if(!transition){if(active?.phase==='outgoing')stop();else if(!active)clear();pending=null;return}
   // A BFCache document can still hold its old outgoing transition record.
   if(active&&active.transition!==transition)stop();
   const to=own(),from=route(activationFrom()||doc.referrer,base),stored=pending||consumeRecord();pending=null;
   if(!supported||reduced.matches||!to||(from&&from.path===to.path)){transition.skipTransition();clear();return}
   let kind=validRecord(stored,from,to)?stored.kind:'quiet';
   if(!topTarget(to)||win.scrollY>8||navType()==='back_forward')kind='quiet';
   // A cold or missing photograph must load normally, never freeze as a blank snapshot.
   if(kind!=='quiet'&&!mediaReady()){transition.skipTransition();clear();return}
   root.dataset.wilsPageArrival=to.role==='home'?'home':'inner';
   emit('wils:page-arrival');settleLegacy();
   prepare(kind);begin(transition,'incoming');
  }
  function intent(event){
   if(reduced.matches||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const link=event.target?.closest?.('a[href]');
   if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
   const target=route(link.href,base);
   if(!target||!images[target.role]||warm.has(target.role))return;
   const image=new win.Image();image.decoding='async';image.src=new URL(images[target.role],base).href;
   warm.set(target.role,image);
  }
  if(supported){
   root.dataset.wilsTransitions='106';
   optIn=doc.createElement('style');optIn.dataset.wilsTransitionOptIn='106';
   optIn.media='(prefers-reduced-motion: no-preference)';optIn.textContent='@view-transition{navigation:auto}';doc.head.append(optIn);
   incomingHint();
   win.addEventListener('pageswap',swap);win.addEventListener('pagereveal',reveal);
   doc.addEventListener('pointerover',intent,{passive:true});doc.addEventListener('pointerdown',intent,{passive:true});doc.addEventListener('focusin',intent);
  }
  // A visitor who starts scrolling needs the live destination immediately.
  // Keep ordinary arrivals and outgoing native captures on their authored clock.
  function interruptIncoming(){if(active?.phase==='incoming')stop()}
  win.addEventListener('scroll',interruptIncoming,{passive:true});
  win.addEventListener('wheel',interruptIncoming,{passive:true});
  win.addEventListener('touchmove',interruptIncoming,{passive:true});
  win.addEventListener('keydown',event=>{
   if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey)return;
   if(!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key))return;
   if(event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))return;
   interruptIncoming();
  });
  win.addEventListener('resize',()=>{if(active)stop()},{passive:true});
  win.addEventListener('hashchange',()=>{if(active)stop()});
  win.addEventListener('pagehide',()=>{if(active?.phase!=='outgoing')stop()});
  win.addEventListener('pageshow',event=>{if(!event.persisted)return;if(active?.phase==='outgoing')stop();else if(!active)clear()});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden){if(active?.phase==='incoming')stop();else if(!active)clear()}});
  reduced.addEventListener('change',()=>{if(reduced.matches)stop()});
  return {version:VERSION,supported,inspect:()=>({active:!!active,kind:root.dataset.wilsTransition||null,names:named.size}),stop};
 }
 return {route,topTarget,plan,init};
});
