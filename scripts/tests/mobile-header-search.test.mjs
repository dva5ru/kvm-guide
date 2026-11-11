import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGuide,click,input} from './guide-dom.mjs';
import {guideHtml} from '../lib/guide-source.mjs';

const markup=guideHtml();
const css=readFileSync(new URL('../../assets/css/home-v6.css',import.meta.url),'utf8');

test('header no longer repeats the KVM brand, while navigation remains accessible',t=>{
  const s=loadGuide();t.after(s.close);
  assert.equal(s.doc.querySelector('.top-v6 .brand'),null);
  assert.ok(s.doc.querySelector('.top-v6 nav.tabs a[href="#home"]'),'home navigation remains');
  assert.equal(s.doc.querySelector('#h6-menu').getAttribute('aria-controls'),'h6-nav');
  assert.equal(s.doc.querySelector('#spoilBtn'),null);
  assert.equal(s.doc.querySelector('#themeBtn'),null);
  assert.doesNotMatch(markup,/<a class="brand"[^>]*>[\s\S]*?<b>КВМ<\/b><\/a>/);
});

test('mobile menu opens and closes via button, link, Escape, and outside click',t=>{
  const s=loadGuide();t.after(s.close);const {w,doc}=s;
  const header=doc.querySelector('header.top-v6'),toggle=doc.getElementById('h6-menu');
  click(w,toggle);
  assert.ok(header.classList.contains('nav-open'));
  assert.equal(toggle.getAttribute('aria-expanded'),'true');
  click(w,doc.querySelector('#h6-nav a[href="#home"]'));
  assert.ok(!header.classList.contains('nav-open'));
  click(w,toggle);
  doc.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.ok(!header.classList.contains('nav-open'));
  click(w,toggle);
  click(w,doc.getElementById('main'));
  assert.ok(!header.classList.contains('nav-open'));
  assert.equal(toggle.getAttribute('aria-expanded'),'false');
  assert.equal(s.errors.length,0,s.errors.join('\n'));
});

test('search results remain interactive and the stylesheet supplies a readable overlay',t=>{
  const s=loadGuide();t.after(s.close);const {w,doc}=s;
  input(w,doc.getElementById('q'),'тор');
  const dropdown=doc.getElementById('sres');
  assert.ok(dropdown.classList.contains('open'));
  assert.ok(dropdown.querySelectorAll('a').length>0);
  assert.equal(doc.getElementById('q').getAttribute('aria-expanded'),'true');
  assert.match(css,/\.top-v6 \.sres\{[\s\S]*?width:min\(420px,calc\(100vw - 32px\)\)/);
  assert.match(css,/\.top-v6 \.sres a\{[\s\S]*?grid-template-columns:96px minmax\(0,1fr\)/);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.top-v6 \.search\{[\s\S]*?grid-column:1\/-1/);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.top-v6\.nav-open nav\.tabs\{[\s\S]*?display:grid/);
  assert.match(css,/@media\(max-width:520px\)\{[\s\S]*?\.h6-release-card\{flex-direction:column\}/);
});
