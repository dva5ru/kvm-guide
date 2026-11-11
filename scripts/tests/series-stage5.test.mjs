import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hydrateAppearances} from '../lib/appearance-registry.mjs';

const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const marker='<script type="application/json" id="kvm-data">';
const db=JSON.parse(html.split(marker)[1].split('</script>')[0]);

test('both Loki seasons contain twelve distinct full episodes with actual participant records',()=>{
  const d=structuredClone(db);
  assert.doesNotThrow(()=>hydrateAppearances(d));
  const loki=Object.values(d.episodes).filter(e=>e.projectId==='loki-1'||e.projectId==='loki-2');
  assert.equal(loki.length,12);
  assert.equal(new Set(loki.map(e=>e.plot)).size,12);
  assert.equal(new Set(loki.map(e=>e.id)).size,12);
  for(const e of loki){
    assert.equal(e.season,Number(e.projectId.split('-')[1]));
    assert.equal(e.status,'released');
    assert.match(e.date,/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/);
    assert.ok(e.plot.length>250,e.id+' full narrative');
    assert.ok(e.lead&&e.chronology&&e.originalTitle&&e.events.length&&e.changes.length&&e.sources.length>=2,e.id);
    assert.ok(d.p.find(p=>p.id===e.projectId).eps.find(x=>x.id===e.id)[3].length>=2,e.id+' cast');
  }
  assert.equal(d.episodes['loki-1-s1-e4'].post.length,1);
  assert.equal(d.episodes['loki-2-s2-e6'].post.length,0);
  assert.ok(d.appearances.some(a=>a.id==='loki-2::he-who-remains'&&a.episodes.some(e=>e.episodeId==='loki-2-s2-e6')));
});

test('26 What If episodes have dates, source-backed English titles, consistent Russian display',()=>{
  const eps=Object.values(db.episodes).filter(e=>e.projectId.startsWith('what-if-'));
  assert.equal(eps.length,26);
  for(const ep of eps){
    assert.ok(ep.originalTitle.startsWith('What If... '),ep.id);
    assert.ok(ep.title.startsWith('Что, если… '),ep.id);
    assert.match(ep.date,/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/);
    assert.ok(ep.sources.length>=2,ep.id);
    assert.ok(ep.events.length>=2&&ep.changes.length&&Array.isArray(ep.connections),ep.id+' editorial fields');
    for(const connection of ep.connections){
      assert.ok(connection.type&&connection.id&&connection.text,ep.id+' valid connection');
      if(connection.type==='project') assert.ok(db.p.some(p=>p.id===connection.id),ep.id+' known project link');
    }
    assert.ok(ep.chronology.length>30,ep.id+' specific chronology');
  }
});

test('WandaVision episode nine keeps post-credit scenes out of the main plot',()=>{
  const ep=db.episodes['wandavision-s1-e9'];
  assert.equal(ep.post.length,2);
  assert.ok(!ep.plot.includes('изучает Даркхолд'));
  assert.ok(!ep.plot.includes('приглашение в космос'));
  assert.ok(ep.post[0].text.includes('Монике'));
  assert.ok(ep.post[1].text.includes('Даркхолд'));
});

test('all nine Agatha episodes and four Eyes of Wakanda episodes are linked to their respective cast',()=>{
  const d=structuredClone(db), hydrated=hydrateAppearances(d);
  const seasons=[['agatha',9],['eyes-of-wakanda',4]];
  for(const [pid,count]of seasons){
    const eps=Object.values(d.episodes).filter(e=>e.projectId===pid);
    assert.equal(eps.length,count,pid);
    for(const e of eps){
      assert.ok(e.plot.length>250,e.id+' full story');
      assert.ok(e.originalTitle&&e.date&&e.chronology&&e.events.length&&e.changes.length,e.id+' content');
      assert.ok(e.sources.length>=2,e.id+' sources');
      assert.ok(hydrated.episodes.get(e.id)[3].length>=1,e.id+' participant links');
    }
  }
  assert.deepEqual(Object.values(d.episodes).filter(e=>e.projectId==='eyes-of-wakanda').map(e=>e.date), Array(4).fill('2025-08-01'));
  assert.ok(d.appearances.some(a=>a.id==='agatha::mrs-hart'&&a.episodes.length===2));
});

test('What If season one finale keeps the mid-credit scene separate and does not claim Steve is seen',()=>{
 const ep=db.episodes['what-if-1-9'];
 assert.equal(ep.post.length,1);
 assert.equal(ep.post[0].placement,'mid');
 assert.ok(!ep.plot.includes('После титров'));
 assert.ok(ep.post[0].text.includes('Личность'));
});

test('I Am Groot divides into two five-episode seasons with separate dates, roles and sources',()=>{
  const d=structuredClone(db), h=hydrateAppearances(d);
  const episodes=Object.values(d.episodes).filter(e=>e.projectId==='i-am-groot');
  assert.equal(episodes.length,10);
  for(const season of [1,2]){
    const subset=episodes.filter(e=>e.season===season);
    assert.equal(subset.length,5);
    assert.deepEqual(subset.map(e=>e.number),[1,2,3,4,5]);
    for(const e of subset){
      assert.equal(e.status,'released');
      assert.equal(e.date,season===1?'2022-08-10':'2023-09-06');
      assert.ok(e.originalTitle&&e.title&&e.plot.length>=150&&e.events.length===2&&e.sources.length>=2);
      assert.ok(h.episodes.get(e.id)[3].includes('groot'));
    }
  }
  assert.ok(h.episodes.get('i-am-groot-s1-e5')[3].includes('rocket'));
  assert.ok(h.episodes.get('i-am-groot-s2-e5')[3].includes('uatu'));
});


test('series episode participants preserve the unified appearance classifications',()=>{
  assert.equal(db.appearances.length,1357);
  for(const id of ['loki-2::he-who-remains','agatha::mrs-hart','i-am-groot::rocket','i-am-groot::uatu']){
    const a=db.appearances.find(row=>row.id===id);
    assert.ok(a,id);
    assert.ok(['main','episodic','cameo','voice','archival','credits'].includes(a.appearanceType),id);
    assert.equal(a.versionId,a.characterId,id);
    assert.ok(['voice','on-screen'].includes(a.delivery),id);
    assert.equal(a.placement,'main',id);
  }
  for(const id of ['loki-1','loki-2','agatha','eyes-of-wakanda','i-am-groot']){
    const p=db.p.find(project=>project.id===id);
    assert.ok(p?.release&&Array.isArray(p.periods),id+' lost release / story periods');
  }
});
