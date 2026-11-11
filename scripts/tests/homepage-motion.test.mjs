import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadGuide,click} from './guide-dom.mjs';

const css=readFileSync(new URL('../../assets/css/home-v6.css',import.meta.url),'utf8');

test('scroll choreography progressively enhances existing homepage blocks',t=>{
  const s=loadGuide();t.after(s.close);
  const {g,w,doc,errors}=s;
  const observers=[];
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.IntersectionObserver=class {
    constructor(callback,options){this.callback=callback;this.options=options||{};this.targets=[];observers.push(this)}
    observe(el){this.targets.push(el)}
    unobserve(el){this.targets=this.targets.filter(x=>x!==el)}
    disconnect(){this.targets=[]}
  };
  g.go('home');
  const page=doc.querySelector('.h6-page');
  assert.ok(page.classList.contains('h6-motion-ready'),'enabled when IntersectionObserver exists');
  const reveal=observers.find(o=>o.options.rootMargin==='0px 0px -6% 0px');
  assert.ok(reveal,'one observer manages the reveal choreography');
  const headings=[...page.querySelectorAll('.h6-section-title.h6-motion-item')];
  const cards=[...page.querySelectorAll('.h6-project-card.h6-motion-item')];
  assert.ok(headings.length>=7,'section headings animate independently');
  assert.equal(cards.length,4,'editorial project cards animate independently');
  assert.ok(cards[1].style.getPropertyValue('--h6-motion-delay')!==cards[0].style.getPropertyValue('--h6-motion-delay'),'card entrance is staggered');
  reveal.callback([{target:cards[0],isIntersecting:true}]);
  assert.ok(cards[0].classList.contains('h6-motion-visible'),'visible card is revealed');
  assert.ok(!reveal.targets.includes(cards[0]),'revealed cards are no longer observed');

  click(w,doc.querySelector('[data-h6-way="story"]'));
  assert.ok(doc.getElementById('h6-way-panel').classList.contains('h6-content-enter'),'tabs animate content swaps');
  click(w,doc.querySelector('[data-h6-step="focus:1"]'));
  assert.ok(doc.getElementById('h6-focus-content').classList.contains('h6-content-enter'),'slider updates animate');
  click(w,doc.querySelector('[data-h6-shuffle]'));
  assert.ok(doc.getElementById('h6-random-content').classList.contains('h6-content-enter'),'random encyclopedia card animates');
  assert.equal(errors.length,0,errors.join('\n'));
});

test('motion respects reduced movement and browsers without IntersectionObserver',t=>{
  const s=loadGuide();t.after(s.close);
  const {g,w,doc}=s;
  w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
  w.IntersectionObserver=class {observe(){} unobserve(){} disconnect(){}};
  g.go('home');
  assert.ok(!doc.querySelector('.h6-page').classList.contains('h6-motion-ready'));
  click(w,doc.querySelector('[data-h6-step="focus:1"]'));
  assert.ok(!doc.getElementById('h6-focus-content').classList.contains('h6-content-enter'));
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  delete w.IntersectionObserver;
  g.go('home');
  assert.ok(!doc.querySelector('.h6-page').classList.contains('h6-motion-ready'),'no content hidden without observer support');
});

test('KVM motion remains subtle, responsive and accessible',()=>{
  assert.match(css,/\.h6-page\.h6-motion-ready \.h6-motion-item/,'scoped reveal styling');
  assert.match(css,/transition-delay:var\(--h6-motion-delay/,'staggered cards keep their delays');
  assert.match(css,/@media \(min-width:1000px\) and \(prefers-reduced-motion: no-preference\)/,'depth effect is desktop only');
  assert.match(css,/@media \(max-width:760px\) and \(prefers-reduced-motion: no-preference\)/,'mobile motion is shorter');
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/,'visitor preference is respected');
});

test('interior catalog cards reveal on scroll without touching atlas maps',async t=>{
  const s=loadGuide();t.after(s.close);
  const {g,w,doc,errors}=s;
  const observers=[];
  w.matchMedia=()=>({matches:false,addListener(){},removeListener(){}});
  w.IntersectionObserver=class {
    constructor(callback,options){this.callback=callback;this.options=options||{};this.targets=[];observers.push(this)}
    observe(el){this.targets.push(el)}
    unobserve(el){this.targets=this.targets.filter(x=>x!==el)}
    disconnect(){this.targets=[]}
  };
  w.KVMHome6.initSiteMotion();
  g.go('catalog');
  await Promise.resolve();
  await Promise.resolve();
  const main=doc.getElementById('main');
  assert.ok(main.classList.contains('kvm-site-motion-enabled'),'catalog progressive motion active');
  const cards=[...main.querySelectorAll('.grid > .card.kvm-site-motion-item')];
  assert.ok(cards.length>2,'catalog items receive separate motion');
  const observer=observers.find(o=>o.options.rootMargin==='0px 0px -5% 0px');
  assert.ok(observer,'dedicated interior route IntersectionObserver');
  observer.callback([{target:cards[0],isIntersecting:true}]);
  assert.ok(cards[0].classList.contains('kvm-site-motion-visible'));
  g.go('map');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(doc.querySelectorAll('.atlas-section .kvm-site-motion-item').length,0,'interactive atlas untouched');
  g.go('home');
  await Promise.resolve();
  await Promise.resolve();
  assert.ok(!main.classList.contains('kvm-site-motion-enabled'),'home is handled by its own motion system');
  assert.equal(errors.length,0,errors.join('\n'));
});
