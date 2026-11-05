import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dataMatch = html.match(/<script type="application\/json" id="kvm-data">([\s\S]*?)<\/script>/);
const scriptMatch = html.match(/<script id="kvm-app">([\s\S]*?)<\/script>/);
if (!dataMatch || !scriptMatch) throw new Error('Missing embedded application or data');
new Script(scriptMatch[1], { filename: 'kvm-app.js' });
const db = JSON.parse(dataMatch[1]);
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
