/* P.WILS V67. One owner for inner-page entrances; home/story controllers stay independent. */
(() => {
 'use strict';
 const root=document.documentElement,body=document.body;
 if(!body.classList.contains('inner-page')||!body.hasAttribute('data-site-motion-page'))return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const records=new Map(),pending=new Set();
 const ease={body:'cubic-bezier(.22,1,.36,1)',heading:'cubic-bezier(.16,1,.3,1)',media:'cubic-bezier(.22,1,.36,1)'};
 const mediaPlans=new Map(),captionOwners=new Map();
 let observer,frame=0,previousWidth=innerWidth;
 const deepLink=!!location.hash&&location.hash!=='#top';
 const excluded='#request-controls,#request-review,#request-error-summary,.pg-product-entry,.company-archive,[data-archive-image],.route-map,.quality-identification-mark';
 const bounds=node=>node.getBoundingClientRect();
 function eligible(node,box){return node&&!node.closest('[hidden],[inert]')&&!node.closest(excluded)&&(box||bounds(node)).height>0}
 function setState(record,state){record.state=state;record.node.setAttribute('data-site-motion-state',state)}
 function planMedia(node){
  const image=node?.querySelector('img');
  if(!image)return null;
  const figure=node.matches('figure')?node:node.closest('figure');
  const simple=figure&&figure.querySelectorAll('img').length===1&&!figure.querySelector('a,button,input,select,textarea,details');
  const caption=simple?figure.querySelector(':scope > figcaption'):null;
  const source=image.getAttribute('src')||'';
  const evidence=node.matches('.page-banner-media,.company-director-photo,.quality-source-photo,.quality-equipment')||
   !!node.closest('.company-technical-images')||/\/(?:products|history)\//.test(source);
  const plan={image,caption,group:simple?figure:node,mode:!evidence&&simple?'composition':'exposure'};
  mediaPlans.set(node,plan);
  if(caption)captionOwners.set(caption,node);
  return plan;
 }
 function ownClass(record,node,name){
  if(!node.classList.contains(name)){node.classList.add(name);record.classes.push([node,name])}
 }
 function prepareMedia(record){
  const plan=record.media=mediaPlans.get(record.node)||planMedia(record.node);
  if(!plan)return false;
  record.duration=plan.mode==='composition'?520:480;
  if(plan.caption)ownClass(record,plan.caption,'site-motion-caption');
  if(plan.mode==='composition'){ownClass(record,plan.group,'site-motion-composition');return true}
  const host=record.node,box=bounds(host),photo=bounds(plan.image);
  // Keep evidence and its crop fixed. The layer occupies the photograph only,
  // even when a legacy media annotation sits on a figure with its caption.
  if(!photo.width||!photo.height)return true;
  const hostStyle=getComputedStyle(host),photoStyle=getComputedStyle(plan.image);
  if(!hostStyle.position||hostStyle.position==='static')ownClass(record,host,'site-motion-exposure-host');
  const layer=document.createElement('span');layer.className='site-motion-exposure';layer.setAttribute('aria-hidden','true');
  layer.style.left=(photo.left-box.left-(host.clientLeft||0)+(host.scrollLeft||0))+'px';
  layer.style.top=(photo.top-box.top-(host.clientTop||0)+(host.scrollTop||0))+'px';
  layer.style.width=photo.width+'px';layer.style.height=photo.height+'px';
  layer.style.borderRadius=photoStyle.borderRadius&&photoStyle.borderRadius!=='0px'?photoStyle.borderRadius:(hostStyle.borderRadius||'0px');
  layer.style.opacity='.18';host.append(layer);record.exposure=layer;
  return true;
 }
 function finish(record){
  if(!record||record.state==='complete')return;
  pending.delete(record);
  setState(record,'complete');clearTimeout(record.watchdog);
  record.animations.forEach(animation=>animation.cancel());record.animations=[];
  if(record.kind!=='media'){record.node.style.removeProperty('opacity');record.node.style.removeProperty('transform')}
  record.exposure?.remove();record.exposure=null;
  record.classes.forEach(([node,name])=>node.classList.remove(name));record.classes=[];
  if(record.original!==undefined){
   record.node.innerHTML=record.original;
   if(record.label===null)record.node.removeAttribute('aria-label');else record.node.setAttribute('aria-label',record.label);
   record.original=undefined;
  }
  observer?.unobserve(record.node);
 }
 function splitHeading(record){
  const node=record.node;
  if(node.querySelector('a,button,input,select,textarea')||!document.createRange)return false;
  const rows=[],walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
  let text;
  while((text=walker.nextNode())){
   const regex=/(\s*)(\S+)/g;let match;
   while((match=regex.exec(text.textContent))){
    const range=document.createRange();range.setStart(text,match.index+match[1].length);range.setEnd(text,regex.lastIndex);
    const top=range.getBoundingClientRect().top;
    let row=rows.find(item=>Math.abs(item.top-top)<4);
    if(!row){row={top,tokens:[]};rows.push(row)}
    row.tokens.push({space:match[1],value:match[2],accent:!!text.parentElement.closest('.brand-period')});
   }
  }
  if(!rows.length)return false;
  record.original=node.innerHTML;record.label=node.getAttribute('aria-label');
  const label=node.textContent.replace(/\s+/g,' ').trim();
  node.replaceChildren();node.setAttribute('aria-label',label);record.inks=[];
  for(const row of rows){
   const mask=document.createElement('span'),ink=document.createElement('span');
   mask.className='site-motion-line';ink.className='site-motion-ink';mask.setAttribute('aria-hidden','true');
   row.tokens.forEach((token,i)=>{if(i&&token.space)ink.append(' ');const span=document.createElement('span');span.textContent=token.value;if(token.accent)span.className='brand-period';ink.append(span)});
   ink.style.transform='translate3d(0,22px,0)';ink.style.opacity='0';mask.append(ink);node.append(mask);record.inks.push(ink);
  }
  return true;
 }
 function register(node,kind,{delay=0,duration=kind==='heading'?520:kind==='media'?520:440,distance=12}={}){
  if(!node||records.has(node))return;
  const box=bounds(node);
  if(!eligible(node,box))return;
  const record={node,kind,delay,duration,distance,state:'new',animations:[],classes:[],watchdog:0};records.set(node,record);pending.add(record);
  if(reduced.matches||!node.animate||!observer||box.bottom<=0||(deepLink&&box.top<innerHeight*.94)||(root.dataset.wilsPageArrival&&box.top<innerHeight)){finish(record);return}
  try{
   setState(record,'pending');
   if(kind==='heading'&&splitHeading(record)){}
   else if(kind==='media'){if(!prepareMedia(record)){finish(record);return}}
   else{record.kind='body';node.style.opacity='0';if(distance)node.style.transform=`translate3d(0,${distance}px,0)`}
   observer.observe(node);
   if(box.top<innerHeight*.93)start(record,box);
  }catch{finish(record)}
 }
 function start(record,box){
  if(record.state!=='pending'||!eligible(record.node,box))return;
  setState(record,'playing');
  try{
   const options={duration:record.duration,delay:record.delay,fill:'both'};
   if(record.inks){record.inks.forEach((ink,i)=>record.animations.push(ink.animate([{opacity:0,transform:'translate3d(0,22px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{...options,delay:record.delay+i*70,easing:ease.heading})))}
   else if(record.media){
    const plan=record.media;
    if(plan.mode==='composition')record.animations.push(plan.group.animate([{opacity:.66,transform:'translate3d(0,8px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{...options,easing:ease.media}));
    else if(record.exposure)record.animations.push(record.exposure.animate([{opacity:.18},{opacity:0}],{...options,easing:ease.media}));
    if(plan.caption)record.animations.push(plan.caption.animate([{opacity:.2},{opacity:1}],{...options,duration:400,delay:record.delay+50,easing:ease.media}));
   }
   else{record.animations.push(record.node.animate([{opacity:0,transform:`translate3d(0,${record.distance}px,0)`},{opacity:1,transform:'translate3d(0,0,0)'}],{...options,easing:ease.body}))}
   record.watchdog=setTimeout(()=>finish(record),record.duration+record.delay+(record.inks?Math.max(0,record.inks.length-1)*70:0)+160);
   Promise.all(record.animations.map(animation=>animation.finished.catch(()=>{}))).then(()=>finish(record));
  }catch{finish(record)}
 }
 function reconcile(){
  frame=0;
  // Capture every geometry before starting/finishing any unit. Restoring a
  // heading or removing a media layer must not force layout for the next read.
  const snapshots=[...pending].map(record=>({record,box:bounds(record.node),blocked:!!record.node.closest('[hidden],[inert]')}));
  for(const {record,box,blocked} of snapshots){
   if(record.state==='complete'||!box.height||blocked)continue;
   if(box.bottom<=0)finish(record);
   else if(box.top<innerHeight*.93)start(record,box);
  }
 }
 function schedule(){if(pending.size&&!frame)frame=requestAnimationFrame(reconcile)}
 function settleVisible(){
  const snapshots=[...pending].map(record=>({record,box:bounds(record.node)}));
  for(const {record,box} of snapshots){
   if(box.height&&box.top<innerHeight)finish(record);
  }
  schedule();
 }
 function settleAll(){[...pending].forEach(finish)}
 function resize(){
  if(innerWidth===previousWidth){schedule();return}
  previousWidth=innerWidth;
  for(const [node,record] of [...records]){
   if(record.state==='complete')continue;
   const box=bounds(node);
   if(record.state==='playing'||(box.height&&box.top<innerHeight*.94)){finish(record);continue}
   // Remeasure a future unit without spending its first appearance.
   finish(record);records.delete(node);
   register(node,record.kind,{delay:record.delay,duration:record.duration,distance:record.distance});
  }
  schedule();
 }
 function reflowHeadings(){
  for(const [node,record] of [...records]){
   if(!record.inks||record.state==='complete')continue;
   const pending=record.state==='pending';
   finish(record);
   if(pending){records.delete(node);register(node,'heading',{delay:record.delay,duration:record.duration,distance:record.distance})}
  }
  schedule();
 }
 try{
  if('IntersectionObserver'in window)observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){const record=records.get(entry.target);if(record)start(record,entry.boundingClientRect)}}),{rootMargin:'0px 0px -7% 0px',threshold:.04});
  const hero=document.querySelector('[data-page-hero]');
  // Determine caption ownership before any body/heading can prepare it.
  if(hero?.querySelector('.page-banner-media'))planMedia(hero.querySelector('.page-banner-media'));
  for(const node of document.querySelectorAll('[data-site-motion="media"]'))if(eligible(node))planMedia(node);
  if(hero){
   register(hero.querySelector('.page-banner-media'),'media');
   register(hero.querySelector('h1'),'heading',{delay:100});
  }
  // One short header entrance, matching the home; never hide chrome on a deeplink.
  if(!deepLink)register(document.querySelector('.site-header'),'body',{duration:260,distance:0,delay:80});
  for(const node of document.querySelectorAll('[data-site-motion]')){
   const caption=node.matches('figcaption')?node:node.closest('figcaption');
   if(caption&&captionOwners.has(caption))continue;
   const kind=node.getAttribute('data-site-motion');
   const owner=node.parentElement?.closest('[data-site-motion]');
   if(owner&&['body','sequence'].includes(owner.getAttribute('data-site-motion')))continue;
   if(kind==='sequence'){
    [...node.children].forEach((child,i)=>register(child,'body',{distance:8,duration:400,delay:(i%3)*60}));
   }else register(node,kind,{delay:kind==='body'?45:0});
  }
  root.setAttribute('data-site-motion-ready','');
 }catch{settleAll()}
 addEventListener('scroll',schedule,{passive:true});
 // Native page snapshots own the first viewport; future scroll entries keep their owner.
 addEventListener('wils:page-arrival',settleVisible);
 addEventListener('wils:page-snapshot',settleVisible);
 addEventListener('hashchange',settleVisible);
 addEventListener('popstate',settleVisible);
 addEventListener('pageshow',event=>{if(event.persisted)settleAll();else schedule()});
 addEventListener('load',schedule,{once:true});
 addEventListener('resize',resize,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)settleVisible()});
 document.addEventListener('focusin',event=>{records.forEach(record=>{if(record.node===event.target||record.node.contains(event.target)||record.media?.group.contains(event.target))finish(record)})});
 // loadingdone owns font reflow; readiness must not repeat the same rebuild.
 document.fonts?.ready.then(schedule);
 document.fonts?.addEventListener?.('loadingdone',reflowHeadings);
 reduced.addEventListener('change',()=>{if(reduced.matches)settleAll();else schedule()});
 schedule();
})();
