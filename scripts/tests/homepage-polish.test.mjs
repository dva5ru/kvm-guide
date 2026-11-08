import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGuide,click} from './guide-dom.mjs';

const styles=readFileSync(new URL('../../home-v6.css',import.meta.url),'utf8');

test('desktop header is left-aligned and search input is larger with equal-height controls',t=>{
  const s=loadGuide();t.after(s.close);
  assert.equal(s.doc.querySelectorAll('.top-v6 nav.tabs a').length,6);
  assert.ok(s.doc.querySelector('#q'));
  assert.ok(s.doc.querySelector('#spoilBtn'));
  assert.ok(s.doc.querySelector('#themeBtn'));
  assert.match(styles,/\.top-v6 > \.wrap,main\.wrap\{max-width:1320px;padding-inline:28px\}/);
  assert.match(styles,/\.top-v6 nav\.tabs\{justify-content:flex-start/);
  assert.match(styles,/\.top-v6 \.search\{flex:0 1 400px;width:clamp\(320px,30vw,400px\)/);
  assert.match(styles,/\.top-v6 \.search input,\s*\.top-v6 \.theme-btn\{[^}]*height:44px;min-height:44px/);
  assert.match(styles,/\.top-v6 \.sres\{[^}]*width:min\(680px,calc\(100vw - 56px\)\)/);
  assert.match(styles,/@media \(max-width:760px\)\{[\s\S]*?\.top-v6 \.search\{grid-column:1\/-1;grid-row:2;width:100%/);
});
test('upcoming film cards use real published poster images, with a fallback when missing',t=>{
  const s=loadGuide();t.after(s.close);
  const {doc,g}=s;
  const soon=doc.querySelector('.h6-soon-layout');
  assert.ok(soon,'upcoming layout present');
  assert.ok(soon.querySelector('.h6-soon-main .h6-soon-poster-img'),'featured poster rendered');
  const links=[...soon.querySelectorAll('a[href^="#f-"]')];
  assert.ok(links.length>=3);
  for(const link of links){
    const id=link.getAttribute('href').slice(3),p=g.P[id];
    const poster=link.querySelector('.h6-soon-poster');
    assert.ok(poster,'poster region for '+id);
    const src=g.D.p.find(x=>x.id===id);
    assert.ok(src,'real project route for '+id);
    assert.ok(poster.querySelector('img')||poster.querySelector('.h6-photo-empty'));
    if(id==='doomsday'||id==='secret-wars'||id==='black-panther-3')
      assert.ok(poster.querySelector('img[src*="img/f-"]'),'published cover reused for '+id);
  }
  assert.match(styles,/\.h6-soon-item \.h6-soon-poster\{width:62px;height:90px/);
});
test('random encyclopedia discovery changes on every homepage visit and every shuffle',t=>{
  const s=loadGuide();t.after(s.close);const {g,w,doc}=s;
  const selected=()=>doc.querySelector('#h6-random-content a[href^="#"]')?.getAttribute('href');
  let previous=selected();assert.ok(previous,'initial item linked');
  g.go('home');
  let next=selected();assert.ok(next&&next!==previous,'new entry on homepage rerender');
  previous=next;
  click(w,doc.querySelector('[data-h6-shuffle]'));
  next=selected();assert.ok(next&&next!==previous,'new entry on shuffle');
  assert.equal(w.sessionStorage.getItem('kvm-home6-last-random'),next.slice(1));
  assert.equal(s.errors.length,0,s.errors.join('\n'));
});
test('text is inset within homepage and site-wide cards',()=>{
  assert.match(styles,/\.h6-page \.h6-project-info\{padding:18px 18px 20px\}/);
  assert.match(styles,/main\.wrap \.hcard\{padding:16px\}/);
  assert.match(styles,/main\.wrap \.row\{padding-inline:12px\}/);
  assert.match(styles,/\.h6-soon-main-copy\{[\s\S]*?padding:clamp\(24px,3vw,40px\)/);
});
