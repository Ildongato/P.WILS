(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){root.WILS_REQUEST=api;api.init(root)}
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const departments={
    algemeen:{label:"General enquiry",recipient:'info@vleesbedrijf-wils.be'},
    verkoop:{label:"Products, quotes or custom specifications",recipient:'Luca.wils@vleesbedrijf-wils.be'},
    logistiek:{label:"Logistics / production",recipient:'info@vleesbedrijf-wils.be'},
    kwaliteit:{label:"Quality / documentation",recipient:'quality@vleesbedrijf-wils.be'},
    hr:{label:"HR / administration",recipient:'info@vleesbedrijf-wils.be'},
    boekhouding:{label:"Accounts",recipient:'finance@vleesbedrijf-wils.be'},
    techniek:{label:"Technical services",recipient:'td@vleesbedrijf-wils.be'},
    directie:{label:"Management",recipient:'eric.wils@vleesbedrijf-wils.be'}
  };
  const documents={brcgs:"BRCGS certificate",'beter-leven':"Beter Leven certificate",acs:"ACS certificate",ikb:"IKB certificate"};
  const specificationLabels={cut:"Cut or composition",fat:"Target fat content",packaging:"Packaging and weight",state:"Fresh or frozen",quantity:"Quantity or frequency",timing:"Preferred timing"};
  const stateLabels={Vers:'Fresh',Bevroren:'Frozen'};
  const topics=new Set(['snit','vetgehalte','verpakking','levering','productspecificatie','algemeen']);
  const topicFields={snit:'cut',vetgehalte:'fat',verpakking:'packaging',levering:'timing',productspecificatie:'cut'};
  const has=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
  const clean=value=>wellFormed(value==null?'':value).trim();
  function wellFormed(value){
    const text=String(value==null?'':value);if(text.toWellFormed)return text.toWellFormed();
    let result='';
    for(let i=0;i<text.length;i++){
      const code=text.charCodeAt(i);
      if(code>=0xD800&&code<=0xDBFF){const next=text.charCodeAt(i+1);if(next>=0xDC00&&next<=0xDFFF)result+=text[i]+text[++i];else result+='\uFFFD'}
      else if(code>=0xDC00&&code<=0xDFFF)result+='\uFFFD';else result+=text[i];
    }
    return result;
  }
  function route(key){const department=has(departments,key)?key:'algemeen';return {key:department,...departments[department]}}
  function context(search,products=[],defaultDepartment='algemeen'){
    const params=new URLSearchParams(search),raw=params.get('afdeling'),rawDocument=params.get('document'),rawTopic=params.get('onderwerp');
    const known=new Set((Array.isArray(products)?products:[]).filter(product=>product&&typeof product.slug==='string').map(product=>product.slug));
    const selected=[...new Set(params.getAll('product').filter(slug=>known.has(slug)))];
    const document=has(documents,rawDocument)?rawDocument:'',topic=topics.has(rawTopic)?rawTopic:'';
    const department=document?'kwaliteit':has(departments,raw)?raw:selected.length||(topic&&topic!=='algemeen')?'verkoop':route(defaultDepartment).key;
    return {department,products:selected,document,topic,message:document?"I would like a copy of the "+documents[document]+'.':''};
  }
  function validate(data={}){
    const errors={},name=String(data.name||'').trim(),email=String(data.email||'').trim(),message=String(data.message||'').trim();
    if(!message)errors.message="Briefly describe your enquiry.";else if(message.length>6000)errors.message="Use no more than 6,000 characters for your enquiry.";
    if(!name)errors.name="Enter your name.";else if(name.length>160)errors.name="Use no more than 160 characters for your name.";
    if(!email)errors.email="Enter your email address.";
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160)errors.email="Check your email address, for example name@company.be.";
    if(String(data.company||'').length>160)errors.company="Use no more than 160 characters for the company name.";
    const phone=String(data.phone||'').trim();
    if(phone&&(phone.replace(/\D/g,'').length<6||phone.length>160))errors.phone="Check your phone number and include the country code.";
    // Switching to another subject retains these inputs in the form, but they
    // must neither block nor enter a question to a different department.
    if(route(data.department).key==='verkoop'){
      const specifications=data.specifications||{};
      Object.keys(specificationLabels).forEach(key=>{
        if(String(specifications[key]||'').length>160)errors[key]="Use no more than 160 characters.";
      });
      if(specifications.state&&!['Vers','Bevroren'].includes(specifications.state))errors.state="Choose fresh or frozen, or leave this field blank.";
    }
    return errors;
  }
  function build(data={}){
    const destination=route(data.department),lines=["Topic: "+destination.label,'',"Your enquiry:",clean(data.message)];
    if(destination.key==='verkoop'){
      const products=(Array.isArray(data.products)?data.products:[]).filter(product=>product&&clean(product.name||product.shortName));
      const unique=[...new Map(products.map(product=>[product.slug||product.name,product])).values()];
      if(unique.length)lines.push('',"Products:",...unique.map(product=>'- '+clean(product.name||product.shortName)+(clean(product.code)?" (product code "+clean(product.code)+')':'')));
      const specifications=data.specifications||{},specified=Object.entries(specificationLabels).filter(([key])=>clean(specifications[key]));
      if(specified.length)lines.push('',"Requested specifications:",...specified.map(([key,label])=>label+': '+clean(key==='state'?(stateLabels[specifications[key]]||''):specifications[key])));
    }
    const details=[["Name",data.name],["Company",data.company],["Email address",data.email],["Phone",data.phone]].filter(([,value])=>clean(value));
    lines.push('',"Contact details:",...details.map(([label,value])=>label+': '+clean(value)));
    const text=wellFormed(lines.join('\n')),subject="Enquiry to Wils | "+destination.label;
    const mailto='mailto:'+destination.recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);
    return {...destination,text,subject,mailto};
  }
  function init(win){
    const doc=win.document,get=id=>doc.getElementById(id),form=get('request-form');
    if(!form||form.dataset.requestForm!=='87'||form.dataset.requestFormReady==='87')return null;
    const requiredIds=['request-controls','request-email-help','request-department','request-message','request-name','request-email','request-company','request-phone','request-product-fields','request-cut','request-fat','request-packaging','request-state','request-quantity','request-timing','request-error-summary','request-recipient-hint','request-email-recipient','request-email-text','request-open-email','request-copy','request-download','request-action-status','request-fallback-status'];
    if(requiredIds.some(id=>!get(id)))return null;
    form.dataset.requestFormReady='87';
    const productMode=form.dataset.requestMode==='product',department=get('request-department'),controls=get('request-controls'),emailHelp=get('request-email-help'),productFields=get('request-product-fields');
    const names=['message','name','email','company','phone'],specNames=Object.keys(specificationLabels);
    const fields=[...names,...specNames].map(name=>get('request-'+name));
    const checkboxes=[...form.querySelectorAll('input[name="product"]')],checkboxBySlug=new Map(checkboxes.map(input=>[input.value,input]));
    const catalog=Array.isArray(win.WILS_PRODUCTS)?win.WILS_PRODUCTS:[],knownProducts=new Map(catalog.filter(product=>product&&typeof product.slug==='string').map(product=>[product.slug,product]));
    // The server-rendered choices carry the same canonical data. They keep a
    // selected product explicit if the separate catalog script cannot load.
    checkboxes.forEach(input=>{
      if(!knownProducts.has(input.value)&&input.dataset.productName)knownProducts.set(input.value,{slug:input.value,name:input.dataset.productName,shortName:input.dataset.productShortName||input.dataset.productName,code:input.dataset.productCode||''});
    });
    const products=[...knownProducts.values()];
    const navigation=win.performance&&win.performance.getEntriesByType?win.performance.getEntriesByType('navigation')[0]:null;
    const defaultDepartment=productMode?'verkoop':'algemeen';
    const pristine=!fields.some(field=>field.value)&&!checkboxes.some(input=>input.checked)&&department.value===defaultDepartment;
    let latest=null,attempted=false;
    const sales=()=>productMode||department.value==='verkoop';
    const selectedProducts=()=>checkboxes.filter(input=>input.checked&&knownProducts.has(input.value)).map(input=>knownProducts.get(input.value));
    function collect(){
      if(productMode)department.value='verkoop';
      const data=Object.fromEntries(['department',...names].map(name=>[name,get('request-'+name).value.trim()]));
      data.products=sales()?selectedProducts():[];
      data.specifications=sales()?Object.fromEntries(specNames.map(name=>[name,get('request-'+name).value.trim()])):{};
      return data;
    }
    function setFieldError(field,message){
      field.setCustomValidity(message||'');
      if(message)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
      const error=get(field.id+'-error');if(error){error.textContent=message||'';error.hidden=!message}
    }
    function refreshErrors(){
      const errors=attempted?validate(collect()):{};
      fields.forEach(field=>setFieldError(field,errors[field.id.replace('request-','')]));
      const summary=get('request-error-summary');summary.hidden=!Object.keys(errors).length;
      if(!summary.hidden)summary.textContent="Check the marked fields. Your entries are kept while this page is open.";
      return errors;
    }
    function syncProductContext(){
      const selected=selectedProducts(),contextSection=get('request-context'),list=get('request-context-list');
      if(contextSection)contextSection.hidden=!sales()||!selected.length;
      if(list){
        list.textContent='';
        selected.forEach(product=>{const item=doc.createElement('li');item.textContent=clean(product.shortName||product.name)+(clean(product.code)?' · '+clean(product.code):'');list.appendChild(item)});
      }
    }
    function departmentChanged(){
      clearDraft();
      if(productMode)department.value='verkoop';
      const destination=route(department.value),isProduct=destination.key==='verkoop';
      productFields.hidden=!isProduct;productFields.disabled=!isProduct;
      const topicField=get('request-topic-field');if(topicField)topicField.hidden=productMode;
      get('request-recipient-hint').textContent="An email draft will be addressed to "+destination.recipient+". You send the message from your email app.";
      const help=get('request-message-help');
      if(help)help.textContent=isProduct?"Describe your enquiry and add any product or specification details you already know.":destination.key==='kwaliteit'?"For a delivery enquiry, include the product code, label details and delivery reference.":destination.key==='logistiek'?"For a delivery or collection, include the reference and preferred arrival time.":"Describe your enquiry with the details you have so far.";
      syncProductContext();refreshErrors();
    }
    function openTopic(topic){
      if(!topic||!topics.has(topic)||topic==='algemeen')return;
      const specifications=get('request-specifications');if(specifications)specifications.open=true;
    }
    // Native browser restoration owns entered values, including disclosures and
    // product choices. Only an untouched, newly navigated form receives a seed.
    if(pristine&&(!navigation||navigation.type!=='back_forward')){
      const seed=context(win.location.search,products,defaultDepartment);
      department.value=productMode?'verkoop':seed.department;
      seed.products.forEach(slug=>{const input=checkboxBySlug.get(slug);if(input)input.checked=true});
      if(seed.message&&!productMode)get('request-message').value=seed.message;
      if(sales())openTopic(seed.topic);
    }
    function selectDraftText(){const text=get('request-email-text');text.focus();text.select()}
    function clearDraft(){
      latest=null;emailHelp.hidden=true;emailHelp.open=false;
      get('request-action-status').textContent='';get('request-fallback-status').textContent='';
    }
    function offerDraft(){
      get('request-action-status').textContent="The draft opens in your email app, where you can send it.";
    }
    function edit(focus=true){
      clearDraft();
      if(focus)get('request-message').focus();
    }
    form.addEventListener('submit',event=>{
      event.preventDefault();clearDraft();attempted=true;
      const data=collect(),errors=refreshErrors(),invalid=fields.filter(field=>has(errors,field.id.replace('request-',''))).sort((a,b)=>a.compareDocumentPosition(b)&4?-1:1);
      if(invalid.length){
        if(specNames.some(name=>has(errors,name))){const specifications=get('request-specifications');if(specifications)specifications.open=true}
        invalid[0].focus();return;
      }
      latest=build(data);
      get('request-email-text').value=latest.text;
      const recipient=get('request-email-recipient');recipient.textContent=latest.recipient;recipient.href='mailto:'+latest.recipient;
      get('request-open-email').href=latest.mailto;
      get('request-fallback-status').textContent='';emailHelp.hidden=false;emailHelp.open=false;
      // Keep the complete draft and external-protocol launch in the original
      // submit gesture. The mail application is the place to review and send.
      offerDraft();
      try{win.location.assign(latest.mailto)}catch{
        emailHelp.open=true;
        get('request-action-status').textContent="Your email app could not open. Try opening the draft again or copy the message below.";
      }
    });
    fields.forEach(field=>field.addEventListener('input',()=>{clearDraft();if(attempted)refreshErrors()}));
    get('request-state').addEventListener('change',()=>{clearDraft();if(attempted)refreshErrors()});
    department.addEventListener('change',departmentChanged);
    checkboxes.forEach(input=>input.addEventListener('change',()=>{clearDraft();syncProductContext()}));
    get('request-open-email').addEventListener('click',event=>{
      if(!latest){event.preventDefault();return}
      offerDraft();
    });
    get('request-copy').addEventListener('click',async()=>{
      if(!latest)return;const current=latest;
      try{
        await win.navigator.clipboard.writeText(current.text);
        if(latest===current)get('request-fallback-status').textContent="Message copied. Paste it into your email and send it to "+current.recipient+'.';
      }catch{
        if(latest===current){selectDraftText();get('request-fallback-status').textContent="Could not copy the message. Select the text below or download the text file."}
      }
    });
    get('request-download').addEventListener('click',()=>{
      if(!latest)return;let url='';
      try{
        const blob=new win.Blob([latest.text],{type:'text/plain;charset=utf-8'});url=win.URL.createObjectURL(blob);
        const link=doc.createElement('a');link.href=url;link.download="wils-enquiry.txt";doc.body.appendChild(link);link.click();link.remove();
        win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
        get('request-fallback-status').textContent="Download started. Use the full text to email "+latest.recipient+'.';
      }catch{
        if(url)try{win.URL.revokeObjectURL(url)}catch{}
        selectDraftText();get('request-fallback-status').textContent="Could not download the file. Copy the full text below into an email to "+latest.recipient+'.';
      }
    });
    const inquirySection=get('aanvraag')||get('vraag'),status=doc.querySelector?doc.querySelector('.pg-inquiry-status'):null;
    doc.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest&&event.target.closest('a[data-inquire-product],a[data-inquire-topic]');
      if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self')||!inquirySection)return;
      const rawHref=link.getAttribute('href')||link.href||'';
      // Only a link targeting this page's inquiry is enhanced. Cross-page,
      // modified, unknown and new-tab links retain ordinary browser behavior.
      if(rawHref.charAt(0)!=='#'){
        try{
          const target=new URL(rawHref,win.location.href),current=new URL(win.location.href);
          if(target.origin!==current.origin||target.pathname!==current.pathname)return;
        }catch{return}
      }
      const slug=link.dataset.inquireProduct,topic=link.dataset.inquireTopic;
      const checkbox=slug?checkboxBySlug.get(slug):null,product=slug?knownProducts.get(slug):null;
      if((slug&&(!checkbox||!product))||(!slug&&(!topic||!topics.has(topic))))return;
      if(topic&&!topics.has(topic))return;
      event.preventDefault();edit(false);department.value='verkoop';
      if(checkbox){
        const alreadySelected=checkbox.checked;checkbox.checked=true;
        if(status)status.textContent=clean(product.shortName||product.name)+(alreadySelected?" already in your enquiry.":" added to your enquiry.");
      }else if(status)status.textContent=topic==='verpakking'?"Enter your preferred packaging under Specification and delivery.":topic==='vetgehalte'?"Enter your target fat content under Specification and delivery.":topic==='snit'?"Enter your requested specifications under Specification and delivery.":topic==='levering'?"Enter the quantity and preferred timing under Specification and delivery.":"Add your product enquiry to the form.";
      departmentChanged();openTopic(topic);
      const hash='#'+inquirySection.id;
      if(win.location.hash!==hash&&win.history&&win.history.pushState)win.history.pushState(null,'',hash);
      const reduced=win.matchMedia&&win.matchMedia('(prefers-reduced-motion: reduce)').matches;
      inquirySection.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
      const focus=get('request-'+(topicFields[topic]||'message'));
      try{focus.focus({preventScroll:true})}catch{focus.focus()}
    });
    if(win.addEventListener)win.addEventListener('pageshow',departmentChanged);
    departmentChanged();controls.disabled=false;
    return {collect,departmentChanged,syncProductContext,edit};
  }
  return {departments,documents,route,context,validate,build,wellFormed,init};
});
