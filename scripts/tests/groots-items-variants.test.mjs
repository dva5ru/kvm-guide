import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGuide,editMode,click,input} from './guide-dom.mjs';

const plain=x=>JSON.parse(JSON.stringify(x));

test('the original Groot, his son and the Xandar variant have separate histories, first appearances and team memberships',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  assert.deepEqual(plain(g.C['groot-original'].app),[['gotg','L']]);
  assert.ok(g.C.groot.app.some(a=>a[0]==='gotg'&&a[1]==='P'),'the son dances in the first film credits');
  assert.ok(g.C.groot.app.some(a=>a[0]==='gotg2'));
  assert.ok(!g.C.groot.app.some(a=>a[0].startsWith('what-if')));
  assert.deepEqual(plain(g.C['groot-what-if'].app).map(a=>a[0]),['what-if-2','what-if-3']);
  assert.equal(g.D.epRoles['what-if-3'][7].groot,undefined);
  assert.match(g.D.epRoles['what-if-3'][7]['groot-what-if'],/Ксандаре/);
  const team=g.D.enc.teams.find(x=>x[0]==='guardians');
  assert.ok(team[4][0][2].split(',').includes('groot-original'));
  assert.ok(!team[4][0][2].split(',').includes('groot'));
  assert.ok(team[4][1][2].split(',').includes('groot'));
  assert.ok(g.EV['battle-xandar'].ch.includes('groot-original'));
  assert.ok(!g.EV['battle-xandar'].ch.includes('groot'));
  g.go('f-gotg');
  for(const id of ['groot-original','groot'])assert.ok(doc.querySelector('a[href="#c-'+id+'"]'));
  for(const id of ['groot-original','groot','groot-what-if']){
    g.go('c-'+id);assert.equal(doc.querySelector('.ver-switch [aria-current="page"]').getAttribute('href'),'#c-'+id);
    assert.ok(doc.querySelector('h1').textContent.includes('Грут'));
  }
  assert.ok(!s.errors.length,s.errors.join('\n'));
});

test('legacy Groot edits follow the correct identity and the two first-film notes remain independently editable',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;editMode(g);g.saveDraft();
  g.setText('c.groot.note.gotg','ПРЕЖНЯЯ ПРАВКА: защищает друзей.');
  assert.equal(g.C['groot-original'].notes.gotg,'ПРЕЖНЯЯ ПРАВКА: защищает друзей.');
  assert.match(g.C.groot.notes.gotg,/танцует/);
  g.setText('project-appearance.gotg.groot','НОВАЯ ПРАВКА: танцует в горшке.');
  assert.equal(g.C.groot.notes.gotg,'НОВАЯ ПРАВКА: танцует в горшке.');
  assert.equal(g.C['groot-original'].notes.gotg,'ПРЕЖНЯЯ ПРАВКА: защищает друзей.');
  g.histGo(-1);assert.match(g.C.groot.notes.gotg,/танцует/);
  g.histGo(1);assert.equal(g.C.groot.notes.gotg,'НОВАЯ ПРАВКА: танцует в горшке.');
  g.setText('appearance.what-if-3.groot.7','ПРЕЖНЯЯ ПРАВКА СЕРИИ: остаётся на Ксандаре.');
  assert.equal(g.D.epRoles['what-if-3'][7]['groot-what-if'],'ПРЕЖНЯЯ ПРАВКА СЕРИИ: остаётся на Ксандаре.');
  const legacy='json.'+encodeURIComponent(JSON.stringify(['epRoles','what-if-2','1','groot']));
  g.setText(legacy,'ПРАВКА ИЗ СТАРОЙ КОПИИ.');
  const saved=JSON.parse(s.w.localStorage.getItem('kvm-draft:/kvm-guide/:v1'));
  const fresh=loadGuide();t.after(fresh.close);fresh.g.setOvr(saved);
  assert.equal(fresh.g.C['groot-original'].notes.gotg,'ПРЕЖНЯЯ ПРАВКА: защищает друзей.');
  assert.equal(fresh.g.C.groot.notes.gotg,'НОВАЯ ПРАВКА: танцует в горшке.');
  assert.equal(fresh.g.D.epRoles['what-if-2'][1]['groot-what-if'],'ПРАВКА ИЗ СТАРОЙ КОПИИ.');
  fresh.g.setOvr({});assert.match(fresh.g.C.groot.notes.gotg,/маленький Грут/);
  assert.match(fresh.g.C['groot-original'].notes.gotg,/Закрывает/);
  assert.match(fresh.g.D.epRoles['what-if-2'][1]['groot-what-if'],/Небуле/);
});

