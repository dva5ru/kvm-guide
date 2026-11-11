import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadGuide,editMode,click,input} from './guide-dom.mjs';
import {readFileSync} from 'node:fs';
const j=x=>JSON.parse(JSON.stringify(x));
function checkbox(s,cid,group){return [...s.doc.querySelectorAll('[data-character-group="'+cid+'"]')].find(el=>el.value===group)}

test('series appear once alongside films, with their own nested episode history and direct episode links',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  for(const cid of ['wanda','agatha','monica']){
    g.go('c-'+cid);
    const parent=[...doc.querySelectorAll('.cols > div:first-child > .apps > li')].find(el=>el.querySelector('.ah > a')?.getAttribute('href')==='#f-wandavision');
    assert.ok(parent,cid+' has the series in the project history');
    const episodes=parent.querySelector('.character-episodes');assert.ok(episodes,cid+' episodes are below that series');assert.equal(episodes.open,false);
    const expected=g.D.appearances.find(a=>a.id==='wandavision::'+cid).episodes;
    assert.equal(episodes.querySelectorAll('a[href^="#ep-"]').length,expected.length);
    for(const er of expected)assert.equal(doc.querySelectorAll('.cols a[href="#ep-'+er.episodeId+'"]').length,1);
    assert.equal(doc.querySelectorAll('.cols .ah > a[href="#f-wandavision"]').length,1);
  }
  g.go('c-uatu');assert.ok(doc.querySelector('.character-episodes a[href^="#ep-what-if-"]'));
  g.go('c-tony');assert.ok(![...doc.querySelectorAll('.cols .ah > a')].some(a=>a.getAttribute('href')==='#f-endgame-encore'));
});

test('episode descriptions remain editable and spoiler-safe after nesting inside the series',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;
  const key='appearance.wandavision.wanda.wandavision-s1-e1';g.setText(key,'ПРОВЕРКА СКРЫТОЙ СЕРИИ');
  g.SPO.mode='all';g.go('c-wanda');assert.ok(!doc.querySelector('main').textContent.includes('ПРОВЕРКА СКРЫТОЙ СЕРИИ'));
  assert.ok(doc.querySelector('.character-episodes .spoil-btn'));
  g.SPO.mode='off';editMode(g);g.go('c-wanda');
  const el=doc.querySelector('.character-episodes [data-ek="'+key+'"]');click(s.w,el);
  input(s.w,doc.querySelector('[data-ek-box] textarea'),'Новое описание участия в серии.');click(s.w,doc.querySelector('[data-ed-save]'));
  assert.equal(g.D.epRoles.wandavision['wandavision-s1-e1'].wanda,'Новое описание участия в серии.');
  g.ADM.edit=false;g.go('ep-wandavision-s1-e1');assert.ok(doc.querySelector('main').textContent.includes('Новое описание участия в серии.'));
});

test('multiple groups filter without duplicate hero cards and counts agree with memberships',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.go('heroes');
  for(const name of ['Мстители','Магия','Уэствью']){
    const b=[...doc.querySelectorAll('[data-hs-g]')].find(el=>el.dataset.hsG===name);click(s.w,b);
    assert.equal(doc.querySelectorAll('#hs-list a[href="#c-wanda"]').length,1,name);
    const expected=g.D.c.filter(c=>c.groups.includes(name)).length;
    assert.equal(doc.querySelectorAll('#hs-list .hcard').length,expected);
    assert.equal(Number(b.querySelector('i').textContent),expected);
  }
  g.go('c-wanda');assert.deepEqual([...doc.querySelectorAll('.info > .badges [data-hs-goto]')].map(el=>el.dataset.hsGoto),j(g.C.wanda.groups));
  assert.equal(doc.querySelector('.character-groups-editor'),null);
});

test('admin group checkboxes and new groups survive reload, undo, redo, export and published overrides',t=>{
  const s=loadGuide();t.after(s.close);const {g,w,doc}=s;editMode(g);g.saveDraft();g.go('c-wanda');
  const before=j(g.C.wanda.groups);click(w,checkbox(s,'wanda','Космос'));
  assert.ok(g.C.wanda.groups.includes('Космос'));assert.ok(!g.C.tony.groups.includes('Космос'));
  assert.ok(checkbox(s,'wanda','Магия').checked);assert.equal(doc.querySelector('#copyedit'),null);
  g.histGo(-1);assert.deepEqual(j(g.C.wanda.groups),before);g.histGo(1);assert.ok(g.C.wanda.groups.includes('Космос'));
  const form=doc.querySelector('[data-character-group-form="wanda"]');input(w,form.elements.group,'  Новая группа <пример>  ');form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert.ok(g.C.wanda.groups.includes('Новая группа <пример>'));assert.equal(doc.querySelector('пример'),null);
  click(w,checkbox(s,'wanda','Магия'));assert.ok(!g.C.wanda.groups.includes('Магия'));
  const saved=JSON.parse(w.localStorage.getItem('kvm-draft:/kvm-guide/:v1'));
  assert.deepEqual(JSON.parse(saved.text['c.wanda.groups']),j(g.C.wanda.groups));
  const fresh=loadGuide();t.after(fresh.close);fresh.g.setOvr(saved);fresh.g.go('c-wanda');
  assert.deepEqual(j(fresh.g.C.wanda.groups),j(g.C.wanda.groups));
  const exported=g.selfHTML(JSON.stringify(saved),true);const embedded=JSON.parse(exported.match(/id="kvm-ovr">([\s\S]*?)<\/script>/)[1]);
  assert.equal(embedded.text['c.wanda.groups'],saved.text['c.wanda.groups']);
  fresh.g.setOvr({});assert.deepEqual(j(fresh.g.C.wanda.groups),before);
  fresh.g.setOvr({text:{'c.wanda.g':'Другая группа'}});assert.equal(fresh.g.C.wanda.groups[0],'Другая группа');assert.ok(fresh.g.C.wanda.groups.includes('Магия'));
});

