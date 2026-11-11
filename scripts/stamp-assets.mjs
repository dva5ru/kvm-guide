// Проставляет версии (?v=отпечаток содержимого) ко всем локальным файлам из assets/ в страницах сайта.
// Запуск: npm run stamp — после любой правки файлов в assets/.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const PAGES=['index.html','articles.html','legal.html'];
const root=new URL('../',import.meta.url);
export function assetHash(path){return createHash('sha1').update(readFileSync(new URL(path,root))).digest('hex').slice(0,10)}
export const ASSET_REF=/((?:href|src)=")(\.\/)?(assets\/[^"?#]+)(?:\?v=[0-9a-f]*)?(")/g;
export function stamp(html){return html.replace(ASSET_REF,(m,a,dot,path,z)=>existsSync(new URL(path,root))?a+(dot||'')+path+'?v='+assetHash(path)+z:m)}
if(import.meta.url===`file://${process.argv[1]}`){
  for(const page of PAGES){const url=new URL(page,root);if(!existsSync(url))continue;const old=readFileSync(url,'utf8'),neu=stamp(old);
    if(neu!==old){writeFileSync(url,neu);console.log('обновлены версии:',page)}else console.log('без изменений:',page)}
}
