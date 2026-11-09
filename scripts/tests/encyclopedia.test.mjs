import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const coverage = JSON.parse(readFileSync(new URL('../../audit/encyclopedia-80-coverage.json', import.meta.url), 'utf8'));
const dataText = html.match(/id="kvm-data">([\s\S]*?)<\/script>/)[1];
const originalApp = html.match(/<script id="kvm-app">([\s\S]*?)<\/script>/)[1];
function load() {
  const empty = () => {};
  const elements = {};
  function element(id) {
    if (!elements[id]) elements[id] = {
      innerHTML:'', textContent: id === 'kvm-data' ? dataText : '{}', outerHTML:'', value:'', style:{},
      classList:{add:empty,remove:empty,toggle:empty,contains:()=>false},
      addEventListener:empty,setAttribute:empty,removeAttribute:empty,querySelectorAll:()=>[],querySelector:()=>null,
      getBoundingClientRect:()=>({width:1000,height:700}),
    };
    return elements[id];
  }
  const context = {
    console, setTimeout:empty, clearTimeout:empty, requestAnimationFrame:empty,
    location:{pathname:'/guide/',hash:'#encyclopedia'}, history:{}, NodeFilter:{SHOW_TEXT:4},
    localStorage:{getItem:()=>null,setItem:empty},
    document:{getElementById:element,querySelector:()=>null,querySelectorAll:()=>[],
      addEventListener:empty,createTreeWalker:()=>({nextNode:()=>null}),
      documentElement:{setAttribute:empty,getAttribute:()=>null},body:{appendChild:empty}},
    window:{addEventListener:empty,innerWidth:1200,scrollY:0,scrollTo:empty},
    MutationObserver:class {observe(){}},
  };
  const app = originalApp.replace(/admInit\(\);[\s\S]*?\nroute\(\);\s*(?:imgQueueLoad\(\);\s*)?\}\)\(\);\s*$/,`
    globalThis.guide={D,ITEM_CATS,VIEWS,ADM,OVR,IMG,artAll,artGet,artView,artCard,encView,route,imgMatch,imgTarget,imgIndex,buildSearch,linkRx,lk,SPK,SPO,LK,RT,getSearch:()=>sIdx};
  })();`);
  assert.notEqual(app, originalApp, 'test bootstrap replaces only final initialization');
  runInNewContext(app, context, {timeout:5000});
  return {...context.guide, elements, location:context.location};
}

test('all 80 requested objects have independent cards, categories, upload targets and source projects', () => {
  const g=load(), all=g.artAll(), ids=new Set(all.map(a=>a.id));
  assert.equal(coverage.entries.length,80);
  assert.equal(new Set(coverage.entries.map(x=>x.id)).size,80);
  assert.equal(all.length,coverage.totalCount);
  assert.equal(ids.size,all.length);
  for(const id of coverage.preservedIds) assert.ok(ids.has(id),`preserved ${id}`);
  g.ADM.on=true;
  for(const expected of coverage.entries) {
    const a=g.artGet(expected.id);
    assert.ok(a,expected.requestedName);
    assert.equal(a.category,expected.category);
    assert.ok(a.ab.trim().length>30,`description ${a.id}`);
    assert.ok(a.path.length,`appearances ${a.id}`);
    for(const step of a.path) for(const pid of step[2].split(','))
      assert.ok(g.D.p.some(p=>p.id===pid),`${a.id}/${pid}`);
    assert.match(g.artView(a),new RegExp('data-img-one="a-'+a.id+'"'),a.id);
    assert.match(g.artCard(a),new RegExp('data-img-one="a-'+a.id+'"'),`category upload ${a.id}`);
    assert.equal(g.imgMatch(expected.requestedName+'.webp'),'a-'+a.id,`file ${expected.requestedName}`);
  }
});

test('all five categories render through the actual router, with working item links', () => {
  const g=load(), cats=new Set(g.ITEM_CATS.map(c=>c.id));
  assert.equal(cats.size,5);
  for(const a of g.artAll()) assert.ok(cats.has(a.category),a.id);
  for(const c of g.ITEM_CATS) {
    assert.equal(typeof g.VIEWS[c.route],'function');
    g.location.hash='#'+c.route;g.route();
    const output=g.elements.main.innerHTML;
    assert.match(output,new RegExp('<h1>'+c.name+'</h1>'));
    for(const a of g.artAll().filter(a=>a.category===c.id)) assert.ok(output.includes('href="#a-'+a.id+'"'),a.id);
    for(const a of g.artAll().filter(a=>a.category!==c.id)) assert.ok(!output.includes('href="#a-'+a.id+'"'),`category leakage ${a.id}`);
  }
  g.location.hash='#stones';g.route();
  for(const a of g.artAll()) assert.ok(g.elements.main.innerHTML.includes('href="#a-'+a.id+'"'),`legacy hub ${a.id}`);
  for(const c of g.ITEM_CATS) assert.ok(g.encView().includes('href="#'+c.route+'"'));
});

test('containers, stones and variant names keep distinct image assignments and related links', () => {
  const g=load();
  for(const [container,stone]of [['tesseract','space'],['orb','power'],['aether','reality'],['eye-agamotto','time'],['loki-scepter','mind']]) {
    assert.notEqual(container,stone);
    assert.ok(g.artGet(container).related.includes(stone));
    assert.ok(g.artGet(stone).related.includes(container));
  }
  assert.equal(g.imgMatch('Громсекира.webp'),'a-stormbreaker');
  assert.equal(g.imgMatch('Громобой.webp'),'a-stormbreaker');
  assert.equal(g.imgMatch('Глаз Агамотто.webp'),'a-eye-agamotto');
  assert.equal(g.imgMatch('Око Агамотто.webp'),'a-eye-agamotto');
  assert.equal(g.imgMatch('Двойное кольцо.webp'),'a-sling-ring');
  assert.equal(g.imgMatch('Эбонитовый клинок.webp'),'a-ebony-blade');
  for(const a of g.artAll()) for(const id of a.related) assert.ok(g.artGet(id),`${a.id}/${id}`);
});

test('item text links target containers and category changes do not lose old photo keys', () => {
  const g=load();
  assert.match(g.lk('Тессеракт',{}),/href="#a-tesseract"/);
  assert.match(g.lk('Око Агамотто',{}),/href="#a-eye-agamotto"/);
  assert.match(g.lk('Скипетр Локи',{}),/href="#a-loki-scepter"/);
  g.IMG['a-pym-particles']='img/previous-pym.jpg';
  g.IMG['a-stormbreaker']='img/previous-stormbreaker.jpg';
  assert.equal(g.artGet('pym-particles').category,'materials');
  assert.match(g.artView(g.artGet('pym-particles')),/img\/previous-pym.jpg/);
  assert.match(g.artView(g.artGet('stormbreaker')),/img\/previous-stormbreaker.jpg/);
});

test('search indexes all requested objects and shows plot descriptions by default', () => {
  const g=load();g.buildSearch();
  for(const x of coverage.entries) assert.ok(g.getSearch().some(r=>r.h==='#a-'+x.id),x.id);
  assert.ok(g.getSearch().find(r=>r.h==='#a-stormbreaker').s.includes('громсекира'));
  assert.ok(g.getSearch().find(r=>r.h==='#a-venom-symbiote').s.includes('симбиот'));
  assert.equal(g.SPO.mode,'off');
  const a=g.artGet('thanos-double-sword');
  assert.ok(g.artView(a).includes(a.ab));
  assert.equal(Object.keys(g.SPK).length,0);
  assert.ok(g.LK&&g.RT,'unrelated relationship graph state preserved');
});
