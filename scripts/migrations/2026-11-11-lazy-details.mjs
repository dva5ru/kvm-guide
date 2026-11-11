// Разовое разделение появлений и серий на лёгкую часть (грузится сразу) и подробности (грузятся по необходимости).
import {readFileSync,writeFileSync} from 'node:fs';
import {formatData} from '../data-format.mjs';
const root=new URL('../../',import.meta.url);const rd=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
export const APPEARANCE_DETAIL_FIELDS=['description','source','announcementSource'];
export const EPISODE_DETAIL_FIELDS=['lead','plot','chronology','events','changes','connections','post','firsts','sources'];
const A=rd('data/appearances.json'),E=rd('data/episodes.json');
const canon=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(y=>[y,x[y]])):x);
const before=canon({A,E});
const ad={};
for(const a of A.appearances){const d={};
  for(const f of APPEARANCE_DETAIL_FIELDS)if(f in a){d[f]=a[f];delete a[f]}
  if(a.episodes&&a.episodes.some(e=>'description' in e)){d.episodes=a.episodes.map(e=>{const v='description' in e?e.description:null;delete e.description;return v})}
  if(Object.keys(d).length)ad[a.id]=d}
const ed={};
for(const [id,e] of Object.entries(E.episodes)){const d={};for(const f of EPISODE_DETAIL_FIELDS)if(f in e){d[f]=e[f];delete e[f]}if(Object.keys(d).length)ed[id]=d}
writeFileSync(new URL('data/appearances.json',root),formatData(A));writeFileSync(new URL('data/episodes.json',root),formatData(E));
writeFileSync(new URL('data/appearance-details.json',root),formatData({appearanceDetails:ad}));writeFileSync(new URL('data/episode-details.json',root),formatData({episodeDetails:ed}));
// контроль: лёгкая часть + подробности = исходные данные
const {mergeAppearanceDetails,mergeEpisodeDetails}=await import('../lib/data-merge.mjs');
const A2=rd('data/appearances.json'),E2=rd('data/episodes.json');
mergeAppearanceDetails(A2.appearances,rd('data/appearance-details.json').appearanceDetails);mergeEpisodeDetails(E2.episodes,rd('data/episode-details.json').episodeDetails);
if(canon({A:A2,E:E2})!==before)throw Error('после разделения данные не совпадают с исходными');
console.log('появлений с подробностями:',Object.keys(ad).length,'| серий с подробностями:',Object.keys(ed).length,'| совпадение с исходными: да');
