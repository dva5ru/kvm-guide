import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGuide,click,input,editMode} from './guide-dom.mjs';

function copyEdit(s,el,value,scope='local'){
  click(s.w,el);const m=s.doc.getElementById('copyedit');assert.ok(m,'universal editor opens');
  m.querySelector(`[value="${scope}"]`).checked=true;input(s.w,m.querySelector('textarea'),value);click(s.w,m.querySelector('[data-copy-save]'));
}

test('home count follows data, including plural forms after adding a project',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  const checkCount=(count,word)=>{
    assert.ok(doc.querySelector('.ways').textContent.includes('Все '+count+' '+word+' '), 'correct count and grammatical form');
  };
  const base=g.D.p.length;
  const baseForm=(n)=>n%100>=11&&n%100<=14?'проектов':n%10===1?'проект':n%10>=2&&n%10<=4?'проекта':'проектов';
  checkCount(base,baseForm(base));
  let counter=0;
  for (const [end,word] of [[1,'проект'],[2,'проекта'],[5,'проектов']]){
    do {g.D.p.push({...g.D.p[0],id:'test-project-'+(++counter)});} while (g.D.p.length%100>=11&&g.D.p.length%100<=14||g.D.p.length%10!==end);
    g.go('home');
    checkCount(g.D.p.length,word);
  }
});

test('local and global copies retain source identity across repeat edits and value collisions',t=>{
  const s=loadGuide();t.after(s.close);editMode(s.g);s.g.go('watch');
  copyEdit(s,s.doc.querySelector('h1'),'Своя инструкция');
  copyEdit(s,s.doc.querySelector('h1'),'Новая инструкция');
  const o=s.g.getOvr();assert.equal(o.copy['watch|Как смотреть'],'Новая инструкция');assert.equal(Object.keys(o.copy).length,1);
  s.g.go('home');assert.equal(s.doc.querySelector('.hero-actions a').textContent,'Как смотреть');
  s.g.go('watch');copyEdit(s,s.doc.querySelector('h1'),'Общий заголовок','all');
  // Global editing updates the current occurrence and all previous local copies.
  s.g.go('home');assert.equal(s.doc.querySelector('.hero-actions a').textContent,'Общий заголовок');
  s.g.go('watch');assert.equal(s.doc.querySelector('h1').textContent,'Общий заголовок');
  const root=s.doc.createElement('div');root.innerHTML='<p>Один</p><p>Два</p>';
  s.doc.getElementById('main').appendChild(root);o.copy['*|Один']='Совпало';o.copy['*|Два']='Совпало';s.g.applyCopy(root);
  s.g.universalEdit(root.lastElementChild);assert.equal(s.doc.querySelector('#copyedit').dataset.original,'Два');
});

test('replacement dollar sequences are literal and data fields support local, global and reset',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;
  g.D.p[0].ab='Общий текст';g.D.p[1].ab='Общий текст';const key='p.'+g.D.p[0].id+'.ab';
  g.setText(key,'Локальный текст');assert.equal(g.D.p[1].ab,'Общий текст');
  g.setText(key,'Новый общий текст',true);assert.equal(g.D.p[0].ab,'Новый общий текст');assert.equal(g.D.p[1].ab,'Новый общий текст');
  g.setText(key,'И ещё раз',true);assert.equal(g.D.p[1].ab,'И ещё раз');
  g.setText(key,'Общий текст',true);assert.equal(g.D.p[0].ab,'Общий текст');assert.equal(g.D.p[1].ab,'Общий текст');
  const p=s.doc.createElement('p');p.textContent='Замена';s.doc.getElementById('main').appendChild(p);
  g.getOvr().copy['*|Замена']='$& $1 $$';g.applyCopy(p);assert.equal(p.textContent,'$& $1 $$');
});

test('full text editor edits encyclopedia paragraphs with links and keeps edits after reload',t=>{
  const s=loadGuide();t.after(s.close);s.g.ADM.can=true;s.g.ADM.on=true;
  s.doc.body.insertAdjacentHTML('beforeend',s.g.settingsHTML());click(s.w,s.doc.querySelector('[data-adm="texts"]'));
  const source=s.g.artGet('vibranium').ab;input(s.w,s.doc.querySelector('[data-content-query]'),source);
  const field=s.doc.querySelector('[data-content-results] .ed');assert.ok(field,'full artifact paragraph is editable without edit mode');
  click(s.w,field);const box=s.doc.querySelector('[data-ek-box]');assert.ok(box);
  input(s.w,box.querySelector('textarea'),'Описание с <уголками> & символами');click(s.w,box.querySelector('[data-ed-save]'));
  assert.equal(s.g.artGet('vibranium').ab,'Описание с <уголками> & символами');
  const saved=JSON.parse(s.w.localStorage.getItem('kvm-draft:/kvm-guide/:v1'));assert.ok(saved);
  const fresh=loadGuide();t.after(fresh.close);fresh.g.setOvr(saved);fresh.g.SPO.mode='off';fresh.g.go('a-vibranium');
  assert.equal(fresh.doc.querySelector('.about').textContent,'Описание с <уголками> & символами');assert.equal(fresh.doc.querySelector('.about уголками'),null);
});

