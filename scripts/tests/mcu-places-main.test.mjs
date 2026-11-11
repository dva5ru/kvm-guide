import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGuide,click,html} from './guide-dom.mjs';

const data=JSON.parse(html.match(/id="kvm-data">([\s\S]*?)<\/script>/)[1]);
const review=JSON.parse(readFileSync(new URL('../../audit/mcu-places-main-2026-11-10.json',import.meta.url),'utf8'));
const byId=new Map(data.pl.map(p=>[p.id,p]));

test('all 498 input rows have a disposition and each new place is linked reciprocally to MCU projects',()=>{
  assert.equal(review.decisions.length,498);
  assert.equal(new Set(review.decisions.map(d=>d.row)).size,498);
  assert.equal(review.addedPlaceIds.length,235);
  for(const id of review.addedPlaceIds){
    const p=byId.get(id);assert.ok(p,id);assert.equal(p.scope,'mcu-main');
    assert.equal(p.universe,'earth-616');assert.ok(p.ab.trim());assert.ok(p.sources.length);
    assert.ok(p.parentId?byId.has(p.parentId):p.id==='earth-616');
    for(const pid of p.pr){
      const project=data.p.find(q=>q.id===pid);assert.ok(project,pid);
      assert.ok(['canon','linked'].includes(project.s),pid+' is not a main MCU project');
      assert.ok(project.pl.includes(id),pid+' is missing its reverse place link');
      assert.ok(!/^(x-men|venom|aos|what-if|spider-verse|ff-first-steps|helstrom|inhumans)/.test(pid));
    }
    for(const r of p.sceneRefs||[]){
      assert.ok(p.pr.includes(r.projectId));
      for(const eid of r.episodeIds){const e=data.episodes[eid];assert.ok(e);assert.equal(e.projectId,r.projectId)}
      if(r.projectId==='visionquest')for(const code of r.episodes)assert.ok(+code.slice(-2)<=7);
    }
  }
  assert.deepEqual(review.decisions.find(d=>d.row===123).placeIds,['bella-coola']);
  assert.equal(review.decisions.find(d=>d.row===128).placeIds.length,2);
  assert.equal(review.decisions.find(d=>d.row===436).placeIds.length,2);
});

test('only geolocated Earth places have GPS and projected map coordinates',()=>{
  for(const id of review.addedPlaceIds){
    const p=byId.get(id);
    if(p.t==='e'){
      assert.ok(p.lat>=-90&&p.lat<=90);assert.ok(p.lon>=-180&&p.lon<=180);
      assert.ok(p.x>=0&&p.x<=1000);assert.ok(p.y>=0&&p.y<=520);
      assert.ok(['city','landmark','region','historic-site','area','address'].includes(p.location.precision));
    }else if(p.mapApprox){
      assert.equal(p.location.precision,'regional');
      assert.ok(p.lat>=-90&&p.lat<=90&&p.lon>=-180&&p.lon<=180);
      assert.ok(p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=520);
    }else for(const k of ['lat','lon','x','y'])assert.equal(p[k],undefined,id+' must not have '+k);
    const seen=new Set([p.id]);let q=p;
    while(q.parentId){assert.ok(!seen.has(q.parentId),'hierarchy cycle');seen.add(q.parentId);q=byId.get(q.parentId)}
  }
  assert.equal(byId.get('ta-lo').lat,undefined);
  for(const id of ['westview','avengers-compound','camp-lehigh','maria-rambeau-house','gilgamesh-house']){
    const p=byId.get(id);assert.equal(p.mapApprox,true);assert.equal(p.location.precision,'regional');
  }
  assert.equal(byId.get('baxter-building').parentId,'earth-828');
  assert.equal(byId.get('khan-house').lat,40.7155178);
  assert.equal(byId.get('circle-q').lon,-74.0888394);
});

test('all new location routes render sources and a geographic or schematic point',t=>{
  const s=loadGuide();t.after(s.close);
  for(const id of review.addedPlaceIds){
    s.g.go('p-'+id);
    assert.equal(s.doc.querySelector('main h1').textContent,byId.get(id).n,id);
    assert.ok(s.doc.querySelector('.place-sources a'),id+' sources are inaccessible');
    assert.ok(s.doc.querySelector('.place-node,.atlas-preview-link'),id+' has no atlas preview or schematic node');
    assert.ok(!/NaN|undefined/.test(s.doc.querySelector('main').innerHTML),id+' has broken rendered values');
    assert.ok(s.doc.title.startsWith(byId.get(id).n),id+' has an incorrect title');
  }
  assert.deepEqual(s.errors,[]);
});

test('map controls filter other continuities and keep New Jersey off the NYC city map',t=>{
  const s=loadGuide();t.after(s.close);s.g.go('map');
  assert.equal(s.doc.querySelector('[data-mk="xavier-school"]'),null);
  assert.equal(s.doc.querySelector('[data-mk="ta-lo"]'),null);
  assert.ok(s.doc.querySelector('[data-sp="garden"]'));
  click(s.w,s.doc.querySelector('[data-sp="saber-station"]'));
  assert.match(s.doc.querySelector('#cside').textContent,/S.A.B.E.R./);
  s.g.go('p-jersey-city');
  assert.ok(s.doc.querySelector('.atlas-preview-link[data-show-on-map="jersey-city"]'));
  click(s.w,s.doc.querySelector('.place-node[href="#p-khan-house"]'));
  s.g.go('p-khan-house');
  assert.match(s.doc.querySelector('main').textContent,/179 Grove Street/);
  assert.ok(s.doc.querySelector('.atlas-preview-link[data-show-on-map="khan-house"]'));
});
