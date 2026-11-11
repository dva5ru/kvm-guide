import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {loadGuide,click,editMode,input} from './guide-dom.mjs';

const SECTION_NAMES=['Киновселенная Marvel','Как смотреть КВМ','В фокусе','Вопросы без простых ответов','Что посмотреть','Недавно вышло','Скоро','История персонажа','Случайное открытие'];

test('concept-six homepage shows sections in approved order and retains working routes',t=>{
  const s=loadGuide();t.after(s.close);const {doc,errors}=s;
  const sections=[...doc.querySelectorAll('.h6-page > section.h6-hero, .h6-page > section.h6-section')];
  assert.equal(sections.length,9,'nine homepage sections');
  assert.deepEqual(sections.map(x=>x.classList.contains('h6-hero')?'hero':x.className.match(/h6-(ways|focus|analysis|picks|recent|upcoming|history|random)/)?.[1]),
    ['hero','ways','focus','analysis','picks','recent','upcoming','history','random']);
  for(const name of SECTION_NAMES)assert.ok(doc.querySelector('main').textContent.includes(name),name);
  const heroes=doc.querySelectorAll('.h6-portrait[href^="#c-"]');
  assert.equal(heroes.length,6,'six original Avengers character links');
  assert.deepEqual([...heroes].map(x=>x.getAttribute('href')),['#c-tony','#c-steve','#c-thor','#c-bruce','#c-natasha','#c-clint']);
  assert.ok(doc.querySelector('.h6-hero-copy h1'),'text column remains in place');
  assert.ok(doc.querySelector('.h6-hero-art[role="group"][aria-label="Шесть оригинальных Мстителей"]'),'independent visual column');
  // The DOM fixture does not load persisted image assignments; verify the published image registry instead.
  const imageRegistry=JSON.parse(readFileSync(new URL('../../content.json',import.meta.url),'utf8')).img;
  for(const id of ['tony','steve','thor','bruce','natasha','clint']){
    const src=imageRegistry['c-'+id];
    assert.ok(src,'portrait image assignment exists for '+id);
    assert.ok(readFileSync(new URL('../../'+src.split('?')[0],import.meta.url)).byteLength>0,'portrait image file exists for '+id);
  }
  assert.equal(doc.querySelectorAll('.h6-picks-grid a').length,4);
  assert.ok(doc.querySelector('.top-v6 nav.tabs a[href="#watch"]'));
  assert.ok(doc.querySelector('.top-v6 #q'));
  assert.equal(doc.querySelector('.top-v6 #spoilBtn'),null);
  assert.equal(doc.querySelector('.top-v6 #themeBtn'),null);
  assert.equal(errors.length,0,errors.join('\n'));
});

test('watch tabs change the recommended project and link to real existing routes',t=>{
  const s=loadGuide();t.after(s.close);const {doc,w}=s;
  const panel=doc.querySelector('#h6-way-panel');
  assert.ok(panel.querySelector('a[href^="#timeline"]'),'premiere order initially');
  click(w,doc.querySelector('[data-h6-way="story"]'));
  assert.equal(doc.querySelector('[data-h6-way="story"]').getAttribute('aria-selected'),'true');
  assert.ok(panel.querySelector('a[href*="order=story"]'));
  click(w,doc.querySelector('[data-h6-way="main"]'));
  assert.equal(panel.querySelector('a').getAttribute('href'),'#w-infinity-saga');
  assert.ok(panel.querySelector('h3').textContent.length>2);
});

test('upcoming blocks exclude past movies and decline to invent unconfirmed exact dates',t=>{
  const s=loadGuide();t.after(s.close);const {doc,g,w}=s;
  const links=[...doc.querySelectorAll('.h6-soon-layout a[href^="#f-"]')];
  assert.ok(links.length>0);
  for(const link of links){
    const p=g.D.p.find(x=>'#f-'+x.id===link.getAttribute('href'));
    assert.ok(p&&p.k==='film'&&!p.editionOf,'upcoming is always a new cinema film');
    assert.ok(!p.r||p.r>new Date().toISOString().slice(0,10),'future release date');
  }
  const rumored=links.find(x=>x.getAttribute('href')==='#f-ghost-rider-mcu');
  if(rumored)assert.match(rumored.textContent,/Дата не объявлена/);
  assert.equal(s.errors.length,0,s.errors.join('\n'));
});

test('editorial carousel, pause, random item work without navigating away',t=>{
  const s=loadGuide();t.after(s.close);const {doc,w}=s;
  assert.ok(doc.querySelector('[data-h6-slider="focus"]'));
  const before=doc.querySelector('#h6-focus-content h3').textContent;
  click(w,doc.querySelector('[data-h6-step="focus:1"]'));
  assert.notEqual(doc.querySelector('#h6-focus-content h3').textContent,before);
  assert.equal(doc.querySelector('[data-h6-toggle="focus"]').getAttribute('aria-pressed'),'true');
  click(w,doc.querySelector('[data-h6-toggle="focus"]'));
  assert.equal(doc.querySelector('[data-h6-toggle="focus"]').getAttribute('aria-pressed'),'false');
  assert.ok(doc.querySelector('[data-h6-step="history:1"]'));
  const link=doc.querySelector('#h6-random-content a[href^="#"]');
  assert.ok(link);
  click(w,doc.querySelector('[data-h6-shuffle]'));
  assert.ok(doc.querySelector('#h6-random-content a[href^="#"]'));
  assert.equal(s.errors.length,0,s.errors.join('\n'));
});

