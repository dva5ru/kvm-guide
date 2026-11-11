import { hydrateAppearances } from './lib/appearance-registry.mjs';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import {guideHtml} from './lib/guide-source.mjs';

const html = guideHtml();
const dataMatch = html.match(/<script type="application\/json" id="kvm-data">([\s\S]*?)<\/script>/);
const scriptMatch = html.match(/<script id="kvm-app">([\s\S]*?)<\/script>/);
if (!dataMatch || !scriptMatch) throw new Error('Missing embedded application or data');
new Script(scriptMatch[1], { filename: 'kvm-app.js' });
const db = JSON.parse(dataMatch[1]);

hydrateAppearances(db);

const projects = new Map(db.p.map(p => [p.id, p]));
const characters = new Map(db.c.map(c => [c.id, c]));
const periodKinds = new Set(['main','flashback','epilogue','origin','future','credits','outside-time','time-travel','multiverse','new-footage']);
const appearanceTypes = new Set(['main','episodic','cameo','voice','archival','credits']);
for (const p of db.p) {
  if (!p.release || p.release.date !== (p.r || null) || p.release.year !== (p.y || null) || !['day','month','year','unknown'].includes(p.release.precision)) throw Error('Invalid premiere metadata: '+p.id);
  if (!Array.isArray(p.periods) || p.periods.some(t => !periodKinds.has(t.kind) || typeof t.when !== 'string' || !t.when.trim() || typeof t.note !== 'string')) throw Error('Invalid project time periods: '+p.id);
  if (p.announcement && (!p.announcement.summary || !Array.isArray(p.announcement.sources) || !p.announcement.sources.length || p.announcement.sources.some(url=>!/^https:\/\//.test(url)))) throw Error('Unverified film announcement: '+p.id);
}
for (const a of db.appearances) {
  if (!appearanceTypes.has(a.appearanceType) || a.versionId !== a.characterId || !['voice','archival','on-screen'].includes(a.delivery) || !['main','credits','main-and-credits'].includes(a.placement)) throw Error('Invalid appearance classification: '+a.id);
  if (a.role === 'X' && (!Array.isArray(a.versionRef) || !a.versionRef.length || !['episodes','alternate'].includes(a.versionScope))) throw Error('Missing alternative version identity: '+a.id);
  if (a.originProjectId && !db.p.some(p=>p.id===a.originProjectId)) throw Error('Unknown version origin: '+a.id);
  if (a.announcementStatus && (a.announcementStatus!=='announced' || !/^https:\/\//.test(a.announcementSource||''))) throw Error('Unsourced announced participant: '+a.id);
}
console.log('Validated: premiere periods and six appearance types');

if (projects.size !== db.p.length || characters.size !== db.c.length) throw new Error('Duplicate entity IDs');
for(const c of db.c){
  if(!Array.isArray(c.groups)||!c.groups.length||c.groups.some(g=>typeof g!=='string'||!g.trim()||g!==g.trim())||new Set(c.groups).size!==c.groups.length||c.g!==c.groups[0])throw Error('Invalid character groups: '+c.id);
}
for(const team of db.enc.teams)for(const row of team[4]){
  if(!projects.has(row[1]))throw Error('Unknown team project: '+team[0]);
  for(const cid of row[2].split(',').filter(Boolean))if(!characters.has(cid))throw Error('Unknown team member: '+team[0]+'/'+cid);
}
const reverse = new Set();
for (const p of db.p) {
  const local = new Set();
  for (const [cid, role] of p.cs) {
    if (!characters.has(cid) || local.has(cid)) throw new Error('Broken project cast: ' + p.id + '/' + cid);
    local.add(cid);
    reverse.add(cid + '@' + p.id + '@' + role);
  }
  for (const ep of p.eps || []) {
    if (!Array.isArray(ep[3])) throw new Error('Missing episode cast: ' + p.id + '/' + ep[0]);
    for (const cid of ep[3]) if (!local.has(cid)) throw new Error('Episode cast absent from season: ' + p.id + '/' + ep[0] + '/' + cid);
  }
}
for (const c of db.c) {
  const local = new Set();
  for (const [pid, role] of c.app) {
    if (!projects.has(pid) || local.has(pid) || !reverse.has(c.id + '@' + pid + '@' + role)) {
      throw new Error('Broken character appearance: ' + c.id + '/' + pid);
    }
    local.add(pid);
  }
  for (const pid of Object.keys(c.notes || {})) if (!local.has(pid)) throw new Error('Orphan character note: ' + c.id + '/' + pid);
}
const groupedCharacters = new Set();
for (const [group, ids] of Object.entries(db.versions || {})) {
  if(!Array.isArray(ids)||ids.length<2||new Set(ids).size!==ids.length)throw Error('Invalid version group: '+group);
  for (const id of ids) if (!characters.has(id) || characters.get(id).verGroup !== group) {
    throw new Error('Broken version group: ' + group + '/' + id);
  }
  for(const id of ids){if(groupedCharacters.has(id))throw Error('Duplicate version membership: '+id);groupedCharacters.add(id)}
}
for(const c of db.c)if(c.verGroup&&!groupedCharacters.has(c.id))throw Error('Orphan version card: '+c.id);
for(const [old,target]of Object.entries(db.characterAppearanceAliases||{})){
  const [pid,cid]=old.split('::');
  if(!projects.has(pid)||!characters.has(cid)||cid===target||!db.appearances.some(a=>a.projectId===pid&&a.characterId===target))throw Error('Invalid appearance migration: '+old);
}
for (const [group, ids] of Object.entries(db.editions || {})) {
  for (const id of ids) if (!projects.has(id) || projects.get(id).editionGroup !== group) {
    throw new Error('Broken edition group: ' + group + '/' + id);
  }
}
for (const [pid, entries] of Object.entries(db.epRoles || {})) {
  const p = projects.get(pid);
  if (!p || !p.eps) throw new Error('Unknown episode project: ' + pid);
  for (const [num, notes] of Object.entries(entries)) {
    const ep = p.eps.find(x => x.id===num || String(x[0]) === num);
    if (!ep) throw new Error('Unknown episode: ' + pid + '/' + num);
    for (const cid of Object.keys(notes)) if (!ep[3].includes(cid)) {
      throw new Error('Episode note references absent actor: ' + pid + '/' + num + '/' + cid);
    }
  }
}
const episodeCount = db.p.reduce((n, p) => n + (p.eps || []).length, 0);
console.log('Validated:', characters.size, 'characters,', projects.size, 'projects,', episodeCount, 'episodes');

const CREDIT_KINDS = new Set(['voice','on-screen','motion-capture','archival']);
const CREDIT_STATUSES = new Set(['verified','announced']);
for(const [pid,info] of Object.entries(db.appearanceCredits||{})){
  const p=projects.get(pid);if(!p)throw Error('Unknown credit project '+pid);
  const cast=new Set(p.cs.map(([id])=>id));
  function check(cid,rec,ep){
    if(!cast.has(cid)||ep&&!ep[3].includes(cid))throw Error('Unlinked appearance credit '+pid+'/'+cid);
    if(!rec||typeof rec.performer!=='string'||!rec.performer.trim())throw Error('Missing credit performer '+pid+'/'+cid);
    if(!CREDIT_KINDS.has(rec.kind)||!CREDIT_STATUSES.has(rec.status))throw Error('Invalid credit kind/status '+pid+'/'+cid);
    if(typeof rec.source!=='string'||!rec.source.startsWith('https://'))throw Error('Missing credit source '+pid+'/'+cid);
  }
  for(const [cid,rec]of Object.entries(info.cast||{}))check(cid,rec);
  for(const [num,rows]of Object.entries(info.episodes||{})){
    const ep=(p.eps||[]).find(x=>x.id===num||String(x[0])===num);if(!ep)throw Error('Missing credit episode '+pid+'/'+num);
    for(const [cid,rec]of Object.entries(rows))check(cid,rec,ep);
  }
}
console.log('Sourced appearance credit structure validated');

// Item IDs are shared by routes, uploads, search, categories and related-item links.
const itemRows = db.enc.stones.map(s=>[s[0],s[1],s[4],s[5]])
  .concat(db.enc.artifacts.map(a=>[a[0],a[1],a[3],a[4]]),
    (db.enc.materials||[]).map(a=>[a[0],a[1],a[3],a[4]]),
    db.enc.gauntlets.map(g=>[g[3],g[0],g[1],[['History',g[1],g[2]]]]));
const itemIds = new Set(itemRows.map(a=>a[0]));
const itemCategories = new Set(['stones','artifacts','weapons','armor','materials']);
if(itemIds.size!==itemRows.length)throw Error('Duplicate encyclopedia item ID');
if(Object.keys(db.enc.itemMeta||{}).length!==itemRows.length)throw Error('Encyclopedia item metadata mismatch');
for(const [id,name,description,history]of itemRows){
  const meta=db.enc.itemMeta[id];
  if(!/^[a-z0-9-]+$/.test(id)||!name||!description||!history.length)throw Error('Incomplete encyclopedia item '+id);
  if(!meta||!itemCategories.has(meta.category))throw Error('Missing item category '+id);
  for(const alias of meta.aliases||[])if(typeof alias!=='string'||!alias.trim())throw Error('Invalid item alias '+id);
  for(const related of meta.related||[])if(related===id||!itemIds.has(related))throw Error('Broken related item '+id+'/'+related);
  for(const step of history){
    if(step.length!==3||!step[0]||!step[1]||typeof step[2]!=='string')throw Error('Invalid item history '+id);
    for(const pid of step[2].split(','))if(!projects.has(pid))throw Error('Unknown item appearance '+id+'/'+pid);
  }
  const historicalProjects=new Set(history.flatMap(step=>step[2].split(',')));
  if(meta.excludedProjects&&(!Array.isArray(meta.excludedProjects)||new Set(meta.excludedProjects).size!==meta.excludedProjects.length||meta.excludedProjects.some(pid=>!historicalProjects.has(pid))||meta.excludedProjects.length===historicalProjects.size))throw Error('Invalid contextual item projects: '+id);
}
for(const id of Object.keys(db.enc.itemMeta))if(!itemIds.has(id))throw Error('Orphan item metadata '+id);
console.log('Validated:',itemRows.length,'categorized encyclopedia items');

// Версии файлов из assets/: адреса должны совпадать с текущим содержимым (иначе посетители получат старую версию из кеша).
import {PAGES as ASSET_PAGES,assetHash,readManifest} from './stamp-assets.mjs';
import {formatData} from './data-format.mjs';
import {existsSync as assetExists,readFileSync as assetRead} from 'node:fs';
for(const page of ASSET_PAGES){const url=new URL('../'+page,import.meta.url);if(!assetExists(url))continue;
  for(const m of assetRead(url,'utf8').matchAll(/(?:href|src)="(?:\.\/)?(assets\/[^"?#]+)(?:\?v=([0-9a-f]*))?"/g)){
    if(!assetExists(new URL('../'+m[1],import.meta.url)))throw new Error(page+': нет файла '+m[1]);
    if(m[2]!==assetHash(m[1]))throw new Error(page+': устарела версия '+m[1]+' — выполните npm run stamp');}}
{const man=readManifest(assetRead(new URL('../index.html',import.meta.url),'utf8'));if(!man)throw new Error('index.html: нет списка файлов данных (kvm-data-files)');
  for(const f of man.files){const u=new URL('../'+f.path,import.meta.url);if(!assetExists(u))throw new Error('нет файла данных '+f.path);
    if(f.hash!==assetHash(f.path))throw new Error('устарела версия '+f.path+' — выполните npm run stamp');
    if(formatData(JSON.parse(assetRead(u,'utf8')))!==assetRead(u,'utf8'))throw new Error(f.path+': формат не единый — выполните npm run stamp')}
  const app=man.app.split('?v=');if(app[1]!==assetHash(app[0]))throw new Error('устарела версия '+app[0]+' в списке данных — выполните npm run stamp')}
console.log('Validated: asset files and cache versions');
