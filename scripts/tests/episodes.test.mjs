import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadGuide,editMode,click,input} from './guide-dom.mjs';
import {hydrateAppearances} from '../lib/appearance-registry.mjs';
const html=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const raw=JSON.parse(html.match(/id="kvm-data">([\s\S]*?)<\/script>/)[1]);
const baseline=JSON.parse(readFileSync(new URL('../../audit/stage4-preserved-episodes.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(raw);
const id=n=>'wandavision-s1-e'+n;

test('all nine WandaVision episodes have distinct content, dates, roles, chronology and credit-scene status',()=>{
  const d=clone();const out=hydrateAppearances(d),eps=Object.values(d.episodes).filter(e=>e.projectId==='wandavision');
  assert.equal(eps.length,9);assert.equal(Object.keys(d.episodes).length,35);
  assert.equal(new Set(eps.map(e=>e.plot)).size,9);
  for(const [i,e]of eps.entries()){
    assert.equal(e.id,id(i+1));assert.equal(e.season,1);assert.equal(e.number,i+1);assert.equal(e.status,'released');
    assert.ok(e.plot.split(/(?<=[.!?])\s+/).length>=5,e.id+' full story');
    assert.ok(e.lead&&e.chronology&&e.events.length&&e.changes.length&&e.connections.length&&e.sources.length>=3);
    assert.ok(e.originalTitle&&e.workingTranslation);assert.ok(out.episodes.get(e.id)[3].length>=6);
  }
  assert.equal(eps[0].date,'2021-01-15');assert.equal(eps[1].date,'2021-01-15');assert.equal(eps[8].date,'2021-03-05');
  assert.deepEqual(eps.map(e=>e.post.length),[0,0,0,0,0,0,1,1,2]);
});

test('all 26 existing episode URLs, plots, casts and legacy text keys remain intact',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';assert.equal(baseline.episodes.length,26);
  for(const b of baseline.episodes){
    g.go('ep-'+b.id);assert.equal(doc.querySelector('main h1').textContent,g.D.episodes[b.id].title);
    assert.equal(createHash('sha256').update(g.D.episodes[b.id].plot).digest('hex'),b.plotSHA256);
    const migratedCast=b.cast.map(cid=>g.D.characterAppearanceAliases[g.D.episodes[b.id].projectId+'::'+cid]||cid);
    assert.deepEqual(Array.from(g.EREG[b.id][3]),migratedCast,b.id);
    assert.equal(g.ref(b.legacyKey)[0],g.D.episodes[b.id]);assert.equal(g.ref(b.legacyKey)[1],'plot');
  }
});

test('generic episode pages and character histories have no forced What If title or alternate-universe heading',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  for(let n=1;n<=9;n++){
    g.go('ep-'+id(n));assert.equal(doc.querySelector('h1').textContent,g.D.episodes[id(n)].title);
    assert.ok(!doc.querySelector('h1').textContent.startsWith('Что, если'));
    assert.ok(doc.querySelector('main').textContent.includes('Сезон 1, серия '+n));
    assert.match(doc.querySelector('.en').textContent,/./);
    const next=doc.querySelector('nav[aria-label="Другие серии"] .nx');
    if(n<9)assert.equal(next.getAttribute('href'),'#ep-'+id(n+1));else assert.equal(next,null);
  }
  g.go('f-wandavision');assert.equal(doc.querySelectorAll('.eps .ep').length,9);
  g.go('c-monica');assert.ok(doc.querySelector('main').textContent.includes('Появления в сериях'));
  assert.ok(!doc.querySelector('main').textContent.includes('Другие версии персонажа в других реальностях'));
});

test('new episode and appearance keys edit entire content and survive reload, undo and block hiding',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;editMode(g);g.go('ep-'+id(1));
  const plotKey='episode.'+id(1)+'.plot';click(s.w,doc.querySelector('[data-ek="'+plotKey+'"]'));
  input(s.w,doc.querySelector('[data-ek-box] textarea'),'Собственный текст с $& и <скобками>.');click(s.w,doc.querySelector('[data-ed-save]'));
  assert.equal(g.D.episodes[id(1)].plot,'Собственный текст с $& и <скобками>.');
  g.setText('appearance.wandavision.vision.'+id(1),'Спасает гостя во время ужина.');
  g.histGo(-1);assert.notEqual(g.D.epRoles.wandavision[id(1)].vision,'Спасает гостя во время ужина.');g.histGo(1);
  const key='episode.'+id(7)+'.post.0.text';g.setText(key,'Моника у входа в подвал.');
  const saved=JSON.parse(s.w.localStorage.getItem('kvm-draft:/kvm-guide/:v1')),fresh=loadGuide();t.after(fresh.close);fresh.g.setOvr(saved);fresh.g.SPO.mode='off';fresh.g.go('ep-'+id(1));
  assert.ok(fresh.doc.querySelector('main').textContent.includes('Собственный текст с $& и <скобками>.'));
  assert.equal(fresh.doc.querySelector('скобками'),null);assert.equal(fresh.g.D.episodes[id(7)].post[0].text,'Моника у входа в подвал.');
  g.go('ep-'+id(1));const block=doc.querySelector('[data-bk="ep.plot"]');click(s.w,block.querySelector('[data-bhide="page"]'));g.ADM.edit=false;g.go('ep-'+id(1));assert.ok(!doc.querySelector('main').textContent.includes('Собственный текст'));
  g.SPO.mode='off';g.go('ep-'+id(2));assert.ok(doc.querySelector('main').textContent.includes(g.D.episodes[id(2)].plot.slice(0,40)));
});

