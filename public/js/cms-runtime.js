(() => {
 const pageName=document.body.dataset.cmsPage;document.documentElement.classList.add('js-ready');
 const clean=v=>(v||'').replace(/\s+/g,' ').trim();
 const sourceValues=new Map();document.querySelectorAll('[data-cms-base]').forEach(n=>{const id=n.dataset.cmsImage||n.dataset.cmsLink||n.dataset.cmsText;const image=!!n.dataset.cmsImage,link=!!n.dataset.cmsLink;sourceValues.set(id,{node:n,base:JSON.parse(n.dataset.cmsBase),value:image?n.getAttribute('src'):clean((n.querySelector('.social-label,.button-label')||n).textContent),alt:n.getAttribute('alt')||'',href:n.getAttribute('href')||''});});
 const selector=(name,id)=>'['+name+'="'+CSS.escape(id)+'"]';
 function applyAppearance(node,a){if(!a)return;if(/^#[a-fA-F0-9]{6}$/.test(a.background||''))node.style.background=a.background;if(/^#[a-fA-F0-9]{6}$/.test(a.color||'')){node.style.color=a.color;node.querySelectorAll('h1,h2,h3,p').forEach(n=>n.style.color=a.color)}if(Number.isFinite(a.padding))node.style.paddingBlock=a.padding+'px';}
 function apply(page){
  const adminStyling=page.stylingSource!=='css';
  if(adminStyling){for(const [key,value]of Object.entries(page.theme||{})){if(["bg", "section-bg", "contact-bg", "footer-bg", "accent", "hover-bg", "nav", "pale", "text", "body", "muted", "field", "card", "panel-bg", "heading-color", "card-title", "card-text", "category-color", "link-color", "border-color", "button-bg", "button-text", "button-hover-text", "pale-text", "nav-text", "footer-text", "contact-text", "field-text", "placeholder-text", "skill-text", "case-subheading", "backtop-bg", "backtop-text"].includes(key)&&/^#[a-fA-F0-9]{6}$/.test(value))document.documentElement.style.setProperty('--'+key,value);}}
  if(adminStyling){const schema=globalThis.PORTFOLIO_STYLE?.layout||[];for(const [key,value]of Object.entries(page.design||{})){const rule=schema.find(r=>r[0]===key);if(rule&&Number.isFinite(value)&&value>=rule[3]&&value<=rule[4])document.documentElement.style.setProperty('--'+key,value+rule[5]);}}
  if(page.contentSource==='html'){
   if(adminStyling)for(const section of page.sections){const node=document.querySelector(selector('data-cms-section',section.id));if(node)applyAppearance(node,section.appearance);}
   return;
  }
  if(page.title)document.title=page.title+' · Daisy Imhanzenobe';
  for(const field of page.fields){
   if(field.attribute){for(const node of document.querySelectorAll(selector('data-cms-attr-'+field.attribute,field.id)))node.setAttribute(field.attribute,field.value);continue;}
   const source=sourceValues.get(field.id);if(page.contentSource!=='database'&&source){const changed=clean(source.value)!==clean(source.base.value)||(field.kind==='link'&&source.href!==source.base.href)||(field.kind==='image'&&source.alt!==source.base.alt);if(changed)continue;}
   const key=field.kind==='image'?'data-cms-image':field.kind==='link'?'data-cms-link':'data-cms-text';
   for(const node of document.querySelectorAll(selector(key,field.id))){if(field.kind==='image'){node.src=field.value;node.alt=field.alt||'';if(node.hasAttribute?.('data-cms-slot-image')){node.hidden=!field.value;const caption=node.parentNode?.querySelector('[data-cms-slot-caption]');if(caption)caption.hidden=!!field.value;}const d=field.display;if(d){if(['cover','contain'].includes(d.fit))node.style.objectFit=d.fit;node.style.objectPosition=(d.x??50)+'% '+(d.y??50)+'%';if(d.width)node.style.width=d.width+'%';if(d.height)node.style.height=d.height+'px';if(d.radius!==undefined)node.style.borderRadius=d.radius+'px';node.style.display='block';node.style.marginInline='auto';}}else if(field.kind==='link'){if(node.querySelector('.button-label'))node.querySelector('.button-label').textContent=field.value.replace('♧','').trim();else if(node.querySelector('.social-label')){node.querySelector('.social-label').textContent=field.value;node.setAttribute('aria-label',field.value)}else if(!node.querySelector('img'))node.textContent=field.value;if(field.href){node.href=field.href;node.removeAttribute('aria-disabled');node.removeAttribute('title')}else{node.removeAttribute('href');node.setAttribute('aria-disabled','true')}}else node.textContent=field.value;}
   if(field.kind==='image')for(const backdrop of document.querySelectorAll(selector('data-cms-background',field.id)))backdrop.style.backgroundImage=field.value?'url('+JSON.stringify(field.value)+')':'none';
  }
  const main=document.querySelector('main');
  for(const section of page.sections.filter(s=>s.custom)){
   const element=document.createElement('section');element.className='container cms-custom-section';element.dataset.cmsSection=section.id;
   for(const field of page.fields.filter(f=>f.section===section.id)){
    if(field.kind==='image'&&!field.value)continue;
    const node=document.createElement(field.kind==='image'?'img':field.label==='Heading'?'h2':'p');
    if(field.kind==='image'){node.src=field.value;node.alt=field.alt||'';node.loading='lazy';const d=field.display;if(d){node.style.objectFit=d.fit||'contain';node.style.objectPosition=(d.x??50)+'% '+(d.y??50)+'%';if(d.width)node.style.width=d.width+'%';if(d.height)node.style.height=d.height+'px';node.style.borderRadius=(d.radius??0)+'px';}}else node.textContent=field.value;element.append(node);
   }main?.append(element);
  }
  const groups=new Map();
  for(const section of page.sections){const node=document.querySelector(selector('data-cms-section',section.id));if(!node)continue;node.hidden=!section.visible;if(adminStyling)applyAppearance(node,section.appearance);if(['HEADER','FOOTER'].includes(node.tagName))continue;const parent=node.parentNode;if(!groups.has(parent))groups.set(parent,[]);groups.get(parent).push(node);}
  for(const [parent,ordered]of groups){const present=Array.from(parent.children).filter(n=>ordered.includes(n));const markers=present.map(n=>{const marker=document.createComment('section');n.replaceWith(marker);return marker});ordered.forEach((node,i)=>markers[i]?.replaceWith(node));}
 }
 fetch('/api/content').then(async r=>{if(!r.ok)throw Error('Content unavailable');return r.json()}).then(d=>{if(d.pages[pageName])apply(d.pages[pageName])}).catch(()=>{ /* Keep the existing portfolio visible during a connection problem. */ });
 const trigger=document.querySelector('.menu-toggle'),menu=document.querySelector('#mobile-nav');
 trigger?.addEventListener('click',()=>{const open=trigger.getAttribute('aria-expanded')==='true';trigger.setAttribute('aria-expanded',String(!open));menu.hidden=open});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu){menu.hidden=true;trigger?.setAttribute('aria-expanded','false')}});
 document.querySelectorAll('[data-year]').forEach(n=>n.textContent=new Date().getFullYear());
 const top=document.querySelector('.back-to-top');if(top){const update=()=>{top.hidden=scrollY<220};addEventListener('scroll',update,{passive:true});update();top.addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));}
 document.querySelectorAll('.contact-form').forEach(form=>{
  form.addEventListener('submit',async e=>{e.preventDefault();const status=form.querySelector('.form-status'),button=form.querySelector('button');
   const fields=['name','email','message'];let invalid;
   for(const name of fields){const input=form.elements[name];const value=input.value.trim();const bad=!value||(name==='email'&&!/^\S+@\S+\.\S+$/.test(value));input.setAttribute('aria-invalid',String(bad));const error=form.querySelector('#'+name+'-error');if(error)error.textContent=bad?'Please enter a valid '+name+'.':'';if(bad&&!invalid)invalid=input}
   if(invalid){status.textContent='Please check the highlighted fields.';invalid.focus();return}
   const text=button.textContent;button.disabled=true;button.textContent='Sending…';status.textContent='';
   try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(fields.map(n=>[n,form.elements[n].value.trim()]))) });const result=await response.json();if(!response.ok||result.success!==true)throw Error(result.error||'Your message could not be saved.');status.textContent='Your message has been received. Thank you!';form.reset();}catch(err){status.textContent=err.message+' Your message is still here.';}finally{button.disabled=false;button.textContent=text}
  });
 });
})();
