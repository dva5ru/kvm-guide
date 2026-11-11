// Проставляет версии (?v=отпечаток содержимого) к файлам из assets/ и data/ и приводит data/*.json к единому формату.
// Запуск: npm run stamp — после любой правки файлов в assets/ или data/.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {formatData} from './data-format.mjs';
export const PAGES=['index.html','articles.html','legal.html'];
const root=new URL('../',import.meta.url);
export function assetHash(path){return createHash('sha1').update(readFileSync(new URL(path,root))).digest('hex').slice(0,10)}
export const ASSET_REF=/((?:href|src)=")(\.\/)?(assets\/[^"?#]+)(?:\?v=[0-9a-f]*)?(")/g;
export const MANIFEST_RE=/(<script type="application\/json" id="kvm-data-files">)([\s\S]*?)(<\/script>)/;
export function readManifest(html){const m=html.match(MANIFEST_RE);return m?JSON.parse(m[2]):null}
export function manifestFiles(manifest){return manifest.files.concat(...Object.values(manifest.lazy||{}))}
export function stampManifest(manifest){
  for(const f of manifestFiles(manifest))f.hash=assetHash(f.path);
  const app=manifest.app.split('?')[0];manifest.app=app+'?v='+assetHash(app);
  return manifest;
}
export function stamp(html){
  html=html.replace(ASSET_REF,(m,a,dot,path,z)=>existsSync(new URL(path,root))?a+(dot||'')+path+'?v='+assetHash(path)+z:m);
  const man=readManifest(html);
  if(man)html=html.replace(MANIFEST_RE,(m,a,b,c)=>a+JSON.stringify(stampManifest(man))+c);
  return html;
}
export function formatDataFiles(){
  const html=readFileSync(new URL('index.html',root),'utf8');const man=readManifest(html);const changed=[];
  if(!man)return changed;
  for(const f of manifestFiles(man)){const url=new URL(f.path,root);const old=readFileSync(url,'utf8');let obj;
    try{obj=JSON.parse(old)}catch(e){throw new Error(f.path+': ошибка в JSON — '+e.message)}
    const neu=formatData(obj);if(neu!==old){writeFileSync(url,neu);changed.push(f.path)}}
  return changed;
}
if(import.meta.url===`file://${process.argv[1]}`){
  for(const f of formatDataFiles())console.log('приведён к единому формату:',f);
  for(const page of PAGES){const url=new URL(page,root);if(!existsSync(url))continue;const old=readFileSync(url,'utf8'),neu=stamp(old);
    if(neu!==old){writeFileSync(url,neu);console.log('обновлены версии:',page)}else console.log('без изменений:',page)}
}
