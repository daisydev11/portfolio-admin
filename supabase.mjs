export function client(env=process.env){
 const url=(env.SUPABASE_URL||'').replace(/\/$/,'');const secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;const publishable=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;
 const configured=Boolean(url&&secret&&publishable&&env.ADMIN_EMAIL&&!url.includes('YOUR_PROJECT'));
 async function call(path,{method='GET',body,token,key=secret,headers={}}={}){
  if(!configured)throw Object.assign(new Error('Supabase is not configured. Follow SETUP.md.'),{status:503});
  const h={apikey:key,...headers};if(token)h.Authorization='Bearer '+token;else if(key?.startsWith('eyJ'))h.Authorization='Bearer '+key;
  if(body!==undefined&&!Buffer.isBuffer(body))h['Content-Type']='application/json';
  const response=await fetch(url+path,{method,headers:h,body:body===undefined?undefined:Buffer.isBuffer(body)?body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const text=await response.text();let data;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!response.ok){const err=new Error(data?.message||data?.error_description||data?.msg||'Supabase request failed');err.status=response.status;throw err}return data;
 }
 return {url,configured,publishable,call};
}
