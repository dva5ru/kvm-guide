import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hydrateAppearances} from '../lib/appearance-registry.mjs';
import {loadGuide,editMode} from './guide-dom.mjs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const raw=JSON.parse(html.match(/id="kvm-data">([\s\S]*?)<\/script>/)[1]);
const clone=()=>structuredClone(raw);

test('one canonical registry preserves project links and derives episode casts, descriptions and credits',t=>{
  const db=clone(),{records}=hydrateAppearances(db),s=loadGuide();t.after(s.close);
  assert.equal(records.size,raw.appearances.length);assert.ok(records.size>=1282);assert.ok(raw.appearances.some(a=>a.id==='homecoming::tinkerer'));assert.equal(raw.appearances.reduce((n,a)=>n+a.episodes.length,0),481);
  assert.equal(raw.epRoles,undefined);assert.equal(raw.appearanceCredits,undefined);
  assert.ok(raw.c.every(c=>c.notes===undefined&&c.app===undefined));assert.ok(raw.p.every(p=>p.cs===undefined));
  for(const p of db.p){
    assert.deepEqual(JSON.parse(JSON.stringify(s.g.P[p.id].cs)),p.cs,p.id+' cast');
    for(const e of p.eps||[])assert.deepEqual(JSON.parse(JSON.stringify(s.g.P[p.id].eps.find(x=>x[0]===e[0])[3])),e[3],p.id+'/'+e[0]);
  }
  for(const c of db.c){
    assert.deepEqual(JSON.parse(JSON.stringify(s.g.C[c.id].app)),c.app,c.id+' order');
    assert.deepEqual(JSON.parse(JSON.stringify(s.g.C[c.id].notes)),c.notes,c.id+' descriptions');
  }
});

test('registry validation rejects duplicate links, missing episodes, bad references and unsourced performers',()=>{
  let d=clone();d.appearances.push(structuredClone(d.appearances[0]));assert.throws(()=>hydrateAppearances(d),/Invalid appearance/);
  d=clone();d.appearances.find(a=>a.episodes.length).episodes[0].episodeId='missing-episode';assert.throws(()=>hydrateAppearances(d),/Invalid episode appearance/);
  d=clone();d.appearances.find(a=>a.descriptionFrom).descriptionFrom='endgame::unknown';assert.throws(()=>hydrateAppearances(d),/Invalid edition description/);
  d=clone();delete d.appearances.find(a=>a.credit).credit.source;assert.throws(()=>hydrateAppearances(d),/Invalid sourced credit/);
});

test('Spider-Verse films belong to films; animated series belong to series',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.CT2.aff={mcu:1,linked:1,other:1};g.CT2.kind='film';g.go('catalog');
  for(const id of ['spider-verse-1','spider-verse-2']){
    g.go('catalog');assert.ok(doc.querySelector('#ct-list a[href="#f-'+id+'"]'),id);
    g.go('f-'+id);assert.ok(doc.querySelector('main').textContent.includes('Анимационный фильм'));
  }
  g.CT2.kind='series';g.go('catalog');
  assert.equal(doc.querySelector('#ct-list a[href="#f-spider-verse-1"]'),null);
  assert.ok(doc.querySelector('#ct-list a[href="#f-what-if-1"]'));
  assert.ok(doc.querySelector('#ct-list a[href="#f-loki-1"]'));
  assert.equal(g.P.yfnsm.s,'alt');assert.equal(g.D.p.length,raw.p.length);
});

test('Wanda origin, Loki credit sequences and adamantium timeline no longer contradict their cards',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  g.go('c-wanda');assert.match(doc.querySelector('main').textContent,/ещё в детстве/);assert.match(doc.querySelector('main').textContent,/усилили её врождённые/);
  assert.match(g.artGet('mind').ab,/до опытов/);
  assert.match(g.P['what-if-1'].eps[6][2],/до титров/);
  assert.ok(!g.artGet('adamantium').path.some(step=>step[0]==='2025'));
  g.go('f-loki-1');assert.match(doc.querySelector('main').textContent,/Серия 4, сцена в середине титров/);assert.match(doc.querySelector('main').textContent,/Серия 6, объявление/);
  g.go('f-loki-2');assert.match(doc.querySelector('main').textContent,/Серия 1, сцена в середине титров/);
  g.SPO.mode='all';g.go('f-loki-2');assert.ok(!doc.querySelector('main').textContent.includes('McDonald’s'));
});

