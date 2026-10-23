import {readFile} from 'node:fs/promises';import {client} from './supabase.mjs';
const db=client(),seed=JSON.parse(await readFile(new URL('./seed.json',import.meta.url),'utf8'));
try{await db.call('/rest/v1/portfolio_pages?on_conflict=slug',{method:'POST',body:Object.entries(seed.pages).map(([slug,content])=>({slug,content})),headers:{Prefer:'resolution=ignore-duplicates'}});console.log('Imported portfolio pages. Existing edits were preserved.')}catch(e){console.error(e.message);process.exitCode=1}