test('groups cannot be removed entirely or changed by a guest, and clearing drafts restores source memberships',t=>{
  const s=loadGuide();t.after(s.close);const {g,w}=s;editMode(g);g.go('c-stan-lee');click(w,checkbox(s,'stan-lee','Камео'));assert.deepEqual(j(g.C['stan-lee'].groups),['Камео']);
  g.go('c-wanda');const el=checkbox(s,'wanda','Космос');g.ADM.on=false;g.ADM.can=false;click(w,el);assert.ok(!g.C.wanda.groups.includes('Космос'));
});

test('Ralph, Cameron and ten Commandos have complete cards and sourced project appearances',t=>{
  const s=loadGuide();t.after(s.close);const {g,doc}=s;g.SPO.mode='off';
  assert.equal(g.C['pietro-fake'].n,'Ральф Боунер');assert.deepEqual(j(g.C['pietro-fake'].app).map(a=>a[0]),['wandavision','agatha']);
  for(const query of ['Ральф Боунер','Ральф Бонер','Пьетро в Уэствью']){input(s.w,doc.getElementById('q'),query);assert.ok(doc.querySelector('#sres a[href="#c-pietro-fake"]'),query)}
  g.go('c-cameron-klein');assert.match(doc.querySelector('h1').textContent,/Кэмерон/);assert.deepEqual(j(g.C['cameron-klein'].app).map(a=>a[0]),['cap2','aou']);
  const team=g.D.enc.teams.find(t=>t[0]==='commandos'),members=new Set(team[4].flatMap(row=>row[2].split(',')));
  assert.equal(members.size,10);assert.equal(team[4][0][2].split(',').length,7);assert.equal(team[4][2][2].split(',').length,4);
  for(const cid of members){assert.ok(g.C[cid]);assert.ok(g.C[cid].groups.includes('Ревущие командос'));assert.ok(g.C[cid].app.length)}
  g.go('f-cap1');assert.ok(doc.querySelector('a[href="#c-jim-morita"]'));assert.ok(!doc.querySelector('main').textContent.includes('Персонажи в гайде'));
  g.go('ep-wandavision-s1-e1');assert.ok([...doc.querySelectorAll('h2')].some(el=>/^Персонажи/.test(el.textContent)));
});

test('Stan Lee retains live-action cameos and excludes photographs, animation and archival-only appearances',t=>{
  const s=loadGuide();t.after(s.close);const {g}=s;
  const movies=['iron-man','incredible-hulk','iron-man-2','thor','cap1','avengers','iron-man-3','thor2','cap2','gotg','aou','ant-man','civil-war','doctor-strange','gotg2','homecoming','ragnarok','black-panther','infinity-war','amw','captain-marvel','endgame'];
  for(const pid of movies){const a=g.D.appearances.find(a=>a.id===pid+'::stan-lee');assert.ok(a?.description.length>50,pid);assert.equal(a.kind,'on-screen')}
  for(const pid of ['aos','agent-carter-series','runaways','the-gifted','sm-1','sm-2','sm-3','asm-1','asm-2','deadpool','apocalypse','x-men','last-stand','ff-2005','ff-2007','hulk-2003','daredevil-2003','venom-1']){
    const a=g.D.appearances.find(a=>a.id===pid+'::stan-lee');assert.ok(a?.description&&a.source,pid);
  }
  const removed=['dd-1','dd-2','jj-1','jj-2','lc-1','lc-2','if-1','if-2','punisher-1','defenders','cloak-dagger','deadpool-2','once-upon-a-deadpool','venom-2','spider-verse-1','deadpool-wolverine'];
  for(const pid of removed){assert.ok(!g.D.appearances.some(a=>a.id===pid+'::stan-lee'),pid);assert.ok(!g.P[pid].cs.some(a=>a[0]==='stan-lee'),pid+' cast')}
  assert.ok(g.D.appearances.filter(a=>a.characterId==='stan-lee').every(a=>a.kind==='on-screen'));
  g.go('c-stan-lee');assert.equal(s.doc.querySelectorAll('.cols .ah > a').length,40,'the 41st record is the hidden Endgame rerelease duplicate');
  for(const pid of removed)assert.equal(s.doc.querySelector('.cols a[href="#f-'+pid+'"]'),null,pid);
  assert.ok(!g.D.appearances.some(a=>a.characterId==='stan-lee'&&['blade-1','punisher-2','dd-3','wandavision','nwh','gotg3'].includes(a.projectId)),'deleted scenes, ambiguous portraits and dedications are not invented appearances');
  assert.match(g.C['stan-lee'].notes['black-panther'],/Т’Чаллы/);
  const audit=JSON.parse(readFileSync(new URL('../../audit/data/character-series-groups-2026-11-07.json',import.meta.url)));
  assert.equal(audit.stanLeeLiveActionFilter.projects,g.C['stan-lee'].app.length);
});