test('Zola appears in episodes 1, 8 and 9; Ronan stays linked to all three represented projects',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;
  assert.deepEqual(Array.from(g.P['what-if-1'].eps).filter(e=>e[3].includes('zola')).map(e=>e[0]),[1,8,9]);
  assert.deepEqual([...g.C.ronan.app].map(a=>a[0]).sort(),['captain-marvel','gotg','what-if-2']);
  assert.match(g.D.epRoles['what-if-1'][1].zola,/Пегги захватывает/);
  assert.match(g.D.epRoles['what-if-3'][7].carol,/воспоминании/);
  for(const cid of ['korg','groot-what-if','carol'])assert.ok(!g.D.epRoles['what-if-3'][7][cid].includes('предпоследней серии'));
});

test('episode editor keys stay stable and legacy JSON keys update the same canonical description',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;editMode(g);
  const key='appearance.what-if-3.korg.7',a=g.D.appearances.find(a=>a.id==='what-if-3::korg'),e=a.episodes.find(e=>e.number===7);
  g.saveDraft();g.setText(key,'Корг помогает эвакуировать Ксандар.');
  assert.equal(e.description,'Корг помогает эвакуировать Ксандар.');assert.match(g.C.korg.notes['what-if-3'],/эвакуировать/);
  const legacy='json.'+encodeURIComponent(JSON.stringify(['epRoles','what-if-3','7','korg']));
  g.setText(legacy,'Правка из старой резервной копии.');assert.equal(e.description,'Правка из старой резервной копии.');
  g.histGo(-1);assert.equal(e.description,'Корг помогает эвакуировать Ксандар.');
  const fresh=loadGuide();t.after(fresh.close);fresh.g.setOvr(JSON.parse(s.w.localStorage.getItem('kvm-draft:/kvm-guide/:v1')));
  assert.equal(fresh.g.D.epRoles['what-if-3'][7].korg,'Корг помогает эвакуировать Ксандар.');
});

test('edition descriptions reuse the specific original and allow an independent local edit',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;
  assert.equal(g.C.tony.notes['endgame-encore'],g.C.tony.notes.endgame);
  g.setText('c.tony.note.endgame','Собирает перчатку и останавливает Таноса.');
  assert.equal(g.C.tony.notes['endgame-encore'],'Собирает перчатку и останавливает Таноса.');
  g.setText('c.tony.note.endgame-encore','Отдельная редакторская подпись переиздания.');
  assert.equal(g.C.tony.notes.endgame,'Собирает перчатку и останавливает Таноса.');
  assert.equal(g.C.tony.notes['endgame-encore'],'Отдельная редакторская подпись переиздания.');
  g.setText('c.tony.note.endgame-encore','Собирает перчатку и останавливает Таноса.');
  g.setText('c.tony.note.endgame','Новая подпись исходного фильма.');
  assert.equal(g.C.tony.notes['endgame-encore'],'Новая подпись исходного фильма.');
});

test('episode cast credits never infer a live-action performer or unchecked season-wide credit',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s,p=g.P['what-if-1'];
  assert.equal(g.appearanceCredit(p,'tony',p.eps[5]),null);
  assert.equal(g.appearanceCredit(p,'zola',p.eps[0]).performer,'Тоби Джонс');
  assert.equal(g.appearanceCredit(g.P['what-if-3'],'groot-what-if',g.P['what-if-3'].eps[6]).performer,'Фред Таташор');
  assert.match(g.creditTag(g.P.doomsday,'cassie'),/заявлен исполнитель/);
});