test('all stored alternative cards have reciprocal switches and distinct people are not grouped by actor',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  for(const ids of Object.values(g.D.versions))for(const id of ids){
    g.go('c-'+id);const nav=doc.querySelector('nav[aria-label="Версии персонажа"]');assert.ok(nav,id);
    assert.deepEqual([...nav.querySelectorAll('a')].map(a=>a.getAttribute('href')),plain(ids).map(cid=>'#c-'+cid),id);
    assert.equal(nav.querySelectorAll('[aria-current="page"]').length,1);
    assert.equal(nav.querySelector('[aria-current="page"]').getAttribute('href'),'#c-'+id);
  }
  for(const [a,b]of [['peter','peter-maguire'],['peter','peter-garfield'],['peter','peter-yfnsm'],['peter','peter-b-parker'],['loki','sylvie'],['loki','classic-loki'],['loki','alligator-loki'],['kang','he-who-remains'],['kang','victor-timely'],['deadpool','nicepool'],['deadpool','dogpool'],['deadpool','ladypool'],['johnny','johnny-evans'],['blade','blade-mcu'],['elektra','elektra-n'],['green-goblin','norman-yfnsm'],['jean','jean-mcu']])assert.equal(g.C[a].verGroup,g.C[b].verGroup,a+'/'+b);
  for(const id of ['pietro-fake','robbie-reyes','virgil-horton','phineas-horton']){g.go('c-'+id);assert.equal(doc.querySelector('.ver-switch'),null,id)}
  assert.ok(g.D.versions.steve.includes('steve-zombies'));
  assert.ok(g.D.versions.rocket.includes('rocket-zombies'));
  assert.ok(!g.D.versions.peter.includes('miles-morales-anim'),'Miles is not Peter Parker');
  assert.ok(!g.D.versions.johnny.includes('steve'),'Chris Evans does not make Steve and Johnny variants');
});

test('project item blocks share encyclopedia links, photos and edited names and respect local hiding',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  g.setOvr({img:{'a-stormbreaker':'img/test-axe.webp'}});g.go('f-infinity-war');
  let block=doc.querySelector('.project-items');assert.ok(block);
  const axe=block.querySelector('a[href="#a-stormbreaker"]');assert.ok(axe);
  assert.equal(axe.querySelector('img').getAttribute('src'),'img/test-axe.webp');
  assert.equal(block.querySelector('a[href="#a-mjolnir"]'),null,'a historical reference is not a physical Mjolnir appearance');
  g.go('a-mjolnir');assert.equal(doc.querySelector('section:last-child a[href="#f-infinity-war"]'),null);
  g.go('f-wakanda-forever');assert.equal(doc.querySelector('.project-items a[href="#a-armor"]'),null,'Riri armor is not Tony armor');
  g.go('f-endgame');assert.ok(doc.querySelector('.project-items a[href="#a-nano-gauntlet"]'));
  g.go('f-endgame-encore');assert.equal(doc.querySelector('.project-items'),null,'a rerelease only shows edition differences');assert.ok(doc.querySelector('a[href="#f-endgame"]'),'original film remains linked');
  g.go('f-wandavision');assert.ok(doc.querySelector('.project-items a[href="#a-darkhold"]'));
  editMode(g);const key='json.'+encodeURIComponent(JSON.stringify(['enc','artifacts',2,1]));g.setText(key,'Громобой — новое название');
  g.go('f-infinity-war');assert.match(doc.querySelector('.project-items a[href="#a-stormbreaker"]').textContent,/новое название/);
  block=doc.querySelector('[data-bk="p.items"]');assert.ok(block);click(s.w,block.querySelector('[data-bhide="page"]'));
  g.ADM.edit=false;g.go('f-infinity-war');assert.equal(doc.querySelector('.project-items'),null);
  g.go('f-endgame');assert.ok(doc.querySelector('.project-items'));
  const saved=g.getOvr(),fresh=loadGuide();t.after(fresh.close);fresh.g.setOvr(plain(saved));fresh.g.SPO.mode='off';fresh.g.go('f-infinity-war');
  assert.equal(fresh.doc.querySelector('.project-items'),null);
});

test('item names from unseen projects stay out of the DOM and hidden categories do not leak into project blocks',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.SPO.mode='all';g.go('f-dsmom');let block=doc.querySelector('.project-items');assert.ok(block.querySelector('.spoil-btn'));
  assert.equal(block.querySelector('a[href="#a-book-vishanti"]'),null);assert.ok(!block.textContent.includes('Книга Вишанти'));
  click(s.w,block.querySelector('.spoil-btn'));assert.ok(block.querySelector('a[href="#a-book-vishanti"]'));
  g.SPO.mode='upto';g.SPO.ord=g.P['doctor-strange'].ord;g.go('f-doctor-strange');
  assert.ok(doc.querySelector('.project-items a[href="#a-eye-agamotto"]'));
  g.go('f-dsmom');assert.equal(doc.querySelector('.project-items a[href="#a-book-vishanti"]'),null);
  g.SPO.mode='off';g.setOvr({nav:{weapons:1}});g.go('f-infinity-war');
  assert.equal(doc.querySelector('.project-items a[href="#a-stormbreaker"]'),null);
  assert.ok(doc.querySelector('.project-items a[href="#a-thanos-gauntlet"]'));
});

test('project and item appearance links agree across the full catalog without duplicate cards',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  for(const a of g.artAll())for(const pid of g.itemProjects(a))assert.ok(g.projectItems(g.P[pid]).some(item=>item.id===a.id),a.id+'/'+pid);
  for(const pid of ['avengers','infinity-war','endgame','bnw','fws','loki-1','what-if-2']){
    g.go('f-'+pid);const links=[...doc.querySelectorAll('.project-items .art-card')].map(el=>el.getAttribute('href'));
    assert.equal(new Set(links).size,links.length,pid+' has no duplicate item cards');
    for(const href of links){g.go(href.slice(1));assert.ok(!doc.querySelector('main').textContent.includes('Страница не найдена'),href)}
  }
  g.go('c-groot-original');input(s.w,doc.getElementById('q'),'Original Groot');assert.ok(doc.querySelector('#sres a[href="#c-groot-original"]'));
  assert.ok(!s.errors.length,s.errors.join('\n'));
});
