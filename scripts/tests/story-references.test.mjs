import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guideData} from '../lib/guide-source.mjs';
import {loadGuide} from './guide-dom.mjs';

const db=guideData(), refs=db.storyReferences;
const ref=(pid,cid,kind)=>refs.find(r=>r.projectId===pid&&r.characterId===cid&&r.kind===kind);

test('story references are distinct from screen appearances, sourced, linked and exclude Agents of SHIELD',()=>{
  assert.equal(db.storyReferenceSchemaVersion,1);
  assert.ok(refs.length>=19);
  assert.equal(new Set(refs.map(r=>r.id)).size,refs.length);
  const projects=new Set(db.p.map(p=>p.id)), chars=new Set(db.c.map(c=>c.id));
  for(const r of refs){
    assert.ok(projects.has(r.projectId),r.id);
    assert.ok(chars.has(r.characterId),r.id);
    assert.doesNotMatch(r.projectId,/^aos-[1-7]$/,r.id);
    assert.ok(['mention','voice','memory','archive','offscreen','portrayal'].includes(r.kind),r.id);
    assert.match(r.source,/^https:\/\//,r.id);
    if(r.episodeId)assert.equal(db.episodes[r.episodeId]?.projectId,r.projectId,r.id);
  }
  assert.ok(ref('ffh','tony','offscreen'));
  assert.ok(ref('loki-1','frigga','archive'));
  assert.ok(ref('wandavision','pietro','mention'));
  assert.ok(ref('hawkeye','natasha','offscreen'));
  assert.ok(ref('wakanda-forever','tchalla','memory'));
  assert.ok(ref('loki-1','miss-minutes','voice'));
});

test('mention does not register a cameo in canonical project and episode casts',()=>{
  assert.ok(!db.appearances.some(a=>a.id==='hawkeye::natasha'));
  assert.ok(!db.appearances.some(a=>a.id==='wakanda-forever::tchalla'));
  const pietro=db.appearances.find(a=>a.id==='wandavision::pietro');
  assert.ok(pietro);
  assert.ok(!pietro.episodes.some(e=>e.episodeId==='wandavision-s1-e3'));
  assert.ok(ref('wandavision','pietro','mention'));
});

test('reference panels appear on project, episode and character cards',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.SPO.mode='off';
  g.go('f-ffh');
  assert.match(doc.querySelector('.story-references')?.textContent||'',/Тони Старк/);
  assert.match(doc.querySelector('.story-references')?.textContent||'',/Закадровое влияние/);
  g.go('ep-loki-1-s1-e1');
  assert.match(doc.querySelector('.story-references')?.textContent||'',/Фригга/);
  assert.match(doc.querySelector('.story-references')?.textContent||'',/Голос/);
  g.go('c-natasha');
  assert.match(doc.querySelector('.story-references')?.textContent||'',/Соколиный глаз/);
  assert.ok(doc.querySelector('.story-references a[href="#f-hawkeye"]'));
});
