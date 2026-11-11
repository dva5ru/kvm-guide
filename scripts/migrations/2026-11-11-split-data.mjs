// Разовый перенос данных из блока kvm-data в index.html в файлы data/*.json (этап 2 разделения index.html).
import {readFileSync,writeFileSync} from 'node:fs';
import {formatData,DATA_FILES} from '../data-format.mjs';
const root=new URL('../../',import.meta.url);
let html=readFileSync(new URL('index.html',root),'utf8');
const m=html.match(/<script type="application\/json" id="kvm-data">([\s\S]*?)<\/script>/);
const D=JSON.parse(m[1]);const order=Object.keys(D);const used=new Set();
for(const [path,keys] of DATA_FILES){const part={};for(const k of keys){if(!(k in D))throw Error('нет раздела '+k);part[k]=D[k];used.add(k)}writeFileSync(new URL(path,root),formatData(part))}
const missed=order.filter(k=>!used.has(k));if(missed.length)throw Error('разделы без файла: '+missed);
const manifest={order,app:'assets/js/app.js',files:DATA_FILES.map(([path,keys])=>({path,keys,hash:''}))};
html=html.replace(m[0],'<script type="application/json" id="kvm-data-files">'+JSON.stringify(manifest)+'</script>');
html=html.replace(/<script id="kvm-app" src="assets\/js\/app\.js[^"]*" onerror="[^"]*"><\/script>/,'<script id="kvm-loader" src="assets/js/data-loader.js" onerror="window.kvmLoadFail&&kvmLoadFail(this)"></script>');
writeFileSync(new URL('index.html',root),html);
// контроль: собранные обратно данные совпадают с исходными до байта
const back={};const all={};for(const [path] of DATA_FILES)Object.assign(all,JSON.parse(readFileSync(new URL(path,root),'utf8')));for(const k of order)back[k]=all[k];
if(JSON.stringify(back)!==m[1])throw Error('данные после переноса не совпадают с исходными');
console.log('перенесено разделов:',order.length,'| файлов:',DATA_FILES.length,'| совпадение с исходными: да');