test('adding another season with the same episode number cannot redirect legacy edits or cast links',t=>{
  const d=clone(),base=d.episodes['what-if-3-1'],added={...structuredClone(base),id:'what-if-3-test-s2-e1',season:2,title:'Тест другого сезона',post:[]};
  d.episodes[added.id]=added;assert.doesNotThrow(()=>hydrateAppearances(structuredClone(d)));
  const s=loadGuide({data:d});t.after(s.close);const {g,doc}=s;g.SPO.mode='off';g.go('f-what-if-3');
  assert.ok(doc.querySelector('main').textContent.includes('Сезон 2'));assert.ok(doc.querySelector('main').textContent.includes('Сезон 3'));
  g.setText('ep.what-if-3.0','Правка прежней серии.');assert.equal(g.D.episodes['what-if-3-1'].plot,'Правка прежней серии.');assert.equal(g.D.episodes[added.id].plot,base.plot);
  g.go('ep-what-if-3-1');assert.equal(doc.querySelector('h1').textContent,base.title);
  const pid='what-if-3',cid=raw.appearances.find(a=>a.projectId===pid&&a.episodes.some(e=>e.episodeId===base.id)).characterId;
  g.setText('appearance.'+pid+'.'+cid+'.1','Старая привязка к серии.');assert.equal(g.D.epRoles[pid][base.id][cid],'Старая привязка к серии.');
});

test('hidden mode keeps narrative, changes, cast identities and credit scenes out of the DOM',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s,m=g.D.episodes[id(9)];
  m.plot='СЕКРЕТ СЮЖЕТА';m.events[0]='СЕКРЕТ СОБЫТИЯ';m.changes[0]='СЕКРЕТ СТАТУСА';m.post[0].text='СЕКРЕТ ТИТРОВ';
  g.SPO.mode='all';g.go('ep-'+id(9));let text=doc.querySelector('main').textContent;
  for(const secret of ['СЕКРЕТ СЮЖЕТА','СЕКРЕТ СОБЫТИЯ','СЕКРЕТ СТАТУСА','СЕКРЕТ ТИТРОВ','Ральф Боунер','Белый Вижн'])assert.ok(!text.includes(secret),secret);
  g.SPO.mode='upto';g.SPO.order='chronological';g.SPO.ord=g.P.wandavision.ord-1;g.go('ep-'+id(9));assert.ok(!doc.querySelector('main').textContent.includes('СЕКРЕТ СЮЖЕТА'));
  g.SPO.ord=g.P.wandavision.ord;g.go('ep-'+id(9));text=doc.querySelector('main').textContent;
  for(const secret of ['СЕКРЕТ СЮЖЕТА','СЕКРЕТ СОБЫТИЯ','СЕКРЕТ СТАТУСА','СЕКРЕТ ТИТРОВ'])assert.ok(text.includes(secret),secret);
});

