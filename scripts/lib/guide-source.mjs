// Единая точка, через которую проверки и тесты читают сайт.
// Сайт разделён на файлы (index.html, assets/css, assets/js, data/), а тестам нужен цельный вид страницы,
// поэтому здесь стили, код и данные собираются обратно на свои места — ровно так, как их получает браузер.
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
export const read=path=>readFileSync(new URL(path,root),'utf8');
export function dataManifest(){const m=read('index.html').match(/<script type="application\/json" id="kvm-data-files">([\s\S]*?)<\/script>/);return m?JSON.parse(m[1]):null}
// Собирает все файлы data/ в одну базу — в том же порядке разделов, что и загрузчик сайта.
export function guideData(){
  const man=dataManifest();const all={},D={};
  for(const f of man.files)Object.assign(all,JSON.parse(read(f.path)));
  for(const k of man.order)if(k in all)D[k]=all[k];
  for(const k in all)if(!(k in D))D[k]=all[k];
  return D;
}
export function guideHtml(){
  let h=read('index.html');
  h=h.replace(/<link rel="stylesheet" id="([\w-]+)" href="(assets\/css\/[^"?]+)(?:\?v=[0-9a-f]*)?">/g,(m,id,path)=>'<style id="'+id+'">'+read(path)+'</style>');
  h=h.replace(/<link rel="preload" as="script" href="assets\/js\/app\.js[^"]*">\n?/,'');
  const data='<script type="application/json" id="kvm-data">'+JSON.stringify(guideData()).replace(/</g,'\\u003c')+'</script>';
  h=h.replace(/<script type="application\/json" id="kvm-data-files">[\s\S]*?<\/script>/,()=>data);
  h=h.replace(/<script id="kvm-loader" src="assets\/js\/data-loader\.js[^"]*"[^>]*><\/script>/,()=>'<script id="kvm-app">'+read('assets/js/app.js')+'</script>');
  return h;
}
