import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGuide} from './guide-dom.mjs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const db=JSON.parse(html.match(/id="kvm-data">([\s\S]*?)<\/script>/)[1]);
const projects=new Map(db.p.map(p=>[p.id,p]));
const appearances=new Map(db.appearances.map(a=>[a.id,a]));
test('premiere dates are independent from story years and chronological spans',()=>{
  assert.equal(projects.size,156);
  for(const p of db.p){
    assert.equal(p.release.date,p.r||null,p.id);
    assert.equal(p.release.year,p.y||null,p.id);
    assert.ok(Array.isArray(p.periods),p.id);
  }
  for(const id of ['cap1','captain-marvel','eternals','endgame','loki-1','loki-2','dofp','spider-verse-1','spider-verse-2','what-if-1','what-if-2','what-if-3']){
    assert.ok(projects.get(id).periods.length>1 || ['what-if-1','what-if-2','what-if-3'].includes(id),id);
  }
  assert.ok(projects.get('eternals').periods.some(p=>p.kind==='flashback'));
  assert.deepEqual(projects.get('dofp').periods.slice(0,2).map(p=>p.when),['1973','2023']);
});
test('six appearance kinds preserve independent version and placement data',()=>{
  assert.equal(appearances.size,1324);
  const types=new Set(['main','episodic','cameo','voice','archival','credits']);
  for(const a of db.appearances){
    assert.ok(types.has(a.appearanceType),a.id);
    assert.equal(a.versionId,a.characterId,a.id);
    assert.ok(['main','credits','main-and-credits'].includes(a.placement),a.id);
    if(a.role==='X')assert.ok(a.versionRef.length>0,a.id);
  }
  assert.equal(appearances.get('venom-2::peter').appearanceType,'archival');
  assert.equal(appearances.get('eternals::blade-mcu').delivery,'voice');
  assert.equal(appearances.get('eternals::blade-mcu').placement,'credits');
  assert.equal(appearances.get('deadpool-wolverine::johnny-evans').originProjectId,'ff-2005');
});
test('project pages list release and multiple periods, without conflation',t=>{
  const s=loadGuide();t.after(s.close);s.g.SPO.mode='off';
  for(const [id,phrases] of [['cap1',['Дата премьеры','Основное действие','Эпилог']],['eternals',['Основное действие','Флешбэки']],['dofp',['1973','2023']],['loki-1',['Вне линейного времени','Начало ветви']]]){
    s.g.go('f-'+id);const body=s.doc.querySelector('main').textContent;for(const phrase of phrases)assert.ok(body.includes(phrase),id+' '+phrase);
  }
  s.g.go('f-what-if-1');assert.match(s.doc.querySelector('main').textContent,/Голос/);
});
test('editions show differences and new scenes, not original cast or plot',t=>{
  const s=loadGuide();t.after(s.close);s.g.SPO.mode='off';
  for(const id of ['endgame-encore','once-upon-a-deadpool']){
    s.g.go('f-'+id);const body=s.doc.querySelector('main').textContent;
    assert.match(body,/Отличия от оригинала/,id);assert.match(body,/Оригинал/,id);
    assert.equal(s.doc.querySelector('main .project-items'),null,id);
    assert.ok(s.doc.querySelector('a[href="#f-'+projects.get(id).editionOf+'"]'),id);
    assert.ok(!body.includes('Что важно для КВМ'),id);
  }
  s.g.go('f-endgame-encore');
  assert.match(s.doc.querySelector('main').textContent,/Новые участники дополнительных сцен/);
  assert.ok(!s.doc.querySelector('main').textContent.includes('Битва за Землю, Тони щёлкает'), 'original beat is not duplicated');
});
test('future film pages show only official information and do not assert actual roles',t=>{
  const s=loadGuide();t.after(s.close);s.g.SPO.mode='off';
  for(const id of ['doomsday','secret-wars','x-men-mcu','ghost-rider-mcu','black-panther-3']){
    assert.ok(projects.get(id).announcement?.sources?.length,id);
    s.g.go('f-'+id);
    const body=s.doc.querySelector('main').textContent;
    assert.match(body,/Подтверждённые сведения/,id);
    assert.ok(!body.includes('Что важно для КВМ'),id);
    assert.ok(!body.includes('Сюжет держат в тайне, поэтому здесь'),id);
  }
  s.g.go('f-doomsday');assert.match(s.doc.querySelector('main').textContent,/Заявлены до премьеры/);
});