test('announced episodes cannot carry invented plots or actual appearances',t=>{
  let d=clone();const e=structuredClone(d.episodes[id(1)]);Object.assign(e,{id:'test-announced',projectId:'yfnsm-2',number:99,status:'announced',date:'2099-01-01',lead:'Проверка шаблона анонса.',plot:'',chronology:'',events:[],changes:[],firsts:[],connections:[],post:null});d.episodes[e.id]=e;
  assert.doesNotThrow(()=>hydrateAppearances(structuredClone(d)));const s=loadGuide({data:d});t.after(s.close);s.g.go('ep-'+e.id);assert.ok(s.doc.querySelector('main').textContent.includes('Анонсирована'));assert.equal(s.doc.querySelector('.story'),null);
  for(const patch of [{plot:'Выдуманный сюжет.'},{chronology:'После выдуманной битвы.'},{firsts:['wanda']},{post:[{placement:'end',text:'Несуществующая сцена.'}]}]){
    const invalid=structuredClone(d);Object.assign(invalid.episodes[e.id],patch);assert.throws(()=>hydrateAppearances(invalid),/publication/);
  }
  const invalid=structuredClone(d);invalid.appearances.push({id:'yfnsm-2::wanda',projectId:'yfnsm-2',characterId:'wanda',role:'M',order:invalid.appearances.filter(a=>a.characterId==='wanda').length,description:'Проверка запрета фактических появлений в анонсе.',episodes:[{episodeId:e.id,order:0,kind:'on-screen',description:'Не подтверждённое участие.'}]});assert.throws(()=>hydrateAppearances(invalid),/episode appearance/);
});

test('validation rejects duplicate positions, foreign appearances, invalid links and impossible dates',()=>{
  let d=clone();d.episodes.copy={...d.episodes[id(1)],id:'copy'};assert.throws(()=>hydrateAppearances(d),/episode identity/);
  d=clone();d.appearances[0].episodes.push({episodeId:id(1),order:99,description:'Чужая связь.',kind:'on-screen'});assert.throws(()=>hydrateAppearances(d),/episode appearance/);
  d=clone();d.episodes[id(1)].connections.push({type:'item',id:'unknown-object',text:'Неверная ссылка.'});assert.throws(()=>hydrateAppearances(d),/connection/);
  d=clone();d.episodes[id(1)].date='2021-02-31';assert.throws(()=>hydrateAppearances(d),/episode date/);
});

test('search indexes episode titles and original names without indexing narrative spoilers',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  input(s.w,doc.getElementById('q'),'Previously On');assert.ok(doc.querySelector('#sres a[href="#ep-'+id(8)+'"]'));
  input(s.w,doc.getElementById('q'),'ВандаВижн сезон 1 серия 9');assert.ok(doc.querySelector('#sres a[href="#ep-'+id(9)+'"]'));
  assert.ok(!g.getSearch().filter(x=>x.h.startsWith('#ep-')).some(x=>x.s.includes('боунера')));
});

test('two Visions, radio voices and mid-credit appearances have distinct episode identities',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;
  assert.ok(!g.EREG[id(7)][3].includes('white-vision'));assert.ok(g.EREG[id(8)][3].includes('white-vision'));assert.ok(g.EREG[id(9)][3].includes('vision')&&g.EREG[id(9)][3].includes('white-vision'));
  assert.equal(g.D.appearances.find(a=>a.id==='wandavision::jimmy').episodes.find(e=>e.episodeId===id(2)).kind,'voice');
  assert.equal(g.D.appearances.find(a=>a.id==='wandavision::white-vision').episodes.find(e=>e.episodeId===id(8)).segment,'credits');
  assert.match(g.appearanceCredit(g.P.wandavision,'pietro',g.EREG[id(8)]).performer,/Гуревич/);
  assert.ok(!g.appearanceCredit(g.P.wandavision,'pietro',g.EREG[id(8)]).performer.includes('Джонсон'));
  const legacy=g.ref('p.wandavision.post.0');assert.equal(legacy[0],g.D.episodes[id(9)].post[0]);
});
