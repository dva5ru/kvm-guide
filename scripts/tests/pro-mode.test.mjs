import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGuide,click} from './guide-dom.mjs';

test('catalog PRO switch expands the results and each studio chip filters real projects',t=>{
  const s=loadGuide();t.after(s.close);const {g,w,doc}=s;
  g.go('catalog');
  const count=()=>doc.querySelectorAll('#ct-list a.card').length;
  const basic=count();assert.ok(basic>0);
  const toggle=()=>doc.querySelector('[data-pro-toggle="catalog"]');
  assert.equal(toggle().getAttribute('aria-checked'),'false');
  click(w,toggle());assert.equal(toggle().getAttribute('aria-checked'),'true');
  const expanded=count();assert.ok(expanded>basic,'PRO includes more projects');
  const netflix=doc.querySelector('[data-pro-group="netflix"]');
  assert.ok(netflix);assert.equal(netflix.getAttribute('aria-pressed'),'true');
  click(w,netflix);
  assert.equal(doc.querySelector('[data-pro-group="netflix"]').getAttribute('aria-pressed'),'false');
  assert.ok(count()<expanded,'turning Netflix off removes that studio');
  click(w,doc.querySelector('[data-pro-all="0"]'));
  assert.equal(count(),0,'no groups means no results');
  click(w,doc.querySelector('[data-pro-all="1"]'));
  assert.equal(count(),expanded,'all groups restores all results');
  click(w,toggle());assert.equal(count(),basic,'simple mode remains available');
  assert.equal(g.D.p.length>0,true,'the catalog source remains intact');
});

test('timeline PRO mode expands chronology and respects per-group selection',t=>{
  const s=loadGuide();t.after(s.close);const {w,g,doc}=s;
  g.go('timeline');
  const count=()=>doc.querySelectorAll('#tl-list .row').length;
  const basic=count();
  assert.equal(doc.querySelector('[data-pro-toggle="timeline"]').getAttribute('aria-checked'),'false');
  click(w,doc.querySelector('[data-pro-toggle="timeline"]'));
  assert.equal(doc.querySelector('[data-pro-toggle="timeline"]').getAttribute('aria-checked'),'true');
  assert.ok(doc.querySelector('[data-pro-group="fox-xmen"]'));
  const expanded=count();assert.ok(expanded>=basic);
  click(w,doc.querySelector('[data-pro-group="fox-xmen"]'));
  assert.ok(count()<expanded);
  click(w,doc.querySelector('[data-pro-toggle="timeline"]'));
  assert.equal(doc.querySelector('[data-pro-toggle="timeline"]').getAttribute('aria-checked'),'false');
});

test('PRO category selections are shareable via the catalog URL',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  g.go('catalog?pro=1&pg=netflix,sony');
  assert.equal(doc.querySelector('[data-pro-toggle="catalog"]').getAttribute('aria-checked'),'true');
  assert.equal(doc.querySelector('[data-pro-group="netflix"]').getAttribute('aria-pressed'),'false');
  assert.equal(doc.querySelector('[data-pro-group="sony"]').getAttribute('aria-pressed'),'false');
  assert.equal(doc.querySelector('[data-pro-group="mcu"]').getAttribute('aria-pressed'),'true');
});