test('administrators can change order and editorial choices with existing persisted overrides',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc,w}=s;
  editMode(g);g.go('home');
  const editor=doc.querySelector('[data-h6-edit="order"]');
  assert.ok(editor,'homepage editor available');
  click(w,editor);
  assert.ok(doc.getElementById('h6-edit-dialog'));
  const row=doc.querySelector('#h6-editor-rows [data-h6-row]');
  click(w,row.querySelector('[data-h6-move="1"]'));
  click(w,doc.querySelector('[data-h6-save="order"]'));
  assert.equal(g.getOvr().text['home6.order']!==undefined,true,'order saved using the existing text override store');
  assert.equal(doc.querySelector('.h6-page > .blk')?.dataset.bk,'h.ways','order changed');
  assert.equal(s.errors.length,0,s.errors.join('\n'));
});

test('sections respect existing admin hide flags',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.getOvr().hide['h.soon@home']=1;g.go('home');
  assert.equal(doc.querySelector('.h6-upcoming'),null);
  assert.ok(doc.querySelector('.h6-recent'));
});

test('narrative descriptions show without spoiler protection',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  assert.equal(g.SPO.mode,'off');
  assert.equal(doc.querySelector('.h6-page .spoil'),null);
  assert.ok(doc.querySelector('.h6-release-summary').textContent.trim().length>0);
  assert.ok(doc.querySelector('.h6-history').textContent.trim().length>0);
  assert.ok(doc.querySelector('.h6-random-box'),'encyclopedia component present');
  assert.equal(s.errors.length,0,s.errors.join('\n'));
});

