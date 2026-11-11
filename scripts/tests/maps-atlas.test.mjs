import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGuide,click} from './guide-dom.mjs';

test('the atlas has Earth zoom while cosmos and Nine Worlds retain a fixed camera',t=>{
  const s=loadGuide();t.after(s.close);s.g.go('map');
  for(const id of ['kmapbox','nycbox','londonbox','spacebox','ygbox','dimensionsbox']){
    assert.ok(s.doc.getElementById(id),'missing atlas section '+id);
  }
  assert.ok(s.doc.querySelector('.atlas-nav [data-scroll="londonbox"]'));
  const space=s.doc.querySelector('#spacebox .smap'),tree=s.doc.querySelector('#ygbox .ymap');
  assert.ok(space&&tree);
  assert.equal(space.getAttribute('viewBox'),'0 0 1000 560');
  assert.equal(tree.getAttribute('viewBox'),'0 0 1000 650');
  assert.equal(s.doc.querySelector('[data-atlas-zoom^="space:"]'),null);
  assert.equal(s.doc.querySelector('[data-atlas-zoom^="tree:"]'),null);
  const earth=s.doc.querySelector('#kmap'),before=earth.getAttribute('viewBox');
  click(s.w,s.doc.querySelector('[data-atlas-zoom="earth:in"]'));
  assert.notEqual(earth.getAttribute('viewBox'),before);
  assert.equal(space.getAttribute('viewBox'),'0 0 1000 560');
  assert.equal(tree.getAttribute('viewBox'),'0 0 1000 650');
});

test('London has address-grounded pins, and places without locations stay off the map',t=>{
  const s=loadGuide();t.after(s.close);s.g.go('map');
  const l=s.doc.getElementById('londonbox');
  assert.ok(l.querySelector('.citymap'));
  assert.ok(l.querySelector('[data-cty="london-greenwich"]'));
  assert.ok(l.querySelector('[data-cty="london-tower-bridge"]'));
  assert.equal(l.querySelector('.citymap [data-cty="london-sanctum"]'),null);
  click(s.w,l.querySelector('.citymap [data-cty="london-greenwich"]'));
  assert.match(l.querySelector('#londonside').textContent,/Гринвич/);
  assert.ok(l.querySelector('#londonside a[href="#p-london-greenwich"]'));
  for(const id of ['mirror-dimension','astral-plane','ancestral-plane','noor-dimension']){
    assert.ok(s.g.PL[id],id+' must exist in the location directory');
    assert.ok(s.doc.querySelector('#dimensionsbox a[href="#p-'+id+'"]'));
  }
  assert.doesNotMatch(s.doc.querySelector('#spacebox').textContent,/Точных координат в фильмах нет/);
  assert.doesNotMatch(s.doc.querySelector('#ygbox').textContent,/Так их показывали в «Торе»/);
});

test('existing uploaded map image bindings are not replaced by atlas changes',t=>{
  const s=loadGuide();t.after(s.close);
  s.g.setOvr({img:{'mi-contraxia':'img/custom-contraxia.png','mi-asgard':'img/custom-asgard.png'}});
  s.g.go('map');
  const planet=s.doc.querySelector('#spacebox .smap [data-sp="contraxia"]');
  click(s.w,planet);
  assert.equal(s.doc.querySelector('#cside .map-place-visual img').getAttribute('src'),'img/custom-contraxia.png');
  const realm=s.doc.querySelector('#ygbox .ymap [data-yg="asgard"]');
  click(s.w,realm);
  assert.equal(s.doc.querySelector('#yside .map-place-visual img').getAttribute('src'),'img/custom-asgard.png');
});
