(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WILS_COMPOSER=api})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const departments={
    algemeen:{label:'Algemene vraag / ik weet het nog niet',sourceRecipient:'info@vleesbedrijf-wils.be',confirmed:true},
    verkoop:{label:'Producten, offerte of maatwerk',sourceRecipient:'Luca.wils@vleesbedrijf-wils.be',confirmed:false},
    logistiek:{label:'Logistiek / productie',sourceRecipient:'info@vleesbedrijf-wils.be',confirmed:true},
    kwaliteit:{label:'Kwaliteit / documentatie',sourceRecipient:'quality@vleesbedrijf-wils.be',confirmed:false},
    hr:{label:'HR / secretariaat',sourceRecipient:'info@vleesbedrijf-wils.be',confirmed:true},
    boekhouding:{label:'Boekhouding',sourceRecipient:'finance@vleesbedrijf-wils.be',confirmed:false},
    techniek:{label:'Technische dienst',sourceRecipient:'td@vleesbedrijf-wils.be',confirmed:false},
    directie:{label:'Directie',sourceRecipient:'eric.wils@vleesbedrijf-wils.be',confirmed:false}
  };
  const topics={algemeen:'Algemene productvraag',productspecificatie:'Productspecificatie',snit:'Snit en samenstelling',vetgehalte:'Vetgehalte',verpakking:'Verpakking',levering:'Levering'};
  const followups={telefonisch:'Telefonisch contact',informatie:'Informatie of documentatie ontvangen',offerte:'Een offerte bespreken','bezoek-sales':'Een bezoek van een commercieel medewerker bespreken','bezoek-wils':'Een bezoek aan Wils bespreken'};
  function context(search,products,defaultDepartment='algemeen'){
    const params=new URLSearchParams(search), known=new Set(products.map(p=>p.slug));
    const selected=[...new Set(params.getAll('product').filter(slug=>known.has(slug)))];
    const topic=Object.hasOwn(topics,params.get('onderwerp'))?params.get('onderwerp'):'algemeen';
    const raw=params.get('afdeling');
    let department=Object.hasOwn(departments,raw)?raw:(Object.hasOwn(departments,defaultDepartment)?defaultDepartment:'algemeen');
    if(!Object.hasOwn(departments,raw) && (selected.length || topic!=='algemeen'))department='verkoop';
    return {department,topic,products:selected,document:['brcgs','beter-leven','acs','ikb'].includes(params.get('document'))?params.get('document'):''};
  }
  function route(department){
    const key=Object.hasOwn(departments,department)?department:'algemeen',config=departments[key];
    return {key,label:config.label,recipient:config.confirmed?config.sourceRecipient:departments.algemeen.sourceRecipient,fallback:!config.confirmed,sourceRecipient:config.sourceRecipient};
  }
  function build(data){
    const destination=route(data.department);
    const lines=[`Onderwerp: ${destination.label}`];
    if(data.department==='verkoop' && data.topic!=='algemeen')lines.push(`Afstemming: ${topics[data.topic]||topics.algemeen}`);
    if(data.products.length)lines.push('','Producten:',...data.products.map(p=>`- ${p.name} (${p.code})`));
    lines.push('','Uw vraag:',data.message);
    if(data.fields?.length)lines.push('','Aanvullende informatie:',...data.fields.map(([label,value])=>`${label}: ${value}`));
    const wishes=(data.followups||[]).filter(key=>Object.hasOwn(followups,key));
    if(wishes.length)lines.push('','Gewenste opvolging:',...wishes.map(key=>`- ${followups[key]}`));
    lines.push('','Contactgegevens:',...data.contact.filter(([,value])=>value).map(([label,value])=>`${label}: ${value}`));
    const text=wellFormed(lines.join('\n'));
    const subject=wellFormed(`Vraag aan Wils | ${destination.label}`+(data.products.length?` | ${data.products.map(p=>p.code).join(', ')}`:''));
    const mailto=`mailto:${destination.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    return {...destination,text,subject,mailto,tooLong:mailto.length>1800};
  }
  function wellFormed(value){
    const text=String(value);if(text.toWellFormed)return text.toWellFormed();
    let result='';
    for(let i=0;i<text.length;i++){
      const code=text.charCodeAt(i);
      if(code>=0xD800&&code<=0xDBFF){const next=text.charCodeAt(i+1);if(next>=0xDC00&&next<=0xDFFF){result+=text[i]+text[++i]}else result+='\uFFFD'}
      else if(code>=0xDC00&&code<=0xDFFF)result+='\uFFFD';else result+=text[i];
    }
    return result;
  }
  return {departments,topics,followups,context,route,build};
});
