import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {guideData} from '../lib/guide-source.mjs';
import {hydrateAppearances} from '../lib/appearance-registry.mjs';
import {loadGuide} from './guide-dom.mjs';
const ledger=JSON.parse(readFileSync(new URL('../../audit/data/full-content-audit-2026-11-20.json',import.meta.url)));
const d=guideData();
const byProject=id=>Object.values(d.episodes).filter(e=>e.projectId===id);
const p=id=>d.p.find(p=>p.id===id);
const a=(pid,cid)=>d.appearances.find(a=>a.id===pid+'::'+cid);

test('content expansion preserves every existing character, appearance and episode URL',()=>{
  for(const [key,values] of Object.entries({characters:d.c,appearances:d.appearances,episodes:Object.values(d.episodes)})){
    const ids=new Set(values.map(x=>x.id));
    for(const id of ledger.preservedIds[key])assert.ok(ids.has(id),key+': '+id);
  }
  assert.equal(ledger.findings.length,110);
});

test('previously missing seasons have complete episode registries and linked participants',()=>{
  const expected={'jj-1':13,'jj-2':13,'jj-3':13,'lc-1':13,'lc-2':13,'if-1':13,'if-2':10,'punisher-1':13,'punisher-2':13,defenders:8,'agent-carter-series':18,inhumans:8,runaways:33,'cloak-dagger':20,helstrom:10,yfnsm:10};
  for(const [pid,total]of Object.entries(expected)){
    const eps=byProject(pid);assert.equal(eps.length,total,pid);
    assert.equal(new Set(eps.map(e=>e.plot)).size,total,pid+' has distinct stories');
    for(const e of eps){
      assert.ok(e.originalTitle&&e.date&&e.workingTranslation,e.id);
      assert.ok(e.lead&&e.plot.length>100&&e.events.length&&e.changes.length&&e.connections.length&&e.sources.length,e.id);
      assert.ok(d.appearances.some(a=>a.projectId===pid&&a.episodes.some(er=>er.episodeId===e.id)),e.id+' cast');
    }
  }
  assert.doesNotThrow(()=>hydrateAppearances(structuredClone(d)));
});

test('SHIELD episodes have their own story and cast without the former season template',()=>{
  const eps=Object.values(d.episodes).filter(e=>/^aos-[1-7]$/.test(e.projectId));assert.equal(eps.length,136);
  for(const e of eps){
    assert.doesNotMatch(e.plot,/Эпизод «.+» — часть истории сезона/);
    assert.ok(d.appearances.some(a=>a.episodes.some(er=>er.episodeId===e.id)),e.id);
    assert.ok(e.events.length&&e.changes.length&&e.connections.length&&e.sources.length,e.id);
  }
});

test('corrected chronology, debut identities and alternative children agree across the guide',()=>{
  assert.match(p('captain-marvel').post[0],/2018/);assert.doesNotMatch(p('captain-marvel').post[0],/2023/);
  assert.match(p('quantumania').post[1],/1893/);assert.match(p('ragnarok').sto,/Локи помещает корону/);
  for(const [cid,first,later]of [['roger-harrington','incredible-hulk','homecoming'],['cosmo','gotg','holiday-special'],['modok','ant-man','quantumania'],['victor-timely','quantumania','loki-2'],['nobu','dd-1','dd-2']]){
    assert.ok(p(first).firsts.some(x=>x[0]===cid),cid);assert.ok(!p(later).firsts.some(x=>x[0]===cid),cid);
  }
  for(const cid of ['billy-838','tommy-838']){assert.equal(a('dsmom',cid).role,'X');assert.ok(!a('wandavision',cid));}
  for(const cid of ['sandman','lizard'])assert.equal(a('nwh',cid).role,'X');
  assert.ok(a('quantumania','immortus')&&a('quantumania','rama-tut')&&a('quantumania','centurion-kang'));
  assert.equal(a('jj-3','kilgrave').episodes[0].kind,'voice');
  assert.equal(a('os-consultant','tony').delivery,'archival');
});

test('new relationships and cards render, and multi-season episode links keep their identity',t=>{
  const allowed=new Set(['fam','friend','enemy','love','mentor','variant','conflict']);
  for(const r of d.enc.relations)assert.ok(allowed.has(r[2]),r.join('/'));
  const s=loadGuide();t.after(s.close);s.g.SPO.mode='off';
  for(const id of ['tony','ginter-riva','micro','hope-shlottman','alisa-jones','billy-838','nico-yfnsm','mayhem']){
    s.g.go('c-'+id);assert.ok(s.doc.querySelector('main h1'),id);
  }
  for(const id of ['agent-carter-series-s1-e1','agent-carter-series-s2-e1','runaways-s3-e10','yfnsm-s1-e6']){
    s.g.go('ep-'+id);assert.equal(s.doc.querySelector('main h1').textContent,d.episodes[id].title);
  }
  assert.deepEqual(s.errors,[]);
});
