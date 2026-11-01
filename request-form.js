(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document){root.WILS_REQUEST=api;api.init(root)}
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const departments={
    algemeen:{label:'Algemene vraag',recipient:'info@vleesbedrijf-wils.be'},
    verkoop:{label:'Producten, offerte of maatwerk',recipient:'Luca.wils@vleesbedrijf-wils.be'},
    logistiek:{label:'Logistiek / productie',recipient:'info@vleesbedrijf-wils.be'},
    kwaliteit:{label:'Kwaliteit / documentatie',recipient:'quality@vleesbedrijf-wils.be'},
    hr:{label:'HR / secretariaat',recipient:'info@vleesbedrijf-wils.be'},
    boekhouding:{label:'Boekhouding',recipient:'finance@vleesbedrijf-wils.be'},
    techniek:{label:'Technische dienst',recipient:'td@vleesbedrijf-wils.be'},
    directie:{label:'Directie',recipient:'eric.wils@vleesbedrijf-wils.be'}
  };
  const documents={brcgs:'BRCGS-certificaat','beter-leven':'Beter Leven-certificaat',acs:'ACS-certificaat',ikb:'IKB-certificaat'};
  const specificationLabels={cut:'Snit / uitvoering',fat:'Gewenst vetgehalte',packaging:'Verpakking',state:'Vers of bevroren',quantity:'Hoeveelheid',timing:'Gewenste timing'};
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
    return {department,products:selected,document,topic,message:document?'Ik ontvang graag het '+documents[document]+'.':''};
  }
  function validate(data={}){
    const errors={},name=String(data.name||'').trim(),email=String(data.email||'').trim(),message=String(data.message||'').trim();
    if(!message)errors.message='Beschrijf uw vraag kort.';else if(message.length>6000)errors.message='Gebruik maximaal 6000 tekens voor uw vraag.';
    if(!name)errors.name='Vul uw naam in.';else if(name.length>160)errors.name='Gebruik maximaal 160 tekens voor uw naam.';
    if(!email)errors.email='Vul uw e-mailadres in.';
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160)errors.email='Controleer uw e-mailadres, bijvoorbeeld naam@bedrijf.be.';
    if(String(data.company||'').length>160)errors.company='Gebruik maximaal 160 tekens voor de bedrijfsnaam.';
    const phone=String(data.phone||'').trim();
    if(phone&&(phone.replace(/\D/g,'').length<6||phone.length>160))errors.phone='Controleer uw telefoonnummer en vermeld de landcode.';
    // Switching to another subject retains these inputs in the form, but they
    // must neither block nor enter a question to a different department.
    if(route(data.department).key==='verkoop'){
      const specifications=data.specifications||{};
      Object.keys(specificationLabels).forEach(key=>{
        if(String(specifications[key]||'').length>160)errors[key]='Gebruik maximaal 160 tekens.';
      });
      if(specifications.state&&!['Vers','Bevroren'].includes(specifications.state))errors.state='Kies vers of bevroren, of laat dit nog open.';
    }
    return errors;
  }
  function build(data={}){
    const destination=route(data.department),lines=['Onderwerp: '+destination.label,'','Uw vraag:',clean(data.message)];
    if(destination.key==='verkoop'){
      const products=(Array.isArray(data.products)?data.products:[]).filter(product=>product&&clean(product.name||product.shortName));
      const unique=[...new Map(products.map(product=>[product.slug||product.name,product])).values()];
      if(unique.length)lines.push('','Producten:',...unique.map(product=>'- '+clean(product.name||product.shortName)+(clean(product.code)?' (artikelcode '+clean(product.code)+')':'')));
      const specifications=data.specifications||{},specified=Object.entries(specificationLabels).filter(([key])=>clean(specifications[key]));
      if(specified.length)lines.push('','Gewenste uitvoering:',...specified.map(([key,label])=>label+': '+clean(specifications[key])));
    }
    const details=[['Naam',data.name],['Bedrijf',data.company],['E-mailadres',data.email],['Telefoon',data.phone]].filter(([,value])=>clean(value));
    lines.push('','Contactgegevens:',...details.map(([label,value])=>label+': '+clean(value)));
    const text=wellFormed(lines.join('\n')),subject='Vraag aan Wils | '+destination.label;
    const mailto='mailto:'+destination.recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);
    return {...destination,text,subject,mailto,tooLong:mailto.length>1800};
  }
  function init(win){
    const doc=win.document,get=id=>doc.getElementById(id),form=get('request-form');
    if(!form||form.dataset.requestForm!=='87'||form.dataset.requestFormReady==='87')return null;
    const requiredIds=['request-controls','request-review','request-department','request-message','request-name','request-email','request-company','request-phone','request-product-fields','request-cut','request-fat','request-packaging','request-state','request-quantity','request-timing','request-error-summary','request-recipient-hint','request-review-title','request-review-recipient','request-review-text','request-length-note','request-open-email','request-copy','request-download','request-edit','request-action-status','request-routing-note'];
    if(requiredIds.some(id=>!get(id)))return null;
    form.dataset.requestFormReady='87';
    const productMode=form.dataset.requestMode==='product',department=get('request-department'),controls=get('request-controls'),review=get('request-review'),productFields=get('request-product-fields');
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
      if(!summary.hidden)summary.textContent='Controleer de gemarkeerde velden. Uw ingevulde gegevens blijven bewaard zolang deze pagina open is.';
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
      if(productMode)department.value='verkoop';
      const destination=route(department.value),isProduct=destination.key==='verkoop';
      productFields.hidden=!isProduct;productFields.disabled=!isProduct;
      const topicField=get('request-topic-field');if(topicField)topicField.hidden=productMode;
      get('request-recipient-hint').textContent='Uw e-mail wordt voorbereid aan '+destination.recipient+'. U verstuurt het bericht zelf vanuit uw e-mailprogramma.';
      const help=get('request-message-help');
      if(help)help.textContent=isProduct?'Beschrijf uw vraag. Vul bij de productkeuze en gewenste uitvoering alleen in wat u al weet.':destination.key==='kwaliteit'?'Vermeld bij een levering de productcode, etiketgegevens en leveringsreferentie.':destination.key==='logistiek'?'Vermeld bij een levering of afhaling de referentie en gewenste aankomst.':'Beschrijf uw vraag. Vermeld alleen wat u al weet.';
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
    function selectReviewText(){const text=get('request-review-text');text.focus();text.select()}
    function edit(focus=true){
      review.hidden=true;controls.hidden=false;latest=null;
      if(focus)get('request-message').focus();
    }
    form.addEventListener('submit',event=>{
      event.preventDefault();attempted=true;
      const data=collect(),errors=refreshErrors(),invalid=fields.filter(field=>has(errors,field.id.replace('request-',''))).sort((a,b)=>a.compareDocumentPosition(b)&4?-1:1);
      if(invalid.length){
        if(specNames.some(name=>has(errors,name))){const specifications=get('request-specifications');if(specifications)specifications.open=true}
        invalid[0].focus();return;
      }
      latest=build(data);
      get('request-review-text').value=latest.text;
      const recipient=get('request-review-recipient');recipient.textContent=latest.recipient;recipient.href='mailto:'+latest.recipient;
      get('request-routing-note').textContent='Uw vraag wordt gericht aan '+latest.label+'. U verstuurt het bericht zelf vanuit uw e-mailprogramma.';
      const open=get('request-open-email');open.href=latest.tooLong?'mailto:'+latest.recipient:latest.mailto;open.hidden=latest.tooLong;
      get('request-length-note').hidden=!latest.tooLong;
      get('request-action-status').textContent='';controls.hidden=true;review.hidden=false;get('request-review-title').focus();
    });
    fields.forEach(field=>field.addEventListener('input',()=>{if(attempted)refreshErrors()}));
    get('request-state').addEventListener('change',()=>{if(attempted)refreshErrors()});
    department.addEventListener('change',departmentChanged);
    checkboxes.forEach(input=>input.addEventListener('change',syncProductContext));
    get('request-edit').addEventListener('click',()=>edit());
    get('request-open-email').addEventListener('click',event=>{
      if(!latest||latest.tooLong){event.preventDefault();return}
      get('request-action-status').textContent='Het e-mailconcept is aangeboden aan uw e-mailprogramma. Controleer het daar en verstuur het zelf. Vanuit deze website is niets verzonden.';
    });
    get('request-copy').addEventListener('click',async()=>{
      if(!latest)return;const current=latest;
      try{
        await win.navigator.clipboard.writeText(current.text);
        if(latest===current)get('request-action-status').textContent='Bericht gekopieerd. Plak het in uw e-mail en verstuur het naar '+current.recipient+'.';
      }catch{
        if(latest===current){selectReviewText();get('request-action-status').textContent='Kopiëren is niet gelukt. Selecteer de tekst hierboven of download het tekstbestand.'}
      }
    });
    get('request-download').addEventListener('click',()=>{
      if(!latest)return;let url='';
      try{
        const blob=new win.Blob([latest.text],{type:'text/plain;charset=utf-8'});url=win.URL.createObjectURL(blob);
        const link=doc.createElement('a');link.href=url;link.download='wils-vraag.txt';doc.body.appendChild(link);link.click();link.remove();
        win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
        get('request-action-status').textContent='Download gestart. Gebruik de volledige tekst voor een e-mail aan '+latest.recipient+'.';
      }catch{
        if(url)try{win.URL.revokeObjectURL(url)}catch{}
        selectReviewText();get('request-action-status').textContent='Downloaden is niet gelukt. Kopieer de volledige tekst hierboven naar een e-mail aan '+latest.recipient+'.';
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
        if(status)status.textContent=clean(product.shortName||product.name)+(alreadySelected?' staat al bij uw vraag.':' is toegevoegd aan uw vraag.');
      }else if(status)status.textContent=topic==='verpakking'?'U kunt uw gewenste verpakking bij Specificatie en levering aanvullen.':topic==='vetgehalte'?'U kunt uw gewenste vetgehalte bij Specificatie en levering aanvullen.':topic==='snit'?'U kunt uw gewenste uitvoering bij Specificatie en levering aanvullen.':topic==='levering'?'U kunt de hoeveelheid en gewenste timing bij Specificatie en levering aanvullen.':'U kunt uw productvraag in het formulier aanvullen.';
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
