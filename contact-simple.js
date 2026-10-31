(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root&&root.document)api.init(root);
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const departments={
    algemeen:{label:'Algemene vraag',recipient:'info@vleesbedrijf-wils.be'},
    verkoop:{label:'Verkoop',recipient:'Luca.wils@vleesbedrijf-wils.be'},
    logistiek:{label:'Logistiek / productie',recipient:'info@vleesbedrijf-wils.be'},
    kwaliteit:{label:'Kwaliteit / documentatie',recipient:'quality@vleesbedrijf-wils.be'},
    hr:{label:'HR / secretariaat',recipient:'info@vleesbedrijf-wils.be'},
    boekhouding:{label:'Boekhouding',recipient:'finance@vleesbedrijf-wils.be'},
    techniek:{label:'Technische dienst',recipient:'td@vleesbedrijf-wils.be'},
    directie:{label:'Directie',recipient:'eric.wils@vleesbedrijf-wils.be'}
  };
  const documents={brcgs:'BRCGS-certificaat','beter-leven':'Beter Leven-certificaat',acs:'ACS-certificaat',ikb:'IKB-certificaat'};
  const products={
    slaapvlees:'Varkensslaapvlees',wangetjes:'Varkenswangetjes / kaakjes',kopvlees:'Varkenskopvlees / konen met kinnebak',
    'masker-met-zwoerd':'Varkensmaskers met zwoerd','klein-masker-met-zwoerd':'Kleine varkensmaskers met zwoerd',
    'masker-zonder-zwoerd':'Varkensmaskers zonder zwoerd',snuiten:'Varkenssnuiten','snuiten-met-bot':'Varkenssnuiten met bot',
    'hele-oren':'Hele varkensoren',oorflappen:'Varkensoorflappen',kopzwoerd:'Varkenskopzwoerd',onderlip:'Varkensonderlip / kin'
  };
  const has=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
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
  function context(search){
    const params=new URLSearchParams(search),raw=params.get('afdeling'),document=params.get('document');
    const selected=[...new Set(params.getAll('product').filter(slug=>has(products,slug)))];
    const knownDocument=has(documents,document)?document:'';
    const department=knownDocument?'kwaliteit':has(departments,raw)?raw:selected.length?'verkoop':'algemeen';
    const lines=[];
    if(knownDocument)lines.push('Ik ontvang graag het '+documents[knownDocument]+'.');
    if(selected.length)lines.push('Mijn vraag gaat over: '+selected.map(slug=>products[slug]).join(', ')+'.');
    return {department,document:knownDocument,products:selected,message:lines.join('\n\n')};
  }
  function validate(data){
    const errors={},name=String(data.name||'').trim(),email=String(data.email||'').trim(),message=String(data.message||'').trim();
    if(!name)errors.name='Vul uw naam in.';else if(name.length>160)errors.name='Gebruik maximaal 160 tekens voor uw naam.';
    if(!email)errors.email='Vul uw e-mailadres in.';
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>160)errors.email='Controleer uw e-mailadres, bijvoorbeeld naam@bedrijf.be.';
    if(!message)errors.message='Beschrijf uw vraag kort.';else if(message.length>6000)errors.message='Gebruik maximaal 6000 tekens voor uw vraag.';
    if(String(data.company||'').length>160)errors.company='Gebruik maximaal 160 tekens voor de bedrijfsnaam.';
    const phone=String(data.phone||'').trim();
    if(phone&&(phone.replace(/\D/g,'').length<6||phone.length>160))errors.phone='Controleer uw telefoonnummer en vermeld de landcode.';
    return errors;
  }
  function build(data){
    const destination=route(data.department),clean=value=>wellFormed(value).trim();
    const details=[['Naam',data.name],['Bedrijf',data.company],['E-mailadres',data.email],['Telefoon',data.phone]].filter(([,value])=>clean(value));
    const text=wellFormed(['Afdeling: '+destination.label,'','Uw vraag:',clean(data.message),'','Contactgegevens:',...details.map(([label,value])=>label+': '+clean(value))].join('\n'));
    const subject='Vraag aan Wils | '+destination.label;
    const mailto='mailto:'+destination.recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);
    return {...destination,text,subject,mailto,tooLong:mailto.length>1800};
  }
  function init(win){
    const doc=win.document,get=id=>doc.getElementById(id),form=get('request-form');
    if(!form||form.dataset.simpleContact!=='84'||form.dataset.simpleContactReady==='84')return null;
    const requiredIds=['request-controls','request-review','request-department','request-message','request-name','request-email','request-company','request-phone','request-error-summary','request-recipient-hint','request-review-title','request-review-recipient','request-review-text','request-length-note','request-open-email','request-copy','request-download','request-edit','request-action-status','request-routing-note'];
    if(requiredIds.some(id=>!get(id)))return null;
    form.dataset.simpleContactReady='84';
    const controls=get('request-controls'),review=get('request-review'),fieldNames=['message','name','email','company','phone'];
    const fields=fieldNames.map(name=>get('request-'+name));
    const navigation=win.performance&&win.performance.getEntriesByType?win.performance.getEntriesByType('navigation')[0]:null;
    // A restored page owns its values. Only seed a fresh, empty form once.
    const pristine=!fields.some(field=>field.value)&&get('request-department').value==='algemeen';
    if(pristine&&(!navigation||navigation.type!=='back_forward')){
      const seed=context(win.location.search);get('request-department').value=seed.department;
      if(seed.message)get('request-message').value=seed.message;
    }
    let latest=null,attempted=false;
    const collect=()=>Object.fromEntries(['department',...fieldNames].map(name=>[name,get('request-'+name).value.trim()]));
    function setFieldError(field,message){
      field.setCustomValidity(message||'');
      if(message)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
      const error=get(field.id+'-error');if(error){error.textContent=message||'';error.hidden=!message}
    }
    function departmentChanged(){
      const destination=route(get('request-department').value);
      get('request-recipient-hint').textContent='Uw e-mail wordt voorbereid aan '+destination.recipient+'. Er wordt niets automatisch verstuurd.';
      const help=get('request-message-help');
      if(help)help.textContent=destination.key==='kwaliteit'?'Vermeld bij een levering de productcode, etiketgegevens en leveringsreferentie.':destination.key==='logistiek'?'Vermeld bij een levering of afhaling de referentie en gewenste aankomst.':'Beschrijf uw vraag. Vermeld alleen wat u al weet.';
    }
    function selectReviewText(){const text=get('request-review-text');text.focus();text.select()}
    form.addEventListener('submit',event=>{
      event.preventDefault();attempted=true;const data=collect(),errors=validate(data);
      fields.forEach(field=>setFieldError(field,errors[field.id.replace('request-','')]));
      const invalid=fields.filter(field=>has(errors,field.id.replace('request-',''))),summary=get('request-error-summary');
      summary.hidden=!invalid.length;
      if(invalid.length){summary.textContent='Controleer de gemarkeerde velden. Uw ingevulde gegevens blijven beschikbaar zolang deze pagina open is.';invalid[0].focus();return}
      latest=build(data);
      get('request-review-text').value=latest.text;
      const recipient=get('request-review-recipient');recipient.textContent=latest.recipient;recipient.href='mailto:'+latest.recipient;
      get('request-routing-note').textContent='Uw vraag wordt gericht aan '+latest.label+'. U verstuurt het bericht zelf vanuit uw e-mailprogramma.';
      const open=get('request-open-email');open.href=latest.tooLong?'mailto:'+latest.recipient:latest.mailto;open.hidden=latest.tooLong;
      get('request-length-note').hidden=!latest.tooLong;
      get('request-action-status').textContent='';controls.hidden=true;review.hidden=false;get('request-review-title').focus();
    });
    fields.forEach(field=>field.addEventListener('input',()=>{
      if(!attempted)return;const name=field.id.replace('request-','');setFieldError(field,validate(collect())[name]);
      if(!Object.keys(validate(collect())).length)get('request-error-summary').hidden=true;
    }));
    get('request-department').addEventListener('change',departmentChanged);
    get('request-edit').addEventListener('click',()=>{review.hidden=true;controls.hidden=false;latest=null;get('request-message').focus()});
    get('request-open-email').addEventListener('click',event=>{
      if(!latest||latest.tooLong){event.preventDefault();return}
      get('request-action-status').textContent='Het e-mailconcept is aangeboden aan uw e-mailprogramma. Controleer het daar en verstuur het zelf. Vanuit deze website is niets verzonden.';
    });
    get('request-copy').addEventListener('click',async()=>{
      if(!latest)return;
      try{await win.navigator.clipboard.writeText(latest.text);get('request-action-status').textContent='Bericht gekopieerd. Plak het in uw e-mail en verstuur het naar '+latest.recipient+'.'}
      catch{selectReviewText();get('request-action-status').textContent='Kopiëren is niet gelukt. Selecteer de tekst hierboven of download het tekstbestand.'}
    });
    get('request-download').addEventListener('click',()=>{
      if(!latest)return;let url='';
      try{
        const blob=new win.Blob([latest.text],{type:'text/plain;charset=utf-8'});url=win.URL.createObjectURL(blob);
        const link=doc.createElement('a');link.href=url;link.download='wils-contactvraag.txt';doc.body.appendChild(link);link.click();link.remove();
        win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);
        get('request-action-status').textContent='Download gestart. Gebruik de volledige tekst voor een e-mail aan '+latest.recipient+'.';
      }catch{
        if(url)win.URL.revokeObjectURL(url);selectReviewText();
        get('request-action-status').textContent='Downloaden is niet gelukt. Kopieer de volledige tekst hierboven naar een e-mail aan '+latest.recipient+'.';
      }
    });
    departmentChanged();controls.disabled=false;
    return {collect,departmentChanged};
  }
  return {departments,documents,products,route,context,validate,build,wellFormed,init};
});
