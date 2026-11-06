import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {createContext,runInContext} from 'node:vm';

const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const app=html.match(/<script id="kvm-app">([\s\S]*?)<\/script>/)[1];
function add(c,name){
  const start=app.indexOf('function '+name+'(');
  assert.notEqual(start,-1,name);
  const tail=app.slice(start),end=tail.slice(1).search(/\n(?:function |var |\/\/|document\.|window\.)/);
  runInContext(end<0?tail:tail.slice(0,end+1),c);
}
const empty=()=>({ts:1,text:{},img:{},hide:{},nav:{},copy:{}});

test('published data updates untouched fields while preserving unsaved local text and image edits',()=>{
  const store=new Map(),base=empty();base.text.title='old';base.text.footer='old footer';
  const draft=structuredClone(base);draft.text.title='draft';draft.img['a-vibranium']='img/draft.jpg';
  const newer=structuredClone(base);newer.ts=9;newer.text.title='remote';newer.text.footer='fresh footer';newer.img['a-shield']='img/remote.jpg';
  const c=createContext({OVR:draft,PUB:base,ADM:{},localStorage:{setItem:(k,v)=>store.set(k,v)},DRAFT_KEY:'draft',
    applyOVR(){},applyNav(){},rerender(){},admBar(){},toast(){}});
  for(const fn of ['clone','normOvr','overrideEqual','acceptPublished'])add(c,fn);
  c.acceptPublished(newer);
  assert.equal(c.OVR.text.title,'draft');
  assert.equal(c.OVR.text.footer,'fresh footer');
  assert.equal(c.OVR.img['a-vibranium'],'img/draft.jpg');
  assert.equal(c.OVR.img['a-shield'],'img/remote.jpg');
  assert.equal(c.PUB.text.title,'remote');
  assert.equal(JSON.parse(store.get('draft')).text.title,'draft');
});

test('loading draft before fetch never overwrites it even with older timestamp',async()=>{
  const store=new Map(),base=empty();base.ts=5;
  const draft=structuredClone(base);draft.ts=2;draft.text.title='unpublished';
  store.set('draft',JSON.stringify(draft));
  const server=structuredClone(base);server.ts=11;server.img['a-uru']='img/uru.jpg';
  const c=createContext({OVR:base,PUB:structuredClone(base),ADM:{},DRAFT_KEY:'draft',
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    fetch:async()=>({ok:true,json:async()=>server}),applyOVR(){},applyNav(){},rerender(){},admBar(){},admCaps(){},toast(){}});
  for(const fn of ['clone','normOvr','draftRead','overrideEqual','acceptPublished','admInit'])add(c,fn);
  c.admInit();
  assert.equal(c.OVR.text.title,'unpublished');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(c.OVR.text.title,'unpublished');
  assert.equal(c.OVR.img['a-uru'],'img/uru.jpg');
});

test('filtered timeline uses original index and never mutates canonical timeline',()=>{
  const timeline=[[2020,'x','Excluded',['other']],[2021,'x','Official',['official']]];
  const keys=[],c=createContext({D:{tl:timeline,ev:[]},P:{other:{id:'other'},official:{id:'official'}},
    EVS:{mode:'all'},TLV:{scope:'official'},isOfficial:p=>p.id==='official',
    evGroup:()=> '2021',esc:v=>v,SPW:(ids,s)=>s,E:(k,v)=>{keys.push(k);return v},
    ctxP:()=>'',pLink:()=>''});
  for(const fn of ['evDetail','tlEvents'])add(c,fn);
  const html=c.tlEvents();
  assert.deepEqual(keys,['tl.1']);
  assert.match(html,/Official/);
  assert.strictEqual(c.D.tl,timeline);
  assert.equal(c.D.tl.length,2);
});

test('photo destinations and pending image data survive reloading the upload screen',async()=>{
  let stored=[];
  const db={transaction(mode,access){
    const tx={objectStore(){return {
      put(value){stored=structuredClone(value);queueMicrotask(()=>tx.oncomplete?.());return {}},
      get(){const req={};queueMicrotask(()=>{req.result=structuredClone(stored);req.onsuccess?.()});return req}
    }}};
    return tx;
  }};
  const c=createContext({UNM:[{id:'x',name:'photo.jpg',url:'data:image/jpeg;base64,eA==',target:'Уру [a-uru]',done:false}],
    IMG_STORE:Promise.resolve(),IMG_STORE_WARNED:false,idb:async()=>db,imgRefresh(){},toast(){}});
  for(const fn of ['imgQueueSave','imgQueueLoad'])add(c,fn);
  await c.imgQueueSave();
  c.UNM=[];
  await c.imgQueueLoad();
  assert.equal(c.UNM.length,1);
  assert.equal(c.UNM[0].target,'Уру [a-uru]');
  assert.equal(c.UNM[0].url,'data:image/jpeg;base64,eA==');
  c.UNM[0].done=true;
  await c.imgQueueSave();
  assert.equal(stored.length,0);
});