test('buttons and shell labels are editable and copy changes apply to filtered lists',async t=>{
  const s=loadGuide();t.after(s.close);editMode(s.g);s.g.go('watch');
  const b=s.doc.querySelector('[data-scroll] b');copyEdit(s,b,'Подборки по темам');
  assert.equal(s.doc.querySelector('[data-scroll] b').textContent,'Подборки по темам');
  const nav=s.doc.querySelector('nav.tabs a[href="#watch"]');copyEdit(s,nav,'Просмотр','all');
  s.g.go('catalog');assert.equal(s.doc.querySelector('nav.tabs a[href="#watch"]').textContent,'Просмотр');
  s.g.getOvr().copy['*|Фильмы']='Кино';
  input(s.w,s.doc.querySelector('[data-ct-q2]'),'Тор');await new Promise(r=>setTimeout(r,0));
  assert.ok(s.doc.getElementById('ct-list').textContent.includes('Тор'));
});

test('all encyclopedia objects are searchable with punctuation and English aliases',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc,w}=s;
  for(const a of g.artAll()){
    input(w,doc.getElementById('q'),'[«'+a.n+'»] + /');
    assert.ok([...doc.querySelectorAll('#sres a')].some(x=>x.getAttribute('href')==='#a-'+a.id),a.n);
  }
  for(const [query,target] of [['vibranium','#a-vibranium'],['adamantium','#a-adamantium'],['Щ.И.Т.','#o-shield']]){
    input(w,doc.getElementById('q'),query);assert.ok([...doc.querySelectorAll('#sres a')].some(x=>x.getAttribute('href')===target),query);
  }
  for(const query of ['[','\\','.*','+++','%','<>','()','😀']){input(w,doc.getElementById('q'),query);assert.equal(doc.getElementById('q').getAttribute('aria-expanded'),'false')}
  g.go('a-vibranium');editMode(g);g.go('a-vibranium');copyEdit(s,doc.querySelector('h1'),'Тестовый металл');
  input(w,doc.getElementById('q'),'Тестовый металл');assert.match(doc.getElementById('sres').innerHTML,/#a-vibranium/);
});

test('catalog URL preserves &, =, +, #, ?, Unicode and malformed percent escapes',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;
  const query='Тор & Локи = + # ? [Щ.И.Т.] / 100%';
  g.go('catalog?q='+encodeURIComponent(query)+'&no=linked,other');
  assert.equal(g.CT2.q,query);assert.equal(g.CT2.aff.linked,0);assert.equal(g.CT2.aff.other,0);
  const params=g.qsParse(g.ctToQS());assert.equal(params.q,query);
  assert.doesNotThrow(()=>g.go('catalog?q=%E0%A4%A&k=bad&s=bad&u=bad&st=bad'));
  assert.equal(g.CT2.kind,'film');assert.equal(g.CT2.sort,'release');
});

test('all declared routes, generated links and thematic shortcuts resolve',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  const routes=new Set([...Object.keys(g.VIEWS),...Object.keys(g.LEGACY),'events',
    ...g.D.p.map(x=>'f-'+x.id),...g.D.c.map(x=>'c-'+x.id),...g.D.pl.map(x=>'p-'+x.id),
    ...g.D.ev.map(x=>'e-'+x.id),...g.D.ln.map(x=>'l-'+x.id),...g.artAll().map(x=>'a-'+x.id),
    ...g.D.enc.races.map(x=>'r-'+x[0]),...g.D.enc.orgs.map(x=>'o-'+x[0]),...g.D.routes.map(x=>'w-'+x[0]),
    ...g.D.p.flatMap(p=>(p.eps||[]).map(e=>'ep-'+p.id+'-'+e[0]))]);
  for(const route of routes){
    g.go(route);assert.notEqual(doc.querySelector('main h1')?.textContent,'Страница не найдена',route);
    for(const link of doc.querySelectorAll('main a[href^="#"]')){const h=link.getAttribute('href').slice(1);if(h)routes.add(h)}
    for(const link of doc.querySelectorAll('[data-scroll]'))assert.ok(doc.getElementById(link.getAttribute('data-scroll')),route+' scroll target');
  }
  assert.ok(routes.size>950,`audited ${routes.size} routes`);
});

