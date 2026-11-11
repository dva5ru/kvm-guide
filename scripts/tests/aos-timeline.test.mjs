import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guideData} from '../lib/guide-source.mjs';
import {hydrateAppearances} from '../lib/appearance-registry.mjs';
import {loadGuide,click} from './guide-dom.mjs';

test('Agents of SHIELD has seven navigable seasons and exactly 136 distinct episodes',()=>{
  const d=guideData(),series=d.p.filter(p=>p.sg==='aos').sort((a,b)=>a.sn-b.sn);
  assert.equal(series.length,7);
  assert.deepEqual(series.map(p=>p.id),d.sg.aos);
  const counts=[22,22,22,22,22,13,13];
  for(const p of series){
    const eps=Object.values(d.episodes).filter(e=>e.projectId===p.id).sort((a,b)=>a.number-b.number);
    assert.equal(eps.length,counts[p.sn-1],p.id);
    assert.deepEqual(eps.map(e=>e.number),Array.from({length:counts[p.sn-1]},(_,i)=>i+1));
    for(const ep of eps){
      assert.equal(ep.season,p.sn);
      assert.equal(ep.status,'released');
      assert.ok(ep.title&&ep.originalTitle&&ep.plot&&ep.chronology&&ep.date,ep.id);
      assert.ok(Array.isArray(ep.connections)&&Array.isArray(ep.sources));
      assert.match(ep.date,/^20\\d{2}-\\d{2}-\\d{2}$/);
    }
  }
  const all=Object.values(d.episodes).filter(e=>e.projectId.startsWith('aos-'));
  assert.equal(all.length,136);
  assert.equal(new Set(all.map(e=>e.id)).size,136);
  assert.ok(d.p.some(p=>p.id==='aos'),'umbrella series remains intact');
  assert.doesNotThrow(()=>hydrateAppearances(d),'existing appearance links remain valid');
});

test('SHIELD crossover episodes point to existing MCU films',()=>{
  const d=guideData();
  const cases={
    'aos-1-s1-e8':'thor2',
    'aos-1-s1-e17':'cap2',
    'aos-2-s2-e19':'aou',
    'aos-2-s2-e20':'aou',
    'aos-3-s3-e20':'civil-war',
    'aos-5-s5-e19':'infinity-war'
  };
  for(const [episode,film] of Object.entries(cases)){
    assert.ok(d.episodes[episode].connections.some(c=>c.type==='project'&&c.id===film),episode);
    assert.ok(d.p.some(p=>p.id===film),film);
  }
  assert.match(d.p.find(p=>p.id==='aos-6').note,/Щелч/);
});

test('extended timeline interleaves 110 SHIELD episodes but official order remains unchanged',t=>{
  const s=loadGuide();t.after(s.close);
  const {g,w,doc}=s;
  g.go('timeline');
  assert.equal(doc.querySelectorAll('.aos-timeline-row').length,0,'official order untouched');
  click(w,doc.querySelector('[data-pro-toggle="timeline"]'));
  const chapters=[...doc.querySelectorAll('.aos-timeline-row')];
  assert.equal(chapters.length,10,'ten chronologically positioned chapter groups');
  const links=[...doc.querySelectorAll('.aos-timeline-episodes a')].map(a=>a.getAttribute('href'));
  assert.equal(links.length,110);
  assert.equal(new Set(links).size,110);
  const first=doc.querySelector('.aos-timeline-row a[href="#ep-aos-1-s1-e1"]');
  assert.ok(first,'first episode linked in chronology');
  const season=doc.querySelector('[href="#f-aos-1"]');
  assert.ok(season,'season card linked');
  g.go('f-aos-1');
  assert.ok(doc.querySelector('main').textContent.includes('Серия')||doc.querySelector('main').textContent.includes('Серии'),'season episode navigation visible');
  g.go('ep-aos-1-s1-e8');
  assert.ok(doc.querySelector('main h1').textContent.includes('Колодец'),'episode opens by its unique URL');
});
