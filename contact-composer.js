(() => {
  'use strict';
  const form=document.getElementById('request-form');if(!form)return;
  const core=window.WILS_COMPOSER,products=window.WILS_PRODUCTS;
  if(!core || !Array.isArray(products))return;
  const get=id=>document.getElementById(id),controls=get('request-controls'),review=get('request-review');
  const context=core.context(location.search,products,form.dataset.defaultDepartment);
  const selected=new Set(context.products),productMap=new Map(products.map(p=>[p.slug,p]));
  get('request-department').value=context.department;get('request-subject').value=context.topic;
  if(context.document){get('request-department').value='kwaliteit';get('request-document').value={brcgs:'BRCGS-certificaat','beter-leven':'Beter Leven-certificaat',acs:'ACS-certificaat',ikb:'IKB-certificaat'}[context.document]}
  let latest=null,attempted=false;
  const value=id=>get(id).value.trim();
  function fieldError(field,message){
    const error=get(field.id+'-error');field.setCustomValidity(message||'');
    if(message)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
    if(error){error.hidden=!message;error.textContent=message||''}
  }
  function validate(field){
    let message='';
    if(field.required&&!field.value.trim())message={'request-name':'Vul uw naam in.','request-email':'Vul uw e-mailadres in.','request-message':'Beschrijf uw vraag kort.','request-phone':'Vul uw telefoonnummer met landcode in, of verwijder uw verzoek om telefonisch contact.'}[field.id]||'Vul dit veld in.';
    else if(field.type==='email'&&field.validity.typeMismatch)message='Controleer uw e-mailadres, bijvoorbeeld naam@bedrijf.be.';
    else if(field.id==='request-phone'&&field.value.trim()&&field.value.replace(/\D/g,'').length<6)message='Controleer uw telefoonnummer en vermeld de landcode.';
    fieldError(field,message);return !message;
  }
  function renderProducts(){
    const list=get('request-context-list');list.replaceChildren();
    for(const product of products.filter(p=>selected.has(p.slug))){
      const row=document.createElement('div');row.className='request-context-row';
      const label=document.createElement('p');label.textContent=product.name;const code=document.createElement('span');code.textContent=product.code;label.append(code);
      const remove=document.createElement('button');remove.type='button';remove.className='text-link';remove.textContent='Verwijderen';remove.setAttribute('aria-label',product.name+' verwijderen');
      remove.addEventListener('click',()=>{selected.delete(product.slug);renderProducts();get('request-products').open=true;form.querySelector(`input[name="product"][value="${product.slug}"]`)?.focus({preventScroll:true})});
      row.append(label,remove);list.append(row);
    }
    get('request-context').hidden=!selected.size;
    form.querySelectorAll('input[name="product"]').forEach(input=>input.checked=selected.has(input.value));
  }
  function departmentChanged(){
    const key=get('request-department').value,destination=core.route(key);
    get('request-product-topic-field').hidden=key!=='verkoop';
    form.querySelectorAll('[data-for-departments]').forEach(el=>el.hidden=!el.dataset.forDepartments.split(' ').includes(key));
    get('request-products').hidden=!['verkoop','kwaliteit','logistiek'].includes(key)&&!selected.size;
    get('request-recipient-hint').textContent=`Uw bericht wordt voorbereid aan ${destination.recipient}. Uw gekozen afdeling komt in het onderwerp.`;
    get('request-message-help').textContent=key==='kwaliteit'?'Vermeld bij een bestaande levering de productcode, etiketgegevens en leveringsreferentie.':key==='logistiek'?'Beschrijf uw levering, afhaling of aankomst. Een afspraak wordt eerst besproken.':'Vul alleen in wat u al weet.';
  }
  function revealProductTopic(){
    if(get('request-department').value==='verkoop'&&['snit','vetgehalte','verpakking','levering'].includes(get('request-subject').value))get('request-specifications').open=true;
  }
  function updatePhone(){
    const call=form.querySelector('input[name="followup"][value="telefonisch"]').checked;
    get('request-phone').required=call;get('request-phone').setAttribute('aria-required',String(call));
    get('request-phone-help').textContent=call?'Vul uw telefoonnummer met landcode in voor telefonisch contact.':'Een telefoonnummer is alleen nodig als u telefonisch contact wenst.';
    if(!call)fieldError(get('request-phone'),'');
  }
  const commonFields=[['request-country','Land'],['request-company-type','Type bedrijf'],['request-address','Bedrijfsadres'],['request-postcode','Postcode'],['request-city','Gemeente']];
  const specificFields={verkoop:[['request-cut','Snit of samenstelling'],['request-fat','Gewenst vetgehalte'],['request-packaging','Verpakking en gewicht'],['request-state','Levertoestand'],['request-quantity','Hoeveelheid of frequentie'],['request-timing','Gewenste timing']],kwaliteit:[['request-document','Gevraagd document'],['request-lot','Etiket- of lotgegevens'],['request-quality-reference','Leveringsreferentie']],logistiek:[['request-logistic-reference','Leverings- of afhaalreferentie'],['request-arrival','Gewenste aankomst']]};
  function collect(){const department=get('request-department').value;return {department,topic:get('request-subject').value,products:products.filter(p=>selected.has(p.slug)),message:value('request-message'),fields:[...commonFields,...(specificFields[department]||[])].map(([id,label])=>[label,value(id)]).filter(([,v])=>v),followups:[...form.querySelectorAll('input[name="followup"]:checked')].map(i=>i.value),contact:[['Naam',value('request-name')],['Bedrijf',value('request-company')],['E-mailadres',value('request-email')],['Telefoon',value('request-phone')]]}}
  function showReview(){
    latest=core.build(collect());get('request-review-text').value=latest.text;
    get('request-review-recipient').textContent=latest.recipient;get('request-review-recipient').href='mailto:'+latest.recipient;
    get('request-routing-note').textContent=latest.fallback?'Voor deze afdelingsvraag gebruikt u de algemene mailbox. De gekozen afdeling staat in het bericht.':'De gekozen afdeling en uw vraag staan in het bericht.';
    get('request-open-email').href=latest.mailto;get('request-open-email').hidden=latest.tooLong;
    get('request-length-note').hidden=!latest.tooLong;get('request-download').className=latest.tooLong?'action-primary action':'text-link';
    get('request-action-status').textContent='';controls.hidden=true;review.hidden=false;get('request-review-title').focus();
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();attempted=true;updatePhone();const required=['request-name','request-email','request-message','request-phone'].map(get);
    const invalid=required.filter(field=>!validate(field));const summary=get('request-error-summary');summary.hidden=!invalid.length;
    if(invalid.length){summary.textContent='Controleer de gemarkeerde velden. Uw ingevulde gegevens blijven beschikbaar zolang deze pagina open is.';invalid.forEach(field=>{const group=field.closest('details');if(group)group.open=true});invalid[0].focus();return}
    showReview();
  });
  form.querySelectorAll('input[name="product"]').forEach(input=>input.addEventListener('change',()=>{if(input.checked)selected.add(input.value);else selected.delete(input.value);renderProducts()}));
  form.querySelectorAll('input[name="followup"]').forEach(input=>input.addEventListener('change',updatePhone));
  ['request-name','request-email','request-message','request-phone'].forEach(id=>get(id).addEventListener('input',()=>{if(attempted)validate(get(id))}));
  get('request-department').addEventListener('change',departmentChanged);
  get('request-subject').addEventListener('change',revealProductTopic);
  get('request-edit').addEventListener('click',()=>{
    review.hidden=true;controls.hidden=false;
    const department=get('request-department');
    // Product inquiries retain department routing inside a hidden compatibility
    // group; restore focus to the visible question rather than that select.
    const target=department.closest('[hidden]')?get('request-message'):department;
    target.focus();
  });
  get('request-open-email').addEventListener('click',()=>{get('request-action-status').textContent='Het e-mailconcept is aangeboden aan uw e-mailprogramma. Controleer het daar en verstuur het zelf. Vanuit deze website is niets verzonden.'});
  get('request-download').addEventListener('click',()=>{
    if(!latest)return;const blob=new Blob([latest.text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='wils-productvraag.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);get('request-action-status').textContent='Download gestart. Gebruik de volledige tekst voor een e-mail aan '+latest.recipient+'.';
  });
  get('request-copy').addEventListener('click',async()=>{
    if(!latest)return;try{await navigator.clipboard.writeText(latest.text);get('request-action-status').textContent='Bericht gekopieerd. Plak het in uw e-mail en verstuur het naar '+latest.recipient+'.'}catch{get('request-review-text').focus();get('request-review-text').select();get('request-action-status').textContent='Kopiëren is niet gelukt. Selecteer de tekst hierboven of download het tekstbestand.'}
  });
  renderProducts();departmentChanged();revealProductTopic();updatePhone();controls.disabled=false;
})();
