import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createContext, runInContext } from 'node:vm';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const data = JSON.parse(html.match(/id="kvm-data">([\s\S]*?)<\/script>/)[1]);
const app = html.match(/<script id="kvm-app">([\s\S]*?)<\/script>/)[1];
// Evaluate the actual standalone image functions, with storage/network/DOM boundaries mocked.
function setup() {
  const context = createContext({
    D: structuredClone(data), P: Object.fromEntries(data.p.map(p => [p.id, p])),
    C: Object.fromEntries(data.c.map(c => [c.id, c])), IMX: null,
    sIdx: [], evName: e => e.n, years: p => p.y, ITEM_CATS: [{id:'materials',name:'Материалы и вещества'},{id:'artifacts',name:'Артефакты и устройства'}], IMG: {}, PREV: {}, OVR: { img: {} }, ADM: { on: true }, GH: {repo:'test/repo',token:'test'},
    IMG_QUEUE: Promise.resolve(), IMG_BUSY: 0, IMG_FAILED: [], IMG_OK: [], UNM: [],
    CUR: 'a-vibranium', saveDraft() {}, imgRefresh() {}, rerender() {}, toast() {},
    shrink: async f => { if (f.name === 'broken.png') throw Error('broken'); return 'data:image/jpeg;base64,eA=='; },
  });
  const names = ['esc','norm','normF','normOvr','artAll','artGet','artPhoto','imgSrc','imgOneBtn',
    'imgIndex','imgMatch','imgTarget','keyName','imgEnqueue','imgUploadOne','imgAssign','imgHandle','imgResHTML','ghImgUpload','ghApi','safeKey','itemCategory','buildSearch'];
  for (const name of names) {
    const start = app.indexOf('function '+name+'(');
    assert.notEqual(start, -1, name);
    const tail = app.slice(start);
    const end = tail.slice(1).search(/\n(?:function |var |\/\/|document\.|window\.)/);
    runInContext(end < 0 ? tail : tail.slice(0, end + 1), context);
  }
  context.imgRefresh = () => {};
  context.imgPut = async (key, url) => { context.OVR.img[key] = url; context.IMG = context.OVR.img; };
  return context;
}

test('every material, stone, artifact and gauntlet has a unique upload target', () => {
  const c = setup(), all = c.artAll();
  assert.equal(all.length, Object.keys(data.enc.itemMeta).length);
  assert.equal(new Set(all.map(a => a.id)).size, all.length);
  for (const a of all) {
    assert.equal(c.imgTarget('a-'+a.id), 'a-'+a.id);
    assert.match(c.imgOneBtn('a-'+a.id), new RegExp('data-img-one="a-'+a.id+'"'));
    for (const step of a.path) for (const pid of step[2].split(',')) assert.ok(c.P[pid], pid);
  }
  c.buildSearch();
  assert.equal(c.sIdx.find(x => x.h === '#a-vibranium').k, 'Материалы и вещества');
  assert.equal(c.sIdx.find(x => x.h === '#a-thanos-gauntlet').k, 'Артефакты и устройства');
  assert.equal(c.imgMatch('Вибраниум.jpg'), 'a-vibranium');
  assert.equal(c.imgMatch('a-thanos-gauntlet.jpg'), 'a-thanos-gauntlet');
  assert.equal(c.imgTarget('Перчатка Таноса [a-thanos-gauntlet]'), 'a-thanos-gauntlet');
});

test('ambiguous aliases go to the assignment queue instead of overwriting a random card', () => {
  const c = setup();
  c.IMX = [['c-one','герой','Герой'],['c-two','герой','Герой']];
  assert.equal(c.imgMatch('Герой.png'), null);
  assert.equal(c.imgTarget('Герой [c-two]'), 'c-two');
  assert.equal(c.imgMatch(''), null);
});

test('removed Wikimedia imagery cannot return from old settings or backups', () => {
  const c = setup();
  assert.equal(data.enc.artPhotos, undefined);
  assert.equal(data.enc.gauntletPhoto, undefined);
  const result = c.normOvr({img:{
    'a-shield':'https://commons.wikimedia.org/wiki/Special:FilePath/test.jpg',
    'a-uru':'//upload.wikimedia.org/test.jpg',
    'a-vibranium':'img/a-vibranium.jpg',
    'a-space':'data:image/jpeg;base64,eA==',
  }});
  assert.equal(result.img['a-shield'], undefined);
  assert.equal(result.img['a-uru'], undefined);
  assert.equal(result.img['a-vibranium'], 'img/a-vibranium.jpg');
  assert.equal(result.img['a-space'], 'data:image/jpeg;base64,eA==');
  assert.equal(c.artPhoto(c.artGet('shield'), false), '');
  c.IMG['a-vibranium'] = result.img['a-vibranium'];
  assert.match(c.artPhoto(c.artGet('vibranium'), true), /img\/a-vibranium.jpg/);
});

