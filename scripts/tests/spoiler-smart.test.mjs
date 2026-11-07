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
  assert.equal(s.doc.querySelector('script[src="spoiler-index.js"]')!==null,true);
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

test('new settings allow watch order, explicit watched projects and spoiler strength',t=>{
  const s=loadGuide();t.after(s.close);const {g,w,doc}=s;
  click(w,doc.getElementById('spoilBtn'));
  let p=doc.getElementById('spoilPanel');
  assert.ok(p);
  assert.match(p.textContent,/Защита от спойлеров/);
  let mode=p.querySelector('input[name="spSmartMode"][value="upto"]');
  mode.checked=true;mode.dispatchEvent(new w.Event('change',{bubbles:true}));
  p=doc.getElementById('spoilPanel');
  assert.ok(p.querySelector('#spSmartOrder'));
  const pick=p.querySelector('#spSmartLast');
  pick.value=String(g.D.p.find(x=>x.id==='thor-lt').ord);
  pick.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(g.spSeen('eternals'),true);
  const level=doc.querySelector('input[name="spSmartLevel"][value="strict"]');
  level.checked=true;level.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(g.SPO.level,'strict');
  assert.equal(JSON.parse(w.localStorage.getItem('kvm-spoil')).level,'strict');
});

test('admin can correct sentence tags and publishes overrides through the standard draft schema',t=>{
  const ctx=loadGuide();t.after(ctx.close);const {g,w,doc}=ctx;
  g.ADM.can=true;g.ADM.on=true;
  const entry=doc.createElement('button');entry.setAttribute('data-adm','spoilers');doc.body.appendChild(entry);
  click(w,entry);
  const panel=doc.getElementById('admset');
  assert.ok(panel,'spoiler tag editor opens');
  const q=panel.querySelector('[data-sp-tag-query]');
  q.value='ev.emergence';q.dispatchEvent(new w.Event('input',{bubbles:true}));
  const field=doc.querySelector('[data-sp-edit-key="ev.emergence"]');
  assert.ok(field,'can search concrete MCU event');
  const level=field.querySelector('[data-sp-tag-level="0"]');
  level.value='0';level.dispatchEvent(new w.Event('change',{bubbles:true}));
  const saved=g.getOvr();
  assert.equal(saved.spoilers['ev.emergence'][1][0][0],0);
  assert.equal(JSON.parse(w.localStorage.getItem('kvm-draft:/kvm-guide/:v1')).spoilers['ev.emergence'][1][0][0],0);
  const fresh=loadGuide();t.after(fresh.close);fresh.g.setOvr(saved);
  assert.equal(fresh.g.getOvr().spoilers['ev.emergence'][1][0][0],0);
});
