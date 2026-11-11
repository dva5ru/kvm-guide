// Единая точка, через которую проверки и тесты читают сайт.
// Сайт разделён на файлы (index.html, assets/css, assets/js), а тестам нужен цельный вид страницы,
// поэтому здесь стили и код вставляются обратно на свои места — ровно так, как их видит браузер.
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
export const read=path=>readFileSync(new URL(path,root),'utf8');
export function guideHtml(){
  let h=read('index.html');
  h=h.replace(/<link rel="stylesheet" id="([\w-]+)" href="(assets\/css\/[^"?]+)(?:\?v=[0-9a-f]*)?">/g,(m,id,path)=>'<style id="'+id+'">'+read(path)+'</style>');
  h=h.replace(/<script id="kvm-app" src="(assets\/js\/app\.js)(?:\?v=[0-9a-f]*)?"[^>]*><\/script>/,(m,path)=>'<script id="kvm-app">'+read(path)+'</script>');
  return h;
}
