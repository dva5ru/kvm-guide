import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const root=new URL('../../',import.meta.url);
const cases=[
  {file:'article-armor.html',count:10,minWords:1450,required:['Наташа Романофф','Халкбастеров','Титан','Заковианский договор','Брюс Бэннер']},
  {file:'article-civil-war.html',count:10,minWords:1550,required:['Таддеус Росс','Сибирь','Вижна','Халк','«Рагнарёке»']},
  {file:'article-thanos.html',count:12,minWords:1700,required:['Камня силы','Громсекира','щит','клинка','Халка','Тони Старк']},
  {file:'articles.html',count:10,minWords:1600,required:['Национальную гвардию','Заковии','«Озарение»','порталы','тридцать секунд']}
];

for (const spec of cases) {
  test(spec.file+' preserves its approved longread, navigation and local images',()=>{
    const html=readFileSync(new URL(spec.file,root),'utf8');
    const article=spec.file==='articles.html' ? html.slice(html.indexOf('<article class="ed-article" id="army"')) : html.slice(html.indexOf('<div class="ed-prose">'));
    assert.ok(article.length>3000,spec.file+': article content missing');
    const parts=spec.file==='articles.html' ? [...article.matchAll(/<section id="army-(?!sources)([^"]+)"/g)] : [...article.matchAll(/<section id="part-(\d+)"/g)];
    assert.equal(parts.length,spec.count,spec.file+': longread sections were unexpectedly removed');
    const wordCount=(article.replace(/<[^>]+>/g,' ').match(/[А-Яа-яЁёA-Za-z0-9-]+/g)||[]).length;
    assert.ok(wordCount>=spec.minWords,spec.file+': longread was shortened to '+wordCount+' words');
    for (const phrase of spec.required) assert.ok(article.includes(phrase),spec.file+': missing agreed point '+phrase);
    for (const [,hash] of article.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes('id="'+hash+'"'),spec.file+': broken heading anchor #'+hash);
    for (const [,imgPath] of article.matchAll(/<img[^>]+src="\.\/(img\/[^"]+)"/g))
      assert.ok(existsSync(new URL(imgPath,root)),spec.file+': missing image '+imgPath);
    assert.match(article,/ed-conclusion/,spec.file+': editorial conclusion missing');
  });
}

test('Vision and Snap essays remain present as independent articles',()=>{
  for (const file of ['article-vision.html','article-snap.html']) {
    assert.ok(existsSync(new URL(file,root)),file+': protected article missing');
  }
});
