import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGuide,click} from './guide-dom.mjs';

function checkedAt(g,id,level='major'){
  g.SPO.mode='upto';
  g.SPO.order='release';
  g.SPO.ord=g.D.p.find(p=>p.id===id).ord;
  g.SPO.level=level;
  g.SPO.watched=[];
  g.SPO.unwatched=[];
}
test('precompiled index loads and has individual fact tags, without a runtime AI request',t=>{
  const s=loadGuide();t.after(s.close);
  const ix=s.w.KVM_SPOILER_INDEX;
  assert.ok(ix&&Object.keys(ix.entries).length>2000);
  assert.ok(ix.entries['tl.125']);
  assert.ok(ix.entries['ev.emergence']);
  assert.ok(ix.entries['ev.forget']);
  assert.equal(s.doc.querySelector('script[src="assets/js/spoiler-index.js"]'),null);
  assert.equal(s.errors.length,0,s.errors.join(' | '));
});

test('Thor Love and Thunder boundary reveals Tiamut and Peter story, not Brave New World adamantium',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  checkedAt(g,'thor-lt');
  assert.equal(g.spSeen('eternals'),true);
  assert.equal(g.spSeen('nwh'),true);
  assert.equal(g.spSeen('bnw'),false);
  g.go('e-emergence');
  const bio=doc.querySelector('.about');
  assert.match(bio.textContent,/Вечные узнают/);
  assert.doesNotMatch(bio.textContent,/потом там найдут адамантий/);
  assert.ok(bio.querySelector('[data-spk]'),'future BNW information is hidden separately');
  assert.match(doc.querySelector('h1').textContent,/Тиамут/);
  g.go('e-forget');
  assert.match(doc.querySelector('h1').textContent,/Питера/);
  assert.match(doc.querySelector('.about').textContent,/заклинани/);
});

test('manual watched exception overrides chronological/release progress without leaking next story',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  checkedAt(g,'thor-lt');
  g.SPO.unwatched=['eternals'];
  assert.equal(g.spSeen('eternals'),false);
  g.go('e-emergence');
  assert.doesNotMatch(doc.querySelector('h1').textContent,/Тиамут/);
  assert.doesNotMatch(doc.querySelector('.about').textContent,/Серси/);
  g.SPO.watched=['eternals'];g.SPO.unwatched=[];
  g.SPO.mode='manual';
  g.go('e-emergence');
  assert.match(doc.querySelector('.about').textContent,/Серси/);
  assert.doesNotMatch(doc.querySelector('.about').textContent,/адамантии/);
  g.go('e-forget');
  assert.doesNotMatch(doc.querySelector('h1').textContent,/Питера/);
});

test('strict mode protects setup sentences but important-only mode leaves them readable',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;
  g.SPO.mode='manual';g.SPO.watched=['ffh'];g.SPO.unwatched=[];
  g.SPO.level='major';
  let out=g.spField('tl.125',g.D.tl[125][2],g.D.tl[125][3]);
  assert.match(out,/Питер просит Стрэнджа/);
  assert.doesNotMatch(out,/Заклинание ломается/);
  g.SPO.level='strict';
  out=g.spField('tl.125',g.D.tl[125][2],g.D.tl[125][3]);
  assert.doesNotMatch(out,/Питер просит Стрэнджа/);
  assert.match(out,/data-spk/);
});

test('changed content is conservatively protected rather than trusted with stale tags',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.SPO.mode='manual';g.SPO.watched=[];g.SPO.level='major';
  const e=g.D.ev.find(x=>x.id==='emergence');
  e.ab='НЕОЖИДАННЫЙ ФИНАЛ: секретный текст редактора';
  g.go('e-emergence');
  assert.doesNotMatch(doc.querySelector('main').textContent,/НЕОЖИДАННЫЙ ФИНАЛ/);
  assert.ok(doc.querySelector('.about [data-spk]'));
  g.SPO.mode='off';g.go('e-emergence');
  assert.match(doc.querySelector('main').textContent,/НЕОЖИДАННЫЙ ФИНАЛ/);
});

test('spoiler preferences are disabled on the public site',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  assert.equal(g.SPO.mode,'off');
  assert.equal(doc.getElementById('spoilBtn'),null);
  assert.equal(doc.getElementById('spoilPanel'),null);
  assert.equal(doc.querySelector('.spoil-btn'),null);
  assert.ok(doc.querySelector('.h6-release-summary').textContent.trim().length>0);
});

test('admin spoiler-label editor is absent until its redesign',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc,w}=s;
  g.ADM.can=true;g.ADM.on=true;
  g.go('home');
  assert.equal(doc.querySelector('[data-adm="spoilers"]'),null);
  const entry=doc.createElement('button');entry.setAttribute('data-adm','spoilers');doc.body.appendChild(entry);
  click(w,entry);
  assert.equal(doc.getElementById('admset'),null);
});