test('block controls cover encyclopedia and respect local hiding and guest preview',t=>{
  const s=loadGuide();t.after(s.close);editMode(s.g);s.g.go('a-vibranium');
  const block=s.doc.querySelector('.sdet').closest('.blk');assert.ok(block);const key=block.dataset.bk;
  click(s.w,block.querySelector('[data-bhide="page"]'));assert.equal(s.g.getOvr().hide[key+'@a-vibranium'],1);
  s.g.ADM.edit=false;s.g.ADM.on=false;s.g.go('a-vibranium');assert.equal(s.doc.querySelector('.sdet'),null);assert.equal(s.doc.querySelector('.blk-bar'),null);
  s.g.go('a-adamantium');assert.ok(s.doc.querySelector('.sdet'),'other card remains visible');
  editMode(s.g);s.g.go('a-vibranium');assert.ok(s.doc.querySelector('.blk.is-hidden'));
  click(s.w,s.doc.querySelector('.blk.is-hidden [data-bshow="page"]'));s.g.ADM.edit=false;s.g.go('a-vibranium');assert.ok(s.doc.querySelector('.sdet'));
});

test('spoilers conceal item descriptions, path headings, participant notes and late team membership',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  for(const a of g.artAll()){
    g.go('a-'+a.id);const text=doc.getElementById('main').textContent;
    assert.ok(!text.includes(a.ab),`hidden description ${a.id}`);
    for(const step of a.path)assert.ok(!text.includes(step[1]),`hidden history ${a.id}`);
  }
  const p=g.D.p.find(p=>p.eps?.length),e=p.eps[0];g.go('ep-'+p.id+'-'+e[0]);
  const note=g.D.epRoles[p.id][e[0]][e[3][0]];assert.ok(!doc.querySelector('main').textContent.includes(note));
  const cast=doc.querySelector('[data-bk="ep.cast"]')||[...doc.querySelectorAll('main section')].find(x=>x.textContent.includes('Персонажи'));
  const btn=cast.querySelector('[data-spk]');click(s.w,btn);assert.ok(cast.querySelector('.episode-person'));assert.ok(cast.textContent.includes(note));
  g.go('teams');assert.equal(doc.querySelector('.mem'),null);
  g.SPO.mode='off';g.go('teams');assert.ok(doc.querySelector('.mem'));
  g.SPO.mode='upto';g.SPO.order='chronological';g.SPO.ord=1;assert.equal(g.isSpoil([g.D.p.find(p=>p.ord===1).id]),false);assert.equal(g.isSpoil([g.D.p.find(p=>p.ord===2).id]),true);
});

test('input hints are editable through settings and retain source identity after repeated edits',t=>{
  const s=loadGuide();t.after(s.close);s.g.ADM.can=true;s.g.ADM.on=true;s.g.go('catalog');
  const placeholder=s.doc.querySelector('[data-ct-q2]').placeholder;
  s.doc.body.insertAdjacentHTML('beforeend',s.g.settingsHTML());click(s.w,s.doc.querySelector('[data-adm="texts"]'));
  input(s.w,s.doc.querySelector('[data-content-query]'),placeholder);
  click(s.w,[...s.doc.querySelectorAll('[data-content-copy]')].find(x=>x.textContent===placeholder));
  const m=s.doc.getElementById('copyedit');input(s.w,m.querySelector('textarea'),'Введите название');click(s.w,m.querySelector('[data-copy-save]'));
  assert.equal(s.doc.querySelector('[data-ct-q2]').placeholder,'Введите название');
  input(s.w,s.doc.querySelector('[data-content-query]'),'Введите название');click(s.w,s.doc.querySelector('[data-content-copy]'));
  assert.equal(s.doc.getElementById('copyedit').dataset.original,placeholder);
});

