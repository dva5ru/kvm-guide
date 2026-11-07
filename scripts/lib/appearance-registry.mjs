// Validate canonical episodes and appearances before generating compatibility read models.
export function hydrateAppearances(db) {
  if(db.appearanceSchemaVersion!==4||db.episodeSchemaVersion!==1||!Array.isArray(db.appearances)||!db.episodes)throw Error('Missing canonical episode/appearance registry');
  if(db.epRoles||db.appearanceCredits)throw Error('Stored appearance projections must be generated');
  const projects=new Map(db.p.map(p=>[p.id,p])),characters=new Map(db.c.map(c=>[c.id,c]));
  const episodes=new Map(),records=new Map(),positions=new Set();
  const targets={project:new Set(projects.keys()),character:new Set(characters.keys()),event:new Set(db.ev.map(e=>e.id)),place:new Set(db.pl.map(p=>p.id)),item:new Set(db.enc.stones.map(x=>x[0]).concat(db.enc.artifacts.map(x=>x[0]),db.enc.materials.map(x=>x[0]),db.enc.gauntlets.map(x=>x[3])))};
  for(const p of db.p){if(p.cs!==undefined||p.eps!==undefined)throw Error('Stored project projections must be generated: '+p.id);p.cs=[];p.eps=null;}
  for(const c of db.c){if(c.app!==undefined||c.notes!==undefined)throw Error('Stored character projections must be generated: '+c.id);c.app=[];c.notes={};}
  for(const [id,m]of Object.entries(db.episodes)){
    const p=projects.get(m.projectId),position=m.projectId+'::'+m.season+'::'+m.number;
    if(id!==m.id||!p||!['series','anim'].includes(p.k)||!Number.isInteger(m.season)||m.season<1||!Number.isInteger(m.number)||m.number<1||positions.has(position)||typeof m.title!=='string'||!m.title.trim())throw Error('Invalid episode identity: '+id);
    if(m.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(m.date)||Number.isNaN(Date.parse(m.date))||new Date(m.date).toISOString().slice(0,10)!==m.date))throw Error('Invalid episode date: '+id);
    for(const field of ['events','changes','firsts','connections','sources'])if(!Array.isArray(m[field]))throw Error('Invalid episode list: '+id+'/'+field);
    if(!['released','announced'].includes(m.status)||typeof m.plot!=='string'||(m.status==='released'&&!m.plot.trim())||(m.status==='announced'&&(m.plot||m.events.length||m.changes.length||m.firsts.length||m.chronology||m.post?.length)))throw Error('Invalid episode publication: '+id);
    for(const cid of m.firsts)if(!characters.has(cid))throw Error('Unknown episode first appearance: '+id+'/'+cid);
    for(const link of m.connections)if(!targets[link.type]?.has(link.id)||typeof link.text!=='string')throw Error('Unknown episode connection: '+id);
    if(m.sources.some(s=>!/^https:\/\//.test(s)))throw Error('Invalid episode source: '+id);
    if(m.post!==null&&(!Array.isArray(m.post)||m.post.some(s=>!['mid','end'].includes(s.placement)||!s.text?.trim())))throw Error('Invalid episode credits: '+id);
    const e=[m.number,m.title,m.plot,[]];e.meta=m;e.id=id;(p.eps||=[]).push(e);episodes.set(id,e);positions.add(position);
  }
  for(const p of projects.values())if(p.eps)p.eps.sort((a,b)=>a.meta.season-b.meta.season||a[0]-b[0]);
  for(const [pid,ids]of Object.entries(db.episodeLegacyKeys||{}))for(const id of ids)if(episodes.get(id)?.meta.projectId!==pid)throw Error('Invalid legacy episode key: '+id);
  db.epRoles={};db.appearanceCredits={};
  function numberAlias(pid,e){return projects.get(pid).eps.filter(x=>x[0]===e[0]).length===1||(db.episodeLegacyKeys?.[pid]||[]).includes(e.id)}
  function credit(pid,cid,rec,e){
    if(!rec||typeof rec.performer!=='string'||!rec.performer.trim()||!['voice','on-screen','motion-capture','archival'].includes(rec.kind)||!['verified','announced'].includes(rec.status)||!/^https:\/\//.test(rec.source||''))throw Error('Invalid sourced credit: '+pid+'/'+cid);
    const info=db.appearanceCredits[pid]||={cast:{},episodes:{}};
    if(!e)info.cast[cid]=rec;else{(info.episodes[e.id]||={})[cid]=rec;if(numberAlias(pid,e))info.episodes[e[0]]=info.episodes[e.id];}
  }
  for(const a of db.appearances){
    const p=projects.get(a.projectId),c=characters.get(a.characterId);
    if(!p||!c||a.id!==a.projectId+'::'+a.characterId||records.has(a.id)||!['L','M','S','C','P','V','X'].includes(a.role)||!Number.isInteger(a.order)||a.order<0||typeof a.description!=='string'||!Array.isArray(a.episodes))throw Error('Invalid appearance: '+a.id);
    records.set(a.id,a);p.cs.push([a.characterId,a.role]);c.app.push([a.projectId,a.role,a.order]);if(a.credit)credit(a.projectId,a.characterId,a.credit);
    const ids=new Set();
    for(const er of a.episodes){
      const e=episodes.get(er.episodeId);
      if(!e||e.meta.projectId!==a.projectId||e.meta.status!=='released'||ids.has(er.episodeId)||!Number.isInteger(er.order)||er.order<0||typeof er.description!=='string'||!er.description.trim()||!['on-screen','voice','archival','depiction'].includes(er.kind))throw Error('Invalid episode appearance: '+a.id+'/'+er.episodeId);
      if(/индивидуальное описание.*проверяется|Появляется в предпоследней серии/.test(er.description))throw Error('Placeholder episode appearance: '+a.id);
      if(er.segment&&!['main','credits','main-and-credits'].includes(er.segment))throw Error('Invalid episode segment: '+a.id);
      ids.add(er.episodeId);e[3].push([a.characterId,er.order]);Object.defineProperty(er,'number',{get:()=>e[0]});
      const rows=db.epRoles[a.projectId]||={};(rows[e.id]||={})[a.characterId]=er.description;
      if(numberAlias(a.projectId,e))rows[e[0]]=rows[e.id];if(er.credit)credit(a.projectId,a.characterId,er.credit,e);
    }
  }
  function description(a,seen=new Set()){
    if(seen.has(a.id))throw Error('Cyclic appearance description: '+a.id);seen.add(a.id);
    if(a.descriptionFrom){const source=records.get(a.descriptionFrom);if(!source||source.characterId!==a.characterId||projects.get(a.projectId).editionGroup!==source.projectId)throw Error('Invalid edition description: '+a.id);return a.description||description(source,seen);}
    return a.description||a.episodes.map(e=>{const m=episodes.get(e.episodeId).meta;return 'Сезон '+m.season+', серия '+m.number+': '+e.description}).join(' ');
  }
  for(const a of records.values()){const note=description(a);if(!note.trim())throw Error('Missing appearance description: '+a.id);characters.get(a.characterId).notes[a.projectId]=note;}
  for(const c of characters.values()){c.app.sort((a,b)=>a[2]-b[2]);if(c.app.some((a,i)=>a[2]!==i))throw Error('Character appearance order gap: '+c.id);c.app.forEach(a=>a.pop());}
  for(const [id,e]of episodes){e[3].sort((a,b)=>a[1]-b[1]);if(e[3].some((a,i)=>a[1]!==i))throw Error('Episode cast order gap: '+id);e[3]=e[3].map(a=>a[0]);for(const cid of e.meta.firsts)if(!e[3].includes(cid))throw Error('Unlinked first appearance: '+id+'/'+cid);}
  return {projects,characters,records,episodes};
}