test('hero stylesheet has subtle diagonal separators and slanted outer edges',()=>{
  const css=readFileSync(new URL('../../assets/css/home-v6.css',import.meta.url),'utf8');
  assert.match(css,/\.h6-hero-art\{[^}]*--h6-slice-divider-half:1\.5px;/,'3px total diagonal gap between photos');
  assert.match(css,/\.h6-hero-art\{[^}]*display:flex;gap:0;/,'separators come from clipped panel edges, not rectangular gutters');
  assert.match(css,/\.h6-hero-art\{[^}]*background:inherit;/,'gaps and outer corners use the hero background, not black bars');
  assert.match(css,/\.h6-portrait\{[^}]*margin-left:calc\(-1 \* var\(--h6-slice-overlap\)\)/,'each slanted slice retains its overlap');
  assert.match(css,/\.h6-portrait\{[^}]*clip-path:polygon\(calc\(var\(--h6-slice-overlap\) \+ var\(--h6-slice-divider-half\)\)/,'each interior panel has a diagonal inset');
  assert.match(css,/\.h6-portrait:first-child\{[^}]*clip-path:polygon\(var\(--h6-slice-overlap\) 0/,'first portrait keeps a slanted left edge');
  assert.match(css,/\.h6-portrait:last-child\{[^}]*calc\(100% - var\(--h6-slice-overlap\)\) 100%/,'last portrait keeps a slanted right edge');
  assert.match(css,/@media\(max-width:1000px\)\{[\s\S]*?flex-direction:column/,'stacked layout on tablets');
  assert.match(css,/@media\(max-width:520px\)\{[\s\S]*?overflow-x:auto/,'horizontal scrolling on narrow phones');
  assert.match(css,/\.h6-portrait-5 \.h6-portrait-img\{/,'six original Avengers still use individual image framing');
});


test('published analytic essays are linked from the homepage and illustrated by local media',t=>{
  const s=loadGuide();t.after(s.close);const {doc,errors}=s;
  const cards=[...doc.querySelectorAll('.h6-analysis-card')];
  assert.equal(cards.length,3,'three published essays featured on homepage');
  for(const slug of ['thanos','snap','vision']){
    assert.equal(doc.querySelectorAll('.h6-analysis-card-main[href="article-'+slug+'.html"]').length,1,'featured essay '+slug+' links to its own page');
  }
  assert.equal(doc.querySelectorAll('.h6-analysis-card-planned').length,0,'no featured essay is incorrectly marked as a draft');
  assert.ok(doc.querySelector('.h6-analysis a[href="articles.html"]'),'section links to essays hub');
  const hub=readFileSync(new URL('../../articles.html',import.meta.url),'utf8');
  assert.match(hub,/id="army"/,'original published article remains available');
  assert.match(hub,/Does the army know what's happening here/,'existing verified movie dialogue remains');
  assert.match(hub,/Граница канона/,'original article still distinguishes conjecture from canon');
  for(const slug of ['vision','armor','civil-war','thanos','snap']){
    assert.ok(hub.includes('article-'+slug+'.html'),'hub lists '+slug);
    const article=readFileSync(new URL('../../article-'+slug+'.html',import.meta.url),'utf8');
    assert.doesNotMatch(article,/Источники и метод|КОРОТКИЙ ОТВЕТ|медиатеки KVM Guide/,'essay '+slug+' omits editorial boilerplate');
    assert.match(article,/<figure class="ed-cover"><img/,'essay '+slug+' retains its cover');
  }
  for(const file of ['f-endgame.jpg','f-infinity-war.jpg','f-deadpool-wolverine.jpg','f-wandavision.jpg'])
    assert.ok(readFileSync(new URL('../../img/'+file,import.meta.url)).byteLength>0,'featured illustration exists: '+file);
  assert.equal(errors.length,0,errors.join('\n'));
});

test('article editor saves a draft, uploads a cover and publishes the same changes to the article and cards', async t => {
  const s = loadGuide();
  t.after(s.close);
  const {g, w, doc, errors} = s;
  const articleHTML = readFileSync(new URL('../../article-snap.html', import.meta.url), 'utf8');
  const articlesJS = readFileSync(new URL('../../assets/js/articles.js', import.meta.url), 'utf8');
  w.fetch = async () => ({ok: true, text: async () => articleHTML});
  w.eval(articlesJS);
  g.go('admin/articles?article=snap');
  assert.ok(doc.querySelector('[data-adm="login"]'));
  assert.equal(doc.querySelector('[data-article-editor]'), null);

  g.ADM.can = g.ADM.on = true;
  w.Image = class {
    width = 1800;
    height = 1100;
    set src(value) { queueMicrotask(() => this.onload()); }
  };
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/webp;base64,eA==';
  g.ADM.assets = {upload: async () => ({url: 'img/editorial-snap-cover.webp?v=1'})};
  let published;
  g.ADM.art = {publish: async payload => { published = JSON.parse(payload['content.json'].content); }};
  g.go('admin/articles?article=snap');
  const settle = () => new Promise(resolve => setImmediate(resolve));
  await settle();

  const editor = doc.querySelector('[data-article-editor]');
  assert.equal(editor.querySelector('select').options.length, 6);
  const parts = [...editor.querySelectorAll('details')];
  assert.deepEqual(parts.slice(1).map(part => part.querySelector('summary').textContent),
    ['Капитан Марвел', 'Тор', 'Росомаха', 'Дэдпул', 'Вижн', 'Альтрон', 'Икарис', 'Грут', 'Адам Уорлок', 'Алая Ведьма']);
  input(w, editor.querySelector('.article-editor-content input'), 'Новый заголовок');
  const vision = parts.find(part => part.querySelector('summary').textContent === 'Вижн');
  input(w, vision.querySelector('input'), 'Белый Вижн');
  input(w, vision.querySelectorAll('textarea')[1], 'Синтетическое тело выдерживает <разряд>.');
  const upload = editor.querySelector('[data-img-one="editorial-snap-cover"]');
  Object.defineProperty(upload, 'files', {value: [new w.File(['image'], 'cover.webp', {type: 'image/webp'})]});
  upload.dispatchEvent(new w.Event('change', {bubbles: true}));
  for (let i = 0; i < 10 && !g.getOvr().img['editorial-snap-cover']; i++) await settle();
  const draft = JSON.parse(w.localStorage.getItem('kvm-draft:/kvm-guide/:v1'));
  assert.equal(draft.text['editorial.snap.title'], 'Новый заголовок');
  assert.equal(draft.img['editorial-snap-cover'], 'img/editorial-snap-cover.webp?v=1');

  g.go('home');
  const card = doc.querySelector('.h6-analysis-card[href="article-snap.html"]');
  assert.equal(card.querySelector('h3').textContent, 'Новый заголовок');
  assert.match(card.querySelector('img').src, /editorial-snap-cover\.webp/);
  click(w, doc.querySelector('[data-adm="publish"]'));
  await settle();
  assert.ok(published);
  assert.equal(w.localStorage.getItem('kvm-draft:/kvm-guide/:v1'), null);

  const page = new JSDOM(articleHTML, {url: 'https://example.test/kvm-guide/article-snap.html', runScripts: 'outside-only'});
  t.after(() => page.window.close());
  page.window.fetch = async () => ({ok: true, json: async () => published});
  page.window.eval(articlesJS);
  await settle();
  const publicDoc = page.window.document;
  assert.equal(publicDoc.querySelector('h1').textContent, 'Новый заголовок');
  assert.equal(publicDoc.querySelector('.ed-cover img').getAttribute('src'), 'img/editorial-snap-cover.webp?v=1');
  assert.equal(publicDoc.querySelector('#vision h2').textContent, 'Белый Вижн');
  assert.equal(publicDoc.querySelector('.ed-aside a[href="#vision"]').textContent, 'Белый Вижн');
  assert.match(publicDoc.querySelector('#vision p:nth-of-type(2)').textContent, /<разряд>/);
  assert.ok(publicDoc.querySelector('#vision p:nth-of-type(2) a[href^="https://"]'), 'the episode link survives editing the paragraph');
  assert.equal(publicDoc.querySelector('.ed-summary, .ed-method, figcaption'), null);
  assert.equal(errors.length, 0, errors.join('\n'));
});
