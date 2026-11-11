// Единый формат файлов в data/: каждая запись — на своей строке, чтобы в истории изменений было видно,
// какая запись поменялась, и чтобы правки разных записей не конфликтовали между собой.
const compact=v=>JSON.stringify(v);
const isRecordList=v=>Array.isArray(v)&&v.length>0&&v.every(x=>x!==null&&typeof x==='object');
const isRecordMap=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length>0&&Object.values(v).every(x=>x!==null&&typeof x==='object');
function block(v,depth){
  if(isRecordList(v))return '[\n'+v.map(x=>depth<1&&isRecordMap(x)?block(x,depth+1):compact(x)).join(',\n')+'\n]';
  if(isRecordMap(v)&&depth<1)return '{\n'+Object.entries(v).map(([k,x])=>compact(k)+':'+(isRecordList(x)||isRecordMap(x)?block(x,depth+1):compact(x))).join(',\n')+'\n}';
  return compact(v);
}
export function formatData(obj){return '{\n'+Object.entries(obj).map(([k,v])=>compact(k)+':'+block(v,0)).join(',\n')+'\n}\n'}
// Какие разделы данных в каком файле лежат. Порядок ключей сохраняется загрузчиком по полю order манифеста.
export const DATA_FILES=[
  ['data/projects.json',['p']],
  ['data/characters.json',['c']],
  ['data/appearances.json',['appearanceSchemaVersion','appearances','characterAppearanceAliases']],
  ['data/episodes.json',['episodeSchemaVersion','episodes','episodeLegacyKeys','episodeLegacyPost']],
  ['data/places.json',['pl']],
  ['data/events.json',['ev','tl']],
  ['data/encyclopedia.json',['enc']],
  ['data/catalog.json',['ln','routes','sg','eras','studios','st','k','dc','dcSet','dt']],
  ['data/versions.json',['versions','editions','versionTitles']],
  ['data/search.json',['alias','en']],
];
// Что грузится не сразу, а когда нужно: группа → файлы. Вид merge: keys — разделы целиком, иначе — подробности для уже загруженных записей.
export const LAZY_FILES={
  details:[['data/appearance-details.json','appearance-details'],['data/episode-details.json','episode-details']],
  maps:[['data/maps.json',['map','space','tree']]],
  geo:[['data/geo.json',['geo']]],
};
