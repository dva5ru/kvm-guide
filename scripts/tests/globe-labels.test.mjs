import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import {guideHtml} from '../lib/guide-source.mjs';
const html=guideHtml();
const start=html.indexOf('function glPlaceLabels(');
const end=html.indexOf('\nwindow.drawGlobe=',start);
assert.ok(start>=0&&end>start,'glPlaceLabels exists');
const placeLabels=runInNewContext(html.slice(start,end)+'\nglPlaceLabels');
const ctx={font:'',measureText(value){return {width:Array.from(value).length*7.5}}};
function collides(a,b,gap=4){return a[0]<b[0]+b[2]+gap&&a[0]+a[2]+gap>b[0]&&a[1]<b[1]+b[3]+gap&&a[1]+a[3]+gap>b[1]}
test('dense globe labels never cover one another or other pins',()=>{
 const points=[{id:'ny',x:145,y:95,radius:26},{id:'alb',x:173,y:94,radius:7},
 {id:'cam',x:204,y:98,radius:7},{id:'bal',x:152,y:131,radius:7},{id:'osh',x:55,y:45,radius:7}];
 const names=['Нью-Йорк','Железнодорожный вокзал Олбани','Кембридж','Балтимор','Ошкош'];
 const items=points.map((p,i)=>({...p,text:names[i],count:20-i,nyc:i===0,selected:i===0,hover:false}));
 const result=placeLabels(ctx,items,points,560,320);
 assert.ok(result.some(p=>p.id==='ny'));
 result.forEach((item,i)=>{
  const b=item.box;
  assert.ok(b[0]>=4&&b[1]>=4&&b[0]+b[2]<=556&&b[1]+b[3]<=316);
  result.slice(i+1).forEach(other=>assert.equal(collides(b,other.box),false));
  points.filter(p=>p.id!==item.id).forEach(p=>{
    const nx=Math.max(b[0],Math.min(p.x,b[0]+b[2])),ny=Math.max(b[1],Math.min(p.y,b[1]+b[3]));
    assert.ok((nx-p.x)**2+(ny-p.y)**2>=(p.radius+3)**2);
  });
 });
});
test('hovered pin receives label priority near the edge',()=>{
 const points=[{id:'a',x:35,y:65,radius:7},{id:'b',x:47,y:65,radius:7}];
 const items=[{...points[0],text:'Около границы',count:20,selected:false,hover:false},
 {...points[1],text:'Выбранная точка',count:1,selected:false,hover:true}];
 const result=placeLabels(ctx,items,points,260,130);
 assert.ok(result.some(p=>p.id==='b'));
 assert.ok(result.every(p=>p.box[0]>=4&&p.box[0]+p.box[2]<=256));
});