test('undo, redo and exported settings preserve text, copy and block edits together',t=>{
  const s=loadGuide();t.after(s.close);s.g.ADM.can=true;s.g.ADM.on=true;
  s.g.saveDraft();s.g.setText('home.title','Изменённый заголовок');
  s.g.copySave('watch','Как смотреть','Инструкция');
  s.g.histGo(-1);assert.equal(s.g.getOvr().copy['watch|Как смотреть'],undefined);assert.equal(s.g.getT('home.title'),'Изменённый заголовок');
  s.g.histGo(1);assert.equal(s.g.getOvr().copy['watch|Как смотреть'],'Инструкция');
  s.g.getOvr().hide['a.history@vibranium']=1;
  const exported=s.g.selfHTML(JSON.stringify(s.g.getOvr()),1),settings=JSON.parse(exported.match(/id="kvm-ovr">([\s\S]*?)<\/script>/)[1]);
  assert.equal(settings.text['home.title'],'Изменённый заголовок');assert.equal(settings.copy['watch|Как смотреть'],'Инструкция');assert.equal(settings.hide['a.history@vibranium'],1);
});

test('map events, races, organizations and biographies keep narrative descriptions outside hidden DOM',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  const sentinel='СЕКРЕТНЫЙ СЮЖЕТНЫЙ ПОВОРОТ';
  const place=g.D.pl[0];place.ab=sentinel;g.go('map');assert.ok(!doc.querySelector('main').textContent.includes(sentinel));
  const event=g.D.ev[0];event.ab=sentinel;g.go('p-'+event.pl);assert.ok(!doc.querySelector('main').textContent.includes(sentinel));
  const race=g.D.enc.races[0];race[3]=sentinel;g.go('r-'+race[0]);assert.ok(!doc.querySelector('main').textContent.includes(sentinel));
  const org=g.D.enc.orgs[0];org[2]=sentinel;g.go('o-'+org[0]);assert.ok(!doc.querySelector('main').textContent.includes(sentinel));
  const c=g.D.c[0];c.ab=sentinel;g.go('c-'+c.id);assert.ok(!doc.querySelector('main').textContent.includes(sentinel));
  g.SPO.mode='off';g.go('c-'+c.id);assert.ok(doc.querySelector('main').textContent.includes(sentinel));
});

test('local reset can restore the source after a global copy and global changes include old local copies',t=>{
  const s=loadGuide();t.after(s.close);s.g.copySave('watch','Как смотреть','Локальный заголовок');s.g.copySave('*','Как смотреть','Общий заголовок');
  s.g.go('watch');assert.equal(s.doc.querySelector('h1').textContent,'Общий заголовок');
  s.g.copySave('watch','Как смотреть','Как смотреть');assert.equal(s.doc.querySelector('h1').textContent,'Как смотреть');
  s.g.go('home');assert.equal(s.doc.querySelector('.hero-actions a').textContent,'Общий заголовок');
});

test('block controls preserve original text nodes across repeated edits',t=>{
  const s=loadGuide();t.after(s.close);editMode(s.g);s.g.go('watch');
  copyEdit(s,s.doc.querySelector('[data-scroll] b'),'Подборки по темам');
  copyEdit(s,s.doc.querySelector('[data-scroll] b'),'Новые подборки');
  assert.equal(s.g.getOvr().copy['watch|Тематические маршруты'],'Новые подборки');
  assert.equal(s.g.getOvr().copy['watch|Подборки по темам'],undefined);
  s.g.go('watch');assert.equal(s.doc.querySelector('[data-scroll] b').textContent,'Новые подборки');
});

test('automatic block keys survive edits to their headings',t=>{
  const s=loadGuide();t.after(s.close);editMode(s.g);s.g.go('o-shield');
  const heading=s.doc.querySelector('main h2'),block=heading.closest('.blk'),key=block.dataset.bk;
  copyEdit(s,heading,'Подборки для просмотра');
  assert.equal(s.doc.querySelector('main h2').closest('.blk').dataset.bk,key);
  click(s.w,s.doc.querySelector('main h2').closest('.blk').querySelector('[data-bhide="page"]'));
  s.g.ADM.edit=false;s.g.go('o-shield');assert.ok(!s.doc.querySelector('main').textContent.includes('Подборки для просмотра'));
});


test('public search excludes hidden encyclopedia categories and updates when restored',t=>{
  const f=loadGuide();t.after(f.close);const {g,w,doc}=f;
  const q=doc.getElementById('q');
  input(w,q,'Щ.И.Т.');
  assert.ok([...doc.querySelectorAll('#sres a')].some(a=>a.getAttribute('href')==='#o-shield'));
  const base=g.getOvr();
  g.setOvr({...base,nav:{...base.nav,orgs:1}});
  input(w,q,'Щ.И.Т.');
  assert.equal([...doc.querySelectorAll('#sres a')].some(a=>a.getAttribute('href')==='#o-shield'),false);
  g.setOvr({...base,nav:{...base.nav}});
  input(w,q,'Щ.И.Т.');
  assert.ok([...doc.querySelectorAll('#sres a')].some(a=>a.getAttribute('href')==='#o-shield'));
});