test('mixed batch continues after a broken image and preserves unassigned images', async () => {
  const c = setup();
  await c.imgHandle(['unknown-one.png','Вибраниум.jpg','broken.png','unknown-two.png','a-thanos-gauntlet.jpg']
    .map(name => ({name,type:'image/jpeg'})));
  assert.equal(c.IMG_BUSY, 0);
  assert.equal(c.UNM.length, 2);
  assert.equal(c.IMG_OK.length, 2);
  assert.equal(c.IMG_FAILED.length, 1);
  c.UNM[1].target = 'Уру [a-uru]';
  c.UNM[0].done = true;
  const rendered = c.imgResHTML(c.IMG_OK);
  assert.match(rendered, /Выберите, куда поставить \(1\)/);
  assert.match(rendered, /value="Уру \[a-uru\]"/);
  assert.match(rendered, /unknown-two.png/);
});

test('card uploads share the batch queue and recover after a failure', async () => {
  const c = setup(), calls = [];
  let active = 0;
  c.imgPut = async (key) => { active++; assert.equal(active, 1); await Promise.resolve(); calls.push(key); active--; };
  const input = name => ({files:[{name}],value:name,disabled:false,getAttribute:()=> 'a-uru'});
  const one = input('broken.png'), two = input('уру.jpg');
  await Promise.all([c.imgHandle([{name:'Вибраниум.jpg',type:'image/jpeg'}]), c.imgUploadOne(one), c.imgUploadOne(two)]);
  assert.deepEqual(calls, ['a-vibranium','a-uru']);
  assert.equal(c.IMG_FAILED.length, 1);
  assert.equal(c.IMG_BUSY, 0);
  assert.equal(two.disabled, false);
  assert.equal(two.value, '');
});

test('replacing a published image writes a new file and preserves the public image on failure', async () => {
  const c = setup(), paths = [];
  c.OVR.img['a-vibranium'] = 'img/old.jpg'; c.IMG = c.OVR.img;
  c.ghPut = async path => { paths.push(path); };
  await c.ghImgUpload('a-vibranium','data:image/jpeg;base64,eA==');
  await c.ghImgUpload('a-vibranium','data:image/jpeg;base64,eQ==');
  assert.notEqual(paths[0], paths[1]);
  assert.notEqual(paths[0], 'img/a-vibranium.jpg');
  const saved = c.OVR.img['a-vibranium'];
  c.ghPut = async () => { throw Error('upload failed'); };
  await assert.rejects(c.ghImgUpload('a-vibranium','data:image/jpeg;base64,eA=='), /upload failed/);
  assert.equal(c.OVR.img['a-vibranium'], saved);
  assert.equal(c.PREV['a-vibranium'], undefined);
});

test('GitHub PUT 404 is an upload failure, GET 404 still means a new image', async () => {
  const c = setup(); c.fetch = async () => ({status:404,ok:false,json:async()=>({message:'Not Found'})});
  assert.equal(await c.ghApi('/contents/img/new.jpg'), null);
  await assert.rejects(c.ghApi('/contents/img/new.jpg',{method:'PUT'}), /Not Found/);
});


test('manual assignment resists repeat clicks and leaves other destinations intact', async () => {
  const c = setup();
  c.UNM = [{name:'one.jpg',url:'data:image/jpeg;base64,eA==',target:'a-vibranium'},
    {name:'two.jpg',url:'data:image/jpeg;base64,eA==',target:'Уру [a-uru]'}];
  c.document = {querySelector: () => null};
  let uploads = 0;
  c.imgPut = async () => { uploads++; await Promise.resolve(); };
  const first = c.imgAssign(0);
  assert.equal(c.UNM[0].pending, true);
  assert.equal(c.imgAssign(0), undefined);
  assert.match(c.imgResHTML([]), /disabled/);
  await first;
  assert.equal(uploads, 1);
  assert.equal(c.IMG_BUSY, 0);
  assert.equal(c.UNM[0].done, true);
  assert.equal(c.UNM[1].target, 'Уру [a-uru]');
  assert.match(c.imgResHTML([]), /value="Уру \[a-uru\]"/);
});
