import { hydrateAppearances } from './lib/appearance-registry.mjs';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dataMatch = html.match(/<script type="application\/json" id="kvm-data">([\s\S]*?)<\/script>/);
const scriptMatch = html.match(/<script id="kvm-app">([\s\S]*?)<\/script>/);
if (!dataMatch || !scriptMatch) throw new Error('Missing embedded application or data');
new Script(scriptMatch[1], { filename: 'kvm-app.js' });
const db = JSON.parse(dataMatch[1]);

hydrateAppearances(db);

const projects = new Map(db.p.map(p => [p.id, p]));
const characters = new Map(db.c.map(c => [c.id, c]));
if (projects.size !== db.p.length || characters.size !== db.c.length) throw new Error('Duplicate entity IDs');
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
for (const [group, ids] of Object.entries(db.versions || {})) {
  for (const id of ids) if (!characters.has(id) || characters.get(id).verGroup !== group) {
    throw new Error('Broken version group: ' + group + '/' + id);
  }
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
    const ep = p.eps.find(x => String(x[0]) === num);
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
    const ep=(p.eps||[]).find(x=>String(x[0])===num);if(!ep)throw Error('Missing credit episode '+pid+'/'+num);
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
}
for(const id of Object.keys(db.enc.itemMeta))if(!itemIds.has(id))throw Error('Orphan item metadata '+id);
console.log('Validated:',itemRows.length,'categorized encyclopedia items');
