// Validate the stored canonical records before deriving legacy read models.
export function hydrateAppearances(db) {
  if (db.appearanceSchemaVersion !== 3 || !Array.isArray(db.appearances)) throw Error('Missing v3 appearances registry');
  if (db.epRoles || db.appearanceCredits) throw Error('Stored appearance projections must be generated');
  const projects = new Map(db.p.map(p => [p.id,p])), characters = new Map(db.c.map(c => [c.id,c]));
  const episodes = new Map(), records = new Map();
  for (const p of db.p) {
    if (p.cs !== undefined) throw Error('Stored project cast must be generated: '+p.id);
    p.cs=[];
    for (const e of p.eps || []) {
      const id=p.id+'::'+e[0];
      if (e.length!==3 || episodes.has(id)) throw Error('Invalid stored episode: '+id);
      e[3]=[]; episodes.set(id,e);
    }
  }
  for (const c of db.c) {
    if (c.app !== undefined || c.notes !== undefined) throw Error('Stored character projections must be generated: '+c.id);
    c.app=[];c.notes={};
  }
  db.epRoles={};db.appearanceCredits={};
  function credit(pid,cid,rec,number) {
    if (!rec || typeof rec.performer!=='string' || !rec.performer.trim() ||
        !['voice','on-screen','motion-capture','archival'].includes(rec.kind) ||
        !['verified','announced'].includes(rec.status) || typeof rec.source!=='string' || !rec.source.startsWith('https://')) throw Error('Invalid sourced credit: '+pid+'/'+cid);
    const info=db.appearanceCredits[pid] ||= {cast:{},episodes:{}};
    if (number===undefined) info.cast[cid]=rec;
    else (info.episodes[number] ||= {})[cid]=rec;
  }
  for (const a of db.appearances) {
    const p=projects.get(a.projectId),c=characters.get(a.characterId);
    if (!p || !c || a.id!==a.projectId+'::'+a.characterId || records.has(a.id) ||
        !['L','M','S','C','P','V','X'].includes(a.role) || !Number.isInteger(a.order) || a.order<0 ||
        typeof a.description!=='string' || !Array.isArray(a.episodes)) throw Error('Invalid appearance: '+a.id);
    records.set(a.id,a);p.cs.push([a.characterId,a.role]);c.app.push([a.projectId,a.role,a.order]);
    if(a.credit)credit(a.projectId,a.characterId,a.credit);
    const numbers=new Set();
    for (const e of a.episodes) {
      const ep=episodes.get(a.projectId+'::'+e.number);
      if (!ep || numbers.has(e.number) || !Number.isInteger(e.order) || e.order<0 || typeof e.description!=='string' || !e.description.trim()) throw Error('Invalid episode appearance: '+a.id+'/'+e.number);
      if (/индивидуальное описание.*проверяется|Появляется в предпоследней серии/.test(e.description)) throw Error('Placeholder episode appearance: '+a.id);
      numbers.add(e.number);ep[3].push([a.characterId,e.order]);
      ((db.epRoles[a.projectId] ||= {})[e.number] ||= {})[a.characterId]=e.description;
      if (e.credit) credit(a.projectId,a.characterId,e.credit,e.number);
    }
  }
  function description(a,seen=new Set()) {
    if (seen.has(a.id)) throw Error('Cyclic appearance description: '+a.id);
    seen.add(a.id);
    if (a.descriptionFrom) {
      const source=records.get(a.descriptionFrom);
      if (!source || source.characterId!==a.characterId || projects.get(a.projectId).editionGroup!==source.projectId) throw Error('Invalid edition description: '+a.id);
      return a.description || description(source,seen);
    }
    return a.description || a.episodes.map(e=>'Серия '+e.number+': '+e.description).join(' ');
  }
  for (const a of records.values()) {
    const note=description(a);
    if(!note.trim())throw Error('Missing appearance description: '+a.id);
    characters.get(a.characterId).notes[a.projectId]=note;
  }
  for (const c of characters.values()) {
    c.app.sort((a,b)=>a[2]-b[2]);
    if(c.app.some((a,i)=>a[2]!==i))throw Error('Character appearance order gap: '+c.id);
    c.app.forEach(a=>a.pop());
  }
  for (const [id,e] of episodes) {
    e[3].sort((a,b)=>a[1]-b[1]);
    if(e[3].some((a,i)=>a[1]!==i))throw Error('Episode cast order gap: '+id);
    e[3]=e[3].map(a=>a[0]);
  }
  return {projects,characters,records,episodes};
}
