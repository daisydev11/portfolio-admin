import styleSchema from './style-schema.json' with {type:'json'};
import {upgradeContent,upgradeRows} from './content-upgrade.mjs';
import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import path from 'node:path';import {randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';import {client} from './supabase.mjs';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export function validAsset(v){return typeof v==='string'&&v.length<2000&&(!v||/^assets\/[a-zA-Z0-9_./-]+$/.test(v)||/^https:\/\//.test(v));}
export function validLink(v){return typeof v==='string'&&v.length<2000&&(!v||/^(https:\/\/|mailto:|#|\/)/.test(v)||/^[a-zA-Z0-9_-]+\.html(?:#[a-zA-Z0-9_-]+)?$/.test(v)||/^assets\/[a-zA-Z0-9_./-]+$/.test(v));}
export function validateContent(p){
 if(!p||typeof p.title!=='string'||p.title.length>150||!Array.isArray(p.sections)||p.sections.length>80||!Array.isArray(p.fields)||p.fields.length>600)fail(400,'Invalid page content.');
 if(p.contentSource!==undefined&&!['hybrid','html','database'].includes(p.contentSource))fail(400,'Invalid content source.');if(p.stylingSource!==undefined&&!['css','admin'].includes(p.stylingSource))fail(400,'Invalid styling source.');if(p.theme){if(typeof p.theme!=='object'||Array.isArray(p.theme))fail(400,'Invalid palette.');for(const [key,value]of Object.entries(p.theme)){if(!styleSchema.colours.map(r=>r[0]).includes(key)||!/^#[a-fA-F0-9]{6}$/.test(value))fail(400,'Invalid palette colour.');}}if(p.design){if(typeof p.design!=='object'||Array.isArray(p.design))fail(400,'Invalid design.');for(const [key,value]of Object.entries(p.design)){const rule=styleSchema.layout.find(r=>r[0]===key);if(!rule||!Number.isFinite(value)||value<rule[3]||value>rule[4])fail(400,'Invalid styling value.');}}const sections=new Set(),fields=new Set();
 for(const s of p.sections){if(!/^[-a-zA-Z0-9_]{1,80}$/.test(s.id)||sections.has(s.id)||typeof s.name!=='string'||s.name.length>150||typeof s.visible!=='boolean'||typeof s.custom!=='boolean')fail(400,'Invalid section.');if(s.appearance){const a=s.appearance;if((a.background!==undefined&&!/^#[a-fA-F0-9]{6}$/.test(a.background))||(a.color!==undefined&&!/^#[a-fA-F0-9]{6}$/.test(a.color))||(a.padding!==undefined&&(!Number.isFinite(a.padding)||a.padding<0||a.padding>160)))fail(400,'Invalid section appearance.');}sections.add(s.id)}
 for(const f of p.fields){if(!/^[-a-zA-Z0-9_]{1,80}$/.test(f.id)||fields.has(f.id)||!sections.has(f.section)||!['text','image','link'].includes(f.kind)||typeof f.value!=='string'||f.value.length>25000||typeof f.label!=='string'||f.label.length>200)fail(400,'Invalid content field.');fields.add(f.id);if(f.attribute!==undefined&&(!['placeholder','title','aria-label'].includes(f.attribute)||f.kind!=='text'))fail(400,'Invalid editable attribute.');if(f.kind==='image'&&f.display){const d=f.display;if((d.fit!==undefined&&!['cover','contain'].includes(d.fit))||['x','y','width','radius','height'].some(k=>d[k]!==undefined&&(!Number.isFinite(d[k])||d[k]<0||d[k]>(k==='height'?900:k==='radius'?100:100))))fail(400,'Invalid image display.');}if(f.kind==='image'&&(!validAsset(f.value)||typeof f.alt!=='string'||f.alt.length>500))fail(400,'Invalid image.');if(f.kind==='link'&&!validLink(f.href))fail(400,'Invalid link.');}
 return p;
}
export function imageType(b){if(b.length>=8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['png','image/png'];if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return ['jpg','image/jpeg'];if(b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')return ['webp','image/webp'];return null;}
async function jsonBody(req,max=2*1024*1024){if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Send JSON.');let size=0,chunks=[];for await(const c of req){size+=c.length;if(size>max)fail(413,'Request too large.');chunks.push(c)}try{return JSON.parse(Buffer.concat(chunks).toString())}catch{fail(400,'Invalid JSON.')}}
export function createApp(env=process.env){
 const db=client(env),origin=env.APP_ORIGIN||'http://localhost:3000',secure=env.NODE_ENV==='production';
 if(secure&&!origin.startsWith('https://'))throw Error('Production APP_ORIGIN must use HTTPS.');
 const limits=new Map();function limit(req,kind,max){const key=kind+':'+req.socket.remoteAddress,now=Date.now();if(limits.size>10000)for(const [k,v]of limits)if(v.until<now)limits.delete(k);const val=limits.get(key)||{count:0,until:now+600000};if(val.until<now){val.count=0;val.until=now+600000}val.count++;limits.set(key,val);if(val.count>max)fail(429,'Too many attempts. Please try again later.');}
 function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
 function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),v.slice(i+1)]}).filter(v=>v[0]));}
 function setSession(res,tokens,csrf){const attrs='; Path=/; SameSite=Strict'+(secure?'; Secure':'');res.setHeader('Set-Cookie',['portfolio_access='+tokens.access_token+'; Max-Age=3600; HttpOnly'+attrs,'portfolio_refresh='+tokens.refresh_token+'; Max-Age=2592000; HttpOnly'+attrs,'portfolio_csrf='+csrf+'; Max-Age=2592000'+attrs]);}
 function sameOrigin(req){if(req.headers.origin!==origin)fail(403,'This request must come from the portfolio.');}
 function csrf(req){sameOrigin(req);const a=req.headers['x-csrf-token'],b=cookies(req).portfolio_csrf;if(typeof a!=='string'||!b||a.length!==b.length||!timingSafeEqual(Buffer.from(a),Buffer.from(b)))fail(403,'Invalid session verification. Please sign in again.');}
 async function admin(req,res){const c=cookies(req);let user;try{if(c.portfolio_access)user=await db.call('/auth/v1/user',{key:db.publishable,token:c.portfolio_access});}catch{}
  if(!user&&c.portfolio_refresh){try{const t=await db.call('/auth/v1/token?grant_type=refresh_token',{method:'POST',key:db.publishable,body:{refresh_token:c.portfolio_refresh}});user=t.user;setSession(res,t,c.portfolio_csrf||randomBytes(24).toString('hex'));}catch{}}
  if(!user||user.email?.toLowerCase()!==env.ADMIN_EMAIL?.toLowerCase())fail(401,'Please sign in as the portfolio owner.');return user;
 }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   const pathname=new URL(req.url,'http://local').pathname;
   if(pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,configured:db.configured});
   if(pathname==='/api/auth/login'&&req.method==='POST'){
    sameOrigin(req);limit(req,'login',15);const b=await jsonBody(req);if(typeof b.email!=='string'||typeof b.password!=='string'||b.password.length>1000||b.email.toLowerCase()!==env.ADMIN_EMAIL?.toLowerCase())fail(401,'Email or password is incorrect.');
    let t;try{t=await db.call('/auth/v1/token?grant_type=password',{method:'POST',key:db.publishable,body:{email:b.email,password:b.password}})}catch(e){if(e.status===503)throw e;fail(401,'Email or password is incorrect.');}
    if(t.user?.email?.toLowerCase()!==env.ADMIN_EMAIL.toLowerCase())fail(401,'Owner access only.');const token=randomBytes(24).toString('hex');setSession(res,t,token);return json(res,200,{ok:true,csrf:token});
   }
   if(pathname==='/api/auth/session'&&req.method==='GET'){const u=await admin(req,res);return json(res,200,{email:u.email,csrf:cookies(req).portfolio_csrf});}
   if(pathname==='/api/auth/logout'&&req.method==='POST'){csrf(req);const c=cookies(req);if(c.portfolio_access)try{await db.call('/auth/v1/logout',{method:'POST',key:db.publishable,token:c.portfolio_access})}catch{}res.setHeader('Set-Cookie',['portfolio_access=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict','portfolio_refresh=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict','portfolio_csrf=; Max-Age=0; Path=/; SameSite=Strict']);return json(res,200,{ok:true});}
   if(pathname==='/api/content'&&req.method==='GET'){const rows=await db.call('/rest/v1/portfolio_pages?select=slug,content,revision');return json(res,200,{pages:Object.fromEntries(upgradeRows(rows).map(r=>[r.slug,{...r.content,revision:r.revision}]))});}
   if(pathname==='/api/contact'&&req.method==='POST'){
    sameOrigin(req);limit(req,'contact',8);const b=await jsonBody(req,30000);if(b.website)return json(res,200,{success:true});
    if(typeof b.name!=='string'||!b.name.trim()||b.name.length>150||typeof b.email!=='string'||b.email.length>254||!/^\S+@\S+\.\S+$/.test(b.email)||typeof b.message!=='string'||!b.message.trim()||b.message.length>10000)fail(400,'Enter a valid name, email and message.');
    await db.call('/rest/v1/portfolio_messages',{method:'POST',body:{name:b.name.trim(),email:b.email.trim(),message:b.message.trim()}});return json(res,201,{success:true});
   }
   if(pathname.startsWith('/api/admin/')){
    await admin(req,res);if(!['GET','HEAD'].includes(req.method))csrf(req);
    if(pathname==='/api/admin/pages'&&req.method==='GET'){const rows=await db.call('/rest/v1/portfolio_pages?select=slug,content,revision&order=slug');return json(res,200,upgradeRows(rows));}
    const m=pathname.match(/^\/api\/admin\/pages\/([a-z0-9-]+)$/);
    if(m&&req.method==='PUT'){const b=await jsonBody(req);if(!Number.isInteger(b.revision))fail(400,'Missing revision.');if(m[1]==='playground')fail(404,'Page removed.');const content=validateContent(upgradeContent(m[1],b.content));const current=await db.call('/rest/v1/portfolio_pages?slug=eq.'+m[1]+'&select=content');if(!current.length)fail(404,'Page not found.');
     // Template field IDs/types cannot be replaced; custom sections can add fields.
     for(const f of upgradeContent(m[1],current[0].content).fields){const next=content.fields.find(n=>n.id===f.id);if(!next&&!current[0].content.sections.find(s=>s.id===f.section)?.custom)fail(400,'Existing fields cannot be removed.');if(next&&(next.kind!==f.kind||next.section!==f.section))fail(400,'Existing field structure cannot be changed.');}
     try{const rows=await db.call('/rest/v1/rpc/save_portfolio_page',{method:'POST',body:{p_slug:m[1],p_content:content,p_revision:b.revision}});return json(res,200,rows[0]);}catch(e){if(e.message.includes('Revision conflict'))fail(409,'This page changed elsewhere. Reload before saving.');throw e;}
    }
    if(pathname==='/api/admin/upload'&&req.method==='POST'){const b=await jsonBody(req,6*1024*1024);if(typeof b.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(b.data))fail(400,'Invalid file.');const bytes=Buffer.from(b.data,'base64');if(bytes.length>4*1024*1024)fail(413,'Images must be 4 MB or smaller.');const type=imageType(bytes);if(!type)fail(415,'Choose a PNG, JPEG or WebP image.');const name=randomUUID()+'.'+type[0];await db.call('/storage/v1/object/portfolio-images/'+name,{method:'POST',body:bytes,headers:{'Content-Type':type[1],'x-upsert':'false'}});return json(res,201,{url:db.url+'/storage/v1/object/public/portfolio-images/'+name});}
    if(pathname==='/api/admin/messages'&&req.method==='GET')return json(res,200,await db.call('/rest/v1/portfolio_messages?select=*&order=created_at.desc&limit=200'));
    const msg=pathname.match(/^\/api\/admin\/messages\/([a-f0-9-]{36})$/);if(msg&&req.method==='PATCH'){const b=await jsonBody(req);if(typeof b.is_read!=='boolean')fail(400,'Invalid message status.');await db.call('/rest/v1/portfolio_messages?id=eq.'+msg[1],{method:'PATCH',body:{is_read:b.is_read}});return json(res,200,{ok:true});}
    fail(404,'Unknown admin operation.');
   }
   if(pathname==='/playground.html'||pathname==='/playground')fail(404,'Page removed.');
   if(pathname.startsWith('/api/'))fail(404,'Unknown API route.');
   if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed.');
   let name;try{name=decodeURIComponent(pathname)}catch{fail(400,'Invalid URL.');}if(name==='/'||name==='/index')name='/index.html';if(name==='/admin'||name==='/admin/')name='/admin/index.html';
   const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)||name.includes('\0'))fail(403,'Invalid path.');
   let data;try{if(!(await stat(target)).isFile())fail(404,'Page not found.');data=await readFile(target)}catch{fail(404,'Page not found.');}
   const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.pdf':'application/pdf','.ttf':'font/ttf'}[path.extname(target)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
  }catch(e){const status=e.status>=400&&e.status<600?e.status:500;json(res,status,{error:status===500?'The request could not be completed. Please try again.':e.message});}
 });return server;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const s=createApp();s.listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('Portfolio: '+(process.env.APP_ORIGIN||'http://localhost:3000')+' · Admin: /admin'));}
