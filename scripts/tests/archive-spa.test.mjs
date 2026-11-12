import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGuide,click} from './guide-dom.mjs';

const read = file => readFileSync(new URL('../../' + file, import.meta.url), 'utf8');
const readerJS = read('assets/js/archive-pages.js');
const editorialJS = read('assets/js/articles.js');
const known = ['army','vision','visionquest','armor','civil-war','thanos','snap'];

function setup() {
  const view = loadGuide();
  const {w} = view;
  w.fetch = async url => {
    const file = String(url).replace(/^\.\//, '').split('?')[0];
    return {ok:true, text:async()=>read(file)};
  };
  w.eval(editorialJS);
  return view;
}
async function flush() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
  await Promise.resolve();
}
test('all seven essays open inside the main shell instead of a separate document',async t => {
  const s = setup(); t.after(s.close);
  const {g,doc,w} = s;
  g.go('articles');
  await flush();
  assert.equal(doc.querySelectorAll('header.top').length,1);
  assert.equal(doc.querySelectorAll('footer.archive-footer').length,1);
  assert.equal(doc.querySelectorAll('#main .ed-card-live').length,7);
  assert.equal(doc.querySelectorAll('#main article.ed-article').length,0,
    'the index lists articles without embedding the long army essay below');
  assert.equal(doc.querySelector('#h6-nav [href="#articles"]')?.getAttribute('aria-current'),'page');
  for (const id of known) {
    g.go('article-' + id);
    await flush();
    const article = doc.querySelector('#main .archive-reader article.ed-article');
    assert.ok(article,'article ' + id + ' rendered');
    assert.ok(article.querySelector('.ed-prose'),'article content retained for ' + id);
    assert.ok(article.querySelector('.ed-aside'),'table of contents retained for ' + id);
    assert.equal(doc.querySelectorAll('header.top').length,1);
    assert.ok(doc.title.endsWith('Архив КВМ'));
    assert.ok(doc.querySelector('#main a[href="#articles"]'),'back to essays');
  }
  assert.ok(w.KVMArchivePages.isRoute('legal'));
});
test('sitewide legal sections and heading links work without leaving the SPA',async t => {
  const s=setup();t.after(s.close);
  const {g,doc,w}=s;
  g.go('legal?section=rightsholders');
  await flush();
  const legal=doc.querySelector('#main .archive-legal');
  assert.ok(legal);
  assert.ok(legal.querySelector('#sources'));
  assert.ok(legal.querySelector('#rightsholders'));
  assert.ok(legal.querySelector('a[href*="github.com"]'),'submission notice still reachable');
  assert.equal(doc.querySelectorAll('header.top').length,1);
  assert.ok(!doc.querySelector('#main .archive-bar'),'no duplicated site header');
  click(w,legal.querySelector('a[href="#sources"]'));
  assert.equal(w.location.hash,'#legal?section=sources');
});
test('article copy, covers, and internal table of contents honor saved editorial overrides',async t=>{
  const s=setup();t.after(s.close);
  const {g,doc,w}=s;
  g.setOvr({text:{'editorial.vision.title':'Новый заголовок редактора'},img:{},hide:{},nav:{},copy:{},spoilers:{},pos:{}});
  g.go('article-vision');
  await flush();
  assert.equal(doc.querySelector('.ed-article-heading h1')?.textContent,'Новый заголовок редактора');
  const toc=doc.querySelector('.ed-aside a[href^="#"]');
  assert.ok(toc);
  click(w,toc);
  assert.ok(w.location.hash.startsWith('#article-vision?section='));
  assert.equal(doc.querySelectorAll('.ed-article').length,1);
});
test('old public URLs redirect to the new SPA route but still contain all original text',()=>{
  for (const id of known.filter(id=>id!=='army')) {
    const src=read('article-' + id + '.html');
    assert.match(src,/location\.replace\(target\)/);
    assert.match(src,/ed-prose/);
    assert.match(src,/archive-footer/);
  }
  assert.match(read('articles.html'),/route==='articles'&&part==='army'/);
  assert.match(read('legal.html'),/location\.replace\(target\)/);
  assert.match(read('index.html'),/href="#legal\?section=rightsholders"/);
});
