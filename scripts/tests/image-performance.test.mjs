import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {html,loadGuide} from './guide-dom.mjs';

test('first screen prioritizes hero photos and defers other cards', t => {
  const s=loadGuide();t.after(s.close);
  const imgs={};
  for(const id of ['tony','steve','thor','bruce','natasha','clint'])imgs['c-'+id]='img/'+id+'.jpg';
  imgs['f-iron-man']='img/iron-man.jpg';
  s.g.setOvr({img:imgs});
  s.g.go('home');
  const portraits=[...s.doc.querySelectorAll('.h6-portrait img')];
  assert.equal(portraits.length,6);
  assert.ok(portraits.every(img=>img.getAttribute('loading')==='eager'));
  assert.ok(portraits.slice(0,2).every(img=>img.getAttribute('fetchpriority')==='high'));
  assert.equal(portraits[2].getAttribute('fetchpriority'),'auto');
  const poster=s.doc.querySelector('.h6-way-poster img');
  if(poster){assert.equal(poster.getAttribute('loading'),'lazy');assert.equal(poster.getAttribute('fetchpriority'),'low')}
});

test('SVG map images remain available without IntersectionObserver', t => {
  const s=loadGuide();t.after(s.close);
  s.g.setOvr({img:{'mi-contraxia':'img/contraxia-test.png','map-space':'img/space-test.png','map-tree':'img/tree-test.png'}});
  s.g.go('map');
  const planet=s.doc.querySelector('#spacebox [data-sp="contraxia"] image');
  assert.ok(planet);
  assert.equal(planet.getAttribute('href'),'img/contraxia-test.png');
  assert.ok(s.doc.querySelector('#spacebox svg[data-lazy-images]'));
  assert.ok(s.doc.querySelector('#ygbox svg[data-lazy-images]'));
});

test('browser cache handles only same-origin images, without overriding published content', () => {
  const code=readFileSync(new URL('../../sw.js',import.meta.url),'utf8');
  assert.doesNotThrow(()=>new Function(code));
  assert.match(code,/request\.destination !== 'image'/);
  assert.match(code,/scopePath \+ 'img\/'/);
  assert.match(html,/data-map-src/);
  assert.match(html,/data:image\/webp/);
});
