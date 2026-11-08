import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGuide,click,editMode} from './guide-dom.mjs';

test('the cosmic map reuses the selected planet image in the side card',t=>{
  const s=loadGuide();t.after(s.close);
  s.g.setOvr({img:{'mi-contraxia':'img/contraxia-test.png'}});
  s.g.go('map');

  const planet=s.doc.querySelector('#spacebox .smap [data-sp="contraxia"]');
  assert.ok(planet,'Contraxia appears on the cosmic map');
  const mapImage=planet.querySelector('image');
  assert.ok(mapImage,'the image assigned to Contraxia appears on the map');
  click(s.w,planet);

  const side=s.doc.querySelector('#cside');
  const preview=side.querySelector('.map-place-visual img');
  assert.ok(preview,'the selected planet has an image inside its side panel');
  assert.equal(preview.getAttribute('src'),mapImage.getAttribute('href'));
  assert.match(preview.getAttribute('alt'),/Контраксия/);
  const reveal=side.querySelector('.spoil-btn');
  if(reveal)click(s.w,reveal);
  assert.match(side.textContent,/Заснеженная планета/);
  assert.ok(side.querySelector('a[href="#p-contraxia"]'),'the place detail link is preserved');
});

test('Nine Realms labels stay above all worlds and track editor dragging',t=>{
  const s=loadGuide();t.after(s.close);
  s.g.setOvr({img:{'mi-asgard':'img/asgard-test.png','mi-__earth':'img/earth-test.png'}});
  s.g.go('map');

  const svg=s.doc.querySelector('#ygbox .ymap');
  const labelLayer=svg.querySelector('.realm-label-layer');
  assert.ok(labelLayer,'a dedicated label layer exists');
  assert.equal(svg.lastElementChild,labelLayer,'labels are painted after every planet image');
  assert.equal(labelLayer.getAttribute('aria-hidden'),'true','duplicate labels are hidden from screen readers');

  const asgard=svg.querySelector('[data-yg="asgard"]');
  const label=svg.querySelector('[data-realm-label="asgard"]');
  assert.ok(asgard&&label,'Asgard and its floating label both exist');
  assert.equal(asgard.querySelector('.rl'),null,'the label is separate from the planet drawing');
  assert.match(label.textContent,/Асгард/);
  assert.equal(label.getAttribute('transform'),asgard.getAttribute('transform'));

  click(s.w,asgard);
  const preview=s.doc.querySelector('#yside .map-place-visual img');
  assert.ok(preview,'the world side card shows its assigned world image');
  assert.equal(preview.getAttribute('src'),'img/asgard-test.png');

  editMode(s.g);
  svg.getScreenCTM=()=>({a:1});
  asgard.dispatchEvent(new s.w.MouseEvent('pointerdown',{bubbles:true,clientX:10,clientY:10,button:0}));
  s.doc.dispatchEvent(new s.w.MouseEvent('pointermove',{bubbles:true,clientX:46,clientY:23,button:0}));
  assert.equal(label.getAttribute('transform'),asgard.getAttribute('transform'),'the label follows the world while dragging');
  s.doc.dispatchEvent(new s.w.MouseEvent('pointerup',{bubbles:true,button:0}));
});
