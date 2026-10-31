/* The product register and its inquiry stay on one page. Shared form logic
   remains in contact-composer.js; this adapter only adds product context. */
(() => {
  'use strict';
  const form=document.getElementById('request-form');
  const section=document.getElementById('aanvraag');
  const controls=document.getElementById('request-controls');
  if(!form || !section || !controls || controls.disabled)return;

  const get=id=>document.getElementById(id);
  const products=Array.isArray(window.WILS_PRODUCTS)?window.WILS_PRODUCTS:[];
  const knownProducts=new Map(products.map(product=>[product.slug,product]));
  const checkboxes=new Map([...form.querySelectorAll('input[name="product"]')].map(input=>[input.value,input]));
  const topics=new Set([...get('request-subject').options].map(option=>option.value));
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const status=section.querySelector('.pg-inquiry-status');

  // This page is exclusively a product inquiry. A copied contact URL must
  // never turn a hidden routing control into a quality or logistics request.
  function useProductDepartment(){
    const department=get('request-department');
    department.value='verkoop';
    department.dispatchEvent(new Event('change',{bubbles:true}));
  }
  useProductDepartment();

  function syncPhoneLabel(){
    const phone=get('request-phone');
    const label=form.querySelector('label[for="request-phone"]');
    if(!label)return;
    label.textContent=phone.required?'Telefoonnummer':'Telefoonnummer (optioneel)';
    if(phone.required){
      const required=document.createElement('span');
      required.setAttribute('aria-hidden','true');
      required.textContent=' *';
      label.append(required);
    }
  }
  form.querySelectorAll('input[name="followup"]').forEach(input=>input.addEventListener('change',syncPhoneLabel));
  syncPhoneLabel();

  // Restore the input view before adding context. The shared edit action keeps
  // all typed values, validation state and previous product selections intact.
  function openInquiry(){
    if(!get('request-review').hidden)get('request-edit').click();
    useProductDepartment();
    const hash='#aanvraag';
    if(location.hash!==hash)history.pushState(null,'',hash);
    section.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
    get('request-message').focus({preventScroll:true});
  }

  document.addEventListener('click',event=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
    const link=event.target.closest?.('a[data-inquire-product],a[data-inquire-topic]');
    if(!link || link.hasAttribute('download') || (link.target && link.target!=='_self'))return;
    const slug=link.dataset.inquireProduct;
    const checkbox=slug?checkboxes.get(slug):null;
    const product=slug?knownProducts.get(slug):null;
    const topic=link.dataset.inquireTopic;
    // Unknown product links retain their ordinary anchor behavior.
    if(slug && (!checkbox || !product))return;
    event.preventDefault();
    if(!get('request-review').hidden)get('request-edit').click();
    useProductDepartment();
    if(checkbox){
      const alreadySelected=checkbox.checked;
      checkbox.checked=true;
      checkbox.dispatchEvent(new Event('change',{bubbles:true}));
      if(status)status.textContent=product.shortName+(alreadySelected?' staat al bij uw vraag.':' is toegevoegd aan uw vraag.');
    }else if(status){
      status.textContent=topic==='verpakking'?'Vermeld uw gewenste verpakking bij uw vraag.':topic==='vetgehalte'?'Vermeld uw gewenste vetgehalte bij uw vraag.':topic==='snit'?'Vermeld uw gewenste uitvoering bij uw vraag.':'';
    }
    if(topic && topics.has(topic)){
      get('request-subject').value=topic;
      get('request-subject').dispatchEvent(new Event('change',{bubbles:true}));
    }
    openInquiry();
  });
})();
