import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadGuide,click} from './guide-dom.mjs';

test('character portraits open one gallery, cycle by image edges and close on the image',()=>{
 const {g,w,doc,close}=loadGuide();
 try{
  g.setOvr({img:{
   'c-tony':'img/tony-main.webp',
   'c-tony--look-1':'img/tony-first-look.webp',
   'c-tony--look-2':'img/tony-second-look.webp',
  },copy:{'look:c-tony--look-1':'Первый костюм'}});
  g.go('c-tony');
  const opener=doc.querySelector('.dhead [data-zoom-key="c-tony"]');
  click(w,opener);
  const photo=()=>doc.querySelector('#photo-zoom .photo-zoom-stage>img')?.getAttribute('src');
  const action=name=>doc.querySelector('#photo-zoom [data-zoom-action="'+name+'"]');
  assert.equal(photo(),'img/tony-main.webp');
  assert.match(doc.querySelector('.photo-zoom-caption').textContent,/1 \/ 3/);
  assert.equal(doc.querySelector('#photo-zoom [data-zoom-close]'),null,'the old top-right X is gone');
  click(w,action('next'));
  assert.equal(photo(),'img/tony-first-look.webp');
  assert.match(doc.querySelector('.photo-zoom-caption').textContent,/Первый костюм/);
  click(w,action('next'));
  assert.equal(photo(),'img/tony-second-look.webp');
  click(w,action('next'));
  assert.equal(photo(),'img/tony-main.webp','next wraps to first');
  click(w,action('prev'));
  assert.equal(photo(),'img/tony-second-look.webp','previous wraps to last');
  click(w,action('close'));
  assert.equal(doc.getElementById('photo-zoom'),null,'image center closes gallery');
  assert.equal(doc.activeElement,opener,'focus returns to the opening portrait');

  const look=doc.querySelector('[data-zoom-key="c-tony--look-1"]');
  click(w,look);
  assert.equal(photo(),'img/tony-first-look.webp','opening another look preserves its position');
  doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));
  assert.equal(photo(),'img/tony-main.webp');
  doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(doc.getElementById('photo-zoom'),null);
 }finally{close()}
});

test('single portraits close on photo click and all lightboxes close on backdrop',()=>{
 const {g,w,doc,close}=loadGuide();
 try{
  g.setOvr({img:{'c-steve':'img/steve.webp'}});
  g.go('c-steve');
  const opener=doc.querySelector('.dhead [data-zoom-key="c-steve"]');
  click(w,opener);
  assert.equal(doc.querySelectorAll('#photo-zoom [data-zoom-action]').length,1);
  assert.equal(doc.querySelector('#photo-zoom [data-zoom-action="next"]'),null);
  click(w,doc.querySelector('#photo-zoom [data-zoom-action="close"]'));
  assert.equal(doc.getElementById('photo-zoom'),null);
  click(w,opener);
  click(w,doc.getElementById('photo-zoom'));
  assert.equal(doc.getElementById('photo-zoom'),null);
 }finally{close()}
});
