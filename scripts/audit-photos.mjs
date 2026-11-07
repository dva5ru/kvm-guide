import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
export function auditPhotos(root=ROOT){
  const html=readFileSync(join(root,'index.html'),'utf8');
  const match=html.match(/<script[^>]*id="kvm-data"[^>]*>([\s\S]*?)<\/script>/);
  if(!match)throw Error('Cannot find embedded kvm-data');
  const chars=JSON.parse(match[1]).c;
  const saved=JSON.parse(readFileSync(join(root,'content.json'),'utf8')).img||{};
  const ids=chars.map(c=>c.id).sort((a,b)=>b.length-a.length);
  const assets=readdirSync(join(root,'img')).filter(file=>/\.(jpe?g|png|webp|avif)$/i.test(file)).map(file=>'img/'+file);
  const files=new Set(assets),byId={};
  for(const file of assets){
    if(!file.startsWith('img/c-'))continue;
    const stem=file.slice(6).replace(/\.(jpe?g|png|webp|avif)$/i,'');
    const id=ids.find(cid=>stem===cid||stem.startsWith(cid+'-'));
    if(id)(byId[id]??=[]).push(file);
  }
  const withFile=[],withoutFile=[],assigned=[];
  for(const c of chars){
    const key='c-'+c.id;
    if(saved[key])assigned.push({id:c.id,name:c.n,key,path:saved[key]});
    else if((byId[c.id]||[]).length===1)withFile.push({id:c.id,name:c.n,path:byId[c.id][0]});
    else withoutFile.push({id:c.id,name:c.n,candidates:byId[c.id]||[]});
  }
  const broken=Object.entries(saved).filter(([key,value])=>typeof value==='string'&&value.startsWith('img/')&&!files.has(value.split('?')[0])).map(([key,value])=>({key,path:value}));
  const unused=assets.filter(p=>p.startsWith('img/c-')&&!Object.values(saved).some(v=>typeof v==='string'&&v.split('?')[0]===p));
  return {total:chars.length,assigned,withFile,withoutFile,broken,unused,files:assets.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=auditPhotos();
  if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
  else {
    console.log('Photo audit:',result.assigned.length+'/'+result.total+' portraits assigned; '+result.withFile.length+' ready to relink; '+result.withoutFile.length+' missing image; '+result.broken.length+' broken links; '+result.unused.length+' unused character image files.');
    for(const c of result.withFile)console.log('RELINK',c.id,c.path);
    for(const c of result.withoutFile)console.log('NEEDS PHOTO',c.id,c.name);
    for(const f of result.broken)console.log('BROKEN',f.key,f.path);
  }
}
