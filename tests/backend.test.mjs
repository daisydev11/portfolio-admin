import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createApp,validateContent,validLink,imageType} from '../server.mjs';
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',r));
const close=s=>new Promise(r=>s.close(r));
test('Supabase API contract: owner login, protected writes, revisions, uploads and inbox',async()=>{
 const seed=JSON.parse(await readFile(new URL('../seed.json',import.meta.url)));let row={slug:'index',content:seed.pages.index,revision:1};const messages=[];let uploaded=false;
 const mock=http.createServer(async(req,res)=>{let raw='';for await(const c of req)raw+=c;const b=raw&&req.headers['content-type']?.includes('json')?JSON.parse(raw):{};let out;
  if(req.url.startsWith('/auth/v1/token')){if(b.password!=='correct'){res.writeHead(400);return res.end(JSON.stringify({message:'Invalid credentials'}));}out={access_token:'owner',refresh_token:'refresh',user:{email:'owner@example.com'}};}
  else if(req.url==='/auth/v1/user'){if(req.headers.authorization!=='Bearer owner'){res.writeHead(401);return res.end('{}');}out={email:'owner@example.com'};}
  else {assert.equal(req.headers.apikey,'sb_secret_test');
   if(req.url.startsWith('/rest/v1/portfolio_pages'))out=[row];
   else if(req.url==='/rest/v1/rpc/save_portfolio_page'){if(b.p_revision!==row.revision){res.writeHead(400);return res.end(JSON.stringify({message:'Revision conflict'}));}row={...row,content:b.p_content,revision:row.revision+1};out=[row];}
   else if(req.url.startsWith('/rest/v1/portfolio_messages')){if(req.method==='POST'){messages.push({...b,id:'12345678-1234-1234-1234-123456789012',is_read:false});out=null;}else out=messages;}
   else if(req.url.startsWith('/storage/v1/object/portfolio-images/')){uploaded=true;out={Key:'image'};}
   else {res.writeHead(404);return res.end('{}');}
  }res.setHeader('content-type','application/json');res.end(JSON.stringify(out));
 });await listen(mock);
 const env={SUPABASE_URL:`http://127.0.0.1:${mock.address().port}`,SUPABASE_SECRET_KEY:'sb_secret_test',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',ADMIN_EMAIL:'owner@example.com'};
 const probe=http.createServer();await listen(probe);const port=probe.address().port;await close(probe);env.APP_ORIGIN=`http://127.0.0.1:${port}`;const app=createApp(env);await new Promise(r=>app.listen(port,'127.0.0.1',r));
 try{const call=(p,method='GET',body,headers={})=>fetch(env.APP_ORIGIN+p,{method,headers:{'Content-Type':'application/json',Origin:env.APP_ORIGIN,...headers},body:body?JSON.stringify(body):undefined});
  assert.equal((await call('/api/admin/pages')).status,401);
  assert.equal((await call('/api/auth/login','POST',{email:'owner@example.com',password:'wrong'})).status,401);
  const login=await call('/api/auth/login','POST',{email:'owner@example.com',password:'correct'});assert.equal(login.status,200);const token=(await login.json()).csrf;const cookie=login.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');const auth={Cookie:cookie,'x-csrf-token':token};
  assert.equal((await call('/api/admin/pages','GET',undefined,auth)).status,200);
  const content=structuredClone(row.content);content.fields.find(f=>f.kind==='text').value='Edited portfolio heading';
  assert.equal((await call('/api/admin/pages/index','PUT',{content,revision:1},{Cookie:cookie})).status,403);
  assert.equal((await call('/api/admin/pages/index','PUT',{content,revision:1},auth)).status,200);
  assert.equal((await call('/api/admin/pages/index','PUT',{content,revision:1},auth)).status,409);
  const publicContent=await (await call('/api/content')).json();assert.equal(publicContent.pages.index.revision,2);assert.equal(publicContent.pages.index.fields.find(f=>f.kind==='text').value,'Edited portfolio heading');
  assert.equal((await call('/api/admin/upload','POST',{data:Buffer.from('<svg/>').toString('base64')},auth)).status,415);
  const png=Buffer.from([137,80,78,71,13,10,26,10]);assert.equal((await call('/api/admin/upload','POST',{data:png.toString('base64')},auth)).status,201);assert.ok(uploaded);
  assert.equal((await call('/api/contact','POST',{name:'Visitor',email:'visitor@example.com',message:'Hello'}, {Origin:'https://other.example'})).status,403);
  assert.equal((await call('/api/contact','POST',{name:'Visitor',email:'visitor@example.com',message:'Hello'})).status,201);
  assert.equal((await call('/api/admin/messages','GET',undefined,auth)).status,200);assert.equal(messages[0].message,'Hello');
  assert.equal((await call('/.env')).status,404);assert.equal((await call('/admin')).status,200);
 }finally{await close(app);await close(mock);}
});
test('content rejects unsafe links and malformed sections',()=>{assert.equal(validLink('javascript:alert(1)'),false);assert.equal(imageType(Buffer.from('<svg/>')),null);assert.throws(()=>validateContent({title:'bad',sections:[],fields:[{id:'x'}]}));});
test('all eight page templates and their editable fields are seeded',async()=>{const seed=JSON.parse(await readFile(new URL('../seed.json',import.meta.url)));assert.equal(Object.keys(seed.pages).length,8);for(const [slug,p]of Object.entries(seed.pages)){validateContent(p);const html=await readFile(new URL('../public/'+slug+'.html',import.meta.url),'utf8');assert.ok(html.includes('cms-runtime.js'));for(const f of p.fields)assert.ok(html.includes('="'+f.id+'"'),slug+': '+f.id);}});

import {upgradeContent,upgradeRows} from '../content-upgrade.mjs';
test('upgrade removes Playground while preserving saved copy and image settings',async()=>{const seed=JSON.parse(await readFile(new URL('../seed.json',import.meta.url)));const page=structuredClone(seed.pages.index);page.fields[0].value='My saved edit';page.fields.find(f=>f.kind==='image').display={fit:'cover',x:20,y:30,width:80,height:400,radius:12};const upgraded=upgradeContent('index',page);assert.equal(upgraded.fields[0].value,'My saved edit');assert.equal(upgraded.fields.find(f=>f.kind==='image').display.width,80);assert.equal(upgradeRows([{slug:'playground',content:page},{slug:'index',content:page}]).length,1);validateContent(upgraded);const broken=structuredClone(upgraded);broken.fields.find(f=>f.kind==='image').display.fit='url(javascript:bad)';assert.throws(()=>validateContent(broken));});
test('Playground links removed and social icons are present',async()=>{const seed=JSON.parse(await readFile(new URL('../seed.json',import.meta.url)));assert.ok(!seed.pages.playground);for(const slug of Object.keys(seed.pages)){const html=await readFile(new URL('../public/'+slug+'.html',import.meta.url),'utf8');assert.ok(!/href="[^"]*playground/.test(html));assert.ok(html.includes('class="social-label"'));assert.ok(!html.includes('social-youtube'));assert.ok(html.includes('assets/css/portfolio.css'));assert.ok(!html.includes('<style')); }});
test('experience and social upgrade adds missing fields without erasing custom edits',async()=>{const seed=JSON.parse(await readFile(new URL('../seed.json',import.meta.url)));const legacy=structuredClone(seed.pages.about);legacy.fields=legacy.fields.filter(f=>!f.id.startsWith('experience-'));legacy.fields.push({id:'social-youtube',kind:'link',section:'section-4',label:'YouTube',value:'YouTube',href:''});legacy.fields.find(f=>f.id==='field-23').value='My edited skill';const p=upgradeContent('about',legacy);assert.ok(p.fields.some(f=>f.id==='experience-cwg-employer'));assert.ok(!p.fields.some(f=>f.id==='social-youtube'));assert.equal(p.fields.find(f=>f.id==='field-23').value,'My edited skill');validateContent(p);});
test('expanded palette and layout settings validate safely',async()=>{const schema=JSON.parse(await readFile(new URL('../style-schema.json',import.meta.url)));const seed=JSON.parse(await readFile(new URL('../seed.json',import.meta.url)));const p=structuredClone(seed.pages.index);const source=p.fields?p:(p.content||p);source.theme=Object.fromEntries(schema.colours.map(([key,label,value])=>[key,value]));source.design=Object.fromEntries(schema.layout.map(([key,label,value])=>[key,value]));assert.doesNotThrow(()=>validateContent(source));source.design['card-padding']=-1;assert.throws(()=>validateContent(source));source.design={};source.theme['card']='url(https://example.com)';assert.throws(()=>validateContent(source));});
test('existing case studies receive every field without losing owner edits',async()=>{const {upgradeContent}=await import('../content-upgrade.mjs');const manifest=JSON.parse(await readFile(new URL('../content-manifest.json',import.meta.url)));for(const slug of ['applyd','soravacue','prelp','whosabiam']){const source=structuredClone(manifest[slug]);source.title=slug;source.fields=source.fields.filter(f=>f.id.startsWith('field-'));source.sections=source.sections.filter(s=>!s.id.startsWith('case-'));source.fields.find(f=>f.id==='field-18').value='My saved overview';source.fields.find(f=>f.id==='field-15').value='https://example.com/my-image.png';source.theme={card:'#123456'};const result=upgradeContent(slug,source);assert.equal(result.fields.find(f=>f.id==='field-18').value,'My saved overview');assert.equal(result.fields.find(f=>f.id==='field-15').value,'https://example.com/my-image.png');assert.equal(result.theme.card,'#123456');for(const f of manifest[slug].fields)assert.ok(result.fields.some(saved=>saved.id===f.id),slug+' missing '+f.id);assert.ok(result.sections.findIndex(s=>s.id==='case-overview')<result.sections.findIndex(s=>s.id==='section-2'));assert.deepEqual(upgradeContent(slug,result),result);assert.doesNotThrow(()=>validateContent(result));}});
