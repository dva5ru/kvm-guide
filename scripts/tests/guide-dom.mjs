import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';

export const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const app=html.match(/<script id="kvm-app">([\s\S]*?)<\/script>/)[1];
export function loadGuide(){
  const errors=[],vc=new VirtualConsole();
  vc.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'https://example.test/kvm-guide/',runScripts:'outside-only',virtualConsole:vc});
  const w=dom.window;
  w.scrollTo=()=>{};w.requestAnimationFrame=()=>0;w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
  w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({canvas:this},{get:(t,k)=>k in t?t[k]:k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}})};
  const instrumented=app.replace(/setThemeBtn\(\);setSpoilBtn\(\);\s*admInit\(\);[\s\S]*?\nroute\(\);\s*(?:imgQueueLoad\(\);\s*)?\}\)\(\);\s*$/,`
    globalThis.guide={D,P,C,PL,EV,LN,ADM,SPO,VIEWS,LEGACY,ITEM_CATS,SPK,
      route,buildSearch,runSearch,artAll,artGet,artView,episodeView,teamsView,orgView,raceView,
      applyCopy,copyKey,copyValue,copySave,universalEdit,applyOVR,setText,getT,ref,textFields,contentResults,
      openEditor,settingsHTML,home,qsParse,ctToQS,ctFromQS,CT2,applyBlocks,SPW,isSpoil,spRevealEl,
      histGo,saveDraft,dirtyCount,backupImport,selfHTML,norm,
      getOvr:()=>OVR,setOvr:o=>{OVR=normOvr(o);applyOVR()},getSpk:()=>SPK,getSearch:()=>sIdx,
      go:h=>{history.replaceState(null,'','#'+h);route()}
    };
  })();`);
  assert.notEqual(instrumented,app,'only startup is replaced; all application listeners remain active');
  w.eval(instrumented);
  const g=w.guide;
  g.go('home');
  return {g,w,doc:w.document,errors,close:()=>dom.window.close()};
}
export function click(w,el){assert.ok(el,'click target exists');el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}))}
export function input(w,el,value){assert.ok(el,'input exists');el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}))}
export function editMode(g){g.ADM.can=true;g.ADM.on=true;g.ADM.edit=true}