test('Sacred Timeline lives inside encyclopedia and preserves spoiler controls',t=>{
  const f=loadGuide();t.after(f.close);const {g,doc}=f;
  g.SPO.mode='off';g.go('encyclopedia');
  assert.ok(doc.querySelector('a[href="#sacred-timeline"]'));
  assert.equal(doc.querySelectorAll('.sacred-card').length,0,'encyclopedia shows a compact category, not the article itself');
  g.go('home');assert.equal(doc.querySelectorAll('.sacred-card').length,0);
  g.go('sacred-timeline');
  assert.match(doc.querySelector('main h1').textContent,/Священная линия времени/);
  assert.equal(doc.querySelectorAll('.sacred-card').length,3);
  g.SPO.mode='upto';g.SPO.ord=1;g.go('sacred-timeline');
  assert.ok(doc.querySelector('.sacred-card .spoil-btn'));
});

test('MCU-film default, separate Macau and four photo folders',t=>{
  const f=loadGuide();t.after(f.close);const {g,doc}=f;
  g.go('catalog');
  assert.equal(g.CT2.kind,'film');
  assert.equal(g.CT2.aff.linked,0);
  assert.equal(g.CT2.aff.other,0);
  assert.ok(doc.querySelector('#ct-list a[href="#f-iron-man"]'));
  assert.equal(doc.querySelector('#ct-list a[href="#f-sm-1"]'),null);
  assert.notEqual(g.PL.macau,undefined);
  assert.deepEqual(Array.from(g.P['shang-chi'].pl).includes('macau'),true);
  g.ADM.on=true;g.ADM.can=true;g.go('images');
  assert.equal(doc.querySelectorAll('.img-folder').length,4);
  assert.ok(doc.querySelector('.img-folder'));
});


test('film parts are real sequels rather than synthesized chapters',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.SPO.mode='off';g.go('f-sm-1');
  let list=doc.querySelectorAll('.film-series .film-series-entry');
  assert.equal(list.length,3,'Raimi Spider-Man trilogy');
  assert.deepEqual(Array.from(list,x=>x.querySelector('a.card').getAttribute('href')),['#f-sm-1','#f-sm-2','#f-sm-3']);
  assert.match(doc.querySelector('.film-series').textContent,/Часть 1/);
  assert.ok(!doc.querySelector('.film-parts'));
  g.go('f-homecoming');
  list=doc.querySelectorAll('.film-series .film-series-entry');
  assert.equal(list.length,4,'MCU Spider-Man sequels');
  assert.deepEqual(Array.from(list,x=>x.querySelector('a.card').getAttribute('href')),['#f-homecoming','#f-ffh','#f-nwh','#f-bnd']);
  g.go('f-iron-man');
  assert.equal(doc.querySelectorAll('.film-series .film-series-entry').length,3);
  g.go('f-secret-wars');
  assert.equal(doc.querySelectorAll('.film-series .film-series-entry').length,6,'upcoming Avengers sequel listed but no invented chapters');
  assert.ok(!g.D.filmParts,'generated film chapters removed from data');
});

test('real franchise blocks respect local hiding and first appearances show character portraits',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.SPO.mode='off';g.go('f-homecoming');
  assert.ok(doc.querySelector('main').textContent.includes('Впервые появляются в КВМ'));
  const firstNed=doc.querySelector('.cast-chip[href="#c-ned"]');
  assert.ok(firstNed,'first appearance is linked');
  assert.ok(firstNed.querySelector('.mono'),'first appearance links reuse character portrait component');
  assert.ok(g.getSearch().every(x=>!x.h.startsWith('#fp-')),'synthetic film parts removed from search');
  g.go('f-iron-man');
  assert.ok(doc.querySelector('.film-series'));
  g.setOvr({...g.getOvr(),hide:{...g.getOvr().hide,'p.franchise@iron-man':1}});
  g.go('f-iron-man');
  assert.equal(doc.querySelector('.film-series'),null,'only local series block is hidden');
  g.go('f-iron-man-2');
  assert.ok(doc.querySelector('.film-series'),'other movie retains its series links');
});
